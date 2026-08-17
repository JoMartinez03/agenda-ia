"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RestablecerContrasena() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [validRecovery, setValidRecovery] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setValidRecovery(Boolean(session));
        setCheckingSession(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setValidRecovery(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error("Error al actualizar contraseña:", updateError);
      setError(
        "No pudimos actualizar la contraseña. Solicitá un nuevo enlace e intentá nuevamente.",
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 px-4 py-8 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full bg-violet-300/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-[560px] w-[560px] rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center justify-center">
        <section className="w-full rounded-[30px] border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-300/50 sm:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 font-black text-violet-700">
              MA
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">
                Martínez Automatizaciones
              </p>
              <p className="text-xs text-slate-500">by José Martínez</p>
            </div>
          </div>

          {checkingSession ? (
            <div className="py-14 text-center text-sm font-semibold text-slate-600">
              Validando enlace de recuperación...
            </div>
          ) : success ? (
            <div className="mt-8">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Contraseña actualizada
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-slate-950">
                Ya podés volver a ingresar
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Tu nueva contraseña fue guardada correctamente.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/");
                  router.refresh();
                }}
                className="mt-7 w-full rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : !validRecovery ? (
            <div className="mt-8">
              <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">
                Enlace no válido
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-slate-950">
                El enlace expiró o no es válido
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Volvé al inicio y solicitá un nuevo correo de recuperación.
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-7 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Volver al inicio
              </button>
            </div>
          ) : (
            <div className="mt-8">
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
                Recuperar acceso
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-slate-950">
                Elegí una nueva contraseña
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Usá al menos 8 caracteres y repetí la contraseña para confirmar.
              </p>

              <form className="mt-7 space-y-5" onSubmit={handleUpdatePassword}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Nueva contraseña"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repetir contraseña"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Guardar nueva contraseña"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}