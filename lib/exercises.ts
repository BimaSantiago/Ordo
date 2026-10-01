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

/** Columnas de `exercises` que necesitan las miniaturas, el detalle y el mapa muscular. */
export const EXERCISE_INFO_COLUMNS =
  "id, name, primary_muscle_group, secondary_muscle_groups, equipment, is_custom, image_paths";

export type ExerciseInfo = {
  id: string;
  name: string;
  primary_muscle_group: string | null;
  secondary_muscle_groups: string[] | null;
  equipment: string | null;
  is_custom: boolean;
  image_paths: string[] | null;
};

/**
 * Imágenes de free-exercise-db servidas por jsDelivr, fijadas al mismo commit con el que se
 * generó la migración 0006 (scripts/generate-exercise-images-migration.mjs).
 */
const IMAGE_BASE_URL =
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/";

export function exerciseImageUrl(path: string): string {
  return IMAGE_BASE_URL + path.split("/").map(encodeURIComponent).join("/");
}

/** Zonas del mapa corporal de react-muscle-highlighter. */
export type BodySlug =
  | "abs"
  | "obliques"
  | "adductors"
  | "biceps"
  | "calves"
  | "chest"
  | "deltoids"
  | "forearm"
  | "gluteal"
  | "hamstring"
  | "lower-back"
  | "neck"
  | "quadriceps"
  | "trapezius"
  | "triceps"
  | "upper-back";

/** Grupo muscular del dataset → zonas del mapa (el mapa no distingue dorsales de espalda media, ni abductores de glúteos). */
export const MUSCLE_BODY_SLUGS: Record<string, BodySlug[]> = {
  abdominals: ["abs", "obliques"],
  abductors: ["gluteal"],
  adductors: ["adductors"],
  biceps: ["biceps"],
  calves: ["calves"],
  chest: ["chest"],
  forearms: ["forearm"],
  glutes: ["gluteal"],
  hamstrings: ["hamstring"],
  lats: ["upper-back"],
  "lower back": ["lower-back"],
  "middle back": ["upper-back"],
  neck: ["neck"],
  quadriceps: ["quadriceps"],
  shoulders: ["deltoids"],
  traps: ["trapezius"],
  triceps: ["triceps"],
};

const FRONT_ONLY: BodySlug[] = ["abs", "obliques", "biceps", "chest", "quadriceps"];
const BACK_ONLY: BodySlug[] = ["upper-back", "lower-back", "gluteal", "hamstring"];

/** 1 = músculo principal, 2 = secundario (índice en la paleta de colores del mapa). */
export type BodyHighlight = { slug: BodySlug; intensity: 1 | 2 };

export function bodyHighlights(primary: string | null, secondaries: string[] | null): {
  highlights: BodyHighlight[];
  /** Vista que conviene mostrar primero: la del músculo principal. */
  mainSide: "front" | "back";
} {
  const bySlug = new Map<BodySlug, 1 | 2>();
  for (const muscle of secondaries ?? []) {
    for (const slug of MUSCLE_BODY_SLUGS[muscle] ?? []) bySlug.set(slug, 2);
  }
  // El principal se aplica al final para ganarle a un secundario en la misma zona.
  const primarySlugs = primary ? (MUSCLE_BODY_SLUGS[primary] ?? []) : [];
  for (const slug of primarySlugs) bySlug.set(slug, 1);

  const mainSide = primarySlugs.some((slug) => BACK_ONLY.includes(slug)) ? "back" : "front";
  return {
    highlights: [...bySlug].map(([slug, intensity]) => ({ slug, intensity })),
    mainSide,
  };
}

/** Si alguna zona resaltada solo se ve en esa vista. */
export function needsSide(highlights: BodyHighlight[], side: "front" | "back"): boolean {
  const exclusive = side === "front" ? FRONT_ONLY : BACK_ONLY;
  return highlights.some((h) => exclusive.includes(h.slug));
}

export const MUSCLE_GROUP_OPTIONS =Object.entries(MUSCLE_GROUP_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS).map(
  ([value, label]) => ({ value, label })
);
