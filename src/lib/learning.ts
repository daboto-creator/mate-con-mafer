import type { LearningAttempt, Subject } from "./types";

export type ReinforcementCard = {
  subject: Subject;
  topic: string;
  subtopic: string;
  accuracy: number;
  total: number;
  recentAccuracy: number;
  difficultyLevel: number;
  status: "mastered" | "practice" | "priority";
  trend: "mejorando" | "estable" | "necesita atención";
  recommendation: string;
};

export type DailyActivity = {
  day: string;
  totalSeconds: number;
  sessions: number;
  exercises: number;
  correct: number;
  incorrect: number;
  averageSeconds: number;
  byTopic: { topic: string; total: number }[];
};

function sameKey(attempt: LearningAttempt, subject: Subject, topic: string, subtopic: string) {
  return attempt.subject === subject && attempt.topic === topic && attempt.subtopic === subtopic;
}

export function nextDifficulty(
  attempts: LearningAttempt[],
  subject: Subject,
  topic: string,
  subtopic: string,
  currentLevel = 1
) {
  const recent = attempts.filter((attempt) => sameKey(attempt, subject, topic, subtopic)).slice(0, 10);
  const lastFive = recent.slice(0, 5);
  const correctFive = lastFive.filter((attempt) => attempt.isCorrect).length;
  const correctTen = recent.filter((attempt) => attempt.isCorrect).length;
  const recentErrors = recent.slice(0, 5).filter((attempt) => !attempt.isCorrect).length;
  const usedHelp = recent.slice(0, 5).filter((attempt) => attempt.hintRequested || attempt.responseTimeSeconds > 90).length;

  if (recent.length >= 10 && correctTen >= 8 && usedHelp <= 1) {
    return { difficultyLevel: Math.min(currentLevel + 1, 5), status: "mastered" as const };
  }

  if (lastFive.length >= 5 && correctFive >= 4 && usedHelp <= 1) {
    return { difficultyLevel: Math.min(currentLevel + 1, 5), status: "in_progress" as const };
  }

  if (recentErrors >= 3) {
    return { difficultyLevel: Math.max(currentLevel - 1, 1), status: "review" as const };
  }

  return { difficultyLevel: currentLevel, status: "in_progress" as const };
}

export function pickPracticeKind() {
  const roll = Math.random();
  if (roll < 0.7) return "current";
  if (roll < 0.9) return "review";
  return "challenge";
}

export function buildReinforcementCards(attempts: LearningAttempt[], subject?: Subject): ReinforcementCard[] {
  const filtered = subject ? attempts.filter((attempt) => attempt.subject === subject) : attempts;
  const groups = new Map<string, LearningAttempt[]>();

  filtered.forEach((attempt) => {
    const key = `${attempt.subject}:${attempt.topic}:${attempt.subtopic}`;
    groups.set(key, [attempt, ...(groups.get(key) ?? [])]);
  });

  return Array.from(groups.values())
    .map((items) => {
      const first = items[0];
      const total = items.length;
      const correct = items.filter((item) => item.isCorrect).length;
      const recent = items.slice(0, 10);
      const recentCorrect = recent.filter((item) => item.isCorrect).length;
      const accuracy = total ? Math.round((correct / total) * 100) : 0;
      const recentAccuracy = recent.length ? Math.round((recentCorrect / recent.length) * 100) : 0;
      const status: ReinforcementCard["status"] =
        recent.length >= 8 && recentAccuracy >= 80 ? "mastered" : recentAccuracy < 60 ? "priority" : "practice";
      const trend: ReinforcementCard["trend"] =
        recentAccuracy >= accuracy + 5 ? "mejorando" : recentAccuracy < 60 ? "necesita atención" : "estable";

      return {
        subject: first.subject,
        topic: first.topic,
        subtopic: first.subtopic,
        accuracy,
        total,
        recentAccuracy,
        difficultyLevel: first.difficultyLevel,
        status,
        trend,
        recommendation:
          status === "mastered"
            ? "Mantener con retos cortos y repaso semanal."
            : status === "priority"
              ? `Practicar ${first.subtopic.toLowerCase()} con ejercicios de refuerzo antes de avanzar.`
              : `Hacer 5 a 10 ejercicios de ${first.subtopic.toLowerCase()} y revisar pistas.`
      };
    })
    .sort((a, b) => a.recentAccuracy - b.recentAccuracy)
    .slice(0, 6);
}

export function buildDailyActivity(attempts: LearningAttempt[], subject?: Subject): DailyActivity[] {
  const filtered = subject ? attempts.filter((attempt) => attempt.subject === subject) : attempts;
  const groups = new Map<string, LearningAttempt[]>();

  filtered.forEach((attempt) => {
    const day = attempt.createdAt.slice(0, 10);
    groups.set(day, [attempt, ...(groups.get(day) ?? [])]);
  });

  return Array.from(groups.entries())
    .map(([day, items]) => {
      const topicCounts = new Map<string, number>();
      items.forEach((item) => topicCounts.set(item.topic, (topicCounts.get(item.topic) ?? 0) + 1));
      const totalSeconds = items.reduce((total, item) => total + item.responseTimeSeconds, 0);

      return {
        day,
        totalSeconds,
        sessions: new Set(items.map((item) => item.sessionId || item.createdAt.slice(0, 13))).size,
        exercises: items.length,
        correct: items.filter((item) => item.isCorrect).length,
        incorrect: items.filter((item) => !item.isCorrect).length,
        averageSeconds: items.length ? Math.round(totalSeconds / items.length) : 0,
        byTopic: Array.from(topicCounts.entries()).map(([topic, total]) => ({ topic, total }))
      };
    })
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 7);
}
