"use client";

import { useMemo, useState } from "react";
import type { LeakStatus } from "@/lib/types";
import { updateLeakStatus } from "@/app/actions";
import { LeakStatusPill } from "@/components/ui";

export interface LeakRow {
  id: string;
  title: string | null;
  channel: string | null;
  url: string | null;
  platform: string;
  views: number | null;
  status: LeakStatus;
  detected_at: string;
  published_at: string | null;
  artist_id: string;
  artist_name: string;
}

const STATUSES: LeakStatus[] = ["nueva", "revisada", "takedown_enviado", "resuelta"];
const STATUS_LABEL: Record<LeakStatus, string> = {
  nueva: "Nueva",
  revisada: "Revisada",
  takedown_enviado: "Takedown enviado",
  resuelta: "Resuelta",
};

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Ventana: últimos 6 meses hasta hoy (y futuro)
const MONTHS_BACK = 6;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function LeaksTable({
  initial,
  artists,
}: {
  initial: LeakRow[];
  artists: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState<LeakRow[]>(initial);
  const [fArtist, setFArtist] = useState<string>("all");
  const [fPlatform, setFPlatform] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const platforms = useMemo(
    () => Array.from(new Set(rows.map((r) => r.platform))),
    [rows]
  );

  // Corte: 6 meses atrás desde el inicio del mes actual
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - MONTHS_BACK, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const leakDate = (r: LeakRow) => new Date(r.published_at || r.detected_at);

  // Filtrar + agrupar por AÑO-MES (descendente)
  const { groups, total } = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (fArtist !== "all" && r.artist_id !== fArtist) return false;
      if (fPlatform !== "all" && r.platform !== fPlatform) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      const t = leakDate(r).getTime();
      if (isNaN(t) || t < cutoff) return false; // solo últimos 6 meses
      return true;
    });

    const map = new Map<string, { label: string; sort: string; rows: LeakRow[] }>();
    for (const r of filtered) {
      const d = leakDate(r);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const label = `${MONTHS[m]} ${y}`;
      if (!map.has(key)) map.set(key, { label, sort: key, rows: [] });
      map.get(key)!.rows.push(r);
    }
    // ordenar rows de cada grupo por fecha desc
    const all = Array.from(map.values());
    for (const g of all) {
      g.rows.sort((a, b) => leakDate(b).getTime() - leakDate(a).getTime());
    }
    const groups = all.sort((a, b) => (a.sort < b.sort ? 1 : -1));
    return { groups, total: filtered.length };
  }, [rows, fArtist, fPlatform, fStatus, cutoff]);

  async function changeStatus(id: string, status: LeakStatus) {
    const prev = rows.find((r) => r.id === id)?.status;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await updateLeakStatus(id, status);
    if (!res.ok && prev) {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, status: prev } : x)));
      setError(res.error || "No se pudo actualizar el estado.");
      setTimeout(() => setError(null), 5000);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-risk-alto/30 bg-risk-alto/10 px-3 py-2 text-sm text-risk-alto">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={fArtist} onChange={setFArtist} label="Artista">
          <option value="all">Todos los artistas</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select value={fPlatform} onChange={setFPlatform} label="Plataforma">
          <option value="all">Todas las plataformas</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={fStatus} onChange={setFStatus} label="Estado">
          <option value="all">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <span className="ml-auto self-center font-mono text-xs text-white/35">
          {total} resultado(s) · últimos {MONTHS_BACK} meses
        </span>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
          <div className="mb-2 text-3xl opacity-70">🛡️</div>
          <p className="font-medium text-white/80">Sin filtraciones</p>
          <p className="mt-1 text-sm text-white/40">
            {rows.length === 0
              ? "Cuando el motor detecte algo, aparecerá aquí agrupado por mes."
              : "Ninguna coincide con los filtros (últimos 6 meses)."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.sort}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-lg font-bold text-white/90">
                  {group.label}
                </h2>
                <span className="font-mono text-xs text-white/35">
                  {group.rows.length} filtración(es)
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                {group.rows.map((leak, i) => (
                  <div
                    key={leak.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02] ${
                      i !== group.rows.length - 1 ? "border-b border-white/5" : ""
                    }`}
                  >
                    <div className="min-w-[180px] flex-1">
                      <div className="truncate text-sm font-medium text-white/90">
                        {leak.title || "(sin título)"}
                      </div>
                      <div className="truncate text-xs text-white/35">{leak.channel}</div>
                    </div>
                    <span className="w-28 shrink-0 truncate text-sm text-white/70">
                      {leak.artist_name}
                    </span>
                    <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-xs capitalize text-white/60">
                      {leak.platform}
                    </span>
                    <span className="hidden w-24 shrink-0 text-right font-mono text-xs text-white/45 sm:block">
                      {fmtDate(leak.published_at || leak.detected_at)}
                    </span>
                    <LeakStatusPill status={leak.status} />
                    <select
                      value={leak.status}
                      onChange={(e) => changeStatus(leak.id, e.target.value as LeakStatus)}
                      className="shrink-0 rounded-md border border-white/10 bg-ink-900 px-2 py-1 text-xs outline-none focus:border-gold/60"
                      aria-label="Cambiar estado"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    {leak.url && (
                      <a
                        href={leak.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-sm font-medium text-gold hover:underline"
                      >
                        Ver →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white/80 outline-none focus:border-gold/60"
    >
      {children}
    </select>
  );
}
