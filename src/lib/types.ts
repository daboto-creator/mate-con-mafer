export type Topic = "sumas" | "restas" | "multiplicaciones" | "divisiones";

export type Role = "mafer" | "papa";

export type Progress = {
  stars: number;
  correct: number;
  total: number;
  streak: number;
  topics: Topic[];
  lastStudyDate: string | null;
};

export type Attempt = {
  topic: Topic;
  question: string;
  answer: number;
  correctAnswer: number;
  isCorrect: boolean;
  createdAt: string;
};

export type Challenge = {
  id: string;
  questionCount: 5 | 10;
  topic: Topic | "mezclado";
  createdAt: string;
};

export type Exercise = {
  topic: Topic;
  left: number;
  right: number;
  symbol: string;
  question: string;
  answer: number;
  hint: string;
};
