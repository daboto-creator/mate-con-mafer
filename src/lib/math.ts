import type { Exercise, Topic } from "./types";

export const topics: { id: Topic; label: string; icon: string }[] = [
  { id: "sumas", label: "Sumas", icon: "+" },
  { id: "restas", label: "Restas", icon: "-" },
  { id: "multiplicaciones", label: "Multiplicaciones", icon: "x" },
  { id: "divisiones", label: "Divisiones", icon: "÷" },
  { id: "fracciones", label: "Fracciones", icon: "1/2" },
  { id: "tablas", label: "Tablas", icon: "#" },
  { id: "razonamiento", label: "Razonamiento", icon: "?" },
  { id: "geometria", label: "Geometría", icon: "□" },
  { id: "tiempo", label: "Tiempo", icon: "h" },
  { id: "dinero", label: "Dinero", icon: "$" }
];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(items: T[]) => items[random(0, items.length - 1)];

function subtopicFor(topic: Topic, kind: Exercise["kind"], difficultyLevel: number) {
  const prefix = kind === "word_problem" ? "Problemas" : "Ejercicios";
  const labels: Record<Topic, string[]> = {
    sumas: ["Sumas de una cifra", "Sumas de dos cifras sin llevar", "Sumas de dos cifras con llevadas", "Sumas de tres cifras", "Sumas con problemas"],
    restas: ["Restas sin pedir prestado", "Restas con préstamo", "Restas de tres cifras", "Restas con problemas", "Restas mixtas"],
    multiplicaciones: ["Multiplicaciones de una cifra", "Multiplicaciones con números mayores", "Dos cifras por una cifra", "Dos cifras por dos cifras", "Problemas de multiplicación"],
    divisiones: ["Divisiones simples", "Divisiones con residuo", "Divisiones con números mayores", "Problemas de división", "Divisiones mixtas"],
    fracciones: ["Fracciones básicas", "Suma de fracciones iguales", "Comparación de fracciones", "Fracciones en problemas", "Fracciones mixtas"],
    tablas: ["Tablas 2 a 5", "Tablas 6 a 8", "Tablas 9 a 12", "Tablas en problemas", "Tablas mixtas"],
    razonamiento: ["Problemas de una operación", "Problemas de varias operaciones", "Seleccionar operación", "Razonamiento con datos", "Retos de razonamiento"],
    geometria: ["Figuras básicas", "Lados y vértices", "Perímetro", "Área con cuadritos", "Problemas de geometría"],
    tiempo: ["Horas y minutos", "Duración de actividades", "Calendario", "Problemas de tiempo", "Tiempo mixto"],
    dinero: ["Monedas y billetes", "Sumar dinero", "Cambio", "Compras con varias operaciones", "Dinero mixto"]
  };

  return kind === "word_problem" && topic !== "razonamiento"
    ? `${prefix}: ${labels[topic][Math.min(difficultyLevel - 1, 4)]}`
    : labels[topic][Math.min(difficultyLevel - 1, 4)];
}

function meta(topic: Topic, kind: Exercise["kind"], difficultyLevel: number, operationType: string) {
  return {
    kind,
    topic,
    subtopic: subtopicFor(topic, kind, difficultyLevel),
    difficultyLevel,
    operationType
  };
}

export function createExercise(
  topic: Topic,
  grade?: string | null,
  kind: Exercise["kind"] = "operation",
  difficultyLevel = 1
): Exercise {
  if (kind === "word_problem") {
    return createWordProblem(topic, grade, difficultyLevel);
  }

  if (topic === "sumas") {
    const left = random(3, 40);
    const right = random(2, 35);
    return {
      ...meta(topic, "operation", difficultyLevel, "suma"),
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
      ...meta(topic, "operation", difficultyLevel, "resta"),
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
      ...meta(topic, "operation", difficultyLevel, "multiplicacion"),
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
      ...meta(topic, "operation", difficultyLevel, "fraccion"),
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
      ...meta(topic, "operation", difficultyLevel, "tabla"),
      left,
      right,
      symbol: "x",
      question: `${left} x ${right}`,
      answer: left * right,
      hint: `Piensa en la tabla del ${left}: suma ${left} un total de ${right} veces.`
    };
  }

  if (topic === "geometria") {
    const left = random(3, 12);
    const right = random(3, 12);
    return {
      ...meta(topic, "operation", difficultyLevel, "perimetro"),
      left,
      right,
      symbol: "+",
      question: `Rectángulo: lados ${left} y ${right}. ¿Cuál es su perímetro?`,
      answer: 2 * (left + right),
      hint: `Suma todos los lados: ${left} + ${right} + ${left} + ${right}.`
    };
  }

  if (topic === "tiempo") {
    const left = random(15, 55);
    const right = random(10, 45);
    return {
      ...meta(topic, "operation", difficultyLevel, "tiempo"),
      left,
      right,
      symbol: "+",
      question: `${left} min + ${right} min`,
      answer: left + right,
      hint: `Suma los minutos. Si pasan de 60, puedes formar una hora.`
    };
  }

  if (topic === "dinero") {
    const left = random(12, 90);
    const right = random(5, 70);
    return {
      ...meta(topic, "operation", difficultyLevel, "dinero"),
      left,
      right,
      symbol: "+",
      question: `$${left} + $${right}`,
      answer: left + right,
      hint: `Suma los pesos como una suma normal.`
    };
  }

  const answer = random(2, 10);
  const right = random(2, 10);
  const left = answer * right;
  return {
    ...meta(topic, "operation", difficultyLevel, "division"),
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

function createWordProblem(topic: Topic, grade?: string | null, difficultyLevel = 1): Exercise {
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
      ...meta(topic, "word_problem", difficultyLevel, "suma"),
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
      ...meta(topic, "word_problem", difficultyLevel, "resta"),
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
      ...meta(topic, "word_problem", difficultyLevel, "multiplicacion"),
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
      ...meta(topic, "word_problem", difficultyLevel, "fraccion"),
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
      ...meta(topic, "word_problem", difficultyLevel, "tabla"),
      left,
      right,
      symbol: "x",
      question: story,
      answer: left * right,
      hint: `Vas bien: son grupos iguales. Usa la tabla del ${left} o suma ${right} un total de ${left} veces.`
    };
  }

  if (topic === "razonamiento") {
    const left = random(8, 35);
    const right = random(2, 9);
    const extra = random(3, 18);
    const answer = left + right * extra;
    return {
      ...meta(topic, "word_problem", difficultyLevel, "razonamiento"),
      left,
      right,
      symbol: "+",
      question: `Mafer tiene ${left} stickers. Compra ${right} paquetes con ${extra} stickers cada uno. ¿Cuántos stickers tiene en total?`,
      answer,
      hint: `Primero calcula los stickers de los paquetes: ${right} x ${extra}. Luego suma los que ya tenía.`
    };
  }

  if (topic === "geometria") {
    const left = random(4, 14);
    const right = random(3, 12);
    return {
      ...meta(topic, "word_problem", difficultyLevel, "perimetro"),
      left,
      right,
      symbol: "+",
      question: `Mafer dibuja un marco para una pintura. Mide ${left} cm de largo y ${right} cm de ancho. ¿Cuántos cm necesita para rodearlo?`,
      answer: 2 * (left + right),
      hint: `Un marco rodea los cuatro lados: largo + ancho + largo + ancho.`
    };
  }

  if (topic === "tiempo") {
    const left = random(20, 55);
    const right = random(10, 45);
    return {
      ...meta(topic, "word_problem", difficultyLevel, "tiempo"),
      left,
      right,
      symbol: "+",
      question: `Mafer pinta durante ${left} minutos y luego juega con slime ${right} minutos. ¿Cuántos minutos usó en total?`,
      answer: left + right,
      hint: `Suma los dos tiempos: primero pintura, luego slime.`
    };
  }

  if (topic === "dinero") {
    const left = random(15, 95);
    const right = random(8, 60);
    return {
      ...meta(topic, "word_problem", difficultyLevel, "dinero"),
      left,
      right,
      symbol: "+",
      question: `Mafer quiere comprar pinturas de $${left} y stickers de $${right}. ¿Cuánto necesita pagar?`,
      answer: left + right,
      hint: `Junta los dos precios con una suma.`
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
    ...meta(topic, "word_problem", difficultyLevel, "division"),
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
