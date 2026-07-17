import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// GET: return submission stats (for social proof on landing page)
export async function GET() {
  try {
    const { count: total } = await supabase
      .from("scenario_submissions")
      .select("*", { count: "exact", head: true });

    // Get recent scenario titles (only ones with titles, for the ticker)
    const { data: recent } = await supabase
      .from("scenario_submissions")
      .select("scenario_title")
      .not("scenario_title", "is", null)
      .order("created_at", { ascending: false })
      .limit(12);

    const recentTitles = (recent || [])
      .map((r) => r.scenario_title)
      .filter(Boolean) as string[];

    return NextResponse.json({
      total: total || 0,
      recent: recentTitles,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ total: 0, recent: [] });
  }
}

// POST: submit a scenario + email for early access
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, scenario_title, situation, counterpart_says, goal } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { error } = await supabase.from("scenario_submissions").insert({
      name: name?.trim() || null,
      email: email.trim(),
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
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
