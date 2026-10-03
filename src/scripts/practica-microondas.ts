import { unidades, type Decision, type Unidad } from "../data/practica-microondas.ts";

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

const ENCAJA_INVITACION =
  " ¿Qué parte del caso lo muestra? Podés comparar tu razón con la explicación.";
const CAMBIADA =
  "Cambiaste esta respuesta después de revisar: todavía no está revisada. ";
const DESACTUALIZADA =
  "Cambiaste respuestas después de revisar. Lo que cambiaste todavía no está revisado: pulsá Revisar cuando quieras.";

function exigir<T extends Element>(
  raiz: ParentNode,
  selector: string,
  tipo: { new (): T },
): T {
  const nodo = raiz.querySelector(selector);
  if (!(nodo instanceof tipo)) {
    throw new Error(`Falta ${selector}`);
  }
  return nodo;
}

export function iniciarPracticaMicroondas(): void {
  const encontrada = document.querySelector("[data-practica-microondas]");
  if (!(encontrada instanceof HTMLElement)) return;
  const raiz: HTMLElement = encontrada;

  const practica = crearPractica(unidades);
  const radios = [
    ...raiz.querySelectorAll<HTMLInputElement>("input[type='radio'][data-decision]"),
  ];
  const anunciosPendientes = new Map<HTMLElement, number>();

  function seccionDe(unidadId: string): HTMLElement {
    return exigir(raiz, `[data-unidad="${unidadId}"]`, HTMLElement);
  }

  function cancelarAnuncio(estado: HTMLElement): void {
    window.clearTimeout(anunciosPendientes.get(estado));
    anunciosPendientes.delete(estado);
  }

  function anunciar(estado: HTMLElement, mensaje: string): void {
    // Vaciar antes permite que un mismo resumen se vuelva a anunciar.
    cancelarAnuncio(estado);
    estado.textContent = "";
    anunciosPendientes.set(
      estado,
      window.setTimeout(() => {
        anunciosPendientes.delete(estado);
        estado.textContent = mensaje;
      }, 80),
    );
  }

  function enlace(href: string, texto: string): HTMLAnchorElement {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = texto;
    a.dataset.ir = "";
    return a;
  }

  function pintarDecision(unidadId: string, decisionId: string): void {
    const fieldset = exigir(
      raiz,
      `fieldset[data-decision="${decisionId}"]`,
      HTMLFieldSetElement,
    );
    const caja = exigir(fieldset, "[data-devolucion]", HTMLElement);
    const explicacion = exigir(fieldset, "[data-explicacion]", HTMLDetailsElement);
    const propios = radios.filter((radio) => radio.dataset.decision === decisionId);
    const devolucion = practica.devolucion(decisionId);
    const elegida = practica.eleccion(decisionId);

    // El comentario describe sólo la elección revisada, no cada alternativa.
    for (const radio of propios) {
      if (devolucion && radio.value === elegida) {
        radio.setAttribute("aria-describedby", caja.id);
      } else {
        radio.removeAttribute("aria-describedby");
      }
    }

    if (devolucion) {
      fieldset.dataset.resultado = devolucion.resultado;
      const icono = document.createElement("span");
      icono.className = "devolucion-icono";
      icono.setAttribute("aria-hidden", "true");
      const marca = document.createElement("strong");
      marca.className = "devolucion-marca";
      if (devolucion.resultado === "encaja") {
        icono.textContent = "✓";
        marca.textContent = "Tu elección encaja con el caso.";
        caja.replaceChildren(icono, marca, ENCAJA_INVITACION);
      } else {
        icono.textContent = "↺";
        marca.textContent = "Conviene revisar tu elección.";
        caja.replaceChildren(icono, marca, ` ${devolucion.mensaje}`);
      }
      caja.hidden = false;
    } else if (practica.cambiadaTrasRevisar(decisionId)) {
      fieldset.dataset.resultado = "cambiada";
      caja.replaceChildren(CAMBIADA, enlace(`#revisar-${unidadId}`, "Ir a Revisar"));
      caja.hidden = false;
    } else {
      delete fieldset.dataset.resultado;
      caja.hidden = true;
      caja.replaceChildren();
    }

    const disponible = practica.explicacionDisponible(decisionId);
    explicacion.hidden = !disponible;
    if (!disponible) explicacion.open = false;
  }

  function pintarUnidad(unidadId: string): void {
    const unidad = unidades.find((item) => item.id === unidadId);
    for (const decision of unidad?.decisiones ?? []) {
      pintarDecision(unidadId, decision.id);
    }

    const seccion = seccionDe(unidadId);
    const estado = exigir(seccion, "[data-estado]", HTMLElement);
    const vigencia = exigir(seccion, "[data-vigencia]", HTMLElement);
    const atajos = exigir(seccion, "[data-atajos]", HTMLElement);

    if (practica.desactualizada(unidadId)) {
      // El resumen anterior ya no describe la selección actual.
      cancelarAnuncio(estado);
      estado.textContent = "";
      vigencia.textContent = DESACTUALIZADA;
      vigencia.hidden = false;
    } else {
      vigencia.hidden = true;
      vigencia.textContent = "";
    }

    const { revisar, sinElegir } = practica.pendientes(unidadId);
    const partes: Array<string | Node> = [];
    for (const [lista, motivo] of [
      [revisar, "conviene revisar"],
      [sinElegir, "sin elegir"],
    ] as const) {
      for (const pendiente of lista) {
        partes.push(partes.length === 0 ? "Volver a: " : ", ");
        partes.push(enlace(`#decision-${pendiente.id}`, `decisión ${pendiente.numero}`));
        partes.push(` (${motivo})`);
      }
    }
    atajos.replaceChildren(...partes);
    atajos.hidden = partes.length === 0;
  }

  function pintarTodo(): void {
    for (const unidad of unidades) pintarUnidad(unidad.id);
  }

  function revisar(unidadId: string): void {
    const mensaje = practica.revisar(unidadId);
    pintarUnidad(unidadId);
    anunciar(exigir(seccionDe(unidadId), "[data-estado]", HTMLElement), mensaje);
  }

  function ir(destinoId: string): void {
    const destino = document.getElementById(destinoId);
    if (!destino) return;
    destino.scrollIntoView?.({ block: "start" });
    destino.focus({ preventScroll: true });
  }

  function reiniciar(): void {
    practica.reiniciar();
    for (const radio of radios) {
      radio.checked = false;
    }
    for (const detalle of raiz.querySelectorAll("details")) {
      detalle.open = false;
    }
    const estados = [...raiz.querySelectorAll<HTMLElement>("[data-estado]")];
    for (const estado of estados) {
      cancelarAnuncio(estado);
      estado.textContent = "";
    }
    pintarTodo();
    raiz.querySelector<HTMLElement>(".unidad-titulo")?.focus();
    if (estados[0]) {
      anunciar(estados[0], "Empezaste de nuevo. No hay respuestas elegidas.");
    }
  }

  raiz.addEventListener("change", (evento) => {
    const radio = evento.target;
    if (!(radio instanceof HTMLInputElement) || radio.type !== "radio") return;
    const decisionId = radio.dataset.decision;
    const unidadId = radio.closest<HTMLElement>("[data-unidad]")?.dataset.unidad;
    if (!decisionId || !unidadId || !radio.checked) return;
    practica.elegir(decisionId, radio.value);
    pintarUnidad(unidadId);
  });

  raiz.addEventListener("click", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element)) return;
    const atajo = destino.closest<HTMLAnchorElement>("a[data-ir]");
    if (atajo) {
      evento.preventDefault();
      ir(atajo.hash.slice(1));
      return;
    }
    const botonRevisar = destino.closest<HTMLButtonElement>("[data-revisar]");
    if (botonRevisar) {
      revisar(botonRevisar.dataset.revisar ?? "");
      return;
    }
    if (destino.closest("[data-reiniciar]")) {
      reiniciar();
    }
  });

  // Si el navegador restauró alguna elección, la práctica parte de ella.
  for (const radio of radios) {
    if (radio.checked && radio.dataset.decision) {
      practica.elegir(radio.dataset.decision, radio.value);
    }
  }

  for (const control of raiz.querySelectorAll<HTMLElement>("[data-con-script]")) {
    control.hidden = false;
  }

  pintarTodo();
}
