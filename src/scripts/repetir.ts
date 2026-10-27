/*
  «Repetir»: la página conduce la clase.

  - Muestra un paso por vez, según la dirección (#paso-3). Sin JavaScript se
    ven todos, uno debajo del otro. No se guarda nada: ni el avance ni las
    respuestas.
  - El «después» de cada paso con Pilas Bloques se abre con un botón: es un
    punto de control visible, no un registro.
  - Pilas Bloques se abre incrustado (una franja fija repite qué anotar) o en
    otra pestaña. Uno solo a la vez: cada uno es la aplicación entera, y al
    cerrarlo se pierde lo hecho en ese desafío (sin sesión no se guarda).
  - Ejecutores (desplegar paso a paso) y ejercicios con devolución.
*/

import {
  FLECHA,
  desplegar,
  ejecutarCamino,
  ejecutarPuntos,
  ejecutarTablero,
  leerTablero,
  mover,
  repetir,
  texto,
  type Casilla,
  type Direccion,
  type Instruccion,
} from "../data/actividad-repetir.ts";
import { generar, tipos, type Ejercicio, type Respuesta, type TipoEjercicio } from "../data/ejercicios-repetir.ts";
import { etapas, type ProgramaVista } from "../data/recorrido-repetir.ts";
import { camino, esc, programa, tablero } from "./dibujos-repetir.ts";

const numeros = (v: string) => (v.match(/-?\d+/g) ?? []).map(Number);
/** Copia sin referencias compartidas: cada bloque con identidad propia, para resaltarlo. */
const copia = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function desplazarA(el: Element | null) {
  (el as HTMLElement | null)?.scrollIntoView?.({ block: "start" });
}

/* ------------------------------------------------------------------------ */
/* Ejecutor: desplegar paso a paso                                          */
/* ------------------------------------------------------------------------ */

const corto = (instr: Instruccion) =>
  instr.tipo === "mover" || instr.tipo === "dibujar" ? FLECHA[instr.dir] : texto(instr).replace(/\.$/, "");

type PasoVista = { instr: Instruccion; vueltas: { repetir: Instruccion; vuelta: number; veces: number }[]; puntos?: number; muestra?: number; error?: string; fila?: number; col?: number };

export function crearEjecutor(caja: HTMLElement, prog: ProgramaVista, conPrediccion = false): HTMLElement {
  const doc = caja.ownerDocument;
  const cuerpo = copia(prog.cuerpo);
  const { html, orden } = programa(cuerpo, { inicio: prog.mundo === "puntos" ? prog.inicio : undefined, flechas: prog.mundo === "camino", marcar: true });
  const escritas = desplegar(cuerpo).length;

  let pasos: PasoVista[];
  let casillas: Casilla[] = [];
  let muestrasFinales: number[] = [];
  if (prog.mundo === "puntos") {
    const r = ejecutarPuntos({ inicio: prog.inicio, cuerpo });
    pasos = r.pasos;
    muestrasFinales = r.muestras;
  } else if (prog.mundo === "camino") {
    const r = ejecutarCamino({ cuerpo });
    pasos = r.pasos;
    casillas = r.casillas;
  } else {
    pasos = ejecutarTablero(prog.escena, cuerpo).pasos;
  }

  const raiz = doc.createElement("div");
  raiz.className = "ejecutor";
  raiz.innerHTML = `
    ${prog.titulo ? `<p class="ejecutor-titulo">${esc(prog.titulo)}</p>` : ""}
    ${conPrediccion ? `<label class="prediccion"><span>Antes de ejecutar: ¿qué va a mostrar la pantalla?</span><input type="text" inputmode="numeric" autocomplete="off" data-prediccion></label>` : ""}
    <div class="ejecutor-cuerpo"><div data-programa>${html}</div><div data-vista></div></div>
    <p class="ejecutor-estado" role="status" aria-atomic="true" data-estado></p>
    <div class="ejecutor-botones">
      <button type="button" class="boton" data-paso>Ejecutar una instrucción</button>
      <button type="button" class="boton boton--secundario" data-todo>Ejecutar todo</button>
      <button type="button" class="boton boton--secundario" data-reiniciar>Volver a empezar</button>
    </div>
    <div data-resultado></div>`;
  caja.append(raiz);

  const q = <T extends Element = HTMLElement>(sel: string) => raiz.querySelector<T>(sel)!;
  const vistaPrograma = q("[data-programa]");
  for (const rep of vistaPrograma.querySelectorAll(".rep")) {
    const marca = doc.createElement("span");
    marca.className = "rep-vuelta";
    rep.querySelector(":scope > .rep-cab")?.append(marca);
  }
  const bloque = (instr: Instruccion) => vistaPrograma.querySelector<HTMLElement>(`[data-k="${orden.indexOf(instr)}"]`);
  let hechos = 0;

  function vista(): string {
    if (prog.mundo === "puntos") {
      const filas = pasos.slice(0, hechos).map((paso, i) => {
        const v = paso.vueltas.at(-1);
        return `<tr${i === hechos - 1 ? ' class="ultima"' : ""}><th>${v ? `<span class="vuelta">vuelta ${v.vuelta}</span>` : ""}${esc(texto(paso.instr))}</th><td>${paso.puntos}</td></tr>`;
      });
      const mostrado = pasos.slice(0, hechos).flatMap((paso) => (paso.muestra === undefined ? [] : [paso.muestra]));
      return `<table class="seguimiento-repetir"><thead><tr><th>Se ejecuta</th><th>PUNTOS</th></tr></thead>
        <tbody><tr><th>Al empezar</th><td>${prog.inicio}</td></tr>${filas.join("")}</tbody>
        <tfoot><tr><th>La pantalla mostró</th><td>${mostrado.join(" ")}</td></tr></tfoot></table>`;
    }
    const fichas = pasos.slice(0, hechos).map((paso, i) => `<span class="ficha${i === hechos - 1 ? " ultima" : ""}">${esc(corto(paso.instr))}</span>`);
    const lista = `<p class="desplegado"><strong>Se ejecutó (${hechos} de ${escritas}):</strong> ${fichas.join("") || "—"}</p>`;
    if (prog.mundo === "camino") return camino(casillas, { hasta: hechos }) + lista;
    const ultimo = pasos[hechos - 1];
    const comio = pasos.slice(0, hechos).some((paso) => paso.instr.tipo === "comer" && !paso.error);
    const grilla = leerTablero(prog.escena.filas);
    const filas = grilla.map((fila) => fila.map((v) => (comio && v === "P" ? "-" : v)).join(","));
    const inicio = grilla.flatMap((fila, f) => fila.map((v, c) => (v === "A" ? ([f, c] as Casilla) : null))).find((x): x is Casilla => x !== null);
    const donde: Casilla | undefined = ultimo?.fila !== undefined && ultimo.col !== undefined ? [ultimo.fila, ultimo.col] : inicio;
    return tablero({ personaje: prog.escena.personaje, filas }, { celda: 30, marcar: donde }) + lista;
  }

  function pintar() {
    for (const e of vistaPrograma.querySelectorAll(".actual")) e.classList.remove("actual");
    for (const e of vistaPrograma.querySelectorAll(".rep-vuelta")) e.textContent = "";
    const paso = pasos[hechos - 1];
    const termino = hechos === pasos.length;
    if (paso && !(termino && !paso.error)) {
      bloque(paso.instr)?.classList.add("actual");
      for (const v of paso.vueltas) {
        const marca = bloque(v.repetir)?.querySelector(":scope > .rep-cab .rep-vuelta");
        if (marca) marca.textContent = `vuelta ${v.vuelta} de ${v.veces}`;
      }
    }
    q("[data-vista]").innerHTML = vista();

    const estado = q("[data-estado]");
    if (!paso) estado.textContent = `Todavía no se ejecutó nada. Este programa ejecuta ${escritas} instrucciones.`;
    else if (paso.error) estado.textContent = `Se detuvo en la vuelta ${paso.vueltas.at(-1)?.vuelta ?? "—"}: «${paso.error}».`;
    else if (termino) estado.textContent = `Terminó: se ejecutaron ${hechos} instrucciones.`;
    else {
      const v = paso.vueltas.at(-1);
      estado.textContent = `Instrucción ${hechos} de ${escritas}${v ? `, vuelta ${v.vuelta} de ${v.veces}` : ""}: ${texto(paso.instr)}`;
    }

    q<HTMLButtonElement>("[data-paso]").disabled = termino;
    q<HTMLButtonElement>("[data-todo]").disabled = termino;
    q<HTMLButtonElement>("[data-reiniciar]").disabled = hechos === 0;
    const entrada = raiz.querySelector<HTMLInputElement>("[data-prediccion]");
    if (entrada) entrada.disabled = hechos > 0;

    const resultado = q("[data-resultado]");
    resultado.innerHTML = "";
    if (termino && entrada) {
      const dijo = numeros(entrada.value);
      if (dijo.length) {
        const coincide = dijo.join() === muestrasFinales.join();
        resultado.innerHTML = `<p class="comparar">Predijiste ${dijo.join(" ")}; la pantalla mostró ${muestrasFinales.join(" ")}. ${coincide ? "Coincide." : "No coincide: buscá la primera fila que no esperabas."}</p>`;
      }
    }
  }

  q("[data-paso]").addEventListener("click", () => { hechos++; pintar(); });
  q("[data-todo]").addEventListener("click", () => { hechos = pasos.length; pintar(); });
  q("[data-reiniciar]").addEventListener("click", () => { hechos = 0; pintar(); });
  pintar();
  return raiz;
}

function grillaEjecutores(caja: HTMLElement, programas: ProgramaVista[], conPrediccion = false) {
  const grilla = caja.ownerDocument.createElement("div");
  grilla.className = "ejecutores";
  grilla.style.setProperty("--columnas", String(programas.length));
  caja.append(grilla);
  programas.forEach((p, i) => crearEjecutor(grilla, p, conPrediccion && i === 0));
}

/* ------------------------------------------------------------------------ */
/* Ejercicio con devolución                                                 */
/* ------------------------------------------------------------------------ */

const DIR: Record<string, Direccion> = { "↑": "arriba", "↓": "abajo", "←": "izquierda", "→": "derecha" };
let unico = 0;

export function crearEjercicio(caja: HTMLElement, ejercicio: Ejercicio, { barra = "", alOtro }: { barra?: string; alOtro?: () => void } = {}): HTMLElement {
  const doc = caja.ownerDocument;
  const id = ++unico;
  let armado: string[] = [];

  const respuesta = () => {
    if (ejercicio.formato === "sino") {
      return `<span class="sino" role="radiogroup" aria-label="Respuesta">
        <label><input type="radio" name="sino-${id}" value="Sí"> Sí</label>
        <label><input type="radio" name="sino-${id}" value="No"> No</label></span>`;
    }
    if (ejercicio.formato === "plegar") {
      return `<span class="plegar"><span>Repetir</span><input type="text" inputmode="numeric" autocomplete="off" data-veces aria-label="Cuántas veces" class="corto"><span>veces:</span>
        <span class="cuerpo-armado" data-armado aria-live="polite"></span>
        <span class="flechas">${Object.keys(DIR).map((f) => `<button type="button" class="boton boton--secundario" data-flecha="${f}" aria-label="Agregar ${DIR[f]}">${f}</button>`).join("")}</span>
        <button type="button" class="boton boton--secundario" data-borrar>Borrar</button></span>`;
    }
    return `<input type="text" inputmode="${ejercicio.formato === "numero" ? "numeric" : "text"}" class="${ejercicio.formato === "secuencia" ? "ancho" : ""}" autocomplete="off" data-respuesta aria-label="Respuesta">`;
  };

  const programas = () => {
    if (ejercicio.formato === "plegar") return `<p class="secuencia">${(ejercicio.secuencia ?? []).join(" ")}</p>`;
    return `<div class="programas">${ejercicio.programas
      .map((p) => {
        const html = programa(p.cuerpo, { inicio: p.mundo === "puntos" ? p.inicio : undefined, nombre: p.nombre, flechas: p.mundo === "camino" }).html;
        const dibujo = p.mundo === "fila" ? `<div>${tablero(p.escena, { celda: 24 })}</div>` : "";
        return `<div>${html}</div>${dibujo}`;
      })
      .join("")}</div>`;
  };

  const raiz = doc.createElement("div");
  raiz.className = "ejercicio";
  raiz.innerHTML = `${barra}
    <p class="consigna">${esc(ejercicio.consigna)}</p>
    ${programas()}
    <div class="responder">${respuesta()}<button type="button" class="boton" data-comprobar>Comprobar</button>
      ${alOtro ? '<button type="button" class="boton boton--secundario" data-otro>Otro ejercicio</button>' : ""}</div>
    <p class="devolucion" data-devolucion aria-live="polite"></p>
    <button type="button" class="boton boton--secundario" data-ver hidden>Ver la ejecución paso a paso</button>
    <div data-pasos></div>`;
  caja.append(raiz);
  const q = <T extends Element = HTMLElement>(sel: string) => raiz.querySelector<T>(sel);

  function valorDado(): Respuesta | undefined {
    if (ejercicio.formato === "sino") return q<HTMLInputElement>("input[type=radio]:checked")?.value;
    if (ejercicio.formato === "plegar") {
      const veces = Number(q<HTMLInputElement>("[data-veces]")?.value);
      return veces > 0 && armado.length ? { veces, cuerpo: armado.join(" ") } : undefined;
    }
    const v = q<HTMLInputElement>("[data-respuesta]")?.value.trim() ?? "";
    return v === "" ? undefined : v;
  }

  function comprobar() {
    const salida = q("[data-devolucion]")!;
    const valor = valorDado();
    if (valor === undefined) {
      salida.className = "devolucion";
      salida.textContent =
        ejercicio.formato === "sino" ? "Elegí Sí o No." : ejercicio.formato === "plegar" ? "Completá cuántas veces y armá lo de adentro con las flechas." : "Escribí una respuesta.";
      return;
    }
    const r = ejercicio.comprobar(valor);
    salida.className = r.ok ? "devolucion devolucion--ok" : "devolucion";
    salida.textContent = (r.ok ? "Coincide. " : "Todavía no. ") + r.mensaje;
    q("[data-ver]")!.hidden = false;
  }

  function verPasos() {
    const destino = q("[data-pasos]")!;
    destino.innerHTML = "";
    let progs: ProgramaVista[] = ejercicio.programas.map((p) => ({ ...p, titulo: p.nombre ?? (ejercicio.tipo === "fila" ? "El programa tal como está" : undefined) }));
    if (ejercicio.formato === "plegar") {
      const valor = valorDado();
      if (!valor || typeof valor === "string") {
        destino.innerHTML = `<p class="apoyo">Armá tu «Repetir» para ver cómo se despliega.</p>`;
        return;
      }
      progs = [{ titulo: "Tu «Repetir», desplegado", mundo: "camino", cuerpo: [repetir(valor.veces, ...valor.cuerpo.split(" ").map((f) => mover(DIR[f])))] }];
    }
    grillaEjecutores(destino, progs);
  }

  q("[data-comprobar]")!.addEventListener("click", comprobar);
  q("[data-respuesta]")?.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") comprobar(); });
  for (const b of raiz.querySelectorAll<HTMLButtonElement>("[data-flecha]")) {
    b.addEventListener("click", () => {
      armado.push(b.dataset.flecha ?? "");
      q("[data-armado]")!.textContent = armado.join(" ");
    });
  }
  q("[data-borrar]")?.addEventListener("click", () => { armado = []; q("[data-armado]")!.textContent = ""; });
  q("[data-ver]")!.addEventListener("click", verPasos);
  if (alOtro) q("[data-otro]")?.addEventListener("click", alOtro);
  return raiz;
}

/* ------------------------------------------------------------------------ */
/* Pilas Bloques: incrustado u otra pestaña                                 */
/* ------------------------------------------------------------------------ */

function cerrarPilasBloques(raiz: ParentNode) {
  for (const marco of raiz.querySelectorAll<HTMLElement>("[data-marco]")) {
    marco.querySelector("iframe")?.remove();
    marco.hidden = true;
  }
  for (const b of raiz.querySelectorAll<HTMLButtonElement>("[data-incrustar]")) b.textContent = "Abrir acá";
}

function iniciarPilasBloques(raiz: HTMLElement, alTerminar: (bloque: HTMLElement) => void) {
  const doc = raiz.ownerDocument;
  for (const bloque of raiz.querySelectorAll<HTMLElement>("[data-pb]")) {
    const boton = bloque.querySelector<HTMLButtonElement>("[data-incrustar]");
    const marco = bloque.querySelector<HTMLElement>("[data-marco]");
    if (!boton || !marco) continue;
    boton.hidden = false;
    boton.addEventListener("click", () => {
      const abierto = !marco.hidden;
      cerrarPilasBloques(raiz);
      if (abierto) return;
      const iframe = doc.createElement("iframe");
      iframe.src = bloque.dataset.pb ?? "";
      iframe.title = `Pilas Bloques: ${bloque.dataset.nombre ?? ""}`;
      marco.append(iframe);
      marco.hidden = false;
      boton.textContent = "Cerrar Pilas Bloques";
      desplazarA(marco);
    });
    bloque.querySelector("[data-ya]")?.addEventListener("click", () => {
      cerrarPilasBloques(raiz);
      alTerminar(bloque);
    });
  }
}

/* ------------------------------------------------------------------------ */
/* Recorrido: un paso por vez                                               */
/* ------------------------------------------------------------------------ */

function iniciarPasos(raiz: HTMLElement) {
  const ventana = raiz.ownerDocument.defaultView;
  const secciones = [...raiz.querySelectorAll<HTMLElement>("[data-etapa]")];
  const enlaces = [...raiz.querySelectorAll<HTMLAnchorElement>("[data-mapa] a")];
  if (!ventana || secciones.length === 0) return;

  const idActual = () => {
    const id = decodeURIComponent(ventana.location.hash.slice(1));
    return secciones.some((s) => s.id === id) ? id : secciones[0].id;
  };

  function mostrar(desplazar: boolean) {
    const id = idActual();
    for (const s of secciones) s.hidden = s.id !== id;
    for (const a of enlaces) {
      if (a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    }
    cerrarPilasBloques(raiz);
    if (desplazar) desplazarA(raiz.querySelector("[data-mapa]"));
  }

  raiz.classList.add("un-paso");
  ventana.addEventListener("hashchange", () => mostrar(true));
  mostrar(ventana.location.hash.length > 1);
}

function iniciarDespues(raiz: HTMLElement): (bloque: HTMLElement) => void {
  const abrir = (caja: HTMLElement) => {
    caja.querySelector<HTMLElement>("[data-despues-cuerpo]")?.removeAttribute("hidden");
    caja.querySelector("[data-compuerta]")?.remove();
    desplazarA(caja);
  };
  for (const caja of raiz.querySelectorAll<HTMLElement>("[data-despues]")) {
    const compuerta = caja.querySelector<HTMLElement>("[data-compuerta]");
    if (!compuerta) continue;
    compuerta.hidden = false;
    caja.querySelector("[data-despues-cuerpo]")?.setAttribute("hidden", "");
    compuerta.querySelector("button")?.addEventListener("click", () => abrir(caja));
  }
  return (bloque) => {
    const caja = bloque.closest("[data-etapa]")?.querySelector<HTMLElement>("[data-despues]");
    if (caja) abrir(caja);
  };
}

/* ------------------------------------------------------------------------ */
/* Práctica sorteada                                                        */
/* ------------------------------------------------------------------------ */

const NOMBRE_TIPO: Record<TipoEjercicio, string> = {
  contar: "Cuántas veces se ejecuta",
  pantalla: "Qué muestra la pantalla",
  valor: "Seguir el valor",
  equivalencia: "¿Hacen lo mismo?",
  movimientos: "Contar movimientos",
  plegar: "Escribir con «Repetir»",
  fila: "Corregir el número",
};

function iniciarPractica(caja: HTMLElement, azar: () => number) {
  let tipo: TipoEjercicio | "" = "";
  const otra = () => {
    caja.innerHTML = "";
    const ejercicio = generar(1 + Math.floor(azar() * 1e9), tipo || undefined);
    const barra = `<p class="practica-barra"><label>Tipo <select data-tipo>
      <option value="">Todos, al azar</option>
      ${tipos.map((t) => `<option value="${t}"${t === tipo ? " selected" : ""}>${esc(NOMBRE_TIPO[t])}</option>`).join("")}
      </select></label></p>`;
    const ej = crearEjercicio(caja, ejercicio, { barra, alOtro: otra });
    ej.querySelector("[data-tipo]")?.addEventListener("change", (e) => {
      tipo = (e.target as HTMLSelectElement).value as TipoEjercicio | "";
      otra();
    });
  };
  otra();
}

/* ------------------------------------------------------------------------ */

export function iniciarRepetir(doc: Document = document, azar: () => number = Math.random): void {
  const raiz = doc.querySelector<HTMLElement>("[data-recorrido-repetir]");
  if (!raiz) return;

  for (const caja of raiz.querySelectorAll<HTMLElement>("[data-ejecutores]")) {
    const etapa = etapas.find((e) => e.id === caja.dataset.ejecutores);
    if (etapa?.despues?.ejecutores) grillaEjecutores(caja, etapa.despues.ejecutores, etapa.despues.prediccion);
  }
  for (const caja of raiz.querySelectorAll<HTMLElement>("[data-ejercicios]")) {
    const etapa = etapas.find((e) => e.id === caja.dataset.ejercicios);
    for (const ejercicio of etapa?.despues?.ejercicios ?? []) crearEjercicio(caja, ejercicio);
  }
  const practica = raiz.querySelector<HTMLElement>("[data-practica]");
  if (practica) iniciarPractica(practica, azar);

  const abrirDespues = iniciarDespues(raiz);
  iniciarPilasBloques(raiz, abrirDespues);
  iniciarPasos(raiz);
}
