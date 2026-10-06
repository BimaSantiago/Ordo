-- Fase 2: revisión semanal (domingo). Una fila por semana (lunes local) con la reflexión escrita;
-- el resumen de números se calcula al vuelo desde las demás tablas.

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  wins text,
  lessons text,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_reviews enable row level security;

create trigger weekly_reviews_set_updated_at
  before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

create policy "weekly_reviews_select_own" on public.weekly_reviews
  for select using (auth.uid() = user_id);
create policy "weekly_reviews_insert_own" on public.weekly_reviews
  for insert with check (auth.uid() = user_id);
create policy "weekly_reviews_update_own" on public.weekly_reviews
  for update using (auth.uid() = user_id);
create policy "weekly_reviews_delete_own" on public.weekly_reviews
  for delete using (auth.uid() = user_id);
