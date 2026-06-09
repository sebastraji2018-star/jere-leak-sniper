export function Logo({
  size = "md",
  client = "THE ORCHARD",
  brandName = "Leak Sniper",
}: {
  size?: "sm" | "md" | "lg";
  client?: string;
  brandName?: string;
}) {
  const scale =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
      ? "text-base"
      : "text-xl";
  const sub = size === "lg" ? "text-[11px]" : "text-[9px]";

  // Marca: primera palabra en blanco, el resto en color de acento.
  const parts = brandName.trim().split(/\s+/);
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : brandName;
  const accent = parts.length > 1 ? parts[parts.length - 1] : "";

  return (
    <div className="flex items-center gap-3 select-none">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 bg-ink-900 shadow-gold">
        {/* Mira / scope */}
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold" fill="none">
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <div className="leading-none">
        <div className={`font-display font-extrabold tracking-tight ${scale}`}>
          {first}
          {accent && <span className="text-gold">{accent}</span>}
        </div>
        <div className={`font-mono uppercase tracking-[0.32em] text-white/40 ${sub} mt-1`}>
          {client}
        </div>
      </div>
    </div>
  );
}
