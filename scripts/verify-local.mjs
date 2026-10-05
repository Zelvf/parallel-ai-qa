import assert from "node:assert/strict";

const base = process.env.PARALLEL_BASE_URL || "http://127.0.0.1:3000";
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(`${base}/api/runs`);
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    /* Wait for the production server to start. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.ok(ready, `Server did not become ready at ${base}`);
const started = await fetch(`${base}/api/runs`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    targetUrl: "lab",
    objective: "Complete checkout with expired coupon across devices.",
  }),
});
if (started.status !== 202) throw new Error(`Scan creation failed: ${await started.text()}`);
const { run: created } = await started.json();

let run;
for (let attempt = 0; attempt < 60; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const response = await fetch(`${base}/api/runs/${created.id}`);
  assert.equal(response.status, 200);
  ({ run } = await response.json());
  if (run.status === "complete" || run.status === "failed") break;
}

assert.equal(run?.status, "complete", run?.error || "Scan did not finish in 60 seconds");
assert.deepEqual(
  run.profiles.map(({ status }) => status),
  ["passed", "failed", "passed"],
);
assert.equal(run.findings.length, 1);
assert.equal(run.findings[0].profile, "Mobile");
assert.match(run.findings[0].title, /HTTP 500/);
assert.match(run.findings[0].diagnosis, /mobile checkout bug|seeded lab fault/i);
for (const url of [run.findings[0].screenshot, run.findings[0].trace]) {
  const response = await fetch(new URL(url, base));
  assert.equal(response.status, 200, `Missing evidence artifact: ${url}`);
}
console.log(
  `PASS: ${run.id} completed with desktop pass, mobile HTTP 500, slow-network pass, screenshot and trace.`,
);
