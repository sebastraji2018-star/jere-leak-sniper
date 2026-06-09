"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LeakStatus, Platform, RiskLevel } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  return supabase;
}

// ----------------------------- ARTISTAS -----------------------------
export async function createArtist(input: {
  name: string;
  risk_level: RiskLevel;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const name = input.name?.trim();
    if (!name) return { ok: false, error: "El nombre es obligatorio." };

    const supabase = await requireAuth();
    let slug = slugify(name);
    if (!slug) slug = `artista-${Date.now()}`;

    const { data, error } = await supabase
      .from("artists")
      .insert({
        name,
        slug,
        risk_level: input.risk_level || "medio",
        notes: input.notes?.trim() || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "Ya existe un artista con un nombre similar." };
      return { ok: false, error: "No se pudo crear el artista." };
    }
    revalidatePath("/artistas");
    revalidatePath("/");
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Error inesperado al crear el artista." };
  }
}

export async function updateArtist(
  id: string,
  input: { name?: string; risk_level?: RiskLevel; notes?: string }
): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return { ok: false, error: "El nombre no puede quedar vacío." };
      patch.name = name;
    }
    if (input.risk_level) patch.risk_level = input.risk_level;
    if (input.notes !== undefined) patch.notes = input.notes.trim() || null;

    const { error } = await supabase.from("artists").update(patch).eq("id", id);
    if (error) return { ok: false, error: "No se pudo actualizar el artista." };
    revalidatePath("/artistas");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado al actualizar." };
  }
}

export async function toggleArtistStatus(
  id: string,
  status: "active" | "paused"
): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const { error } = await supabase.from("artists").update({ status }).eq("id", id);
    if (error) return { ok: false, error: "No se pudo cambiar el estado." };
    revalidatePath("/artistas");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

export async function deleteArtist(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const { error } = await supabase.from("artists").delete().eq("id", id);
    if (error) return { ok: false, error: "No se pudo borrar el artista." };
    revalidatePath("/artistas");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

// ----------------------------- KEYWORDS -----------------------------
export async function createKeyword(input: {
  artist_id: string;
  term: string;
  platform: Platform;
}): Promise<ActionResult> {
  try {
    const term = input.term?.trim();
    if (!term) return { ok: false, error: "La keyword no puede estar vacía." };
    if (!input.artist_id) return { ok: false, error: "Falta el artista." };

    const supabase = await requireAuth();
    const { data, error } = await supabase
      .from("keywords")
      .insert({
        artist_id: input.artist_id,
        term,
        platform: input.platform || "youtube",
        active: true,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "No se pudo agregar la keyword." };
    revalidatePath(`/artistas/${input.artist_id}/keywords`);
    revalidatePath("/");
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

export async function updateKeyword(
  id: string,
  input: { term?: string; platform?: Platform; active?: boolean }
): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const patch: Record<string, unknown> = {};
    if (input.term !== undefined) {
      const term = input.term.trim();
      if (!term) return { ok: false, error: "La keyword no puede quedar vacía." };
      patch.term = term;
    }
    if (input.platform) patch.platform = input.platform;
    if (input.active !== undefined) patch.active = input.active;

    const { error } = await supabase.from("keywords").update(patch).eq("id", id);
    if (error) return { ok: false, error: "No se pudo actualizar la keyword." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

export async function deleteKeyword(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const { error } = await supabase.from("keywords").delete().eq("id", id);
    if (error) return { ok: false, error: "No se pudo borrar la keyword." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

// ------------------------- OFFICIAL CHANNELS -------------------------
// Extrae un channelId (UC...) si el usuario pega una URL /channel/UC... o el id directo
function parseChannelId(raw?: string): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  const m = v.match(/UC[0-9A-Za-z_-]{20,}/);
  if (m) return m[0];
  return null;
}

export async function createOfficialChannel(input: {
  artist_id: string;
  name: string;
  channel_id?: string;
}): Promise<ActionResult> {
  try {
    const name = input.name?.trim();
    if (!name) return { ok: false, error: "El nombre del canal es obligatorio." };
    if (!input.artist_id) return { ok: false, error: "Falta el artista." };

    const supabase = await requireAuth();
    // Acepta un ID explícito o lo extrae del nombre si pegaron una URL/ID
    const channel_id = parseChannelId(input.channel_id) ?? parseChannelId(name);

    const { data, error } = await supabase
      .from("official_channels")
      .insert({ artist_id: input.artist_id, platform: "youtube", name, channel_id })
      .select("id")
      .single();
    if (error) return { ok: false, error: "No se pudo agregar el canal oficial." };
    revalidatePath(`/artistas/${input.artist_id}/keywords`);
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

export async function deleteOfficialChannel(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const { error } = await supabase.from("official_channels").delete().eq("id", id);
    if (error) return { ok: false, error: "No se pudo borrar el canal." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

// ----------------------------- LEAKS -----------------------------
export async function updateLeakStatus(
  id: string,
  status: LeakStatus
): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const { error } = await supabase.from("leaks").update({ status }).eq("id", id);
    if (error) return { ok: false, error: "No se pudo actualizar el estado." };
    revalidatePath("/filtraciones");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado." };
  }
}

// ----------------------------- SETTINGS -----------------------------
export async function updateSettings(input: {
  scan_interval_hours?: number;
  daily_quota_limit?: number;
  unit_cost_per_search?: number;
  alert_threshold_views?: number;
  client_name?: string;
  brand_name?: string;
  accent_color?: string;
  login_tagline?: string;
  youtube_api_key?: string | null;
  spotify_client_id?: string | null;
  spotify_client_secret?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await requireAuth();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const numFields: (keyof typeof input)[] = [
      "scan_interval_hours",
      "daily_quota_limit",
      "unit_cost_per_search",
      "alert_threshold_views",
    ];
    for (const f of numFields) {
      const v = input[f];
      if (v !== undefined && v !== null && !Number.isNaN(Number(v))) {
        patch[f] = Math.max(0, Math.floor(Number(v)));
      }
    }
    if (input.client_name !== undefined)
      patch.client_name = input.client_name.trim() || "The Orchard";
    if (input.brand_name !== undefined)
      patch.brand_name = input.brand_name.trim() || "Leak Sniper";
    if (input.login_tagline !== undefined)
      patch.login_tagline = input.login_tagline.trim() || "Inteligencia de filtraciones musicales.";
    if (input.accent_color !== undefined) {
      const c = input.accent_color.trim();
      patch.accent_color = /^#?[0-9a-fA-F]{6}$/.test(c)
        ? c.startsWith("#") ? c : `#${c}`
        : "#F5B500";
    }

    // Credenciales: solo se actualizan si vienen con valor (no se pisan con vacío)
    if (input.youtube_api_key !== undefined)
      patch.youtube_api_key = input.youtube_api_key?.trim() || null;
    if (input.spotify_client_id !== undefined)
      patch.spotify_client_id = input.spotify_client_id?.trim() || null;
    if (input.spotify_client_secret !== undefined)
      patch.spotify_client_secret = input.spotify_client_secret?.trim() || null;

    const { error } = await supabase
      .from("settings")
      .upsert({ id: 1, ...patch }, { onConflict: "id" });
    if (error) return { ok: false, error: "No se pudieron guardar los ajustes." };
    revalidatePath("/ajustes");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error inesperado al guardar." };
  }
}

// ----------------------------- AUTH -----------------------------
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
