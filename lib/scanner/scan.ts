import { createAdminClient } from "@/lib/supabase/server";
import { youtubeSearch } from "@/lib/scanner/youtube";
import { getSpotifyToken, spotifySearch } from "@/lib/scanner/spotify";
import {
  DEFAULT_SETTINGS,
  type Artist,
  type Keyword,
  type ScanTrigger,
} from "@/lib/types";

export interface ScanSummary {
  ok: boolean;
  triggered_by: ScanTrigger;
  artists_scanned: number;
  keywords_scanned: number;
  youtube_units_used: number;
  leaks_found: number;
  quota_reached: boolean;
  message: string;
  error?: string;
}

const RISK_WEIGHT: Record<string, number> = { alto: 0, medio: 1, bajo: 2 };
const RISK_SCORE: Record<string, number> = { alto: 80, medio: 50, bajo: 20 };

// Patrones de RUIDO: contenido que NO es una filtración (reacciones, type beats,
// lyric videos, lives, edits de fans, etc.). Si el título o el canal contiene
// alguno, se descarta. Reduce muchísimo los falsos positivos.
const NOISE_PATTERNS = [
  "beat", "type beat", "typebeat", "type-beat", "prod.", "prod ",
  "reacc", "reaction", "reacting", "react ",
  "lyric", "letra", "letras",
  "en vivo", "en directo", " live", "(live", "live)", "live ",
  "performance", "cover", "tutorial",
  "slowed", "sped up", "speed up", "nightcore", "8d audio", "audio 8d",
  "instrumental", "karaoke", "remix de", "mashup",
  "entrevista", "podcast", "habla de", "review", "reseña",
  "#short", "shorts", "edit ", "edits", "fan edit", "fanmade", "amv",
  // noticias / chismes (hablan de la filtración, no son la filtración)
  "da detalles", "detalles de su", "da señales", "señales de",
  "próximo ep", "proximo ep", "se filtro", "se filtró", "se filtraron",
  "filtracion de", "filtración de", "noticia", "rumor", "confirma",
  // reposts / contenido de fans de temas ya lanzados
  "(edit", ")edit", "extended", "exclusiva", "remaster", "fixed",
  "#viral", "#trending", "viral ", "radio ", "así sonaría", "asi sonaria",
  "mi verso", "sonaría mi", "version ", "versión ", "preview de",
];

function isNoise(title?: string | null, channel?: string | null): boolean {
  const t = `${title || ""} ${channel || ""}`.toLowerCase();
  return NOISE_PATTERNS.some((p) => t.includes(p));
}

// Normaliza para comparar nombres (quita espacios, signos, mayúsculas)
function normalize(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Pausa entre búsquedas para no gatillar el rate-limit (429) de las APIs.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SEARCH_DELAY_MS = 400;

interface NormalizedItem {
  external_id: string;
  url: string;
  title: string;
  channel: string;
  channel_id?: string;
  thumbnail_url: string;
  published_at: string | null;
}

// Dedup por (platform, external_id), excluye canales oficiales e inserta lo nuevo.
// Devuelve cuántas filtraciones nuevas se insertaron.
async function persistLeaks(
  supabase: ReturnType<typeof createAdminClient>,
  artist: Artist,
  keywordId: string,
  platform: string,
  items: NormalizedItem[],
  isOfficial: (channelName: string, channelId: string) => boolean,
  requireName: string | null
): Promise<number> {
  // requireName: si la keyword incluía el nombre del artista, exigimos que ese
  // nombre aparezca en el resultado (evita resultados "relacionados" irrelevantes).
  const need = requireName ? normalize(requireName) : null;
  const candidates = items.filter((i) => {
    if (isOfficial(i.channel, i.channel_id || "")) return false;
    if (isNoise(i.title, i.channel)) return false;
    if (need && !normalize(`${i.title} ${i.channel}`).includes(need)) return false;
    return true;
  });
  if (candidates.length === 0) return 0;

  const ids = candidates.map((i) => i.external_id);
  const { data: existing } = await supabase
    .from("leaks")
    .select("external_id")
    .eq("platform", platform)
    .in("external_id", ids);
  const existingSet = new Set((existing || []).map((e) => e.external_id));

  const fresh = candidates.filter((i) => !existingSet.has(i.external_id));
  if (fresh.length === 0) return 0;

  const rows = fresh.map((i) => ({
    artist_id: artist.id,
    keyword_id: keywordId,
    platform,
    external_id: i.external_id,
    url: i.url,
    title: i.title,
    channel: i.channel,
    thumbnail_url: i.thumbnail_url,
    views: 0,
    published_at: i.published_at,
    status: "nueva",
    score: RISK_SCORE[artist.risk_level] ?? 50,
  }));

  const { data: inserted } = await supabase
    .from("leaks")
    .upsert(rows, { onConflict: "platform,external_id", ignoreDuplicates: true })
    .select("id");
  return inserted?.length ?? 0;
}

function startOfTodayISO(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

// Motor de escaneo. NUNCA lanza: siempre devuelve un resumen y registra la corrida.
export async function runScan(triggeredBy: ScanTrigger): Promise<ScanSummary> {
  const supabase = createAdminClient();

  let runId: string | null = null;
  let unitsThisRun = 0;
  let leaksFound = 0;
  let keywordsScanned = 0;
  let artistsScanned = 0;
  let quotaReached = false;
  let lastError: string | undefined;

  try {
    // 1) Registrar inicio de corrida
    const { data: run } = await supabase
      .from("scan_runs")
      .insert({ triggered_by: triggeredBy, status: "ok" })
      .select("id")
      .single();
    runId = run?.id ?? null;

    // 2) Settings
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    const settings = settingsRow ?? DEFAULT_SETTINGS;
    const apiKey = settings.youtube_api_key?.trim();
    const dailyLimit = settings.daily_quota_limit || DEFAULT_SETTINGS.daily_quota_limit;
    const unitCost = settings.unit_cost_per_search || DEFAULT_SETTINGS.unit_cost_per_search;

    // Token de Spotify (si hay credenciales configuradas)
    let spotifyToken: string | null = null;
    let spotifyRestricted = false;
    const spId = settings.spotify_client_id?.trim();
    const spSecret = settings.spotify_client_secret?.trim();
    if (spId && spSecret) {
      const tok = await getSpotifyToken(spId, spSecret);
      if (tok.ok && tok.token) spotifyToken = tok.token;
      else lastError = tok.error;
    }

    // Si no hay NINGUNA fuente configurada, terminamos limpio
    if (!apiKey && !spotifyToken) {
      await finishRun(supabase, runId, {
        artistsScanned: 0,
        keywordsScanned: 0,
        unitsThisRun: 0,
        leaksFound: 0,
        status: "ok",
        error: "Faltan credenciales (YouTube/Spotify) en Ajustes",
      });
      return {
        ok: true,
        triggered_by: triggeredBy,
        artists_scanned: 0,
        keywords_scanned: 0,
        youtube_units_used: 0,
        leaks_found: 0,
        quota_reached: false,
        message: "Configura tu YouTube API key (y/o credenciales de Spotify) en Ajustes para escanear.",
      };
    }

    // 3) Unidades ya usadas hoy
    const { data: todayRuns } = await supabase
      .from("scan_runs")
      .select("youtube_units_used")
      .gte("started_at", startOfTodayISO());
    const unitsUsedToday = (todayRuns || []).reduce(
      (sum, r) => sum + (r.youtube_units_used || 0),
      0
    );

    // 4) Ventana: desde el INICIO de HOY (de hoy en adelante, no el catálogo
    // histórico). Usamos siempre el inicio del día para no perder subidas de hoy
    // aunque YouTube las indexe tarde; la deduplicación evita reavisar lo conocido.
    const publishedAfter = startOfTodayISO();
    // Para Spotify (su búsqueda no filtra por fecha) descartamos por release_date
    const spotifyCutoffDate = publishedAfter.slice(0, 10); // YYYY-MM-DD

    // 5) Artistas activos, ordenados por riesgo (alto primero)
    const { data: artistsData } = await supabase
      .from("artists")
      .select("*")
      .eq("status", "active");
    const artists = (artistsData || []) as Artist[];
    artists.sort(
      (a, b) => (RISK_WEIGHT[a.risk_level] ?? 1) - (RISK_WEIGHT[b.risk_level] ?? 1)
    );

    // 6) Recorrer artistas -> keywords
    for (const artist of artists) {
      const { data: kwData } = await supabase
        .from("keywords")
        .select("*")
        .eq("artist_id", artist.id)
        .eq("active", true);
      const keywords = (kwData || []) as Keyword[];

      // Canales oficiales (lista blanca): sus videos/tracks NO se marcan como filtración
      const { data: officialData } = await supabase
        .from("official_channels")
        .select("name, channel_id")
        .eq("artist_id", artist.id);
      const officialNames = new Set(
        (officialData || [])
          .map((o) => (o.name || "").trim().toLowerCase())
          .filter(Boolean)
      );
      const officialIds = new Set(
        (officialData || [])
          .map((o) => (o.channel_id || "").trim())
          .filter(Boolean)
      );
      // Es oficial si coincide el ID del canal, o si el nombre oficial aparece
      // dentro del canal/artistas (ej. en Spotify el track acredita "Jere Klein"
      // junto a otros). Si NO aparece -> lo subió otro -> es filtración.
      const isOfficial = (channelName: string, channelId: string) => {
        if (channelId && officialIds.has(channelId)) return true;
        const c = (channelName || "").trim().toLowerCase();
        if (!c) return false;
        for (const n of Array.from(officialNames)) {
          if (n && (c === n || c.includes(n))) return true;
        }
        return false;
      };

      let scannedAnyForArtist = false;

      const normArtist = normalize(artist.name);

      for (const kw of keywords) {
        const onYoutube = kw.platform === "youtube" || kw.platform === "all";
        const onSpotify = kw.platform === "spotify" || kw.platform === "all";
        // Si la keyword incluye el nombre del artista (búsqueda por artista),
        // exigimos relevancia. Si es un título de canción, confiamos en la keyword.
        const requireName =
          normArtist && normalize(kw.term).includes(normArtist) ? artist.name : null;

        // ---------- YouTube (consume cuota) ----------
        if (onYoutube && apiKey) {
          const projected = unitsUsedToday + unitsThisRun + unitCost;
          if (projected > dailyLimit) {
            quotaReached = true;
            break;
          }
          const result = await youtubeSearch(apiKey, kw.term, publishedAfter, 50);
          await sleep(SEARCH_DELAY_MS); // espaciar para evitar rate-limit (429)
          keywordsScanned++;
          scannedAnyForArtist = true;

          if (result.quotaExceeded) {
            quotaReached = true;
            break;
          }
          if (!result.ok) {
            lastError = result.error;
          } else {
            unitsThisRun += unitCost; // la búsqueda se ejecutó: consume cuota
            if (result.items.length > 0) {
              leaksFound += await persistLeaks(
                supabase,
                artist,
                kw.id,
                "youtube",
                result.items,
                isOfficial,
                requireName
              );
            }
          }
        }

        // ---------- Spotify (sin cuota de YouTube) ----------
        if (onSpotify && spotifyToken) {
          // Esta app de Spotify (modo desarrollo) tope la búsqueda en 10 resultados
          const result = await spotifySearch(spotifyToken, kw.term, 10);
          await sleep(SEARCH_DELAY_MS); // espaciar para evitar rate-limit
          keywordsScanned++;
          scannedAnyForArtist = true;

          if (!result.ok) {
            lastError = result.error;
            if (result.restricted) spotifyRestricted = true;
          } else {
            // Solo tracks lanzados desde el corte (igual que YouTube: desde hoy)
            const recent = result.items.filter(
              (i) => i.published_at && i.published_at.slice(0, 10) >= spotifyCutoffDate
            );
            if (recent.length > 0) {
              leaksFound += await persistLeaks(
                supabase,
                artist,
                kw.id,
                "spotify",
                recent,
                isOfficial,
                requireName
              );
            }
          }
        }
      }

      if (scannedAnyForArtist) artistsScanned++;
      if (quotaReached) break;
    }

    await finishRun(supabase, runId, {
      artistsScanned,
      keywordsScanned,
      unitsThisRun,
      leaksFound,
      status: "ok",
      error: lastError,
    });

    let message = quotaReached
      ? `Cuota diaria casi agotada: se priorizaron los artistas de mayor riesgo. ${leaksFound} filtración(es) nueva(s).`
      : `Escaneo completo. ${leaksFound} filtración(es) nueva(s) en ${keywordsScanned} búsqueda(s).`;
    if (spotifyRestricted) {
      message +=
        " Spotify rechazó la búsqueda (requiere una app con dueño Premium / cuota extendida).";
    }

    return {
      ok: true,
      triggered_by: triggeredBy,
      artists_scanned: artistsScanned,
      keywords_scanned: keywordsScanned,
      youtube_units_used: unitsThisRun,
      leaks_found: leaksFound,
      quota_reached: quotaReached,
      message,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error inesperado en el escaneo";
    // Intentar registrar el error sin romper
    try {
      await finishRun(supabase, runId, {
        artistsScanned,
        keywordsScanned,
        unitsThisRun,
        leaksFound,
        status: "error",
        error,
      });
    } catch {
      /* noop */
    }
    return {
      ok: false,
      triggered_by: triggeredBy,
      artists_scanned: artistsScanned,
      keywords_scanned: keywordsScanned,
      youtube_units_used: unitsThisRun,
      leaks_found: leaksFound,
      quota_reached: quotaReached,
      message: "El escaneo terminó con un error, pero el sistema sigue activo.",
      error,
    };
  }
}

async function finishRun(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string | null,
  data: {
    artistsScanned: number;
    keywordsScanned: number;
    unitsThisRun: number;
    leaksFound: number;
    status: "ok" | "error";
    error?: string;
  }
) {
  if (!runId) return;
  await supabase
    .from("scan_runs")
    .update({
      finished_at: new Date().toISOString(),
      artists_scanned: data.artistsScanned,
      keywords_scanned: data.keywordsScanned,
      youtube_units_used: data.unitsThisRun,
      leaks_found: data.leaksFound,
      status: data.status,
      error_message: data.error ?? null,
    })
    .eq("id", runId);
}
