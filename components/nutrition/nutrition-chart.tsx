"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NutritionChartPoint } from "@/lib/nutrition/summary";

/** YYYY-MM-DD a milisegundos UTC, para un eje de tiempo real (distancia proporcional entre fechas). */
function toTime(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dateLabel = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

/**
 * Calorías o proteína por día (barras, con la meta como línea punteada) y la tendencia del peso
 * corporal en el eje derecho, sobre la misma línea de tiempo.
 */
export function NutritionChart({
  points,
  metric,
  goal,
  weightUnit,
}: {
  points: NutritionChartPoint[];
  metric: "kcal" | "proteinG";
  goal: number | null;
  /** La tendencia del peso ya viene en esta unidad. */
  weightUnit: string;
}) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Aún no hay registros en este periodo.</p>;
  }

  const metricUnit = metric === "kcal" ? "kcal" : "g";
  const hasWeight = points.some((p) => p.weightTrend != null);
  const data = points.map((p) => ({ t: toTime(p.localDate), value: p[metric], weight: p.weightTrend }));
  const first = data[0].t;
  const last = data[data.length - 1].t;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: hasWeight ? 0 : 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            // Medio día de margen para que la primera y la última barra no queden cortadas.
            domain={[first - DAY_MS / 2, last + DAY_MS / 2]}
            tickFormatter={(t: number) => dateLabel.format(t)}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
          />
          <YAxis
            yAxisId="food"
            domain={[0, "auto"]}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(v: number) => number.format(v)}
          />
          {hasWeight && (
            <YAxis
              yAxisId="weight"
              orientation="right"
              domain={["auto", "auto"]}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(v: number) => number.format(v)}
            />
          )}
          <Tooltip
            labelFormatter={(t) => dateLabel.format(Number(t))}
            formatter={(value, name, item) => [
              `${number.format(Number(value))} ${item.dataKey === "weight" ? weightUnit : metricUnit}`,
              name,
            ]}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }}
          />
          <Bar
            yAxisId="food"
            dataKey="value"
            name={metric === "kcal" ? "Calorías" : "Proteína"}
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
          {goal != null && (
            <ReferenceLine yAxisId="food" y={goal} stroke="var(--fg)" strokeDasharray="4 3" strokeOpacity={0.5} />
          )}
          {hasWeight && (
            <Line
              yAxisId="weight"
              dataKey="weight"
              name="Peso (tendencia)"
              stroke="var(--muted)"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
