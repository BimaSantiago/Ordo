# Life OS

App personal (PWA) para organizar hábitos, día a día, proyectos, entrenamientos, finanzas y notas. Ver `CLAUDE.md` para el contexto completo del producto y las decisiones de diseño.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, con Supabase (Postgres, Auth, RLS) y desplegado en Vercel.

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env.local` y llena los valores de tu proyecto de Supabase (Project Settings → API):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## Base de datos (Supabase)

Las migraciones SQL están en `supabase/migrations/`. Para aplicarlas a un proyecto de Supabase:

1. Instala la [Supabase CLI](https://supabase.com/docs/guides/cli).
2. `supabase link --project-ref <tu-project-ref>`
3. `supabase db push`

O bien copia y ejecuta el contenido de cada archivo, en orden, desde el SQL Editor del dashboard de Supabase.

`00000000000002_gimnasio.sql` crea el esquema del gimnasio (biblioteca de ejercicios, rutinas, entrenamientos, series y récords personales).

`00000000000003_horario.sql` agrega `schedule_categories` y `schedule_blocks` (materias/actividades y horario semanal, hito 1C) y una columna `category_id` en `tasks`.

`00000000000004_seed_exercises.sql` siembra 876 ejercicios de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público) en `exercises` como biblioteca global (`user_id null`), para el módulo de gimnasio.

`00000000000006_exercise_images.sql` agrega `source_id` e `image_paths` a `exercises` (fotos de free-exercise-db). Se genera con `node scripts/generate-exercise-images-migration.mjs`.

`00000000000005_tareas_con_hora.sql` agrega `start_time`, `end_time` y `remind_at` a `tasks`. Una tarea con hora es una "actividad" y se dibuja en su hora dentro de la tabla semanal. `remind_at` guarda el recordatorio elegido.

## Desarrollo

```bash
npm run dev       # servidor de desarrollo en http://localhost:3000
npm run build     # build de producción
npm run start     # sirve el build de producción
npm run lint      # ESLint
npx tsc --noEmit  # chequeo de tipos
npm run test      # Vitest
```

Para probar en el celular (misma red Wi-Fi): `npm run dev -- -H 0.0.0.0` y abre `http://<IP-de-tu-PC>:3000`. Esa IP debe estar en `allowedDevOrigins` de `next.config.ts`; si no, la página carga pero ningún botón responde. Los detalles táctiles (teclado, áreas seguras, respuesta al tocar) solo se aprecian en hardware real.

## PWA

El manifest está en `public/manifest.json` y el service worker en `public/sw.js` (registrado desde `components/service-worker-registration.tsx`). Cachea los assets estáticos y muestra `/offline` cuando no hay red al navegar.

En Android: abre la app en Chrome → menú → "Agregar a pantalla principal".

## Despliegue

Conecta el repositorio en [Vercel](https://vercel.com/new) y define las mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en la configuración del proyecto.
