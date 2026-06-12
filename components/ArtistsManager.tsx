"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { RiskLevel } from "@/lib/types";
import {
  createArtist,
  deleteArtist,
  toggleArtistStatus,
  updateArtist,
} from "@/app/actions";
import { RiskBadge, StatusPill } from "@/components/ui";

export interface ArtistRow {
  id: string;
  name: string;
  status: "active" | "paused";
  risk_level: RiskLevel;
  notes: string | null;
  keywords_count: number;
  leaks_count: number;
}

const RISKS: RiskLevel[] = ["alto", "medio", "bajo"];

export function ArtistsManager({
  initial,
  canManage = true,
}: {
  initial: ArtistRow[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ArtistRow[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleCreate(name: string, risk: RiskLevel, notes: string) {
    setError(null);
    const res = await createArtist({ name, risk_level: risk, notes });
    if (!res.ok) {
      setError(res.error || "No se pudo crear.");
      return false;
    }
    setAdding(false);
    refresh();
    return true;
  }

  async function handleUpdate(id: string, name: string, risk: RiskLevel, notes: string) {
    setError(null);
    setRows((r) =>
      r.map((x) => (x.id === id ? { ...x, name, risk_level: risk, notes } : x))
    );
    const res = await updateArtist(id, { name, risk_level: risk, notes });
    if (!res.ok) {
      setError(res.error || "No se pudo actualizar.");
      refresh();
      return false;
    }
    setEditing(null);
    return true;
  }

  async function handleToggle(id: string, current: "active" | "paused") {
    const next = current === "active" ? "paused" : "active";
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status: next } : x)));
    const res = await toggleArtistStatus(id, next);
    if (!res.ok) {
      setError(res.error || "No se pudo cambiar el estado.");
      refresh();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Borrar a "${name}"? Se eliminarán sus keywords y filtraciones.`)) return;
    setRows((r) => r.filter((x) => x.id !== id));
    const res = await deleteArtist(id);
    if (!res.ok) {
      setError(res.error || "No se pudo borrar.");
      refresh();
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-risk-alto/30 bg-risk-alto/10 px-3 py-2 text-sm text-risk-alto">
          {error}
        </div>
      )}

      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setAdding((v) => !v);
              setError(null);
            }}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-300"
          >
            {adding ? "Cancelar" : "+ Agregar artista"}
          </button>
        </div>
      )}

      {adding && <ArtistForm onSubmit={handleCreate} onCancel={() => setAdding(false)} />}

      {rows.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
          <div className="mb-2 text-3xl opacity-70">🎤</div>
          <p className="font-medium text-white/80">Aún no hay artistas</p>
          <p className="mt-1 text-sm text-white/40">
            Agrega tu primer artista para empezar a monitorear filtraciones.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-ink-900/60 text-left text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-3 font-medium">Artista</th>
                <th className="px-4 py-3 text-center font-medium">Keywords</th>
                <th className="px-4 py-3 text-center font-medium">Filtraciones</th>
                <th className="px-4 py-3 font-medium">Riesgo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) =>
                editing === a.id ? (
                  <tr key={a.id} className="border-b border-white/5">
                    <td colSpan={6} className="p-3">
                      <ArtistForm
                        initial={a}
                        onSubmit={(name, risk, notes) =>
                          handleUpdate(a.id, name, risk, notes)
                        }
                        onCancel={() => setEditing(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={a.id}
                    className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/artistas/${a.id}`}
                        className="font-medium text-white/90 transition hover:text-gold"
                      >
                        {a.name}
                      </Link>
                      {a.notes && (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-white/35">
                          {a.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-white/70">
                      {a.keywords_count}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums">
                      <Link href={`/artistas/${a.id}`} className="text-gold hover:underline">
                        {a.leaks_count}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={a.risk_level} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/artistas/${a.id}/keywords`}
                          className="rounded-md border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold-300 transition hover:bg-gold/20"
                        >
                          Keywords
                        </Link>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleToggle(a.id, a.status)}
                              className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:text-white/90"
                            >
                              {a.status === "active" ? "Pausar" : "Activar"}
                            </button>
                            <button
                              onClick={() => {
                                setEditing(a.id);
                                setError(null);
                              }}
                              className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:text-white/90"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(a.id, a.name)}
                              className="rounded-md border border-risk-alto/20 px-2.5 py-1 text-xs text-risk-alto/80 transition hover:bg-risk-alto/10"
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ArtistForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: { name: string; risk_level: RiskLevel; notes: string | null };
  onSubmit: (name: string, risk: RiskLevel, notes: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [risk, setRisk] = useState<RiskLevel>(initial?.risk_level ?? "medio");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    await onSubmit(name, risk, notes);
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-gold/20 bg-ink-800/60 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Nombre del artista"
            className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold/60"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white/70 outline-none focus:border-gold/60"
          />
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value as RiskLevel)}
            className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold/60"
          >
            {RISKS.map((r) => (
              <option key={r} value={r}>
                Riesgo {r}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy || !name.trim()}
              className="flex-1 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={onCancel}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white/90"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
