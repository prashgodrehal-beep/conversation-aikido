/**
 * Preparation Path Engine
 *
 * Static mapping of role + goals → ordered scenario sequences.
 * This is the file you edit to tune paths.
 * When ready, replace with AI-generated paths using Claude.
 */

export const ROLES = [
  { id: "founder", label: "Founder / CEO" },
  { id: "cxo", label: "CXO / VP" },
  { id: "manager", label: "Director / Manager" },
  { id: "sales", label: "Sales / BD" },
  { id: "ic", label: "Individual Contributor" },
  { id: "other", label: "Other" },
] as const;

export const GOALS = [
  { id: "sales_conv", label: "Handling sales objections", icon: "💰" },
  { id: "tough_feedback", label: "Giving tough feedback", icon: "🪞" },
  { id: "managing_up", label: "Managing up & pushing back", icon: "⬆️" },
  { id: "peer_conflict", label: "Navigating peer conflict", icon: "🤝" },
  { id: "client_relationships", label: "Client relationships", icon: "🏢" },
  { id: "personal", label: "Personal relationships", icon: "❤️" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];
export type GoalId = (typeof GOALS)[number]["id"];

interface PathScenario {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface PreparationPath {
  label: string;
  description: string;
  scenarios: PathScenario[];
  estimatedMinutes: number;
}

// Scenario reference table (so paths don't depend on importing the full scenario library)
const S = {
  priceObjection: { id: "price-objection", title: "The Price Objection", difficulty: "Easy" as const },
  competitorCard: { id: "competitor-cheaper", title: "The Competitor Card", difficulty: "Medium" as const },
  featureNotPossible: { id: "feature-not-possible", title: "The Feature That Doesn't Exist", difficulty: "Hard" as const },
  coldOpen: { id: "cold-open", title: "The Cold Open", difficulty: "Medium" as const },
  ghostedFollowup: { id: "ghosted-followup", title: "The Ghosted Follow-Up", difficulty: "Medium" as const },
  toxicHighPerformer: { id: "toxic-high-performer", title: "The Toxic High Performer", difficulty: "Hard" as const },
  hardReview: { id: "hard-performance-review", title: "The Hard Performance Review", difficulty: "Medium" as const },
  silentResignation: { id: "silent-resignation", title: "The Silent Resignation", difficulty: "Hard" as const },
  leadingPeers: { id: "leading-former-peers", title: "Leading Former Peers", difficulty: "Medium" as const },
  sayingNoToCeo: { id: "saying-no-to-ceo", title: "Saying No to Your CEO", difficulty: "Hard" as const },
  founderDisagreement: { id: "founder-disagreement", title: "The Founder Disagreement", difficulty: "Hard" as const },
  creditThief: { id: "credit-thief", title: "The Credit Thief", difficulty: "Medium" as const },
  passiveAggressive: { id: "passive-aggressive-colleague", title: "The Passive-Aggressive Colleague", difficulty: "Medium" as const },
  angryEscalation: { id: "angry-escalation", title: "The Angry Escalation", difficulty: "Hard" as const },
  scopeCreep: { id: "scope-creep", title: "The Scope Creep Conversation", difficulty: "Medium" as const },
  b2bOnboarding: { id: "b2b-onboarding", title: "The B2B Onboarding Call", difficulty: "Easy" as const },
  deadlineExtension: { id: "deadline-extension", title: "The Deadline Extension", difficulty: "Easy" as const },
  partnerUnheard: { id: "partner-unheard", title: '"You Never Listen"', difficulty: "Easy" as const },
};

// Goal → scenario sequences (ordered by difficulty)
const GOAL_PATHS: Record<GoalId, PathScenario[]> = {
  sales_conv: [S.priceObjection, S.coldOpen, S.ghostedFollowup, S.competitorCard, S.featureNotPossible],
  tough_feedback: [S.hardReview, S.leadingPeers, S.toxicHighPerformer, S.silentResignation],
  managing_up: [S.deadlineExtension, S.sayingNoToCeo, S.founderDisagreement],
  peer_conflict: [S.passiveAggressive, S.creditThief, S.founderDisagreement],
  client_relationships: [S.b2bOnboarding, S.deadlineExtension, S.scopeCreep, S.angryEscalation],
  personal: [S.partnerUnheard],
};

const GOAL_LABELS: Record<GoalId, string> = {
  sales_conv: "Sales Mastery",
  tough_feedback: "Tough Conversations",
  managing_up: "Leading Up",
  peer_conflict: "Peer Navigation",
  client_relationships: "Client Excellence",
  personal: "Personal Connection",
};

const GOAL_DESCRIPTIONS: Record<GoalId, string> = {
  sales_conv: "Handle objections, open cold conversations, and navigate competitive deals without losing your cool or your deal.",
  tough_feedback: "Deliver honest feedback, address toxic behavior, and uncover why great people leave — all while preserving trust.",
  managing_up: "Say no to unrealistic asks, push back on leadership, and hold your ground without being seen as the problem.",
  peer_conflict: "Surface passive aggression, reclaim credit, and navigate co-founder tension without damaging relationships.",
  client_relationships: "Guide onboarding, hold scope, extend deadlines, and de-escalate fury — all while keeping the client's trust.",
  personal: "Listen without fixing, validate without caving, and be present when the people closest to you need it most.",
};

/**
 * Build preparation paths from selected goals.
 * Deduplicates scenarios across goals.
 * Returns one path per goal, ordered by the goal selection.
 */
export function buildPaths(goals: GoalId[]): PreparationPath[] {
  const seen = new Set<string>();
  const paths: PreparationPath[] = [];

  for (const goalId of goals) {
    const scenarios = GOAL_PATHS[goalId].filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    if (scenarios.length > 0) {
      paths.push({
        label: GOAL_LABELS[goalId],
        description: GOAL_DESCRIPTIONS[goalId],
        scenarios,
        estimatedMinutes: scenarios.length * 5,
      });
    }
  }

  return paths;
}
