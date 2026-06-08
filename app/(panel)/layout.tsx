import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { NotificationsProvider } from "@/components/NotificationsProvider";

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

  // Nombre del cliente (white-label). Si falla, fallback elegante.
  let clientName = "The Orchard";
  try {
    const { data } = await supabase
      .from("settings")
      .select("client_name")
      .eq("id", 1)
      .maybeSingle();
    if (data?.client_name) clientName = data.client_name;
  } catch {
    /* fallback */
  }

  return (
    <NotificationsProvider>
      <div className="relative z-10 min-h-screen">
        <NavBar clientName={clientName} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </NotificationsProvider>
  );
}
