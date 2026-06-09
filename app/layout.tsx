import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/types";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Título/descn dinámicos (white-label) desde la configuración
export async function generateMetadata(): Promise<Metadata> {
  let brand = DEFAULT_SETTINGS.brand_name;
  let client = DEFAULT_SETTINGS.client_name;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("brand_name, client_name")
      .eq("id", 1)
      .maybeSingle();
    if (data?.brand_name) brand = data.brand_name;
    if (data?.client_name) client = data.client_name;
  } catch {
    /* fallback */
  }
  return {
    title: `${brand} — ${client}`,
    description: `Detección de filtraciones musicales no lanzadas. Panel de inteligencia white-label para ${client}.`,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
