-- Fase 3: comida ("camino A"). La comida se sigue registrando en Fitia; aquí solo se guardan
-- los totales del día, capturados a mano. Una fila por fecha local. Las metas diarias viven
-- en user_settings.

create table public.nutrition_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  kcal integer check (kcal between 0 and 20000),
  protein_g numeric(6, 1) check (protein_g between 0 and 2000),
  carbs_g numeric(6, 1) check (carbs_g between 0 and 3000),
  fat_g numeric(6, 1) check (fat_g between 0 and 2000),
  -- "manual" = copiado a mano de Fitia; "fitia" queda para una lectura automática (Health Connect).
  source text not null default 'manual' check (source in ('manual', 'fitia')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date),
  check (kcal is not null or protein_g is not null or carbs_g is not null or fat_g is not null)
);

alter table public.nutrition_daily enable row level security;

create trigger nutrition_daily_set_updated_at
  before update on public.nutrition_daily
  for each row execute function public.set_updated_at();

create policy "nutrition_daily_select_own" on public.nutrition_daily
  for select using (auth.uid() = user_id);
create policy "nutrition_daily_insert_own" on public.nutrition_daily
  for insert with check (auth.uid() = user_id);
create policy "nutrition_daily_update_own" on public.nutrition_daily
  for update using (auth.uid() = user_id);
create policy "nutrition_daily_delete_own" on public.nutrition_daily
  for delete using (auth.uid() = user_id);

-- Metas diarias opcionales (null = sin meta).
alter table public.user_settings
  add column kcal_goal integer check (kcal_goal between 1 and 20000),
  add column protein_goal_g integer check (protein_goal_g between 1 and 2000),
  add column carbs_goal_g integer check (carbs_goal_g between 1 and 3000),
  add column fat_goal_g integer check (fat_goal_g between 1 and 2000);
