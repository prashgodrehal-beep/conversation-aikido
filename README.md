# Conversation Aikido Dojo

A live practice tool for the 3-step Aikido method (Validate → Mirror → Inquire). AI plays the difficult counterpart, scores your response per turn, and delivers a debrief at the end.

Built by GrowthAspire.

---

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Anthropic SDK (`@anthropic-ai/sdk`)
- Stateless — no database, no auth

---

## Local development

```bash
npm install
cp .env.example .env.local
# Edit .env.local and paste your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

---

## Deploy to Vercel (10 minutes)

1. Push this folder to a GitHub repo (private is fine).
2. Go to vercel.com → **Add New Project** → import the repo.
3. In **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
   - (optional) `ANTHROPIC_MODEL` = `claude-sonnet-4-5` (default) or `claude-haiku-4-5-20251001` for cheaper sessions
4. Click **Deploy**.
5. Done. Your URL is live.

---

## How to tune the product (without touching component code)

**To add or edit scenarios** → `lib/scenarios.ts`. Just edit the `SCENARIOS` array. Each scenario is a plain object with `id`, `category`, `difficulty`, `title`, `persona`, `opening`, and `context`. Add as many as you want.

**To tune the AI** → `lib/prompts.ts`. The two prompts (`buildTurnPrompt` and `buildDebriefPrompt`) are the entire personality of the coach and counterpart. If the counterpart feels too soft, edit the turn prompt. If the scoring feels generous, tighten the rubric in the same file.

**To swap models** → set `ANTHROPIC_MODEL` env var in Vercel. No code change.

That's the whole iteration loop. Everything else is plumbing.

---

## Cost estimate

At Sonnet 4.5 pricing, one full 4-turn session is roughly **$0.04–0.06** (4 turn calls + 1 debrief call). 1,000 sessions ≈ $40–60.

Switch `ANTHROPIC_MODEL` to Haiku 4.5 to cut that ~5x with a small quality drop on the counterpart character work.

---

## File map

```
app/
  layout.tsx              Root layout, fonts, metadata
  page.tsx                Renders <DojoApp />
  globals.css             All custom styles
  api/
    dojo-turn/route.ts    Handles each user turn
    dojo-debrief/route.ts Handles end-of-session summary
components/
  DojoApp.tsx             The whole 3-screen UI (Method, Picker, Dojo)
lib/
  types.ts                Shared TypeScript types
  scenarios.ts            Scenario library — EDIT TO ADD MORE
  prompts.ts              The 2 prompts — EDIT TO TUNE THE PRODUCT
  anthropic.ts            SDK client + robust JSON extractor with retry
```

---

## What's intentionally NOT in v1

- No rate limiting (add Upstash Redis later if abuse appears)
- No email capture / lead gating (add ConvertKit when ready)
- No analytics (drop in Plausible or PostHog when needed)
- No persistent session storage (intentional — keeps it stateless and free)
- No auth

All of these are 1–2 hour additions on top of the current architecture.
