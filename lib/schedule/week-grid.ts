import { addDaysToLocalDate, getLocalDayOfWeek, timeToMinutes } from "../date";

export type GridBlock = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  notes: string | null;
};

export type GridTask = {
  id: string;
  title: string;
  dueDate: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  startTime: string | null;
  endTime: string | null;
  completed: boolean;
  remindAt: string | null;
};

type Placement = { startMin: number; endMin: number; lane: number; lanes: number };

export type PlacedBlock = GridBlock & Placement & { attachedTasks: GridTask[] };
export type PlacedTask = GridTask & Placement;

export type DayColumn = {
  date: string;
  dayOfWeek: number;
  blocks: PlacedBlock[];
  timedTasks: PlacedTask[];
  /** Tareas sin hora que no tienen un bloque de su materia ese día. */
  pendingTasks: GridTask[];
};

export type WeekGrid = {
  weekStart: string;
  days: DayColumn[];
  startHour: number;
  endHour: number;
};

/** Duración con la que se dibuja una actividad sin hora de fin. */
export const DEFAULT_TASK_MINUTES = 30;
export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 22;

/**
 * Reparte en carriles los elementos que se enciman: cada grupo de elementos que se tocan
 * comparte el ancho de la columna (`lanes`) y cada uno ocupa su carril (`lane`).
 */
export function assignLanes<T extends { startMin: number; endMin: number }>(items: T[]): (T & { lane: number; lanes: number })[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const result: (T & { lane: number; lanes: number })[] = [];
  let cluster: (T & { lane: number; lanes: number })[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const closeCluster = () => {
    const lanes = laneEnds.length;
    for (const item of cluster) item.lanes = lanes;
    result.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.startMin >= clusterEnd && cluster.length > 0) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length > 0) closeCluster();
  return result;
}

export function buildWeekGrid({
  weekStart,
  blocks,
  tasks,
}: {
  weekStart: string;
  blocks: GridBlock[];
  tasks: GridTask[];
}): WeekGrid {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  const extendRange = (startMin: number, endMin: number) => {
    startHour = Math.min(startHour, Math.floor(startMin / 60));
    endHour = Math.max(endHour, Math.min(24, Math.ceil(endMin / 60)));
  };

  const days: DayColumn[] = Array.from({ length: 7 }, (_, offset) => {
    const date = addDaysToLocalDate(weekStart, offset);
    const dayOfWeek = getLocalDayOfWeek(date);
    const dayTasks = tasks.filter((t) => t.dueDate === date);

    const blockItems = blocks
      .filter((b) => b.dayOfWeek === dayOfWeek)
      .map((b) => ({
        kind: "block" as const,
        block: b,
        startMin: timeToMinutes(b.startTime),
        endMin: timeToMinutes(b.endTime),
      }));

    const taskItems = dayTasks
      .filter((t) => t.startTime)
      .map((t) => {
        const startMin = timeToMinutes(t.startTime!);
        const endMin = t.endTime ? timeToMinutes(t.endTime) : Math.min(startMin + DEFAULT_TASK_MINUTES, 24 * 60);
        return { kind: "task" as const, task: t, startMin, endMin };
      });

    const placed = assignLanes([...blockItems, ...taskItems]);
    const placedBlocks: PlacedBlock[] = [];
    const timedTasks: PlacedTask[] = [];
    for (const item of placed) {
      extendRange(item.startMin, item.endMin);
      const placement = { startMin: item.startMin, endMin: item.endMin, lane: item.lane, lanes: item.lanes };
      if (item.kind === "block") placedBlocks.push({ ...item.block, ...placement, attachedTasks: [] });
      else timedTasks.push({ ...item.task, ...placement });
    }
    placedBlocks.sort((a, b) => a.startMin - b.startMin);

    const pendingTasks: GridTask[] = [];
    for (const task of dayTasks.filter((t) => !t.startTime)) {
      const block = task.categoryId ? placedBlocks.find((b) => b.categoryId === task.categoryId) : undefined;
      if (block) block.attachedTasks.push(task);
      else pendingTasks.push(task);
    }

    return { date, dayOfWeek, blocks: placedBlocks, timedTasks, pendingTasks };
  });

  return { weekStart, days, startHour, endHour };
}
