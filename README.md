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

Las tablas de `00000000000002_gimnasio.sql` (biblioteca de ejercicios, rutinas, entrenamientos) quedan creadas desde ahora para el hito 1B, aunque la interfaz de esta fase todavía no las use.

`00000000000003_horario.sql` agrega `schedule_categories` y `schedule_blocks` (materias/actividades y horario semanal, hito 1C) y una columna `category_id` en `tasks`.

`00000000000004_seed_exercises.sql` siembra 876 ejercicios de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público) en `exercises` como biblioteca global (`user_id null`), para el módulo de gimnasio.

## Desarrollo

```bash
npm run dev       # servidor de desarrollo en http://localhost:3000
npm run build     # build de producción
npm run start     # sirve el build de producción
npm run lint      # ESLint
npx tsc --noEmit  # chequeo de tipos
npm run test      # Vitest
```

## PWA

El manifest está en `public/manifest.json` y el service worker en `public/sw.js` (registrado desde `components/service-worker-registration.tsx`). Cachea los assets estáticos y muestra `/offline` cuando no hay red al navegar.

## Despliegue

Conecta el repositorio en [Vercel](https://vercel.com/new) y define las mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en la configuración del proyecto.
