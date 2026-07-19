import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { count: total } = await supabase
      .from("scenario_submissions")
      .select("*", { count: "exact", head: true });

    const { data: recent } = await supabase
      .from("scenario_submissions")
      .select("scenario_title")
      .not("scenario_title", "is", null)
      .order("created_at", { ascending: false })
      .limit(12);

    const recentTitles = (recent || [])
      .map(function (r) { return r.scenario_title; })
      .filter(Boolean) as string[];

    return NextResponse.json({ total: total || 0, recent: recentTitles });
  } catch (_err) {
    return NextResponse.json({ total: 0, recent: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, goals, scenario_title, situation, counterpart_says, goal } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { error } = await supabase.from("scenario_submissions").insert({
      name: name?.trim() || null,
      email: email.trim(),
      role: role || null,
      goals: goals && goals.length > 0 ? goals : null,
      scenario_title: scenario_title?.trim() || null,
      situation: situation?.trim() || null,
      counterpart_says: counterpart_says?.trim() || null,
      goal: goal?.trim() || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Submission failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (_err) {
    console.error("Submit error:", _err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
