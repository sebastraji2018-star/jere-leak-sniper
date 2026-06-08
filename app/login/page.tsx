"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError("Ingresa tu email y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      // Permite entrar con usuario corto (ej. "orchard") sin escribir el email completo
      const raw = email.trim();
      const loginEmail = raw.includes("@") ? raw : `${raw.toLowerCase()}@theorchard.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (error) {
        setError(
          error.message.toLowerCase().includes("invalid")
            ? "Credenciales inválidas. Revisa tu email y contraseña."
            : error.message
        );
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intenta de nuevo en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid-bg relative z-10 flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-7 backdrop-blur">
          <h1 className="font-display text-lg font-bold">Acceso al panel</h1>
          <p className="mt-1 text-sm text-white/45">
            Inteligencia de filtraciones musicales.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
                Usuario o email
              </label>
              <input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm outline-none transition focus:border-gold/60 focus:shadow-gold"
                placeholder="orchard"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm outline-none transition focus:border-gold/60 focus:shadow-gold"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-risk-alto/30 bg-risk-alto/10 px-3 py-2 text-sm text-risk-alto">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-300">
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/25">
          Leak Sniper · White-label
        </p>
      </div>
    </main>
  );
}
