import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listRuns, saveRun } from "@/lib/store";
import type { ScanRun } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  targetUrl: z.string().max(2048),
  objective: z.string().min(3).max(500),
});

export async function GET() {
  const scanAvailable = !process.env.VERCEL;
  return NextResponse.json({
    runs: scanAvailable ? await listRuns() : [],
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    scanAvailable,
  });
}

export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error: "Browser scans run in the local app. The Vercel deployment is a portfolio preview.",
      },
      { status: 501 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a valid target and objective." }, { status: 400 });
  let target: URL;
  try {
    target =
      parsed.data.targetUrl === "lab"
        ? new URL("/lab/checkout", request.nextUrl.origin)
        : new URL(parsed.data.targetUrl);
    if (!["http:", "https:"].includes(target.protocol)) throw new Error("Invalid protocol");
  } catch {
    return NextResponse.json({ error: "Target must be an HTTP or HTTPS URL." }, { status: 400 });
  }
  const isLab = target.origin === request.nextUrl.origin && target.pathname === "/lab/checkout";
  const mode = isLab
    ? "scripted-lab"
    : process.env.OPENAI_API_KEY
      ? "ai-exploration"
      : "guided-crawl";
  const run: ScanRun = {
    id: crypto.randomUUID(),
    targetUrl: target.toString(),
    objective: parsed.data.objective,
    mode,
    status: "queued",
    createdAt: new Date().toISOString(),
    events: [],
    findings: [],
    profiles: [
      { name: "Desktop", viewport: "1440 × 900", status: "pending", actions: 0 },
      { name: "Mobile", viewport: "390 × 844", status: "pending", actions: 0 },
      { name: "Slow network", viewport: "1280 × 800", status: "pending", actions: 0 },
    ],
  };
  await saveRun(run);
  const { runScan } = await import("@/lib/runner");
  void runScan(run);
  return NextResponse.json({ run }, { status: 202 });
}
