// Cliente mínimo de YouTube Data API v3 (search.list).
// Cada búsqueda cuesta 100 unidades de cuota. Todo envuelto: nunca lanza.

export interface YoutubeItem {
  external_id: string; // videoId
  url: string;
  title: string;
  channel: string;
  channel_id: string; // channelId (para excluir canales oficiales)
  thumbnail_url: string;
  published_at: string | null;
}

export interface YoutubeSearchResult {
  ok: boolean;
  items: YoutubeItem[];
  error?: string;
  quotaExceeded?: boolean;
}

interface RawSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
}

export async function youtubeSearch(
  apiKey: string,
  term: string,
  publishedAfter: string | null,
  maxResults = 10
): Promise<YoutubeSearchResult> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      part: "snippet",
      q: term,
      type: "video",
      order: "date",
      maxResults: String(maxResults),
    });
    if (publishedAfter) params.set("publishedAfter", publishedAfter);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      let message = `YouTube API HTTP ${res.status}`;
      let quotaExceeded = false;
      try {
        const body = await res.json();
        message = body?.error?.message || message;
        const reason = body?.error?.errors?.[0]?.reason;
        if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
          quotaExceeded = true;
        }
      } catch {
        // respuesta no-JSON
      }
      return { ok: false, items: [], error: message, quotaExceeded };
    }

    const data = (await res.json()) as { items?: RawSearchItem[] };
    const items: YoutubeItem[] = (data.items || [])
      .filter((it) => it.id?.videoId)
      .map((it) => {
        const videoId = it.id!.videoId!;
        const sn = it.snippet || {};
        return {
          external_id: videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: sn.title || "(sin título)",
          channel: sn.channelTitle || "(canal desconocido)",
          channel_id: sn.channelId || "",
          thumbnail_url:
            sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || "",
          published_at: sn.publishedAt || null,
        };
      });

    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      items: [],
      error: err instanceof Error ? err.message : "Error de red al consultar YouTube",
    };
  }
}
