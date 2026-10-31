-- Recordatorios por Web Push. Cada navegador o celular donde se activan las notificaciones
-- deja una suscripción; un cron (00000000000014) llama cada minuto a /api/cron/reminders, que
-- manda las tareas cuyo remind_at ya llegó y las marca con reminded_at para no repetirlas.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- URL del servicio de push del navegador (FCM en Android/Chrome). Identifica al dispositivo.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

alter table public.tasks add column reminded_at timestamptz;

-- Si cambia la hora del aviso (o se quita), el aviso vuelve a quedar pendiente.
create function public.reset_task_reminded_at()
returns trigger
language plpgsql
as $$
begin
  if new.remind_at is distinct from old.remind_at then
    new.reminded_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_reset_reminded_at
  before update on public.tasks
  for each row execute function public.reset_task_reminded_at();

-- Lo que consulta el cron cada minuto: avisos pendientes de enviar.
create index tasks_pending_reminder_idx on public.tasks (remind_at)
  where remind_at is not null and reminded_at is null;
