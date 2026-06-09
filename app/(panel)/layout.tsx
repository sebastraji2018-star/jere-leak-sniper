import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import { accentCss } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Branding white-label. Si falla, fallback elegante.
  let clientName = "The Orchard";
  let brandName = "Leak Sniper";
  let accentColor = "#F5B500";
  try {
    const { data } = await supabase
      .from("settings")
      .select("client_name, brand_name, accent_color")
      .eq("id", 1)
      .maybeSingle();
    if (data?.client_name) clientName = data.client_name;
    if (data?.brand_name) brandName = data.brand_name;
    if (data?.accent_color) accentColor = data.accent_color;
  } catch {
    /* fallback */
  }

  return (
    <NotificationsProvider>
      {/* Color de acento configurable (white-label) */}
      <style dangerouslySetInnerHTML={{ __html: accentCss(accentColor) }} />
      <div className="relative z-10 min-h-screen">
        <NavBar clientName={clientName} brandName={brandName} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </NotificationsProvider>
  );
}
