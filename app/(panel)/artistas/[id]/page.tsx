import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Artist, LeakStatus } from "@/lib/types";
import { LeakStatusPill, RiskBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

interface LeakRow {
  id: string;
  title: string | null;
  channel: string | null;
  url: string | null;
  platform: string;
  views: number | null;
  status: LeakStatus;
  detected_at: string;
  published_at: string | null;
  thumbnail_url: string | null;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

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

export default async function ArtistDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  let artist: Artist | null = null;
  try {
    const { data } = await supabase
      .from("artists")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    artist = (data as Artist) ?? null;
  } catch {
    artist = null;
  }
  if (!artist) notFound();

  let leaks: LeakRow[] = [];
  try {
    const { data } = await supabase
      .from("leaks")
      .select(
        "id, title, channel, url, platform, views, status, detected_at, published_at, thumbnail_url"
      )
      .eq("artist_id", params.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(500);
    leaks = (data as LeakRow[]) || [];
  } catch {
    leaks = [];
  }

  // Agrupar por AÑO-MES (usa published_at, si no detected_at)
  const groups = new Map<string, { label: string; sort: string; rows: LeakRow[] }>();
  for (const leak of leaks) {
    const iso = leak.published_at || leak.detected_at;
    const d = new Date(iso);
    const y = isNaN(d.getTime()) ? 0 : d.getFullYear();
    const m = isNaN(d.getTime()) ? 0 : d.getMonth();
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const label = y ? `${MONTHS[m]} ${y}` : "Sin fecha";
    if (!groups.has(key)) groups.set(key, { label, sort: key, rows: [] });
    groups.get(key)!.rows.push(leak);
  }
  const orderedGroups = Array.from(groups.values()).sort((a, b) =>
    a.sort < b.sort ? 1 : -1
  );

  const ytCount = leaks.filter((l) => l.platform === "youtube").length;
  const spCount = leaks.filter((l) => l.platform === "spotify").length;

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/artistas"
        className="inline-flex items-center gap-1 text-sm text-white/45 transition hover:text-white/80"
      >
        ← Artistas
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {artist.name}
          </h1>
          <RiskBadge level={artist.risk_level} />
        </div>
        <Link
          href={`/artistas/${artist.id}/keywords`}
          className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-medium text-gold-300 transition hover:bg-gold/20"
        >
          Keywords y canales oficiales
        </Link>
      </div>

      {/* KPIs del artista */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            Filtraciones
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-gold">{leaks.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            YouTube
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">{ytCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            Spotify
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">{spCount}</p>
        </div>
      </div>

      {leaks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
          <div className="mb-2 text-3xl opacity-70">🛡️</div>
          <p className="font-medium text-white/80">Sin filtraciones para {artist.name}</p>
          <p className="mt-1 text-sm text-white/40">
            Cuando el motor detecte algo, aparecerá aquí agrupado por mes.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {orderedGroups.map((group) => (
            <section key={group.sort}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-lg font-bold capitalize text-white/90">
                  {group.label}
                </h2>
                <span className="font-mono text-xs text-white/35">
                  {group.rows.length} filtración(es)
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-2">
                {group.rows.map((leak) => (
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
                      <p className="truncate text-sm font-medium text-white/90">
                        {leak.title || "(sin título)"}
                      </p>
                      <p className="truncate font-mono text-[11px] text-white/35">
                        {leak.channel} · {fmtDate(leak.published_at || leak.detected_at)}
                      </p>
                    </div>
                    <span className="hidden rounded-md bg-white/5 px-2 py-0.5 text-xs capitalize text-white/60 sm:inline">
                      {leak.platform}
                    </span>
                    <LeakStatusPill status={leak.status} />
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
