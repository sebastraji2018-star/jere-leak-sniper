import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SETTINGS,
  type Artist,
  type Keyword,
  type OfficialChannel,
} from "@/lib/types";
import { KeywordsManager } from "@/components/KeywordsManager";
import { OfficialChannelsManager } from "@/components/OfficialChannelsManager";
import { RiskBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function KeywordsPage({
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

  let keywords: Keyword[] = [];
  try {
    const { data } = await supabase
      .from("keywords")
      .select("*")
      .eq("artist_id", params.id)
      .order("created_at", { ascending: true });
    keywords = (data as Keyword[]) || [];
  } catch {
    keywords = [];
  }

  let officialChannels: OfficialChannel[] = [];
  try {
    const { data } = await supabase
      .from("official_channels")
      .select("*")
      .eq("artist_id", params.id)
      .order("created_at", { ascending: true });
    officialChannels = (data as OfficialChannel[]) || [];
  } catch {
    officialChannels = [];
  }

  let unitCost = DEFAULT_SETTINGS.unit_cost_per_search;
  try {
    const { data } = await supabase
      .from("settings")
      .select("unit_cost_per_search")
      .eq("id", 1)
      .maybeSingle();
    if (data?.unit_cost_per_search) unitCost = data.unit_cost_per_search;
  } catch {
    /* default */
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/artistas"
        className="inline-flex items-center gap-1 text-sm text-white/45 transition hover:text-white/80"
      >
        ← Artistas
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {artist.name}
        </h1>
        <RiskBadge level={artist.risk_level} />
      </div>
      <p className="-mt-3 text-sm text-white/45">
        Keywords que el motor busca para detectar filtraciones de este artista.
      </p>

      <OfficialChannelsManager artistId={artist.id} initial={officialChannels} />

      <KeywordsManager artistId={artist.id} initial={keywords} unitCost={unitCost} />
    </div>
  );
}
