// Utilidades white-label: convierte el color de acento (hex) en variables CSS
// (canales RGB) para que toda la paleta "gold" use ese color en runtime.

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

// "#F5B500" -> [245, 181, 0]
export function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || "").trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [245, 181, 0]; // fallback al dorado
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Aclara (amount > 0) u oscurece (amount < 0) hacia blanco/negro
function shade([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  if (amount >= 0) {
    return [
      clamp(r + (255 - r) * amount),
      clamp(g + (255 - g) * amount),
      clamp(b + (255 - b) * amount),
    ];
  }
  const k = 1 + amount;
  return [clamp(r * k), clamp(g * k), clamp(b * k)];
}

const ch = (rgb: [number, number, number]) => rgb.join(" ");

// Devuelve el CSS (variables) para inyectar el acento elegido.
export function accentCss(accentHex: string): string {
  const base = hexToRgb(accentHex);
  const v300 = shade(base, 0.32);
  const v400 = shade(base, 0.14);
  const v600 = shade(base, -0.18);
  return `:root{--gold-500:${ch(base)};--gold-400:${ch(v400)};--gold-300:${ch(
    v300
  )};--gold-600:${ch(v600)};}`;
}
