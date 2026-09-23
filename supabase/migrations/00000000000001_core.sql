-- Hito 1A: núcleo diario (hábitos, tareas, proyectos, ideas, notas, peso, medidas).
-- user_id + RLS en todas las tablas. Fechas/horas en UTC; local_date para cortes de día
-- en America/Mexico_City. Los ids se generan en el cliente (UUID) para soportar
-- creación sin conexión y sincronizar después.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- projects ---------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status text not null default 'activo' check (status in ('activo', 'pausado', 'terminado', 'archivado')),
  description text,
  next_steps text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- habits -------------------------------------------------------------------

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  frequency text not null default 'diaria' check (frequency in ('diaria', 'dias_semana')),
  frequency_days smallint[] default null, -- 0=domingo .. 6=sábado, solo si frequency = 'dias_semana'
  target_count integer default null, -- meta numérica opcional (p. ej. "3 veces")
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.habits enable row level security;

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

create policy "habits_select_own" on public.habits
  for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  local_date date not null,
  done boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, local_date)
);

alter table public.habit_logs enable row level security;

create trigger habit_logs_set_updated_at
  before update on public.habit_logs
  for each row execute function public.set_updated_at();

create index habit_logs_habit_id_local_date_idx on public.habit_logs (habit_id, local_date desc);

create policy "habit_logs_select_own" on public.habit_logs
  for select using (auth.uid() = user_id);
create policy "habit_logs_insert_own" on public.habit_logs
  for insert with check (auth.uid() = user_id);
create policy "habit_logs_update_own" on public.habit_logs
  for update using (auth.uid() = user_id);
create policy "habit_logs_delete_own" on public.habit_logs
  for delete using (auth.uid() = user_id);

-- tasks ----------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  notes text,
  due_date date,
  priority text not null default 'normal' check (priority in ('baja', 'normal', 'alta')),
  status text not null default 'pendiente' check (status in ('pendiente', 'completada')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create index tasks_user_due_date_idx on public.tasks (user_id, due_date);

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- ideas & notes ----------------------------------------------------------

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

create policy "ideas_select_own" on public.ideas
  for select using (auth.uid() = user_id);
create policy "ideas_insert_own" on public.ideas
  for insert with check (auth.uid() = user_id);
create policy "ideas_update_own" on public.ideas
  for update using (auth.uid() = user_id);
create policy "ideas_delete_own" on public.ideas
  for delete using (auth.uid() = user_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- body_weight_logs & body_measurements ------------------------------------

create table public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

alter table public.body_weight_logs enable row level security;

create trigger body_weight_logs_set_updated_at
  before update on public.body_weight_logs
  for each row execute function public.set_updated_at();

create index body_weight_logs_user_local_date_idx on public.body_weight_logs (user_id, local_date desc);

create policy "body_weight_logs_select_own" on public.body_weight_logs
  for select using (auth.uid() = user_id);
create policy "body_weight_logs_insert_own" on public.body_weight_logs
  for insert with check (auth.uid() = user_id);
create policy "body_weight_logs_update_own" on public.body_weight_logs
  for update using (auth.uid() = user_id);
create policy "body_weight_logs_delete_own" on public.body_weight_logs
  for delete using (auth.uid() = user_id);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  type text not null, -- p. ej. "cintura", "pecho", "brazo"
  value numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.body_measurements enable row level security;

create trigger body_measurements_set_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

create index body_measurements_user_local_date_idx on public.body_measurements (user_id, local_date desc);

create policy "body_measurements_select_own" on public.body_measurements
  for select using (auth.uid() = user_id);
create policy "body_measurements_insert_own" on public.body_measurements
  for insert with check (auth.uid() = user_id);
create policy "body_measurements_update_own" on public.body_measurements
  for update using (auth.uid() = user_id);
create policy "body_measurements_delete_own" on public.body_measurements
  for delete using (auth.uid() = user_id);
