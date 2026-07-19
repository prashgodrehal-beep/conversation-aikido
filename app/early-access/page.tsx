"use client";

import { useState, useEffect, useRef } from "react";
import { ROLES, GOALS, buildPaths, type RoleId, type GoalId, type PreparationPath } from "@/lib/paths";

const PREVIEW_SCENARIOS = [
  { title: "The Toxic High Performer", category: "Leadership", desc: "Your star PM rolls their eyes at your direction. Two team members have complained." },
  { title: "The Price Objection", category: "Sales", desc: "Your quote came in 30% higher. The prospect likes you but cannot justify it to their CFO." },
  { title: "The Angry Escalation", category: "Client", desc: "Third escalation call. Payment processing failed during month-end close." },
  { title: "The Founder Disagreement", category: "Conflict", desc: "Your co-founder wants to take a bad deal. You have four months of runway." },
  { title: "The Competitor Card", category: "Sales", desc: "They just saw your competitor. 25% cheaper. Same features. Why should they pick you?" },
  { title: "The Scope Creep", category: "Client", desc: "Third small ask this month. The client does not realize they are asking for free work." },
];

export default function EarlyAccessPage() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleId | "">("");
  const [selectedGoals, setSelectedGoals] = useState<GoalId[]>([]);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [situation, setSituation] = useState("");
  const [counterpartSays, setCounterpartSays] = useState("");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paths, setPaths] = useState<PreparationPath[]>([]);
  const [stats, setStats] = useState<{ total: number; recent: string[] } | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/submit-scenario?stats=true")
      .then((r) => r.json())
      .then(setStats)
      .catch(function () {});
  }, [step]);

  const toggleGoal = (goalId: GoalId) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) return prev.filter((g) => g !== goalId);
      if (prev.length >= 3) return prev;
      return [...prev, goalId];
    });
  };

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Email is required for early access."); return; }
    if (!role) { setError("Please select your role."); return; }
    if (selectedGoals.length === 0) { setError("Please select at least one goal."); return; }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/submit-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role: role,
          goals: selectedGoals,
          scenario_title: scenarioTitle.trim() || null,
          situation: situation.trim() || null,
          counterpart_says: counterpartSays.trim() || null,
          goal: goal.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");

      const generatedPaths = buildPaths(selectedGoals);
      setPaths(generatedPaths);
      setStep("success");
      window.scrollTo(0, 0);
    } catch (_err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ── SUCCESS SCREEN WITH PATH PREVIEW ───────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--navy)" }}>
              <span className="display font-bold text-xl" style={{ color: "var(--amber)" }}>G</span>
            </div>
            <div className="leading-tight">
              <div className="display font-bold text-base" style={{ color: "var(--navy)" }}>GrowthAspire</div>
              <div className="text-xs" style={{ color: "rgba(11,31,58,0.6)" }}>The Practice Lab</div>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center mb-12 fade-in">
            <div className="text-5xl mb-4">🥋</div>
            <h1 className="display text-4xl font-bold mb-3" style={{ color: "var(--navy)" }}>
              You are in{name ? `, ${name.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-lg" style={{ color: "rgba(11,31,58,0.7)" }}>
              Here is your personalized preparation path based on what you told us.
            </p>
          </div>

          {/* Preparation paths */}
          <div className="space-y-8 mb-12">
            {paths.map((path, pi) => (
              <div key={pi} className="bg-white rounded-2xl p-7 fade-in" style={{ border: "1px solid rgba(11,31,58,0.08)", animationDelay: `${pi * 150}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="pill mb-2" style={{ background: "rgba(20,184,166,0.12)", color: "var(--teal)" }}>
                      Path {pi + 1}
                    </div>
                    <h3 className="display text-2xl font-bold" style={{ color: "var(--navy)" }}>{path.label}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold" style={{ color: "rgba(11,31,58,0.4)" }}>{path.scenarios.length} scenarios</div>
                    <div className="text-xs" style={{ color: "rgba(11,31,58,0.3)" }}>~{path.estimatedMinutes} min</div>
                  </div>
                </div>
                <p className="text-sm mb-5 leading-relaxed" style={{ color: "rgba(11,31,58,0.6)" }}>{path.description}</p>
                <div className="space-y-2">
                  {path.scenarios.map((s, si) => {
                    const dotCount = s.difficulty === "Easy" ? 1 : s.difficulty === "Medium" ? 2 : 3;
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(11,31,58,0.02)" }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--navy)", color: "var(--amber)" }}>
                          {si + 1}
                        </div>
                        <div className="flex-1 text-sm font-medium" style={{ color: "var(--navy)" }}>{s.title}</div>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="difficulty-dot" style={{ background: i < dotCount ? (dotCount === 3 ? "var(--amber)" : "var(--teal)") : "#e7e0cc" }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* What happens next */}
          <div className="bg-white rounded-2xl p-7 text-center fade-in" style={{ border: "2px solid rgba(20,184,166,0.2)" }}>
            <h3 className="display text-xl font-bold mb-3" style={{ color: "var(--navy)" }}>What happens next</h3>
            <p className="text-sm leading-relaxed mb-2" style={{ color: "rgba(11,31,58,0.7)" }}>
              We will email you when early access opens with your personalized path ready to go.
            </p>
            {scenarioTitle && (
              <p className="text-sm" style={{ color: "rgba(11,31,58,0.5)" }}>
                Your scenario &quot;{scenarioTitle}&quot; has been submitted. If it makes the cut, you will be the first to practice it.
              </p>
            )}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={function () { setStep("form"); setName(""); setEmail(""); setRole(""); setSelectedGoals([]); setScenarioTitle(""); setSituation(""); setCounterpartSays(""); setGoal(""); setPaths([]); }}
              className="btn-outline px-6 py-3 rounded-full font-semibold text-sm"
            >
              Submit another scenario
            </button>
          </div>
        </div>

        <footer className="text-center pb-10 pt-6 text-xs" style={{ color: "rgba(11,31,58,0.4)" }}>
          Built by GrowthAspire · Based on methods from Conor Neill, Chris Voss and Tactical Empathy research
        </footer>
      </div>
    );
  }

  // ── MAIN FORM SCREEN ───────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--navy)" }}>
            <span className="display font-bold text-xl" style={{ color: "var(--amber)" }}>G</span>
          </div>
          <div className="leading-tight">
            <div className="display font-bold text-base" style={{ color: "var(--navy)" }}>GrowthAspire</div>
            <div className="text-xs" style={{ color: "rgba(11,31,58,0.6)" }}>The Practice Lab</div>
          </div>
        </div>
        {stats && stats.total > 0 && (
          <div className="pill" style={{ background: "rgba(20,184,166,0.12)", color: "var(--teal)" }}>
            {stats.total} professional{stats.total === 1 ? "" : "s"} joined
          </div>
        )}
      </nav>

      {/* Hero */}
      <header className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="pill mb-6" style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)" }}>
          Early Access · Launching Soon
        </div>
        <h1 className="display text-4xl md:text-6xl font-bold mb-6 leading-[0.95]" style={{ color: "var(--navy)" }}>
          Practice your hardest<br />conversations <span className="italic" style={{ color: "var(--teal)" }}>before</span> they happen.
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8" style={{ color: "rgba(11,31,58,0.7)" }}>
          A roleplay-based coaching experience built on methods used by FBI negotiators and top sales leaders. Practice real conversations. Get scored by an expert-trained coach. Walk into your next meeting ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={scrollToForm} className="btn-primary px-8 py-4 rounded-full font-semibold text-sm tracking-wide">
            Get Your Preparation Path →
          </button>
        </div>
      </header>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>How it works</h2>
          <p style={{ color: "rgba(11,31,58,0.6)" }}>Tell us your role and goals. We build your path. You practice.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", title: "Tell us who you are", desc: "Your role and what conversations you face. In 30 seconds, we know what you need to practice." },
            { n: "02", title: "Get your preparation path", desc: "A curated sequence of scenarios matched to your reality — ordered from fundamentals to advanced." },
            { n: "03", title: "Practice and get coached", desc: "A trained counterpart pushes back. You respond. An expert coach scores you on 4 dimensions and shows you what to say differently." },
          ].map(function (s) {
            return (
              <div key={s.n} className="bg-white rounded-2xl p-7" style={{ border: "1px solid rgba(11,31,58,0.08)" }}>
                <div className="display text-4xl font-bold mb-4" style={{ color: "rgba(11,31,58,0.08)" }}>{s.n}</div>
                <h3 className="font-bold text-lg mb-2" style={{ color: "var(--navy)" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.6)" }}>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Scenarios preview */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>Scenarios already in the lab</h2>
          <p style={{ color: "rgba(11,31,58,0.6)" }}>Curated by GrowthAspire coaches from 90+ enterprise engagements. Adding more every week based on what YOU submit.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREVIEW_SCENARIOS.map(function (s) {
            return (
              <div key={s.title} className="bg-white rounded-xl p-5" style={{ border: "1px solid rgba(11,31,58,0.08)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="pill" style={{ background: "rgba(11,31,58,0.05)", color: "var(--navy)" }}>{s.category}</span>
                </div>
                <h4 className="font-bold mb-1.5" style={{ color: "var(--navy)" }}>{s.title}</h4>
                <p className="text-xs leading-snug" style={{ color: "rgba(11,31,58,0.55)" }}>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Form */}
      <section ref={formRef} className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white rounded-3xl p-8 md:p-12" style={{ border: "2px solid rgba(11,31,58,0.1)" }}>
          <div className="text-center mb-8">
            <h2 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>
              Get your personalized preparation path
            </h2>
            <p style={{ color: "rgba(11,31,58,0.6)" }}>
              Tell us your role and what you want to get better at. We will build your custom path and give you early access when we launch.
            </p>
          </div>

          {/* Name + Email */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>Name</label>
              <input className="field" placeholder="Your name" value={name} onChange={function (e) { setName(e.target.value); }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>
                Email <span style={{ color: "var(--amber)" }}>*</span>
              </label>
              <input className="field" type="email" placeholder="you@company.com" value={email} onChange={function (e) { setEmail(e.target.value); }} />
            </div>
          </div>

          {/* Role */}
          <div className="mb-6">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(11,31,58,0.6)" }}>
              Your role <span style={{ color: "var(--amber)" }}>*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(function (r) {
                const selected = role === r.id;
                return (
                  <button key={r.id} onClick={function () { setRole(r.id); }}
                    className="pill transition-all cursor-pointer"
                    style={{
                      background: selected ? "var(--navy)" : "rgba(11,31,58,0.05)",
                      color: selected ? "var(--cream)" : "var(--navy)",
                      padding: "8px 16px",
                      fontSize: "13px",
                    }}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals */}
          <div className="mb-8">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(11,31,58,0.6)" }}>
              What do you want to get better at? <span style={{ color: "var(--amber)" }}>*</span>
              <span className="font-normal" style={{ color: "rgba(11,31,58,0.4)" }}> (pick up to 3)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {GOALS.map(function (g) {
                const selected = selectedGoals.includes(g.id);
                const disabled = !selected && selectedGoals.length >= 3;
                return (
                  <button key={g.id} onClick={function () { if (!disabled) toggleGoal(g.id); }}
                    className="text-left p-4 rounded-xl transition-all"
                    style={{
                      background: selected ? "var(--navy)" : "white",
                      color: selected ? "var(--cream)" : disabled ? "rgba(11,31,58,0.3)" : "var(--navy)",
                      border: selected ? "1.5px solid var(--navy)" : "1.5px solid #e7e0cc",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                    }}>
                    <div className="text-lg mb-1">{g.icon}</div>
                    <div className="text-xs font-semibold leading-snug">{g.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6" style={{ color: "rgba(11,31,58,0.2)" }}>
            <div className="flex-1 h-px" style={{ background: "currentColor" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(11,31,58,0.3)" }}>
              Optional: submit a scenario
            </span>
            <div className="flex-1 h-px" style={{ background: "currentColor" }} />
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>Scenario title</label>
              <input className="field" placeholder="e.g., Asking for a raise after being passed over" value={scenarioTitle} onChange={function (e) { setScenarioTitle(e.target.value); }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>The situation</label>
              <textarea className="field" rows={3} style={{ minHeight: "80px" }}
                placeholder="Describe the moment. e.g., You were promised a promotion but it went to someone else..."
                value={situation} onChange={function (e) { setSituation(e.target.value); }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>What the other person says</label>
              <textarea className="field" rows={2} style={{ minHeight: "60px" }}
                placeholder="The opening line. e.g., I know you were hoping for the promotion. The timing was not right."
                value={counterpartSays} onChange={function (e) { setCounterpartSays(e.target.value); }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>What is the goal?</label>
              <input className="field"
                placeholder="e.g., Express frustration without burning the relationship, get a clear timeline"
                value={goal} onChange={function (e) { setGoal(e.target.value); }} />
            </div>
          </div>

          {error && (
            <div className="text-sm text-center mb-4 p-3 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            className="btn-primary w-full py-4 rounded-full font-semibold text-sm tracking-wide">
            {submitting ? "Building your path..." : "Get My Preparation Path →"}
          </button>

          <p className="text-center text-xs mt-4" style={{ color: "rgba(11,31,58,0.4)" }}>
            No spam. We will only email you when early access is ready.
          </p>
        </div>
      </section>

      {/* Recently submitted */}
      {stats && stats.recent && stats.recent.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="text-center mb-6">
            <h3 className="display text-xl font-bold" style={{ color: "var(--navy)" }}>Recently submitted by the community</h3>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {stats.recent.map(function (title, i) {
              return (
                <span key={i} className="pill" style={{ background: "rgba(11,31,58,0.04)", color: "rgba(11,31,58,0.6)" }}>
                  {title}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <footer className="text-center pb-10 pt-6 text-xs" style={{ color: "rgba(11,31,58,0.4)" }}>
        Built by GrowthAspire · Based on methods from Conor Neill, Chris Voss and Tactical Empathy research
      </footer>
    </div>
  );
}
