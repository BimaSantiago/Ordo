-- Hábitos con meta numérica al día (p. ej. "Agua: 8 vasos").
-- habits.frequency / frequency_days / target_count ya existían desde 0001; aquí se agrega la
-- unidad de la meta y el valor del día en el log. Un hábito sí/no guarda value = 1 (o null en
-- logs anteriores, que cuenta como cumplido); uno numérico se cumple con value >= target_count.

alter table public.habits
  add column unit text;

alter table public.habit_logs
  add column value integer check (value is null or value >= 0);

alter table public.habits
  add constraint habits_frequency_days_check
    check (frequency <> 'dias_semana' or (frequency_days is not null and cardinality(frequency_days) > 0)),
  add constraint habits_target_count_check
    check (target_count is null or target_count > 0);
