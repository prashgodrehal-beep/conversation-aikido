"use client";

/**
 * Client-side tracking utilities.
 *
 * Handles:
 * 1. Anonymous visitor ID (localStorage) for Supabase events
 * 2. PostHog initialization
 * 3. Fire-and-forget event tracking to both systems
 */

// ── Visitor ID ─────────────────────────────────────────────
// Persists across sessions in localStorage. Not a real user ID —
// just enough to approximate unique visitors and return visits.
function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("dojo_visitor_id");
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("dojo_visitor_id", id);
  }
  return id;
}

// ── PostHog ────────────────────────────────────────────────
let posthogLoaded = false;

export function initPostHog() {
  if (typeof window === "undefined" || posthogLoaded) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // PostHog is optional — works without it

  try {
    // Load PostHog via dynamic import (keeps bundle small)
    import("posthog-js").then((mod) => {
      const posthog = mod.default;
      posthog.init(key, {
        api_host: "https://us.i.posthog.com",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false, // we fire our own events
      });
      posthogLoaded = true;
    });
  } catch {
    // PostHog failure should never break the app
  }
}

// ── Event Tracking ─────────────────────────────────────────
// Fires to both Supabase (for your social proof counter) and
// PostHog (for your behavioral analytics). Both are fire-and-forget.

interface TrackEvent {
  event: "drill_started" | "drill_completed" | "drill_retried";
  scenario_id?: string;
  score?: number;
  passed?: boolean;
  attempt?: number;
}

export function trackEvent(data: TrackEvent) {
  const visitorId = getVisitorId();

  // 1. Supabase (for social proof counter + your analytics)
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, visitor_id: visitorId }),
  }).catch(() => {}); // silent fail

  // 2. PostHog (for detailed behavioral analytics)
  if (typeof window !== "undefined" && posthogLoaded) {
    import("posthog-js").then((mod) => {
      mod.default.capture(data.event, {
        scenario_id: data.scenario_id,
        score: data.score,
        passed: data.passed,
        attempt: data.attempt,
        visitor_id: visitorId,
      });
    }).catch(() => {});
  }
}
