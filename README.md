# Mate con Mafer

Aplicación web privada para que Mafer practique matemáticas de forma sencilla, bonita e instalable en iPad, iPhone, Android y computador.

Esta primera version incluye:

- Inicio de Mafer con estrellas, racha y botones grandes.
- Práctica de sumas, restas, multiplicaciones y divisiones.
- Un ejercicio por pantalla con respuesta, revision y pista amable.
- Tutor de matemáticas vacío por ahora, con botón para subir foto de tarea.
- Progreso con estrellas, respuestas correctas, temas practicados y racha.
- Panel de papá con progreso, errores por tema, ejercicios realizados y retos de 5 o 10 preguntas.
- PWA instalable desde Safari en iPad.
- Supabase preparado para usuarios anónimos privados, progreso, intentos y retos.
- Sin OpenAI API, sin pagos, sin App Store y sin anuncios.

## Tecnologia

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Preparada para Vercel

## Empezar

1. Instala dependencias:

```bash
pnpm install
```

2. Crea el archivo `.env.local` usando `.env.example` como base:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_APP_ACCESS_CODE=un-codigo-privado
```

Si dejas Supabase vacio, la app funciona en modo local de prueba usando el navegador.

3. Ejecuta la app:

```bash
pnpm dev
```

4. Abre:

```text
http://localhost:3000
```

## Supabase

En Supabase, activa `Authentication > Sign In / Providers > Anonymous sign-ins`.

Luego crea las tablas con este SQL:

```sql
create table if not exists public.progress (
  child_key text primary key,
  stars integer not null default 0,
  correct integer not null default 0,
  total integer not null default 0,
  streak integer not null default 0,
  topics text[] not null default '{}',
  last_study_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  child_key text not null,
  topic text not null,
  question text not null,
  answer integer not null,
  correct_answer integer not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  child_key text not null,
  question_count integer not null check (question_count in (5, 10)),
  topic text not null,
  created_at timestamptz not null default now()
);

alter table public.progress enable row level security;
alter table public.attempts enable row level security;
alter table public.challenges enable row level security;

create policy "Usuarios autenticados pueden leer progreso"
on public.progress for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden guardar progreso"
on public.progress for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden actualizar progreso"
on public.progress for update
to authenticated
using (true)
with check (true);

create policy "Usuarios autenticados pueden leer intentos"
on public.attempts for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear intentos"
on public.attempts for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden leer retos"
on public.challenges for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear retos"
on public.challenges for insert
to authenticated
with check (true);
```

## Instalar en iPad

1. Despliega la app en Vercel.
2. Abre la URL en Safari del iPad.
3. Toca el boton de compartir.
4. Elige `Agregar a pantalla de inicio`.
5. Abre `Mate Mafer` desde el icono.

## Desplegar en Vercel

1. Sube este proyecto a GitHub.
2. En Vercel, crea un proyecto nuevo e importa el repositorio.
3. Agrega estas variables en `Settings > Environment Variables`:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_ACCESS_CODE
```

4. Despliega.

## Personalizacion

- La foto de Mafer se puede subir desde el encabezado de la app. En esta version se guarda en el dispositivo.
- El código privado se controla con `NEXT_PUBLIC_APP_ACCESS_CODE`.
- La imagen principal esta en `public/images/mate-con-mafer-hero.png`.

## Notas de privacidad

- No se pide información personal.
- No hay chat entre usuarios.
- No hay pagos.
- No hay anuncios.
- No se conecta OpenAI API.
