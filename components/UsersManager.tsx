"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { createUser, deleteUser, updateUserRole } from "@/app/actions";

export interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function UsersManager({
  initial,
  currentUserId,
}: {
  initial: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<UserRow[]>(initial);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function flash(setter: (v: string | null) => void, msg: string) {
    setter(msg);
    setTimeout(() => setter(null), 5000);
  }

  async function add() {
    setError(null);
    if (!email.trim()) return setError("Escribe un usuario o email.");
    if (password.length < 10)
      return setError("La contraseña debe tener al menos 10 caracteres.");
    setBusy(true);
    const res = await createUser({ email, password, role });
    setBusy(false);
    if (!res.ok) return setError(res.error || "No se pudo crear.");
    setAdding(false);
    setEmail("");
    setPassword("");
    setRole("viewer");
    flash(setOk, "Usuario creado.");
    router.refresh();
  }

  async function changeRole(id: string, newRole: UserRole) {
    const prev = rows.find((r) => r.id === id)?.role;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, role: newRole } : x)));
    const res = await updateUserRole(id, newRole);
    if (!res.ok) {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, role: prev! } : x)));
      flash(setError, res.error || "No se pudo cambiar el rol.");
    }
  }

  async function remove(id: string, email: string | null) {
    if (!confirm(`¿Borrar al usuario ${email || ""}?`)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const res = await deleteUser(id);
    if (!res.ok) {
      setRows(prev);
      flash(setError, res.error || "No se pudo borrar.");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-risk-alto/30 bg-risk-alto/10 px-3 py-2 text-sm text-risk-alto">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-lg border border-risk-bajo/30 bg-risk-bajo/10 px-3 py-2 text-sm text-risk-bajo">
          {ok}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => {
            setAdding((v) => !v);
            setError(null);
          }}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-300"
        >
          {adding ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-gold/20 bg-ink-800/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">
                Usuario o email
              </label>
              <input
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan  (o juan@theorchard.com)"
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">
                Contraseña (mín. 10)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="contraseña fuerte"
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold/60"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold/60"
            >
              <option value="viewer">Viewer (solo ver)</option>
              <option value="admin">Admin (control total)</option>
            </select>
            <button
              onClick={add}
              disabled={busy}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
            >
              {busy ? "Creando…" : "Crear usuario"}
            </button>
          </div>
          <p className="mt-2 text-xs text-white/35">
            Comparte el usuario + contraseña con la persona. Podrá entrar de inmediato.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-ink-900/60 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white/90">{u.email}</span>
                    {isSelf && (
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                        tú
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                      className="rounded-md border border-white/10 bg-ink-900 px-2 py-1 text-xs outline-none focus:border-gold/60 disabled:opacity-50"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/45">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <button
                        onClick={() => remove(u.id, u.email)}
                        className="rounded-md border border-risk-alto/20 px-2.5 py-1 text-xs text-risk-alto/80 transition hover:bg-risk-alto/10"
                      >
                        Borrar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
