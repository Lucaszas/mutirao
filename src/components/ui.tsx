import Link from "next/link";
import type { HealthReport } from "@/guardiao/saude";

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h-display text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function FilterTabs({ base, current, options }: { base: string; current?: string; options: Record<string, string> }) {
  const item = (key: string | undefined, label: string) => (
    <Link
      key={key ?? "todos"}
      href={key ? `${base}?tipo=${key}` : base}
      className={`rounded-full px-3 py-1 text-sm ${current === key ? "bg-ink text-bg" : "bg-surface-2 text-muted hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {item(undefined, "Todos")}
      {Object.entries(options).map(([k, v]) => item(k, v))}
    </div>
  );
}

const levelColor: Record<HealthReport["level"], string> = {
  frágil: "text-danger",
  atenção: "text-sun",
  saudável: "text-leaf",
  florescendo: "text-leaf",
};

export function HealthMeter({ report }: { report: HealthReport }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid size-20 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--leaf) ${report.score * 3.6}deg, var(--surface-2) 0)` }}
        aria-label={`Saúde ${report.score} de 100`}
      >
        <div className="grid size-16 place-items-center rounded-full bg-surface text-xl font-bold">{report.score}</div>
      </div>
      <div>
        <p className="text-sm text-muted">Saúde da cooperativa</p>
        <p className={`h-display text-2xl capitalize ${levelColor[report.level]}`}>{report.level}</p>
      </div>
    </div>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface-2">
      <div className="h-2 rounded-full bg-leaf" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Selo discreto para dados fictícios (placeholders da versão de testes). */
export function DemoTag({ on }: { on?: boolean | null }) {
  if (!on) return null;
  return (
    <span
      title="Dado fictício, só para mostrar como a rede funciona"
      className="ml-2 inline-block rounded-full border border-dashed border-muted/60 px-2 py-0.5 align-middle font-sans text-[10px] font-medium uppercase tracking-wide text-muted"
    >
      exemplo
    </span>
  );
}
