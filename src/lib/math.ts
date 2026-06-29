import type { Exercise, Topic } from "./types";

export const topics: { id: Topic; label: string; icon: string }[] = [
  { id: "sumas", label: "Sumas", icon: "+" },
  { id: "restas", label: "Restas", icon: "-" },
  { id: "multiplicaciones", label: "Multiplicaciones", icon: "x" },
  { id: "divisiones", label: "Divisiones", icon: "÷" },
  { id: "fracciones", label: "Fracciones", icon: "1/2" },
  { id: "tablas", label: "Tablas", icon: "#" }
];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(items: T[]) => items[random(0, items.length - 1)];

export function createExercise(topic: Topic, grade?: string | null, kind: Exercise["kind"] = "operation"): Exercise {
  if (kind === "word_problem") {
    return createWordProblem(topic, grade);
  }

  if (topic === "sumas") {
    const left = random(3, 40);
    const right = random(2, 35);
    return {
      kind: "operation",
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
      kind: "operation",
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
      kind: "operation",
      topic,
      left,
      right,
      symbol: "x",
      question: `${left} x ${right}`,
      answer: left * right,
      hint: `Multiplicar es sumar grupos iguales: ${left} grupos de ${right}.`
    };
  }

  if (topic === "fracciones") {
    const denominator = pick([4, 6, 8, 10, 12]);
    const left = random(1, Math.floor(denominator / 2));
    const right = random(1, denominator - left - 1);
    return {
      kind: "operation",
      topic,
      left,
      right,
      symbol: "+",
      question: `${left}/${denominator} + ${right}/${denominator}`,
      answer: left + right,
      hint: `Los denominadores son iguales. Suma solo las partes de arriba: ${left} + ${right}. Escribe solo el numerador.`
    };
  }

  if (topic === "tablas") {
    const left = random(2, 12);
    const right = random(2, 12);
    return {
      kind: "operation",
      topic,
      left,
      right,
      symbol: "x",
      question: `${left} x ${right}`,
      answer: left * right,
      hint: `Piensa en la tabla del ${left}: suma ${left} un total de ${right} veces.`
    };
  }

  const answer = random(2, 10);
  const right = random(2, 10);
  const left = answer * right;
  return {
    kind: "operation",
    topic,
    left,
    right,
    symbol: "÷",
    question: `${left} ÷ ${right}`,
    answer,
    hint: `Busca que numero multiplicado por ${right} da ${left}.`
  };
}

function gradeLevel(grade?: string | null) {
  const match = grade?.match(/\d+/);
  if (!match) return 4;
  return Math.min(Math.max(Number(match[0]), 1), 6);
}

function numberRange(grade?: string | null) {
  const level = gradeLevel(grade);

  if (level <= 1) {
    return { addMin: 2, addMax: 12, multiplyMax: 5 };
  }

  if (level <= 3) {
    return { addMin: 5, addMax: 40, multiplyMax: 10 };
  }

  return { addMin: 12, addMax: 90, multiplyMax: 12 };
}

function createWordProblem(topic: Topic, grade?: string | null): Exercise {
  const range = numberRange(grade);

  if (topic === "sumas") {
    const left = random(range.addMin, range.addMax);
    const right = random(range.addMin, range.addMax);
    const story = pick([
      `Mafer tiene ${left} dulces y su prima le regala ${right} dulces mas. ¿Cuantos dulces tiene ahora?`,
      `En un viaje vieron ${left} animales por la manana y ${right} animales por la tarde. ¿Cuantos animales vieron en total?`,
      `Su equipo metio ${left} goles en los juegos de la semana y luego metio ${right} mas. ¿Cuantos goles metio en total?`
    ]);

    return {
      kind: "word_problem",
      topic,
      left,
      right,
      symbol: "+",
      question: story,
      answer: left + right,
      hint: `Buen comienzo: primero identifica las dos cantidades, ${left} y ${right}. Como se juntan, usamos suma.`
    };
  }

  if (topic === "restas") {
    const right = random(range.addMin, range.addMax);
    const left = random(right + 5, right + range.addMax);
    const story = pick([
      `Habia ${left} monedas para comprar figuritas y Mafer uso ${right}. ¿Cuantas monedas quedaron?`,
      `En una pizza habia ${left} pedacitos pequenos y se comieron ${right}. ¿Cuantos pedacitos quedaron?`,
      `Mafer tenia ${left} puntos en un juego y gasto ${right} puntos para desbloquear una pista. ¿Cuantos puntos le quedaron?`
    ]);

    return {
      kind: "word_problem",
      topic,
      left,
      right,
      symbol: "-",
      question: story,
      answer: left - right,
      hint: `Buen intento: empieza con ${left}. Si algo se usa o se va, quitamos ${right}.`
    };
  }

  if (topic === "multiplicaciones") {
    const left = random(2, range.multiplyMax);
    const right = random(2, range.multiplyMax);
    const story = pick([
      `Hay ${left} bolsas con ${right} dulces en cada una. ¿Cuantos dulces hay en total?`,
      `En un juego, Mafer gana ${right} estrellas por nivel y completa ${left} niveles. ¿Cuantas estrellas gana?`,
      `Hay ${left} equipos de futbol con ${right} jugadoras en cada equipo. ¿Cuantas jugadoras hay en total?`
    ]);

    return {
      kind: "word_problem",
      topic,
      left,
      right,
      symbol: "x",
      question: story,
      answer: left * right,
      hint: `Vas bien: hay ${left} grupos iguales y cada grupo tiene ${right}. Multiplicar ayuda con grupos iguales.`
    };
  }

  if (topic === "fracciones") {
    const denominator = pick([4, 6, 8, 10, 12]);
    const left = random(1, Math.floor(denominator / 2));
    const right = random(1, denominator - left - 1);
    const story = pick([
      `Mafer pinto ${left}/${denominator} de un dibujo con slime de color y luego pinto ${right}/${denominator} mas. ¿Cuantas partes de ${denominator} pinto en total?`,
      `Un casimerito tiene una pizza dividida en ${denominator} partes. Come ${left}/${denominator} y comparte ${right}/${denominator}. ¿Cuantas partes uso en total?`,
      `En una hoja de arte, Mafer decoro ${left}/${denominator} con animales y ${right}/${denominator} con estrellas. ¿Cuantas partes decoro en total?`
    ]);

    return {
      kind: "word_problem",
      topic,
      left,
      right,
      symbol: "+",
      question: story,
      answer: left + right,
      hint: `Buen intento: como el numero de abajo es igual (${denominator}), suma solo las partes de arriba. Escribe solo el numerador.`
    };
  }

  if (topic === "tablas") {
    const left = random(2, range.multiplyMax);
    const right = random(2, 12);
    const story = pick([
      `Mafer pinta ${left} casimeritos y a cada uno le dibuja ${right} estrellitas. ¿Cuantas estrellitas dibuja en total?`,
      `Hay ${left} frascos de slime con ${right} brillitos grandes en cada frasco. ¿Cuantos brillitos hay en total?`,
      `En un juego hay ${left} mundos y en cada mundo gana ${right} monedas. ¿Cuantas monedas gana en total?`
    ]);

    return {
      kind: "word_problem",
      topic,
      left,
      right,
      symbol: "x",
      question: story,
      answer: left * right,
      hint: `Vas bien: son grupos iguales. Usa la tabla del ${left} o suma ${right} un total de ${left} veces.`
    };
  }

  const answer = random(2, range.multiplyMax);
  const right = random(2, range.multiplyMax);
  const left = answer * right;
  const story = pick([
    `Mafer reparte ${left} dulces entre ${right} amigas en partes iguales. ¿Cuantos dulces recibe cada una?`,
    `Hay ${left} rebanadas de pizza para ${right} platos iguales. ¿Cuantas rebanadas van en cada plato?`,
    `En un viaje hay ${left} stickers para poner en ${right} paginas iguales. ¿Cuantos stickers van en cada pagina?`
  ]);

  return {
    kind: "word_problem",
    topic,
    left,
    right,
    symbol: "÷",
    question: story,
    answer,
    hint: `Buen intento: repartir en partes iguales es dividir. Busca cuantos grupos de ${right} forman ${left}.`
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
