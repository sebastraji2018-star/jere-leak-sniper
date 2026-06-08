"use client";

import { useState } from "react";
import type { Keyword, Platform } from "@/lib/types";
import { createKeyword, deleteKeyword, updateKeyword } from "@/app/actions";

const PLATFORMS: Platform[] = ["youtube", "spotify", "all"];

export function KeywordsManager({
  artistId,
  initial,
  unitCost,
}: {
  artistId: string;
  initial: Keyword[];
  unitCost: number;
}) {
  const [rows, setRows] = useState<Keyword[]>(initial);
  const [term, setTerm] = useState("");
  const [platform, setPlatform] = useState<Platform>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeCount = rows.filter((k) => k.active).length;
  const estCost = activeCount * unitCost;

  async function add() {
    const t = term.trim();
    if (!t) {
      setError("La keyword no puede estar vacía.");
      return;
    }
    setError(null);
    setBusy(true);

    // Optimista con id temporal
    const tempId = `temp-${Date.now()}`;
    const optimistic: Keyword = {
      id: tempId,
      artist_id: artistId,
      term: t,
      platform,
      active: true,
      created_at: new Date().toISOString(),
    };
    setRows((r) => [...r, optimistic]);
    setTerm("");

    const res = await createKeyword({ artist_id: artistId, term: t, platform });
    if (!res.ok) {
      setRows((r) => r.filter((k) => k.id !== tempId));
      setError(res.error || "No se pudo agregar.");
    } else if (res.id) {
      setRows((r) => r.map((k) => (k.id === tempId ? { ...k, id: res.id! } : k)));
    }
    setBusy(false);
  }

  async function toggle(id: string, active: boolean) {
    setRows((r) => r.map((k) => (k.id === id ? { ...k, active } : k)));
    const res = await updateKeyword(id, { active });
    if (!res.ok) {
      setRows((r) => r.map((k) => (k.id === id ? { ...k, active: !active } : k)));
      setError(res.error || "No se pudo actualizar.");
    }
  }

  async function changePlatform(id: string, p: Platform) {
    const prev = rows.find((k) => k.id === id)?.platform;
    setRows((r) => r.map((k) => (k.id === id ? { ...k, platform: p } : k)));
    const res = await updateKeyword(id, { platform: p });
    if (!res.ok && prev) {
      setRows((r) => r.map((k) => (k.id === id ? { ...k, platform: prev } : k)));
      setError(res.error || "No se pudo actualizar.");
    }
  }

  async function remove(id: string) {
    const prev = rows;
    setRows((r) => r.filter((k) => k.id !== id));
    const res = await deleteKeyword(id);
    if (!res.ok) {
      setRows(prev);
      setError(res.error || "No se pudo borrar.");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-risk-alto/30 bg-risk-alto/10 px-3 py-2 text-sm text-risk-alto">
          {error}
        </div>
      )}

      {/* Resumen de costo */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm">
        <span className="text-white/50">
          Keywords activas:{" "}
          <span className="font-mono font-bold text-white">{activeCount}</span>
        </span>
        <span className="h-4 w-px bg-white/10" />
        <span className="text-white/50">
          Costo por escaneo:{" "}
          <span className="font-mono font-bold text-gold">
            {estCost.toLocaleString("es-CL")}
          </span>{" "}
          unidades
        </span>
        <span className="text-xs text-white/30">({unitCost} u. por keyword)</span>
      </div>

      {/* Agregar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nueva keyword (ej: nombre leak, snippet, unreleased)…"
          className="flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none focus:border-gold/60"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none focus:border-gold/60"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p === "all" ? "Todas" : p}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          disabled={busy || !term.trim()}
          className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
        >
          + Agregar
        </button>
      </div>

      {/* Lista */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
          <div className="mb-2 text-3xl opacity-70">🔑</div>
          <p className="font-medium text-white/80">Sin keywords todavía</p>
          <p className="mt-1 text-sm text-white/40">
            Agrega términos para que el motor los busque en YouTube.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {rows.map((k, i) => (
            <div
              key={k.id}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02] ${
                i !== rows.length - 1 ? "border-b border-white/5" : ""
              } ${!k.active ? "opacity-50" : ""}`}
            >
              <button
                onClick={() => toggle(k.id, !k.active)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                  k.active ? "bg-gold" : "bg-ink-600"
                }`}
                aria-label={k.active ? "Desactivar" : "Activar"}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink-950 transition-all ${
                    k.active ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
              <span className="flex-1 truncate text-sm text-white/90">{k.term}</span>
              <span className="font-mono text-xs text-white/35">
                {k.active ? `${unitCost} u.` : "—"}
              </span>
              <select
                value={k.platform}
                onChange={(e) => changePlatform(k.id, e.target.value as Platform)}
                className="rounded-md border border-white/10 bg-ink-900 px-2 py-1 text-xs outline-none focus:border-gold/60"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p === "all" ? "Todas" : p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(k.id)}
                className="rounded-md border border-risk-alto/20 px-2 py-1 text-xs text-risk-alto/80 transition hover:bg-risk-alto/10"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
