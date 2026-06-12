import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: UserRole;
}

// Devuelve el usuario actual + su rol (o null si no hay sesión).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? profile?.email ?? null,
      // Si por algún motivo no hay perfil, asumimos viewer (mínimo privilegio)
      role: (profile?.role as UserRole) ?? "viewer",
    };
  } catch {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const u = await getCurrentUser();
  return u?.role === "admin";
}
