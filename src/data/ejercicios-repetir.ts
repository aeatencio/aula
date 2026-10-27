/*
  Ejercicios con devolución de «Repetir».

  Cada tipo se arma con `armar.<tipo>(parámetros)`. El recorrido usa ejercicios
  fijos (los mismos para todos); «Practicar con otros números» los sortea con
  `generar(semilla)`, reproducible para probarlo. Ningún ejercicio sorteado
  repite un programa del cierre de la hoja.

  Devolución como en las actividades anteriores de Aula: si no coincide, se
  orienta sin decir la respuesta; si coincide, se dice por qué. Los mensajes
  de error no llevan números, para no filtrar respuestas.
*/

import {
  FLECHA,
  cierre,
  comer,
  desplegar,
  duplicar,
  ejecutarPuntos,
  mostrar,
  mover,
  repetir,
  sumar,
  vecesQueSeEjecuta,
  type Direccion,
  type EscenaTablero,
  type Instruccion,
} from "./actividad-repetir.ts";

export type ProgramaEjercicio =
  | { mundo: "puntos"; nombre?: string; inicio: number; cuerpo: Instruccion[] }
  | { mundo: "camino"; nombre?: string; cuerpo: Instruccion[] }
  | { mundo: "fila"; nombre?: string; escena: EscenaTablero; cuerpo: Instruccion[] };

export type Plegado = { veces: number; cuerpo: string };
export type Respuesta = string | Plegado;
export type Devolucion = { ok: boolean; mensaje: string };

export type Ejercicio = {
  tipo: TipoEjercicio;
  consigna: string;
  programas: ProgramaEjercicio[];
  /** Sólo en «plegar»: la secuencia que se muestra, sin Repetir. */
  secuencia?: string[];
  formato: "numero" | "secuencia" | "sino" | "plegar";
  respuesta: Respuesta;
  /** La respuesta como se escribe, para comprobar que ningún mensaje la revele. */
  respuestaTexto: string;
  erroresTipicos: Respuesta[];
  comprobar: (valor: Respuesta) => Devolucion;
};

export type TipoEjercicio = "contar" | "pantalla" | "valor" | "equivalencia" | "movimientos" | "plegar" | "fila";

const GENERICO = "Desplegá el programa: una fila por cada instrucción que se ejecuta. Después mirá la ejecución paso a paso.";

const numero = (v: Respuesta) => {
  const m = String(typeof v === "string" ? v : "").match(/-?\d+/);
  return m ? Number(m[0]) : undefined;
};
const numeros = (v: Respuesta) => (String(typeof v === "string" ? v : "").match(/-?\d+/g) ?? []).map(Number);
const igualLista = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i]);

type Diagnostico = [(v: Respuesta) => boolean, string];

function comprobador(esOk: (v: Respuesta) => boolean, diagnosticos: Diagnostico[], porque: string) {
  return (valor: Respuesta): Devolucion => {
    if (esOk(valor)) return { ok: true, mensaje: porque };
    for (const [coincide, mensaje] of diagnosticos) if (coincide(valor)) return { ok: false, mensaje };
    return { ok: false, mensaje: GENERICO };
  };
}

/* ------------------------------------------------------------------------ */
/* Armar cada tipo                                                          */
/* ------------------------------------------------------------------------ */

type Puntos = { inicio: number; n: number; s: number };

function contar({ inicio, n, s, adentro }: Puntos & { adentro: boolean }): Ejercicio {
  const m = mostrar();
  const cuerpo = adentro ? [repetir(n, sumar(s), m)] : [repetir(n, sumar(s)), m];
  const respuesta = vecesQueSeEjecuta(cuerpo, m);
  const otro = adentro ? 1 : n;
  return {
    tipo: "contar",
    consigna: "¿Cuántas veces se ejecuta «Mostrar PUNTOS»?",
    programas: [{ mundo: "puntos", inicio, cuerpo }],
    formato: "numero",
    respuesta: String(respuesta),
    respuestaTexto: String(respuesta),
    erroresTipicos: [String(otro)],
    comprobar: comprobador(
      (v) => numero(v) === respuesta,
      [
        [(v) => adentro && numero(v) === otro, "«Mostrar PUNTOS» está adentro del «Repetir»: se ejecuta una vez en cada vuelta."],
        [(v) => !adentro && numero(v) === otro, "«Mostrar PUNTOS» está afuera del «Repetir»: se ejecuta una sola vez, cuando terminan las vueltas."],
      ],
      adentro ? `Está adentro: se ejecuta en cada una de las ${n} vueltas.` : "Está afuera: se ejecuta una sola vez, después de la última vuelta.",
    ),
  };
}

function pantalla({ inicio, n, s, adentro }: Puntos & { adentro: boolean }): Ejercicio {
  const cuerpo = adentro ? [repetir(n, sumar(s), mostrar())] : [repetir(n, sumar(s)), mostrar()];
  const respuesta = ejecutarPuntos({ inicio, cuerpo }).muestras;
  const todas = Array.from({ length: n }, (_, i) => inicio + s * (i + 1));
  const sinEstado = Array.from({ length: n }, () => inicio + s);
  const soloUltima = [inicio + s * n];
  return {
    tipo: "pantalla",
    consigna: "¿Qué números aparecen en la pantalla, en orden? Separalos con espacios.",
    programas: [{ mundo: "puntos", inicio, cuerpo }],
    formato: "secuencia",
    respuesta: respuesta.join(" "),
    respuestaTexto: respuesta.join(" "),
    erroresTipicos: (adentro ? [soloUltima, sinEstado] : [todas]).map((l) => l.join(" ")),
    comprobar: comprobador(
      (v) => igualLista(numeros(v), respuesta),
      [
        [(v) => adentro && igualLista(numeros(v), soloUltima), "«Mostrar PUNTOS» está adentro: aparece un número en cada vuelta, no sólo al final."],
        [(v) => igualLista(numeros(v), sinEstado), "Cada vuelta empieza con el valor que dejó la anterior, no con el del comienzo."],
        [(v) => !adentro && igualLista(numeros(v), todas), "«Mostrar PUNTOS» está afuera: se ejecuta una sola vez, después de todas las vueltas."],
      ],
      adentro ? "Cada vuelta suma y muestra." : "Las vueltas suman sin mostrar; al final se muestra una vez.",
    ),
  };
}

function valor({ inicio, n, s, sumaPrimero }: Puntos & { sumaPrimero: boolean }): Ejercicio {
  const vuelta = () => (sumaPrimero ? [sumar(s), duplicar()] : [duplicar(), sumar(s)]);
  const cuerpo = [repetir(n, ...vuelta()), mostrar()];
  const respuesta = ejecutarPuntos({ inicio, cuerpo }).final;
  const unaVuelta = ejecutarPuntos({ inicio, cuerpo: [...vuelta(), mostrar()] }).final;
  const alReves = ejecutarPuntos({ inicio, cuerpo: [repetir(n, ...vuelta().reverse()), mostrar()] }).final;
  return {
    tipo: "valor",
    consigna: "¿Qué número muestra la pantalla?",
    programas: [{ mundo: "puntos", inicio, cuerpo }],
    formato: "numero",
    respuesta: String(respuesta),
    respuestaTexto: String(respuesta),
    erroresTipicos: [unaVuelta, alReves].filter((x) => x !== respuesta).map(String),
    comprobar: comprobador(
      (v) => numero(v) === respuesta,
      [
        [(v) => numero(v) === unaVuelta, "Eso queda después de la primera vuelta. ¿Cuántas vueltas indica el «Repetir»?"],
        [(v) => numero(v) === alReves, "Adentro de cada vuelta, las instrucciones se ejecutan en el orden en que están escritas."],
      ],
      "Cada vuelta suma y duplica a partir de lo que dejó la anterior.",
    ),
  };
}

/**
 * variante 1: Repetir n [S]; Repetir n [D] contra Repetir n [S; D]
 * variante 2: Repetir n [S]; Repetir m [S] contra Repetir n+m [S]
 * variante 3: Repetir n [S; T] contra Repetir n [T; S]
 * variante 4: Repetir n [S; D] contra Repetir n [D; S]
 * variante 5: Repetir n [D] contra n veces D escrito
 */
function equivalencia({ inicio, n, s, variante, m = 1, t = 1 }: Puntos & { variante: 1 | 2 | 3 | 4 | 5; m?: number; t?: number }): Ejercicio {
  let a: Instruccion[];
  let b: Instruccion[];
  let pista: string;
  if (variante === 1) {
    a = [repetir(n, sumar(s)), repetir(n, duplicar()), mostrar()];
    b = [repetir(n, sumar(s), duplicar()), mostrar()];
    pista = "Tienen las mismas instrucciones, las mismas veces, en otro orden. ¿«Duplicar PUNTOS» duplica lo mismo en los dos?";
  } else if (variante === 2) {
    a = [repetir(n, sumar(s)), repetir(m, sumar(s)), mostrar()];
    b = [repetir(n + m, sumar(s)), mostrar()];
    pista = "Desplegá los dos: ¿cuántas veces suma cada uno, y cuánto?";
  } else if (variante === 3) {
    a = [repetir(n, sumar(s), sumar(t)), mostrar()];
    b = [repetir(n, sumar(t), sumar(s)), mostrar()];
    pista = "Seguí los dos. Los valores por los que pasa PUNTOS cambian; ¿cambia lo que se muestra?";
  } else if (variante === 4) {
    a = [repetir(n, sumar(s), duplicar()), mostrar()];
    b = [repetir(n, duplicar(), sumar(s)), mostrar()];
    pista = "Adentro de la vuelta cambió el orden. ¿«Duplicar PUNTOS» duplica lo mismo en los dos?";
  } else {
    a = [repetir(n, duplicar()), mostrar()];
    b = [...Array.from({ length: n }, () => duplicar()), mostrar()];
    pista = "Desplegá el primero: ¿qué instrucciones quedan?";
  }
  const iguales = ejecutarPuntos({ inicio, cuerpo: a }).final === ejecutarPuntos({ inicio, cuerpo: b }).final;
  const respuesta = iguales ? "Sí" : "No";
  return {
    tipo: "equivalencia",
    consigna: "Los dos empiezan con el mismo valor. ¿Muestran lo mismo?",
    programas: [
      { mundo: "puntos", nombre: "Primero", inicio, cuerpo: a },
      { mundo: "puntos", nombre: "Segundo", inicio, cuerpo: b },
    ],
    formato: "sino",
    respuesta,
    respuestaTexto: respuesta,
    erroresTipicos: [iguales ? "No" : "Sí"],
    comprobar: comprobador(
      (v) => v === respuesta,
      [[(v) => v === "Sí" || v === "No", pista]],
      iguales ? "Muestran lo mismo: el camino cambia, pero llegan al mismo valor." : "No muestran lo mismo: cada instrucción usa el valor que hay cuando le toca.",
    ),
  };
}

function movimientos({ n, patron, antes = [], despues = [] }: { n: number; patron: Direccion[]; antes?: Direccion[]; despues?: Direccion[] }): Ejercicio {
  const cuerpo = [...antes.map(mover), repetir(n, ...patron.map(mover)), ...despues.map(mover)];
  const afuera = antes.length + despues.length;
  const respuesta = desplegar(cuerpo).length;
  const sumado = n + patron.length + afuera;
  const sinAfuera = n * patron.length;
  return {
    tipo: "movimientos",
    consigna: "¿Cuántos movimientos hace en total?",
    programas: [{ mundo: "camino", cuerpo }],
    formato: "numero",
    respuesta: String(respuesta),
    respuestaTexto: String(respuesta),
    erroresTipicos: [sumado, ...(afuera ? [sinAfuera] : [])].filter((x) => x !== respuesta).map(String),
    comprobar: comprobador(
      (v) => numero(v) === respuesta,
      [
        [(v) => numero(v) === sumado, "Lo de adentro no se ejecuta una vez: se ejecuta completo en cada vuelta."],
        [(v) => afuera > 0 && numero(v) === sinAfuera, "Contaste bien las vueltas. ¿Y lo que está afuera del «Repetir»?"],
      ],
      "Adentro: los movimientos de una vuelta por la cantidad de vueltas. Afuera: una vez cada uno.",
    ),
  };
}

function plegar({ patron, n }: { patron: Direccion[]; n: number }): Ejercicio {
  const cuerpo = [repetir(n, ...patron.map(mover))];
  const secuencia = patron.length ? desplegar(cuerpo).map((p) => (p.instr.tipo === "mover" ? FLECHA[p.instr.dir] : "")) : [];
  const cuerpoTexto = patron.map((d) => FLECHA[d]).join(" ");
  const desplegarRespuesta = (v: Respuesta) => {
    if (typeof v === "string") return [];
    const flechas = v.cuerpo.split(/\s+/).filter(Boolean);
    return Array.from({ length: v.veces }, () => flechas).flat();
  };
  return {
    tipo: "plegar",
    consigna: "Este programa no tiene «Repetir». Escribilo con un solo «Repetir» y nada afuera.",
    secuencia,
    programas: [{ mundo: "camino", cuerpo }],
    formato: "plegar",
    respuesta: { veces: n, cuerpo: cuerpoTexto },
    respuestaTexto: `${n} · ${cuerpoTexto}`,
    erroresTipicos: [
      { veces: secuencia.length, cuerpo: secuencia[0] },
      { veces: n, cuerpo: [...patron].reverse().map((d) => FLECHA[d]).join(" ") },
    ].filter((v) => !igualLista(desplegarRespuesta(v), secuencia)),
    comprobar: comprobador(
      (v) => igualLista(desplegarRespuesta(v), secuencia),
      [
        [(v) => desplegarRespuesta(v).length !== secuencia.length, "Al desplegar tu «Repetir» no sale la misma cantidad de movimientos. Buscá el grupo que se repite."],
        [() => true, "Sale la misma cantidad de movimientos, pero no en el mismo orden. Desplegá tu «Repetir» y comparalo flecha por flecha."],
      ],
      "Desplegado, tu «Repetir» da exactamente la misma secuencia.",
    ),
  };
}

/** Una fila de k casillas; el programa trae m en el Repetir. */
function fila({ k, m }: { k: number; m: number }): Ejercicio {
  const escena: EscenaTablero = { personaje: "Duba", filas: [["A", ...Array(k - 2).fill("-"), "P"].join(",")] };
  const respuesta = k - 1;
  return {
    tipo: "fila",
    consigna: `En una fila de ${k} casillas, Duba está en la primera y el churrasco en la última. ¿Qué número tiene que ir en el «Repetir» para que coma?`,
    programas: [{ mundo: "fila", escena, cuerpo: [repetir(m, mover("derecha")), comer()] }],
    formato: "numero",
    respuesta: String(respuesta),
    respuestaTexto: String(respuesta),
    erroresTipicos: [String(k)],
    comprobar: comprobador(
      (v) => numero(v) === respuesta,
      [[(v) => numero(v) === k, "Contaste casillas. Duba ya está en la primera: ¿cuántas veces tiene que moverse?"]],
      "Se cuentan los movimientos, no las casillas: Duba ya está en la primera.",
    ),
  };
}

export const armar = { contar, pantalla, valor, equivalencia, movimientos, plegar, fila };

/* ------------------------------------------------------------------------ */
/* Sortear                                                                  */
/* ------------------------------------------------------------------------ */

/** mulberry32: pseudoaleatorio reproducible. */
function azar(semilla: number) {
  let a = semilla >>> 0;
  const siguiente = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    entre: (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1)),
    uno: <T>(lista: readonly T[]): T => lista[Math.floor(siguiente() * lista.length)],
    moneda: () => siguiente() < 0.5,
  };
}

type Azar = ReturnType<typeof azar>;
const DIRS: readonly Direccion[] = ["arriba", "abajo", "izquierda", "derecha"];

const sortear: Record<TipoEjercicio, (z: Azar) => Ejercicio> = {
  contar: (z) => contar({ inicio: z.entre(0, 5), n: z.entre(2, 5), s: z.entre(2, 5), adentro: z.moneda() }),
  pantalla: (z) => pantalla({ inicio: z.entre(0, 5), n: z.entre(2, 4), s: z.entre(2, 5), adentro: z.moneda() }),
  valor: (z) => valor({ inicio: z.entre(1, 3), n: z.entre(2, 3), s: z.entre(2, 4), sumaPrimero: z.moneda() }),
  equivalencia: (z) =>
    equivalencia({
      inicio: z.entre(1, 4),
      n: z.entre(2, 3),
      s: z.entre(2, 4),
      variante: z.uno([1, 2, 3, 4, 5] as const),
      m: z.entre(1, 3),
      t: z.entre(1, 5),
    }),
  movimientos: (z) =>
    movimientos({
      n: z.entre(3, 5),
      patron: Array.from({ length: z.entre(2, 3) }, () => z.uno(DIRS)),
      antes: z.moneda() ? [z.uno(DIRS)] : [],
      despues: z.moneda() ? [z.uno(DIRS)] : [],
    }),
  plegar: (z) => {
    let patron: Direccion[];
    do patron = Array.from({ length: z.entre(2, 3) }, () => z.uno(DIRS));
    while (patron.every((d) => d === patron[0]));
    return plegar({ patron, n: z.entre(3, 5) });
  },
  fila: (z) => {
    let k: number;
    do k = z.entre(5, 9);
    while (k === 6);
    return fila({ k, m: z.moneda() ? k : k - 2 });
  },
};

export const tipos = Object.keys(sortear) as TipoEjercicio[];

/** Huella de un programa, para comparar sin depender de la identidad de los bloques. */
export const firma = (p: { inicio?: number; cuerpo: readonly Instruccion[] }) => JSON.stringify([p.inicio ?? null, p.cuerpo]);

const delCierre = new Set(
  [cierre.P, cierre.Q, cierre.R, cierre.S, cierre.W, cierre.X, cierre.Y].map((p) => firma(p)),
);

export function generar(semilla: number, tipo?: TipoEjercicio): Ejercicio {
  const z = azar(semilla);
  const elegido = sortear[tipo ?? tipos[semilla % tipos.length]];
  let ejercicio: Ejercicio;
  do ejercicio = elegido(z);
  while (ejercicio.programas.some((p) => delCierre.has(firma(p))));
  return ejercicio;
}
