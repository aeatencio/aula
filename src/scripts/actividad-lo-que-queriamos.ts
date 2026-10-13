import { letras, preguntas } from "../data/actividad-lo-que-queriamos.ts";
import type { Unidad } from "../data/practica.ts";
import { crearPractica } from "./practica-estado.ts";

/**
 * Las preguntas, en la forma general de una práctica (data/practica.ts), para
 * usar el estado compartido de practica-estado.ts.
 * La fuente sigue siendo actividad-lo-que-queriamos.ts.
 */
export const unidad: Unidad = {
  id: "lo-que-queriamos",
  titulo: "Lo que queríamos y lo que pasó",
  caso: [],
  consigna: "",
  ayudas: [],
  decisiones: preguntas.map((pregunta) => ({
    id: pregunta.id,
    enunciado: pregunta.enunciado,
    opciones: letras.map((letra) => ({ id: letra, texto: pregunta.opciones[letra] })),
    respuesta: pregunta.respuesta,
    devoluciones: { ...pregunta.siEligieron },
    explicacion: pregunta.porque,
  })),
};

function enumerar(numeros: readonly number[]): string {
  const partes = numeros.map((numero) => `la ${numero}`);
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

export function resumir(
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
        ? "Todas tus respuestas encajan con el caso. En cada pregunta podés abrir «Por qué» y comparar tu razonamiento."
        : "Lo que elegiste encaja con el caso.",
    );
  } else {
    partes.push(`Conviene revisar ${enumerar(revisar)}.`);
  }
  if (sinElegir.length > 0) partes.push(`Quedan sin elegir: ${enumerar(sinElegir)}.`);
  if (revisar.length > 0) {
    partes.push(
      "El comentario está junto a cada pregunta. Cambiá la respuesta y volvé a revisar.",
    );
  }
  return partes.join(" ");
}

const CAMBIADA =
  "Cambiaste esta respuesta después de revisar: todavía no está revisada.";
const DESACTUALIZADA =
  "Cambiaste respuestas después de revisar. Pulsá Revisar cuando quieras.";

export function iniciarActividadLoQueQueriamos(): void {
  const encontrada = document.querySelector("[data-actividad-lo-que-queriamos]");
  if (!(encontrada instanceof HTMLElement)) return;
  const raiz: HTMLElement = encontrada;

  const practica = crearPractica([unidad]);
  const radios = [
    ...raiz.querySelectorAll<HTMLInputElement>("input[type='radio'][data-pregunta]"),
  ];
  const estado = raiz.querySelector<HTMLElement>("[data-estado]");
  const vigencia = raiz.querySelector<HTMLElement>("[data-vigencia]");
  let anuncio: number | undefined;

  function anunciar(mensaje: string): void {
    if (!estado) return;
    // Vaciar antes permite que un mismo resumen se vuelva a anunciar.
    window.clearTimeout(anuncio);
    estado.textContent = "";
    anuncio = window.setTimeout(() => {
      estado.textContent = mensaje;
    }, 80);
  }

  function pintarPregunta(id: string): void {
    const fieldset = raiz.querySelector<HTMLFieldSetElement>(`fieldset[data-pregunta="${id}"]`);
    const caja = fieldset?.querySelector<HTMLElement>("[data-devolucion]");
    const porque = fieldset?.querySelector<HTMLDetailsElement>("[data-porque]");
    if (!fieldset || !caja || !porque) return;

    const devolucion = practica.devolucion(id);
    const elegida = practica.eleccion(id);
    for (const radio of radios.filter((item) => item.dataset.pregunta === id)) {
      if (devolucion && radio.value === elegida) radio.setAttribute("aria-describedby", caja.id);
      else radio.removeAttribute("aria-describedby");
    }

    const marca = document.createElement("strong");
    if (devolucion?.resultado === "encaja") {
      fieldset.dataset.resultado = "encaja";
      marca.textContent = "✓ Encaja con el caso.";
      caja.replaceChildren(marca);
      caja.hidden = false;
    } else if (devolucion?.resultado === "revisar") {
      fieldset.dataset.resultado = "revisar";
      marca.textContent = "↺ Conviene revisar tu elección.";
      caja.replaceChildren(marca, ` ${devolucion.mensaje}`);
      caja.hidden = false;
    } else if (practica.cambiadaTrasRevisar(id)) {
      fieldset.dataset.resultado = "cambiada";
      caja.replaceChildren(CAMBIADA);
      caja.hidden = false;
    } else {
      delete fieldset.dataset.resultado;
      caja.replaceChildren();
      caja.hidden = true;
    }

    // La explicación de la respuesta correcta sólo llega a la página cuando se
    // la eligió: el HTML no la trae y una respuesta incorrecta no la revela.
    const encaja = devolucion?.resultado === "encaja";
    const texto = porque.querySelector<HTMLElement>("[data-porque-texto]");
    if (texto) {
      texto.textContent = encaja
        ? (unidad.decisiones.find((decision) => decision.id === id)?.explicacion ?? "")
        : "";
    }
    porque.hidden = !encaja;
    if (!encaja) porque.open = false;
  }

  function pintarTodo(): void {
    for (const pregunta of preguntas) pintarPregunta(pregunta.id);
    if (!vigencia) return;
    if (practica.desactualizada(unidad.id)) {
      window.clearTimeout(anuncio);
      if (estado) estado.textContent = "";
      vigencia.textContent = DESACTUALIZADA;
      vigencia.hidden = false;
    } else {
      vigencia.textContent = "";
      vigencia.hidden = true;
    }
  }

  function revisar(): void {
    practica.revisar(unidad.id);
    const encajan: number[] = [];
    const aRevisar: number[] = [];
    const sinElegir: number[] = [];
    preguntas.forEach((pregunta, indice) => {
      const resultado = practica.devolucion(pregunta.id)?.resultado;
      if (resultado === "encaja") encajan.push(indice + 1);
      else if (resultado === "revisar") aRevisar.push(indice + 1);
      else sinElegir.push(indice + 1);
    });
    pintarTodo();
    anunciar(resumir(encajan, aRevisar, sinElegir));
  }

  function reiniciar(): void {
    practica.reiniciar();
    for (const radio of radios) radio.checked = false;
    pintarTodo();
    radios[0]?.closest("fieldset")?.focus();
    anunciar("Empezaste de nuevo. No hay respuestas elegidas.");
  }

  raiz.addEventListener("change", (evento) => {
    const radio = evento.target;
    if (!(radio instanceof HTMLInputElement) || radio.type !== "radio") return;
    const id = radio.dataset.pregunta;
    if (!id || !radio.checked) return;
    practica.elegir(id, radio.value);
    pintarTodo();
  });

  raiz.addEventListener("click", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element)) return;
    if (destino.closest("[data-revisar]")) revisar();
    else if (destino.closest("[data-reiniciar]")) reiniciar();
  });

  // Si el navegador restauró alguna elección, la actividad parte de ella.
  for (const radio of radios) {
    if (radio.checked && radio.dataset.pregunta) {
      practica.elegir(radio.dataset.pregunta, radio.value);
    }
  }

  for (const control of raiz.querySelectorAll<HTMLElement>("[data-con-script]")) {
    control.hidden = false;
  }

  pintarTodo();
}
