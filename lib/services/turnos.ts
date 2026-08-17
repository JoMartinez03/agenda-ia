import { supabase } from "../supabase";

export async function getTurnos() {
  const { data, error } = await supabase
    .from("turnos")
    .select(`
      *,
      clientes (
        nombre,
        telefono
      ),
      servicios (
        nombre,
        duracion_minutos
      )
    `)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  console.log("TURNOS:", data);
  console.log("ERROR:", error);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}