import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices, type Page } from "playwright";
import { diagnoseFinding, planAction } from "./ai";
import { saveRun } from "./store";
import type { BrowserProfile, Finding, ScanRun } from "./types";

const profileConfigs = [
  { name: "Desktop", viewport: { width: 1440, height: 900 }, slow: false },
  { name: "Mobile", viewport: { width: 390, height: 844 }, slow: false },
  { name: "Slow network", viewport: { width: 1280, height: 800 }, slow: true },
];

async function persist(run: ScanRun) {
  await saveRun(run);
}

async function event(
  run: ScanRun,
  profile: string,
  type: "info" | "action" | "error" | "success",
  message: string,
) {
  run.events.push({ at: new Date().toISOString(), profile, type, message });
  await persist(run);
}

function labFix(finding: Finding) {
  finding.diagnosis =
    "Confirmed seeded lab fault: the checkout API returns HTTP 500 for an expired coupon when viewportWidth is 600px or less. The UI reports a generic failure instead of a coupon validation message.";
  finding.proposedFix = `// src/app/api/lab/checkout/route.ts\nif (coupon === "EXPIRED20") {\n  return NextResponse.json(\n    { error: "This coupon has expired." },\n    { status: 422 }\n  );\n}`;
  finding.regressionTest = `import { test, expect } from "@playwright/test";\n\ntest("expired coupon shows validation on mobile", async ({ page }) => {\n  await page.setViewportSize({ width: 390, height: 844 });\n  await page.goto("/lab/checkout");\n  await page.getByRole("button", { name: "Add to cart" }).click();\n  await page.getByLabel("Coupon code").fill("EXPIRED20");\n  await page.getByRole("button", { name: "Place test order" }).click();\n  await expect(page.getByRole("status")).toContainText("This coupon has expired.");\n});`;
}

async function inspectControls(page: Page) {
  return page.locator("a, button, input, textarea, select").evaluateAll((elements) =>
    elements
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && !(el as HTMLInputElement).disabled;
      })
      .slice(0, 35)
      .map((el, index) => {
        const input = el as HTMLInputElement;
        const name =
          el.getAttribute("aria-label") ||
          el.getAttribute("placeholder") ||
          el.textContent?.trim() ||
          input.name ||
          "unnamed";
        return `${index}: ${el.tagName.toLowerCase()} ${name.slice(0, 90)}`;
      }),
  );
}

async function exploreWithAI(
  page: Page,
  run: ScanRun,
  profile: BrowserProfile,
  targetOrigin: string,
) {
  const history: string[] = [];
  for (let step = 0; step < 8; step++) {
    const controls = await inspectControls(page);
    if (!controls.length) break;
    const action = await planAction(run.objective, page.url(), controls, history);
    if (action.action === "done") break;
    const index = Number(action.target);
    if (!Number.isInteger(index) || index < 0 || index >= controls.length)
      throw new Error("Model selected an invalid control");
    const locator = page
      .locator("a, button, input, textarea, select")
      .filter({ visible: true })
      .nth(index);
    const label = controls[index];
    if (/delete|remove account|pay now|purchase|send message/i.test(label)) {
      await event(run, profile.name, "info", `Skipped sensitive control: ${label}`);
      break;
    }
    if (action.action === "fill") await locator.fill(action.value.slice(0, 200));
    else {
      const href = await locator.getAttribute("href");
      if (href && new URL(href, page.url()).origin !== targetOrigin) break;
      await locator.click({ timeout: 5000 });
    }
    profile.actions++;
    history.push(`${action.action} ${label}: ${action.reason}`);
    await event(
      run,
      profile.name,
      "action",
      `${action.action === "fill" ? "Filled" : "Clicked"} ${label.split(": ")[1]}`,
    );
    await page.waitForTimeout(400);
  }
}

async function guidedCrawl(
  page: Page,
  run: ScanRun,
  profile: BrowserProfile,
  targetOrigin: string,
) {
  const links = await page
    .locator("a[href]")
    .evaluateAll((elements) => elements.map((el) => (el as HTMLAnchorElement).href).slice(0, 20));
  const urls = [...new Set(links)]
    .filter((url) => {
      try {
        return new URL(url).origin === targetOrigin;
      } catch {
        return false;
      }
    })
    .slice(0, 4);
  for (const url of urls) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    profile.actions++;
    await event(run, profile.name, "action", `Visited ${new URL(url).pathname}`);
  }
}

export async function runScan(run: ScanRun) {
  run.status = "running";
  await persist(run);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const targetOrigin = new URL(run.targetUrl).origin;
    const isLab = new URL(run.targetUrl).pathname === "/lab/checkout";
    for (const config of profileConfigs) {
      const profile = run.profiles.find((item) => item.name === config.name)!;
      profile.status = "running";
      const started = Date.now();
      await event(run, profile.name, "info", `Launching ${profile.viewport} browser`);
      const context = await browser.newContext({
        viewport: config.viewport,
        deviceScaleFactor: 1,
        isMobile: config.name === "Mobile",
        userAgent: config.name === "Mobile" ? devices["iPhone 13"].userAgent : undefined,
      });
      const artifactDir = path.join(process.cwd(), ".parallel", "artifacts", run.id);
      await mkdir(artifactDir, { recursive: true });
      const tracePath = path.join(
        artifactDir,
        `${config.name.toLowerCase().replaceAll(" ", "-")}.zip`,
      );
      await context.tracing.start({ screenshots: true, snapshots: true });
      const page = await context.newPage();
      const failures: { title: string; evidence: string; url: string }[] = [];
      page.on("pageerror", (error) =>
        failures.push({
          title: "Uncaught browser error",
          evidence: error.message,
          url: page.url(),
        }),
      );
      page.on("response", (response) => {
        if (
          isLab &&
          response.status() === 422 &&
          new URL(response.url()).pathname === "/api/lab/checkout"
        )
          return;
        if (response.status() >= 400 && !/favicon\.ico/.test(response.url())) {
          failures.push({
            title: `HTTP ${response.status()} from ${new URL(response.url()).pathname}`,
            evidence: `${response.request().method()} ${response.url()} returned HTTP ${response.status()}`,
            url: response.url(),
          });
        }
      });
      try {
        if (config.slow)
          await context.route("**/*", async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 180));
            await route.continue();
          });
        await page.goto(run.targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
        profile.actions++;
        await event(run, profile.name, "action", `Opened ${new URL(page.url()).pathname}`);
        if (isLab) {
          await page.getByRole("button", { name: "Add to cart" }).click();
          profile.actions++;
          await event(run, profile.name, "action", "Added the sample product to cart");
          await page.getByLabel("Coupon code").fill("EXPIRED20");
          profile.actions++;
          await event(run, profile.name, "action", "Entered expired coupon EXPIRED20");
          await page.getByRole("button", { name: "Place test order" }).click();
          profile.actions++;
          await event(run, profile.name, "action", "Submitted the test order");
          await page.getByRole("status").waitFor({ timeout: 10000 });
        } else if (run.mode === "ai-exploration") {
          await exploreWithAI(page, run, profile, targetOrigin);
        } else {
          await guidedCrawl(page, run, profile, targetOrigin);
        }
        await page.waitForTimeout(500);
      } catch (error) {
        failures.push({
          title: "Browser journey failed",
          evidence: error instanceof Error ? error.message : String(error),
          url: page.url() || run.targetUrl,
        });
      }
      const unique = [...new Map(failures.map((failure) => [failure.title, failure])).values()];
      if (unique.length) {
        const screenshotName = `${config.name.toLowerCase().replaceAll(" ", "-")}.png`;
        await page
          .screenshot({ path: path.join(artifactDir, screenshotName), fullPage: true })
          .catch(() => undefined);
        for (const failure of unique) {
          const finding: Finding = {
            id: crypto.randomUUID(),
            profile: profile.name,
            title: failure.title,
            severity:
              failure.title.startsWith("HTTP 5") || failure.title === "Browser journey failed"
                ? "high"
                : "medium",
            evidence: failure.evidence,
            url: failure.url,
            screenshot: `/api/artifacts/${run.id}/${screenshotName}`,
            trace: `/api/artifacts/${run.id}/${path.basename(tracePath)}`,
          };
          if (isLab && failure.title.includes("/api/lab/checkout")) labFix(finding);
          else finding.diagnosis = (await diagnoseFinding(finding)) || undefined;
          run.findings.push(finding);
          await event(run, profile.name, "error", failure.title);
        }
        profile.status = "failed";
      } else {
        profile.status = "passed";
        await event(run, profile.name, "success", "Journey completed without captured errors");
      }
      profile.durationMs = Date.now() - started;
      await context.tracing.stop({ path: tracePath });
      await context.close();
      await persist(run);
    }
    run.status = "complete";
    run.finishedAt = new Date().toISOString();
    await event(
      run,
      "System",
      "success",
      `Scan complete · ${run.findings.length} finding${run.findings.length === 1 ? "" : "s"}`,
    );
  } catch (error) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : String(error);
    run.finishedAt = new Date().toISOString();
    await event(run, "System", "error", run.error);
  } finally {
    await browser?.close();
    await persist(run);
  }
}
