import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <header className="space-y-1 pt-[max(0.5rem,env(safe-area-inset-top))]">
      {backHref && (
        <Link href={backHref} className="pressable -ml-1 inline-flex min-h-9 items-center gap-0.5 text-sm font-medium text-muted">
          <ChevronLeft size={18} aria-hidden />
          {backLabel}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted first-letter:uppercase">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
