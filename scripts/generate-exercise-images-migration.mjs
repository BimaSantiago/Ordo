// Genera supabase/migrations/00000000000006_exercise_images.sql a partir de free-exercise-db.
// Uso: node scripts/generate-exercise-images-migration.mjs
// El commit está fijado para que las rutas de imagen (y la URL del CDN en lib/exercises.ts) no cambien.
import { writeFile } from "node:fs/promises";

export const DATASET_COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5";
const SOURCE = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${DATASET_COMMIT}/dist/exercises.json`;
const OUTPUT = new URL("../supabase/migrations/00000000000006_exercise_images.sql", import.meta.url);

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const textArray = (values) =>
  values.length === 0 ? "'{}'::text[]" : `array[${values.map(quote).join(", ")}]::text[]`;

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`No se pudo descargar el dataset: ${response.status}`);
const exercises = await response.json();

const names = new Set(exercises.map((e) => e.name));
if (names.size !== exercises.length) throw new Error("El dataset tiene nombres repetidos; el update por nombre sería ambiguo.");

const rows = exercises.map((e) => `  (${quote(e.name)}, ${quote(e.id)}, ${textArray(e.images ?? [])})`);
const withImages = exercises.filter((e) => (e.images ?? []).length > 0).length;

const sql = `-- Imágenes de ejercicios desde free-exercise-db (dominio público, Unlicense), commit ${DATASET_COMMIT}.
-- Generado con scripts/generate-exercise-images-migration.mjs; no editar a mano.
-- ${exercises.length} ejercicios, ${withImages} con imágenes. Las rutas son relativas a
-- https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@<commit>/exercises/ (ver lib/exercises.ts).

alter table public.exercises
  add column source_id text,
  add column image_paths text[] not null default '{}';

update public.exercises e
set source_id = v.source_id, image_paths = v.image_paths
from (values
${rows.join(",\n")}
) as v(name, source_id, image_paths)
where e.name = v.name and e.user_id is null;
`;

await writeFile(OUTPUT, sql, "utf8");
console.log(`Escrito ${OUTPUT.pathname}: ${exercises.length} filas, ${withImages} con imágenes.`);
