/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Fuerza HTTPS por 2 años (incl. subdominios)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Evita que el sitio sea embebido en un iframe ajeno (anti-clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Evita "MIME sniffing"
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtrar el referrer a sitios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilita APIs sensibles del navegador que la app no usa
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // El panel no puede ser enmarcado por otros orígenes
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig = {
  poweredByHeader: false, // no revelar que corre en Next.js
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
