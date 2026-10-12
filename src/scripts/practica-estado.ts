/*
  Estado de una práctica de opciones con Revisar, sin datos propios: cada
  práctica le pasa sus unidades. Separado para que cada página cargue sólo sus
  casos.
*/

import type { Decision, Unidad } from "../data/practica.ts";

export type Devolucion =
  | { resultado: "encaja" }
  | { resultado: "revisar"; mensaje: string };

export type Pendiente = { id: string; numero: number };

function enumerar(numeros: readonly number[]): string {
  const partes = numeros.map((numero) => `la ${numero}`);
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

export function resumirRevision(
  encajan: readonly number[],
  revisar: readonly number[],
  sinElegir: readonly number[],
): string {
  if (encajan.length === 0 && revisar.length === 0) {
    return "Todavía no elegiste ninguna respuesta. Elegí las que puedas y pulsá Revisar.";
  }

  const partes: string[] = [];
  if (revisar.length === 0) {
    partes.push(
      sinElegir.length === 0
        ? "Todo lo que elegiste encaja con el caso. Si querés comparar tu razonamiento, abrí la explicación de cada decisión."
        : "Lo que elegiste encaja con el caso.",
    );
  } else if (encajan.length === 0) {
    partes.push(`Conviene revisar ${enumerar(revisar)}.`);
  } else {
    partes.push(
      `Hay decisiones que encajan con el caso y otras que conviene revisar: ${enumerar(revisar)}.`,
    );
  }

  if (sinElegir.length > 0) {
    partes.push(`Quedan sin elegir: ${enumerar(sinElegir)}.`);
  }

  if (revisar.length > 0) {
    partes.push(
      "Cada comentario está junto a su decisión. Podés cambiar cualquier respuesta y volver a revisar.",
    );
  }

  return partes.join(" ");
}

/**
 * Estado de una sesión de práctica, sólo en memoria. Nada queda fijo:
 * cualquier respuesta se puede cambiar después de revisar, y el resumen de
 * una unidad deja de valer en cuanto cambia una de sus elecciones.
 */
export function crearPractica(lista: readonly Unidad[]) {
  const elegidas = new Map<string, string>();
  const devoluciones = new Map<string, Devolucion>();
  const intentadas = new Set<string>();
  const resumenes = new Map<string, string>();
  const desactualizadas = new Set<string>();
  const cambiadas = new Set<string>();

  function unidadPorId(id: string): Unidad {
    const unidad = lista.find((item) => item.id === id);
    if (!unidad) throw new Error(`Unidad no encontrada: ${id}`);
    return unidad;
  }

  function ubicar(decisionId: string): { unidad: Unidad; decision: Decision } {
    for (const unidad of lista) {
      const decision = unidad.decisiones.find((item) => item.id === decisionId);
      if (decision) return { unidad, decision };
    }
    throw new Error(`Decisión no encontrada: ${decisionId}`);
  }

  return {
    elegir(decisionId: string, opcionId: string): void {
      const { unidad, decision } = ubicar(decisionId);
      if (!decision.opciones.some((opcion) => opcion.id === opcionId)) {
        throw new Error(`Opción no encontrada: ${opcionId}`);
      }
      if (elegidas.get(decisionId) === opcionId) return;
      elegidas.set(decisionId, opcionId);
      // El comentario anterior ya no corresponde a lo elegido.
      if (devoluciones.delete(decisionId)) cambiadas.add(decisionId);
      // Tampoco el resumen de la unidad.
      if (resumenes.delete(unidad.id)) desactualizadas.add(unidad.id);
    },

    eleccion(decisionId: string): string | undefined {
      return elegidas.get(decisionId);
    },

    devolucion(decisionId: string): Devolucion | undefined {
      return devoluciones.get(decisionId);
    },

    explicacionDisponible(decisionId: string): boolean {
      return intentadas.has(decisionId);
    },

    /** La elección cambió después de recibir un comentario y todavía no se volvió a revisar. */
    cambiadaTrasRevisar(decisionId: string): boolean {
      return cambiadas.has(decisionId);
    },

    resumen(unidadId: string): string | undefined {
      return resumenes.get(unidadId);
    },

    desactualizada(unidadId: string): boolean {
      return desactualizadas.has(unidadId);
    },

    /** Decisiones a las que conviene volver según la información vigente. */
    pendientes(unidadId: string): { revisar: Pendiente[]; sinElegir: Pendiente[] } {
      const revisar: Pendiente[] = [];
      const sinElegir: Pendiente[] = [];
      const vigente = resumenes.has(unidadId);
      unidadPorId(unidadId).decisiones.forEach((decision, indice) => {
        const item = { id: decision.id, numero: indice + 1 };
        if (devoluciones.get(decision.id)?.resultado === "revisar") revisar.push(item);
        else if (vigente && !elegidas.has(decision.id)) sinElegir.push(item);
      });
      return { revisar, sinElegir };
    },

    revisar(unidadId: string): string {
      const encajan: number[] = [];
      const revisar: number[] = [];
      const sinElegir: number[] = [];

      unidadPorId(unidadId).decisiones.forEach((decision, indice) => {
        const numero = indice + 1;
        cambiadas.delete(decision.id);
        const elegida = elegidas.get(decision.id);
        if (!elegida) {
          sinElegir.push(numero);
          return;
        }

        intentadas.add(decision.id);
        if (elegida === decision.respuesta) {
          encajan.push(numero);
          devoluciones.set(decision.id, { resultado: "encaja" });
          return;
        }

        revisar.push(numero);
        devoluciones.set(decision.id, {
          resultado: "revisar",
          mensaje: decision.devoluciones[elegida],
        });
      });

      const resumen = resumirRevision(encajan, revisar, sinElegir);
      resumenes.set(unidadId, resumen);
      desactualizadas.delete(unidadId);
      return resumen;
    },

    reiniciar(): void {
      elegidas.clear();
      devoluciones.clear();
      intentadas.clear();
      resumenes.clear();
      desactualizadas.clear();
      cambiadas.clear();
    },
  };
}
