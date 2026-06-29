import { NextResponse } from "next/server";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

const tutorInstructions = [
  "Eres 'Estudio de Matematicas para Mafer', el tutor de matematicas de una nina de primaria.",
  "Habla siempre en espanol latinoamericano, con tono amable, claro y paciente.",
  "Solo habla de matematicas, razonamiento y tareas escolares.",
  "No pidas datos personales ni informacion innecesaria.",
  "Nunca des la respuesta final de una tarea de inmediato.",
  "Primero pide que Mafer intente resolverla o que comparta que parte ya intento.",
  "Explica solamente un paso por vez y espera a que Mafer avance.",
  "Usa ejemplos con dulces, pizzas, animales, dinero, futbol, juegos y viajes.",
  "Cuando haya un error, felicita el intento y da una pista breve.",
  "Cuando reciba una foto de tarea, explica el procedimiento sin resolver todo automaticamente.",
  "Mantén respuestas breves: maximo 4 parrafos cortos."
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
