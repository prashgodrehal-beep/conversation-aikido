import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

export function extractJson<T = unknown>(text: string): T {
  if (!text) throw new Error("Empty response");
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const first = cleaned.indexOf("{");
  if (first === -1) throw new Error("No JSON found");
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = first; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("Unterminated JSON");
  return JSON.parse(cleaned.slice(first, end + 1)) as T;
}

export async function callClaudeForJson<T>(prompt: string, requiredKeys: string[], maxTokens = 800): Promise<T> {
  const attempt = async (p: string): Promise<T> => {
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: p }] });
    const block = res.content[0];
    if (block.type !== "text") throw new Error("Non-text response");
    const parsed = extractJson<Record<string, unknown>>(block.text);
    for (const k of requiredKeys) if (!(k in parsed)) throw new Error(`Missing: ${k}`);
    return parsed as T;
  };
  try { return await attempt(prompt); }
  catch (err) {
    console.warn("Retry:", (err as Error).message);
    return await attempt(prompt + "\n\nIMPORTANT: Respond with ONLY the JSON object.");
  }
}
