export type Subject = "math" | "english";

export type Topic =
  | "sumas"
  | "restas"
  | "multiplicaciones"
  | "divisiones"
  | "fracciones"
  | "tablas"
  | "razonamiento"
  | "geometria"
  | "tiempo"
  | "dinero";

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
  subtopic: string;
  difficultyLevel: number;
  operationType: string;
  left: number;
  right: number;
  symbol: string;
  question: string;
  answer: number;
  hint: string;
};

export type EnglishTopic =
  | "fundamentos"
  | "gramatica"
  | "comprension"
  | "vocabulario"
  | "traduccion";

export type EnglishExercise = {
  topic: EnglishTopic;
  subtopic: string;
  activityType: "multiple_choice" | "complete_sentence" | "translation" | "reading";
  difficultyLevel: number;
  question: string;
  options?: string[];
  answer: string;
  hint: string;
  explanation: string;
};

export type LearningAttempt = {
  id?: string;
  userId: string;
  sessionId: string | null;
  subject: Subject;
  topic: string;
  subtopic: string;
  activityType: string;
  operationType: string | null;
  difficultyLevel: number;
  question: string;
  answerGiven: string;
  correctAnswer: string;
  isCorrect: boolean;
  attemptsCount: number;
  hintRequested: boolean;
  responseTimeSeconds: number;
  createdAt: string;
};

export type StudySession = {
  id: string;
  userId: string;
  subject: Subject;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
};
