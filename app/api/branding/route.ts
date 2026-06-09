import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const dynamic = "force-dynamic";

// Branding público (sin secretos) para la pantalla de login (pre-auth).
export async function GET() {
  const fallback = {
    brand_name: DEFAULT_SETTINGS.brand_name,
    client_name: DEFAULT_SETTINGS.client_name,
    accent_color: DEFAULT_SETTINGS.accent_color,
    login_tagline: DEFAULT_SETTINGS.login_tagline,
  };
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("brand_name, client_name, accent_color, login_tagline")
      .eq("id", 1)
      .maybeSingle();
    return NextResponse.json({ ...fallback, ...(data || {}) });
  } catch {
    return NextResponse.json(fallback);
  }
}
