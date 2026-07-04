import type { EnglishExercise, EnglishTopic } from "./types";

export const englishTopics: { id: EnglishTopic; label: string; icon: string }[] = [
  { id: "fundamentos", label: "Fundamentos", icon: "ABC" },
  { id: "gramatica", label: "Gramática", icon: "To be" },
  { id: "vocabulario", label: "Vocabulario", icon: "Cat" },
  { id: "comprension", label: "Lectura", icon: "Read" },
  { id: "traduccion", label: "Traducción", icon: "ES/EN" }
];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(items: T[]) => items[random(0, items.length - 1)];

const banks: Record<EnglishTopic, EnglishExercise[]> = {
  fundamentos: [
    {
      topic: "fundamentos",
      subtopic: "Animales",
      activityType: "multiple_choice",
      difficultyLevel: 1,
      question: "What animal says 'meow'?",
      options: ["cat", "dog", "bird"],
      answer: "cat",
      hint: "Piensa en un gatito.",
      explanation: "Cat significa gato."
    },
    {
      topic: "fundamentos",
      subtopic: "Colores",
      activityType: "multiple_choice",
      difficultyLevel: 1,
      question: "The slime is green. ¿Qué color es?",
      options: ["verde", "azul", "rojo"],
      answer: "verde",
      hint: "Green es el color del pasto.",
      explanation: "Green significa verde."
    }
  ],
  gramatica: [
    {
      topic: "gramatica",
      subtopic: "Verbo To Be afirmativo",
      activityType: "complete_sentence",
      difficultyLevel: 2,
      question: "My dog ___ happy.",
      options: ["am", "is", "are"],
      answer: "is",
      hint: "Dog es una sola mascota: he/she/it usa is.",
      explanation: "Usamos is porque hablamos de un perro: My dog is happy."
    },
    {
      topic: "gramatica",
      subtopic: "Pronombres personales",
      activityType: "multiple_choice",
      difficultyLevel: 1,
      question: "Mafer and I = ?",
      options: ["we", "they", "she"],
      answer: "we",
      hint: "Cuando yo estoy incluido, usamos we.",
      explanation: "We significa nosotros o nosotras."
    },
    {
      topic: "gramatica",
      subtopic: "Can / Can't",
      activityType: "complete_sentence",
      difficultyLevel: 3,
      question: "A bird ___ fly.",
      options: ["can", "can't", "am"],
      answer: "can",
      hint: "Un pájaro sí puede volar.",
      explanation: "Can significa puede: A bird can fly."
    }
  ],
  vocabulario: [
    {
      topic: "vocabulario",
      subtopic: "Objetos escolares",
      activityType: "multiple_choice",
      difficultyLevel: 1,
      question: "Pencil significa...",
      options: ["lápiz", "mochila", "regla"],
      answer: "lápiz",
      hint: "Lo usas para dibujar o escribir.",
      explanation: "Pencil significa lápiz."
    },
    {
      topic: "vocabulario",
      subtopic: "Comida",
      activityType: "multiple_choice",
      difficultyLevel: 1,
      question: "Pizza is...",
      options: ["comida", "ropa", "clima"],
      answer: "comida",
      hint: "Es algo que puedes comer.",
      explanation: "Pizza es comida."
    }
  ],
  comprension: [
    {
      topic: "comprension",
      subtopic: "Textos cortos",
      activityType: "reading",
      difficultyLevel: 2,
      question: "Lily has a dog. The dog is small and happy. What pet does Lily have?",
      options: ["a dog", "a cat", "a dinosaur"],
      answer: "a dog",
      hint: "Busca la palabra que aparece después de 'has'.",
      explanation: "El texto dice: Lily has a dog."
    }
  ],
  traduccion: [
    {
      topic: "traduccion",
      subtopic: "Español a inglés",
      activityType: "translation",
      difficultyLevel: 2,
      question: "Traduce: Mi gato es feliz.",
      options: ["My cat is happy.", "My dog are happy.", "I cat am happy."],
      answer: "My cat is happy.",
      hint: "Mi gato = My cat. Para una mascota usamos is.",
      explanation: "La frase correcta es: My cat is happy."
    }
  ]
};

export function createEnglishExercise(topic: EnglishTopic, difficultyLevel = 1): EnglishExercise {
  const pool = banks[topic].filter((exercise) => exercise.difficultyLevel <= difficultyLevel + 1);
  return pick(pool.length ? pool : banks[topic]);
}
