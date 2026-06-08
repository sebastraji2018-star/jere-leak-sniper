"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export interface NotifLeak {
  id: string;
  title: string | null;
  url: string | null;
  artist_name: string;
  detected_at: string;
}

interface Toast {
  id: string;
  title?: string | null;
  artist_name?: string;
  message?: string; // toast genérico (ej. resumen de escaneo)
  tone?: "gold" | "info";
}

interface NotifContext {
  items: NotifLeak[];
  count: number;
  toasts: Toast[];
  refresh: () => Promise<void>;
  markReviewed: (id: string) => Promise<void>;
  markAllReviewed: () => Promise<void>;
  dismissToast: (id: string) => void;
  pushToast: (message: string, tone?: "gold" | "info") => void;
}

const Ctx = createContext<NotifContext | null>(null);

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useNotifications debe usarse dentro de NotificationsProvider");
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotifLeak[]>([]);
  const [count, setCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      // Lista para el dropdown (recientes) + conteo exacto para el badge
      const [{ data, error }, { count: total }] = await Promise.all([
        supabase
          .from("leaks")
          .select("id, title, url, detected_at, artists(name)")
          .eq("status", "nueva")
          .order("detected_at", { ascending: false })
          .limit(30),
        supabase
          .from("leaks")
          .select("id", { count: "exact", head: true })
          .eq("status", "nueva"),
      ]);
      if (error) return;

      type Row = {
        id: string;
        title: string | null;
        url: string | null;
        detected_at: string;
        artists: { name: string } | null;
      };
      const mapped: NotifLeak[] = ((data ?? []) as unknown as Row[]).map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        detected_at: row.detected_at,
        artist_name: row.artists?.name ?? "Artista",
      }));

      // Detectar nuevas (solo tras la carga inicial) para disparar toasts
      if (initialized.current) {
        const fresh = mapped.filter((m) => !seenIds.current.has(m.id));
        if (fresh.length > 3) {
          // Ráfaga (p.ej. un escaneo masivo): un solo toast agregado
          setToasts((prev) => [
            { id: `burst-${fresh[0].id}`, title: null, artist_name: `${fresh.length}+` },
            ...prev,
          ]);
        } else if (fresh.length > 0) {
          setToasts((prev) => [
            ...fresh.map((f) => ({
              id: f.id,
              title: f.title,
              artist_name: f.artist_name,
            })),
            ...prev,
          ]);
        }
      }
      mapped.forEach((m) => seenIds.current.add(m.id));
      initialized.current = true;
      setItems(mapped);
      setCount(total ?? mapped.length);
    } catch {
      /* silencioso: el panel no debe romperse por las notificaciones */
    }
  }, []);

  // Coalesce ráfagas de eventos realtime (un scan inserta muchos leaks de golpe)
  const debouncedRefresh = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => refresh(), 700);
  }, [refresh]);

  // Carga inicial + suscripción Realtime
  useEffect(() => {
    refresh();
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel("leaks-nuevas")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "leaks" },
          () => {
            debouncedRefresh();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "scan_runs" },
          (payload) => {
            // Aviso al TERMINAR un escaneo (manual o automático), aunque no haya nada
            const row = payload.new as {
              id: string;
              finished_at: string | null;
              leaks_found: number | null;
              status: string;
            };
            if (!row?.finished_at) return;
            const n = row.leaks_found ?? 0;
            const toast: Toast =
              row.status === "error"
                ? {
                    id: `scan-${row.id}`,
                    message: "El escaneo terminó con un error. El sistema sigue activo.",
                    tone: "info",
                  }
                : n > 0
                ? {
                    id: `scan-${row.id}`,
                    message: `Escaneo completo: ${n} filtración(es) nueva(s).`,
                    tone: "gold",
                  }
                : {
                    id: `scan-${row.id}`,
                    message: "Escaneo completo: no se encontraron filtraciones nuevas. ✅",
                    tone: "info",
                  };
            setToasts((prev) => [toast, ...prev]);
          }
        )
        .subscribe();
    } catch {
      /* si Realtime no está disponible, el panel sigue funcionando */
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      try {
        channel?.unsubscribe();
      } catch {
        /* noop */
      }
    };
  }, [refresh, debouncedRefresh]);

  // Auto-cierre de toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const markReviewed = useCallback(async (id: string) => {
    // Optimista
    setItems((prev) => prev.filter((i) => i.id !== id));
    setCount((c) => Math.max(0, c - 1));
    try {
      const supabase = createClient();
      await supabase.from("leaks").update({ status: "revisada" }).eq("id", id);
    } catch {
      /* si falla, el próximo refresh lo corrige */
    }
  }, []);

  const markAllReviewed = useCallback(async () => {
    // Optimista: limpiar todo
    setItems([]);
    setCount(0);
    try {
      const supabase = createClient();
      await supabase.from("leaks").update({ status: "revisada" }).eq("status", "nueva");
    } catch {
      /* el próximo refresh corrige si falla */
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((message: string, tone: "gold" | "info" = "info") => {
    const id = `msg-${Date.now()}-${Math.round(performance.now())}`;
    setToasts((prev) => [{ id, message, tone }, ...prev]);
  }, []);

  return (
    <Ctx.Provider
      value={{
        items,
        count,
        toasts,
        refresh,
        markReviewed,
        markAllReviewed,
        dismissToast,
        pushToast,
      }}
    >
      {children}
      <Toaster />
    </Ctx.Provider>
  );
}

function Toaster() {
  const { toasts, dismissToast } = useNotifications();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => {
        const isBurst = t.id.startsWith("burst-");

        // Toast genérico de mensaje (ej. resumen de escaneo, "sin filtraciones")
        if (t.message) {
          const gold = t.tone === "gold";
          return (
            <div
              key={t.id}
              className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 backdrop-blur ${
                gold
                  ? "border-gold/30 bg-ink-800/95 shadow-gold"
                  : "border-white/10 bg-ink-800/95"
              }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  gold ? "bg-gold/15 text-gold" : "bg-white/10 text-white/70"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path
                    d="M5 12l4 4L19 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className="min-w-0 flex-1 text-sm text-white/85">{t.message}</p>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-white/30 transition hover:text-white/70"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        }

        return (
        <div
          key={t.id}
          className="animate-toast-in pointer-events-auto rounded-xl border border-gold/30 bg-ink-800/95 p-3.5 shadow-gold backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7l8-4z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gold-300">
                {isBurst ? "Nuevas filtraciones detectadas" : "Nueva filtración detectada"}
              </p>
              {isBurst ? (
                <p className="mt-0.5 truncate text-sm text-white/85">
                  Se detectaron{" "}
                  <span className="font-semibold">{t.artist_name}</span> filtraciones nuevas
                </p>
              ) : (
                <>
                  <p className="mt-0.5 truncate text-sm text-white/85">
                    A <span className="font-semibold">{t.artist_name}</span> le llegó una
                    filtración
                  </p>
                  <p className="mt-0.5 truncate text-xs text-white/45">{t.title}</p>
                </>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-white/30 transition hover:text-white/70"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}
