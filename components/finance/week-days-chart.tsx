import { formatMoney } from "@/lib/finance/money";
import { cn } from "@/lib/cn";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const compact = new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 });

/** Gasto de cada día de la semana (lunes a domingo) en barras; hoy resaltado y los días futuros vacíos. */
export function WeekDaysChart({
  days,
  today,
}: {
  days: { localDate: string; income: number; expense: number }[];
  today: string;
}) {
  const max = Math.max(...days.map((d) => d.expense), 0);

  return (
    <div className="flex h-36 items-end gap-2" role="list" aria-label="Gasto por día">
      {days.map((day, i) => {
        const future = day.localDate > today;
        const height = max > 0 ? Math.max((day.expense / max) * 100, day.expense > 0 ? 6 : 0) : 0;
        return (
          <div
            key={day.localDate}
            role="listitem"
            aria-label={`${DAY_LETTERS[i]}: ${future ? "todavía no" : formatMoney(day.expense)}`}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[11px] font-semibold text-muted tabular-nums">
              {day.expense > 0 ? compact.format(day.expense) : ""}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn("w-full rounded-t-lg", day.localDate === today ? "bg-accent" : "bg-primary")}
                style={{ height: `${height}%` }}
              />
            </div>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                day.localDate === today ? "bg-accent text-on-accent" : future ? "text-muted/60" : "text-muted"
              )}
            >
              {DAY_LETTERS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
