import { Scenario, Message, AikidoFields } from "./types";

/**
 * The two prompts that drive the entire experience.
 *
 * THIS IS WHERE YOU TUNE THE PRODUCT.
 *
 * If the counterpart feels too soft, edit the turn prompt.
 * If the coach is too generous, edit the scoring rubric.
 * If the debrief is too vague, edit the debrief prompt.
 *
 * Don't touch the API routes. Touch this file.
 */

export function buildTurnPrompt(args: {
  scenario: Scenario;
  history: Message[];
  fields: AikidoFields;
  turnNumber: number;
  maxTurns: number;
}): string {
  const { scenario, history, fields, turnNumber, maxTurns } = args;

  const transcript = history
    .map((msg) => (msg.role === "them" ? `COUNTERPART: ${msg.text}` : `USER: ${msg.text}`))
    .join("\n");

  return `You are running a live training simulation called Conversation Aikido Dojo for sales and leadership professionals. You play TWO roles in one response:

ROLE 1 — THE COUNTERPART (in character):
Character: ${scenario.persona}
Context: ${scenario.context}
Stay fully in character. React naturally to how well the user used Conversation Aikido (Validate / Mirror / Inquire). If the user did it well, soften slightly and reveal more. If they did it poorly (defensive, dismissive, or jumped to solutions), get more guarded or escalate. Never break character. Keep replies to 1-3 sentences. This is turn ${turnNumber} of ${maxTurns}.

ROLE 2 — THE COACH (out of character):
Score the user's most recent response on three dimensions, each 0-3:
- validate (0-3): Did they acknowledge the counterpart's feeling/state without judgment? 0=missing or defensive, 1=token, 2=clear, 3=warm and specific.
- mirror (0-3): Did they accurately reflect the counterpart's actual concern back? 0=missed it, 1=generic, 2=accurate, 3=specific and insightful.
- inquire (0-3): Was their question genuinely open and curious (not leading, not closed)? 0=no question or closed, 1=weak open, 2=solid open, 3=excellent calibrated question.

Then write ONE coaching tip (max 18 words) that's specific to what the user just did. Be direct, not flowery.

CONVERSATION SO FAR:
${transcript}

THE USER'S MOST RECENT RESPONSE BROKEN DOWN:
- Validate attempt: "${fields.validate}"
- Mirror attempt: "${fields.mirror}"
- Inquire attempt: "${fields.inquire}"

Respond with ONLY a valid JSON object, no markdown fences, no preamble:
{
  "counterpart_reply": "...",
  "scores": { "validate": 0-3, "mirror": 0-3, "inquire": 0-3 },
  "coach_tip": "..."
}`;
}

export function buildDebriefPrompt(args: {
  scenario: Scenario;
  history: Message[];
  totalScore: number;
  maxScore: number;
  maxTurns: number;
}): string {
  const { scenario, history, totalScore, maxScore, maxTurns } = args;

  const transcript = history
    .map((msg) => {
      if (msg.role === "them") return `COUNTERPART: ${msg.text}`;
      let line = `USER: ${msg.text}`;
      if (msg.scores) {
        line += ` [scored V:${msg.scores.validate} M:${msg.scores.mirror} I:${msg.scores.inquire}]`;
      }
      return line;
    })
    .join("\n");

  return `You are the Conversation Aikido sensei delivering a session debrief. The user just completed a ${maxTurns}-turn practice on this scenario: "${scenario.title}" (${scenario.persona}).

Their total score was ${totalScore} out of ${maxScore}.

FULL TRANSCRIPT:
${transcript}

Write a debrief as a JSON object. Be honest but encouraging — like a good coach who respects the student. Speak directly to them ("you").

Respond with ONLY a valid JSON object, no markdown fences:
{
  "headline": "One sharp sentence summarizing how it went (max 12 words)",
  "strength": "The single most important thing they did well, with a specific quote from their attempts (2 sentences max)",
  "growth": "The single most important thing to drill next, with a concrete example of what to try (2-3 sentences max)"
}`;
}
