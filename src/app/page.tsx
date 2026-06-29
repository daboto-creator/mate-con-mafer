"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { PwaInstaller } from "@/components/PwaInstaller";
import { createExercise, nextStreak, todayKey, topics } from "@/lib/math";
import { isSupabaseReady, supabase } from "@/lib/supabase";
import type { Attempt, Challenge, Exercise, Progress, Role, Topic } from "@/lib/types";

const childKey = "mafer";
const accessCode = process.env.NEXT_PUBLIC_APP_ACCESS_CODE || "mafer";
type Screen = "inicio" | "practicar" | "tutor" | "progreso" | "papa";

const initialProgress: Progress = {
  stars: 0,
  correct: 0,
  total: 0,
  streak: 0,
  topics: [],
  lastStudyDate: null
};

const emptyChallenge: Challenge[] = [];

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [screen, setScreen] = useState<Screen>("inicio");
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>(emptyChallenge);
  const [selectedTopic, setSelectedTopic] = useState<Topic>("sumas");
  const [exercise, setExercise] = useState<Exercise>(() => createExercise("sumas"));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const modeLabel = isSupabaseReady ? "Conectado a Supabase" : "Modo local de prueba";

  useEffect(() => {
    const savedRole = window.localStorage.getItem("mate-role") as Role | null;
    const savedPhoto = window.localStorage.getItem("mate-photo");
    const savedProgress = window.localStorage.getItem("mate-progress");
    const savedAttempts = window.localStorage.getItem("mate-attempts");
    const savedChallenges = window.localStorage.getItem("mate-challenges");

    if (savedRole) setRole(savedRole);
    if (savedPhoto) setPhoto(savedPhoto);
    if (savedProgress) setProgress(JSON.parse(savedProgress));
    if (savedAttempts) setAttempts(JSON.parse(savedAttempts));
    if (savedChallenges) setChallenges(JSON.parse(savedChallenges));
  }, []);

  useEffect(() => {
    if (!role) return;
    void loadRemoteData();
  }, [role]);

  const errorsByTopic = useMemo(() => {
    return topics.map((topic) => ({
      ...topic,
      errors: attempts.filter((attempt) => attempt.topic === topic.id && !attempt.isCorrect).length,
      total: attempts.filter((attempt) => attempt.topic === topic.id).length
    }));
  }, [attempts]);

  async function enterApp(nextRole: Role) {
    if (code.trim().toLowerCase() !== accessCode.toLowerCase()) {
      setCodeError("Codigo privado incorrecto.");
      return;
    }

    setCodeError("");
    setRole(nextRole);
    setScreen(nextRole === "papa" ? "papa" : "inicio");
    window.localStorage.setItem("mate-role", nextRole);

    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
    }
  }

  async function loadRemoteData() {
    if (!supabase) return;

    const { data: progressRow } = await supabase
      .from("progress")
      .select("*")
      .eq("child_key", childKey)
      .maybeSingle();

    if (progressRow) {
      setProgress({
        stars: progressRow.stars ?? 0,
        correct: progressRow.correct ?? 0,
        total: progressRow.total ?? 0,
        streak: progressRow.streak ?? 0,
        topics: progressRow.topics ?? [],
        lastStudyDate: progressRow.last_study_date
      });
    }

    const { data: attemptRows } = await supabase
      .from("attempts")
      .select("*")
      .eq("child_key", childKey)
      .order("created_at", { ascending: false })
      .limit(100);

    if (attemptRows) {
      setAttempts(
        attemptRows.map((row) => ({
          topic: row.topic,
          question: row.question,
          answer: row.answer,
          correctAnswer: row.correct_answer,
          isCorrect: row.is_correct,
          createdAt: row.created_at
        }))
      );
    }

    const { data: challengeRows } = await supabase
      .from("challenges")
      .select("*")
      .eq("child_key", childKey)
      .order("created_at", { ascending: false });

    if (challengeRows) {
      setChallenges(
        challengeRows.map((row) => ({
          id: row.id,
          questionCount: row.question_count,
          topic: row.topic,
          createdAt: row.created_at
        }))
      );
    }
  }

  async function saveProgress(nextProgress: Progress, nextAttempts = attempts) {
    setProgress(nextProgress);
    window.localStorage.setItem("mate-progress", JSON.stringify(nextProgress));
    window.localStorage.setItem("mate-attempts", JSON.stringify(nextAttempts));

    if (!supabase) return;

    await supabase.from("progress").upsert({
      child_key: childKey,
      stars: nextProgress.stars,
      correct: nextProgress.correct,
      total: nextProgress.total,
      streak: nextProgress.streak,
      topics: nextProgress.topics,
      last_study_date: nextProgress.lastStudyDate,
      updated_at: new Date().toISOString()
    });
  }

  async function saveAttempt(attempt: Attempt) {
    const nextAttempts = [attempt, ...attempts];
    setAttempts(nextAttempts);
    window.localStorage.setItem("mate-attempts", JSON.stringify(nextAttempts));

    if (!supabase) return;

    await supabase.from("attempts").insert({
      child_key: childKey,
      topic: attempt.topic,
      question: attempt.question,
      answer: attempt.answer,
      correct_answer: attempt.correctAnswer,
      is_correct: attempt.isCorrect,
      created_at: attempt.createdAt
    });
  }

  async function reviewAnswer() {
    const numericAnswer = Number(answer);
    if (Number.isNaN(numericAnswer) || answer.trim() === "") {
      setFeedback("Escribe tu respuesta primero. Yo espero contigo.");
      return;
    }

    const isCorrect = numericAnswer === exercise.answer;
    const attempt: Attempt = {
      topic: exercise.topic,
      question: exercise.question,
      answer: numericAnswer,
      correctAnswer: exercise.answer,
      isCorrect,
      createdAt: new Date().toISOString()
    };

    const nextProgress: Progress = {
      stars: progress.stars + (isCorrect ? 1 : 0),
      correct: progress.correct + (isCorrect ? 1 : 0),
      total: progress.total + 1,
      streak: nextStreak(progress.lastStudyDate, progress.streak),
      topics: progress.topics.includes(exercise.topic)
        ? progress.topics
        : [...progress.topics, exercise.topic],
      lastStudyDate: todayKey()
    };

    await saveAttempt(attempt);
    await saveProgress(nextProgress, [attempt, ...attempts]);

    setFeedback(
      isCorrect
        ? "¡Excelente, Mafer! Ganaste una estrella."
        : `Casi. Pista amable: ${exercise.hint}`
    );
  }

  function nextExercise(topic = selectedTopic) {
    setSelectedTopic(topic);
    setExercise(createExercise(topic));
    setAnswer("");
    setFeedback("");
  }

  async function createChallenge(questionCount: 5 | 10, topic: Challenge["topic"]) {
    const challenge: Challenge = {
      id: crypto.randomUUID(),
      questionCount,
      topic,
      createdAt: new Date().toISOString()
    };
    const nextChallenges = [challenge, ...challenges];
    setChallenges(nextChallenges);
    window.localStorage.setItem("mate-challenges", JSON.stringify(nextChallenges));

    if (supabase) {
      await supabase.from("challenges").insert({
        id: challenge.id,
        child_key: childKey,
        question_count: questionCount,
        topic,
        created_at: challenge.createdAt
      });
    }
  }

  function handlePhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      setPhoto(value);
      window.localStorage.setItem("mate-photo", value);
    };
    reader.readAsDataURL(file);
  }

  function leaveApp() {
    setRole(null);
    setCode("");
    setScreen("inicio");
    window.localStorage.removeItem("mate-role");
  }

  if (!role) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-8">
        <PwaInstaller />
        <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-berry shadow-sm">
              App privada
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-black leading-tight text-ink sm:text-7xl">Mate con Mafer</h1>
              <p className="max-w-xl text-xl leading-8 text-ink/75">
                Practica matematicas con estrellas, retos simples y ayuda paso a paso.
              </p>
            </div>
            <div className="overflow-hidden rounded-[2rem] shadow-soft">
              <Image
                src="/images/mate-con-mafer-hero.png"
                alt="Ilustracion infantil de Mate con Mafer"
                width={1200}
                height={675}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <Avatar photo={photo} />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">{modeLabel}</p>
                <h2 className="text-3xl font-black text-ink">Entrar</h2>
              </div>
            </div>
            <label className="block text-sm font-bold text-ink/70" htmlFor="code">
              Codigo privado
            </label>
            <input
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-2xl border-2 border-ink/10 bg-rose-50 px-5 py-4 text-xl font-bold outline-none focus:border-coral"
              placeholder="Escribe el codigo"
              type="password"
            />
            {codeError ? <p className="mt-3 font-bold text-berry">{codeError}</p> : null}
            <div className="mt-6 grid gap-3">
              <button className="big-button bg-coral text-white" onClick={() => enterApp("mafer")}>
                Entrar como Mafer
              </button>
              <button className="big-button bg-ink text-white" onClick={() => enterApp("papa")}>
                Entrar como papa
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-28 pt-5 sm:px-8 lg:px-10">
      <PwaInstaller />
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar photo={photo} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-berry">{modeLabel}</p>
              <h1 className="text-2xl font-black text-ink sm:text-3xl">
                {role === "papa" ? "Panel de papa" : "Hola Mafer"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink shadow-sm">
              Foto
              <input
                aria-label="Subir foto de Mafer"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handlePhoto(event.target.files?.[0])}
              />
            </label>
            <button className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink shadow-sm" onClick={leaveApp}>
              Salir
            </button>
          </div>
        </header>

        {screen === "inicio" ? (
          <HomeScreen progress={progress} setScreen={setScreen} challenges={challenges} />
        ) : null}
        {screen === "practicar" ? (
          <PracticeScreen
            answer={answer}
            exercise={exercise}
            feedback={feedback}
            selectedTopic={selectedTopic}
            setAnswer={setAnswer}
            nextExercise={nextExercise}
            reviewAnswer={reviewAnswer}
            setFeedback={setFeedback}
          />
        ) : null}
        {screen === "tutor" ? <TutorScreen /> : null}
        {screen === "progreso" ? <ProgressScreen progress={progress} attempts={attempts} /> : null}
        {screen === "papa" ? (
          <DadScreen
            attempts={attempts}
            challenges={challenges}
            createChallenge={createChallenge}
            errorsByTopic={errorsByTopic}
            progress={progress}
          />
        ) : null}
      </div>

      <BottomNav role={role} screen={screen} setScreen={setScreen} />
    </main>
  );
}

function Avatar({ photo }: { photo: string | null }) {
  return (
    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-mint text-3xl shadow-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo ? <img src={photo} alt="Foto de Mafer" className="h-full w-full object-cover" /> : "M"}
    </div>
  );
}

function HomeScreen({
  challenges,
  progress,
  setScreen
}: {
  challenges: Challenge[];
  progress: Progress;
  setScreen: (screen: "practicar" | "tutor" | "progreso") => void;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[2rem] bg-white p-5 shadow-soft">
        <Image
          src="/images/mate-con-mafer-hero.png"
          alt="Animales estudiando matematicas"
          width={1200}
          height={675}
          className="rounded-[1.5rem]"
        />
      </div>
      <div className="space-y-5">
        <Stats progress={progress} />
        {challenges[0] ? (
          <div className="rounded-[2rem] bg-sunshine p-5 shadow-soft">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-ink/60">Reto de papa</p>
            <h2 className="text-2xl font-black text-ink">
              {challenges[0].questionCount} preguntas de {topicLabel(challenges[0].topic)}
            </h2>
          </div>
        ) : null}
        <div className="grid gap-4">
          <button className="big-button bg-coral text-white" onClick={() => setScreen("practicar")}>
            Practicar
          </button>
          <button className="big-button bg-lilac text-white" onClick={() => setScreen("tutor")}>
            Tutor de matematicas
          </button>
          <button className="big-button bg-ink text-white" onClick={() => setScreen("progreso")}>
            Mi progreso
          </button>
        </div>
      </div>
    </section>
  );
}

function PracticeScreen({
  answer,
  exercise,
  feedback,
  nextExercise,
  reviewAnswer,
  selectedTopic,
  setAnswer,
  setFeedback
}: {
  answer: string;
  exercise: Exercise;
  feedback: string;
  nextExercise: (topic?: Topic) => void;
  reviewAnswer: () => void;
  selectedTopic: Topic;
  setAnswer: (answer: string) => void;
  setFeedback: (feedback: string) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {topics.map((topic) => (
          <button
            className={`rounded-3xl px-4 py-4 text-lg font-black shadow-sm ${
              selectedTopic === topic.id ? "bg-ink text-white" : "bg-white text-ink"
            }`}
            key={topic.id}
            onClick={() => nextExercise(topic.id)}
          >
            <span className="mr-2">{topic.icon}</span>
            {topic.label}
          </button>
        ))}
      </div>

      <div className="rounded-[2rem] bg-white p-6 text-center shadow-soft sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-coral">{topicLabel(exercise.topic)}</p>
        <div className="my-8 rounded-[2rem] bg-rose-50 px-4 py-10 text-7xl font-black text-ink sm:text-8xl">
          {exercise.question}
        </div>
        <input
          aria-label="Respuesta"
          inputMode="numeric"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          className="mx-auto w-full max-w-sm rounded-3xl border-2 border-ink/10 bg-white px-6 py-5 text-center text-4xl font-black outline-none focus:border-coral"
          placeholder="?"
        />
        <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-3">
          <button className="big-button bg-coral text-white sm:col-span-1" onClick={reviewAnswer}>
            Revisar
          </button>
          <button
            className="big-button bg-mint text-ink sm:col-span-1"
            onClick={() => setFeedback(exercise.hint)}
          >
            Necesito una pista
          </button>
          <button className="big-button bg-ink text-white sm:col-span-1" onClick={() => nextExercise()}>
            Siguiente
          </button>
        </div>
        {feedback ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-3xl bg-sunshine/60 p-5 text-xl font-black text-ink">
            {feedback}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TutorScreen() {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-10">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-lilac">Tutor</p>
      <h2 className="mt-2 text-4xl font-black text-ink">Aqui te ayudo paso a paso.</h2>
      <p className="mt-3 max-w-2xl text-xl font-bold text-ink/70">No hago la tarea por ti.</p>
      <div className="mt-8 grid min-h-[20rem] place-items-center rounded-[2rem] border-4 border-dashed border-ink/10 bg-rose-50 p-6 text-center">
        <div className="space-y-4">
          <div className="text-6xl">📷</div>
          <label className="big-button inline-block bg-lilac text-white">
            Subir foto de una tarea
            <input aria-label="Subir foto de una tarea" type="file" accept="image/*" className="sr-only" />
          </label>
        </div>
      </div>
    </section>
  );
}

function ProgressScreen({ attempts, progress }: { attempts: Attempt[]; progress: Progress }) {
  return (
    <section className="space-y-5">
      <Stats progress={progress} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Respuestas correctas" value={progress.correct} />
        <Metric label="Ejercicios realizados" value={progress.total} />
        <Metric label="Temas practicados" value={progress.topics.map(topicLabel).join(", ") || "Aun ninguno"} />
        <Metric label="Ultimo estudio" value={progress.lastStudyDate || "Aun no"} />
      </div>
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-black text-ink">Ultimos ejercicios</h2>
        <div className="mt-4 space-y-3">
          {attempts.slice(0, 8).map((attempt, index) => (
            <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3" key={index}>
              <span className="font-black">{attempt.question}</span>
              <span className={attempt.isCorrect ? "font-black text-mint" : "font-black text-berry"}>
                {attempt.isCorrect ? "Correcta" : "Con pista"}
              </span>
            </div>
          ))}
          {attempts.length === 0 ? <p className="font-bold text-ink/60">Todavia no hay ejercicios.</p> : null}
        </div>
      </div>
    </section>
  );
}

function DadScreen({
  attempts,
  challenges,
  createChallenge,
  errorsByTopic,
  progress
}: {
  attempts: Attempt[];
  challenges: Challenge[];
  createChallenge: (questionCount: 5 | 10, topic: Challenge["topic"]) => void;
  errorsByTopic: { id: Topic; label: string; icon: string; errors: number; total: number }[];
  progress: Progress;
}) {
  const [count, setCount] = useState<5 | 10>(5);
  const [topic, setTopic] = useState<Challenge["topic"]>("mezclado");

  return (
    <section className="space-y-5">
      <Stats progress={progress} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-black text-ink">Errores por tema</h2>
          <div className="mt-4 space-y-3">
            {errorsByTopic.map((topic) => (
              <div className="rounded-2xl bg-rose-50 p-4" key={topic.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-black">{topic.label}</span>
                  <span className="font-black text-berry">{topic.errors} errores</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-coral"
                    style={{ width: `${topic.total ? (topic.errors / topic.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-black text-ink">Crear reto simple</h2>
          <div className="mt-5 grid gap-4">
            <select
              value={count}
              onChange={(event) => setCount(Number(event.target.value) as 5 | 10)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
            >
              <option value={5}>5 preguntas</option>
              <option value={10}>10 preguntas</option>
            </select>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value as Challenge["topic"])}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
            >
              <option value="mezclado">Mezclado</option>
              {topics.map((topic) => (
                <option value={topic.id} key={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
            <button className="big-button bg-ink text-white" onClick={() => createChallenge(count, topic)}>
              Crear reto
            </button>
          </div>
          <div className="mt-6 space-y-3">
            <h3 className="font-black text-ink/70">Retos creados</h3>
            {challenges.slice(0, 5).map((challenge) => (
              <div className="rounded-2xl bg-sunshine/50 p-4 font-black" key={challenge.id}>
                {challenge.questionCount} preguntas de {topicLabel(challenge.topic)}
              </div>
            ))}
            {challenges.length === 0 ? <p className="font-bold text-ink/60">No hay retos todavia.</p> : null}
          </div>
        </div>
      </div>
      <Metric label="Cantidad de ejercicios realizados" value={attempts.length} />
    </section>
  );
}

function Stats({ progress }: { progress: Progress }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Metric label="Estrellas acumuladas" value={`⭐ ${progress.stars}`} />
      <Metric label="Racha de dias" value={`${progress.streak} dias`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-soft">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-ink/50">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
    </div>
  );
}

function BottomNav({
  role,
  screen,
  setScreen
}: {
  role: Role;
  screen: string;
  setScreen: (screen: Screen) => void;
}) {
  const items: { id: Screen; label: string; icon: string }[] = [
    { id: "inicio", label: "Inicio", icon: "⌂" },
    { id: "practicar", label: "Practicar", icon: "+" },
    { id: "tutor", label: "Tutor", icon: "?" },
    { id: "progreso", label: "Progreso", icon: "★" }
  ];

  if (role === "papa") {
    items.push({ id: "papa", label: "Papa", icon: "P" });
  }

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 border-t border-ink/10 bg-white/92 px-3 pt-3 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-2">
        {items.map((item) => (
          <button
            className={`rounded-2xl px-2 py-3 text-sm font-black ${
              screen === item.id ? "bg-ink text-white" : "text-ink/70"
            }`}
            key={item.id}
            onClick={() => setScreen(item.id)}
          >
            <span className="block text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function topicLabel(topic: Topic | "mezclado") {
  if (topic === "mezclado") return "mezclado";
  return topics.find((item) => item.id === topic)?.label.toLowerCase() ?? topic;
}
