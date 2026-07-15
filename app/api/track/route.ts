import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Events tracked:
 * - drill_started: user began a drill (scenario_id)
 * - drill_completed: user submitted a response (scenario_id, score, passed)
 * - drill_retried: user retried after failing (scenario_id, attempt)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, scenario_id, visitor_id, score, passed, attempt } = body;

    if (!event || !visitor_id) {
      return NextResponse.json({ error: "Missing event or visitor_id" }, { status: 400 });
    }

    const { error } = await supabase.from("events").insert({
      event,
      scenario_id: scenario_id || null,
      visitor_id,
      score: score ?? null,
      passed: passed ?? null,
      attempt: attempt ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase insert error:", error);
      // Don't fail the user experience over tracking
      return NextResponse.json({ ok: true, warning: "tracking failed silently" });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track error:", err);
    // Never fail the user experience over tracking
    return NextResponse.json({ ok: true });
  }
}
