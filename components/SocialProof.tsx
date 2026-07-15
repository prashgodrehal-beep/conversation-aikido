"use client";

import { useState, useEffect } from "react";

interface Stats {
  practitioners: number;
  drills_completed: number;
  passes: number;
}

export function SocialProof() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  // Don't show until there's meaningful data (at least 5 practitioners)
  if (!stats || stats.practitioners < 5) return null;

  // Round down to nearest 5 for a natural feel ("25+" not "27")
  const roundDown = (n: number) => Math.floor(n / 5) * 5;
  const practitioners = roundDown(stats.practitioners);
  const drills = roundDown(stats.drills_completed);

  return (
    <div className="fade-in flex items-center justify-center gap-6 py-3 px-6 rounded-full mx-auto w-fit"
      style={{ background: "rgba(11,31,58,0.04)", border: "1px solid rgba(11,31,58,0.06)" }}>
      <Stat value={`${practitioners}+`} label="professionals practicing" />
      <div className="w-px h-6" style={{ background: "rgba(11,31,58,0.1)" }} />
      <Stat value={`${drills}+`} label="drills completed" />
      {stats.passes > 10 && (
        <>
          <div className="w-px h-6" style={{ background: "rgba(11,31,58,0.1)" }} />
          <Stat value={`${Math.round((stats.passes / stats.drills_completed) * 100)}%`} label="pass rate" />
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="display font-bold text-lg" style={{ color: "var(--navy)" }}>{value}</div>
      <div className="text-[10px] font-medium" style={{ color: "rgba(11,31,58,0.5)" }}>{label}</div>
    </div>
  );
}
