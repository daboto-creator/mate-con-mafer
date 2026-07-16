"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { PwaInstaller } from "@/components/PwaInstaller";
import { createEnglishExercise, englishTopics } from "@/lib/english";
import { buildDailyActivity, buildReinforcementCards, nextDifficulty, pickPracticeKind } from "@/lib/learning";
import { createExercise, nextStreak, topics } from "@/lib/math";
import { isSupabaseReady, supabase } from "@/lib/supabase";
import type {
  Attempt,
  Challenge,
  AppLanguage,
  DifficultyOverride,
  EnglishExercise,
  EnglishTopic,
  Exercise,
  LearningAttempt,
  Profile,
  Progress,
  Role,
  Subject,
  Topic,
  TopicProgress
} from "@/lib/types";

type Screen = "inicio" | "practicar" | "ingles" | "tutor" | "progreso" | "papa";
type PracticeMode = "operation" | "word_problem" | "mixed";
type AuthMode = "login" | "signup_parent";
type TutorChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const initialProgress: Progress = {
  stars: 0,
  correct: 0,
  incorrect: 0,
  total: 0,
  streak: 0,
  topics: [],
  lastStudyDate: null
};

const testProfiles: Record<string, { fullName: string; role: Role; grade: string | null }> = {
  "parent@example.com": { fullName: "Papá", role: "parent", grade: null },
  "mafer@example.com": { fullName: "Mafer", role: "child", grade: "4 de primaria" }
};

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("es");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [parentName, setParentName] = useState("Papá");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("inicio");
  const [progressRows, setProgressRows] = useState<TopicProgress[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [learningAttempts, setLearningAttempts] = useState<LearningAttempt[]>([]);
  const [difficultyOverrides, setDifficultyOverrides] = useState<DifficultyOverride[]>([]);
  const [studySessionIds, setStudySessionIds] = useState<Partial<Record<Subject, string>>>({});
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<Topic>("sumas");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("mixed");
  const [exercise, setExercise] = useState<Exercise>(() => createExercise("sumas", "Primaria", "operation", 1));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [exerciseStartedAt, setExerciseStartedAt] = useState(() => Date.now());
  const [hintRequested, setHintRequested] = useState(false);
  const [englishTopic, setEnglishTopic] = useState<EnglishTopic>("gramatica");
  const [englishExercise, setEnglishExercise] = useState<EnglishExercise>(() => createEnglishExercise("gramatica", 1, "es"));
  const [englishAnswer, setEnglishAnswer] = useState("");
  const [englishFeedback, setEnglishFeedback] = useState("");
  const [englishStartedAt, setEnglishStartedAt] = useState(() => Date.now());
  const [englishHintRequested, setEnglishHintRequested] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorChatMessage[]>([]);
  const [tutorError, setTutorError] = useState("");
  const [isTutorThinking, setIsTutorThinking] = useState(false);

  const progress = useMemo(() => summarizeProgress(progressRows, attempts), [attempts, progressRows]);
  const modeLabel = isSupabaseReady ? "Conectado a Supabase" : "Faltan variables de Supabase";

  useEffect(() => {
    const savedPhoto = window.localStorage.getItem("mate-photo");
    if (savedPhoto) setPhoto(savedPhoto);
    void restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile) return;
    void loadRemoteData(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const errorsByTopic = useMemo(() => {
    return topics.map((topic) => ({
      ...topic,
      errors: attempts.filter((attempt) => attempt.topic === topic.id && !attempt.isCorrect).length,
      total: attempts.filter((attempt) => attempt.topic === topic.id).length
    }));
  }, [attempts]);

  async function restoreSession() {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      setIsLoading(false);
      return;
    }

    const nextProfile = await loadOrCreateProfile(data.session.user.id, data.session.user.email ?? "");
    if (nextProfile) {
      enterRole(nextProfile);
    }
    setIsLoading(false);
  }

  async function login() {
    if (!supabase) {
      setAuthError("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setAuthError("");
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error || !data.user) {
      setAuthError("No pude iniciar sesión. Revisa el correo y la contraseña.");
      setIsLoading(false);
      return;
    }

    const nextProfile = await loadOrCreateProfile(data.user.id, data.user.email ?? email);
    if (!nextProfile) {
      await supabase.auth.signOut();
      setAuthError("No hay perfil de prueba para este correo.");
      setIsLoading(false);
      return;
    }

    enterRole(nextProfile);
    setIsLoading(false);
  }

  async function signUpParent() {
    if (!supabase) {
      setAuthError("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    if (!email.trim() || password.length < 6) {
      setAuthError("Escribe un correo y una contraseña de al menos 6 caracteres.");
      return;
    }

    setAuthError("");
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: parentName.trim() || "Papá",
          role: "parent"
        }
      }
    });

    if (error || !data.user) {
      setAuthError("No pude crear la cuenta de papá. Revisa el correo o intenta iniciar sesión.");
      setIsLoading(false);
      return;
    }

    const { data: createdProfile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          full_name: parentName.trim() || "Papá",
          role: "parent",
          grade: null
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (profileError || !createdProfile) {
      setAuthError("Cuenta creada. Si Supabase pide confirmar correo, confirma y luego inicia sesión.");
      setIsLoading(false);
      return;
    }

    enterRole(mapProfile(createdProfile));
    setIsLoading(false);
  }

  function enterRole(nextProfile: Profile) {
    setProfile(nextProfile);
    setScreen(nextProfile.role === "parent" ? "papa" : "inicio");
  }

  async function loadOrCreateProfile(userId: string, userEmail: string) {
    if (!supabase) return null;

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      return mapProfile(existingProfile);
    }

    const testProfile = testProfiles[userEmail.trim().toLowerCase()];
    if (!testProfile) {
      return null;
    }

    const { data: createdProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name: testProfile.fullName,
        role: testProfile.role,
        grade: testProfile.grade
      })
      .select("*")
      .single();

    if (error || !createdProfile) {
      setAuthError("No pude crear el perfil de prueba en Supabase.");
      return null;
    }

    return mapProfile(createdProfile);
  }

  async function loadRemoteData(currentProfile = profile) {
    if (!supabase || !currentProfile) return;

    if (currentProfile.role === "child") {
      const [{ data: attemptRows }, { data: progressData }, { data: assignmentRows }, { data: learningRows }, { data: overrideRows }] = await Promise.all([
        supabase
          .from("math_attempts")
          .select("*")
          .eq("user_id", currentProfile.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("math_progress").select("*").eq("user_id", currentProfile.id),
        supabase
          .from("assignments")
          .select("*")
          .eq("child_id", currentProfile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("learning_attempts")
          .select("*")
          .eq("user_id", currentProfile.id)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("difficulty_overrides")
          .select("*")
          .eq("user_id", currentProfile.id)
          .order("created_at", { ascending: false })
      ]);

      setAttempts((attemptRows ?? []).map(mapAttempt));
      setProgressRows((progressData ?? []).map(mapTopicProgress));
      setChallenges((assignmentRows ?? []).map(mapChallenge));
      setLearningAttempts((learningRows ?? []).map(mapLearningAttempt));
      setDifficultyOverrides((overrideRows ?? []).map(mapDifficultyOverride));
      setSelectedChildId(currentProfile.id);
      return;
    }

    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select("*")
      .eq("parent_id", currentProfile.id)
      .order("created_at", { ascending: false });

    const assignments = (assignmentRows ?? []).map(mapChallenge);
    const childIds = Array.from(new Set(assignments.map((assignment) => assignment.childId)));
    const activeChildId = selectedChildId || childIds[0] || "";
    setChallenges(assignments);
    setSelectedChildId(activeChildId);

    if (!activeChildId) {
      setAttempts([]);
      setProgressRows([]);
      setLearningAttempts([]);
      setDifficultyOverrides([]);
      return;
    }

    const [{ data: attemptRows }, { data: progressData }, { data: learningRows }, { data: overrideRows }] = await Promise.all([
      supabase
        .from("math_attempts")
        .select("*")
        .eq("user_id", activeChildId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("math_progress").select("*").eq("user_id", activeChildId),
      supabase
        .from("learning_attempts")
        .select("*")
        .eq("user_id", activeChildId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("difficulty_overrides")
        .select("*")
        .eq("user_id", activeChildId)
        .order("created_at", { ascending: false })
    ]);

    setAttempts((attemptRows ?? []).map(mapAttempt));
    setProgressRows((progressData ?? []).map(mapTopicProgress));
    setLearningAttempts((learningRows ?? []).map(mapLearningAttempt));
    setDifficultyOverrides((overrideRows ?? []).map(mapDifficultyOverride));
  }

  async function saveAttempt(attempt: Attempt) {
    if (!supabase || !profile || profile.role !== "child") return;

    const nextAttempts = [attempt, ...attempts];
    setAttempts(nextAttempts);

    await supabase.from("math_attempts").insert({
      user_id: profile.id,
      topic: attempt.topic,
      question: attempt.question,
      answer_given: String(attempt.answer),
      correct_answer: String(attempt.correctAnswer),
      is_correct: attempt.isCorrect,
      created_at: attempt.createdAt
    });
  }

  async function updateTopicProgress(topic: Topic, isCorrect: boolean) {
    if (!supabase || !profile || profile.role !== "child") return;

    const existing = progressRows.find((row) => row.topic === topic);
    const lastStudyDate = existing?.lastPracticedAt?.slice(0, 10) ?? null;
    const streakDays = nextStreak(lastStudyDate, existing?.streakDays ?? 0);
    const nextRow: TopicProgress = {
      id: existing?.id ?? crypto.randomUUID(),
      userId: profile.id,
      topic,
      correctAnswers: (existing?.correctAnswers ?? 0) + (isCorrect ? 1 : 0),
      incorrectAnswers: (existing?.incorrectAnswers ?? 0) + (isCorrect ? 0 : 1),
      stars: (existing?.stars ?? 0) + (isCorrect ? 1 : 0),
      streakDays,
      lastPracticedAt: new Date().toISOString()
    };

    setProgressRows((rows) => [nextRow, ...rows.filter((row) => row.topic !== topic)]);

    await supabase.from("math_progress").upsert(
      {
        user_id: profile.id,
        topic,
        correct_answers: nextRow.correctAnswers,
        incorrect_answers: nextRow.incorrectAnswers,
        stars: nextRow.stars,
        streak_days: nextRow.streakDays,
        last_practiced_at: nextRow.lastPracticedAt
      },
      { onConflict: "user_id,topic" }
    );
  }

  function recentLevel(subject: Subject, topic: string) {
    const override = difficultyOverrides.find(
      (item) =>
        item.subject === subject &&
        item.topic === topic &&
        (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now())
    );

    if (override) return override.difficultyLevel;

    const latest = learningAttempts.find((attempt) => attempt.subject === subject && attempt.topic === topic);
    return latest?.difficultyLevel ?? 1;
  }

  function recentQuestions(subject: Subject, topic: string) {
    return learningAttempts
      .filter((attempt) => attempt.subject === subject && attempt.topic === topic)
      .slice(0, 12)
      .map((attempt) => attempt.question);
  }

  async function saveLearningAttempt(attempt: Omit<LearningAttempt, "id" | "userId" | "createdAt">) {
    if (!supabase || !profile || profile.role !== "child") return;

    const createdAt = new Date().toISOString();
    const sessionId = attempt.sessionId ?? (await ensureStudySession(attempt.subject));
    const nextAttempt: LearningAttempt = {
      ...attempt,
      sessionId,
      userId: profile.id,
      createdAt
    };

    setLearningAttempts((items) => [nextAttempt, ...items]);

    await supabase.from("learning_attempts").insert({
      user_id: profile.id,
      session_id: sessionId,
      subject: attempt.subject,
      topic: attempt.topic,
      subtopic: attempt.subtopic,
      activity_type: attempt.activityType,
      operation_type: attempt.operationType,
      difficulty_level: attempt.difficultyLevel,
      question: attempt.question,
      answer_given: attempt.answerGiven,
      correct_answer: attempt.correctAnswer,
      is_correct: attempt.isCorrect,
      attempts_count: attempt.attemptsCount,
      hint_requested: attempt.hintRequested,
      response_time_seconds: attempt.responseTimeSeconds,
      created_at: createdAt
    });

    await supabase.from("learning_events").insert({
      user_id: profile.id,
      subject: attempt.subject,
      event_type: "attempt_completed",
      topic: attempt.topic,
      subtopic: attempt.subtopic,
      metadata: {
        is_correct: attempt.isCorrect,
        difficulty_level: attempt.difficultyLevel,
        response_time_seconds: attempt.responseTimeSeconds,
        hint_requested: attempt.hintRequested
      },
      created_at: createdAt
    });

    const adaptive = nextDifficulty(
      [nextAttempt, ...learningAttempts],
      attempt.subject,
      attempt.topic,
      attempt.subtopic,
      attempt.difficultyLevel
    );

    await supabase.from("learning_progress").upsert(
      {
        user_id: profile.id,
        subject: attempt.subject,
        topic: attempt.topic,
        subtopic: attempt.subtopic,
        difficulty_level: adaptive.difficultyLevel,
        status: adaptive.status === "review" ? "review" : adaptive.status === "mastered" ? "mastered" : "in_progress",
        correct_answers: attempt.isCorrect ? 1 : 0,
        incorrect_answers: attempt.isCorrect ? 0 : 1,
        hints_requested: attempt.hintRequested ? 1 : 0,
        average_response_seconds: attempt.responseTimeSeconds,
        last_practiced_at: createdAt,
        updated_at: createdAt
      },
      { onConflict: "user_id,subject,topic,subtopic" }
    );
  }

  async function ensureStudySession(subject: Subject) {
    if (!supabase || !profile || profile.role !== "child") return null;
    if (studySessionIds[subject]) return studySessionIds[subject] ?? null;

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: profile.id,
        subject
      })
      .select("id")
      .single();

    if (error || !data?.id) return null;

    setStudySessionIds((sessions) => ({ ...sessions, [subject]: data.id }));
    return data.id as string;
  }

  async function reviewAnswer() {
    if (!profile || profile.role !== "child") {
      setFeedback("Inicia sesión como Mafer para practicar.");
      return;
    }

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

    await saveAttempt(attempt);
    await updateTopicProgress(exercise.topic, isCorrect);
    await saveLearningAttempt({
      sessionId: null,
      subject: "math",
      topic: exercise.topic,
      subtopic: exercise.subtopic,
      activityType: exercise.kind,
      operationType: exercise.operationType,
      difficultyLevel: exercise.difficultyLevel,
      question: exercise.question,
      answerGiven: String(numericAnswer),
      correctAnswer: String(exercise.answer),
      isCorrect,
      attemptsCount: 1,
      hintRequested,
      responseTimeSeconds: Math.max(1, Math.round((Date.now() - exerciseStartedAt) / 1000))
    });

    setFeedback(
      isCorrect
        ? "¡Excelente, Mafer! Ganaste una estrella."
        : `Casi. Pista amable: ${exercise.hint}`
    );
  }

  function nextExercise(topic = selectedTopic, mode = practiceMode) {
    setSelectedTopic(topic);
    setPracticeMode(mode);
    const mix = pickPracticeKind();
    const baseLevel = recentLevel("math", topic);
    const difficultyLevel =
      mode === "mixed" && mix === "challenge" ? Math.min(baseLevel + 1, 5) : mode === "mixed" && mix === "review" ? Math.max(baseLevel - 1, 1) : baseLevel;
    const exerciseKind = mode === "mixed" ? (Math.random() > 0.5 ? "operation" : "word_problem") : mode;
    setExercise(createExercise(topic, profile?.grade, exerciseKind, difficultyLevel, recentQuestions("math", topic)));
    setAnswer("");
    setFeedback("");
    setHintRequested(false);
    setExerciseStartedAt(Date.now());
  }

  function nextEnglishExercise(topic = englishTopic) {
    const baseLevel = recentLevel("english", topic);
    const mix = pickPracticeKind();
    const difficultyLevel = mix === "challenge" ? Math.min(baseLevel + 1, 5) : mix === "review" ? Math.max(baseLevel - 1, 1) : baseLevel;
    setEnglishTopic(topic);
    setEnglishExercise(createEnglishExercise(topic, difficultyLevel, language, recentQuestions("english", topic)));
    setEnglishAnswer("");
    setEnglishFeedback("");
    setEnglishHintRequested(false);
    setEnglishStartedAt(Date.now());
  }

  async function reviewEnglishAnswer(answerValue = englishAnswer) {
    if (!profile || profile.role !== "child") {
      setEnglishFeedback("Inicia sesión como Mafer para practicar inglés.");
      return;
    }

    const normalizedAnswer = answerValue.trim().toLowerCase();
    if (!normalizedAnswer) {
      setEnglishFeedback("Elige o escribe una respuesta primero.");
      return;
    }

    const isCorrect = normalizedAnswer === englishExercise.answer.trim().toLowerCase();
    await saveLearningAttempt({
      sessionId: null,
      subject: "english",
      topic: englishExercise.topic,
      subtopic: englishExercise.subtopic,
      activityType: englishExercise.activityType,
      operationType: null,
      difficultyLevel: englishExercise.difficultyLevel,
      question: englishExercise.question,
      answerGiven: answerValue,
      correctAnswer: englishExercise.answer,
      isCorrect,
      attemptsCount: 1,
      hintRequested: englishHintRequested,
      responseTimeSeconds: Math.max(1, Math.round((Date.now() - englishStartedAt) / 1000))
    });

    setEnglishFeedback(
      isCorrect
        ? `¡Muy bien! ${englishExercise.explanation}`
        : `Buen intento. Pista: ${englishExercise.hint}`
    );
  }

  async function createChallenge(questionCount: 5 | 10, topic: Challenge["topic"], childId: string) {
    if (!supabase || !profile || profile.role !== "parent") return;

    if (!childId) {
      setFeedback("Primero necesitas el id de Mafer o una asignación existente.");
      return;
    }

    const { data, error } = await supabase
      .from("assignments")
      .insert({
        parent_id: profile.id,
        child_id: childId,
        topic,
        number_of_questions: questionCount,
        difficulty: "normal",
        status: "pending"
      })
      .select("*")
      .single();

    if (error || !data) {
      setFeedback(
        "No pude crear el reto. Primero confirma que Mafer ya exista en Supabase Auth, que haya iniciado sesión al menos una vez o que su perfil tenga rol child, y que pegaste su id correcto."
      );
      return;
    }

    const nextChallenge = mapChallenge(data);
    setChallenges((items) => [nextChallenge, ...items]);
    setSelectedChildId(childId);
    setFeedback("Reto creado para Mafer.");
  }

  async function createPersonalizedChallenge({
    challengeSubject,
    childId,
    difficultyLevel,
    estimatedMinutes,
    isRequired,
    questionCount,
    suggestedDate,
    subtopic,
    topic
  }: {
    challengeSubject: Subject;
    childId: string;
    difficultyLevel: number;
    estimatedMinutes: number;
    isRequired: boolean;
    questionCount: number;
    suggestedDate: string;
    subtopic: string;
    topic: string;
  }) {
    if (!supabase || !profile || profile.role !== "parent") return;

    if (!childId) {
      setFeedback("Primero elige o pega el id de Mafer.");
      return;
    }

    const { error } = await supabase.from("personalized_challenges").insert({
      parent_id: profile.id,
      child_id: childId,
      subject: challengeSubject,
      topic,
      subtopic,
      number_of_questions: questionCount,
      difficulty_level: difficultyLevel,
      suggested_date: suggestedDate || null,
      estimated_minutes: estimatedMinutes,
      challenge_type: isRequired ? "required" : "recommended",
      status: "pending"
    });

    if (error) {
      setFeedback("No pude crear el reto personalizado. Revisa la migración y el enlace con Mafer.");
      return;
    }

    setFeedback("Reto personalizado creado para Mafer.");
  }

  async function createDifficultyOverride({
    childId,
    difficultyLevel,
    overrideSubject,
    topic
  }: {
    childId: string;
    difficultyLevel: number;
    overrideSubject: Subject;
    topic: string;
  }) {
    if (!supabase || !profile || profile.role !== "parent") return;

    if (!childId) {
      setFeedback("Primero elige o pega el id de Mafer.");
      return;
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("difficulty_overrides").insert({
      parent_id: profile.id,
      user_id: childId,
      subject: overrideSubject,
      topic,
      difficulty_level: difficultyLevel,
      expires_at: expiresAt
    });

    if (error) {
      setFeedback("No pude ajustar la dificultad. Revisa la migración adaptativa.");
      return;
    }

    setFeedback("Dificultad ajustada por 7 días.");
    await loadRemoteData(profile);
  }

  async function createChildAccount({
    childEmail,
    childGrade,
    childName,
    childPassword
  }: {
    childEmail: string;
    childGrade: string;
    childName: string;
    childPassword: string;
  }) {
    if (!supabase || !profile || profile.role !== "parent") return;

    setFeedback("");
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setFeedback("Tu sesión de papá expiró. Vuelve a iniciar sesión.");
      return;
    }

    const response = await fetch("/api/family/create-child", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: childEmail,
        password: childPassword,
        fullName: childName,
        grade: childGrade
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setFeedback(data?.error || "No pude dar de alta a tu hija.");
      return;
    }

    setSelectedChildId(data.childId);
    setFeedback("Cuenta de tu hija creada y enlazada con papá.");
    await loadRemoteData(profile);
  }

  async function saveTutorMessages(messagesToSave: TutorChatMessage[], topic: string) {
    if (!supabase || !profile) return;

    await supabase.from("tutor_messages").insert(
      messagesToSave.map((message) => ({
        user_id: profile.id,
        role: message.role,
        content: message.content.slice(0, 1200),
        topic
      }))
    );
  }

  async function sendTutorMessage(quickMessage?: string, imageDataUrl?: string) {
    const trimmedInput = (quickMessage ?? tutorInput).trim();
    if (!trimmedInput || isTutorThinking) return;

    const nextMessages: TutorChatMessage[] = [...tutorMessages, { role: "user", content: trimmedInput }];
    const topic = detectTutorTopic(trimmedInput);
    setTutorMessages(nextMessages);
    setTutorInput("");
    setTutorError("");
    setIsTutorThinking(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, imageDataUrl })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "El tutor no pudo responder ahora.");
      }

      const assistantMessage: TutorChatMessage = { role: "assistant", content: data.reply };
      setTutorMessages([...nextMessages, assistantMessage]);
      await saveTutorMessages(
        [
          { role: "user", content: trimmedInput },
          assistantMessage
        ],
        topic
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "El tutor no pudo responder ahora.";
      setTutorError(message);
    } finally {
      setIsTutorThinking(false);
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

  async function leaveApp() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setEmail("");
    setPassword("");
    setScreen("inicio");
    setAttempts([]);
    setProgressRows([]);
    setChallenges([]);
    setSelectedChildId("");
  }

  if (!profile) {
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
                Practica matemáticas con estrellas, retos simples y ayuda paso a paso.
              </p>
            </div>
            <div className="overflow-hidden rounded-[2rem] shadow-soft">
              <Image
                src="/images/mate-con-mafer-hero.png"
                alt="Ilustración infantil de Mate con Mafer"
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
                <h2 className="text-3xl font-black text-ink">
                  {authMode === "login" ? "Entrar" : "Crear cuenta de papá"}
                </h2>
              </div>
            </div>
            <div className="grid gap-4">
              <label className="block text-sm font-bold text-ink/70" htmlFor="language">
                Idioma de práctica
              </label>
              <select
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as AppLanguage)}
                className="w-full rounded-2xl border-2 border-ink/10 bg-rose-50 px-5 py-4 text-xl font-bold outline-none focus:border-coral"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              {authMode === "signup_parent" ? (
                <>
                  <label className="block text-sm font-bold text-ink/70" htmlFor="parentName">
                    Nombre
                  </label>
                  <input
                    id="parentName"
                    value={parentName}
                    onChange={(event) => setParentName(event.target.value)}
                    className="w-full rounded-2xl border-2 border-ink/10 bg-rose-50 px-5 py-4 text-xl font-bold outline-none focus:border-coral"
                    placeholder="Papá"
                    type="text"
                  />
                </>
              ) : null}
              <label className="block text-sm font-bold text-ink/70" htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border-2 border-ink/10 bg-rose-50 px-5 py-4 text-xl font-bold outline-none focus:border-coral"
                placeholder="mafer@example.com"
                type="email"
              />
              <label className="block text-sm font-bold text-ink/70" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border-2 border-ink/10 bg-rose-50 px-5 py-4 text-xl font-bold outline-none focus:border-coral"
                placeholder="Contraseña de prueba"
                type="password"
              />
            </div>
            {authError ? <p className="mt-3 font-bold text-berry">{authError}</p> : null}
            <button
              className="big-button mt-6 w-full bg-coral text-white disabled:opacity-60"
              disabled={isLoading}
              onClick={authMode === "login" ? login : signUpParent}
            >
              {isLoading ? "Un momento..." : authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
            <button
              className="mt-3 w-full rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white"
              onClick={() => {
                setAuthError("");
                setAuthMode(authMode === "login" ? "signup_parent" : "login");
              }}
            >
              {authMode === "login" ? "Crear mi cuenta de papá" : "Ya tengo cuenta"}
            </button>
            <div className="mt-5 rounded-3xl bg-rose-50 p-4 text-sm font-bold leading-6 text-ink/65">
              Primero crea o entra como papá. Después podrás dar de alta a tu hija desde el panel.
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
                {profile.role === "parent" ? "Panel de papá" : "Hola Mafer"}
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
            practiceMode={practiceMode}
            selectedTopic={selectedTopic}
            setAnswer={setAnswer}
            nextExercise={nextExercise}
            reviewAnswer={reviewAnswer}
            setFeedback={setFeedback}
            setHintRequested={setHintRequested}
          />
        ) : null}
        {screen === "ingles" ? (
          <EnglishScreen
            answer={englishAnswer}
            exercise={englishExercise}
            feedback={englishFeedback}
            nextExercise={nextEnglishExercise}
            reviewAnswer={reviewEnglishAnswer}
            selectedTopic={englishTopic}
            setAnswer={setEnglishAnswer}
            setFeedback={setEnglishFeedback}
            setHintRequested={setEnglishHintRequested}
          />
        ) : null}
        {screen === "tutor" ? (
          <TutorScreen
            input={tutorInput}
            isThinking={isTutorThinking}
            messages={tutorMessages}
            sendMessage={sendTutorMessage}
            setInput={setTutorInput}
            tutorError={tutorError}
          />
        ) : null}
        {screen === "progreso" ? <ProgressScreen progress={progress} attempts={attempts} profile={profile} /> : null}
        {screen === "papa" ? (
          <DadScreen
            attempts={attempts}
            challenges={challenges}
            createChildAccount={createChildAccount}
            createChallenge={createChallenge}
            createDifficultyOverride={createDifficultyOverride}
            createPersonalizedChallenge={createPersonalizedChallenge}
            errorsByTopic={errorsByTopic}
            feedback={feedback}
            learningAttempts={learningAttempts}
            progress={progress}
            selectedChildId={selectedChildId}
            setSelectedChildId={setSelectedChildId}
          />
        ) : null}
      </div>

      <BottomNav role={profile.role} screen={screen} setScreen={setScreen} />
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
  setScreen: (screen: "practicar" | "ingles" | "tutor" | "progreso") => void;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[2rem] bg-white p-5 shadow-soft">
        <Image
          src="/images/mate-con-mafer-hero.png"
          alt="Animales estudiando matemáticas"
          width={1200}
          height={675}
          className="rounded-[1.5rem]"
        />
      </div>
      <div className="space-y-5">
        <Stats progress={progress} />
        {challenges[0] ? (
          <div className="rounded-[2rem] bg-sunshine p-5 shadow-soft">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-ink/60">Reto de papá</p>
            <h2 className="text-2xl font-black text-ink">
              {challenges[0].questionCount} preguntas de {topicLabel(challenges[0].topic)}
            </h2>
          </div>
        ) : null}
        <div className="grid gap-4">
          <button className="big-button bg-coral text-white" onClick={() => setScreen("practicar")}>
            Practicar
          </button>
          <button className="big-button bg-sunshine text-ink" onClick={() => setScreen("ingles")}>
            Inglés con Mafer
          </button>
          <button className="big-button bg-lilac text-white" onClick={() => setScreen("tutor")}>
            Tutor de matemáticas
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
  practiceMode,
  reviewAnswer,
  selectedTopic,
  setAnswer,
  setFeedback,
  setHintRequested
}: {
  answer: string;
  exercise: Exercise;
  feedback: string;
  nextExercise: (topic?: Topic, mode?: PracticeMode) => void;
  practiceMode: PracticeMode;
  reviewAnswer: () => void;
  selectedTopic: Topic;
  setAnswer: (answer: string) => void;
  setFeedback: (feedback: string) => void;
  setHintRequested: (value: boolean) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {topics.map((topic) => (
          <button
            className={`rounded-3xl px-4 py-4 text-lg font-black shadow-sm ${
              selectedTopic === topic.id ? "bg-ink text-white" : "bg-white text-ink"
            }`}
            key={topic.id}
            onClick={() => nextExercise(topic.id, practiceMode)}
          >
            <span className="mr-2">{topic.icon}</span>
            {topic.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          className={`rounded-3xl px-5 py-4 text-lg font-black shadow-sm ${
            practiceMode === "operation" ? "bg-coral text-white" : "bg-white text-ink"
          }`}
          onClick={() => nextExercise(selectedTopic, "operation")}
        >
          Ejercicios directos
        </button>
        <button
          className={`rounded-3xl px-5 py-4 text-lg font-black shadow-sm ${
            practiceMode === "word_problem" ? "bg-lilac text-white" : "bg-white text-ink"
          }`}
          onClick={() => nextExercise(selectedTopic, "word_problem")}
        >
          Problemas con historia
        </button>
        <button
          className={`rounded-3xl px-5 py-4 text-lg font-black shadow-sm ${
            practiceMode === "mixed" ? "bg-ink text-white" : "bg-white text-ink"
          }`}
          onClick={() => nextExercise(selectedTopic, "mixed")}
        >
          Mixto
        </button>
      </div>

      <div className="rounded-[2rem] bg-white p-6 text-center shadow-soft sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-coral">
          {exercise.kind === "word_problem" ? "Problema" : "Operación"} de {topicLabel(exercise.topic)}
        </p>
        <div
          className={`my-8 rounded-[2rem] bg-rose-50 px-4 py-10 font-black text-ink ${
            exercise.kind === "word_problem" ? "text-3xl leading-tight sm:text-5xl" : "text-7xl sm:text-8xl"
          }`}
        >
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
        {exercise.topic === "fracciones" ? (
          <p className="mx-auto mt-3 max-w-lg text-sm font-bold text-ink/55">
            En fracciones con el mismo denominador, escribe solo el número de arriba.
          </p>
        ) : null}
        <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-3">
          <button className="big-button bg-coral text-white sm:col-span-1" onClick={reviewAnswer}>
            Revisar
          </button>
          <button
            className="big-button bg-mint text-ink sm:col-span-1"
            onClick={() => {
              setHintRequested(true);
              setFeedback(exercise.hint);
            }}
          >
            Necesito una pista
          </button>
          <button className="big-button bg-ink text-white sm:col-span-1" onClick={() => nextExercise(selectedTopic, practiceMode)}>
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

function EnglishScreen({
  answer,
  exercise,
  feedback,
  nextExercise,
  reviewAnswer,
  selectedTopic,
  setAnswer,
  setFeedback,
  setHintRequested
}: {
  answer: string;
  exercise: EnglishExercise;
  feedback: string;
  nextExercise: (topic?: EnglishTopic) => void;
  reviewAnswer: (answer?: string) => void;
  selectedTopic: EnglishTopic;
  setAnswer: (answer: string) => void;
  setFeedback: (feedback: string) => void;
  setHintRequested: (value: boolean) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {englishTopics.map((topic) => (
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
        <p className="text-sm font-black uppercase tracking-[0.16em] text-lilac">
          Inglés · {exercise.subtopic}
        </p>
        <div className="my-8 rounded-[2rem] bg-rose-50 px-4 py-10 text-3xl font-black leading-tight text-ink sm:text-5xl">
          {exercise.question}
        </div>

        {exercise.options ? (
          <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-3">
            {exercise.options.map((option) => (
              <button
                className={`rounded-3xl px-4 py-5 text-xl font-black shadow-sm ${
                  answer === option ? "bg-lilac text-white" : "bg-white text-ink"
                }`}
                key={option}
                onClick={() => setAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            aria-label="Respuesta de inglés"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className="mx-auto w-full max-w-lg rounded-3xl border-2 border-ink/10 bg-white px-6 py-5 text-center text-2xl font-black outline-none focus:border-lilac"
            placeholder="Escribe tu respuesta"
          />
        )}

        <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-3">
          <button className="big-button bg-lilac text-white sm:col-span-1" onClick={() => reviewAnswer()}>
            Revisar
          </button>
          <button
            className="big-button bg-mint text-ink sm:col-span-1"
            onClick={() => {
              setHintRequested(true);
              setFeedback(exercise.hint);
            }}
          >
            Necesito una pista
          </button>
          <button className="big-button bg-ink text-white sm:col-span-1" onClick={() => nextExercise(selectedTopic)}>
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

function TutorScreen({
  input,
  isThinking,
  messages,
  sendMessage,
  setInput,
  tutorError
}: {
  input: string;
  isThinking: boolean;
  messages: TutorChatMessage[];
  sendMessage: (quickMessage?: string, imageDataUrl?: string) => void;
  setInput: (input: string) => void;
  tutorError: string;
}) {
  const quickActions = [
    "Necesito una pista",
    "Explícame diferente",
    "Dame otro ejemplo",
    "Hagamos un reto",
    "Rutina de una hora"
  ];

  function handleHomeworkPhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage(
        "Subí una foto de mi tarea. Explícame solo el primer paso para empezar.",
        String(reader.result)
      );
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-soft sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-lilac">Tutor</p>
      <h2 className="mt-2 text-4xl font-black text-ink">Aquí te ayudo paso a paso.</h2>
      <p className="mt-3 max-w-2xl text-xl font-bold text-ink/70">No hago la tarea por ti.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-h-[26rem] flex-col rounded-[2rem] bg-rose-50 p-4">
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <button
                className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-ink shadow-sm disabled:opacity-60"
                disabled={isThinking}
                key={action}
                onClick={() => sendMessage(action)}
              >
                {action}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center px-4 text-center">
                <p className="max-w-md text-2xl font-black text-ink/55">
                  Escribe una duda de matemáticas y la revisamos juntas.
                </p>
              </div>
            ) : null}
            {messages.map((message, index) => (
              <div
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                key={`${message.role}-${index}`}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-4 text-lg font-bold leading-7 ${
                    message.role === "user" ? "bg-lilac text-white" : "bg-white text-ink shadow-sm"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {isThinking ? (
              <div className="flex justify-start">
                <p className="rounded-3xl bg-white px-5 py-4 text-lg font-black text-ink/60 shadow-sm">
                  Pensando paso a paso...
                </p>
              </div>
            ) : null}
          </div>

          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              aria-label="Mensaje para el tutor"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-16 rounded-3xl border-2 border-ink/10 bg-white px-5 py-4 text-lg font-bold outline-none focus:border-lilac"
              placeholder="Escribe tu duda..."
            />
            <button className="big-button bg-lilac text-white disabled:opacity-60" disabled={isThinking || !input.trim()}>
              Enviar
            </button>
          </form>
          {tutorError ? <p className="mt-3 rounded-2xl bg-sunshine/70 p-4 font-black text-ink">{tutorError}</p> : null}
        </div>

        <div className="grid gap-4">
          <div className="grid min-h-56 place-items-center rounded-[2rem] border-4 border-dashed border-ink/10 bg-white p-5 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📷</div>
              <h3 className="text-xl font-black text-ink">Foto de tarea</h3>
              <label className="big-button inline-block bg-ink text-white">
                Subir foto
                <input
                  aria-label="Subir foto de una tarea"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handleHomeworkPhoto(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[2rem] bg-sunshine p-5 text-center shadow-sm">
            <div className="space-y-4">
              <div className="text-5xl">✏️</div>
              <h3 className="text-xl font-black text-ink">Resolver problemas</h3>
              <button
                className="big-button bg-lilac text-white"
                disabled={isThinking}
                onClick={() =>
                  sendMessage(
                    "Quiero resolver problemas de matemáticas. Dame un problema para 4º de primaria, mezclando operaciones y problemas con historia. No me des la respuesta hasta que yo intente."
                  )
                }
              >
                Empezar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressScreen({
  attempts,
  profile,
  progress
}: {
  attempts: Attempt[];
  profile: Profile;
  progress: Progress;
}) {
  return (
    <section className="space-y-5">
      <Stats progress={progress} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Respuestas correctas" value={progress.correct} />
        <Metric label="Errores" value={progress.incorrect} />
        <Metric label="Ejercicios realizados" value={progress.total} />
        <Metric label="Temas practicados" value={progress.topics.map(topicLabel).join(", ") || "Aún ninguno"} />
        {profile.role === "child" ? <Metric label="Id de Mafer" value={profile.id} /> : null}
      </div>
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-black text-ink">Últimos ejercicios</h2>
        <div className="mt-4 space-y-3">
          {attempts.slice(0, 8).map((attempt, index) => (
            <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3" key={index}>
              <span className="font-black">{attempt.question}</span>
              <span className={attempt.isCorrect ? "font-black text-mint" : "font-black text-berry"}>
                {attempt.isCorrect ? "Correcta" : "Con pista"}
              </span>
            </div>
          ))}
          {attempts.length === 0 ? <p className="font-bold text-ink/60">Todavía no hay ejercicios.</p> : null}
        </div>
      </div>
    </section>
  );
}

function DadScreen({
  attempts,
  challenges,
  createChildAccount,
  createChallenge,
  createDifficultyOverride,
  createPersonalizedChallenge,
  errorsByTopic,
  feedback,
  learningAttempts,
  progress,
  selectedChildId,
  setSelectedChildId
}: {
  attempts: Attempt[];
  challenges: Challenge[];
  createChildAccount: (child: {
    childEmail: string;
    childGrade: string;
    childName: string;
    childPassword: string;
  }) => void;
  createChallenge: (questionCount: 5 | 10, topic: Challenge["topic"], childId: string) => void;
  createDifficultyOverride: (override: {
    childId: string;
    difficultyLevel: number;
    overrideSubject: Subject;
    topic: string;
  }) => void;
  createPersonalizedChallenge: (challenge: {
    challengeSubject: Subject;
    childId: string;
    difficultyLevel: number;
    estimatedMinutes: number;
    isRequired: boolean;
    questionCount: number;
    suggestedDate: string;
    subtopic: string;
    topic: string;
  }) => void;
  errorsByTopic: { id: Topic; label: string; icon: string; errors: number; total: number }[];
  feedback: string;
  learningAttempts: LearningAttempt[];
  progress: Progress;
  selectedChildId: string;
  setSelectedChildId: (childId: string) => void;
}) {
  const [count, setCount] = useState<5 | 10>(5);
  const [topic, setTopic] = useState<string>("mezclado");
  const [challengeSubject, setChallengeSubject] = useState<Subject>("math");
  const [challengeSubtopic, setChallengeSubtopic] = useState("Puntos a reforzar");
  const [challengeDifficulty, setChallengeDifficulty] = useState(1);
  const [challengeDate, setChallengeDate] = useState("");
  const [challengeMinutes, setChallengeMinutes] = useState(10);
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [overrideSubject, setOverrideSubject] = useState<Subject>("math");
  const [overrideTopic, setOverrideTopic] = useState("multiplicaciones");
  const [overrideLevel, setOverrideLevel] = useState(1);
  const [childName, setChildName] = useState("Mafer");
  const [childEmail, setChildEmail] = useState("mafer@example.com");
  const [childPassword, setChildPassword] = useState("");
  const [childGrade, setChildGrade] = useState("4 de primaria");
  const [dadTab, setDadTab] = useState<"general" | "math" | "english">("general");
  const childIds = Array.from(new Set(challenges.map((challenge) => challenge.childId)));
  const scopedSubject = dadTab === "general" ? undefined : dadTab;
  const reinforcementCards = buildReinforcementCards(learningAttempts, scopedSubject);
  const dailyActivity = buildDailyActivity(learningAttempts, scopedSubject);
  const totalLearning = learningAttempts.length;
  const correctLearning = learningAttempts.filter((attempt) => attempt.isCorrect).length;
  const totalSeconds = learningAttempts.reduce((total, attempt) => total + attempt.responseTimeSeconds, 0);

  return (
    <section className="space-y-5">
      <Stats progress={progress} />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { id: "general", label: "Resumen general" },
          { id: "math", label: "Matemáticas" },
          { id: "english", label: "Inglés" }
        ].map((item) => (
          <button
            className={`rounded-3xl px-4 py-4 text-lg font-black shadow-sm ${
              dadTab === item.id ? "bg-ink text-white" : "bg-white text-ink"
            }`}
            key={item.id}
            onClick={() => setDadTab(item.id as "general" | "math" | "english")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Tiempo total de estudio" value={`${Math.round(totalSeconds / 60)} min`} />
        <Metric label="Ejercicios totales" value={totalLearning || attempts.length} />
        <Metric
          label="Promedio de aciertos"
          value={`${totalLearning ? Math.round((correctLearning / totalLearning) * 100) : 0}%`}
        />
        <Metric label="Racha de estudio" value={`${progress.streak} días`} />
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-black text-ink">Puntos a reforzar</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {reinforcementCards.map((card) => (
            <ReinforcementCardView card={card} key={`${card.subject}-${card.topic}-${card.subtopic}`} />
          ))}
          {reinforcementCards.length === 0 ? (
            <p className="font-bold text-ink/60">Cuando Mafer practique, aquí aparecerán recomendaciones.</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-black text-ink">Actividad diaria</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-7">
          {dailyActivity.map((day) => (
            <div className="rounded-2xl bg-rose-50 p-4" key={day.day}>
              <p className="text-sm font-black text-ink/50">{day.day.slice(5)}</p>
              <p className="mt-2 text-2xl font-black text-ink">{Math.round(day.totalSeconds / 60)} min</p>
              <p className="text-sm font-bold text-ink/60">{day.exercises} ejercicios</p>
              <div className="mt-3 h-20 rounded-xl bg-white p-2">
                <div
                  className="mt-auto rounded-lg bg-lilac"
                  style={{ height: `${Math.min(day.exercises * 8, 64)}px` }}
                />
              </div>
            </div>
          ))}
          {dailyActivity.length === 0 ? (
            <p className="font-bold text-ink/60">Todavía no hay actividad adaptativa registrada.</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-black text-ink">Dar de alta a mi hija</h2>
          <div className="mt-5 grid gap-4">
            <input
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              placeholder="Nombre"
            />
            <input
              value={childEmail}
              onChange={(event) => setChildEmail(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              placeholder="Correo de tu hija"
              type="email"
            />
            <input
              value={childPassword}
              onChange={(event) => setChildPassword(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              placeholder="Contraseña temporal"
              type="password"
            />
            <input
              value={childGrade}
              onChange={(event) => setChildGrade(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              placeholder="Grado"
            />
            <button
              className="big-button bg-lilac text-white"
              onClick={() =>
                createChildAccount({
                  childEmail,
                  childGrade,
                  childName,
                  childPassword
                })
              }
            >
              Crear cuenta de mi hija
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-black text-ink">Ajustar dificultad</h2>
          <div className="mt-5 grid gap-4">
            <select
              value={overrideSubject}
              onChange={(event) => setOverrideSubject(event.target.value as Subject)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
            >
              <option value="math">Matemáticas</option>
              <option value="english">Inglés</option>
            </select>
            <select
              value={overrideTopic}
              onChange={(event) => setOverrideTopic(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
            >
              {(overrideSubject === "math" ? topics : englishTopics).map((topic) => (
                <option value={topic.id} key={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
            <input
              value={overrideLevel}
              onChange={(event) => setOverrideLevel(Number(event.target.value))}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              max={5}
              min={1}
              type="number"
            />
            <button
              className="big-button bg-coral text-white"
              onClick={() =>
                createDifficultyOverride({
                  childId: selectedChildId,
                  difficultyLevel: overrideLevel,
                  overrideSubject,
                  topic: overrideTopic
                })
              }
            >
              Aplicar por 7 días
            </button>
          </div>
        </div>

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
          <h2 className="text-2xl font-black text-ink">Crear reto personalizado</h2>
          <div className="mt-5 grid gap-4">
            <input
              value={selectedChildId}
              onChange={(event) => setSelectedChildId(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              placeholder="Id de Mafer en Supabase"
            />
            {childIds.length > 0 ? (
              <select
                value={selectedChildId}
                onChange={(event) => setSelectedChildId(event.target.value)}
                className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              >
                {childIds.map((childId) => (
                  <option value={childId} key={childId}>
                    Mafer: {childId.slice(0, 8)}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={challengeSubject}
              onChange={(event) => setChallengeSubject(event.target.value as Subject)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
            >
              <option value="math">Matemáticas</option>
              <option value="english">Inglés</option>
            </select>
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
              onChange={(event) => setTopic(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
            >
              <option value="mezclado">Mezclado</option>
              {(challengeSubject === "math" ? topics : englishTopics).map((topic) => (
                <option value={topic.id} key={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
            <input
              value={challengeSubtopic}
              onChange={(event) => setChallengeSubtopic(event.target.value)}
              className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
              placeholder="Subtema"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={challengeDifficulty}
                onChange={(event) => setChallengeDifficulty(Number(event.target.value))}
                className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
                min={1}
                max={5}
                type="number"
              />
              <input
                value={challengeMinutes}
                onChange={(event) => setChallengeMinutes(Number(event.target.value))}
                className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
                min={1}
                max={120}
                type="number"
              />
              <input
                value={challengeDate}
                onChange={(event) => setChallengeDate(event.target.value)}
                className="rounded-2xl border-2 border-ink/10 bg-rose-50 px-4 py-4 text-lg font-black"
                type="date"
              />
            </div>
            <label className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-4 text-lg font-black text-ink">
              <input
                checked={challengeRequired}
                onChange={(event) => setChallengeRequired(event.target.checked)}
                className="size-5"
                type="checkbox"
              />
              Obligatorio
            </label>
            <button
              className="big-button bg-ink text-white"
              onClick={() => {
                if (challengeSubject === "math") {
                  createChallenge(count, topic as Challenge["topic"], selectedChildId);
                }
                createPersonalizedChallenge({
                  challengeSubject,
                  childId: selectedChildId,
                  difficultyLevel: challengeDifficulty,
                  estimatedMinutes: challengeMinutes,
                  isRequired: challengeRequired,
                  questionCount: count,
                  suggestedDate: challengeDate,
                  subtopic: challengeSubtopic,
                  topic
                });
              }}
            >
              Crear reto
            </button>
          </div>
          {feedback ? <p className="mt-4 rounded-2xl bg-sunshine/60 p-4 font-black text-ink">{feedback}</p> : null}
          <div className="mt-6 space-y-3">
            <h3 className="font-black text-ink/70">Retos creados</h3>
            {challenges.slice(0, 5).map((challenge) => (
              <div className="rounded-2xl bg-sunshine/50 p-4 font-black" key={challenge.id}>
                {challenge.questionCount} preguntas de {topicLabel(challenge.topic)}
              </div>
            ))}
            {challenges.length === 0 ? <p className="font-bold text-ink/60">No hay retos todavía.</p> : null}
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
      <Metric label="Racha de días" value={`${progress.streak} días`} />
    </div>
  );
}

function ReinforcementCardView({ card }: { card: ReturnType<typeof buildReinforcementCards>[number] }) {
  const color =
    card.status === "mastered"
      ? "border-mint bg-mint/15"
      : card.status === "priority"
        ? "border-berry bg-rose-50"
        : "border-sunshine bg-sunshine/25";
  const label = card.status === "mastered" ? "Dominado" : card.status === "priority" ? "Refuerzo prioritario" : "Requiere práctica";

  return (
    <div className={`rounded-[2rem] border-4 p-5 ${color}`}>
      <p className="text-sm font-black uppercase tracking-[0.14em] text-ink/50">{card.subject === "math" ? "Matemáticas" : "Inglés"}</p>
      <h3 className="mt-2 text-2xl font-black text-ink">{card.topic}</h3>
      <p className="mt-1 font-bold text-ink/65">{card.subtopic}</p>
      <div className="mt-4 grid gap-2 text-sm font-black text-ink/70">
        <p>Nivel actual: {card.difficultyLevel}</p>
        <p>Aciertos recientes: {card.recentAccuracy}%</p>
        <p>Ejercicios: {card.total}</p>
        <p>Estado: {label}</p>
        <p>Tendencia: {card.trend}</p>
      </div>
      <p className="mt-4 rounded-2xl bg-white/75 p-3 text-sm font-bold leading-5 text-ink">{card.recommendation}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-soft">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-ink/50">{label}</p>
      <p className="mt-2 break-words text-3xl font-black text-ink">{value}</p>
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
    { id: "ingles", label: "Inglés", icon: "A" },
    { id: "tutor", label: "Tutor", icon: "?" },
    { id: "progreso", label: "Progreso", icon: "★" }
  ];

  if (role === "parent") {
    items.push({ id: "papa", label: "Papá", icon: "P" });
  }

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 overflow-x-auto border-t border-ink/10 bg-white/92 px-3 pt-3 backdrop-blur">
      <div className="mx-auto grid min-w-[34rem] max-w-4xl gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
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

function summarizeProgress(rows: TopicProgress[], attempts: Attempt[]): Progress {
  const correct = rows.reduce((total, row) => total + row.correctAnswers, 0);
  const incorrect = rows.reduce((total, row) => total + row.incorrectAnswers, 0);
  return {
    stars: rows.reduce((total, row) => total + row.stars, 0),
    correct,
    incorrect,
    total: correct + incorrect || attempts.length,
    streak: rows.reduce((max, row) => Math.max(max, row.streakDays), 0),
    topics: rows.map((row) => row.topic),
    lastStudyDate:
      rows
        .map((row) => row.lastPracticedAt)
        .filter(Boolean)
        .sort()
        .at(-1)
        ?.slice(0, 10) ?? null
  };
}

function topicLabel(topic: Topic | "mezclado") {
  if (topic === "mezclado") return "mezclado";
  return topics.find((item) => item.id === topic)?.label.toLowerCase() ?? topic;
}

function detectTutorTopic(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("multiplic")) return "multiplicaciones";
  if (normalized.includes("divi")) return "divisiones";
  if (normalized.includes("rest") || normalized.includes("menos")) return "restas";
  if (normalized.includes("sum") || normalized.includes("mas") || normalized.includes("más")) return "sumas";
  if (normalized.includes("fraccion") || normalized.includes("fracción")) return "fracciones";
  if (normalized.includes("tabla")) return "tablas";
  if (normalized.includes("reto")) return "reto";
  if (normalized.includes("foto")) return "foto de tarea";
  return "matematicas";
}

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    grade: row.grade,
    createdAt: row.created_at
  };
}

function mapAttempt(row: any): Attempt {
  return {
    topic: row.topic,
    question: row.question,
    answer: Number(row.answer_given),
    correctAnswer: Number(row.correct_answer),
    isCorrect: row.is_correct,
    createdAt: row.created_at
  };
}

function mapTopicProgress(row: any): TopicProgress {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    correctAnswers: row.correct_answers ?? 0,
    incorrectAnswers: row.incorrect_answers ?? 0,
    stars: row.stars ?? 0,
    streakDays: row.streak_days ?? 0,
    lastPracticedAt: row.last_practiced_at
  };
}

function mapChallenge(row: any): Challenge {
  return {
    id: row.id,
    parentId: row.parent_id,
    childId: row.child_id,
    topic: row.topic,
    questionCount: row.number_of_questions,
    difficulty: row.difficulty,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapLearningAttempt(row: any): LearningAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    subject: row.subject,
    topic: row.topic,
    subtopic: row.subtopic,
    activityType: row.activity_type,
    operationType: row.operation_type,
    difficultyLevel: row.difficulty_level ?? 1,
    question: row.question,
    answerGiven: row.answer_given,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct,
    attemptsCount: row.attempts_count ?? 1,
    hintRequested: row.hint_requested ?? false,
    responseTimeSeconds: row.response_time_seconds ?? 0,
    createdAt: row.created_at
  };
}

function mapDifficultyOverride(row: any): DifficultyOverride {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    topic: row.topic,
    difficultyLevel: row.difficulty_level ?? 1,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}
