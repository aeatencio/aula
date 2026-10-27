/*
  Dibujos de «Repetir», como texto HTML/SVG: programas en bloques, tableros de
  Pilas Bloques, el dibujo de Coty y el camino de las flechas. Los usan las
  páginas al construirse (hoja, papelitos, respaldo) y el ejecutor en el
  navegador. Blanco y negro, para imprimir. Estilos en bloques-repetir.css.
*/

import {
  leerTablero,
  texto,
  type Casilla,
  type EscenaCoty,
  type EscenaTablero,
  type Instruccion,
} from "../data/actividad-repetir.ts";
import type { Campo } from "../data/recorrido-repetir.ts";

export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

type OpcionesPrograma = { flechas?: boolean; inicio?: number; nombre?: string; marcar?: boolean };

/**
 * Un programa como bloques: «Repetir N veces» es una pinza con su cuerpo
 * adentro. Con `marcar`, cada bloque lleva data-k (orden de aparición) y se
 * devuelven las instrucciones en ese orden, para resaltar la que se ejecuta.
 */
export function programa(cuerpo: readonly Instruccion[], { flechas = false, inicio, nombre, marcar = false }: OpcionesPrograma = {}) {
  const orden: Instruccion[] = [];
  const bloque = (instr: Instruccion): string => {
    const k = orden.push(instr) - 1;
    const dato = marcar ? ` data-k="${k}"` : "";
    if (instr.tipo === "repetir") {
      return `<div class="rep"${dato}><div class="rep-cab">Repetir <b>${instr.veces}</b> veces</div><div class="rep-cuerpo">${instr.cuerpo.map(bloque).join("")}</div><div class="rep-pie"></div></div>`;
    }
    const clase = flechas && instr.tipo === "mover" ? "linea linea--flecha" : "linea";
    return `<div class="${clase}"${dato}>${esc(texto(instr, { flechas }))}</div>`;
  };
  const lineas = cuerpo.map(bloque).join("");
  const cabeza = nombre ? `<div class="prog-nombre">${esc(nombre)}</div>` : "";
  const empieza = inicio !== undefined ? `<div class="prog-inicio">Al empezar, PUNTOS = ${inicio}</div>` : "";
  return { html: `<div class="prog${flechas ? " prog--flechas" : ""}">${cabeza}${empieza}<div class="prog-cuerpo">${lineas}</div></div>`, orden };
}

const SIMBOLO: Record<string, string> = { P: "C", L: "L", T: "T", E: "E" };

/** Tablero de Duba o Lita, fila 0 arriba. `marcar` dibuja al personaje en otra casilla. */
export function tablero(escena: EscenaTablero, { celda = 13, marcar }: { celda?: number; marcar?: Casilla } = {}): string {
  const grilla = leerTablero(escena.filas);
  const alto = grilla.length * celda;
  const ancho = grilla[0].length * celda;
  const partes: string[] = [];
  grilla.forEach((fila, f) =>
    fila.forEach((v, c) => {
      const x = c * celda;
      const y = f * celda;
      partes.push(`<rect x="${x}" y="${y}" width="${celda}" height="${celda}" class="${v === "O" ? "obst" : "casilla"}"/>`);
      if (v === "A" && !marcar) partes.push(`<circle cx="${x + celda / 2}" cy="${y + celda / 2}" r="${celda * 0.33}" class="pers"/>`);
      if (SIMBOLO[v]) partes.push(`<text x="${x + celda / 2}" y="${y + celda * 0.72}" class="obj">${SIMBOLO[v]}</text>`);
    }),
  );
  if (marcar) {
    const [f, c] = marcar;
    partes.push(`<circle cx="${c * celda + celda / 2}" cy="${f * celda + celda / 2}" r="${celda * 0.33}" class="pers"/>`);
  }
  return `<svg class="tablero" viewBox="-1 -1 ${ancho + 2} ${alto + 2}" width="${ancho + 2}" height="${alto + 2}" role="img" aria-label="Tablero de ${escena.personaje}">${partes.join("")}</svg>`;
}

export function leyenda(personaje: string): string {
  const objetos = personaje === "Lita" ? "L lechuga · T tomate · E ensaladera" : "C churrasco";
  return `<span class="leyenda"><span class="ley-pers"></span> ${esc(personaje)} · ${objetos} · <span class="ley-obst"></span> obstáculo</span>`;
}

/** Coty: el dibujo esperado, punteado, y el punto de partida. */
export function coty(escena: EscenaCoty, { paso = 22 }: { paso?: number } = {}): string {
  const xs = escena.dibujo.map(([x]) => x);
  const ys = escena.dibujo.map(([, y]) => y);
  const minX = Math.min(...xs, 0) - 0.5;
  const maxX = Math.max(...xs, 0) + 0.5;
  const maxY = Math.max(...ys, 0) + 0.5;
  const minY = Math.min(...ys, 0) - 0.5;
  const X = (x: number) => (x - minX) * paso;
  const Y = (y: number) => (maxY - y) * paso;
  const puntos: string[] = [];
  for (let x = Math.ceil(minX); x <= maxX; x++) for (let y = Math.ceil(minY); y <= maxY; y++) puntos.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="1" class="punto"/>`);
  const esperado = escena.dibujo.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
  const ancho = (maxX - minX) * paso;
  const alto = (maxY - minY) * paso;
  return `<svg class="coty" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="La escalera que tiene que dibujar Coty">${puntos.join("")}<polyline points="${esperado}" class="esperado"/><circle cx="${X(0)}" cy="${Y(0)}" r="4" class="pers"/></svg>`;
}

/** Camino de flechas: casillas visitadas hasta el paso `hasta`. */
export function camino(casillas: readonly Casilla[], { paso = 24, hasta = casillas.length - 1 }: { paso?: number; hasta?: number } = {}): string {
  const xs = casillas.map(([x]) => x);
  const ys = casillas.map(([, y]) => y);
  const minX = Math.min(...xs) - 1;
  const maxX = Math.max(...xs) + 1;
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 1;
  const X = (x: number) => (x - minX) * paso;
  const Y = (y: number) => (maxY - y) * paso;
  const fondo: string[] = [];
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) fondo.push(`<rect x="${X(x) - paso / 2}" y="${Y(y) - paso / 2}" width="${paso}" height="${paso}" class="casilla"/>`);
  const visitadas = casillas.slice(0, hasta + 1);
  const marcas = visitadas.map(([x, y]) => `<rect x="${X(x) - paso / 2 + 3}" y="${Y(y) - paso / 2 + 3}" width="${paso - 6}" height="${paso - 6}" class="visitada"/>`);
  const linea = visitadas.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
  const [ax, ay] = visitadas[visitadas.length - 1];
  const [sx, sy] = casillas[0];
  const ancho = (maxX - minX) * paso + paso;
  const alto = (maxY - minY) * paso + paso;
  return `<svg class="camino" viewBox="${-paso / 2} ${-paso / 2} ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="Recorrido en la cuadrícula">${fondo.join("")}${marcas.join("")}<polyline points="${linea}" class="recorrido"/><text x="${X(sx)}" y="${Y(sy) + 4}" class="obj">S</text><circle cx="${X(ax)}" cy="${Y(ay)}" r="${paso * 0.28}" class="pers"/></svg>`;
}

/* Lo que se anota en el papelito (Campo, en recorrido-repetir.ts). */

const FLECHAS_TEXTO = /^[↑↓←→]$/;

/** Texto, casilleros para escribir y opciones con su cuadrito para marcar con una X. */
export function campos(lista: readonly Campo[]): string {
  return lista
    .map((c) => {
      if (typeof c === "string") return `<span class="campo-texto">${esc(c)}</span>`;
      if ("casillero" in c) return `<span class="campo-casillero campo-casillero--${c.casillero}"></span>`;
      const items = c.opciones.map(
        // U+FE0E: las flechas se ven como texto, no como emoji de color.
        (o) => `<span class="campo-opcion"><span class="campo-cuadro"></span>${esc(o)}${FLECHAS_TEXTO.test(o) ? "︎" : ""}</span>`,
      );
      return `<span class="campo-opciones">${items.join("")}</span>`;
    })
    .join(" ");
}

/** Qué gesto pide: escribir, marcar con una X, o las dos cosas. */
export function gesto(lista: readonly Campo[]): string {
  const escribe = lista.some((c) => typeof c !== "string" && "casillero" in c);
  const marca = lista.some((c) => typeof c !== "string" && "opciones" in c);
  if (escribe && marca) return "escribí el número y marcá con una X";
  return marca ? "marcá con una X" : "escribí el número";
}
