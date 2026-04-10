import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn("ANTHROPIC_API_KEY is not set. API routes will fail.");
}

export const anthropic = new Anthropic({
  apiKey: apiKey ?? "",
});

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

/**
 * Robust JSON extraction.
 * Handles: code fences, leading/trailing prose, brace-matching with string awareness.
 * Same logic as the artifact prototype — proven against edge cases.
 */
export function extractJson<T = unknown>(text: string): T {
  if (!text) throw new Error("Empty response from model");

  // Strip code fences if present
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Find first opening brace
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) throw new Error("No JSON object found in response");

  // Walk forward, tracking brace depth, ignoring braces inside strings
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;

  for (let i = firstBrace; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx === -1) throw new Error("Unterminated JSON object (response truncated)");

  const jsonStr = cleaned.slice(firstBrace, endIdx + 1);
  return JSON.parse(jsonStr) as T;
}

/**
 * Call Claude with a prompt, parse the JSON, and retry once if parsing fails.
 * The retry appends a reinforcement instruction.
 */
export async function callClaudeForJson<T = unknown>(
  prompt: string,
  requiredKeys: string[],
  maxTokens: number = 800
): Promise<T> {
  const attempt = async (p: string): Promise<T> => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: p }],
    });

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Non-text response block");
    const raw = block.text;

    const parsed = extractJson<Record<string, unknown>>(raw);
    for (const key of requiredKeys) {
      if (!(key in parsed)) throw new Error(`Missing key: ${key}`);
    }
    return parsed as T;
  };

  try {
    return await attempt(prompt);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("First Claude call failed, retrying:", (err as Error).message);
    const reinforced =
      prompt +
      "\n\nIMPORTANT: Your previous response was not valid JSON. Respond with ONLY the JSON object, starting with { and ending with }. No other text.";
    return await attempt(reinforced);
  }
}
