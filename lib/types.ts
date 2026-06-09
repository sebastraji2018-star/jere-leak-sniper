// Tipos compartidos del dominio Leak Sniper

export type ArtistStatus = "active" | "paused";
export type RiskLevel = "alto" | "medio" | "bajo";
export type Platform = "youtube" | "spotify" | "all";
export type LeakStatus = "nueva" | "revisada" | "takedown_enviado" | "resuelta";
export type ScanTrigger = "cron" | "manual";
export type ScanStatus = "ok" | "error";

export interface Artist {
  id: string;
  name: string;
  slug: string;
  status: ArtistStatus;
  risk_level: RiskLevel;
  notes: string | null;
  created_at: string;
}

export interface Keyword {
  id: string;
  artist_id: string;
  term: string;
  platform: Platform;
  active: boolean;
  created_at: string;
}

export interface Leak {
  id: string;
  artist_id: string;
  keyword_id: string | null;
  platform: string;
  external_id: string;
  url: string | null;
  title: string | null;
  channel: string | null;
  thumbnail_url: string | null;
  views: number | null;
  published_at: string | null;
  detected_at: string;
  status: LeakStatus;
  score: number | null;
}

export interface OfficialChannel {
  id: string;
  artist_id: string;
  platform: Platform;
  name: string;
  channel_id: string | null;
  created_at: string;
}

export interface ScanRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  artists_scanned: number | null;
  keywords_scanned: number | null;
  youtube_units_used: number | null;
  leaks_found: number | null;
  triggered_by: ScanTrigger;
  status: ScanStatus;
  error_message: string | null;
}

export interface Settings {
  id: number;
  scan_interval_hours: number;
  daily_quota_limit: number;
  unit_cost_per_search: number;
  alert_threshold_views: number;
  client_name: string;
  brand_name: string;
  accent_color: string;
  login_tagline: string;
  youtube_api_key: string | null;
  spotify_client_id: string | null;
  spotify_client_secret: string | null;
  updated_at: string;
}

// Valores por defecto si la tabla settings aún no existe / está vacía
export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  scan_interval_hours: 1,
  daily_quota_limit: 10000,
  unit_cost_per_search: 100,
  alert_threshold_views: 1000,
  client_name: "The Orchard",
  brand_name: "Leak Sniper",
  accent_color: "#F5B500",
  login_tagline: "Inteligencia de filtraciones musicales.",
  youtube_api_key: null,
  spotify_client_id: null,
  spotify_client_secret: null,
  updated_at: new Date(0).toISOString(),
};
