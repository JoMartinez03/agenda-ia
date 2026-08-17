"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const WHATSAPP_SOPORTE = "5492625649750";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error("Error de inicio de sesión:", loginError);

      setError(
        `${loginError.message} | Código: ${loginError.code ?? "sin código"}`,
      );

      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setResetError("");
    setResetSent(false);
    setResetLoading(true);

    const redirectTo =
  "http://192.168.100.215:3000/restablecer-contrasena";

    const { error: resetPasswordError } =
      await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo,
      });

    if (resetPasswordError) {
      console.error(
        "Error al enviar recuperación de contraseña:",
        resetPasswordError,
      );

      setResetError(
        "No pudimos enviar el correo de recuperación. Verificá el correo e intentá nuevamente.",
      );
      setResetLoading(false);
      return;
    }

    setResetSent(true);
    setResetLoading(false);
  }

  const mensajeSoporte = encodeURIComponent(
    "Hola José, necesito ayuda para ingresar a mi panel de Martínez Automatizaciones.",
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      {/* Fondo suave, alineado con el dashboard */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full bg-violet-300/25 blur-3xl" />
        <div className="absolute -right-40 top-1/4 h-[560px] w-[560px] rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-[-220px] left-1/3 h-[480px] w-[480px] rounded-full bg-indigo-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-300/50 lg:grid-cols-[1.08fr_0.92fr]">
          {/* Marca / propuesta de valor */}
          <div className="relative hidden min-h-[680px] overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-600/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-black tracking-tight shadow-xl shadow-black/20 backdrop-blur">
                  MA
                </div>

                <div>
                  <p className="text-lg font-black tracking-tight">
                    Martínez Automatizaciones
                  </p>
                  <p className="text-xs text-slate-400">by José Martínez</p>
                </div>
              </div>

              <div className="mt-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-300">
                  Automatización inteligente
                </p>

                <h1 className="mt-4 max-w-md text-4xl font-black leading-[1.04] tracking-[-0.045em]">
                  Tecnología que trabaja por tu negocio.
                </h1>

                <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
                  Automatizamos tareas, conectamos tus herramientas y
                  simplificamos la gestión diaria de tu negocio.
                </p>
              </div>

              {/* Mapa de la solución */}
              <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-center">
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base">
                      ◫
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-200">
                      Gestión de reservas
                    </p>
                  </div>

                  <div className="text-slate-600">→</div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-center">
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base">
                      ◎
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-200">
                      Base de clientes
                    </p>
                  </div>
                </div>

                <div className="my-3 flex items-center justify-center text-slate-600">
                  ↓
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-center">
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base">
                      ⚙
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-200">
                      Operaciones
                    </p>
                  </div>

                  <div className="text-slate-600">→</div>

                  <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-4 text-center">
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/15 text-base text-violet-200">
                      ◈
                    </div>
                    <p className="mt-2 text-xs font-semibold text-violet-100">
                      Mi panel
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="mb-5 h-px bg-gradient-to-r from-violet-500/60 via-white/10 to-transparent" />
              <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
                <span>Soluciones simples. Procesos más ágiles.</span>
                <span className="font-medium text-slate-300">José Martínez</span>
              </div>
            </div>
          </div>

          {/* Login */}
          <div className="relative flex items-center p-6 sm:p-9 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              {/* Marca mobile */}
              <div className="mb-8 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 font-black text-violet-700 shadow-inner shadow-violet-100">
                    MA
                  </div>

                  <div>
                    <p className="text-sm font-black tracking-tight text-slate-950">
                      Martínez Automatizaciones
                    </p>
                    <p className="text-xs text-slate-500">by José Martínez</p>
                  </div>
                </div>
              </div>

              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
                Acceso clientes
              </span>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] text-slate-950">
                Ingresá a tu panel
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Usá las credenciales asociadas a tu negocio para continuar.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500"
                  >
                    Correo electrónico
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-500"
                    >
                      Contraseña
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetError("");
                        setResetSent(false);
                        setResetOpen(true);
                      }}
                      className="text-xs font-semibold text-violet-600 transition hover:text-violet-700"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 font-black">!</span>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-200/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Ingresando..." : "Iniciar sesión"}
                </button>
              </form>

              {/* Por ahora dejamos solo email/contraseña.
                  Si más adelante habilitamos Google OAuth en Supabase,
                  podemos agregar un único botón de Google acá. */}

              <div className="mt-8 border-t border-slate-100 pt-5 text-center lg:hidden">
                <p className="text-xs font-semibold text-slate-500">
                  Martínez Automatizaciones
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Tecnología que trabaja por tu negocio · by José Martínez
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Soporte flotante */}
      <a
        href={`https://wa.me/${WHATSAPP_SOPORTE}?text=${mensajeSoporte}`}
        target="_blank"
        rel="noreferrer"
        className="group fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-2xl border border-violet-200 bg-white/95 px-3.5 py-3 shadow-xl shadow-slate-300/50 backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-2xl"
        aria-label="Contactar soporte por WhatsApp"
        title="Contactar soporte"
      >
        <span className="hidden text-right sm:block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-violet-600">
            Soporte
          </span>
          <span className="mt-0.5 block text-xs font-medium text-slate-600">
            ¿Necesitás ayuda?
          </span>
        </span>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-lg font-black text-white shadow-lg shadow-violet-200 transition group-hover:bg-violet-700">
          ?
        </span>
      </a>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
                  Recuperar acceso
                </span>
                <h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-slate-950">
                  Restablecé tu contraseña
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ingresá el correo asociado a tu cuenta. Te enviaremos un enlace
                  para elegir una nueva contraseña.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {resetSent ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-800">
                  Revisá tu correo
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  Si la dirección corresponde a una cuenta, recibirás un enlace
                  para restablecer la contraseña.
                </p>
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
                <div>
                  <label
                    htmlFor="reset-email"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                {resetError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {resetError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading
                    ? "Enviando..."
                    : "Enviar enlace de recuperación"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}