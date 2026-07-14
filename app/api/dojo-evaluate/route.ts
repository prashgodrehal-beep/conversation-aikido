import { NextRequest, NextResponse } from "next/server";
import { callClaudeForJson } from "@/lib/anthropic";
import { buildEvaluatePrompt } from "@/lib/prompts";
import { getScenario } from "@/lib/scenarios";
import { EvaluateRequest, EvaluateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateRequest;
    const { scenarioId, userResponse, attempt, previousFeedback } = body;

    if (!scenarioId || !userResponse?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const scenario = getScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Unknown scenario" }, { status: 404 });
    }

    const prompt = buildEvaluatePrompt({ scenario, userResponse, attempt, previousFeedback });
    const result = await callClaudeForJson<EvaluateResponse>(
      prompt,
      ["scores", "passed", "feedback", "strength_line", "improve_line"],
      800
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("dojo-evaluate error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
