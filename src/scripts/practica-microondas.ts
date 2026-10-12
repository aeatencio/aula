import { unidades } from "../data/practica-microondas.ts";
import { crearPractica } from "./practica-estado.ts";

export {
  crearPractica,
  resumirRevision,
  type Devolucion,
  type Pendiente,
} from "./practica-estado.ts";

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
