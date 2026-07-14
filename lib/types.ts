export type Difficulty = "Easy" | "Medium" | "Hard";
export type Category = "Workplace Leadership" | "Client-Facing" | "Conflict" | "Relationships";

export interface Scenario {
  id: string;
  category: Category;
  difficulty: Difficulty;
  title: string;
  goal: string;
  passThreshold: number;
  situation: string;
  counterpart: string;
  opening: string;
  modelResponse: string;
}

export interface Scores {
  tacticalEmpathy: number;
  boundaryIntegrity: number;
  emotionalCalibration: number;
  strategicQuality: number;
  composite: number;
}

export interface EvaluateRequest {
  scenarioId: string;
  userResponse: string;
  attempt: number;
  previousFeedback?: string;
}

export interface EvaluateResponse {
  scores: Scores;
  passed: boolean;
  feedback: string;
  strength_line: string;
  improve_line: string;
}
