# Life OS: app personal de organización (PWA)

> Este archivo es el contexto completo del proyecto. Léelo antes de escribir código. Las decisiones marcadas como **Decidido** ya se tomaron con el usuario; no las vuelvas a discutir salvo que haya un bloqueo real.

## 1. Qué es y para quién

App personal, de un solo usuario, para organizar el día a día. Reemplaza el enfoque de "muchas apps sueltas" por un panel unificado que incluye su propio registro de entrenamientos.

**Problemas que debe resolver (en orden de prioridad):**
1. Mantener hábitos.
2. Organizar el día a día (agenda, horarios, tareas).
3. Horario semanal con materias/áreas (escuela y actividades como entrenar, estudiar, jugar) y las tareas de cada una vinculadas a su día.
4. Dar seguimiento a proyectos e ideas.
5. Registrar entrenamientos y ver la progresión por ejercicio y el peso corporal.
6. Control financiero.
7. Control alimenticio.
8. Notas importantes.

**Perfil de uso:**
- Usa sobre todo el **celular Android**; a veces la computadora.
- Zona horaria: **America/Mexico_City (UTC-06:00)**.
- Idioma de la interfaz: **español (México)**.
- Prioriza captura rápida: si registrar algo toma más de ~5 segundos, dejará de usarlo. Esto aplica especialmente al registro de series en el gimnasio.

## 2. Decisiones ya tomadas

- **Decidido: PWA** instalable en Android y utilizable en escritorio, una sola base de código.
- **Decidido: el registro de entrenamientos es un módulo propio de la app desde el inicio.** No depende de otras apps de gimnasio.
- **Decidido: comida = "camino A".** Se sigue usando **Fitia** para registrar comida. La app propia solo guarda los **totales diarios** (calorías, proteína, carbohidratos, grasa), capturados a mano en segundos. No se reconstruye una base de datos de alimentos.
- **Decidido: todo lo demás** (hábitos, día a día, proyectos, ideas, notas, finanzas, gimnasio, peso) vive en la app propia.

## 3. Stack

| Capa | Tecnología |
|---|---|
| App | Next.js (App Router) + React + TypeScript |
| Estilos | Tailwind CSS |
| Gráficas | Recharts |
| Base de datos y login | Supabase (Postgres, Auth, Row Level Security) |
| Hosting | Vercel |
| Modo sin conexión | Service worker + IndexedDB (p. ej. Dexie), con sincronización al recuperar señal |
| Automatizaciones | Supabase Edge Functions + cron (o n8n si hace falta) |
| Calendario | API de Google Calendar (OAuth), fase posterior |
| Biblioteca de ejercicios | free-exercise-db (datos abiertos, se siembra en la base) o API de wger; decidir al implementar |
| Envoltura nativa (solo si hace falta) | Capacitor, por ejemplo para leer Health Connect si Fitia escribe ahí |

Costo objetivo: 0 a 5 USD al mes.

## 4. Fases de desarrollo

**Fase 1 (empezar aquí): núcleo diario, horario/materias y gimnasio**, en tres hitos:

*Hito 1A: base y día a día*
- Login (Supabase Auth) y esqueleto de la app instalable como PWA.
- Vista "Hoy": tareas del día, hábitos del día, peso corporal, nota rápida.
- Hábitos: crear, marcar cumplido, rachas, historial semanal/mensual.
- Tareas: crear, fecha, prioridad, completar.
- Registro de peso corporal con gráfica de tendencia.
- Botón "+" siempre visible para captura rápida.
- Modo sin conexión básico.

*Hito 1C: materias y horario semanal* (detallado en la sección 5.1)
- "Materias" = categorías amplias: materias escolares (Cálculo, Química...) y bloques de vida diaria (entrenar, estudiar, jugar, etc.), cada una con nombre y color.
- Horario semanal recurrente (lunes a domingo) armado con bloques por materia/actividad, hora de inicio y fin.
- Las tareas se pueden vincular a una materia/actividad; la vista "Hoy" muestra el horario del día junto con las tareas de esas materias que vencen ese día.

*Hito 1B: módulo de gimnasio* (detallado en la sección 5)
- Biblioteca de ejercicios, rutinas, registro de entrenamiento en vivo, historial, récords y gráficas de progresión.

**Fase 2: finanzas y proyectos**
- Gastos e ingresos con categorías, presupuesto mensual, resumen.
- Proyectos con estado y próximos pasos, ideas, notas, revisión semanal (domingo).

**Fase 3: comida (camino A)**
- Captura de totales diarios (calorías, proteína, carbohidratos, grasa) y gráficas contra el peso corporal.
- Verificar si Fitia escribe en Health Connect; si es así, evaluar Capacitor para leerlo automáticamente.

Extras posteriores: sincronización con Google Calendar, notificaciones y recordatorios, resumen diario, exportación/respaldo.

## 5.1 Módulo de materias y horario semanal (requisitos)

**Materias/áreas** (`schedule_categories`): lista corta y personal de categorías con nombre, color y tipo libre (p. ej. "escuela" o "actividad") solo para agrupar visualmente — no hay lógica distinta por tipo. Crear, editar, archivar. Ejemplos: Cálculo, Química, Entrenamiento, Estudio, Ocio/Juego.

**Horario semanal** (`schedule_blocks`): bloques recurrentes por día de la semana (0=domingo..6=sábado) con hora de inicio, hora de fin, materia/actividad asociada y notas opcionales (p. ej. salón, liga). Se repiten cada semana; no son eventos de una fecha específica — para eso ya existen las tareas con `due_date`. Vista semanal tipo grid (columnas = días, franjas = horas) para ver y editar el horario de un vistazo. Pantalla propia (`/horario`) más gestión de materias (`/materias`).

**Vínculo con tareas:** `tasks.category_id` (opcional) conecta una tarea con una materia/actividad. La vista "Hoy" muestra, además de lo que ya tiene, los bloques del horario que tocan ese día de la semana y agrupa/etiqueta las tareas del día por su materia cuando aplica.

## 5. Módulo de gimnasio (requisitos)

**Prioridad absoluta: registrar una serie en dos toques.** Esta pantalla se usa en pleno entrenamiento, con una mano y a veces sin señal.

**Registro de entrenamiento en vivo**
- Iniciar entrenamiento vacío o desde una rutina.
- Por ejercicio: lista de series con peso, repeticiones y marca de completada. Mostrar en cada serie lo que se hizo en la sesión anterior del mismo ejercicio, como referencia.
- Tipos de serie: calentamiento, normal, al fallo, drop set. RPE opcional.
- Temporizador de descanso configurable que arranca al completar una serie.
- Agregar, reordenar y quitar ejercicios durante la sesión; notas por ejercicio y por entrenamiento.
- Duración total del entrenamiento y volumen acumulado en vivo.
- Un entrenamiento en curso debe sobrevivir a cierres de la app, pérdida de señal y recargas (guardado local continuo).

**Rutinas y biblioteca**
- Biblioteca de ejercicios con búsqueda, grupo muscular, equipo y ejercicios personalizados.
- Rutinas (plantillas) editables con ejercicios, series y rangos objetivo.

**Progreso**
- Historial de entrenamientos por fecha y por ejercicio.
- Por ejercicio: gráfica de peso máximo, 1RM estimado (fórmula de Epley) y volumen a lo largo del tiempo.
- Récords personales (peso, repeticiones, 1RM estimado, volumen de serie) con aviso al romper uno.
- Resumen semanal: sesiones, volumen por grupo muscular, frecuencia.
- Peso corporal junto a la progresión (misma línea de tiempo) y, opcionalmente, medidas corporales.

**Unidades:** kg por defecto, con opción de libras. Guardar internamente en kg.

## 6. Modelo de datos (borrador)

Todas las tablas llevan `user_id`, `created_at`, `updated_at` y **RLS activado**. Fechas y horas en UTC; mostrar en America/Mexico_City. Para hábitos, peso y comida, guardar también la "fecha local" (`local_date`) para que las rachas y cortes de día no se rompan por zona horaria. Los identificadores se generan en el cliente (UUID) para permitir crear datos sin conexión y sincronizar después.

- `habits` (nombre, frecuencia, meta, archivado)
- `habit_logs` (habit_id, local_date, cumplido, nota)
- `schedule_categories` (nombre, color, tipo, archivada) — materias escolares y actividades de vida diaria
- `schedule_blocks` (category_id, día de la semana 0-6, hora inicio, hora fin, notas) — horario semanal recurrente
- `tasks` (título, notas, fecha, prioridad, estado, project_id, category_id opcional → `schedule_categories`)
- `projects` (nombre, estado, descripción, próximos pasos)
- `ideas`, `notes`
- `body_weight_logs` (local_date, peso_kg)
- `body_measurements` (local_date, tipo, valor)
- `exercises` (nombre, grupo muscular primario y secundarios, equipo, es_personalizado)
- `routines` (nombre, notas)
- `routine_exercises` (routine_id, exercise_id, orden, series objetivo, rango de repeticiones)
- `workouts` (nombre, inicio, fin, notas, routine_id opcional)
- `workout_exercises` (workout_id, exercise_id, orden, notas)
- `workout_sets` (workout_exercise_id, orden, tipo, peso_kg, repeticiones, rpe opcional, completada)
- `personal_records` (exercise_id, tipo, valor, workout_set_id, fecha) o calculados por consulta
- `nutrition_daily` (local_date, kcal, proteína, carbohidratos, grasa, fuente = "manual/fitia")
- `transactions`, `categories`, `budgets`

## 7. Requisitos no funcionales

- **Móvil primero:** diseñar para pantalla chica y uso con el pulgar; escritorio como adaptación.
- **Captura rápida:** botón "+" global, formularios mínimos, valores por defecto inteligentes.
- **Offline:** registrar hábitos, tareas, peso, entrenamientos y gastos sin señal y sincronizar después, resolviendo conflictos de forma simple (última escritura gana, salvo casos justificados).
- **Seguridad:** datos sensibles (finanzas, peso). Auth con verificación en dos pasos, RLS estricto, sin secretos en el cliente, variables de entorno para claves.
- **Notificaciones:** en Android funcionan como PWA; en escritorio también. Dejar para después del hito 1B (el aviso de fin de descanso del temporizador puede resolverse dentro de la app mientras esté abierta).
- **Respaldo:** exportación de todos los datos (CSV/JSON).
- **Accesibilidad y rendimiento:** tema claro/oscuro, carga rápida, Lighthouse PWA en verde.

## 8. Cómo quiero que trabajes

- Empieza con un **plan corto** de la fase 1 y confírmalo antes de generar mucho código.
- Trabaja en incrementos pequeños y ejecutables; después de cada paso, indica cómo probarlo.
- Convenciones: TypeScript estricto, componentes pequeños, nombres de código en inglés y textos de interfaz en español, comentarios solo donde aporten.
- No agregues dependencias pesadas sin justificarlas.
- Escribe pruebas para la lógica delicada (rachas de hábitos, zonas horarias, cálculo de 1RM y récords, guardado y recuperación de un entrenamiento en curso).
- Crea un `README.md` con instrucciones de instalación, variables de entorno y despliegue.
- Ante ambigüedad importante, pregunta; para lo demás, elige el valor por defecto razonable y dilo.

## 9. Pendientes abiertos

- Definir el modelo de hábitos (diarios, por días de la semana, con meta numérica) con el usuario al iniciar la fase 1.
- Elegir la fuente de la biblioteca de ejercicios (free-exercise-db o wger) y revisar su licencia y cobertura de nombres en español.
- Confirmar si Fitia escribe en Health Connect.
- Decidir nombre y diseño visual de la app.

## 10. Primera tarea sugerida

Inicializa el proyecto Next.js con TypeScript y Tailwind, configura Supabase (Auth y migraciones SQL con RLS para las tablas del hito 1A), habilita el manifiesto y el service worker de la PWA, y construye la pantalla "Hoy" con hábitos, tareas y peso corporal, funcionando en móvil. Deja el esquema de gimnasio (sección 6) diseñado en las migraciones para el hito 1B.

**Estado:** hecho. Ver sección 11 para comandos y arquitectura del código ya generado.

## 11. Comandos y arquitectura del código

### Comandos

```bash
npm run dev       # servidor de desarrollo (Turbopack), http://localhost:3000
npm run build     # build de producción
npm run start     # sirve el build de producción
npm run lint       # ESLint (eslint-config-next)
npx tsc --noEmit  # chequeo de tipos, sin emitir archivos
```

No hay corredor de pruebas configurado todavía; cuando se agregue lógica delicada (rachas, 1RM, guardado de entrenamiento en curso, zonas horarias) instala Vitest y documenta aquí el comando.

### Convención de rutas (Next.js 16)

Este proyecto usa **Next.js 16**, que reemplazó la convención `middleware.ts` por **`proxy.ts`** (mismo propósito: se ejecuta en cada request que matchee `config.matcher`). La sesión de Supabase se refresca ahí. Al escribir código nuevo, ten en cuenta que Next 16 puede diferir de tu conocimiento previo de Next.js — revisa `node_modules/next/dist/docs/` y respeta los avisos de deprecación antes de usar una API que no hayas verificado en esta versión.

### Autenticación y RLS

- `proxy.ts` + `lib/supabase/middleware.ts`: en cada request, refresca la sesión de Supabase y redirige a `/login` si no hay usuario (excepto en `PUBLIC_PATHS` = `/login`, `/offline`); si ya hay sesión y se visita `/login`, redirige a `/hoy`.
- `lib/supabase/server.ts`: cliente de Supabase para Server Components y Server Actions (usa cookies de `next/headers`).
- `lib/supabase/client.ts`: cliente de Supabase para Client Components.
- Toda lectura/escritura a la base de datos depende de RLS (`auth.uid() = user_id`) definida en las migraciones — no hay una capa de autorización aparte en la app.

### Módulo "Hoy" (`app/hoy/`)

Patrón a seguir para las demás pantallas:
- `page.tsx` es un Server Component: lee todo con el cliente de servidor de Supabase (tareas y hábitos del día, log de hábito del día, peso del día vía `local_date` calculado con `lib/date.ts`) y renderiza.
- `actions.ts` son Server Actions (`"use server"`) que hacen la escritura (crear tarea/hábito, marcar hábito/tarea, guardar peso, nota rápida, cerrar sesión) y llaman `revalidatePath("/hoy")`.
- Los ids se generan en el servidor con `crypto.randomUUID()` en las Server Actions; cuando se implemente la sincronización offline (IndexedDB), los ids deberán generarse en el cliente para poder crear registros sin conexión, como indica la sección 6.
- Piezas interactivas mínimas (`task-item.tsx`, `habit-item.tsx`) son Client Components con `useTransition` que llaman a las Server Actions directamente — no hay una capa de estado global ni store del cliente.

### Módulos "Materias" (`app/materias/`) y "Horario" (`app/horario/`)

Mismo patrón que "Hoy": `page.tsx` Server Component + `actions.ts` con Server Actions que revalidan `/materias`, `/horario` y `/hoy` a la vez (comparten datos: una categoría archivada o un bloque nuevo deben reflejarse también en "Hoy"). `category-item.tsx` y `block-item.tsx` son los Client Components mínimos con `useTransition`, igual que `task-item.tsx`/`habit-item.tsx`.

`schedule_blocks.day_of_week` (0=domingo..6=sábado) se resuelve para "hoy" con `getLocalDayOfWeek()` en `lib/date.ts` — es aritmética de calendario, no depende de zona horaria del servidor. `AppNav` (`components/app-nav.tsx`) es la barra compartida (Hoy/Horario/Materias + Salir) que reemplaza el header suelto que tenía `app/hoy/page.tsx`; `signOut` sigue viviendo en `app/hoy/actions.ts` y se importa desde ahí.

### `lib/date.ts`

Centraliza el cálculo de `local_date` (America/Mexico_City) usado por hábitos, peso y (luego) comida, para que las rachas y los cortes de día no dependan de la zona horaria del servidor/cliente. Cualquier tabla con `local_date` debe calcularlo con `getLocalDateString()`, no con `new Date().toISOString()`. `getLocalDayOfWeek()` y `WEEKDAY_LABELS` sirven al horario semanal.

### Base de datos (`supabase/migrations/`)

Migraciones SQL planas (sin CLI de Supabase todavía integrada al flujo). Cada tabla sigue el mismo patrón: `user_id` + RLS con cuatro policies (`select`/`insert`/`update`/`delete` filtrando por `auth.uid() = user_id`) + trigger `set_updated_at`. `exercises` es la excepción: permite `user_id is null` para una futura biblioteca global de ejercicios compartida entre usuarios.

- `00000000000001_core.sql`: tablas del hito 1A (`projects`, `habits`, `habit_logs`, `tasks`, `ideas`, `notes`, `body_weight_logs`, `body_measurements`).
- `00000000000002_gimnasio.sql`: esquema completo del hito 1B (`exercises`, `routines`, `routine_exercises`, `workouts`, `workout_exercises`, `workout_sets`, `personal_records`), creado por adelantado pero sin UI todavía.
- `00000000000003_horario.sql`: hito 1C (`schedule_categories`, `schedule_blocks`) y columna `tasks.category_id`.

Al aplicar migraciones nuevas, sigue la convención de nombre `NNNNNNNNNNNNNN_descripcion.sql` (timestamp o número secuencial) para que se ejecuten en orden.

### PWA

- `public/manifest.json` + `public/icons/` (iconos placeholder generados a mano, sin diseño final — pendiente la sección 9 "decidir nombre y diseño visual de la app").
- `public/sw.js`: service worker manual (sin Workbox ni `next-pwa`): cachea assets estáticos con estrategia cache-first y muestra `/offline` cuando falla una navegación sin red. Se decidió no usar `next-pwa` porque está sin mantenimiento (última versión ~2022) y su cadena de dependencias (workbox-build/rollup-plugin-terser) tiene vulnerabilidades altas reportadas por `npm audit`.
- `components/service-worker-registration.tsx`: Client Component sin UI que registra `/sw.js` en `useEffect`; se monta desde `app/layout.tsx`.
- Aún no hay sincronización real de IndexedDB/Dexie para escritura offline — el service worker solo cachea lecturas y la página offline. Esto sigue pendiente para cumplir el requisito de "modo sin conexión básico" del hito 1A.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
