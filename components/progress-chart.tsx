"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExerciseSessionPoint } from "@/lib/gimnasio/progress";

type Metric = "maxWeightKg" | "bestOneRepMax" | "volumeKg";

const METRICS: { value: Metric; label: string }[] = [
  { value: "maxWeightKg", label: "Peso máx." },
  { value: "bestOneRepMax", label: "1RM est." },
  { value: "volumeKg", label: "Volumen" },
];

export type BodyWeightPoint = { localDate: string; weightKg: number };

type ChartRow = { t: number; lift?: number; body?: number };

/** YYYY-MM-DD a milisegundos UTC, para un eje de tiempo real (distancia proporcional entre fechas). */
function toTime(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

const dateLabel = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

export function ProgressChart({ points, bodyWeight }: { points: ExerciseSessionPoint[]; bodyWeight: BodyWeightPoint[] }) {
  const [metric, setMetric] = useState<Metric>("bestOneRepMax");
  const [showBodyWeight, setShowBodyWeight] = useState(bodyWeight.length > 0);

  const data = useMemo(() => {
    const rows = new Map<number, ChartRow>();
    for (const point of points) {
      const t = toTime(point.localDate);
      rows.set(t, { ...rows.get(t), t, lift: point[metric] });
    }
    if (showBodyWeight) {
      for (const entry of bodyWeight) {
        const t = toTime(entry.localDate);
        rows.set(t, { ...rows.get(t), t, body: entry.weightKg });
      }
    }
    return [...rows.values()].sort((a, b) => a.t - b.t);
  }, [points, bodyWeight, metric, showBodyWeight]);

  if (points.length === 0) {
    return <p className="text-sm text-muted">Aún no hay series con peso para graficar.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {METRICS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMetric(option.value)}
            className={`pressable min-h-10 rounded-full px-3.5 text-sm font-semibold ${
              metric === option.value ? "bg-primary text-on-primary" : "border border-line bg-surface text-fg"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => dateLabel.format(t)}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
            />
            <YAxis yAxisId="lift" tick={{ fontSize: 11, fill: "var(--muted)" }} domain={["auto", "auto"]} />
            {showBodyWeight && (
              <YAxis yAxisId="body" orientation="right" tick={{ fontSize: 11, fill: "var(--muted)" }} domain={["auto", "auto"]} />
            )}
            <Tooltip
              labelFormatter={(t) => dateLabel.format(Number(t))}
              formatter={(value, name) => [`${Number(value).toLocaleString("es-MX")} kg`, name]}
            />
            <Line
              yAxisId="lift"
              dataKey="lift"
              name={METRICS.find((m) => m.value === metric)?.label}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            {showBodyWeight && (
              <Line
                yAxisId="body"
                dataKey="body"
                name="Peso corporal"
                stroke="var(--muted)"
                strokeDasharray="4 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {bodyWeight.length > 0 && (
        <label className="flex items-center gap-2 min-h-11 text-sm text-muted">
          <input type="checkbox" checked={showBodyWeight} onChange={(e) => setShowBodyWeight(e.target.checked)} />
          Mostrar peso corporal
        </label>
      )}
    </div>
  );
}
