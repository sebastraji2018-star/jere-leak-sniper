import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/scanner/scan";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Autoriza la corrida: o bien es el cron (header CRON_SECRET) o un usuario logueado.
async function authorize(
  request: NextRequest
): Promise<{ ok: boolean; trigger: "cron" | "manual" }> {
  const secret = process.env.CRON_SECRET;
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("x-cron-secret") ||
    "";

  if (secret && (authHeader === `Bearer ${secret}` || authHeader === secret)) {
    return { ok: true, trigger: "cron" };
  }

  // Disparo manual desde el panel: requiere sesión
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return { ok: true, trigger: "manual" };
  } catch {
    /* noop */
  }

  return { ok: false, trigger: "cron" };
}

async function handle(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 }
    );
  }

  // runScan nunca lanza: siempre devuelve un resumen.
  const summary = await runScan(auth.trigger);
  return NextResponse.json(summary, { status: 200 });
}

// Vercel Cron usa GET. El botón "Escanear ahora" usa POST.
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
