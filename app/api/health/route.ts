import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Health check: confirma que la app responde y que Supabase está alcanzable.
export async function GET() {
  let db: "ok" | "error" | "unconfigured" = "unconfigured";
  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("settings").select("id").limit(1);
      db = error ? "error" : "ok";
    }
  } catch {
    db = "error";
  }

  return NextResponse.json({
    status: "ok",
    service: "leak-sniper",
    db,
    time: new Date().toISOString(),
  });
}
