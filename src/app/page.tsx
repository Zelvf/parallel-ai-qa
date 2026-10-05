"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  ExternalLink,
  FlaskConical,
  Globe2,
  Layers3,
  Monitor,
  Play,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Wifi,
} from "lucide-react";
import type { Finding, ScanRun } from "@/lib/types";

const starterObjective =
  "Complete checkout using the expired coupon and identify any failures across devices.";

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(value).toLocaleDateString();
}

function statusLabel(status: ScanRun["status"]) {
  return status === "complete"
    ? "Complete"
    : status === "running"
      ? "Scanning"
      : status === "queued"
        ? "Queued"
        : "Failed";
}

function ProfileIcon({ name }: { name: string }) {
  return name === "Mobile" ? (
    <Smartphone size={17} />
  ) : name === "Slow network" ? (
    <Wifi size={17} />
  ) : (
    <Monitor size={17} />
  );
}

export default function Home() {
  const [runs, setRuns] = useState<ScanRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [target, setTarget] = useState("lab");
  const [customUrl, setCustomUrl] = useState("");
  const [objective, setObjective] = useState(starterObjective);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeFinding, setActiveFinding] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"evidence" | "fix" | "test">("evidence");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/runs", { cache: "no-store" });
      const data = await response.json();
      setRuns(data.runs || []);
      setAiConfigured(Boolean(data.aiConfigured));
    } catch {
      /* Keep the last displayed run while the local server restarts. */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 1500);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!selectedId && runs[0]) setSelectedId(runs[0].id);
  }, [runs, selectedId]);

  const selected = runs.find((run) => run.id === selectedId) || null;
  const selectedFinding =
    selected?.findings.find((finding) => finding.id === activeFinding) ||
    selected?.findings[0] ||
    null;
  const totals = useMemo(
    () => ({
      scans: runs.length,
      findings: runs.reduce((sum, run) => sum + run.findings.length, 0),
      completed: runs.filter((run) => run.status === "complete").length,
    }),
    [runs],
  );

  async function startScan() {
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetUrl: target === "lab" ? "lab" : customUrl.trim(),
          objective: objective.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start scan");
      setSelectedId(data.run.id);
      setActiveFinding(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start scan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Layers3 size={24} strokeWidth={2.4} />
          </div>
          <div className="brand-word">
            PARALLEL<span>®</span>
          </div>
        </div>
        <div className="nav-group">
          <div className="nav-caption">WORKSPACE</div>
          <div className="nav-item active">
            <Activity size={18} /> Overview <span className="nav-active-dot" />
          </div>
          <a className="nav-item" href="#runs">
            <Clock3 size={18} /> Scan history <span className="nav-count">{runs.length}</span>
          </a>
          <a className="nav-item" href="#findings">
            <CircleAlert size={18} /> Findings
          </a>
        </div>
        <div className="nav-group second">
          <div className="nav-caption">RESOURCES</div>
          <a className="nav-item" href="/lab/checkout" target="_blank">
            <FlaskConical size={18} /> Sample lab{" "}
            <ExternalLink size={13} className="nav-external" />
          </a>
          <a
            className="nav-item"
            href="https://github.com/Zelvf/parallel-ai-qa#readme"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={18} /> Documentation <ExternalLink size={13} className="nav-external" />
          </a>
        </div>
        <div className="sidebar-bottom">
          <div className="engine-state">
            <span className="pulse-dot" />
            <div>
              <strong>Browser engine ready</strong>
              <small>Playwright / Chromium</small>
            </div>
          </div>
          <div className="workspace-user">
            <div className="user-avatar">P</div>
            <div>
              <strong>Local workspace</strong>
              <small>Developer environment</small>
            </div>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="crumb">
            WORKSPACE <span>/</span> OVERVIEW
          </div>
          <div className="top-actions">
            <span className="top-live">
              <span className="live-dot" /> SYSTEM ONLINE
            </span>
            <span className="top-separator" />
            <a href="/lab/checkout" target="_blank">
              Open sample lab <ArrowRight size={15} />
            </a>
          </div>
        </header>
        <div className="content">
          <div className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-line" /> AUTONOMOUS QA WORKSPACE
              </div>
              <h1>
                Find what
                <br />
                <em>humans miss.</em>
              </h1>
              <p>
                Run real browser journeys across devices. Catch hidden failures, inspect the
                evidence, and turn them into reproducible fixes.
              </p>
              <div className="hero-badges">
                <span>
                  <ShieldCheck size={15} /> Real browser sessions
                </span>
                <span>
                  <Radio size={15} /> Live evidence capture
                </span>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-grid" />
              <div className="visual-orbit orbit-outer" />
              <div className="visual-orbit orbit-middle" />
              <div className="visual-orbit orbit-inner" />
              <div className="visual-core">
                <Layers3 size={53} strokeWidth={1.15} />
              </div>
              <div className="visual-node node-a">
                <Monitor size={18} />
              </div>
              <div className="visual-node node-b">
                <Smartphone size={18} />
              </div>
              <div className="visual-node node-c">
                <Wifi size={18} />
              </div>
              <span className="visual-label visual-label-a">DESKTOP</span>
              <span className="visual-label visual-label-b">MOBILE</span>
              <span className="visual-label visual-label-c">NETWORK</span>
            </div>
          </div>

          <section className="launch-card" aria-labelledby="launch-heading">
            <div className="launch-head">
              <div>
                <div className="section-kicker">01 / INITIATE</div>
                <h2 id="launch-heading">Launch a scan</h2>
                <p>Choose a target and tell the browser agent what to test.</p>
              </div>
              <div className="engine-badge">
                <span className="engine-badge-dot" />{" "}
                {aiConfigured ? "AI EXPLORATION READY" : "GUIDED BROWSER MODE"}
              </div>
            </div>
            <div className="target-selector">
              <button
                className={`target-option ${target === "lab" ? "chosen" : ""}`}
                onClick={() => {
                  setTarget("lab");
                  setObjective(starterObjective);
                }}
              >
                <span className="target-icon">
                  <FlaskConical size={20} />
                </span>
                <span>
                  <strong>Sample checkout lab</strong>
                  <small>Start here · seeded mobile bug</small>
                </span>
                <span className="radio-circle">{target === "lab" && <span />}</span>
              </button>
              <button
                className={`target-option ${target === "custom" ? "chosen" : ""}`}
                onClick={() => setTarget("custom")}
              >
                <span className="target-icon">
                  <Globe2 size={20} />
                </span>
                <span>
                  <strong>Your website</strong>
                  <small>Test a URL you control</small>
                </span>
                <span className="radio-circle">{target === "custom" && <span />}</span>
              </button>
            </div>
            {target === "custom" && (
              <div className="form-field">
                <label htmlFor="url">TARGET URL</label>
                <input
                  id="url"
                  type="url"
                  placeholder="https://your-staging-app.com"
                  value={customUrl}
                  onChange={(event) => setCustomUrl(event.target.value)}
                />
              </div>
            )}
            <div className="form-field">
              <label htmlFor="objective">TEST OBJECTIVE</label>
              <textarea
                id="objective"
                rows={2}
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="What should the agent try to do?"
              />
            </div>
            <div className="launch-bottom">
              <div className="launch-note">
                <Sparkles size={16} />{" "}
                {target === "lab"
                  ? "Runs a scripted test across desktop, mobile, and slow network."
                  : aiConfigured
                    ? "AI chooses browser actions from visible controls."
                    : "Without an API key, scans same-origin links and captures failures."}
              </div>
              <button
                className="launch-button"
                onClick={startScan}
                disabled={
                  submitting || !objective.trim() || (target === "custom" && !customUrl.trim())
                }
              >
                <Play size={16} fill="currentColor" /> {submitting ? "Starting…" : "Start scan"}{" "}
                <ArrowRight size={17} />
              </button>
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
          </section>

          <div className="metrics">
            <div className="metric">
              <div className="metric-top">
                <span>TOTAL SCANS</span>
                <Activity size={18} />
              </div>
              <strong>{String(totals.scans).padStart(2, "0")}</strong>
              <small>
                Browser journeys initiated <ArrowDownRight size={13} />
              </small>
            </div>
            <div className="metric">
              <div className="metric-top">
                <span>FINDINGS</span>
                <CircleAlert size={18} />
              </div>
              <strong>{String(totals.findings).padStart(2, "0")}</strong>
              <small>Evidence backed issues</small>
            </div>
            <div className="metric">
              <div className="metric-top">
                <span>COMPLETED</span>
                <Check size={18} />
              </div>
              <strong>{String(totals.completed).padStart(2, "0")}</strong>
              <small>Full profile sweeps</small>
            </div>
          </div>

          <section className="runs-section" id="runs">
            <div className="section-heading">
              <div>
                <div className="section-kicker">02 / OBSERVE</div>
                <h2>Recent scans</h2>
              </div>
              <span className="section-aside">LIVE WORKSPACE ACTIVITY</span>
            </div>
            {runs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Terminal size={27} />
                </div>
                <h3>No scans yet</h3>
                <p>Launch the sample checkout lab to see PARALLEL inspect a real mobile failure.</p>
              </div>
            ) : (
              <div className="run-list">
                {runs.slice(0, 8).map((run) => (
                  <button
                    key={run.id}
                    onClick={() => {
                      setSelectedId(run.id);
                      setActiveFinding(null);
                      setDetailTab("evidence");
                    }}
                    className={`run-row ${selected?.id === run.id ? "selected" : ""}`}
                  >
                    <span className="run-icon">
                      <Globe2 size={18} />
                    </span>
                    <span className="run-main">
                      <strong>
                        {new URL(run.targetUrl).pathname === "/lab/checkout"
                          ? "Sample checkout lab"
                          : new URL(run.targetUrl).host}
                      </strong>
                      <small>{run.objective}</small>
                    </span>
                    <span className={`status-pill status-${run.status}`}>
                      <span />
                      {statusLabel(run.status)}
                    </span>
                    <span className="run-findings">{run.findings.length} findings</span>
                    <span className="run-time">{relativeTime(run.createdAt)}</span>
                    <ArrowRight size={17} className="run-arrow" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {selected && (
            <section className="detail-section" id="findings">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">03 / INVESTIGATE</div>
                  <h2>Run intelligence</h2>
                </div>
                <span className="run-id">RUN / {selected.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="detail-grid">
                <div className="profiles-panel">
                  <div className="panel-header">
                    <h3>Browser profiles</h3>
                    <span>3 ENVIRONMENTS</span>
                  </div>
                  {selected.profiles.map((profile) => (
                    <div className="profile-row" key={profile.name}>
                      <div className="profile-icon">
                        <ProfileIcon name={profile.name} />
                      </div>
                      <div className="profile-main">
                        <strong>{profile.name}</strong>
                        <small>
                          {profile.viewport} · {profile.actions} actions
                        </small>
                      </div>
                      <span className={`profile-state profile-${profile.status}`}>
                        {profile.status}
                      </span>
                    </div>
                  ))}
                  <div className="event-log">
                    <div className="panel-header">
                      <h3>Activity log</h3>
                      <span>{selected.events.length} EVENTS</span>
                    </div>
                    <div className="event-scroll">
                      {selected.events
                        .slice()
                        .reverse()
                        .slice(0, 18)
                        .map((item, index) => (
                          <div className="event-row" key={`${item.at}-${index}`}>
                            <span className={`event-dot event-${item.type}`} />
                            <span>
                              <strong>{item.profile}</strong> {item.message}
                            </span>
                            <time>
                              {new Date(item.at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </time>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="findings-panel">
                  <div className="panel-header">
                    <h3>Findings</h3>
                    <span>{selected.findings.length} DETECTED</span>
                  </div>
                  {selected.findings.length === 0 ? (
                    <div className="no-findings">
                      <div className="no-findings-icon">
                        {selected.status === "running" ? (
                          <Activity size={25} />
                        ) : (
                          <Check size={25} />
                        )}
                      </div>
                      <strong>
                        {selected.status === "running"
                          ? "Scan in progress"
                          : "No failures captured"}
                      </strong>
                      <p>
                        {selected.status === "running"
                          ? "Browser profiles are running. Evidence will appear here as it is captured."
                          : selected.mode === "guided-crawl"
                            ? "Guided crawl visited same-origin links. Configure an API key for goal-directed exploration."
                            : "The tested journey completed without an HTTP error or uncaught browser exception."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="finding-list">
                        {selected.findings.map((finding) => (
                          <button
                            className={`finding-item ${selectedFinding?.id === finding.id ? "active" : ""}`}
                            key={finding.id}
                            onClick={() => {
                              setActiveFinding(finding.id);
                              setDetailTab("evidence");
                            }}
                          >
                            <span className="finding-alert">
                              <CircleAlert size={17} />
                            </span>
                            <span>
                              <strong>{finding.title}</strong>
                              <small>
                                {finding.profile} · {finding.severity} severity
                              </small>
                            </span>
                            <ArrowRight size={16} />
                          </button>
                        ))}
                      </div>
                      {selectedFinding && (
                        <FindingDetail
                          finding={selectedFinding}
                          tab={detailTab}
                          setTab={setDetailTab}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          )}
          <footer className="footer">
            <span>PARALLEL / AI BROWSER TESTING LAB</span>
            <span>
              Built for controlled test environments ·{" "}
              {aiConfigured ? "AI configured" : "AI key optional"}
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function FindingDetail({
  finding,
  tab,
  setTab,
}: {
  finding: Finding;
  tab: "evidence" | "fix" | "test";
  setTab: (value: "evidence" | "fix" | "test") => void;
}) {
  return (
    <div className="finding-detail">
      <div className="detail-tabs">
        <button className={tab === "evidence" ? "active" : ""} onClick={() => setTab("evidence")}>
          Evidence
        </button>
        <button className={tab === "fix" ? "active" : ""} onClick={() => setTab("fix")}>
          Diagnosis & fix
        </button>
        <button className={tab === "test" ? "active" : ""} onClick={() => setTab("test")}>
          Regression test
        </button>
      </div>
      {tab === "evidence" && (
        <div className="tab-body">
          <div className="evidence-label">CAPTURED FAILURE</div>
          <p>{finding.evidence}</p>
          <div className="artifact-links">
            {finding.screenshot && (
              <a href={finding.screenshot} target="_blank">
                View screenshot <ExternalLink size={13} />
              </a>
            )}
            {finding.trace && (
              <a href={finding.trace} download>
                Download Playwright trace <ArrowRight size={13} />
              </a>
            )}
          </div>
          {finding.screenshot && (
            <a href={finding.screenshot} target="_blank" className="screenshot-preview">
              <img src={finding.screenshot} alt={`Screenshot of ${finding.title}`} />
            </a>
          )}
        </div>
      )}
      {tab === "fix" && (
        <div className="tab-body">
          <div className="evidence-label">
            {finding.proposedFix ? "CONFIRMED LAB DIAGNOSIS" : "AI HYPOTHESIS"}
          </div>
          <p>
            {finding.diagnosis ||
              "No source-level diagnosis is available for this run. Inspect the browser trace and server logs."}
          </p>
          {finding.proposedFix && (
            <>
              <div className="evidence-label">PROPOSED CHANGE · NOT APPLIED</div>
              <pre>{finding.proposedFix}</pre>
            </>
          )}
        </div>
      )}
      {tab === "test" && (
        <div className="tab-body">
          <div className="evidence-label">REPRODUCIBLE CHECK</div>
          {finding.regressionTest ? (
            <pre>{finding.regressionTest}</pre>
          ) : (
            <p>
              Open the Playwright trace to reproduce this failure. Automated test generation is
              currently available for the sample lab.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
