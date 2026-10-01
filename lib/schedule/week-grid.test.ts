import { describe, expect, it } from "vitest";
import { assignLanes, buildWeekGrid, type GridBlock, type GridTask } from "./week-grid";

const WEEK = "2026-09-28"; // lunes

function block(overrides: Partial<GridBlock> = {}): GridBlock {
  return {
    id: "b1",
    categoryId: "calculo",
    categoryName: "Cálculo",
    categoryColor: "#2563eb",
    dayOfWeek: 1,
    startTime: "08:00:00",
    endTime: "09:30:00",
    notes: null,
    ...overrides,
  };
}

function task(overrides: Partial<GridTask> = {}): GridTask {
  return {
    id: "t1",
    title: "Tarea",
    dueDate: "2026-09-28",
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    startTime: null,
    endTime: null,
    completed: false,
    remindAt: null,
    ...overrides,
  };
}

describe("buildWeekGrid", () => {
  it("arma 7 días de lunes a domingo, cruzando de mes", () => {
    const grid = buildWeekGrid({ weekStart: WEEK, blocks: [], tasks: [] });
    expect(grid.days.map((d) => d.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(grid.days.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("coloca los bloques recurrentes en su día con su posición en minutos", () => {
    const grid = buildWeekGrid({ weekStart: WEEK, blocks: [block({ dayOfWeek: 3 })], tasks: [] });
    const wednesday = grid.days[2];
    expect(wednesday.blocks).toHaveLength(1);
    expect(wednesday.blocks[0]).toMatchObject({ startMin: 480, endMin: 570, lane: 0, lanes: 1 });
    expect(grid.days[0].blocks).toHaveLength(0);
  });

  it("adjunta una tarea sin hora al bloque de su materia ese día", () => {
    const grid = buildWeekGrid({
      weekStart: WEEK,
      blocks: [block()],
      tasks: [task({ categoryId: "calculo" })],
    });
    expect(grid.days[0].blocks[0].attachedTasks.map((t) => t.id)).toEqual(["t1"]);
    expect(grid.days[0].pendingTasks).toEqual([]);
  });

  it("manda a Pendientes la tarea sin hora si no hay bloque de su materia ese día", () => {
    const grid = buildWeekGrid({
      weekStart: WEEK,
      blocks: [block({ dayOfWeek: 2 })],
      tasks: [task({ categoryId: "calculo" }), task({ id: "t2", categoryId: null })],
    });
    expect(grid.days[0].pendingTasks.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("dibuja las actividades (tareas con hora) en su hora; sin fin duran 30 min", () => {
    const grid = buildWeekGrid({
      weekStart: WEEK,
      blocks: [],
      tasks: [task({ dueDate: "2026-10-03", startTime: "10:00:00" })],
    });
    expect(grid.days[5].timedTasks[0]).toMatchObject({ startMin: 600, endMin: 630 });
  });

  it("ignora tareas de otras semanas", () => {
    const grid = buildWeekGrid({ weekStart: WEEK, blocks: [], tasks: [task({ dueDate: "2026-10-05" })] });
    expect(grid.days.every((d) => d.pendingTasks.length === 0)).toBe(true);
  });

  it("amplía el rango de horas si algo cae fuera de 7 a 22", () => {
    const grid = buildWeekGrid({
      weekStart: WEEK,
      blocks: [block({ startTime: "05:30:00", endTime: "06:30:00" })],
      tasks: [task({ startTime: "22:30:00", endTime: "23:15:00" })],
    });
    expect(grid.startHour).toBe(5);
    expect(grid.endHour).toBe(24);
  });
});

describe("assignLanes", () => {
  it("separa en carriles lo que se encima y deja ancho completo lo que no", () => {
    const placed = assignLanes([
      { id: "a", startMin: 480, endMin: 540 },
      { id: "b", startMin: 510, endMin: 600 },
      { id: "c", startMin: 600, endMin: 660 },
    ]);
    const byId = Object.fromEntries(placed.map((p) => [p.id, p]));
    expect(byId.a).toMatchObject({ lane: 0, lanes: 2 });
    expect(byId.b).toMatchObject({ lane: 1, lanes: 2 });
    expect(byId.c).toMatchObject({ lane: 0, lanes: 1 });
  });

  it("reutiliza un carril libre dentro del mismo grupo", () => {
    const placed = assignLanes([
      { id: "a", startMin: 0, endMin: 100 },
      { id: "b", startMin: 10, endMin: 30 },
      { id: "c", startMin: 40, endMin: 60 },
    ]);
    const byId = Object.fromEntries(placed.map((p) => [p.id, p]));
    expect(byId.c.lane).toBe(1);
    expect(byId.a.lanes).toBe(2);
  });
});
