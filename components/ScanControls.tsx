"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/NotificationsProvider";

export function ScanButton() {
  const router = useRouter();
  const { refresh, pushToast } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function scan() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      const text = data.message || "Escaneo finalizado.";
      setMsg({ text, ok: !!data.ok });
      // Notificación confiable de fin de escaneo (incluso si no hubo filtraciones)
      const found = data.leaks_found ?? 0;
      pushToast(
        found > 0
          ? `Escaneo completo: ${found} filtración(es) nueva(s).`
          : "Escaneo completo: no se encontraron filtraciones nuevas. ✅",
        found > 0 ? "gold" : "info"
      );
      await refresh();
      router.refresh();
    } catch {
      setMsg({ text: "No se pudo iniciar el escaneo. Intenta de nuevo.", ok: false });
      pushToast("No se pudo iniciar el escaneo. Intenta de nuevo.", "info");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 8000);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        onClick={scan}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner />
            Escaneando…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Escanear ahora
          </>
        )}
      </button>
      {msg && (
        <p
          className={`max-w-xs text-right text-xs ${
            msg.ok ? "text-gold-300" : "text-risk-alto"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Countdown({
  lastScanISO,
  intervalHours,
}: {
  lastScanISO: string | null;
  intervalHours: number;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    return <span className="font-mono text-2xl font-bold text-white/80">—:—:—</span>;
  }

  if (!lastScanISO) {
    return (
      <span className="font-mono text-2xl font-bold text-gold">pendiente</span>
    );
  }

  const next = new Date(lastScanISO).getTime() + intervalHours * 3600_000;
  const diff = next - now;

  if (diff <= 0) {
    return <span className="font-mono text-2xl font-bold text-gold">muy pronto</span>;
  }

  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-mono text-2xl font-bold text-white/90">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
