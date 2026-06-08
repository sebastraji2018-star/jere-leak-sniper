"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/app/actions";

export interface SettingsFormData {
  client_name: string;
  scan_interval_hours: number;
  daily_quota_limit: number;
  unit_cost_per_search: number;
  alert_threshold_views: number;
  has_youtube_key: boolean;
  has_spotify_id: boolean;
  has_spotify_secret: boolean;
}

export function SettingsForm({ initial }: { initial: SettingsFormData }) {
  const router = useRouter();
  const [form, setForm] = useState({
    client_name: initial.client_name,
    scan_interval_hours: String(initial.scan_interval_hours),
    daily_quota_limit: String(initial.daily_quota_limit),
    unit_cost_per_search: String(initial.unit_cost_per_search),
    alert_threshold_views: String(initial.alert_threshold_views),
    youtube_api_key: "",
    spotify_client_id: "",
    spotify_client_secret: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);

    // Solo enviamos credenciales si el usuario escribió algo (no las pisamos vacías)
    const payload: Parameters<typeof updateSettings>[0] = {
      client_name: form.client_name,
      scan_interval_hours: Number(form.scan_interval_hours),
      daily_quota_limit: Number(form.daily_quota_limit),
      unit_cost_per_search: Number(form.unit_cost_per_search),
      alert_threshold_views: Number(form.alert_threshold_views),
    };
    if (form.youtube_api_key.trim()) payload.youtube_api_key = form.youtube_api_key.trim();
    if (form.spotify_client_id.trim()) payload.spotify_client_id = form.spotify_client_id.trim();
    if (form.spotify_client_secret.trim())
      payload.spotify_client_secret = form.spotify_client_secret.trim();

    const res = await updateSettings(payload);
    if (res.ok) {
      setMsg({ text: "Ajustes guardados correctamente.", ok: true });
      setForm((f) => ({
        ...f,
        youtube_api_key: "",
        spotify_client_id: "",
        spotify_client_secret: "",
      }));
      router.refresh();
    } else {
      setMsg({ text: res.error || "No se pudieron guardar.", ok: false });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 6000);
  }

  return (
    <div className="space-y-6">
      {/* General */}
      <Section title="General" desc="Identidad del panel y ritmo de escaneo.">
        <Field label="Nombre del cliente (white-label)">
          <input
            value={form.client_name}
            onChange={(e) => set("client_name", e.target.value)}
            className={inputCls}
            placeholder="The Orchard"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intervalo de escaneo (horas)">
            <input
              type="number"
              min={1}
              value={form.scan_interval_hours}
              onChange={(e) => set("scan_interval_hours", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Umbral de alerta por vistas">
            <input
              type="number"
              min={0}
              value={form.alert_threshold_views}
              onChange={(e) => set("alert_threshold_views", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Cuota */}
      <Section title="Cuota de API" desc="Controla el gasto de unidades de YouTube.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Límite diario de cuota (unidades)">
            <input
              type="number"
              min={0}
              value={form.daily_quota_limit}
              onChange={(e) => set("daily_quota_limit", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Costo por búsqueda (unidades)">
            <input
              type="number"
              min={1}
              value={form.unit_cost_per_search}
              onChange={(e) => set("unit_cost_per_search", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Credenciales */}
      <Section
        title="Credenciales de API"
        desc="Pega aquí tus propias credenciales. Se guardan de forma segura y solo se usan en el servidor. Deja en blanco para conservar las actuales."
      >
        <Field
          label="YouTube API Key"
          badge={initial.has_youtube_key ? "Configurada" : "Sin configurar"}
          ok={initial.has_youtube_key}
        >
          <input
            type="password"
            autoComplete="off"
            value={form.youtube_api_key}
            onChange={(e) => set("youtube_api_key", e.target.value)}
            className={inputCls}
            placeholder={initial.has_youtube_key ? "•••••••• (sin cambios)" : "AIza…"}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Spotify Client ID"
            badge={initial.has_spotify_id ? "Configurada" : "Sin configurar"}
            ok={initial.has_spotify_id}
          >
            <input
              type="password"
              autoComplete="off"
              value={form.spotify_client_id}
              onChange={(e) => set("spotify_client_id", e.target.value)}
              className={inputCls}
              placeholder={initial.has_spotify_id ? "•••••••• (sin cambios)" : ""}
            />
          </Field>
          <Field
            label="Spotify Client Secret"
            badge={initial.has_spotify_secret ? "Configurada" : "Sin configurar"}
            ok={initial.has_spotify_secret}
          >
            <input
              type="password"
              autoComplete="off"
              value={form.spotify_client_secret}
              onChange={(e) => set("spotify_client_secret", e.target.value)}
              className={inputCls}
              placeholder={initial.has_spotify_secret ? "•••••••• (sin cambios)" : ""}
            />
          </Field>
        </div>
      </Section>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar ajustes"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-risk-bajo" : "text-risk-alto"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none transition focus:border-gold/60 focus:shadow-gold";

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-6">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mt-0.5 mb-4 text-sm text-white/45">{desc}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  badge,
  ok,
  children,
}: {
  label: string;
  badge?: string;
  ok?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-white/40">
          {label}
        </label>
        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              ok
                ? "bg-risk-bajo/10 text-risk-bajo"
                : "bg-white/5 text-white/40"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
