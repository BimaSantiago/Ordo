-- Actividades de la semana = tareas con hora. No es una tabla nueva: una tarea con
-- start_time se dibuja en su hora dentro de la tabla semanal; sin hora, se adjunta al
-- bloque de su materia ese día o queda en "Pendientes".
-- remind_at prepara los recordatorios (la entrega por Web Push llega en una fase posterior).

alter table public.tasks
  add column start_time time,
  add column end_time time,
  add column remind_at timestamptz,
  add constraint tasks_time_range_check
    check (end_time is null or (start_time is not null and end_time > start_time));

-- El índice (user_id, due_date) ya existe desde 00000000000001_core.sql.
create index tasks_remind_at_idx on public.tasks (remind_at) where remind_at is not null;
