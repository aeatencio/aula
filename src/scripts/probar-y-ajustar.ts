import { instrucciones } from "../data/actividad-lo-que-queriamos.ts";

/*
  «Probar y ajustar el programa»: el mismo caso de la tienda, pensado para la
  pantalla. Primero se predice y se ejecuta paso a paso; después se reordenan
  las instrucciones y se prueba el programa con varias compras.
*/

/** Números de instrucción (1 a 4), en el orden en que se ejecutan. */
export type Programa = readonly number[];

export type Compra = { nombre: string; precio: number; envio: number };

export const ORIGINAL: Programa = [1, 2, 3, 4];

export const compras: readonly Compra[] = [
  { nombre: "Campera", precio: 10000, envio: 2000 },
  { nombre: "Zapatillas", precio: 30000, envio: 2000 },
  { nombre: "Mochila", precio: 15000, envio: 3000 },
];

export const predicciones: readonly number[] = [9000, 10800, 11000, 12000];

export function pesos(valor: number): string {
  return `$${String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Lo que la dueña quiere cobrar: descuento sólo sobre el producto. */
export function querido(compra: Compra): number {
  return compra.precio - compra.precio / 10 + compra.envio;
}

/**
 * Ejecuta el programa. Devuelve el total después de cada instrucción y lo que
 * quedó en la pantalla. El total empieza en $0.
 */
export function ejecutar(
  programa: Programa,
  compra: Compra,
): { totales: number[]; pantalla: number | undefined } {
  let total = 0;
  let pantalla: number | undefined;
  const totales: number[] = [];
  for (const n of programa) {
    if (n === 1) total = compra.precio;
    if (n === 2) total += compra.envio;
    if (n === 3) total -= total / 10;
    if (n === 4) pantalla = total;
    totales.push(total);
  }
  return { totales, pantalla };
}

/** Un comentario sobre el programa, sin decir cómo ordenarlo. */
export function diagnosticar(programa: Programa): string | undefined {
  const lugar = (n: number) => programa.indexOf(n);
  if (compras.every((compra) => ejecutar(programa, compra).pantalla === querido(compra))) {
    return undefined;
  }
  if (lugar(4) !== programa.length - 1) {
    return "La pantalla muestra el total antes de que terminen los cálculos. ¿Dónde tiene que estar «Mostrar el total»?";
  }
  if (lugar(1) !== 0) {
    return "«Anotar como total el precio del producto» reemplaza lo que había en el total: lo que se hizo antes se pierde. Seguí el total instrucción por instrucción.";
  }
  return "Seguí el total con la campera: cuando se ejecuta el descuento, ¿el total ya incluye el envío?";
}

export function mover(programa: Programa, indice: number, delta: -1 | 1): number[] {
  const copia = [...programa];
  const destino = indice + delta;
  if (destino < 0 || destino >= copia.length) return copia;
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
}

function texto(n: number): string {
  return instrucciones[n - 1] ?? "";
}

export function iniciarProbarYAjustar(): void {
  const encontrada = document.querySelector("[data-probar-y-ajustar]");
  if (!(encontrada instanceof HTMLElement)) return;
  const raiz: HTMLElement = encontrada;

  const q = <T extends Element>(selector: string) => raiz.querySelector<T>(selector);
  const campera = compras[0];
  const anuncios = new Map<HTMLElement, number>();

  function anunciar(estado: HTMLElement | null, mensaje: string): void {
    if (!estado) return;
    window.clearTimeout(anuncios.get(estado));
    estado.textContent = "";
    anuncios.set(
      estado,
      window.setTimeout(() => {
        estado.textContent = mensaje;
      }, 80),
    );
  }

  /* ---------- 1. Predecir y ejecutar ---------- */

  let paso = 0;
  const filas = [...raiz.querySelectorAll<HTMLTableRowElement>("[data-traza] tbody tr")];
  const pantalla = q<HTMLElement>("[data-pantalla]");
  const estadoTraza = q<HTMLElement>("[data-estado-traza]");
  const botonPaso = q<HTMLButtonElement>("[data-paso]");

  function prediccion(): number | undefined {
    const elegida = q<HTMLInputElement>("input[name='prediccion']:checked");
    return elegida ? Number(elegida.value) : undefined;
  }

  function pintarTraza(): void {
    const { totales, pantalla: mostrado } = ejecutar(ORIGINAL.slice(0, paso), campera);
    filas.forEach((fila, indice) => {
      const celda = fila.querySelector<HTMLElement>("[data-total]");
      if (celda) celda.textContent = indice < paso ? pesos(totales[indice]) : "—";
      if (indice === paso - 1) fila.setAttribute("aria-current", "step");
      else fila.removeAttribute("aria-current");
    });
    if (pantalla) pantalla.textContent = mostrado === undefined ? "—" : pesos(mostrado);
    if (botonPaso) {
      botonPaso.textContent =
        paso === 0 ? "Ejecutar la primera instrucción" : "Ejecutar la siguiente instrucción";
      botonPaso.disabled = paso >= ORIGINAL.length;
    }
  }

  function ejecutarPaso(): void {
    const elegida = prediccion();
    if (elegida === undefined) {
      anunciar(estadoTraza, "Antes de ejecutar, elegí tu predicción.");
      q<HTMLInputElement>("input[name='prediccion']")?.focus();
      return;
    }
    if (paso >= ORIGINAL.length) return;
    paso += 1;
    pintarTraza();
    const total = ejecutar(ORIGINAL.slice(0, paso), campera).totales[paso - 1];
    if (paso < ORIGINAL.length) {
      anunciar(estadoTraza, `Instrucción ${paso}: el total vale ${pesos(total)}.`);
      return;
    }
    const mostrado = ejecutar(ORIGINAL, campera).pantalla ?? 0;
    const comparacion =
      elegida === mostrado
        ? "Tu predicción coincide con lo que hizo el programa."
        : `Predijiste ${pesos(elegida)}: el programa hizo otra cosa. Mirá en la tabla en qué instrucción cambió el total.`;
    anunciar(
      estadoTraza,
      `La pantalla muestra ${pesos(mostrado)}. La dueña quería ${pesos(querido(campera))}. ${comparacion} Ahora probá ajustar el programa.`,
    );
  }

  function reiniciarTraza(): void {
    paso = 0;
    pintarTraza();
    anunciar(estadoTraza, "Ejecución reiniciada. Podés cambiar tu predicción.");
  }

  /* ---------- 2. Ajustar el programa ---------- */

  let programa: number[] = [...ORIGINAL];
  const lista = q<HTMLOListElement>("[data-programa]");
  const resultados = q<HTMLTableSectionElement>("[data-resultados] tbody");
  const tablaResultados = q<HTMLElement>("[data-resultados]");
  const estadoAjuste = q<HTMLElement>("[data-estado-ajuste]");

  function boton(etiqueta: string, accion: string, n: number, deshabilitado: boolean) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mover";
    b.textContent = etiqueta;
    b.dataset.mover = accion;
    b.dataset.instruccion = String(n);
    b.setAttribute("aria-label", `${etiqueta}: ${texto(n)}`);
    b.disabled = deshabilitado;
    return b;
  }

  function pintarPrograma(): void {
    if (!lista) return;
    lista.replaceChildren(
      ...programa.map((n, indice) => {
        const li = document.createElement("li");
        li.dataset.instruccion = String(n);
        const span = document.createElement("span");
        span.className = "instruccion";
        span.textContent = texto(n);
        const controles = document.createElement("span");
        controles.className = "controles";
        controles.append(
          boton("Subir", "subir", n, indice === 0),
          boton("Bajar", "bajar", n, indice === programa.length - 1),
        );
        li.append(span, controles);
        return li;
      }),
    );
  }

  function limpiarResultados(): void {
    resultados?.replaceChildren();
    if (tablaResultados) tablaResultados.hidden = true;
  }

  function moverInstruccion(n: number, delta: -1 | 1): void {
    const indice = programa.indexOf(n);
    const nuevo = mover(programa, indice, delta);
    if (nuevo.join() === programa.join()) return;
    const habiaResultados = tablaResultados ? !tablaResultados.hidden : false;
    programa = nuevo;
    pintarPrograma();
    limpiarResultados();
    const posicion = programa.indexOf(n) + 1;
    // El foco sigue a la instrucción movida; si llegó a un extremo, pasa al otro botón.
    const preferido = lista?.querySelector<HTMLButtonElement>(
      `button[data-instruccion="${n}"][data-mover="${delta < 0 ? "subir" : "bajar"}"]`,
    );
    const otro = lista?.querySelector<HTMLButtonElement>(
      `button[data-instruccion="${n}"][data-mover="${delta < 0 ? "bajar" : "subir"}"]`,
    );
    (preferido && !preferido.disabled ? preferido : otro)?.focus();
    anunciar(
      estadoAjuste,
      `«${texto(n)}» pasó a ser la instrucción ${posicion}.` +
        (habiaResultados ? " Cambiaste el programa: volvé a probarlo." : ""),
    );
  }

  function probar(): void {
    if (!resultados || !tablaResultados) return;
    resultados.replaceChildren(
      ...compras.map((compra) => {
        const mostrado = ejecutar(programa, compra).pantalla;
        const quiere = querido(compra);
        const tr = document.createElement("tr");
        const celdas = [
          `${compra.nombre} (${pesos(compra.precio)} + ${pesos(compra.envio)} de envío)`,
          mostrado === undefined ? "—" : pesos(mostrado),
          pesos(quiere),
          mostrado === quiere ? "Sí" : "No",
        ];
        celdas.forEach((contenido, indice) => {
          const celda = document.createElement(indice === 0 ? "th" : "td");
          if (indice === 0) celda.setAttribute("scope", "row");
          celda.textContent = contenido;
          tr.append(celda);
        });
        tr.dataset.coincide = String(mostrado === quiere);
        return tr;
      }),
    );
    tablaResultados.hidden = false;
    const comentario = diagnosticar(programa);
    anunciar(
      estadoAjuste,
      comentario === undefined
        ? "Con las tres compras, la pantalla muestra lo que la dueña quería. No cambiaron los datos ni las cuentas: cambió el orden de las instrucciones."
        : `Todavía no coincide con lo que la dueña quería. ${comentario}`,
    );
  }

  function restaurar(): void {
    programa = [...ORIGINAL];
    pintarPrograma();
    limpiarResultados();
    anunciar(estadoAjuste, "Volviste al programa original.");
  }

  raiz.addEventListener("click", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element)) return;
    const movedor = destino.closest<HTMLButtonElement>("button[data-mover]");
    if (movedor) {
      moverInstruccion(Number(movedor.dataset.instruccion), movedor.dataset.mover === "subir" ? -1 : 1);
    } else if (destino.closest("[data-paso]")) ejecutarPaso();
    else if (destino.closest("[data-reiniciar-traza]")) reiniciarTraza();
    else if (destino.closest("[data-probar]")) probar();
    else if (destino.closest("[data-restaurar]")) restaurar();
  });

  for (const control of raiz.querySelectorAll<HTMLElement>("[data-con-script]")) {
    control.hidden = false;
  }
  pintarTraza();
  pintarPrograma();
  limpiarResultados();
}
