"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { movingAverage, type DatedValue } from "@/lib/body/trend";

/** YYYY-MM-DD a milisegundos UTC: eje de tiempo real (distancia proporcional entre fechas). */
function toTime(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

const dateLabel = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

/**
 * Registros como puntos y su media móvil como línea. Los colores salen de los tokens CSS para
 * funcionar en modo claro y oscuro.
 */
export function TrendChart({
  points,
  unit,
  trendLabel = "Tendencia (7 días)",
  height = 224,
}: {
  points: DatedValue[];
  unit: string;
  trendLabel?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Aún no hay registros en este periodo.</p>;
  }

  const trend = movingAverage(points);
  const trendByDate = new Map(trend.map((p) => [p.localDate, p.value]));
  const data = [...points]
    .sort((a, b) => a.localDate.localeCompare(b.localDate))
    .map((p) => ({ t: toTime(p.localDate), value: p.value, trend: trendByDate.get(p.localDate) }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => dateLabel.format(t)}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(v: number) => number.format(v)}
          />
          <Tooltip
            labelFormatter={(t) => dateLabel.format(Number(t))}
            formatter={(value, name) => [`${number.format(Number(value))} ${unit}`, name]}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }}
          />
          <Line
            dataKey="value"
            name="Registro"
            // Sin línea (solo puntos), pero con color: el tooltip usa el color de la serie para el texto.
            stroke="var(--muted)"
            strokeWidth={0}
            dot={{ r: 3, fill: "var(--muted)", stroke: "none" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="trend"
            name={trendLabel}
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
