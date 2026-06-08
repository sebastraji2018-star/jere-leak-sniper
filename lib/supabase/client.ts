"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para el navegador (Client Components, Realtime).
// Usa la anon key; RLS protege los datos. La sesión vive en cookies.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
