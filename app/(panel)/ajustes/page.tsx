import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/types";
import { SettingsForm, type SettingsFormData } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = createClient();

  let settings: Settings = DEFAULT_SETTINGS;
  let loadError = false;
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    if (data) settings = data as Settings;
  } catch {
    loadError = true;
  }

  // Nunca exponemos las credenciales al cliente: solo si están configuradas.
  const formData: SettingsFormData = {
    client_name: settings.client_name,
    scan_interval_hours: settings.scan_interval_hours,
    daily_quota_limit: settings.daily_quota_limit,
    unit_cost_per_search: settings.unit_cost_per_search,
    alert_threshold_views: settings.alert_threshold_views,
    has_youtube_key: !!settings.youtube_api_key?.trim(),
    has_spotify_id: !!settings.spotify_client_id?.trim(),
    has_spotify_secret: !!settings.spotify_client_secret?.trim(),
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold/70">
          Configuración
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-white/45">
          Parámetros del sistema y credenciales de API.
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-gold/30 bg-gold/[0.06] px-4 py-3 text-sm text-gold-300">
          No se pudo leer la configuración guardada. Se muestran los valores por defecto;
          al guardar se crearán.
        </div>
      )}

      <SettingsForm initial={formData} />
    </div>
  );
}
