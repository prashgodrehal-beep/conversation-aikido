"use client";

import { useState, useEffect, useRef } from "react";

interface Submission {
  total: number;
  recent: string[];
}

const PREVIEW_SCENARIOS = [
  { title: "The Toxic High Performer", category: "Leadership", desc: "Your star PM rolls their eyes at your direction. Two team members have complained." },
  { title: "The Price Objection", category: "Sales", desc: "Your quote came in 30% higher. The prospect likes you but can't justify it to their CFO." },
  { title: "The Angry Escalation", category: "Client", desc: "Third escalation call. Client's payment processing failed during month-end close." },
  { title: "The Founder Disagreement", category: "Conflict", desc: "Your co-founder wants to take a bad deal. You have four months of runway." },
  { title: '"You Never Listen"', category: "Relationships", desc: "Your partner is done explaining. They want to feel seen, not fixed." },
  { title: "The Scope Creep", category: "Client", desc: "Third 'small ask' this month. The client doesn't realize they're asking for free work." },
];

export default function EarlyAccessPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [situation, setSituation] = useState("");
  const [counterpartSays, setCounterpartSays] = useState("");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Submission | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/submit-scenario?stats=true")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => { });
  }, [submitted]);

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Email is required for early access."); return; }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/submit-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          scenario_title: scenarioTitle.trim() || null,
          situation: situation.trim() || null,
          counterpart_says: counterpartSays.trim() || null,
          goal: goal.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--navy)" }}>
            <span className="display font-bold text-xl" style={{ color: "var(--amber)" }}>G</span>
          </div>
          <div className="leading-tight">
            <div className="display font-bold text-base" style={{ color: "var(--navy)" }}>GrowthAspire</div>
            <div className="text-xs" style={{ color: "rgba(11,31,58,0.6)" }}>The Dojo Series</div>
          </div>
        </div>
        {stats && stats.total > 0 && (
          <div className="pill" style={{ background: "rgba(20,184,166,0.12)", color: "var(--teal)" }}>
            {stats.total} scenario{stats.total === 1 ? "" : "s"} submitted
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
          An AI-powered roleplay dojo where you practice high-stakes conversations — sales objections, tough feedback, client conflicts — and get instant coaching on how to handle them better.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={scrollToForm} className="btn-primary px-8 py-4 rounded-full font-semibold text-sm tracking-wide">
            Get Early Access →
          </button>
          <button onClick={scrollToForm} className="btn-outline px-8 py-4 rounded-full font-semibold text-sm tracking-wide">
            Submit a Scenario
          </button>
        </div>
      </header>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>How it works</h2>
          <p style={{ color: "rgba(11,31,58,0.6)" }}>Three steps. Five minutes. Real improvement.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", title: "Pick a scenario", desc: "Choose a real conversation you struggle with — a price objection, a tough 1:1, a frustrated client." },
            { n: "02", title: "Respond with voice or text", desc: "The AI plays the counterpart and pushes back like a real human. You practice your response out loud." },
            { n: "03", title: "Get instant coaching", desc: "Scored on 4 dimensions: empathy, boundaries, tone, and strategy. Specific feedback on what to say differently." },
          ].map((s) => (
            <div key={s.n} className="bg-white rounded-2xl p-7" style={{ border: "1px solid rgba(11,31,58,0.08)" }}>
              <div className="display text-4xl font-bold mb-4" style={{ color: "rgba(11,31,58,0.08)" }}>{s.n}</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: "var(--navy)" }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.6)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Existing scenarios preview */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>Scenarios already in the dojo</h2>
          <p style={{ color: "rgba(11,31,58,0.6)" }}>These are live and playable. We&apos;re adding more every week based on what YOU submit.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREVIEW_SCENARIOS.map((s) => (
            <div key={s.title} className="bg-white rounded-xl p-5" style={{ border: "1px solid rgba(11,31,58,0.08)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="pill" style={{ background: "rgba(11,31,58,0.05)", color: "var(--navy)" }}>{s.category}</span>
              </div>
              <h4 className="font-bold mb-1.5" style={{ color: "var(--navy)" }}>{s.title}</h4>
              <p className="text-xs leading-snug" style={{ color: "rgba(11,31,58,0.55)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Submit form */}
      <section ref={formRef} className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white rounded-3xl p-8 md:p-12" style={{ border: "2px solid rgba(11,31,58,0.1)" }}>

          {submitted ? (
            <div className="text-center py-8 fade-in">
              <div className="text-5xl mb-4">🥋</div>
              <h3 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>You&apos;re in.</h3>
              <p className="text-lg mb-2" style={{ color: "rgba(11,31,58,0.7)" }}>
                We&apos;ll email you when early access opens.
              </p>
              {scenarioTitle && (
                <p className="text-sm" style={{ color: "rgba(11,31,58,0.5)" }}>
                  Your scenario &quot;{scenarioTitle}&quot; has been submitted — if it makes the cut, you&apos;ll be the first to practice it.
                </p>
              )}
              <button
                onClick={() => { setSubmitted(false); setName(""); setEmail(""); setScenarioTitle(""); setSituation(""); setCounterpartSays(""); setGoal(""); }}
                className="btn-outline px-6 py-3 rounded-full font-semibold text-sm mt-6"
              >
                Submit another scenario
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>
                  Get early access + shape the dojo
                </h2>
                <p style={{ color: "rgba(11,31,58,0.6)" }}>
                  Enter your email for early bird access. Optionally, submit a scenario you&apos;d love to practice — the best ones get built into the dojo.
                </p>
              </div>

              {/* Email + Name */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>
                    Name
                  </label>
                  <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>
                    Email <span style={{ color: "var(--amber)" }}>*</span>
                  </label>
                  <input className="field" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-8" style={{ color: "rgba(11,31,58,0.2)" }}>
                <div className="flex-1 h-px" style={{ background: "currentColor" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(11,31,58,0.3)" }}>
                  Optional: submit a scenario
                </span>
                <div className="flex-1 h-px" style={{ background: "currentColor" }} />
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>
                    Scenario title
                  </label>
                  <input className="field" placeholder='e.g., "Asking for a raise after being passed over"' value={scenarioTitle} onChange={(e) => setScenarioTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>
                    The situation
                  </label>
                  <textarea className="field" rows={3} style={{ minHeight: "80px" }}
                    placeholder='Describe the moment. e.g., "You were promised a promotion last quarter but it went to someone else. Your manager just scheduled a 1:1..."'
                    value={situation} onChange={(e) => setSituation(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>
                    What the other person says
                  </label>
                  <textarea className="field" rows={2} style={{ minHeight: "60px" }}
                    placeholder='The opening line you need to respond to. e.g., "I know you were hoping for the promotion. But honestly, the timing just was not right."'
                    value={counterpartSays} onChange={(e) => setCounterpartSays(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(11,31,58,0.6)" }}>
                    What&apos;s the goal?
                  </label>
                  <input className="field"
                    placeholder='e.g., "Express frustration without burning the relationship, and get a clear timeline"'
                    value={goal} onChange={(e) => setGoal(e.target.value)} />
                </div>
              </div>

              {error && (
                <div className="text-sm text-center mb-4 p-3 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary w-full py-4 rounded-full font-semibold text-sm tracking-wide"
              >
                {submitting ? "Submitting..." : scenarioTitle ? "Submit Scenario + Get Early Access →" : "Get Early Access →"}
              </button>

              <p className="text-center text-xs mt-4" style={{ color: "rgba(11,31,58,0.4)" }}>
                No spam. We&apos;ll only email you when early access is ready.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Submitted scenarios ticker */}
      {stats && stats.recent && stats.recent.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="text-center mb-6">
            <h3 className="display text-xl font-bold" style={{ color: "var(--navy)" }}>Recently submitted by the community</h3>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {stats.recent.map((title, i) => (
              <span key={i} className="pill" style={{ background: "rgba(11,31,58,0.04)", color: "rgba(11,31,58,0.6)" }}>
                {title}
              </span>
            ))}
          </div>
        </section>
      )}

      <footer className="text-center pb-10 pt-6 text-xs" style={{ color: "rgba(11,31,58,0.4)" }}>
        Built by GrowthAspire · Conversation Aikido Dojo
      </footer>
    </div>
  );
}
