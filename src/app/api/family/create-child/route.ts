import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonError("Faltan variables de Supabase en el servidor.", 500);
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return jsonError("Inicia sesión como papá para dar de alta a tu hija.", 401);
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const fullName = String(body?.fullName ?? "Mafer").trim().slice(0, 80);
  const grade = String(body?.grade ?? "4 de primaria").trim().slice(0, 40);

  if (!email || !password || password.length < 6) {
    return jsonError("Escribe un correo y una contraseña de al menos 6 caracteres.");
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: authUser, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authUser.user) {
    return jsonError("Tu sesión de papá ya no está activa.", 401);
  }

  const { data: parentProfile } = await userClient
    .from("profiles")
    .select("id, role")
    .eq("id", authUser.user.id)
    .maybeSingle();

  if (parentProfile?.role !== "parent") {
    return jsonError("Solo una cuenta de papá puede dar de alta a una hija.", 403);
  }

  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "child", grade }
  });

  if (createUserError || !createdUser.user) {
    return jsonError(createUserError?.message || "No pude crear la cuenta de tu hija.", 400);
  }

  const childId = createdUser.user.id;
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: childId,
      full_name: fullName,
      role: "child",
      grade
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return jsonError("La cuenta se creó, pero no pude crear su perfil.", 500);
  }

  const { error: assignmentError } = await adminClient.from("assignments").insert({
    parent_id: authUser.user.id,
    child_id: childId,
    topic: "sumas",
    number_of_questions: 5,
    difficulty: "normal",
    status: "pending"
  });

  if (assignmentError) {
    return jsonError("La cuenta se creó, pero no pude enlazarla con papá.", 500);
  }

  return NextResponse.json({
    childId,
    message: "Cuenta de tu hija creada y enlazada con papá."
  });
}
