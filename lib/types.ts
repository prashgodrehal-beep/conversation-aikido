export type Difficulty = "Easy" | "Medium" | "Hard";
export type Category = "Sales" | "Leadership" | "Relationships";

export interface Scenario {
  id: string;
  category: Category;
  difficulty: Difficulty;
  title: string;
  persona: string;
  opening: string;
  context: string;
}

export interface AikidoFields {
  validate: string;
  mirror: string;
  inquire: string;
}

export interface Scores {
  validate: number; // 0-3
  mirror: number;   // 0-3
  inquire: number;  // 0-3
}

export interface Message {
  role: "them" | "you";
  text: string;
  fields?: AikidoFields;
  scores?: Scores;
  tip?: string;
}

export interface TurnRequest {
  scenarioId: string;
  history: Message[];
  fields: AikidoFields;
  turnNumber: number;
  maxTurns: number;
}

export interface TurnResponse {
  counterpart_reply: string;
  scores: Scores;
  coach_tip: string;
}

export interface DebriefRequest {
  scenarioId: string;
  history: Message[];
  totalScore: number;
  maxScore: number;
}

export interface DebriefResponse {
  headline: string;
  strength: string;
  growth: string;
}
