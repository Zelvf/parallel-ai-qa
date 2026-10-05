export type RunStatus = "queued" | "running" | "complete" | "failed";
export type RunMode = "scripted-lab" | "ai-exploration" | "guided-crawl";

export type RunEvent = {
  at: string;
  profile: string;
  type: "info" | "action" | "error" | "success";
  message: string;
};

export type Finding = {
  id: string;
  profile: string;
  title: string;
  severity: "high" | "medium";
  evidence: string;
  url: string;
  screenshot?: string;
  trace?: string;
  diagnosis?: string;
  proposedFix?: string;
  regressionTest?: string;
};

export type BrowserProfile = {
  name: string;
  viewport: string;
  status: "pending" | "running" | "passed" | "failed";
  actions: number;
  durationMs?: number;
};

export type ScanRun = {
  id: string;
  targetUrl: string;
  objective: string;
  mode: RunMode;
  status: RunStatus;
  createdAt: string;
  finishedAt?: string;
  events: RunEvent[];
  findings: Finding[];
  profiles: BrowserProfile[];
  error?: string;
};
