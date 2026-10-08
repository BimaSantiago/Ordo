-- Fase 2: notas importantes. Una nota fijada aparece primero en /notas.
alter table public.notes add column pinned boolean not null default false;

create index notes_user_pinned_idx on public.notes (user_id, pinned desc, updated_at desc);
create index ideas_user_created_idx on public.ideas (user_id, created_at desc);
create index tasks_project_idx on public.tasks (project_id) where project_id is not null;
