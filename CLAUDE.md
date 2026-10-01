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
| Biblioteca de ejercicios | **Decidido: free-exercise-db** (datos abiertos, dominio público, sembrados en la base) |
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
npm run test      # Vitest (modo run, sin watch)
```

Vitest cubre la lógica delicada: guardado/recuperación del entrenamiento en curso (`lib/gimnasio/workout-draft.test.ts`, usando `fake-indexeddb` para simular IndexedDB en Node vía `vitest.setup.mts`), los cálculos en vivo de duración/volumen (`lib/gimnasio/live-stats.test.ts`), 1RM y récords (`lib/gimnasio/records.test.ts`), agregaciones de progreso (`lib/gimnasio/progress.test.ts`) y fechas locales/semana (`lib/date.test.ts`). El config vive en `vitest.config.mts` (extensión `.mts`, no `.ts`, para que Vite no advierta por sintaxis ESM en un archivo cargado como CommonJS).

### Convención de rutas (Next.js 16)

Este proyecto usa **Next.js 16**, que reemplazó la convención `middleware.ts` por **`proxy.ts`** (mismo propósito: se ejecuta en cada request que matchee `config.matcher`). La sesión de Supabase se refresca ahí. Al escribir código nuevo, ten en cuenta que Next 16 puede diferir de tu conocimiento previo de Next.js — revisa `node_modules/next/dist/docs/` y respeta los avisos de deprecación antes de usar una API que no hayas verificado en esta versión.

### Autenticación y RLS

- `proxy.ts` + `lib/supabase/middleware.ts`: en cada request, refresca la sesión de Supabase y redirige a `/login` si no hay usuario (excepto en `PUBLIC_PATHS` = `/login`, `/offline`); si ya hay sesión y se visita `/login`, redirige a `/hoy`.
- `lib/supabase/server.ts`: cliente de Supabase para Server Components y Server Actions (usa cookies de `next/headers`).
- `lib/supabase/client.ts`: cliente de Supabase para Client Components.
- Toda lectura/escritura a la base de datos depende de RLS (`auth.uid() = user_id`) definida en las migraciones — no hay una capa de autorización aparte en la app.

### Sistema visual y navegación

- **Tokens de color** en `app/globals.css` (claro y oscuro con `prefers-color-scheme`), expuestos a Tailwind con `@theme inline`: `canvas`, `surface`, `surface-2`, `fg`, `muted`, `line`, `primary` (teal), `primary-soft`, `on-primary`, `accent` (naranja, solo para el "+"), `danger`, `success`. **No uses `slate-*`, `white` ni hex en componentes**: usa `bg-surface text-fg border-line`, etc. Las excepciones son los colores de las materias (vienen de la base) y el texto blanco sobre ellos.
- Fuente Plus Jakarta Sans (`next/font`, variable `--font-jakarta`). Iconos de `lucide-react` (SVG, sin emojis); los botones que solo tienen icono llevan `aria-label`.
- Base móvil en `globals.css`: sin destello al tocar, `overscroll-behavior: none`, inputs de 16px (evita el zoom de iOS), clase `.pressable` para dar respuesta al presionar. `viewport` con `viewportFit: "cover"` y `themeColor` por esquema; las barras fijas usan `env(safe-area-inset-*)`.
- Primitivas en `components/ui/`: `Page` (contenedor con espacio para la barra inferior; `wide` para la tabla semanal), `PageHeader` (título y enlace de regreso), `Card`/`SectionTitle`, `Button`, `IconButton`, `Chip` y `Sheet` (panel inferior sobre `<dialog>` nativo, con foco atrapado y cierre con Esc/atrás).
- `components/bottom-nav.tsx`: barra inferior (Hoy, Semana, **+**, Gimnasio, Más), montada una vez en `app/layout.tsx` y oculta en `/login` y `/offline`. `/mas` agrupa Materias, Recordatorios y Cerrar sesión (`signOut` vive en `app/mas/actions.ts`).
- **Panel rápido** (`components/quick-add/`): `QuickAddProvider` en el layout expone `useQuickAdd().open(prefill)` y `showToast`. Pestañas: Tarea, Actividad, Hábito, Peso y Nota. `prefill` permite abrirlo con día, hora, materia o una tarea existente (`task`, para editarla o eliminarla). Desde Server Components se abre con `QuickAddButton`.

### Módulo "Hoy" (`app/hoy/`)

Patrón a seguir para las demás pantallas:
- `page.tsx` es un Server Component: lee todo con el cliente de servidor de Supabase (tareas, bloques y hábitos del día, peso vía `local_date` calculado con `lib/date.ts`) y renderiza. Muestra resumen, "Tu día" (bloques y actividades por hora), tareas y hábitos. Ya no tiene formularios: todo se captura con el "+".
- Las Server Actions regresan `{ ok: true } | { ok: false, error }` (`ActionResult`) para que el panel muestre errores. Las tareas viven en `app/tareas/actions.ts` (`saveTask` crea o actualiza con un **id generado en el cliente**, `toggleTask`, `deleteTask`, que revalidan `/hoy` y `/horario`). Hábito, peso y nota están en `app/hoy/actions.ts`.
- Las piezas interactivas (`components/task-row.tsx`, `app/hoy/habit-item.tsx`) usan `useOptimistic` y `useTransition` y llaman a las Server Actions directamente; no hay store global.

### Módulos "Materias" (`app/materias/`) y "Semana" (`app/horario/`)

**Actividad = tarea con hora** (`tasks.start_time`/`end_time`, migración 0005). No hay una tabla aparte.

`app/horario/` es la **tabla semanal editable** (lunes a domingo, `?semana=YYYY-MM-DD`):
- Lógica pura en `lib/schedule/week-grid.ts` (`buildWeekGrid`, probada en `week-grid.test.ts`): bloques recurrentes y actividades se posicionan por minutos y se reparten en carriles si se enciman (`assignLanes`). Una tarea **sin hora con materia se adjunta al bloque de esa materia ese día** (contador en el bloque); si no hay bloque, va a la fila "Pendientes". El rango de horas es de 7 a 22 por defecto y se amplía si algo cae fuera.
- `week-grid-view.tsx` (Client):
  - Tocar un espacio vacío da a elegir entre "Clase o actividad fija" (bloque, abre `block-editor-sheet.tsx`) y "Actividad solo este día" (abre el panel rápido con fecha y hora).
  - Tocar un bloque lo edita o elimina; tocar una actividad abre el panel para editarla.
  - Tocar el encabezado de un día abre todo lo de ese día.
- `saveBlock(input)` en `app/horario/actions.ts` crea o actualiza con el id del cliente.

En Materias, `category-item.tsx` edita en un `Sheet` (nombre, tipo, color de `lib/schedule/colors.ts`, archivar, eliminar). `createCategoryQuick` permite crear una materia en línea desde `components/category-picker.tsx` (panel rápido y editor de bloques) y la deja seleccionada.

**Recordatorios:** `tasks.remind_at` se calcula en el cliente con `computeRemindAt` (`lib/reminders.ts`, en America/Mexico_City vía `localDateTimeToUtcIso`). La entrega por Web Push (suscripciones, Edge Function con cron y columna `reminded_at`) está pendiente.

`schedule_blocks.day_of_week` (0=domingo..6=sábado) se resuelve con `getLocalDayOfWeek()` en `lib/date.ts`; es aritmética de calendario y no depende de la zona horaria del servidor.

### Módulo "Gimnasio" (`app/gimnasio/`)

Hub en `/gimnasio` con enlaces a `/gimnasio/entrenar`, `/gimnasio/progreso`, `/gimnasio/rutinas` y `/gimnasio/ejercicios`. Ejercicios, rutinas y progreso siguen el patrón `page.tsx`/`actions.ts` ya establecido. `entrenar/` es distinto porque su estado vive primero en el navegador:

- `lib/gimnasio/workout-draft.ts`: Dexie (`life-os-gimnasio`, tabla `drafts`) guarda el **entrenamiento en curso** bajo una llave fija (`draft.id = "active"`, solo puede haber uno). Esa llave **no** es el id del entrenamiento: `draft.workoutId` es el UUID que se guarda en `workouts.id`, estable entre recargas para que reintentar `finishWorkout` sea idempotente. `workout-session.tsx` (Client Component) lee/escribe ahí en cada cambio — así la sesión sobrevive a cierres de la app, recargas y pérdida de señal sin depender de Supabase mientras se entrena.
- `lib/gimnasio/live-stats.ts`: cálculos puros (duración transcurrida, volumen, series completadas) sobre el draft, cubiertos por Vitest.
- `app/gimnasio/entrenar/actions.ts`: `getPreviousExerciseSets` (referencia de la sesión anterior por ejercicio) y `finishWorkout` (vuelca el draft a `workouts`/`workout_exercises`/`workout_sets` con upserts en lote, detecta e inserta récords en `personal_records` y regresa `{ ok, newRecords }` o `{ ok: false, error }`). El cliente **solo borra Dexie si `ok`**; si falla, el entrenamiento sigue en pantalla para reintentar. Solo se toca Supabase al agregar ejercicios, consultar referencia o finalizar — nunca en cada tecla.
- `lib/gimnasio/records.ts`: 1RM con Epley, valores de récord por serie y `detectNewRecords` (solo superar cuenta; un empate no). Las series de **calentamiento no cuentan** para récords ni volumen (tampoco en el volumen en vivo); al fallo y drop set sí. Los récords se calculan solo al finalizar un entrenamiento.
- `lib/gimnasio/progress.ts`: agregaciones puras (resumen de entrenamiento, resumen semanal con volumen por grupo muscular, un punto por sesión para las gráficas por ejercicio). `lib/gimnasio/workout-rows.ts` tiene el select anidado de PostgREST y lo mapea a tipos (`numeric` puede llegar como string).
- `app/gimnasio/progreso/`: resumen de la semana (lunes a domingo, `getLocalWeekStart` en `lib/date.ts`), historial, detalle por entrenamiento (`[workoutId]`) y vista por ejercicio (`ejercicio/[exerciseId]`) con récords y gráfica. La gráfica es `components/progress-chart.tsx` (Client Component con Recharts) e incluye la línea de peso corporal de `body_weight_logs` en el mismo eje de tiempo.
- **Imágenes y mapa muscular** (`components/exercise/`):
  - `exercise-thumb.tsx`: miniatura fija para listas.
  - `exercise-animation.tsx`: foto inicial y final alternando como GIF con la animación CSS `.exercise-anim` de `globals.css`; tocar pausa.
  - `muscle-map.tsx`: silueta de frente y espalda con `react-muscle-highlighter`; principal en `--accent`, secundarios en `--primary`, con leyenda en texto.
  - `exercise-detail-sheet.tsx`: junta todo. Carga el mapa con `next/dynamic` porque sus trazos SVG pesan unos 50 KB.
  - Las fotos vienen de free-exercise-db vía jsDelivr, **fijadas a un commit**. La constante está en `lib/exercises.ts` (`exerciseImageUrl`) y debe coincidir con `DATASET_COMMIT` de `scripts/generate-exercise-images-migration.mjs`, que genera la migración 0006.
  - `public/sw.js` las guarda en el caché `life-os-img-v1` (cache-first) para verlas sin señal.
  - Las consultas que muestran ejercicios usan `EXERCISE_INFO_COLUMNS` y el tipo `ExerciseInfo`.
- `lib/exercises.ts`: traduce a español grupo muscular/equipo de los ejercicios sembrados desde free-exercise-db (que quedan en inglés en la base, ver `supabase/migrations/00000000000004_seed_exercises.sql`) sin bifurcar la fuente de datos.
- Notificaciones del temporizador de descanso (`rest-timer.tsx`) son in-app únicamente (cuenta regresiva visible), como indica la sección 7 hasta que se implementen push notifications.

### Ids en el cliente y pruebas desde el celular

- Usa siempre `createId()` de `lib/uuid.ts` en código que corre en el navegador, **nunca `crypto.randomUUID()`**. `randomUUID` solo existe en contextos seguros (HTTPS o localhost). Al abrir la app desde el celular por `http://<IP-de-la-PC>:3000` no existe, y guardar un bloque, una tarea o una serie fallaba. En las Server Actions (Node) sí se puede usar `randomUUID` de `crypto`.
- `next.config.ts` → `allowedDevOrigins` incluye la IP local de la PC. Next 16 bloquea los recursos de desarrollo pedidos desde otros hosts y la página carga pero **no se hidrata**: ningún botón responde. Si la IP cambia, hay que actualizarla.

### `lib/date.ts`

Centraliza el cálculo de `local_date` (America/Mexico_City) usado por hábitos, peso y (luego) comida, para que las rachas y los cortes de día no dependan de la zona horaria del servidor/cliente. Cualquier tabla con `local_date` debe calcularlo con `getLocalDateString()`, no con `new Date().toISOString()`. `getLocalDayOfWeek()` y `WEEKDAY_LABELS` sirven al horario semanal.

### Base de datos (`supabase/migrations/`)

Migraciones SQL planas (sin CLI de Supabase todavía integrada al flujo). Cada tabla sigue el mismo patrón: `user_id` + RLS con cuatro policies (`select`/`insert`/`update`/`delete` filtrando por `auth.uid() = user_id`) + trigger `set_updated_at`. `exercises` es la excepción: permite `user_id is null` para una futura biblioteca global de ejercicios compartida entre usuarios.

- `00000000000001_core.sql`: tablas del hito 1A (`projects`, `habits`, `habit_logs`, `tasks`, `ideas`, `notes`, `body_weight_logs`, `body_measurements`).
- `00000000000002_gimnasio.sql`: esquema completo del hito 1B (`exercises`, `routines`, `routine_exercises`, `workouts`, `workout_exercises`, `workout_sets`, `personal_records`), creado por adelantado pero sin UI todavía.
- `00000000000003_horario.sql`: hito 1C (`schedule_categories`, `schedule_blocks`) y columna `tasks.category_id`.
- `00000000000006_exercise_images.sql`: `exercises.source_id` e `image_paths` (rutas relativas de las fotos). Es **generada** por `scripts/generate-exercise-images-migration.mjs`: no se edita a mano.
- `00000000000005_tareas_con_hora.sql`: `tasks.start_time`, `end_time` y `remind_at`, más índices por `due_date` y `remind_at`.
- `00000000000004_seed_exercises.sql`: siembra 876 ejercicios de free-exercise-db en `exercises` con `user_id null` (biblioteca global). Nombres y grupos musculares en inglés tal cual el dataset; ver `lib/exercises.ts` para la traducción en la capa de presentación.

Al aplicar migraciones nuevas, sigue la convención de nombre `NNNNNNNNNNNNNN_descripcion.sql` (timestamp o número secuencial) para que se ejecuten en orden.

### PWA

- `public/manifest.json` + `public/icons/` (iconos placeholder generados a mano, sin diseño final — pendiente la sección 9 "decidir nombre y diseño visual de la app").
- `public/sw.js`: service worker manual, sin Workbox ni `next-pwa`. Se descartó `next-pwa` porque no tiene mantenimiento y su cadena de dependencias tiene vulnerabilidades altas en `npm audit`.
  - Assets: cache-first en producción. En desarrollo se registra como `/sw.js?dev=1` y va primero a la red para no servir código viejo de Turbopack.
  - Pantallas: red primero, con respaldo de la última copia (`life-os-pages-v1`) o `/offline`. Las peticiones RSC de Next no se cachean; si fallan, Next recarga la página completa y esa recarga sale del caché.
  - Fotos de ejercicios: cache-first.
  - "Cerrar sesión" (`app/mas/sign-out-button.tsx`) borra las pantallas guardadas, porque tienen datos personales.
  - El SW **solo funciona en contextos seguros**: con `http://IP-local` no se registra. La lectura sin conexión se prueba en `localhost` o en el despliegue con HTTPS.
- `components/service-worker-registration.tsx`: registra el SW. También exporta `clearCachedPages()`.

### Modo sin conexión (escrituras)

- **Toda escritura que deba funcionar sin señal pasa por `runOrQueue(kind, payload, label)`** (`components/offline/run-or-queue.ts`):
  - si no hay señal o la red falla, la guarda en la cola de Dexie `life-os-outbox` (`lib/offline/outbox.ts`, con pruebas);
  - un rechazo del servidor (`{ ok: false }`) se regresa como error y no se encola.
- Para agregar una acción nueva hay que **registrarla en `EXECUTORS`**.
- La acción debe ser **idempotente**:
  - id generado con `createId()` y `upsert`;
  - fecha local mandada por el cliente al momento de tocar (`setHabitLog`, `saveWeight`), no calculada en el servidor;
  - valores absolutos, no incrementos.
  - Regresa `ActionResult`.
- `SyncProvider` (`components/offline/sync-provider.tsx`) reproduce la cola en orden (FIFO):
  - cuándo: al abrir la app, al recuperar señal, al volver a la pestaña y cada 30 s;
  - un error de red detiene la cola; un rechazo del servidor descarta solo ese elemento y lo muestra;
  - después de sincronizar hace `router.refresh()`.
- `ConnectionStatus` es el aviso de arriba ("Sin conexión · N cambios pendientes", "Sincronizando…").
- En la interfaz usa `useLocalOverride` (`components/offline/use-local-override.ts`) en lugar de `useOptimistic`. `useOptimistic` se revierte al terminar la acción y desharía un cambio que quedó en la cola.
- `finishWorkout` sin señal también va a la cola. Los récords se calculan cuando se sube.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
