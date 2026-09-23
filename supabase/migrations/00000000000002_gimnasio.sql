-- Hito 1B: esquema del módulo de gimnasio (diseñado desde ahora, sección 6 de CLAUDE.md).
-- Se guarda todo en kg internamente; la interfaz puede mostrar libras.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade, -- null = ejercicio global (biblioteca compartida)
  name text not null,
  primary_muscle_group text,
  secondary_muscle_groups text[],
  equipment text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

create policy "exercises_select_global_or_own" on public.exercises
  for select using (user_id is null or auth.uid() = user_id);
create policy "exercises_insert_own" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "exercises_update_own" on public.exercises
  for update using (auth.uid() = user_id);
create policy "exercises_delete_own" on public.exercises
  for delete using (auth.uid() = user_id);

-- routines (plantillas) ---------------------------------------------------

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routines enable row level security;

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

create policy "routines_select_own" on public.routines
  for select using (auth.uid() = user_id);
create policy "routines_insert_own" on public.routines
  for insert with check (auth.uid() = user_id);
create policy "routines_update_own" on public.routines
  for update using (auth.uid() = user_id);
create policy "routines_delete_own" on public.routines
  for delete using (auth.uid() = user_id);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null default 0,
  target_sets integer,
  target_rep_range text, -- p. ej. "8-12"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routine_exercises enable row level security;

create trigger routine_exercises_set_updated_at
  before update on public.routine_exercises
  for each row execute function public.set_updated_at();

create index routine_exercises_routine_id_position_idx on public.routine_exercises (routine_id, position);

create policy "routine_exercises_select_own" on public.routine_exercises
  for select using (auth.uid() = user_id);
create policy "routine_exercises_insert_own" on public.routine_exercises
  for insert with check (auth.uid() = user_id);
create policy "routine_exercises_update_own" on public.routine_exercises
  for update using (auth.uid() = user_id);
create policy "routine_exercises_delete_own" on public.routine_exercises
  for delete using (auth.uid() = user_id);

-- workouts (entrenamientos) -----------------------------------------------

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  name text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

create index workouts_user_started_at_idx on public.workouts (user_id, started_at desc);

create policy "workouts_select_own" on public.workouts
  for select using (auth.uid() = user_id);
create policy "workouts_insert_own" on public.workouts
  for insert with check (auth.uid() = user_id);
create policy "workouts_update_own" on public.workouts
  for update using (auth.uid() = user_id);
create policy "workouts_delete_own" on public.workouts
  for delete using (auth.uid() = user_id);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_exercises enable row level security;

create trigger workout_exercises_set_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

create index workout_exercises_workout_id_position_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_id_idx on public.workout_exercises (exercise_id);

create policy "workout_exercises_select_own" on public.workout_exercises
  for select using (auth.uid() = user_id);
create policy "workout_exercises_insert_own" on public.workout_exercises
  for insert with check (auth.uid() = user_id);
create policy "workout_exercises_update_own" on public.workout_exercises
  for update using (auth.uid() = user_id);
create policy "workout_exercises_delete_own" on public.workout_exercises
  for delete using (auth.uid() = user_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  position integer not null default 0,
  set_type text not null default 'normal' check (set_type in ('calentamiento', 'normal', 'al_fallo', 'drop_set')),
  weight_kg numeric(6, 2),
  reps integer,
  rpe numeric(3, 1),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_sets enable row level security;

create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

create index workout_sets_workout_exercise_id_position_idx on public.workout_sets (workout_exercise_id, position);

create policy "workout_sets_select_own" on public.workout_sets
  for select using (auth.uid() = user_id);
create policy "workout_sets_insert_own" on public.workout_sets
  for insert with check (auth.uid() = user_id);
create policy "workout_sets_update_own" on public.workout_sets
  for update using (auth.uid() = user_id);
create policy "workout_sets_delete_own" on public.workout_sets
  for delete using (auth.uid() = user_id);

-- personal_records (récords) ----------------------------------------------
-- Se guardan de forma explícita (en vez de solo calculados) para poder avisar
-- "rompiste un récord" en el momento sin recalcular todo el historial.

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  record_type text not null check (record_type in ('peso', 'repeticiones', 'one_rm_estimado', 'volumen_serie')),
  value numeric(10, 2) not null,
  workout_set_id uuid references public.workout_sets (id) on delete set null,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_records enable row level security;

create trigger personal_records_set_updated_at
  before update on public.personal_records
  for each row execute function public.set_updated_at();

create index personal_records_exercise_type_idx on public.personal_records (exercise_id, record_type, achieved_at desc);

create policy "personal_records_select_own" on public.personal_records
  for select using (auth.uid() = user_id);
create policy "personal_records_insert_own" on public.personal_records
  for insert with check (auth.uid() = user_id);
create policy "personal_records_update_own" on public.personal_records
  for update using (auth.uid() = user_id);
create policy "personal_records_delete_own" on public.personal_records
  for delete using (auth.uid() = user_id);
