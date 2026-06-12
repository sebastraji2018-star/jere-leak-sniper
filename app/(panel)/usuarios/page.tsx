import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { UsersManager, type UserRow } from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/"); // solo admin

  const supabase = createClient();
  let rows: UserRow[] = [];
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: true });
    rows = (data as UserRow[]) || [];
  } catch {
    rows = [];
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold/70">
          Acceso y permisos
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-white/45">
          Cuentas que pueden entrar al panel. <span className="text-white/70">Admin</span>:
          control total. <span className="text-white/70">Viewer</span>: solo ver.
        </p>
      </div>

      <UsersManager initial={rows} currentUserId={me.id} />
    </div>
  );
}
