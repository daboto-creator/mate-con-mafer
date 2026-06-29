export type Topic = "sumas" | "restas" | "multiplicaciones" | "divisiones" | "fracciones" | "tablas";

export type Role = "parent" | "child";

export type Profile = {
  id: string;
  fullName: string;
  role: Role;
  grade: string | null;
  createdAt: string;
};

export type Progress = {
  stars: number;
  correct: number;
  incorrect: number;
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

export type TopicProgress = {
  id: string;
  userId: string;
  topic: Topic;
  correctAnswers: number;
  incorrectAnswers: number;
  stars: number;
  streakDays: number;
  lastPracticedAt: string | null;
};

export type Challenge = {
  id: string;
  parentId: string;
  childId: string;
  questionCount: 5 | 10;
  topic: Topic | "mezclado";
  difficulty: "easy" | "normal" | "hard";
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
};

export type Exercise = {
  kind: "operation" | "word_problem";
  topic: Topic;
  left: number;
  right: number;
  symbol: string;
  question: string;
  answer: number;
  hint: string;
};
