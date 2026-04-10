import { NextRequest, NextResponse } from "next/server";
import { callClaudeForJson } from "@/lib/anthropic";
import { buildDebriefPrompt } from "@/lib/prompts";
import { getScenario, MAX_TURNS } from "@/lib/scenarios";
import { DebriefRequest, DebriefResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DebriefRequest;
    const { scenarioId, history, totalScore, maxScore } = body;

    const scenario = getScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Unknown scenario" }, { status: 404 });
    }

    const prompt = buildDebriefPrompt({
      scenario,
      history,
      totalScore,
      maxScore,
      maxTurns: MAX_TURNS,
    });

    const result = await callClaudeForJson<DebriefResponse>(
      prompt,
      ["headline", "strength", "growth"],
      600
    );

    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("dojo-debrief error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
