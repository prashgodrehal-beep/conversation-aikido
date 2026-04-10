import { NextRequest, NextResponse } from "next/server";
import { callClaudeForJson } from "@/lib/anthropic";
import { buildTurnPrompt } from "@/lib/prompts";
import { getScenario } from "@/lib/scenarios";
import { TurnRequest, TurnResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TurnRequest;
    const { scenarioId, history, fields, turnNumber, maxTurns } = body;

    if (!scenarioId || !fields || !history) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!fields.validate?.trim() || !fields.mirror?.trim() || !fields.inquire?.trim()) {
      return NextResponse.json(
        { error: "All three Aikido fields are required" },
        { status: 400 }
      );
    }

    const scenario = getScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Unknown scenario" }, { status: 404 });
    }

    const prompt = buildTurnPrompt({
      scenario,
      history,
      fields,
      turnNumber,
      maxTurns,
    });

    const result = await callClaudeForJson<TurnResponse>(
      prompt,
      ["counterpart_reply", "scores", "coach_tip"],
      800
    );

    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("dojo-turn error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
