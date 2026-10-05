import OpenAI from "openai";
import type { Finding } from "./types";

export type PlannedAction = {
  action: "click" | "fill" | "done";
  target: string;
  value: string;
  reason: string;
};

function client() {
  return process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

export async function planAction(
  objective: string,
  pageUrl: string,
  controls: string[],
  history: string[],
): Promise<PlannedAction> {
  const ai = client();
  if (!ai) throw new Error("OPENAI_API_KEY is not configured");
  const response = await ai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.1",
    input: `You are a browser QA agent testing a user-owned app. Objective: ${objective}. Current URL: ${pageUrl}.\nInteractive controls (use their exact numeric index):\n${controls.join("\n")}\nPrior actions: ${history.join(" | ")}\nChoose one safe action. Avoid real payments, account deletion, messaging, and external sites. Return only JSON: {"action":"click|fill|done","target":"control index as string","value":"text for fill, otherwise empty","reason":"brief"}. Prefer testing forms and primary flows.`,
  });
  const action = parseJson<PlannedAction>(response.output_text);
  if (!["click", "fill", "done"].includes(action.action))
    throw new Error("Model returned an unsupported action");
  return action;
}

export async function diagnoseFinding(finding: Finding): Promise<string | null> {
  const ai = client();
  if (!ai) return null;
  try {
    const response = await ai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.1",
      input: `You are diagnosing a web app failure. Use only the evidence provided. Never claim you inspected source code. Give a concise likely cause, a verification step, and a possible fix. Explicitly label uncertainty.\nURL: ${finding.url}\nTitle: ${finding.title}\nEvidence: ${finding.evidence}`,
    });
    return response.output_text.trim();
  } catch {
    return null;
  }
}
