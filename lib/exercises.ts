/**
 * Los ejercicios sembrados desde free-exercise-db guardan grupo muscular y equipo
 * en inglés (ver supabase/migrations/00000000000004_seed_exercises.sql). Esta capa
 * traduce esos valores para mostrarlos en español sin bifurcar la fuente de datos.
 */
const MUSCLE_GROUP_LABELS: Record<string, string> = {
  abdominals: "Abdominales",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Pantorrillas",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "lower back": "Espalda baja",
  "middle back": "Espalda media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  shoulders: "Hombros",
  traps: "Trapecios",
  triceps: "Tríceps",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  "body only": "Peso corporal",
  bands: "Bandas",
  barbell: "Barra",
  cable: "Polea",
  dumbbell: "Mancuerna",
  "e-z curl bar": "Barra Z",
  "exercise ball": "Balón de ejercicio",
  "foam roll": "Rodillo de espuma",
  kettlebells: "Kettlebell",
  machine: "Máquina",
  "medicine ball": "Balón medicinal",
  other: "Otro",
};

export function translateMuscleGroup(value: string | null): string {
  if (!value) return "Sin grupo muscular";
  return MUSCLE_GROUP_LABELS[value] ?? value;
}

export function translateEquipment(value: string | null): string {
  if (!value) return "Sin equipo";
  return EQUIPMENT_LABELS[value] ?? value;
}

export const MUSCLE_GROUP_OPTIONS = Object.entries(MUSCLE_GROUP_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS).map(
  ([value, label]) => ({ value, label })
);
