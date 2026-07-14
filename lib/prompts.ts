import { Scenario } from "./types";

export function buildEvaluatePrompt(args: {
  scenario: Scenario;
  userResponse: string;
  attempt: number;
  previousFeedback?: string;
}): string {
  const { scenario, userResponse, attempt, previousFeedback } = args;

  const retryContext = previousFeedback
    ? `\nThis is attempt ${attempt} of 3. In their previous attempt, the feedback was: "${previousFeedback}"\nCheck whether they improved on that specific point.\n`
    : "";

  return `You are "Prash," a communication coach evaluating a single response in a Conversation Aikido drill.

THE SCENARIO:
Title: ${scenario.title}
Goal: ${scenario.goal}
Situation: ${scenario.situation}
Counterpart: ${scenario.counterpart}

THE COUNTERPART SAID:
"${scenario.opening}"

THE USER RESPONDED:
"${userResponse}"
${retryContext}
EVALUATE on 4 dimensions (0-10 each):

1. tacticalEmpathy (0-10): Did they validate the counterpart's emotional state? Did they use "I understand" or equivalent? Did they mirror the concern accurately?
   0=defensive/dismissive, 3=token, 5=adequate, 7=good, 9-10=masterful.

2. boundaryIntegrity (0-10): Did they hold their position without caving, people-pleasing, or over-promising? Did they avoid giving in just to end the tension?
   0=completely caved, 5=wobbled, 7=firm and clear, 9-10=firm yet warm.

3. emotionalCalibration (0-10): Was their tone appropriate? Not too cold, soft, or aggressive? Did they match the emotional temperature of the situation?
   0=wildly off, 5=adequate, 7=well-matched, 9-10=pitch-perfect.

4. strategicQuality (0-10): Did they move toward the real issue? Did they ask an open question? Did they redirect energy rather than resist it?
   0=went nowhere, 5=adequate, 7=good open question, 9-10=uncovered the real need.

composite = average of all 4, rounded to nearest integer.
passed = composite >= ${scenario.passThreshold}

Then write:
- feedback: 2-3 sentences of direct coaching. Be specific about what they said. Sound like a tough but warm coach, not corporate HR. If this is a retry, acknowledge what improved.
- strength_line: One sentence — the single best thing they did, quoting their words if possible.
- improve_line: One sentence — the single most important thing to fix next time. Be concrete.

Respond with ONLY valid JSON, no fences, no preamble:
{
  "scores": { "tacticalEmpathy": N, "boundaryIntegrity": N, "emotionalCalibration": N, "strategicQuality": N, "composite": N },
  "passed": true/false,
  "feedback": "...",
  "strength_line": "...",
  "improve_line": "..."
}`;
}
