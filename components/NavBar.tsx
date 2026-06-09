"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { useNotifications } from "@/components/NotificationsProvider";
import { createClient } from "@/lib/supabase/client";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export function NavBar({
  clientName,
  brandName,
}: {
  clientName: string;
  brandName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { items, count, markReviewed, markAllReviewed, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* noop */
    }
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Dedupe nav (Keywords apunta a /artistas igual que Artistas)
  const navItems = [
    { href: "/", label: "Panel" },
    { href: "/artistas", label: "Artistas" },
    { href: "/filtraciones", label: "Filtraciones", badge: true },
    { href: "/ajustes", label: "Ajustes" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo size="md" client={clientName} brandName={brandName} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-white/5 text-gold"
                  : "text-white/55 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              {item.label}
              {item.badge && count > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 font-mono text-[11px] font-bold text-ink-950">
                  {count}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Campanita */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-white/70 transition hover:border-gold/40 hover:text-gold"
              aria-label="Notificaciones"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path
                  d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 font-mono text-[10px] font-bold text-ink-950">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>

            {open && (
              <div className="animate-fade-in absolute right-0 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Filtraciones nuevas</span>
                    <span className="font-mono text-xs text-gold">{count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleRefresh}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition hover:bg-white/5 hover:text-white/90"
                      title="Refrescar"
                      aria-label="Refrescar"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        fill="none"
                      >
                        <path
                          d="M3 12a9 9 0 0115.5-6.3M21 12a9 9 0 01-15.5 6.3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path d="M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {count > 0 && (
                      <button
                        onClick={() => markAllReviewed()}
                        className="rounded-md px-2 py-1 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white/90"
                        title="Marcar todas como revisadas"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-white/40">
                      Sin filtraciones nuevas.
                      <br />
                      Todo bajo control. 🎯
                    </div>
                  ) : (
                    items.map((leak) => (
                      <div
                        key={leak.id}
                        className="group border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.03]"
                      >
                        <p className="text-sm leading-snug text-white/85">
                          A <span className="font-semibold text-gold-300">{leak.artist_name}</span>{" "}
                          le llegó una filtración:
                        </p>
                        <p className="mt-0.5 truncate text-sm text-white/55">
                          {leak.title || "(sin título)"}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-white/35">
                            {timeAgo(leak.detected_at)}
                          </span>
                          <div className="flex items-center gap-3">
                            {leak.url && (
                              <a
                                href={leak.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => markReviewed(leak.id)}
                                className="text-xs font-medium text-gold hover:underline"
                              >
                                Ver →
                              </a>
                            )}
                            <button
                              onClick={() => markReviewed(leak.id)}
                              className="text-xs font-medium text-white/45 transition hover:text-white/80"
                            >
                              Revisada
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href="/filtraciones"
                  onClick={() => setOpen(false)}
                  className="block border-t border-white/10 px-4 py-3 text-center text-sm font-medium text-gold transition hover:bg-white/[0.03]"
                >
                  Ver todas las filtraciones
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className="hidden rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm font-medium text-white/60 transition hover:border-white/20 hover:text-white/90 sm:block"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Nav móvil */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/5 px-3 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive(item.href)
                ? "bg-white/5 text-gold"
                : "text-white/55"
            }`}
          >
            {item.label}
            {item.badge && count > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold px-1 font-mono text-[10px] font-bold text-ink-950">
                {count}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </header>
  );
}
