-- Mate con Mafer - reparacion de ajuste manual de dificultad
-- Ejecuta este archivo si el panel de papa muestra:
-- "No pude ajustar la dificultad. Revisa la migración adaptativa."

create table if not exists public.difficulty_overrides (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (subject in ('math', 'english')),
  topic text not null,
  difficulty_level integer not null check (difficulty_level between 1 and 5),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (parent_id <> user_id)
);

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (subject in ('math', 'english')),
  event_type text not null,
  topic text,
  subtopic text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists difficulty_overrides_user_subject_idx
on public.difficulty_overrides(user_id, subject, topic);

create index if not exists learning_events_user_subject_idx
on public.learning_events(user_id, subject, created_at);

alter table public.difficulty_overrides enable row level security;
alter table public.learning_events enable row level security;

create or replace function public.is_parent_linked_to(target_child_id uuid)
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
  )
  or exists (
    select 1
    from public.personalized_challenges pc
    where pc.parent_id = auth.uid()
      and pc.child_id = target_child_id
  );
$$;

drop policy if exists "Difficulty overrides visible to parent and child" on public.difficulty_overrides;
create policy "Difficulty overrides visible to parent and child"
on public.difficulty_overrides
for select
to authenticated
using (
  parent_id = auth.uid()
  or user_id = auth.uid()
  or public.is_parent_linked_to(user_id)
);

drop policy if exists "Parents manage difficulty overrides" on public.difficulty_overrides;
create policy "Parents manage difficulty overrides"
on public.difficulty_overrides
for all
to authenticated
using (
  parent_id = auth.uid()
  and public.profile_role(auth.uid()) = 'parent'
)
with check (
  parent_id = auth.uid()
  and public.profile_role(auth.uid()) = 'parent'
  and public.profile_role(user_id) = 'child'
  and public.is_parent_linked_to(user_id)
);

drop policy if exists "Learning events visible to owner and assigned parent" on public.learning_events;
create policy "Learning events visible to owner and assigned parent"
on public.learning_events
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_parent_linked_to(user_id)
);

drop policy if exists "Children create learning events" on public.learning_events;
create policy "Children create learning events"
on public.learning_events
for insert
to authenticated
with check (user_id = auth.uid());
