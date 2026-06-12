import { createClient } from "@/lib/supabase/server";
import { ArtistsManager, type ArtistRow } from "@/components/ArtistsManager";
import type { RiskLevel } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ArtistQueryRow {
  id: string;
  name: string;
  status: "active" | "paused";
  risk_level: RiskLevel;
  notes: string | null;
  keywords: { count: number }[] | null;
  leaks: { count: number }[] | null;
}

export default async function ArtistasPage() {
  const me = await getCurrentUser();
  const canManage = me?.role === "admin";
  const supabase = createClient();

  let rows: ArtistRow[] = [];
  let loadError = false;
  try {
    const { data, error } = await supabase
      .from("artists")
      .select("id, name, status, risk_level, notes, keywords(count), leaks(count)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    rows = ((data ?? []) as unknown as ArtistQueryRow[]).map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      risk_level: a.risk_level,
      notes: a.notes,
      keywords_count: a.keywords?.[0]?.count ?? 0,
      leaks_count: a.leaks?.[0]?.count ?? 0,
    }));
  } catch {
    loadError = true;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold/70">
          Catálogo monitoreado
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Artistas</h1>
        <p className="mt-1 text-sm text-white/45">
          Agrega, edita, pausa o borra artistas y gestiona sus keywords.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-risk-alto/30 bg-risk-alto/5 px-4 py-6 text-center text-sm text-risk-alto/90">
          No se pudieron cargar los artistas. Revisa tu conexión con Supabase e intenta de nuevo.
        </div>
      ) : (
        <ArtistsManager initial={rows} canManage={canManage} />
      )}
    </div>
  );
}
