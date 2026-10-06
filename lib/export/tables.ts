/** Tablas que se incluyen en el respaldo, con su nombre para mostrar. Agregar aquí las tablas nuevas. */
export const EXPORT_TABLES = [
  { table: "tasks", label: "Tareas y actividades" },
  { table: "habits", label: "Hábitos" },
  { table: "habit_logs", label: "Registro de hábitos" },
  { table: "schedule_categories", label: "Materias" },
  { table: "schedule_blocks", label: "Horario semanal" },
  { table: "body_weight_logs", label: "Peso corporal" },
  { table: "body_measurements", label: "Medidas corporales" },
  { table: "workouts", label: "Entrenamientos" },
  { table: "workout_exercises", label: "Ejercicios de entrenamientos" },
  { table: "workout_sets", label: "Series" },
  { table: "personal_records", label: "Récords personales" },
  { table: "routines", label: "Rutinas" },
  { table: "routine_exercises", label: "Ejercicios de rutinas" },
  { table: "exercises", label: "Ejercicios personalizados" },
  { table: "notes", label: "Notas" },
  { table: "ideas", label: "Ideas" },
  { table: "projects", label: "Proyectos" },
  { table: "weekly_reviews", label: "Revisiones semanales" },
  { table: "finance_accounts", label: "Cuentas" },
  { table: "finance_categories", label: "Categorías de finanzas" },
  { table: "transactions", label: "Movimientos de dinero" },
  { table: "budgets", label: "Presupuestos" },
  { table: "user_settings", label: "Ajustes" },
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number]["table"];

export function isExportTable(value: string): value is ExportTable {
  return EXPORT_TABLES.some((t) => t.table === value);
}
