import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, type RiskLevel, type ScanRun, type Settings } from "@/lib/types";
import { Card, EmptyState, LeakStatusPill, RiskBadge, SectionTitle } from "@/components/ui";
import { ScanButton, Countdown } from "@/components/ScanControls";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function safeCount(
  supabase: ReturnType<typeof createClient>,
  table: string,
  filters: (q: any) => any = (q) => q
): Promise<number> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    q = filters(q);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface NewLeakRow {
  id: string;
  title: string | null;
  channel: string | null;
  url: string | null;
  views: number | null;
  thumbnail_url: string | null;
  detected_at: string;
  artists: { name: string; risk_level: RiskLevel } | null;
}

export default async function DashboardPage() {
  const supabase = createClient();

  // Settings (con fallback elegante)
  let settings: Settings = DEFAULT_SETTINGS;
  try {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    if (data) settings = data as Settings;
  } catch {
    /* fallback */
  }

  const [
    totalLeaks,
    activeArtists,
    activeKeywords,
    youtubeLeaks,
    spotifyLeaks,
  ] = await Promise.all([
    safeCount(supabase, "leaks"),
    safeCount(supabase, "artists", (q) => q.eq("status", "active")),
    safeCount(supabase, "keywords", (q) => q.eq("active", true)),
    safeCount(supabase, "leaks", (q) => q.eq("platform", "youtube")),
    safeCount(supabase, "leaks", (q) => q.eq("platform", "spotify")),
  ]);

  // Último scan
  let lastScan: ScanRun | null = null;
  try {
    const { data } = await supabase
      .from("scan_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1);
    lastScan = (data?.[0] as ScanRun) ?? null;
  } catch {
    /* null */
  }

  // Filtraciones nuevas (sin revisar)
  let newLeaks: NewLeakRow[] = [];
  try {
    const { data } = await supabase
      .from("leaks")
      .select(
        "id, title, channel, url, views, thumbnail_url, detected_at, artists(name, risk_level)"
      )
      .eq("status", "nueva")
      .order("detected_at", { ascending: false })
      .limit(6);
    newLeaks = (data ?? []) as unknown as NewLeakRow[];
  } catch {
    /* [] */
  }

  const hasApiKey = !!settings.youtube_api_key?.trim();

  const kpis = [
    { label: "Filtraciones totales", value: totalLeaks, accent: true },
    { label: "Artistas activos", value: activeArtists },
    { label: "Keywords activas", value: activeKeywords },
    { label: "YouTube", value: youtubeLeaks },
    { label: "Spotify", value: spotifyLeaks },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold/70">
            Centro de operaciones
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
            Panel de inteligencia
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-risk-bajo/30 bg-risk-bajo/5 px-3 py-2 text-sm text-risk-bajo">
            <span className="pulse-dot h-2 w-2 rounded-full bg-risk-bajo" />
            Sistema activo
          </span>
          <ScanButton />
        </div>
      </div>

      {/* Aviso si falta API key */}
      {!hasApiKey && (
        <Card className="border-gold/30 bg-gold/[0.06] p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚙️</span>
            <div className="text-sm">
              <p className="font-semibold text-gold-300">Configura tu YouTube API key</p>
              <p className="mt-0.5 text-white/55">
                El panel funciona, pero el escaneo no detectará filtraciones hasta que pegues
                tus credenciales en{" "}
                <Link href="/ajustes" className="text-gold underline">
                  Ajustes
                </Link>
                .
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">
              {k.label}
            </p>
            <p
              className={`mt-2 font-mono text-4xl font-bold tabular-nums ${
                k.accent ? "text-gold" : "text-white"
              }`}
            >
              {k.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Próximo escaneo */}
      <Card className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center">
        <span className="text-sm font-semibold">Próximo escaneo automático</span>
        <div className="sm:order-3">
          <Countdown
            lastScanISO={lastScan?.started_at ?? null}
            intervalHours={settings.scan_interval_hours}
          />
        </div>
        <p className="text-xs text-white/40 sm:order-2">
          Cada {settings.scan_interval_hours}h · último: {fmtDate(lastScan?.started_at ?? null)}
          {lastScan?.status === "error" && (
            <span className="text-risk-alto"> · con error</span>
          )}
        </p>
      </Card>

      {/* Nuevas filtraciones */}
      <Card className="p-5">
        <SectionTitle
          action={
            <Link href="/filtraciones" className="text-sm font-medium text-gold hover:underline">
              Ver todas →
            </Link>
          }
        >
          Nuevas filtraciones
        </SectionTitle>

        {newLeaks.length === 0 ? (
          <EmptyState
            title="No hay filtraciones nuevas"
            hint="Cuando el motor detecte una filtración, aparecerá aquí en vivo y sonará la campanita."
            icon="🛡️"
          />
        ) : (
          <div className="space-y-2">
            {newLeaks.map((leak) => (
              <div
                key={leak.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-800/40 p-3 transition hover:border-gold/20"
              >
                {leak.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={leak.thumbnail_url}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-ink-700 text-white/20">
                    ▶
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white/90">
                      {leak.artists?.name ?? "Artista"}
                    </span>
                    {leak.artists?.risk_level && (
                      <RiskBadge level={leak.artists.risk_level} />
                    )}
                  </div>
                  <p className="truncate text-sm text-white/55">{leak.title}</p>
                  <p className="truncate font-mono text-[11px] text-white/35">
                    {leak.channel} · {fmtDate(leak.detected_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <LeakStatusPill status="nueva" />
                  {leak.url && (
                    <a
                      href={leak.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gold hover:underline"
                    >
                      Ver →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
