-- Mate con Mafer - Supabase schema
-- Run this file in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('parent', 'child')),
  grade text,
  created_at timestamptz not null default now()
);

create table if not exists public.math_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  question text not null,
  answer_given text not null,
  correct_answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.math_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  correct_answers integer not null default 0,
  incorrect_answers integer not null default 0,
  stars integer not null default 0,
  streak_days integer not null default 0,
  last_practiced_at timestamptz,
  unique (user_id, topic)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  number_of_questions integer not null check (number_of_questions in (5, 10)),
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal', 'hard')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  check (parent_id <> child_id)
);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  topic text not null default 'general',
  created_at timestamptz not null default now()
);

create index if not exists math_attempts_user_id_idx on public.math_attempts(user_id);
create index if not exists math_attempts_created_at_idx on public.math_attempts(created_at);
create index if not exists math_progress_user_id_idx on public.math_progress(user_id);
create index if not exists assignments_parent_id_idx on public.assignments(parent_id);
create index if not exists assignments_child_id_idx on public.assignments(child_id);
create index if not exists tutor_messages_user_id_idx on public.tutor_messages(user_id);
create index if not exists tutor_messages_topic_idx on public.tutor_messages(topic);
create index if not exists tutor_messages_created_at_idx on public.tutor_messages(created_at);

alter table public.profiles enable row level security;
alter table public.math_attempts enable row level security;
alter table public.math_progress enable row level security;
alter table public.assignments enable row level security;
alter table public.tutor_messages enable row level security;

create or replace function public.is_parent_of(target_child_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.assignments a
    where a.parent_id = auth.uid()
      and a.child_id = target_child_id
  );
$$;

create or replace function public.profile_role(target_user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.role
  from public.profiles p
  where p.id = target_user_id;
$$;

drop policy if exists "Profiles are visible to owner and assigned parent" on public.profiles;
create policy "Profiles are visible to owner and assigned parent"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_parent_of(id)
);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Attempts visible to owner and assigned parent" on public.math_attempts;
create policy "Attempts visible to owner and assigned parent"
on public.math_attempts
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_parent_of(user_id)
);

drop policy if exists "Children can create their own attempts" on public.math_attempts;
create policy "Children can create their own attempts"
on public.math_attempts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.profile_role(auth.uid()) = 'child'
);

drop policy if exists "Children can update their own attempts" on public.math_attempts;
create policy "Children can update their own attempts"
on public.math_attempts
for update
to authenticated
using (
  user_id = auth.uid()
  and public.profile_role(auth.uid()) = 'child'
)
with check (
  user_id = auth.uid()
  and public.profile_role(auth.uid()) = 'child'
);

drop policy if exists "Children can delete their own attempts" on public.math_attempts;
create policy "Children can delete their own attempts"
on public.math_attempts
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.profile_role(auth.uid()) = 'child'
);

drop policy if exists "Progress visible to owner and assigned parent" on public.math_progress;
create policy "Progress visible to owner and assigned parent"
on public.math_progress
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_parent_of(user_id)
);

drop policy if exists "Children can create their own progress" on public.math_progress;
create policy "Children can create their own progress"
on public.math_progress
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.profile_role(auth.uid()) = 'child'
);

drop policy if exists "Children can update their own progress" on public.math_progress;
create policy "Children can update their own progress"
on public.math_progress
for update
to authenticated
using (
  user_id = auth.uid()
  and public.profile_role(auth.uid()) = 'child'
)
with check (
  user_id = auth.uid()
  and public.profile_role(auth.uid()) = 'child'
);

drop policy if exists "Assignments visible to parent and child" on public.assignments;
create policy "Assignments visible to parent and child"
on public.assignments
for select
to authenticated
using (
  parent_id = auth.uid()
  or child_id = auth.uid()
);

drop policy if exists "Parents can create assignments for children" on public.assignments;
create policy "Parents can create assignments for children"
on public.assignments
for insert
to authenticated
with check (
  parent_id = auth.uid()
  and public.profile_role(auth.uid()) = 'parent'
  and public.profile_role(child_id) = 'child'
);

drop policy if exists "Parents can update their assignments" on public.assignments;
create policy "Parents can update their assignments"
on public.assignments
for update
to authenticated
using (
  parent_id = auth.uid()
  and public.profile_role(auth.uid()) = 'parent'
)
with check (
  parent_id = auth.uid()
  and public.profile_role(auth.uid()) = 'parent'
  and public.profile_role(child_id) = 'child'
);

drop policy if exists "Parents can delete their assignments" on public.assignments;
create policy "Parents can delete their assignments"
on public.assignments
for delete
to authenticated
using (
  parent_id = auth.uid()
  and public.profile_role(auth.uid()) = 'parent'
);

drop policy if exists "Tutor messages visible to owner and assigned parent" on public.tutor_messages;
create policy "Tutor messages visible to owner and assigned parent"
on public.tutor_messages
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_parent_of(user_id)
);

drop policy if exists "Users can create their own tutor messages" on public.tutor_messages;
create policy "Users can create their own tutor messages"
on public.tutor_messages
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own tutor messages" on public.tutor_messages;
create policy "Users can delete their own tutor messages"
on public.tutor_messages
for delete
to authenticated
using (user_id = auth.uid());
