// Cliente mínimo de Spotify Web API (client-credentials flow + search).
// Todo envuelto: nunca lanza. Maneja la restricción "premium required" de Spotify.

export interface SpotifyItem {
  external_id: string; // track id
  url: string;
  title: string;
  channel: string; // artistas del track (coma-separados)
  thumbnail_url: string;
  published_at: string | null;
  popularity: number;
}

export interface SpotifyTokenResult {
  ok: boolean;
  token?: string;
  error?: string;
}

export interface SpotifySearchResult {
  ok: boolean;
  items: SpotifyItem[];
  error?: string;
  restricted?: boolean; // true si Spotify bloquea por "premium required" / quota
}

// Normaliza release_date de Spotify (puede ser YYYY, YYYY-MM o YYYY-MM-DD) a fecha ISO.
function normalizeReleaseDate(date?: string, precision?: string): string | null {
  if (!date) return null;
  if (precision === "year" || /^\d{4}$/.test(date)) return `${date.slice(0, 4)}-01-01`;
  if (precision === "month" || /^\d{4}-\d{2}$/.test(date)) return `${date}-01`;
  return date;
}

export async function getSpotifyToken(
  clientId: string,
  clientSecret: string
): Promise<SpotifyTokenResult> {
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.access_token) {
      return {
        ok: false,
        error: data?.error_description || data?.error || `Spotify token HTTP ${res.status}`,
      };
    }
    return { ok: true, token: data.access_token };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red con Spotify (token)",
    };
  }
}

interface RawTrack {
  id?: string;
  name?: string;
  popularity?: number;
  external_urls?: { spotify?: string };
  artists?: { name?: string }[];
  album?: {
    release_date?: string;
    release_date_precision?: string;
    images?: { url?: string }[];
  };
}

export async function spotifySearch(
  token: string,
  term: string,
  limit = 10
): Promise<SpotifySearchResult> {
  try {
    const params = new URLSearchParams({
      q: term,
      type: "track",
      limit: String(limit),
    });
    const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      const restricted =
        /premium|subscription/i.test(text) || res.status === 403;
      let message = `Spotify search HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        message = j?.error?.message || message;
      } catch {
        if (text) message = text.slice(0, 160);
      }
      return { ok: false, items: [], error: message, restricted };
    }

    const data = (await res.json()) as { tracks?: { items?: RawTrack[] } };
    const items: SpotifyItem[] = (data.tracks?.items || [])
      .filter((t) => t.id)
      .map((t) => ({
        external_id: t.id!,
        url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
        title: t.name || "(sin título)",
        channel: (t.artists || []).map((a) => a.name).filter(Boolean).join(", ") || "(artista desconocido)",
        thumbnail_url: t.album?.images?.[0]?.url || "",
        published_at: normalizeReleaseDate(
          t.album?.release_date,
          t.album?.release_date_precision
        ),
        popularity: typeof t.popularity === "number" ? t.popularity : 0,
      }));

    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      items: [],
      error: err instanceof Error ? err.message : "Error de red con Spotify (search)",
    };
  }
}
