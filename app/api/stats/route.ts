import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
// Cache for 60 seconds so we don't hammer Supabase on every page load
export const revalidate = 60;

export async function GET() {
  try {
    // Total unique visitors who started a drill
    const { count: totalPractitioners } = await supabase
      .from("events")
      .select("visitor_id", { count: "exact", head: true })
      .eq("event", "drill_started");

    // Total drills completed
    const { count: totalDrills } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event", "drill_completed");

    // Total passes
    const { count: totalPasses } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event", "drill_completed")
      .eq("passed", true);

    // Unique visitors who came back (more than 1 drill_started on different days)
    // This is a rough proxy — proper return tracking needs Phase 1 auth
    const { data: returnData } = await supabase
      .from("events")
      .select("visitor_id, created_at")
      .eq("event", "drill_started");

    let returningVisitors = 0;
    if (returnData) {
      const visitorDays = new Map<string, Set<string>>();
      for (const row of returnData) {
        const day = row.created_at?.slice(0, 10) || "";
        if (!visitorDays.has(row.visitor_id)) visitorDays.set(row.visitor_id, new Set());
        visitorDays.get(row.visitor_id)!.add(day);
      }
      returningVisitors = [...visitorDays.values()].filter((days) => days.size > 1).length;
    }

    return NextResponse.json({
      practitioners: totalPractitioners || 0,
      drills_completed: totalDrills || 0,
      passes: totalPasses || 0,
      returning_visitors: returningVisitors,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ practitioners: 0, drills_completed: 0, passes: 0, returning_visitors: 0 });
  }
}
