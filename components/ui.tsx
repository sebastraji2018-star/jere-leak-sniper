import Link from "next/link";
import type { LeakStatus, RiskLevel } from "@/lib/types";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-ink-900/60 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    alto: "border-risk-alto/40 bg-risk-alto/10 text-risk-alto",
    medio: "border-gold/40 bg-gold/10 text-gold-300",
    bajo: "border-risk-bajo/40 bg-risk-bajo/10 text-risk-bajo",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[level]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}

export function StatusPill({ status }: { status: "active" | "paused" }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-risk-bajo/40 bg-risk-bajo/10 px-2.5 py-0.5 text-xs font-medium text-risk-bajo">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/50">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Pausado
    </span>
  );
}

const LEAK_STATUS_STYLE: Record<LeakStatus, string> = {
  nueva: "border-gold/50 bg-gold/15 text-gold-300",
  revisada: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  takedown_enviado: "border-orange-400/40 bg-orange-400/10 text-orange-300",
  resuelta: "border-risk-bajo/40 bg-risk-bajo/10 text-risk-bajo",
};
const LEAK_STATUS_LABEL: Record<LeakStatus, string> = {
  nueva: "Nueva",
  revisada: "Revisada",
  takedown_enviado: "Takedown enviado",
  resuelta: "Resuelta",
};

export function LeakStatusPill({ status }: { status: LeakStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEAK_STATUS_STYLE[status]}`}
    >
      {LEAK_STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  icon = "🎯",
  cta,
}: {
  title: string;
  hint?: string;
  icon?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
      <div className="mb-3 text-3xl opacity-70">{icon}</div>
      <p className="font-medium text-white/80">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-white/40">{hint}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-300"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
