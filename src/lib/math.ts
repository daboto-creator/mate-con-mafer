import type { Exercise, Topic } from "./types";

export const topics: { id: Topic; label: string; icon: string }[] = [
  { id: "sumas", label: "Sumas", icon: "+" },
  { id: "restas", label: "Restas", icon: "-" },
  { id: "multiplicaciones", label: "Multiplicaciones", icon: "x" },
  { id: "divisiones", label: "Divisiones", icon: "÷" }
];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function createExercise(topic: Topic): Exercise {
  if (topic === "sumas") {
    const left = random(3, 40);
    const right = random(2, 35);
    return {
      topic,
      left,
      right,
      symbol: "+",
      question: `${left} + ${right}`,
      answer: left + right,
      hint: `Empieza con ${left} y avanza ${right} lugares. Puedes separar ${right} en decenas y unidades.`
    };
  }

  if (topic === "restas") {
    const right = random(2, 30);
    const left = random(right + 2, right + 45);
    return {
      topic,
      left,
      right,
      symbol: "-",
      question: `${left} - ${right}`,
      answer: left - right,
      hint: `Piensa cuanto falta de ${right} para llegar a ${left}. Esa distancia es la respuesta.`
    };
  }

  if (topic === "multiplicaciones") {
    const left = random(2, 10);
    const right = random(2, 10);
    return {
      topic,
      left,
      right,
      symbol: "x",
      question: `${left} x ${right}`,
      answer: left * right,
      hint: `Multiplicar es sumar grupos iguales: ${left} grupos de ${right}.`
    };
  }

  const answer = random(2, 10);
  const right = random(2, 10);
  const left = answer * right;
  return {
    topic,
    left,
    right,
    symbol: "÷",
    question: `${left} ÷ ${right}`,
    answer,
    hint: `Busca que numero multiplicado por ${right} da ${left}.`
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function nextStreak(lastStudyDate: string | null, currentStreak: number) {
  const today = todayKey();
  if (lastStudyDate === today) {
    return currentStreak;
  }

  if (!lastStudyDate) {
    return 1;
  }

  const last = new Date(`${lastStudyDate}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  const days = Math.round((now.getTime() - last.getTime()) / 86_400_000);
  return days === 1 ? currentStreak + 1 : 1;
}
