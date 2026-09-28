-- Hito 1C: materias/áreas y horario semanal.
-- "Materias" agrupa tanto materias escolares como actividades de vida diaria
-- (entrenar, estudiar, jugar, etc.); solo sirven para etiquetar visualmente,
-- no hay lógica distinta según el tipo.

-- schedule_categories -----------------------------------------------------

create table public.schedule_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#64748b', -- hex, para la etiqueta en horario y tareas
  type text not null default 'actividad' check (type in ('escuela', 'actividad')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schedule_categories enable row level security;

create trigger schedule_categories_set_updated_at
  before update on public.schedule_categories
  for each row execute function public.set_updated_at();

create policy "schedule_categories_select_own" on public.schedule_categories
  for select using (auth.uid() = user_id);
create policy "schedule_categories_insert_own" on public.schedule_categories
  for insert with check (auth.uid() = user_id);
create policy "schedule_categories_update_own" on public.schedule_categories
  for update using (auth.uid() = user_id);
create policy "schedule_categories_delete_own" on public.schedule_categories
  for delete using (auth.uid() = user_id);

-- schedule_blocks (horario semanal recurrente) -----------------------------

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.schedule_categories (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=domingo..6=sábado
  start_time time not null,
  end_time time not null check (end_time > start_time),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schedule_blocks enable row level security;

create trigger schedule_blocks_set_updated_at
  before update on public.schedule_blocks
  for each row execute function public.set_updated_at();

create index schedule_blocks_user_day_idx on public.schedule_blocks (user_id, day_of_week, start_time);

create policy "schedule_blocks_select_own" on public.schedule_blocks
  for select using (auth.uid() = user_id);
create policy "schedule_blocks_insert_own" on public.schedule_blocks
  for insert with check (auth.uid() = user_id);
create policy "schedule_blocks_update_own" on public.schedule_blocks
  for update using (auth.uid() = user_id);
create policy "schedule_blocks_delete_own" on public.schedule_blocks
  for delete using (auth.uid() = user_id);

-- vínculo de tareas con materias/actividades -------------------------------

alter table public.tasks
  add column category_id uuid references public.schedule_categories (id) on delete set null;

create index tasks_category_id_idx on public.tasks (category_id);
