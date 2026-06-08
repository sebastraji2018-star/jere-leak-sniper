import { createClient } from "@/lib/supabase/server";
import { LeaksTable, type LeakRow } from "@/components/LeaksTable";
import type { LeakStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface LeakQueryRow {
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
  artists: { name: string } | null;
}

export default async function FiltracionesPage() {
  const supabase = createClient();

  let rows: LeakRow[] = [];
  let artists: { id: string; name: string }[] = [];
  let loadError = false;

  try {
    const [{ data: leaks, error: le }, { data: arts }] = await Promise.all([
      supabase
        .from("leaks")
        .select(
          "id, title, channel, url, platform, views, status, detected_at, published_at, artist_id, artists(name)"
        )
        .order("detected_at", { ascending: false })
        .limit(500),
      supabase.from("artists").select("id, name").order("name"),
    ]);
    if (le) throw le;
    rows = ((leaks ?? []) as unknown as LeakQueryRow[]).map((l) => ({
      id: l.id,
      title: l.title,
      channel: l.channel,
      url: l.url,
      platform: l.platform,
      views: l.views,
      status: l.status,
      detected_at: l.detected_at,
      published_at: l.published_at,
      artist_id: l.artist_id,
      artist_name: l.artists?.name ?? "Artista",
    }));
    artists = arts || [];
  } catch {
    loadError = true;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold/70">
          Registro de detecciones
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
          Filtraciones
        </h1>
        <p className="mt-1 text-sm text-white/45">
          Filtra por artista, plataforma o estado. Ordena por vistas o fecha.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-risk-alto/30 bg-risk-alto/5 px-4 py-6 text-center text-sm text-risk-alto/90">
          No se pudieron cargar las filtraciones. Revisa tu conexión con Supabase.
        </div>
      ) : (
        <LeaksTable initial={rows} artists={artists} />
      )}
    </div>
  );
}
