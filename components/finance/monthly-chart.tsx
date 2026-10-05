"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/finance/money";

const monthLabel = new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" });
const compact = new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 });

function label(month: string) {
  const [year, m] = month.split("-").map(Number);
  return monthLabel.format(new Date(Date.UTC(year, m - 1, 1))).replace(".", "");
}

/** Ingresos contra gastos por mes. Colores de los tokens CSS (claro y oscuro). */
export function MonthlyChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  if (data.every((row) => row.income === 0 && row.expense === 0)) {
    return <p className="py-8 text-center text-sm text-muted">Aún no hay movimientos en estos meses.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="month" tickFormatter={label} tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <YAxis tickFormatter={(v: number) => compact.format(v)} tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            labelFormatter={(month) => label(String(month))}
            formatter={(value, name) => [formatMoney(Number(value)), name]}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <Bar dataKey="income" name="Ingresos" fill="var(--success)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="expense" name="Gastos" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
