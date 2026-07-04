-- Mate con Mafer - aprendizaje adaptativo
-- Ejecuta este archivo despues de supabase-schema.sql.
-- Es una migracion no destructiva: no elimina tablas ni datos existentes.

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (subject in ('math', 'english')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.study_sessions(id) on delete set null,
  subject text not null check (subject in ('math', 'english')),
  topic text not null,
  subtopic text not null,
  activity_type text not null,
  operation_type text,
  difficulty_level integer not null default 1 check (difficulty_level between 1 and 5),
  question text not null,
  answer_given text not null,
  correct_answer text not null,
  is_correct boolean not null,
  attempts_count integer not null default 1,
  hint_requested boolean not null default false,
  response_time_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (subject in ('math', 'english')),
  topic text not null,
  subtopic text not null,
  difficulty_level integer not null default 1 check (difficulty_level between 1 and 5),
  status text not null default 'in_progress' check (status in ('review', 'in_progress', 'mastered')),
  correct_answers integer not null default 0,
  incorrect_answers integer not null default 0,
  hints_requested integer not null default 0,
  average_response_seconds integer not null default 0,
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, subject, topic, subtopic)
);

create table if not exists public.reinforcement_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (subject in ('math', 'english')),
  topic text not null,
  subtopic text not null,
  priority text not null default 'practice' check (priority in ('steady', 'practice', 'priority')),
  recommendation text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.personalized_challenges (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (subject in ('math', 'english')),
  topic text not null,
  subtopic text,
  number_of_questions integer not null default 10 check (number_of_questions between 1 and 30),
  difficulty_level integer not null default 1 check (difficulty_level between 1 and 5),
  suggested_date date,
  estimated_minutes integer not null default 10 check (estimated_minutes between 1 and 120),
  challenge_type text not null default 'recommended' check (challenge_type in ('required', 'recommended')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  check (parent_id <> child_id)
);

create index if not exists study_sessions_user_started_idx on public.study_sessions(user_id, started_at);
create index if not exists learning_attempts_user_subject_idx on public.learning_attempts(user_id, subject);
create index if not exists learning_attempts_user_subtopic_idx on public.learning_attempts(user_id, subject, topic, subtopic, created_at);
create index if not exists learning_progress_user_subject_idx on public.learning_progress(user_id, subject);
create index if not exists reinforcement_user_subject_idx on public.reinforcement_recommendations(user_id, subject);
create index if not exists personalized_challenges_parent_idx on public.personalized_challenges(parent_id);
create index if not exists personalized_challenges_child_idx on public.personalized_challenges(child_id);

alter table public.study_sessions enable row level security;
alter table public.learning_attempts enable row level security;
alter table public.learning_progress enable row level security;
alter table public.reinforcement_recommendations enable row level security;
alter table public.personalized_challenges enable row level security;

drop policy if exists "Study sessions visible to owner and assigned parent" on public.study_sessions;
create policy "Study sessions visible to owner and assigned parent"
on public.study_sessions
for select
to authenticated
using (user_id = auth.uid() or public.is_parent_of(user_id));

drop policy if exists "Children manage their study sessions" on public.study_sessions;
create policy "Children manage their study sessions"
on public.study_sessions
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Learning attempts visible to owner and assigned parent" on public.learning_attempts;
create policy "Learning attempts visible to owner and assigned parent"
on public.learning_attempts
for select
to authenticated
using (user_id = auth.uid() or public.is_parent_of(user_id));

drop policy if exists "Children create their learning attempts" on public.learning_attempts;
create policy "Children create their learning attempts"
on public.learning_attempts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Learning progress visible to owner and assigned parent" on public.learning_progress;
create policy "Learning progress visible to owner and assigned parent"
on public.learning_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_parent_of(user_id));

drop policy if exists "Children upsert their learning progress" on public.learning_progress;
create policy "Children upsert their learning progress"
on public.learning_progress
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Recommendations visible to owner and assigned parent" on public.reinforcement_recommendations;
create policy "Recommendations visible to owner and assigned parent"
on public.reinforcement_recommendations
for select
to authenticated
using (user_id = auth.uid() or public.is_parent_of(user_id));

drop policy if exists "Children manage their recommendations" on public.reinforcement_recommendations;
create policy "Children manage their recommendations"
on public.reinforcement_recommendations
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Personalized challenges visible to parent and child" on public.personalized_challenges;
create policy "Personalized challenges visible to parent and child"
on public.personalized_challenges
for select
to authenticated
using (parent_id = auth.uid() or child_id = auth.uid());

drop policy if exists "Parents create personalized challenges" on public.personalized_challenges;
create policy "Parents create personalized challenges"
on public.personalized_challenges
for insert
to authenticated
with check (
  parent_id = auth.uid()
  and public.profile_role(auth.uid()) = 'parent'
  and public.profile_role(child_id) = 'child'
);

drop policy if exists "Parents update personalized challenges" on public.personalized_challenges;
create policy "Parents update personalized challenges"
on public.personalized_challenges
for update
to authenticated
using (parent_id = auth.uid() and public.profile_role(auth.uid()) = 'parent')
with check (parent_id = auth.uid() and public.profile_role(child_id) = 'child');
