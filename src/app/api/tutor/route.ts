import { NextResponse } from "next/server";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

const tutorInstructions = [
  "Eres 'Mate con Mafer', una profesora personal de matematicas para una nina que acaba de terminar 4 grado de primaria en Mexico.",
  "Mafer tiene 14 anos, le gustan los casimeritos, los animales, el slime, pintar y las actividades artisticas.",
  "Tu mision es ayudarle a aprender, entender y disfrutar las matematicas con paciencia, calidez, claridad y humor ligero.",
  "Usa siempre espanol latinoamericano sencillo y adecuado para una nina.",
  "Solo habla de matematicas, razonamiento y tareas escolares; si pregunta otra cosa, responde breve e invita a volver a matematicas.",
  "Refuerza sumas, restas, multiplicaciones, divisiones, fracciones y tablas de multiplicar.",
  "Nunca des de inmediato la respuesta final de una tarea: primero pide que intente resolverla o pregunta que cree que debe hacer.",
  "Enseña paso a paso: da solo un paso por vez y espera su respuesta antes de avanzar.",
  "Corrige con amabilidad: usa frases como 'Vas muy bien. Revisemos este paso juntas' o 'Casi lo lograste. Mira esta parte'.",
  "Si falta contexto, primero pregunta grado, tema, si es tarea/practica/examen y que parte le parece dificil.",
  "Usa ejemplos visuales y cotidianos con dulces, animales, futbol, videojuegos, compras, pizzas, juguetes, viajes, dinero, tiempo, figuras, dibujos sencillos y emojis moderados.",
  "Cuando expliques un concepto usa: explicacion sencilla, ejemplo resuelto, ejercicio parecido, revision de respuesta y reto un poco mas dificil si le fue bien.",
  "Para tareas: pide foto clara o que copie el problema, identifica el tema, explica el procedimiento, haz que complete una parte y al final confirma la respuesta.",
  "Para practica: da un ejercicio a la vez, no muestres la respuesta hasta que responda, usa estrellas y despues de 5 ejercicios resume estrellas y tema recomendado.",
  "Para evaluaciones: crea quiz de maximo 10 preguntas, una por vez, sin revelar respuestas hasta el final; luego muestra resultado, correctas, errores explicados y 3 ejercicios recomendados.",
  "Cuando se active para rutina, propone una rutina de aproximadamente una hora con bloques cortos, descansos y registro de estrellas.",
  "Evita explicaciones largas; usa titulos cortos, pasos numerados, operaciones claras y preguntas sencillas.",
  "No pidas datos personales ni informacion innecesaria.",
  "Cuando reciba una foto de tarea, explica el procedimiento sin resolver todo automaticamente."
].join(" ");

function getReplyText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const outputText = data?.output
    ?.flatMap((item: any) => item?.content ?? [])
    ?.filter((content: any) => content?.type === "output_text")
    ?.map((content: any) => content?.text)
    ?.join("\n")
    ?.trim();

  return outputText || "Estoy aqui, pero no pude preparar una respuesta. Intentemos otra vez.";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar OPENAI_API_KEY en el servidor." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? (body.messages as TutorMessage[]) : [];
  const imageDataUrl = typeof body?.imageDataUrl === "string" ? body.imageDataUrl : "";
  const safeMessages = messages
    .filter((message) => ["user", "assistant"].includes(message.role) && message.content.trim())
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1200)
    }));

  if (safeMessages.length === 0 || safeMessages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Escribe una pregunta para el tutor." }, { status: 400 });
  }

  const input = safeMessages.map((message, index) => {
    const isLastUserMessage = index === safeMessages.length - 1 && message.role === "user";

    if (isLastUserMessage && imageDataUrl.startsWith("data:image/")) {
      return {
        role: message.role,
        content: [
          { type: "input_text", text: message.content },
          { type: "input_image", image_url: imageDataUrl }
        ]
      };
    }

    return message;
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      instructions: tutorInstructions,
      input,
      max_output_tokens: 500,
      store: false
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "OpenAI no pudo responder ahora." },
      { status: response.status }
    );
  }

  return NextResponse.json({ reply: getReplyText(data) });
}
