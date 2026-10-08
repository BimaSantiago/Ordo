-- Fase 2: finanzas. Cuentas con saldo, categorías de gasto/ingreso, movimientos y presupuesto
-- mensual por categoría. Todo en MXN. Los ids se generan en el cliente (captura sin conexión).

-- finance_accounts ----------------------------------------------------------
-- Saldo = saldo inicial + ingresos − gastos ± transferencias (vista finance_account_balances).
-- Una tarjeta de crédito con deuda queda con saldo negativo; pagarla es una transferencia hacia ella.

create table public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  kind text not null default 'efectivo' check (kind in ('efectivo', 'debito', 'credito', 'ahorro')),
  initial_balance numeric(12, 2) not null default 0,
  color text not null default '#64748b',
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_accounts enable row level security;

create trigger finance_accounts_set_updated_at
  before update on public.finance_accounts
  for each row execute function public.set_updated_at();

create policy "finance_accounts_select_own" on public.finance_accounts
  for select using (auth.uid() = user_id);
create policy "finance_accounts_insert_own" on public.finance_accounts
  for insert with check (auth.uid() = user_id);
create policy "finance_accounts_update_own" on public.finance_accounts
  for update using (auth.uid() = user_id);
create policy "finance_accounts_delete_own" on public.finance_accounts
  for delete using (auth.uid() = user_id);

-- finance_categories --------------------------------------------------------

create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  kind text not null default 'gasto' check (kind in ('gasto', 'ingreso')),
  color text not null default '#64748b',
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_categories enable row level security;

create trigger finance_categories_set_updated_at
  before update on public.finance_categories
  for each row execute function public.set_updated_at();

create policy "finance_categories_select_own" on public.finance_categories
  for select using (auth.uid() = user_id);
create policy "finance_categories_insert_own" on public.finance_categories
  for insert with check (auth.uid() = user_id);
create policy "finance_categories_update_own" on public.finance_categories
  for update using (auth.uid() = user_id);
create policy "finance_categories_delete_own" on public.finance_categories
  for delete using (auth.uid() = user_id);

-- transactions --------------------------------------------------------------
-- Una cuenta con movimientos no se puede borrar (restrict): se archiva. Borrar una categoría
-- deja sus movimientos "sin categoría".

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('gasto', 'ingreso', 'transferencia')),
  amount numeric(12, 2) not null check (amount > 0),
  account_id uuid not null references public.finance_accounts (id) on delete restrict,
  to_account_id uuid references public.finance_accounts (id) on delete restrict,
  category_id uuid references public.finance_categories (id) on delete set null,
  local_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_transfer_target check ((kind = 'transferencia') = (to_account_id is not null)),
  constraint transactions_transfer_distinct check (to_account_id is null or to_account_id <> account_id),
  constraint transactions_transfer_no_category check (kind <> 'transferencia' or category_id is null)
);

alter table public.transactions enable row level security;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create index transactions_user_date_idx on public.transactions (user_id, local_date desc, created_at desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- budgets -------------------------------------------------------------------
-- Límite mensual por categoría de gasto; aplica igual a todos los meses.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.finance_categories (id) on delete cascade,
  monthly_amount numeric(12, 2) not null check (monthly_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table public.budgets enable row level security;

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

-- Saldo por cuenta ----------------------------------------------------------
-- security_invoker: la vista respeta el RLS de quien consulta (cada quien ve solo sus cuentas).

create view public.finance_account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.initial_balance + coalesce(sum(
    case
      when t.kind = 'ingreso' then t.amount
      when t.kind = 'gasto' then -t.amount
      when t.kind = 'transferencia' and t.account_id = a.id then -t.amount
      when t.kind = 'transferencia' and t.to_account_id = a.id then t.amount
      else 0
    end
  ), 0) as balance
from public.finance_accounts a
left join public.transactions t on t.account_id = a.id or t.to_account_id = a.id
group by a.id;
