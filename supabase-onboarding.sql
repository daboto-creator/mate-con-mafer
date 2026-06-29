-- Mate con Mafer - alta inicial de perfiles de prueba
-- 1. Crea primero los usuarios en Supabase:
--    Authentication > Users > Add user
--    parent@example.com
--    mafer@example.com
--
-- 2. Despues ejecuta este archivo en el SQL Editor.
--    No pongas contrasenas en SQL.

insert into public.profiles (id, full_name, role, grade)
select id, 'Papá', 'parent', null
from auth.users
where email = 'parent@example.com'
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  grade = excluded.grade;

insert into public.profiles (id, full_name, role, grade)
select id, 'Mafer', 'child', 'Primaria'
from auth.users
where email = 'mafer@example.com'
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  grade = excluded.grade;

-- Verifica que existan los dos perfiles.
select id, full_name, role, grade
from public.profiles
where id in (
  select id
  from auth.users
  where email in ('parent@example.com', 'mafer@example.com')
);

-- Opcional: crea un primer reto para que el panel de papa quede enlazado con Mafer.
-- Si prefieres, tambien puedes crearlo desde la app pegando el id de Mafer.
insert into public.assignments (parent_id, child_id, topic, number_of_questions, difficulty, status)
select
  parent_user.id,
  child_user.id,
  'sumas',
  5,
  'normal',
  'pending'
from auth.users parent_user
cross join auth.users child_user
where parent_user.email = 'parent@example.com'
  and child_user.email = 'mafer@example.com'
  and not exists (
    select 1
    from public.assignments existing
    where existing.parent_id = parent_user.id
      and existing.child_id = child_user.id
  );
