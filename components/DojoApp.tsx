"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SCENARIOS, MAX_TURNS, getScenario } from "@/lib/scenarios";
import {
  Scenario,
  Message,
  AikidoFields,
  TurnResponse,
  DebriefResponse,
} from "@/lib/types";

type Screen = "method" | "scenarios" | "dojo";

export default function DojoApp() {
  const [screen, setScreen] = useState<Screen>("method");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [turnNumber, setTurnNumber] = useState(0);
  const [fields, setFields] = useState<AikidoFields>({
    validate: "",
    mirror: "",
    inquire: "",
  });
  const [loading, setLoading] = useState(false);
  const [debrief, setDebrief] = useState<DebriefResponse | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);

  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const validateRef = useRef<HTMLInputElement | null>(null);
  const mirrorRef = useRef<HTMLInputElement | null>(null);
  const inquireRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [history]);

  // Focus first field when entering dojo
  useEffect(() => {
    if (screen === "dojo" && !debrief) {
      validateRef.current?.focus();
    }
  }, [screen, debrief]);

  const goToMethod = () => {
    setScreen("method");
    window.scrollTo(0, 0);
  };

  const goToScenarios = () => {
    setScreen("scenarios");
    window.scrollTo(0, 0);
  };

  const startDojo = (scenarioId: string) => {
    const s = getScenario(scenarioId);
    if (!s) return;
    setScenario(s);
    setHistory([{ role: "them", text: s.opening }]);
    setTurnNumber(0);
    setFields({ validate: "", mirror: "", inquire: "" });
    setDebrief(null);
    setScreen("dojo");
    window.scrollTo(0, 0);
  };

  const exitDojo = () => {
    if (history.length > 1 && !debrief) {
      if (!confirm("Leave this session? Your progress won't be saved.")) return;
    }
    goToScenarios();
  };

  const calculateTotalScore = useCallback((msgs: Message[]) => {
    return msgs.reduce((sum, msg) => {
      if (msg.scores) {
        return sum + msg.scores.validate + msg.scores.mirror + msg.scores.inquire;
      }
      return sum;
    }, 0);
  }, []);

  const sendTurn = async () => {
    if (!scenario) return;
    if (!fields.validate.trim() || !fields.mirror.trim() || !fields.inquire.trim()) {
      alert("Fill all three fields. The structure is the practice.");
      return;
    }

    const userText = `${fields.validate} ${fields.mirror} ${fields.inquire}`;
    const userMessage: Message = {
      role: "you",
      text: userText,
      fields: { ...fields },
    };

    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    const newTurnNumber = turnNumber + 1;
    setTurnNumber(newTurnNumber);
    setLoading(true);

    try {
      const res = await fetch("/api/dojo-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          history: newHistory,
          fields,
          turnNumber: newTurnNumber,
          maxTurns: MAX_TURNS,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const result: TurnResponse = await res.json();

      // Attach scores to last user message
      const updatedHistory = [...newHistory];
      const lastIdx = updatedHistory.length - 1;
      updatedHistory[lastIdx] = {
        ...updatedHistory[lastIdx],
        scores: result.scores,
        tip: result.coach_tip,
      };

      // Add counterpart reply unless this was the final turn
      if (newTurnNumber < MAX_TURNS) {
        updatedHistory.push({ role: "them", text: result.counterpart_reply });
      }

      setHistory(updatedHistory);
      setFields({ validate: "", mirror: "", inquire: "" });

      if (newTurnNumber >= MAX_TURNS) {
        await runDebrief(updatedHistory);
      } else {
        setTimeout(() => validateRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error(err);
      alert(
        `The dojo couldn't process that turn: ${(err as Error).message}\n\nTry sending again.`
      );
      // Roll back
      setHistory(history);
      setTurnNumber(turnNumber);
    } finally {
      setLoading(false);
    }
  };

  const runDebrief = async (finalHistory: Message[]) => {
    if (!scenario) return;
    setDebriefLoading(true);

    const totalScore = calculateTotalScore(finalHistory);
    const maxScore = MAX_TURNS * 9;

    try {
      const res = await fetch("/api/dojo-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          history: finalHistory,
          totalScore,
          maxScore,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: DebriefResponse = await res.json();
      setDebrief(result);
    } catch (err) {
      console.error(err);
      setDebrief({
        headline: "Session complete.",
        strength: "You showed up and practiced — that's already more than most.",
        growth: "We couldn't generate a detailed debrief this round. Try another scenario.",
      });
    } finally {
      setDebriefLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (screen === "method") return <MethodScreen onEnter={goToScenarios} />;
  if (screen === "scenarios")
    return <ScenarioPickerScreen onBack={goToMethod} onPick={startDojo} />;

  // Dojo screen
  return (
    <DojoScreen
      scenario={scenario!}
      history={history}
      turnNumber={turnNumber}
      fields={fields}
      setFields={setFields}
      loading={loading}
      debrief={debrief}
      debriefLoading={debriefLoading}
      onExit={exitDojo}
      onSend={sendTurn}
      onRetry={() => scenario && startDojo(scenario.id)}
      onAnother={goToScenarios}
      validateRef={validateRef}
      mirrorRef={mirrorRef}
      inquireRef={inquireRef}
      conversationEndRef={conversationEndRef}
      totalScore={calculateTotalScore(history)}
    />
  );
}

// ============================================================
// METHOD SCREEN
// ============================================================
function MethodScreen({ onEnter }: { onEnter: () => void }) {
  const scrollToMethod = () => {
    document.getElementById("method")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--navy)] flex items-center justify-center">
            <span className="display font-bold text-xl" style={{ color: "var(--amber)" }}>
              G
            </span>
          </div>
          <div className="leading-tight">
            <div className="display font-bold text-base" style={{ color: "var(--navy)" }}>
              GrowthAspire
            </div>
            <div className="text-xs" style={{ color: "rgba(11,31,58,0.6)" }}>
              The Dojo Series
            </div>
          </div>
        </div>
        <div className="seal pill">Vol. 01 · Aikido</div>
      </nav>

      <header className="max-w-5xl mx-auto px-6 pt-12 pb-16 text-center">
        <div
          className="text-xs tracking-[0.3em] font-semibold mb-6"
          style={{ color: "rgba(11,31,58,0.5)" }}
        >
          A LIVE PRACTICE EXPERIENCE
        </div>
        <h1
          className="display text-5xl md:text-7xl font-bold mb-6 leading-[0.95]"
          style={{ color: "var(--navy)" }}
        >
          Conversation
          <br />
          <span className="italic" style={{ color: "var(--teal)" }}>
            Aikido
          </span>
        </h1>
        <p
          className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "rgba(11,31,58,0.7)" }}
        >
          Eighteen years of school taught you to defend your position.
          <br className="hidden md:block" />
          High-stakes conversations require the opposite skill.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onEnter}
            className="btn-primary px-8 py-4 rounded-full font-semibold text-sm tracking-wide"
          >
            Enter the Dojo →
          </button>
          <button
            onClick={scrollToMethod}
            className="px-8 py-4 rounded-full font-semibold text-sm tracking-wide hover:bg-[rgba(11,31,58,0.05)]"
            style={{ color: "var(--navy)", border: "1px solid rgba(11,31,58,0.2)" }}
          >
            Learn the Method
          </button>
        </div>
      </header>

      <div id="method" className="max-w-5xl mx-auto px-6 py-20">
        <div className="divider-ornament mb-10">
          <span className="display italic text-sm">the method</span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
          <div>
            <h2
              className="display text-3xl md:text-4xl font-bold mb-5 leading-tight"
              style={{ color: "var(--navy)" }}
            >
              When emotion goes up,
              <br />
              logic goes <em className="italic" style={{ color: "var(--teal)" }}>offline</em>.
            </h2>
            <p className="leading-relaxed mb-4" style={{ color: "rgba(11,31,58,0.7)" }}>
              Push back against a frustrated colleague, an angry customer, or a skeptical buyer
              — and you trigger their amygdala. Cortisol floods their system. The thinking brain
              shuts down. You've already lost.
            </p>
            <p className="leading-relaxed" style={{ color: "rgba(11,31,58,0.7)" }}>
              Aikido reverses this. Instead of resisting the verbal punch, you{" "}
              <strong style={{ color: "var(--navy)" }}>redirect its energy</strong>. Three moves.
              That's the whole system.
            </p>
          </div>
          <div
            className="bg-white rounded-2xl p-7 relative"
            style={{ border: "1px solid rgba(11,31,58,0.1)" }}
          >
            <div className="seal pill absolute -top-3 -right-3">Failure Loop</div>
            <div
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: "rgba(11,31,58,0.4)" }}
            >
              The Punch
            </div>
            <div className="font-medium mb-5" style={{ color: "var(--navy)" }}>
              "Your product is too expensive."
            </div>
            <div
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: "rgba(11,31,58,0.4)" }}
            >
              The Reflex (wrong)
            </div>
            <div className="italic mb-5" style={{ color: "rgba(11,31,58,0.6)" }}>
              "Actually, we're competitively priced compared to—"
            </div>
            <div
              className="border-t pt-4 text-sm"
              style={{ borderColor: "rgba(11,31,58,0.1)", color: "rgba(11,31,58,0.6)" }}
            >
              → Walls up. Trust gone. Conversation over.
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { num: 1, label: "VALIDATE", title: '"I understand."', body: "Signal you're not the enemy. Drops their cortisol. Opens the door." },
            { num: 2, label: "MIRROR", title: "Reflect their concern.", body: '"...that cost is a critical factor for you." Show them you actually heard it.' },
            { num: 3, label: "INQUIRE", title: "Ask an open question.", body: '"What other factors matter to you?" Their energy now works for you.' },
          ].map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-2xl p-7"
              style={{ border: "1px solid rgba(11,31,58,0.1)" }}
            >
              <div
                className="step-circle mb-5"
                style={{ background: "var(--navy)", color: "var(--amber)" }}
              >
                {step.num}
              </div>
              <div
                className="pill mb-3"
                style={{ background: "rgba(20,184,166,0.12)", color: "var(--teal)" }}
              >
                {step.label}
              </div>
              <h3 className="display text-2xl font-bold mb-3" style={{ color: "var(--navy)" }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.65)" }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <button
            onClick={onEnter}
            className="btn-amber px-10 py-4 rounded-full font-bold text-sm tracking-wide"
          >
            Practice it now →
          </button>
          <div className="text-xs mt-3" style={{ color: "rgba(11,31,58,0.5)" }}>
            Reading takes 2 minutes. Mastery takes reps.
          </div>
        </div>
      </div>

      <footer
        className="text-center pb-10 pt-6 text-xs"
        style={{ color: "rgba(11,31,58,0.4)" }}
      >
        Built by GrowthAspire · Method inspired by the work of Conor Neill & Chris Voss
      </footer>
    </section>
  );
}

// ============================================================
// SCENARIO PICKER SCREEN
// ============================================================
function ScenarioPickerScreen({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <section className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm hover:opacity-100 flex items-center gap-2"
          style={{ color: "rgba(11,31,58,0.6)" }}
        >
          ← Back to method
        </button>
        <div className="seal pill">Choose your match</div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div
            className="text-xs tracking-[0.3em] font-semibold mb-4"
            style={{ color: "rgba(11,31,58,0.5)" }}
          >
            STEP INTO THE DOJO
          </div>
          <h2 className="display text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--navy)" }}>
            Pick a verbal punch.
          </h2>
          <p className="max-w-xl mx-auto" style={{ color: "rgba(11,31,58,0.65)" }}>
            Each scenario simulates a real, hard conversation. You'll have 4 turns to guide it
            from conflict to clarity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SCENARIOS.map((s) => {
            const dotCount = s.difficulty === "Easy" ? 1 : s.difficulty === "Medium" ? 2 : 3;
            const dotColor = s.difficulty === "Hard" ? "var(--amber)" : "var(--teal)";
            return (
              <button
                key={s.id}
                className="scenario-card fade-in"
                onClick={() => onPick(s.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="pill"
                    style={{ background: "rgba(11,31,58,0.06)", color: "var(--navy)" }}
                  >
                    {s.category}
                  </span>
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="difficulty-dot"
                        style={{ background: i < dotCount ? dotColor : "#e7e0cc" }}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-snug mb-3" style={{ color: "rgba(11,31,58,0.6)" }}>
                  {s.persona}
                </p>
                <div className="text-xs italic" style={{ color: "rgba(11,31,58,0.4)" }}>
                  &quot;{s.opening.slice(0, 70)}...&quot;
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// DOJO SCREEN
// ============================================================
interface DojoScreenProps {
  scenario: Scenario;
  history: Message[];
  turnNumber: number;
  fields: AikidoFields;
  setFields: (f: AikidoFields) => void;
  loading: boolean;
  debrief: DebriefResponse | null;
  debriefLoading: boolean;
  onExit: () => void;
  onSend: () => void;
  onRetry: () => void;
  onAnother: () => void;
  validateRef: React.RefObject<HTMLInputElement | null>;
  mirrorRef: React.RefObject<HTMLInputElement | null>;
  inquireRef: React.RefObject<HTMLInputElement | null>;
  conversationEndRef: React.RefObject<HTMLDivElement | null>;
  totalScore: number;
}

function DojoScreen(props: DojoScreenProps) {
  const {
    scenario,
    history,
    turnNumber,
    fields,
    setFields,
    loading,
    debrief,
    debriefLoading,
    onExit,
    onSend,
    onRetry,
    onAnother,
    validateRef,
    mirrorRef,
    inquireRef,
    conversationEndRef,
    totalScore,
  } = props;

  const personaShort = scenario.persona.split(",")[0];

  return (
    <section className="min-h-screen">
      <nav className="max-w-4xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="text-sm flex items-center gap-2"
          style={{ color: "rgba(11,31,58,0.6)" }}
        >
          ← Leave session
        </button>
        <div className="seal pill">
          Turn {Math.min(turnNumber + 1, MAX_TURNS)} of {MAX_TURNS}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Scenario header */}
        <div
          className="bg-white rounded-2xl p-6 mb-8"
          style={{ border: "1px solid rgba(11,31,58,0.1)" }}
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <span
                className="pill"
                style={{ background: "rgba(11,31,58,0.06)", color: "var(--navy)" }}
              >
                {scenario.category} · {scenario.difficulty}
              </span>
              <h2 className="display text-2xl font-bold mt-3" style={{ color: "var(--navy)" }}>
                {scenario.title}
              </h2>
            </div>
          </div>
          <div className="text-sm mb-2" style={{ color: "rgba(11,31,58,0.65)" }}>
            <strong style={{ color: "var(--navy)" }}>Your counterpart:</strong> {scenario.persona}
          </div>
          <div className="text-xs italic" style={{ color: "rgba(11,31,58,0.55)" }}>
            {scenario.context}
          </div>
        </div>

        {/* Conversation */}
        <div className="space-y-5 mb-8">
          {history.map((msg, idx) => (
            <ConversationBubble
              key={idx}
              msg={msg}
              personaShort={personaShort}
            />
          ))}
          <div ref={conversationEndRef} />
        </div>

        {/* Loading */}
        {(loading || debriefLoading) && (
          <div className="text-center py-6">
            <div className="typing-dots inline-flex gap-1.5">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="text-xs mt-2" style={{ color: "rgba(11,31,58,0.5)" }}>
              {debriefLoading ? "Preparing your debrief..." : "Reading the room..."}
            </div>
          </div>
        )}

        {/* Input area (hidden when debrief is showing) */}
        {!debrief && !debriefLoading && (
          <div
            className="bg-white rounded-2xl p-6"
            style={{ border: "2px solid rgba(11,31,58,0.1)" }}
          >
            <div
              className="text-xs tracking-[0.2em] font-semibold mb-4 uppercase"
              style={{ color: "rgba(11,31,58,0.5)" }}
            >
              Your Aikido Response
            </div>

            <div className="space-y-4">
              <FieldRow
                num={1}
                label="VALIDATE"
                hint="acknowledge their feeling"
                placeholder='e.g., "I hear you, and I understand this is frustrating..."'
                value={fields.validate}
                onChange={(v) => setFields({ ...fields, validate: v })}
                inputRef={validateRef}
                onEnter={() => mirrorRef.current?.focus()}
              />
              <FieldRow
                num={2}
                label="MIRROR"
                hint="reflect their actual concern"
                placeholder='e.g., "...that the timeline feels impossibly tight..."'
                value={fields.mirror}
                onChange={(v) => setFields({ ...fields, mirror: v })}
                inputRef={mirrorRef}
                onEnter={() => inquireRef.current?.focus()}
              />
              <FieldRow
                num={3}
                label="INQUIRE"
                hint="open question"
                placeholder='e.g., "...what would feel workable to you?"'
                value={fields.inquire}
                onChange={(v) => setFields({ ...fields, inquire: v })}
                inputRef={inquireRef}
                onEnter={onSend}
              />
            </div>

            <div
              className="flex items-center justify-between mt-6 pt-5"
              style={{ borderTop: "1px solid rgba(11,31,58,0.1)" }}
            >
              <div className="text-xs" style={{ color: "rgba(11,31,58,0.5)" }}>
                All three fields needed to complete a move.
              </div>
              <button
                onClick={onSend}
                disabled={loading}
                className="btn-primary px-7 py-3 rounded-full font-semibold text-sm"
              >
                Send Response →
              </button>
            </div>
          </div>
        )}

        {/* Debrief */}
        {debrief && (
          <DebriefCard
            debrief={debrief}
            totalScore={totalScore}
            maxScore={MAX_TURNS * 9}
            onRetry={onRetry}
            onAnother={onAnother}
          />
        )}
      </div>
    </section>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function ConversationBubble({
  msg,
  personaShort,
}: {
  msg: Message;
  personaShort: string;
}) {
  if (msg.role === "them") {
    return (
      <div className="fade-in">
        <div
          className="text-[10px] tracking-[0.2em] font-semibold uppercase mb-1.5"
          style={{ color: "rgba(11,31,58,0.4)" }}
        >
          {personaShort}
        </div>
        <div className="bubble-them" style={{ color: "var(--navy)" }}>
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div
        className="text-[10px] tracking-[0.2em] font-semibold uppercase mb-1.5 text-right"
        style={{ color: "rgba(11,31,58,0.4)" }}
      >
        You
      </div>
      <div className="bubble-you">{msg.text}</div>
      {msg.scores && msg.tip && <CoachFeedback scores={msg.scores} tip={msg.tip} />}
    </div>
  );
}

function CoachFeedback({
  scores,
  tip,
}: {
  scores: { validate: number; mirror: number; inquire: number };
  tip: string;
}) {
  const total = scores.validate + scores.mirror + scores.inquire;
  return (
    <div className="bubble-coach mt-3 ml-auto" style={{ maxWidth: "88%" }}>
      <div className="flex items-center justify-between mb-2">
        <div
          className="text-[10px] tracking-[0.15em] font-bold uppercase"
          style={{ color: "rgba(11,31,58,0.6)" }}
        >
          Coach
        </div>
        <div>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={`star ${i < total ? "full" : "empty"}`}>
              ★
            </span>
          ))}
        </div>
      </div>
      <div className="leading-snug" style={{ color: "rgba(11,31,58,0.8)" }}>
        {tip}
      </div>
      <div
        className="flex gap-3 mt-2 text-[10px] font-semibold"
        style={{ color: "rgba(11,31,58,0.5)" }}
      >
        <span>Validate: {scores.validate}/3</span>
        <span>Mirror: {scores.mirror}/3</span>
        <span>Inquire: {scores.inquire}/3</span>
      </div>
    </div>
  );
}

function FieldRow({
  num,
  label,
  hint,
  placeholder,
  value,
  onChange,
  inputRef,
  onEnter,
}: {
  num: number;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onEnter: () => void;
}) {
  return (
    <div>
      <label
        className="text-xs font-bold mb-1.5 flex items-center gap-2"
        style={{ color: "rgba(11,31,58,0.7)" }}
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--navy)", color: "var(--amber)" }}
        >
          {num}
        </span>
        {label}
        <span className="font-normal normal-case text-xs" style={{ color: "rgba(11,31,58,0.4)" }}>
          — {hint}
        </span>
      </label>
      <input
        ref={inputRef}
        className="field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}

function DebriefCard({
  debrief,
  totalScore,
  maxScore,
  onRetry,
  onAnother,
}: {
  debrief: DebriefResponse;
  totalScore: number;
  maxScore: number;
  onRetry: () => void;
  onAnother: () => void;
}) {
  const pct = Math.round((totalScore / maxScore) * 100);
  let band = "Apprentice";
  let bandColor = "var(--teal)";
  if (pct >= 80) {
    band = "Sensei";
    bandColor = "var(--amber)";
  } else if (pct >= 60) {
    band = "Practitioner";
  } else if (pct >= 40) {
    band = "Student";
  }

  return (
    <div
      className="bg-white rounded-2xl p-8 fade-in mt-8"
      style={{ border: "2px solid rgba(11,31,58,0.1)" }}
    >
      <div className="text-center mb-7">
        <div
          className="text-xs tracking-[0.3em] font-semibold mb-3"
          style={{ color: "rgba(11,31,58,0.5)" }}
        >
          SESSION DEBRIEF
        </div>
        <h2 className="display text-3xl font-bold mb-3" style={{ color: "var(--navy)" }}>
          {debrief.headline}
        </h2>
        <div className="inline-flex items-center gap-3 mt-2">
          <div className="seal pill" style={{ background: bandColor, color: "white" }}>
            {band}
          </div>
          <div className="text-2xl display font-bold" style={{ color: "var(--navy)" }}>
            {totalScore}
            <span className="text-base" style={{ color: "rgba(11,31,58,0.4)" }}>
              /{maxScore}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div
          className="border-l-4 rounded-r-xl p-5"
          style={{ borderColor: "var(--teal)", background: "rgba(20,184,166,0.06)" }}
        >
          <div
            className="text-[10px] tracking-[0.2em] font-bold uppercase mb-2"
            style={{ color: "var(--teal)" }}
          >
            What you nailed
          </div>
          <div className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.8)" }}>
            {debrief.strength}
          </div>
        </div>

        <div
          className="border-l-4 rounded-r-xl p-5"
          style={{ borderColor: "var(--amber)", background: "rgba(245,158,11,0.06)" }}
        >
          <div
            className="text-[10px] tracking-[0.2em] font-bold uppercase mb-2"
            style={{ color: "var(--amber)" }}
          >
            Drill this next
          </div>
          <div className="text-sm leading-relaxed" style={{ color: "rgba(11,31,58,0.8)" }}>
            {debrief.growth}
          </div>
        </div>
      </div>

      <div
        className="flex flex-col sm:flex-row gap-3 mt-7 pt-6"
        style={{ borderTop: "1px solid rgba(11,31,58,0.1)" }}
      >
        <button
          onClick={onRetry}
          className="flex-1 px-6 py-3 rounded-full font-semibold text-sm hover:bg-[rgba(11,31,58,0.05)]"
          style={{ color: "var(--navy)", border: "1px solid rgba(11,31,58,0.2)" }}
        >
          Retry this scenario
        </button>
        <button
          onClick={onAnother}
          className="flex-1 btn-primary px-6 py-3 rounded-full font-semibold text-sm"
        >
          Try another →
        </button>
      </div>
    </div>
  );
}
