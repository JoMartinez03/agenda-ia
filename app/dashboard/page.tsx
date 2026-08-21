"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTurnos } from "@/lib/services/turnos";
import { supabase } from "@/lib/supabase";

const WEBHOOK_CANCELAR =
  "https://guts-coeditor-risotto.ngrok-free.dev/webhook/cancelar-turno-panel";

const WEBHOOK_REPROGRAMAR =
  "https://guts-coeditor-risotto.ngrok-free.dev/webhook/reprogramar-turno-panel";

const WEBHOOK_HORARIOS_DISPONIBLES =
  "https://guts-coeditor-risotto.ngrok-free.dev/webhook/horarios-disponibles-panel";

type Turno = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;

  clientes: {
    nombre: string;
    telefono: string;
  } | null;

  servicios: {
    nombre: string;
    duracion_minutos: number;
  } | null;
};

type Filtro = "hoy" | "manana" | "todos";

type Mensaje = {
  tipo: "exito" | "error";
  texto: string;
} | null;

type RespuestaWebhook = {
  ok?: boolean;
  mensaje?: string;
  fecha?: string;
  hora?: string;
  hora_fin?: string;
};

type RespuestaHorarios = {
  exito?: boolean;
  estado?: string;
  fecha?: string;
  horarios_disponibles?: string[];
  cantidad_disponible?: number;
  mensaje?: string;
};

type Notificacion = {
  id: string;
  negocio_id: string;
  turno_id: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
};

function convertirFechaLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fecha: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function formatearFechaCorta(fecha: string) {
  const [anio, mes, dia] = fecha.split("-");

  return `${dia}/${mes}/${anio}`;
}

function obtenerNumeroWhatsApp(telefono: string) {
  const soloNumeros = telefono.replace(/\D/g, "");

  if (soloNumeros.startsWith("549")) {
    return soloNumeros;
  }

  if (soloNumeros.startsWith("54")) {
    return `549${soloNumeros.slice(2)}`;
  }

  return `549${soloNumeros}`;
}

function calcularHoraFin(horaInicio: string, duracionMinutos = 30) {
  const [horas, minutos] = horaInicio
    .slice(0, 5)
    .split(":")
    .map(Number);

  const minutosTotales =
    horas * 60 + minutos + duracionMinutos;

  const horasFinales = Math.floor(minutosTotales / 60) % 24;
  const minutosFinales = minutosTotales % 60;

  return `${String(horasFinales).padStart(2, "0")}:${String(
    minutosFinales,
  ).padStart(2, "0")}`;
}

function turnoYaFinalizoHoy(turno: Turno, referencia: Date) {
  const fechaActual = convertirFechaLocal(referencia);

  if (turno.fecha !== fechaActual || turno.estado !== "confirmado") {
    return false;
  }

  const [horaFin, minutoFin] = turno.hora_fin
    .slice(0, 5)
    .split(":")
    .map(Number);

  const minutosFinTurno = horaFin * 60 + minutoFin;
  const minutosActuales = referencia.getHours() * 60 + referencia.getMinutes();

  return minutosFinTurno <= minutosActuales;
}

export default function Dashboard() {
  const router = useRouter();

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("hoy");
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [ahora, setAhora] = useState(() => new Date());

  const [cancelandoId, setCancelandoId] = useState<
    string | null
  >(null);

  const [reprogramandoId, setReprogramandoId] = useState<
    string | null
  >(null);

  const [turnoAReprogramar, setTurnoAReprogramar] =
    useState<Turno | null>(null);

  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState("");

  const [mensaje, setMensaje] = useState<Mensaje>(null);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [panelNotificacionesAbierto, setPanelNotificacionesAbierto] =
    useState(false);
  const [notificacionEntrante, setNotificacionEntrante] =
    useState<Notificacion | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  const hoy = useMemo(() => new Date(), []);

  const manana = useMemo(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1);

    return fecha;
  }, []);

  useEffect(() => {
    const actualizarReloj = () => setAhora(new Date());

    actualizarReloj();
    const intervalo = window.setInterval(actualizarReloj, 60_000);

    return () => window.clearInterval(intervalo);
  }, []);

  function habilitarAudio() {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
  }

  function reproducirSonidoNotificacion() {
    const contexto = audioContextRef.current;

    if (!contexto || contexto.state !== "running") {
      return;
    }

    const tocarTono = (frecuencia: number, inicio: number, duracion: number) => {
      const oscilador = contexto.createOscillator();
      const ganancia = contexto.createGain();

      oscilador.type = "sine";
      oscilador.frequency.value = frecuencia;

      ganancia.gain.setValueAtTime(0.0001, inicio);
      ganancia.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(
        0.0001,
        inicio + duracion,
      );

      oscilador.connect(ganancia);
      ganancia.connect(contexto.destination);

      oscilador.start(inicio);
      oscilador.stop(inicio + duracion);
    };

    const ahoraAudio = contexto.currentTime;
    tocarTono(880, ahoraAudio, 0.16);
    tocarTono(1175, ahoraAudio + 0.2, 0.2);
  }

  async function recargarTurnos() {
    try {
      const data = await getTurnos();
      setTurnos(data as Turno[]);
    } catch (error) {
      console.error("No se pudo actualizar la agenda en tiempo real:", error);
    }
  }

  async function marcarNotificacionComoLeida(notificacion: Notificacion) {
    if (notificacion.leida) {
      return;
    }

    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("id", notificacion.id);

    if (error) {
      console.error("No se pudo marcar la notificación como leída:", error);
      return;
    }

    setNotificaciones((actuales) =>
      actuales.map((item) =>
        item.id === notificacion.id ? { ...item, leida: true } : item,
      ),
    );
  }

  useEffect(() => {
    const desbloquearAudio = () => {
      habilitarAudio();
    };

    window.addEventListener("pointerdown", desbloquearAudio, { once: true });
    window.addEventListener("keydown", desbloquearAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", desbloquearAudio);
      window.removeEventListener("keydown", desbloquearAudio);
    };
  }, []);

  useEffect(() => {
    async function cargarNotificaciones() {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("No se pudieron cargar las notificaciones:", error);
        return;
      }

      setNotificaciones((data ?? []) as Notificacion[]);
    }

    void cargarNotificaciones();

    const canal = supabase
      .channel("agenda-notificaciones")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
        },
        (payload) => {
          const nuevaNotificacion = payload.new as Notificacion;

          setNotificaciones((actuales) => [
            nuevaNotificacion,
            ...actuales.filter(
              (item) => item.id !== nuevaNotificacion.id,
            ),
          ]);

          setNotificacionEntrante(nuevaNotificacion);
          reproducirSonidoNotificacion();
          void recargarTurnos();

          window.setTimeout(() => {
            setNotificacionEntrante((actual) =>
              actual?.id === nuevaNotificacion.id ? null : actual,
            );
          }, 6500);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    async function cargarTurnos() {
      try {
        setLoading(true);
        setError("");

        const data = await getTurnos();
        setTurnos(data as Turno[]);
      } catch (error) {
        console.error(error);
        setError("No se pudieron cargar los turnos.");
      } finally {
        setLoading(false);
      }
    }

    cargarTurnos();
  }, []);

  useEffect(() => {
    if (!turnoAReprogramar || !nuevaFecha) {
      setHorariosDisponibles([]);
      setErrorHorarios("");
      return;
    }

    const controller = new AbortController();

    async function cargarHorariosDisponibles() {
      try {
        setCargandoHorarios(true);
        setErrorHorarios("");
        setHorariosDisponibles([]);
        setNuevaHora("");

        const response = await fetch(WEBHOOK_HORARIOS_DISPONIBLES, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            fecha: nuevaFecha,
          }),
          signal: controller.signal,
        });

        const textoRespuesta = await response.text();
        let resultado: RespuestaHorarios = {};

        if (textoRespuesta) {
          try {
            resultado = JSON.parse(textoRespuesta);
          } catch {
            resultado = {
              exito: response.ok,
              mensaje: textoRespuesta,
            };
          }
        }

        if (!response.ok || resultado.exito === false) {
          setErrorHorarios(
            resultado.mensaje ||
              "No se pudieron consultar los horarios disponibles.",
          );
          return;
        }

        const horarios = Array.isArray(resultado.horarios_disponibles)
          ? resultado.horarios_disponibles.map((hora) => hora.slice(0, 5))
          : [];

        setHorariosDisponibles(horarios);

        if (horarios.length === 0) {
          setErrorHorarios("No quedan horarios disponibles para esta fecha.");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al consultar horarios disponibles:", error);
        setErrorHorarios(
          "No se pudieron cargar los horarios disponibles. Intentá nuevamente.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setCargandoHorarios(false);
        }
      }
    }

    cargarHorariosDisponibles();

    return () => {
      controller.abort();
    };
  }, [turnoAReprogramar, nuevaFecha]);

  const horariosReprogramacionVisibles = useMemo(() => {
    if (!nuevaFecha) {
      return [];
    }

    const fechaActual = convertirFechaLocal(ahora);

    if (nuevaFecha !== fechaActual) {
      return horariosDisponibles;
    }

    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

    return horariosDisponibles.filter((hora) => {
      const [horas, minutos] = hora.slice(0, 5).split(":").map(Number);
      const minutosHorario = horas * 60 + minutos;

      return minutosHorario > minutosActuales;
    });
  }, [horariosDisponibles, nuevaFecha, ahora]);

  const turnosFiltrados = useMemo(() => {
    const fechaHoy = convertirFechaLocal(ahora);
    const fechaManana = convertirFechaLocal(manana);
    const textoBuscado = busqueda.trim().toLowerCase();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

    return turnos.filter((turno) => {
      let coincideConFecha = true;

      if (filtro === "hoy") {
        const [horaFin, minutoFin] = turno.hora_fin
          .slice(0, 5)
          .split(":")
          .map(Number);

        const minutosFinTurno = horaFin * 60 + minutoFin;

        coincideConFecha =
          turno.fecha === fechaHoy &&
          turno.estado !== "cancelado" &&
          minutosFinTurno > minutosActuales;
      }

      if (filtro === "manana") {
        coincideConFecha =
          turno.fecha === fechaManana &&
          turno.estado !== "cancelado";
      }

      if (filtro === "todos") {
        // "Todos" conserva el resumen completo del día actual
        // (pendientes, cancelados y ya atendidos) y muestra además
        // todos los turnos futuros. Los días anteriores desaparecen.
        coincideConFecha = turno.fecha >= fechaHoy;
      }

      if (!coincideConFecha) {
        return false;
      }

      if (!textoBuscado) {
        return true;
      }

      const nombre =
        turno.clientes?.nombre?.toLowerCase() ?? "";

      const telefono =
        turno.clientes?.telefono?.toLowerCase() ?? "";

      const servicio =
        turno.servicios?.nombre?.toLowerCase() ?? "";

      return (
        nombre.includes(textoBuscado) ||
        telefono.includes(textoBuscado) ||
        servicio.includes(textoBuscado)
      );
    });
  }, [turnos, filtro, manana, busqueda, ahora]);

  const confirmados = turnosFiltrados.filter(
    (turno) => turno.estado === "confirmado",
  );

  const proximoTurno = useMemo(() => {
    if (filtro !== "hoy") {
      return null;
    }

    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

    return (
      confirmados.find((turno) => {
        const [horaFin, minutoFin] = turno.hora_fin
          .slice(0, 5)
          .split(":")
          .map(Number);

        const minutosFinTurno = horaFin * 60 + minutoFin;

        return minutosFinTurno > minutosActuales;
      }) ?? null
    );
  }, [confirmados, filtro, ahora]);

  async function cerrarSesion() {
    await supabase.auth.signOut();

    router.replace("/");
    router.refresh();
  }

  async function cancelarTurno(turno: Turno) {
    const telefono = turno.clientes?.telefono;
    const nombre =
      turno.clientes?.nombre ?? "este cliente";

    if (!telefono) {
      setMensaje({
        tipo: "error",
        texto:
          "No se puede cancelar porque el cliente no tiene teléfono.",
      });

      return;
    }

    const confirmado = window.confirm(
      `¿Seguro que querés cancelar el turno de ${nombre} del ${formatearFechaCorta(
        turno.fecha,
      )} a las ${turno.hora_inicio.slice(0, 5)}?`,
    );

    if (!confirmado) {
      return;
    }

    try {
      setCancelandoId(turno.id);
      setMensaje(null);

      const response = await fetch(WEBHOOK_CANCELAR, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          telefono,
        }),
      });

      const textoRespuesta = await response.text();

      let resultado: RespuestaWebhook = {};

      if (textoRespuesta) {
        try {
          resultado = JSON.parse(textoRespuesta);
        } catch {
          resultado = {
            ok: response.ok,
            mensaje: textoRespuesta,
          };
        }
      }

      if (!response.ok) {
        throw new Error(
          resultado.mensaje ||
            "n8n no pudo procesar la cancelación.",
        );
      }

      if (resultado.ok === false) {
        throw new Error(
          resultado.mensaje ||
            "No se encontró un turno activo.",
        );
      }

      setTurnos((turnosActuales) =>
        turnosActuales.map((turnoActual) =>
          turnoActual.id === turno.id
            ? {
                ...turnoActual,
                estado: "cancelado",
              }
            : turnoActual,
        ),
      );

      setMensaje({
        tipo: "exito",
        texto:
          resultado.mensaje ||
          "Turno cancelado correctamente.",
      });
    } catch (error) {
      console.error("Error al cancelar el turno:", error);

      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No se pudo cancelar el turno.",
      });
    } finally {
      setCancelandoId(null);
    }
  }

  function abrirModalReprogramar(turno: Turno) {
    setMensaje(null);
    setErrorHorarios("");
    setHorariosDisponibles([]);
    setTurnoAReprogramar(turno);
    setNuevaFecha(turno.fecha);
    setNuevaHora("");
  }

  function cerrarModalReprogramar() {
    if (reprogramandoId) {
      return;
    }

    setTurnoAReprogramar(null);
    setNuevaFecha("");
    setNuevaHora("");
    setHorariosDisponibles([]);
    setErrorHorarios("");
  }

  async function confirmarReprogramacion() {
    if (!turnoAReprogramar) {
      return;
    }

    const telefono =
      turnoAReprogramar.clientes?.telefono;

    if (!telefono) {
      setMensaje({
        tipo: "error",
        texto:
          "No se puede reprogramar porque el cliente no tiene teléfono.",
      });

      cerrarModalReprogramar();
      return;
    }

    if (!nuevaFecha || !nuevaHora) {
      setMensaje({
        tipo: "error",
        texto:
          "Tenés que seleccionar una nueva fecha y una nueva hora.",
      });

      return;
    }

    if (
      nuevaFecha === turnoAReprogramar.fecha &&
      nuevaHora ===
        turnoAReprogramar.hora_inicio.slice(0, 5)
    ) {
      setMensaje({
        tipo: "error",
        texto:
          "La fecha y la hora nuevas son iguales a las actuales.",
      });

      return;
    }

    try {
      setReprogramandoId(turnoAReprogramar.id);
      setMensaje(null);

      const response = await fetch(WEBHOOK_REPROGRAMAR, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          telefono,
          nueva_fecha: nuevaFecha,
          nueva_hora: nuevaHora,
        }),
      });

      const textoRespuesta = await response.text();

      let resultado: RespuestaWebhook = {};

      if (textoRespuesta) {
        try {
          resultado = JSON.parse(textoRespuesta);
        } catch {
          resultado = {
            ok: response.ok,
            mensaje: textoRespuesta,
          };
        }
      }

      if (!response.ok || resultado.ok === false) {
        setMensaje({
          tipo: "error",
          texto:
            resultado.mensaje ||
            "No se pudo reprogramar el turno.",
        });

        return;
      }

      const duracion =
        turnoAReprogramar.servicios?.duracion_minutos ??
        30;

      const nuevaHoraFin =
        resultado.hora_fin?.slice(0, 5) ||
        calcularHoraFin(nuevaHora, duracion);

      setTurnos((turnosActuales) =>
        turnosActuales.map((turnoActual) =>
          turnoActual.id === turnoAReprogramar.id
            ? {
                ...turnoActual,
                fecha: nuevaFecha,
                hora_inicio: nuevaHora,
                hora_fin: nuevaHoraFin,
              }
            : turnoActual,
        ),
      );

      setMensaje({
        tipo: "exito",
        texto:
          resultado.mensaje ||
          "Turno reprogramado y cliente notificado correctamente.",
      });

      setTurnoAReprogramar(null);
      setNuevaFecha("");
      setNuevaHora("");
    } catch (error) {
      console.error(
        "Error al reprogramar el turno:",
        error,
      );

      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No se pudo reprogramar el turno.",
      });
    } finally {
      setReprogramandoId(null);
    }
  }

  function tituloFiltro() {
    if (filtro === "hoy") {
      return formatearFecha(hoy);
    }

    if (filtro === "manana") {
      return formatearFecha(manana);
    }

    return "Todos los turnos";
  }

  const cantidadNoLeidas = notificaciones.filter(
    (notificacion) => !notificacion.leida,
  ).length;

  const cancelados = turnosFiltrados.filter(
    (turno) => turno.estado === "cancelado",
  ).length;

  const totalVisibles = turnosFiltrados.length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 selection:bg-violet-200 selection:text-violet-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-[420px] w-[420px] rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute -right-40 top-32 h-[480px] w-[480px] rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      {notificacionEntrante && (
        <button
          type="button"
          onClick={() => {
            setPanelNotificacionesAbierto(true);
            void marcarNotificacionComoLeida(notificacionEntrante);
            setNotificacionEntrante(null);
          }}
          className="fixed right-4 top-4 z-[70] w-[min(92vw,410px)] overflow-hidden rounded-2xl border border-violet-200 bg-white/95 p-4 text-left shadow-2xl shadow-slate-300/60 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-violet-400 sm:right-6 sm:top-6"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-violet-600" />
          <div className="flex items-start gap-3 pl-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-lg text-violet-600">
              ✦
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Nueva actividad
                </p>
              </div>
              <p className="mt-1.5 font-semibold text-slate-900">
                {notificacionEntrante.titulo}
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {notificacionEntrante.mensaje}
              </p>
            </div>
          </div>
        </button>
      )}

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-xl shadow-slate-200/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-xl font-black text-violet-600 shadow-inner shadow-violet-100">
              B
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Peluquería Zuchelli
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  En línea
                </span>
              </div>
              <p className="mt-1 text-sm capitalize text-slate-500">
                {formatearFecha(hoy)} · Agenda inteligente
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                setPanelNotificacionesAbierto((abierto) => !abierto)
              }
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-600 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              aria-label="Abrir notificaciones"
              title="Notificaciones"
            >
              ♢
              {cantidadNoLeidas > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-black text-white shadow-lg shadow-violet-200">
                  {cantidadNoLeidas > 99 ? "99+" : cantidadNoLeidas}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={cerrarSesion}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              Cerrar sesión
            </button>

            {panelNotificacionesAbierto && (
              <div className="absolute right-0 top-14 z-50 w-[min(92vw,430px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/60 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
                  <div>
                    <p className="font-semibold">Actividad reciente</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {cantidadNoLeidas} sin leer
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanelNotificacionesAbierto(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    ✕
                  </button>
                </div>

                <div className="max-h-[440px] overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <p className="text-sm font-medium text-slate-600">
                        Sin actividad todavía
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Las reservas y cambios van a aparecer acá.
                      </p>
                    </div>
                  ) : (
                    notificaciones.map((notificacion) => (
                      <button
                        key={notificacion.id}
                        type="button"
                        onClick={() =>
                          void marcarNotificacionComoLeida(notificacion)
                        }
                        className={`group w-full border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 ${
                          notificacion.leida ? "opacity-55" : "bg-violet-50/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              notificacion.leida
                                ? "bg-slate-300"
                                : "bg-violet-500 shadow-[0_0_9px_rgba(139,92,246,0.35)]"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-950">
                              {notificacion.titulo}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-500 group-hover:text-slate-600">
                              {notificacion.mensaje}
                            </p>
                            <p className="mt-2 text-[11px] text-zinc-700">
                              {new Intl.DateTimeFormat("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(notificacion.created_at))}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <article className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-6 shadow-xl shadow-slate-200/80 sm:p-7">
            <div className="absolute right-0 top-0 h-44 w-44 translate-x-1/3 -translate-y-1/3 rounded-full bg-violet-600/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/80">
                    Próximo cliente
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    La próxima atención programada para hoy
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  Hoy
                </span>
              </div>

              {proximoTurno ? (
                <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-5xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl">
                      {proximoTurno.hora_inicio.slice(0, 5)}
                    </p>
                    <h2 className="mt-4 text-xl font-bold text-slate-950 sm:text-2xl">
                      {proximoTurno.clientes?.nombre ?? "Cliente sin nombre"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {proximoTurno.servicios?.nombre ?? "Servicio sin especificar"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 sm:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Finaliza
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-700">
                      {proximoTurno.hora_fin.slice(0, 5)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-5 py-8">
                  <p className="text-xl font-bold text-slate-600">Agenda liberada</p>
                  <p className="mt-1 text-sm text-slate-400">
                    No quedan turnos confirmados próximos para hoy.
                  </p>
                </div>
              )}
            </div>
          </article>

          <div className="grid grid-cols-2 gap-4">
            <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-lg shadow-emerald-100/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/[0.08] text-sm text-emerald-600">
                ✓
              </div>
              <p className="mt-5 text-3xl font-black tracking-tight">{confirmados.length}</p>
              <p className="mt-1 text-sm text-slate-500">Confirmados</p>
            </article>

            <article className="rounded-3xl border border-rose-100 bg-rose-50 p-5 shadow-lg shadow-rose-100/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-sm text-rose-600">
                ×
              </div>
              <p className="mt-5 text-3xl font-black tracking-tight">{cancelados}</p>
              <p className="mt-1 text-sm text-slate-500">Cancelados</p>
            </article>

            <article className="col-span-2 flex items-center justify-between rounded-3xl border border-sky-100 bg-sky-50 p-5 shadow-lg shadow-sky-100/60">
              <div>
                <p className="text-sm text-slate-500">Turnos en vista</p>
                <p className="mt-1 text-2xl font-black">{totalVisibles}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Estado
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Sincronizado
                </p>
              </div>
            </article>
          </div>
        </section>

        {mensaje && (
          <div
            className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
              mensaje.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <span className="mt-0.5 font-black">
              {mensaje.tipo === "exito" ? "✓" : "!"}
            </span>
            <span>{mensaje.texto}</span>
          </div>
        )}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Período
              </p>
              <nav className="flex w-fit rounded-xl bg-slate-100 p-1">
                {(["hoy", "manana", "todos"] as Filtro[]).map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setFiltro(opcion)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      filtro === opcion
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                        : "text-slate-600 hover:text-violet-700"
                    }`}
                  >
                    {opcion === "hoy" ? "Hoy" : opcion === "manana" ? "Mañana" : "Todos"}
                  </button>
                ))}
              </nav>
            </div>

            <div className="w-full lg:max-w-md">
              <label
                htmlFor="buscar-turno"
                className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"
              >
                Buscar en agenda
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input
                  id="buscar-turno"
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre, teléfono o servicio..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 pb-10">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Agenda</p>
              <h2 className="mt-1 text-xl font-bold capitalize sm:text-2xl">{tituloFiltro()}</h2>
            </div>
            <p className="text-sm text-slate-400">
              {turnosFiltrados.length} {turnosFiltrados.length === 1 ? "turno" : "turnos"}
            </p>
          </div>

          {loading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-lg shadow-slate-200/60">
              Cargando agenda...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
          )}

          {!loading && !error && turnosFiltrados.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">—</div>
              <p className="mt-4 text-lg font-bold text-slate-700">No hay turnos para mostrar</p>
              <p className="mt-1 text-sm text-slate-400">Probá cambiando el período o la búsqueda.</p>
            </div>
          )}

          {!loading && !error && turnosFiltrados.length > 0 && (
            <div className="space-y-2.5">
              {turnosFiltrados.map((turno) => {
                const confirmado = turno.estado === "confirmado";
                const cancelado = turno.estado === "cancelado";
                const atendidoHoy = turnoYaFinalizoHoy(turno, ahora);
                const puedeModificar = confirmado && !atendidoHoy;

                return (
                  <article
                    key={turno.id}
                    className={`group relative overflow-hidden rounded-2xl border shadow-lg transition duration-200 hover:-translate-y-[1px] hover:shadow-xl ${
                      atendidoHoy
                        ? "border-sky-200 bg-sky-50/80 shadow-sky-100/70 hover:border-sky-300 hover:shadow-sky-100"
                        : cancelado
                          ? "border-rose-200 bg-white shadow-rose-100/40 hover:border-rose-300"
                          : "border-slate-200 bg-white shadow-slate-200/60 hover:border-violet-200 hover:shadow-violet-100/60"
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 w-1 ${
                        atendidoHoy
                          ? "bg-sky-400"
                          : confirmado
                            ? "bg-emerald-400"
                            : cancelado
                              ? "bg-red-400"
                              : "bg-slate-400"
                      }`}
                    />
                    <div className="grid gap-4 p-4 pl-5 sm:grid-cols-[105px_1fr_auto] sm:items-center sm:p-5 sm:pl-6">
                      <div className="flex items-baseline gap-2 sm:block">
                        <p className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                          {turno.hora_inicio.slice(0, 5)}
                        </p>
                        <p className="text-xs text-slate-400 sm:mt-1">
                          → {turno.hora_fin.slice(0, 5)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-bold text-slate-950 sm:text-lg">
                            {turno.clientes?.nombre ?? "Cliente sin nombre"}
                          </h3>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                            atendidoHoy
                              ? "border-sky-200 bg-sky-100 text-sky-700"
                              : confirmado
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : cancelado
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}>
                            {atendidoHoy ? "Atendido" : turno.estado}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                            {turno.servicios?.nombre ?? "Servicio sin especificar"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          {turno.clientes?.telefono && <span>{turno.clientes.telefono}</span>}
                          {filtro === "todos" && <span>{formatearFechaCorta(turno.fecha)}</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {turno.clientes?.telefono && (
                          <a
                            href={`https://wa.me/${obtenerNumeroWhatsApp(turno.clientes.telefono)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-[#25D366] px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-[#1fbe5b]"
                          >
                            WhatsApp
                          </a>
                        )}

                        {puedeModificar && (
                          <button
                            type="button"
                            onClick={() => abrirModalReprogramar(turno)}
                            disabled={reprogramandoId === turno.id || cancelandoId === turno.id}
                            className="rounded-xl bg-violet-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {reprogramandoId === turno.id ? "Reprogramando..." : "Reprogramar"}
                          </button>
                        )}

                        {puedeModificar && (
                          <button
                            type="button"
                            onClick={() => cancelarTurno(turno)}
                            disabled={cancelandoId === turno.id || reprogramandoId === turno.id}
                            className="rounded-xl border border-rose-300 bg-white px-3.5 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {cancelandoId === turno.id ? "Cancelando..." : "Cancelar"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {turnoAReprogramar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-md">
          <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-400/30">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600/70">Editar reserva</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {turnoAReprogramar.clientes?.nombre ?? "Cliente sin nombre"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {turnoAReprogramar.servicios?.nombre ?? "Servicio sin especificar"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrarModalReprogramar}
                  disabled={Boolean(reprogramandoId)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Turno actual</p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-700">
                    {formatearFechaCorta(turnoAReprogramar.fecha)} · {turnoAReprogramar.hora_inicio.slice(0, 5)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Confirmado</span>
              </div>

              <div className="mt-5">
                <label htmlFor="nueva-fecha" className="mb-2 block text-xs font-semibold text-slate-600">
                  Nueva fecha
                </label>
                <input
                  id="nueva-fecha"
                  type="date"
                  min={convertirFechaLocal(hoy)}
                  value={nuevaFecha}
                  onChange={(event) => {
                    setNuevaFecha(event.target.value);
                    setNuevaHora("");
                  }}
                  disabled={Boolean(reprogramandoId)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-40"
                />
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold text-slate-600">Horarios disponibles</label>
                  {nuevaHora && <span className="text-xs font-semibold text-violet-600">Elegido: {nuevaHora}</span>}
                </div>

                {cargandoHorarios && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Consultando disponibilidad...</div>
                )}

                {!cargandoHorarios && errorHorarios && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorHorarios}</div>
                )}

                {!cargandoHorarios &&
                  !errorHorarios &&
                  horariosDisponibles.length > 0 &&
                  horariosReprogramacionVisibles.length === 0 && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                      Ya no quedan horarios futuros disponibles para hoy.
                    </div>
                  )}

                {!cargandoHorarios && !errorHorarios && horariosReprogramacionVisibles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {horariosReprogramacionVisibles.map((hora) => {
                      const seleccionada = nuevaHora === hora;
                      return (
                        <button
                          key={hora}
                          type="button"
                          onClick={() => setNuevaHora(hora)}
                          disabled={Boolean(reprogramandoId)}
                          className={`rounded-xl border px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            seleccionada
                              ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-200"
                              : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                          }`}
                        >
                          {hora}
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Solo se muestran horarios libres. Cada turno dura 30 minutos.
                </p>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalReprogramar}
                  disabled={Boolean(reprogramandoId)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={confirmarReprogramacion}
                  disabled={Boolean(reprogramandoId) || cargandoHorarios || !nuevaFecha || !nuevaHora}
                  className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {reprogramandoId ? "Guardando cambios..." : "Confirmar cambio"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}