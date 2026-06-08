"use client";

import { useState } from "react";
import type { OfficialChannel } from "@/lib/types";
import { createOfficialChannel, deleteOfficialChannel } from "@/app/actions";

export function OfficialChannelsManager({
  artistId,
  initial,
}: {
  artistId: string;
  initial: OfficialChannel[];
}) {
  const [rows, setRows] = useState<OfficialChannel[]>(initial);
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    const n = name.trim();
    if (!n) {
      setError("Escribe el nombre del canal oficial.");
      return;
    }
    setError(null);
    setBusy(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: OfficialChannel = {
      id: tempId,
      artist_id: artistId,
      platform: "youtube",
      name: n,
      channel_id: channelId.trim() || null,
      created_at: new Date().toISOString(),
    };
    setRows((r) => [...r, optimistic]);
    setName("");
    setChannelId("");

    const res = await createOfficialChannel({
      artist_id: artistId,
      name: n,
      channel_id: optimistic.channel_id || undefined,
    });
    if (!res.ok) {
      setRows((r) => r.filter((c) => c.id !== tempId));
      setError(res.error || "No se pudo agregar.");
    } else if (res.id) {
      setRows((r) => r.map((c) => (c.id === tempId ? { ...c, id: res.id! } : c)));
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const prev = rows;
    setRows((r) => r.filter((c) => c.id !== id));
    const res = await deleteOfficialChannel(id);
    if (!res.ok) {
      setRows(prev);
      setError(res.error || "No se pudo borrar.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-gold">✓</span>
        <h2 className="font-display text-lg font-bold tracking-tight">
          Canales oficiales
        </h2>
      </div>
      <p className="mb-4 text-sm text-white/45">
        Lista blanca. Los videos publicados por estos canales{" "}
        <span className="text-white/70">no se marcan como filtración</span>.
      </p>

      {error && (
        <div className="mb-3 rounded-lg border border-risk-alto/30 bg-risk-alto/10 px-3 py-2 text-sm text-risk-alto">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nombre del canal oficial (ej: Jere Klein)"
          className="flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none focus:border-gold/60"
        />
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="ID o URL del canal (opcional)"
          className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white/70 outline-none focus:border-gold/60 sm:w-56"
        />
        <button
          onClick={add}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
        >
          + Agregar
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/35">
          Sin canales oficiales. Agrega el canal del artista para no recibir falsas alarmas
          desde su propio canal.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {rows.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-risk-bajo/30 bg-risk-bajo/10 px-3 py-1.5 text-sm text-risk-bajo"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {c.name}
              {c.channel_id && (
                <span className="font-mono text-[10px] text-risk-bajo/60">
                  {c.channel_id.slice(0, 10)}…
                </span>
              )}
              <button
                onClick={() => remove(c.id)}
                className="ml-1 text-risk-bajo/60 transition hover:text-risk-alto"
                aria-label="Quitar"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
