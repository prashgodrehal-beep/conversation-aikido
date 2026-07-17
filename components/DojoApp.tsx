"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SCENARIOS, MAX_ATTEMPTS, getScenario } from "@/lib/scenarios";
import type { Scenario, Scores, EvaluateResponse } from "@/lib/types";
import { initPostHog, trackEvent } from "@/lib/tracking";
import { SocialProof } from "@/components/SocialProof";

// Web Speech API types (not in standard TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

type Screen = "method" | "scenarios" | "briefing" | "drill" | "result";
type MicState = "idle" | "recording" | "processing" | "unsupported";
type CategoryFilter = "All" | Scenario["category"];

export default function DojoApp() {
  const [screen, setScreen] = useState<Screen>("method");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [previousFeedback, setPreviousFeedback] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [voiceSupported, setVoiceSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check voice support on mount
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      setMicState("unsupported");
    }
  }, []);
  useEffect(() => {
    initPostHog();
  }, []);

  const go = (s: Screen) => { setScreen(s); window.scrollTo(0, 0); };

  const pickScenario = (id: string) => {
    const s = getScenario(id);
    if (s) { setScenario(s); setAttempt(1); setResult(null); setPreviousFeedback(undefined); setTranscript(""); setInterimText(""); go("briefing"); }
  };

  const startDrill = () => {
    setTranscript("");
    setInterimText("");
    setResult(null);
    go("drill");
    trackEvent({ event: "drill_started", scenario_id: scenario?.id });
  };

  const retryDrill = () => {
    if (!result || attempt >= MAX_ATTEMPTS) return;
    setPreviousFeedback(result.feedback);
    setAttempt((a) => a + 1);
    setTranscript("");
    setInterimText("");
    setResult(null);
    go("drill");
    trackEvent({ event: "drill_retried", scenario_id: scenario?.id, attempt: attempt + 1 });
  };

  // ── VOICE ────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = transcript;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
          setTranscript(finalTranscript);
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn("Speech error:", e.error);
      if (e.error !== "no-speech") {
        setMicState("idle");
      }
    };

    recognition.onend = () => {
      setMicState("idle");
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setMicState("recording");
  }, [transcript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setMicState("idle");
    setInterimText("");
  }, []);

  const toggleRecording = useCallback(() => {
    if (micState === "recording") stopRecording();
    else if (micState === "idle") startRecording();
  }, [micState, startRecording, stopRecording]);

  // ── SUBMIT ───────────────────────────────────────────────
  const submitResponse = async () => {
    if (!scenario || !transcript.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dojo-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          userResponse: transcript.trim(),
          attempt,
          previousFeedback,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const data: EvaluateResponse = await res.json();
      setResult(data);
      trackEvent({
        event: "drill_completed",
        scenario_id: scenario.id,
        score: data.scores.composite,
        passed: data.passed,
        attempt,
      });
      go("result");
    } catch (err) {
      console.error(err);
      alert(`Error: ${(err as Error).message}. Try again.`);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────
  if (screen === "method") return <MethodScreen onEnter={() => go("scenarios")} />;
  if (screen === "scenarios") return <ScenarioScreen onBack={() => go("method")} onPick={pickScenario} filter={categoryFilter} setFilter={setCategoryFilter} />;
  if (screen === "briefing" && scenario) return <BriefingScreen scenario={scenario} attempt={attempt} onStart={startDrill} onBack={() => go("scenarios")} />;
  if (screen === "result" && scenario && result) return (
    <ResultScreen scenario={scenario} result={result} attempt={attempt} transcript={transcript}
      onRetry={retryDrill} onAnother={() => { setAttempt(1); go("scenarios"); }} />
  );

  // Drill screen
  return (
    <section className="min-h-screen">
      <nav className="max-w-4xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <button onClick={() => go("scenarios")} className="text-sm" style={{ color: "rgba(11,31,58,0.6)" }}>← Leave</button>
        <div className="flex gap-2">
          {attempt > 1 && <span className="pill" style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)" }}>Attempt {attempt}</span>}
          <div className="seal pill">Drill Mode</div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Goal reminder */}
        <div className="bg-white rounded-xl p-4 mb-6 flex items-start gap-3" style={{ border: "1px solid rgba(11,31,58,0.08)" }}>
          <div className="text-xs font-semibold tracking-widest uppercase shrink-0 pt-0.5" style={{ color: "var(--teal)" }}>GOAL</div>
          <div className="text-xs leading-snug" style={{ color: "rgba(11,31,58,0.65)" }}>{scenario?.goal}</div>
        </div>

        {/* Counterpart's punch */}
        <div className="mb-8">
          <div className="text-[10px] tracking-[0.2em] font-semibold uppercase mb-2" style={{ color: "rgba(11,31,58,0.4)" }}>
            {scenario?.counterpart.split(",")[0]}
          </div>
          <div className="bg-white rounded-2xl p-6" style={{ border: "1.5px solid #e7e0cc", borderRadius: "18px 18px 18px 4px" }}>
            <p className="text-lg font-medium italic" style={{ color: "var(--navy)" }}>&quot;{scenario?.opening}&quot;</p>
          </div>
        </div>

        {/* Previous feedback (on retry) */}
        {previousFeedback && (
          <div className="mb-6 p-4 rounded-xl fade-in" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="text-[10px] tracking-[0.2em] font-bold uppercase mb-1" style={{ color: "var(--amber)" }}>From your last attempt</div>
            <div className="text-xs leading-relaxed" style={{ color: "rgba(11,31,58,0.7)" }}>{previousFeedback}</div>
          </div>
        )}

        {/* Response area */}
        <div className="bg-white rounded-2xl p-6 fade-in" style={{ border: "2px solid rgba(11,31,58,0.1)" }}>
          <div className="text-xs tracking-[0.2em] font-semibold mb-1 uppercase" style={{ color: "rgba(11,31,58,0.5)" }}>
            Your response
          </div>
          <div className="text-xs mb-4" style={{ color: "rgba(11,31,58,0.35)" }}>
            Validate → Mirror → Inquire. Speak or type.
          </div>

          {/* Voice input area */}
          <div className="flex items-start gap-4 mb-4">
            {voiceSupported && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button onClick={toggleRecording} disabled={loading}
                  className={`mic-btn ${micState === "recording" ? "mic-recording" : micState === "processing" ? "mic-processing" : "mic-idle"}`}
                  title={micState === "recording" ? "Stop recording" : "Start recording"}>
                  {micState === "recording" ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  )}
                </button>
                <span className="text-[10px] font-semibold" style={{ color: micState === "recording" ? "#ef4444" : "rgba(11,31,58,0.4)" }}>
                  {micState === "recording" ? "Listening..." : "Tap to speak"}
                </span>
              </div>
            )}

            <div className="flex-1">
              {/* Live transcript while recording */}
              {micState === "recording" && (
                <div className="transcript-live mb-3 min-h-[60px]">
                  <span style={{ color: "var(--navy)" }}>{transcript}</span>
                  <span style={{ color: "rgba(11,31,58,0.4)" }}>{interimText && ` ${interimText}`}</span>
                  {!transcript && !interimText && (
                    <span className="text-sm italic" style={{ color: "rgba(11,31,58,0.3)" }}>Start speaking...</span>
                  )}
                </div>
              )}

              {/* Editable textarea (shown when not recording) */}
              {micState !== "recording" && (
                <textarea
                  ref={textareaRef}
                  className="field min-h-[100px]"
                  rows={4}
                  placeholder={voiceSupported ? "Your words will appear here after you speak, or type directly..." : "Type your response..."}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitResponse(); } }}
                />
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(11,31,58,0.08)" }}>
            <div className="text-xs" style={{ color: "rgba(11,31,58,0.4)" }}>
              {voiceSupported ? "Speak, then edit if needed. Submit when ready." : "Shift+Enter for new line."}
            </div>
            <button onClick={submitResponse} disabled={loading || !transcript.trim() || micState === "recording"}
              className="btn-primary px-7 py-3 rounded-full font-semibold text-sm">
              {loading ? "Evaluating..." : "Submit →"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── METHOD SCREEN ──────────────────────────────────────────
function MethodScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--navy)] flex items-center justify-center">
            <span className="display font-bold text-xl" style={{ color: "var(--amber)" }}>G</span>
          </div>
          <div className="leading-tight">
            <div className="display font-bold text-base" style={{ color: "var(--navy)" }}>GrowthAspire</div>
            <div className="text-xs" style={{ color: "rgba(11,31,58,0.6)" }}>The Practice Lab</div>
          </div>
        </div>
        <div className="seal pill">Vol. 01 · Influence</div>
      </nav>
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-16 text-center">
        <div className="text-xs tracking-[0.3em] font-semibold mb-6" style={{ color: "rgba(11,31,58,0.5)" }}>A LIVE PRACTICE EXPERIENCE</div>
        <h1 className="display text-5xl md:text-7xl font-bold mb-6 leading-[0.95]" style={{ color: "var(--navy)" }}>
          Conversation<br /><span className="italic" style={{ color: "var(--teal)" }}>Aikido</span>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(11,31,58,0.7)" }}>
          Eighteen years of school taught you to defend your position.<br className="hidden md:block" />
          High-stakes conversations require the opposite skill.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onEnter} className="btn-primary px-8 py-4 rounded-full font-semibold text-sm tracking-wide">Enter the Practice Lab →</button>
          <button onClick={() => document.getElementById("method")?.scrollIntoView({ behavior: "smooth" })} className="btn-outline px-8 py-4 rounded-full font-semibold text-sm tracking-wide">Learn the Method</button>
        </div>
      </header>
      <div id="method" className="max-w-5xl mx-auto px-6 py-20">
        <div className="divider-ornament mb-10"><span className="display italic text-sm">the method</span></div>
        <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
          <div>
            <h2 className="display text-3xl md:text-4xl font-bold mb-5 leading-tight" style={{ color: "var(--navy)" }}>When emotion goes up,<br />logic goes <em className="italic" style={{ color: "var(--teal)" }}>offline</em>.</h2>
            <p className="leading-relaxed mb-4" style={{ color: "rgba(11,31,58,0.7)" }}>Push back against a frustrated colleague, an angry customer, or a skeptical buyer — and you trigger their amygdala. Cortisol floods their system. The thinking brain shuts down.</p>
            <p className="leading-relaxed" style={{ color: "rgba(11,31,58,0.7)" }}>Aikido reverses this. Instead of resisting the verbal punch, you <strong style={{ color: "var(--navy)" }}>redirect its energy</strong>. Three moves.</p>
          </div>
          <div className="bg-white rounded-2xl p-7 relative" style={{ border: "1px solid rgba(11,31,58,0.1)" }}>
            <div className="seal pill absolute -top-3 -right-3">Failure Loop</div>
            <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "rgba(11,31,58,0.4)" }}>The Punch</div>
            <div className="font-medium mb-5" style={{ color: "var(--navy)" }}>&quot;Your product is too expensive.&quot;</div>
            <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "rgba(11,31,58,0.4)" }}>The Reflex (wrong)</div>
            <div className="italic mb-5" style={{ color: "rgba(11,31,58,0.6)" }}>&quot;Actually, we&apos;re competitively priced—&quot;</div>
            <div className="border-t pt-4 text-sm" style={{ borderColor: "rgba(11,31,58,0.1)", color: "rgba(11,31,58,0.6)" }}>→ Walls up. Trust gone. Conversation over.</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { n: 1, l: "VALIDATE", t: "\"I understand.\"", b: "Signal you're not the enemy. Drops their cortisol. Opens the door." },
            { n: 2, l: "MIRROR", t: "Reflect their concern.", b: "\"...that cost is a critical factor for you.\" Show them you actually heard it." },
            { n: 3, l: "INQUIRE", t: "Ask an open question.", b: "\"What other factors matter to you?\" Their energy now works for you." },
          ].map((s) => (
            <div key={s.n} className="bg-white rounded-2xl p-7" style={{ border: "1px solid rgba(11,31,58,0.1)" }}>
              <div className="step-circle mb-5" style={{ background: "var(--navy)", color: "var(--amber)" }}>{s.n}</div>
              <div className="pill mb-3" style={{ background: "rgba(20,184,166,0.12)", color: "var(--teal)" }}>{s.l}</div>
              <h3 className="display text-2xl font-bold mb-3" style={{ color: "var(--navy)" }}>{s.t}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.65)" }}>{s.b}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <SocialProof />
        </div>
        <div className="text-center mt-14">
          <button onClick={onEnter} className="btn-amber px-10 py-4 rounded-full font-bold text-sm tracking-wide">Practice it now →</button>
        </div>
      </div>
      <footer className="text-center pb-10 pt-6 text-xs" style={{ color: "rgba(11,31,58,0.4)" }}>Built by GrowthAspire · Method inspired by Conor Neill &amp; Chris Voss</footer>
    </section>
  );
}

// ── SCENARIO PICKER ────────────────────────────────────────
function ScenarioScreen({ onBack, onPick, filter, setFilter }: {
  onBack: () => void; onPick: (id: string) => void;
  filter: CategoryFilter; setFilter: (f: CategoryFilter) => void;
}) {
  const cats: CategoryFilter[] = ["All", "Workplace Leadership", "Client-Facing", "Conflict", "Relationships"];
  const filtered = filter === "All" ? SCENARIOS : SCENARIOS.filter((s) => s.category === filter);
  return (
    <section className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-sm" style={{ color: "rgba(11,31,58,0.6)" }}>← Back</button>
        <div className="seal pill">Pick your practice</div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="display text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--navy)" }}>Pick a scenario.</h2>
          <p className="max-w-xl mx-auto" style={{ color: "rgba(11,31,58,0.65)" }}>One punch. One response. Score 7/10 to pass. Up to 3 attempts.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {cats.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className="pill transition-all"
              style={{ background: filter === c ? "var(--navy)" : "rgba(11,31,58,0.06)", color: filter === c ? "var(--cream)" : "var(--navy)" }}>
              {c}
            </button>
          ))}
        </div>
        <div className="mb-8">
          <SocialProof />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const dots = s.difficulty === "Easy" ? 1 : s.difficulty === "Medium" ? 2 : 3;
            return (
              <button key={s.id} className="scenario-card fade-in" onClick={() => onPick(s.id)}>
                <div className="flex items-center justify-between mb-3">
                  <span className="pill" style={{ background: "rgba(11,31,58,0.06)", color: "var(--navy)" }}>{s.category}</span>
                  <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="difficulty-dot" style={{ background: i < dots ? (dots === 3 ? "var(--amber)" : "var(--teal)") : "#e7e0cc" }} />)}</div>
                </div>
                <h3 className="display text-lg font-bold mb-2" style={{ color: "var(--navy)" }}>{s.title}</h3>
                <p className="text-xs leading-snug" style={{ color: "rgba(11,31,58,0.55)" }}>{s.goal.slice(0, 100)}...</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── BRIEFING SCREEN ────────────────────────────────────────
function BriefingScreen({ scenario, attempt, onStart, onBack }: {
  scenario: Scenario; attempt: number; onStart: () => void; onBack: () => void;
}) {
  return (
    <section className="min-h-screen">
      <nav className="max-w-4xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-sm" style={{ color: "rgba(11,31,58,0.6)" }}>← Back</button>
        {attempt > 1 && <div className="pill" style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)" }}>Attempt {attempt}/{MAX_ATTEMPTS}</div>}
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl p-8 md:p-10 fade-in" style={{ border: "2px solid rgba(11,31,58,0.1)" }}>
          <div className="flex items-center gap-3 mb-8 pb-6" style={{ borderBottom: "1px solid rgba(11,31,58,0.1)" }}>
            <div className="w-10 h-10 rounded-full bg-[var(--navy)] flex items-center justify-center">
              <span className="display font-bold text-sm" style={{ color: "var(--amber)" }}>P</span>
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "var(--navy)" }}>I&apos;m Prash. Let&apos;s practice.</div>
              <div className="text-xs" style={{ color: "rgba(11,31,58,0.5)" }}>Your communication coach</div>
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="pill" style={{ background: "rgba(11,31,58,0.06)", color: "var(--navy)" }}>{scenario.category}</span>
              <span className="pill" style={{ background: "rgba(20,184,166,0.12)", color: "var(--teal)" }}>Pass: {scenario.passThreshold}/10</span>
            </div>
            <h2 className="display text-3xl font-bold mb-4" style={{ color: "var(--navy)" }}>{scenario.title}</h2>
          </div>
          <div className="space-y-5 mb-8">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--teal)" }}>YOUR GOAL</div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.8)" }}>{scenario.goal}</p>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--amber)" }}>THE SITUATION</div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.8)" }}>{scenario.situation}</p>
            </div>
            <div className="bg-[rgba(11,31,58,0.03)] rounded-xl p-5">
              <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "rgba(11,31,58,0.5)" }}>THEY SAY</div>
              <p className="text-lg italic font-medium" style={{ color: "var(--navy)" }}>&quot;{scenario.opening}&quot;</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm mb-5" style={{ color: "rgba(11,31,58,0.6)" }}>How do you handle it?</p>
            <button onClick={onStart} className="btn-primary px-10 py-4 rounded-full font-semibold text-sm tracking-wide">Begin →</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── RESULT SCREEN ──────────────────────────────────────────
function ResultScreen({ scenario, result, attempt, transcript, onRetry, onAnother }: {
  scenario: Scenario; result: EvaluateResponse; attempt: number; transcript: string;
  onRetry: () => void; onAnother: () => void;
}) {
  const canRetry = !result.passed && attempt < MAX_ATTEMPTS;
  const dims = [
    { key: "tacticalEmpathy" as const, label: "Tactical Empathy", color: "var(--teal)" },
    { key: "boundaryIntegrity" as const, label: "Boundary", color: "var(--navy)" },
    { key: "emotionalCalibration" as const, label: "Calibration", color: "var(--amber)" },
    { key: "strategicQuality" as const, label: "Strategic", color: "#6366f1" },
  ];

  return (
    <section className="min-h-screen">
      <nav className="max-w-4xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <button onClick={onAnother} className="text-sm" style={{ color: "rgba(11,31,58,0.6)" }}>← Scenarios</button>
        <div className="seal pill">{result.passed ? "✓ Passed" : "Not Yet"}</div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Score header */}
        <div className="text-center mb-8 fade-in">
          <div className="text-6xl display font-bold mb-2" style={{ color: result.passed ? "var(--teal)" : "var(--navy)" }}>
            {result.scores.composite}<span className="text-2xl" style={{ color: "rgba(11,31,58,0.3)" }}>/10</span>
          </div>
          <div className="pill" style={{ background: result.passed ? "var(--teal)" : "rgba(11,31,58,0.08)", color: result.passed ? "white" : "var(--navy)" }}>
            {result.passed ? "PASSED" : `${MAX_ATTEMPTS - attempt} ${MAX_ATTEMPTS - attempt === 1 ? "retry" : "retries"} left`}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="bg-white rounded-2xl p-6 mb-6 fade-in" style={{ border: "1px solid rgba(11,31,58,0.1)" }}>
          <div className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "rgba(11,31,58,0.4)" }}>Score Breakdown</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {dims.map((d) => (
              <div key={d.key}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "rgba(11,31,58,0.6)" }}>{d.label}</span>
                  <span className="font-bold" style={{ color: "var(--navy)" }}>{result.scores[d.key]}/10</span>
                </div>
                <div className="score-bar"><div className="score-bar-fill" style={{ width: `${result.scores[d.key] * 10}%`, background: d.color }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* What you said */}
        <div className="bg-white rounded-2xl p-6 mb-6 fade-in" style={{ border: "1px solid rgba(11,31,58,0.1)" }}>
          <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "rgba(11,31,58,0.4)" }}>What you said</div>
          <p className="text-sm italic leading-relaxed" style={{ color: "rgba(11,31,58,0.7)" }}>&quot;{transcript}&quot;</p>
        </div>

        {/* Coach feedback */}
        <div className="bg-white rounded-2xl p-6 mb-6 fade-in" style={{ border: "1px solid rgba(11,31,58,0.1)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[var(--navy)] flex items-center justify-center">
              <span className="display font-bold text-xs" style={{ color: "var(--amber)" }}>P</span>
            </div>
            <div className="text-xs font-semibold" style={{ color: "var(--navy)" }}>Coach Feedback</div>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(11,31,58,0.8)" }}>{result.feedback}</p>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: "rgba(20,184,166,0.06)" }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: "var(--teal)" }}>Strength: </span>
              <span className="text-xs" style={{ color: "rgba(11,31,58,0.7)" }}>{result.strength_line}</span>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)" }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: "var(--amber)" }}>Improve: </span>
              <span className="text-xs" style={{ color: "rgba(11,31,58,0.7)" }}>{result.improve_line}</span>
            </div>
          </div>
        </div>

        {/* Model response (shown on fail) */}
        {!result.passed && scenario.modelResponse && (
          <div className="rounded-2xl p-6 mb-6 fade-in" style={{ background: "rgba(11,31,58,0.03)", border: "1px solid rgba(11,31,58,0.1)" }}>
            <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--navy)" }}>What &quot;great&quot; sounds like</div>
            <p className="text-sm italic leading-relaxed" style={{ color: "rgba(11,31,58,0.75)" }}>&quot;{scenario.modelResponse}&quot;</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 fade-in">
          {canRetry && (
            <button onClick={onRetry} className="flex-1 btn-amber px-6 py-4 rounded-full font-semibold text-sm">
              Try again →
            </button>
          )}
          <button onClick={onAnother} className={`flex-1 ${canRetry ? "btn-outline" : "btn-primary"} px-6 py-4 rounded-full font-semibold text-sm`}>
            {result.passed ? "Next scenario →" : canRetry ? "Different scenario" : "Back to scenarios"}
          </button>
        </div>
      </div>
    </section>
  );
}
