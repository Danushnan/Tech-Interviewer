import type { Feedback, Workspace } from "./types";
import { initialWorkspace } from "./data";

const storageKey = "prepwise.workspace.v1";
export function loadLocal(): Workspace {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      data?.profile &&
      Array.isArray(data.tasks) &&
      Array.isArray(data.skills) &&
      Array.isArray(data.sessions) &&
      Array.isArray(data.saved_questions)
    )
      return data;
  } catch {
    /* Start clean if storage is unavailable or corrupt. */
  }
  return initialWorkspace();
}
export function persist(data: Workspace) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    /* The current session can still run. */
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const error = await response.json();
      message =
        typeof error.detail === "string"
          ? error.detail
          : error.detail?.[0]?.msg || message;
    } catch {
      /* An unavailable backend may return HTML. */
    }
    throw new Error(message);
  }
  return response.json();
}
export function localFeedback(answer: string): Feedback {
  const words = answer.trim().split(/\s+/);
  const specific =
    /\d|\b(project|built|implemented|designed|tested|team)\b/i.test(answer);
  const reflection =
    /\b(learned|learnt|next time|improve|reflect|because)\b/i.test(answer);
  return {
    summary:
      "A useful first draft. This offline checklist looks at writing signals; it does not assess the correctness of your answer.",
    strengths: [
      specific
        ? "You included a concrete detail that you can build your story around."
        : `You have put ${words.length} words of your thinking into practice.`,
    ],
    improvements: [
      "Make your individual contribution explicit: what did you decide or do?",
      reflection
        ? "Try explaining the same idea more concisely, keeping your strongest example."
        : "Finish with a result or a lesson you can carry into your next experience.",
    ],
    follow_up:
      "What was the most important decision you personally made, and why?",
    evidence: words.slice(0, 18).join(" "),
    rubric: {
      Structure: Math.min(4, 1 + Math.floor(words.length / 35)),
      Specificity: specific ? 3 : 1,
      Reflection: reflection ? 3 : 1,
    },
    source: "checklist",
  };
}
