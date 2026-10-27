/*
  Programas de «Repetir»: única fuente para la página que conduce la clase,
  la hoja del folio, los papelitos y la guía. Las claves no se escriben a
  mano: salen de ejecutar estos mismos programas.

  Tres mundos:
  - PUNTOS, el casillero de «Cuándo importa el orden» (Sumarle, Duplicar,
    Mostrar), ahora con «Repetir»;
  - camino: flechas sobre una cuadrícula sin bordes; importa dónde termina y
    por qué casillas pasa;
  - escenas de Pilas Bloques (Duba, Lita, Coty), con los tableros de
    pilas-bloques-app 3.0.3 (src/staticData/challenges.ts). La simulación es
    propia: reproduce lo que importa acá (chocar con un obstáculo o con el
    borde, agarrar donde no hay nada, si el dibujo de Coty coincide), no la
    aplicación.

  Cada instrucción es un objeto nuevo: la identidad importa para contar
  cuántas veces se ejecuta una instrucción escrita y para resaltarla.
*/

export type Direccion = "arriba" | "abajo" | "izquierda" | "derecha";

export type Instruccion =
  | { tipo: "sumar"; n: number }
  | { tipo: "duplicar" }
  | { tipo: "mostrar" }
  | { tipo: "mover"; dir: Direccion }
  | { tipo: "comer" }
  | { tipo: "agarrar"; que: "lechuga" | "tomate" }
  | { tipo: "preparar" }
  | { tipo: "dibujar"; dir: Direccion }
  | { tipo: "repetir"; veces: number; cuerpo: Instruccion[] };

export type Repeticion = Extract<Instruccion, { tipo: "repetir" }>;

export const sumar = (n: number): Instruccion => ({ tipo: "sumar", n });
export const duplicar = (): Instruccion => ({ tipo: "duplicar" });
export const mostrar = (): Instruccion => ({ tipo: "mostrar" });
export const mover = (dir: Direccion): Instruccion => ({ tipo: "mover", dir });
export const comer = (): Instruccion => ({ tipo: "comer" });
export const agarrar = (que: "lechuga" | "tomate"): Instruccion => ({ tipo: "agarrar", que });
export const preparar = (): Instruccion => ({ tipo: "preparar" });
export const dibujar = (dir: Direccion): Instruccion => ({ tipo: "dibujar", dir });
export const repetir = (veces: number, ...cuerpo: Instruccion[]): Repeticion => ({ tipo: "repetir", veces, cuerpo });

export const FLECHA: Record<Direccion, string> = { arriba: "↑", abajo: "↓", izquierda: "←", derecha: "→" };

/** Los textos de los bloques son los de Pilas Bloques en español. */
const MOVER: Record<Direccion, string> = {
  arriba: "Mover arriba",
  abajo: "Mover abajo",
  izquierda: "Mover a la izquierda",
  derecha: "Mover a la derecha",
};

export function texto(instr: Instruccion, { flechas = false } = {}): string {
  switch (instr.tipo) {
    case "sumar": return `Sumarle ${instr.n} a PUNTOS.`;
    case "duplicar": return "Duplicar PUNTOS.";
    case "mostrar": return "Mostrar PUNTOS.";
    case "mover": return flechas ? FLECHA[instr.dir] : MOVER[instr.dir];
    case "comer": return "Comer churrasco";
    case "agarrar": return `Agarrar ${instr.que}`;
    case "preparar": return "Preparar ensalada";
    case "dibujar": return `Mover ${instr.dir} dibujando`;
    case "repetir": return `Repetir ${instr.veces} veces`;
  }
}

/* ------------------------------------------------------------------------ */
/* Desplegar: la secuencia que realmente se ejecuta                         */
/* ------------------------------------------------------------------------ */

export type Vuelta = { repetir: Repeticion; vuelta: number; veces: number };
export type Paso = { instr: Instruccion; vueltas: Vuelta[] };

/** Una entrada por cada instrucción que se ejecuta, con la vuelta de cada Repetir que la contiene. */
export function desplegar(cuerpo: readonly Instruccion[], contexto: Vuelta[] = []): Paso[] {
  const pasos: Paso[] = [];
  for (const instr of cuerpo) {
    if (instr.tipo === "repetir") {
      for (let vuelta = 1; vuelta <= instr.veces; vuelta++) {
        pasos.push(...desplegar(instr.cuerpo, [...contexto, { repetir: instr, vuelta, veces: instr.veces }]));
      }
    } else {
      pasos.push({ instr, vueltas: contexto });
    }
  }
  return pasos;
}

/** Cuántas veces se ejecuta una instrucción escrita. */
export const vecesQueSeEjecuta = (cuerpo: readonly Instruccion[], instr: Instruccion) =>
  desplegar(cuerpo).filter((paso) => paso.instr === instr).length;

/** La vuelta del Repetir más interno, si la hay. */
export const vueltaDe = (paso: Paso | undefined) => paso?.vueltas.at(-1)?.vuelta;

/* ------------------------------------------------------------------------ */
/* Mundo PUNTOS                                                             */
/* ------------------------------------------------------------------------ */

export type ProgramaPuntos = { nombre?: string; inicio: number; cuerpo: Instruccion[] };
export type PasoPuntos = Paso & { antes: number; puntos: number; muestra?: number };

export function ejecutarPuntos(programa: ProgramaPuntos) {
  let puntos = programa.inicio;
  const muestras: number[] = [];
  const pasos: PasoPuntos[] = desplegar(programa.cuerpo).map((paso) => {
    const antes = puntos;
    let muestra: number | undefined;
    const i = paso.instr;
    if (i.tipo === "sumar") puntos += i.n;
    else if (i.tipo === "duplicar") puntos *= 2;
    else if (i.tipo === "mostrar") muestras.push((muestra = puntos));
    else throw new Error(`«${texto(i)}» no es del mundo PUNTOS`);
    return { ...paso, antes, puntos, muestra };
  });
  return { pasos, muestras, final: puntos };
}

/* ------------------------------------------------------------------------ */
/* Mundo camino: flechas en una cuadrícula sin bordes                       */
/* ------------------------------------------------------------------------ */

export type Casilla = [number, number];
export type ProgramaCamino = { nombre?: string; cuerpo: Instruccion[] };

const DXY: Record<Direccion, Casilla> = { arriba: [0, 1], abajo: [0, -1], izquierda: [-1, 0], derecha: [1, 0] };

function direccion(instr: Instruccion): Direccion {
  if (instr.tipo === "mover" || instr.tipo === "dibujar") return instr.dir;
  throw new Error(`«${texto(instr)}» no es un movimiento`);
}

/** Empieza en (0, 0); y crece hacia arriba. */
export function ejecutarCamino(programa: ProgramaCamino) {
  let x = 0;
  let y = 0;
  const casillas: Casilla[] = [[0, 0]];
  const pasos = desplegar(programa.cuerpo).map((paso) => {
    const [dx, dy] = DXY[direccion(paso.instr)];
    x += dx;
    y += dy;
    casillas.push([x, y]);
    return { ...paso, x, y };
  });
  return { pasos, final: [x, y] as Casilla, casillas };
}

export function mismasCasillas(a: readonly Casilla[], b: readonly Casilla[]): boolean {
  const clave = (lista: readonly Casilla[]) => [...new Set(lista.map(([x, y]) => `${x},${y}`))].sort().join(" ");
  return clave(a) === clave(b);
}

/* ------------------------------------------------------------------------ */
/* Escenas de Pilas Bloques                                                 */
/* ------------------------------------------------------------------------ */

/*
  Tableros de cuadrícula, fila 0 arriba. A = personaje, O = obstáculo,
  P = churrasco, L = lechuga, T = tomate, E = ensaladera, - = vacío.
*/
export type EscenaTablero = { personaje: "Duba" | "Lita"; filas: string[] };
/** El dibujo esperado, como puntos en unidades de un segmento. */
export type EscenaCoty = { personaje: "Coty"; dibujo: Casilla[] };
export type Escena = EscenaTablero | EscenaCoty;

const DFC: Record<Direccion, Casilla> = { arriba: [-1, 0], abajo: [1, 0], izquierda: [0, -1], derecha: [0, 1] };
const LETRA = { churrasco: "P", lechuga: "L", tomate: "T" } as const;
const PARA: Record<Direccion, string> = { arriba: "arriba", abajo: "abajo", izquierda: "la izquierda", derecha: "la derecha" };

export const leerTablero = (filas: readonly string[]) => filas.map((fila) => fila.split(","));

export type PasoTablero = Paso & { fila: number; col: number; error?: string };

/** Se detiene en el primer error, como Pilas Bloques. */
export function ejecutarTablero(escena: EscenaTablero, cuerpo: readonly Instruccion[]) {
  const grilla = leerTablero(escena.filas);
  const inicio = grilla.flatMap((fila, f) => fila.map((v, c) => (v === "A" ? ([f, c] as Casilla) : null))).find(Boolean);
  if (!inicio) throw new Error("El tablero no tiene personaje");
  let [f, c] = inicio;
  grilla[f][c] = "-";
  let preparada = false;
  const pasos: PasoTablero[] = [];

  for (const paso of desplegar(cuerpo)) {
    const i = paso.instr;
    let error: string | undefined;
    if (i.tipo === "mover") {
      const nf = f + DFC[i.dir][0];
      const nc = c + DFC[i.dir][1];
      const fuera = nf < 0 || nf >= grilla.length || nc < 0 || nc >= grilla[0].length;
      if (fuera || grilla[nf][nc] === "O") error = `No puedo ir para ${PARA[i.dir]}`;
      else [f, c] = [nf, nc];
    } else if (i.tipo === "comer" || i.tipo === "agarrar") {
      const que = i.tipo === "comer" ? "churrasco" : i.que;
      if (grilla[f][c] !== LETRA[que]) error = `¡Acá no hay ${que}!`;
      else grilla[f][c] = "-";
    } else if (i.tipo === "preparar") {
      const quedan = grilla.some((fila) => fila.includes("L") || fila.includes("T"));
      if (grilla[f][c] !== "E") error = "¡Acá no hay ensaladera!";
      else if (quedan) error = "Me faltan ingredientes";
      else preparada = true;
    } else {
      throw new Error(`«${texto(i)}» no es de una escena de cuadrícula`);
    }
    pasos.push({ ...paso, fila: f, col: c, error });
    if (error) break;
  }

  const falla = pasos.find((paso) => paso.error);
  const resuelto = !falla && (escena.personaje === "Lita" ? preparada : !grilla.some((fila) => fila.includes("P")));
  return { pasos, falla, resuelto, final: [f, c] as Casilla };
}

function segmento([x1, y1]: Casilla, [x2, y2]: Casilla): string {
  const [a, b] = x1 < x2 || (x1 === x2 && y1 < y2) ? [[x1, y1], [x2, y2]] : [[x2, y2], [x1, y1]];
  return `${a}-${b}`;
}

/** Resuelto si lo dibujado es exactamente el dibujo esperado. */
export function ejecutarCoty(escena: EscenaCoty, cuerpo: readonly Instruccion[]) {
  let x = 0;
  let y = 0;
  const trazos = new Set<string>();
  const pasos = desplegar(cuerpo).map((paso) => {
    const [dx, dy] = DXY[direccion(paso.instr)];
    const desde: Casilla = [x, y];
    x += dx;
    y += dy;
    if (paso.instr.tipo === "dibujar") trazos.add(segmento(desde, [x, y]));
    return { ...paso, x, y };
  });
  const esperado = new Set(escena.dibujo.slice(1).map((punto, i) => segmento(escena.dibujo[i], punto)));
  const resuelto = trazos.size === esperado.size && [...trazos].every((t) => esperado.has(t));
  return { pasos, trazos: [...trazos], resuelto, final: [x, y] as Casilla };
}

export function ejecutarEscena(escena: Escena, cuerpo: readonly Instruccion[]) {
  if (escena.personaje === "Coty") {
    const r = ejecutarCoty(escena, cuerpo);
    return { resuelto: r.resuelto, falla: undefined, final: r.final };
  }
  const r = ejecutarTablero(escena, cuerpo);
  return { resuelto: r.resuelto, falla: r.falla, final: r.final };
}

/* ------------------------------------------------------------------------ */
/* Desafíos de Pilas Bloques                                                */
/* ------------------------------------------------------------------------ */

export type Desafio = {
  letra: "A" | "B" | "C" | "D" | "E";
  id: number;
  grupo: string;
  nombre: string;
  escena: Escena;
  /** El programa con el que abre el desafío; null si hay que armarlo. */
  programa: Instruccion[] | null;
  solucion: Instruccion[];
  enlace: string;
};

export const enlacePilasBloques = (id: number) => `https://pilasbloques.program.ar/online/#/desafio/${id}`;

const desafio = (d: Omit<Desafio, "enlace">): Desafio => ({ ...d, enlace: enlacePilasBloques(d.id) });

export const desafios: readonly Desafio[] = [
  desafio({
    letra: "A",
    id: 230,
    grupo: "Más churrascos para Duba",
    nombre: "Desafío 1",
    escena: {
      personaje: "Duba",
      filas: [
        "-,O,O,O,-,-,-,-", "-,O,O,O,O,-,-,-", "O,O,-,O,O,-,-,-", "O,O,-,-,-,-,-,-",
        "A,-,-,-,-,-,-,P", "-,-,O,-,O,-,-,-", "-,-,O,O,O,O,O,O", "-,-,-,O,O,O,O,O",
      ],
    },
    programa: null,
    solucion: [repetir(7, mover("derecha")), comer()],
  }),
  desafio({
    letra: "B",
    id: 236,
    grupo: "Corregimos los programas",
    nombre: "Desafío 1",
    escena: {
      personaje: "Duba",
      filas: [
        "-,-,-,-,O,O,O,O", "-,-,-,-,-,-,-,O", "-,-,-,-,-,-,-,-", "-,P,-,-,-,-,-,-",
        "-,-,-,-,-,O,A,-", "-,-,-,-,O,O,O,O", "O,O,O,O,O,O,O,O", "O,O,O,O,O,O,O,O",
      ],
    },
    programa: [mover("arriba"), repetir(4, mover("izquierda")), comer()],
    solucion: [mover("arriba"), repetir(5, mover("izquierda")), comer()],
  }),
  desafio({
    letra: "C",
    id: 237,
    grupo: "Corregimos los programas",
    nombre: "Desafío 2",
    escena: {
      personaje: "Duba",
      filas: [
        "O,-,-,-,O,O,O,O", "-,A,-,-,-,-,O,-", "O,O,-,-,-,-,-,-", "O,O,O,-,-,-,-,-",
        "O,O,O,-,-,-,-,-", "O,O,O,O,O,-,P,-", "O,O,O,O,O,O,O,O", "O,O,O,O,O,O,O,O",
      ],
    },
    programa: [repetir(5, mover("derecha"), mover("abajo")), comer()],
    solucion: [repetir(4, mover("derecha"), mover("abajo")), mover("derecha"), comer()],
  }),
  desafio({
    letra: "D",
    id: 238,
    grupo: "Corregimos los programas",
    nombre: "Desafío 3",
    escena: {
      personaje: "Coty",
      dibujo: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4], [4, 4]],
    },
    programa: [repetir(4, dibujar("arriba")), repetir(4, dibujar("derecha"))],
    solucion: [repetir(4, dibujar("arriba"), dibujar("derecha"))],
  }),
  desafio({
    letra: "E",
    id: 241,
    grupo: "Lita, a puro vegetal",
    nombre: "Desafío 2",
    escena: {
      personaje: "Lita",
      filas: [
        "L,-,-,-,-,T,E", "-,O,-,-,O,-,O", "-,O,O,O,O,-,O", "-,O,O,O,-,-,O",
        "-,-,-,O,-,-,-", "A,-,-,-,-,-,-", "-,O,O,-,-,O,O",
      ],
    },
    programa: [repetir(4, mover("arriba")), agarrar("lechuga"), repetir(5, mover("derecha"), agarrar("tomate")), mover("derecha"), preparar()],
    solucion: [repetir(5, mover("arriba")), agarrar("lechuga"), repetir(5, mover("derecha")), agarrar("tomate"), mover("derecha"), preparar()],
  }),
];

export const desafioPorLetra = (letra: Desafio["letra"]): Desafio => {
  const d = desafios.find((x) => x.letra === letra);
  if (!d) throw new Error(`No hay desafío ${letra}`);
  return d;
};

/** Para ir más lejos: sin preguntas propias en el papelito. */
export const masDesafios = [
  { id: 235, grupo: "Las líneas de Coty", nombre: "Desafío 3", consigna: "Una escalera: ¿qué se repite y cuántas veces?" },
  { id: 239, grupo: "Corregimos los programas", nombre: "Desafío 4", consigna: "Un programa con varios errores." },
  { id: 240, grupo: "Lita, a puro vegetal", nombre: "Desafío 1", consigna: "Armar el programa desde cero." },
].map((d) => ({ ...d, enlace: enlacePilasBloques(d.id) }));

/* ------------------------------------------------------------------------ */
/* La hoja: ejemplos del frente y cierre del dorso                          */
/* ------------------------------------------------------------------------ */

export const ejemplo: ProgramaPuntos = { inicio: 1, cuerpo: [repetir(3, duplicar()), mostrar()] };
export const ejemploFlechas: ProgramaCamino = { cuerpo: [repetir(3, mover("derecha"), mover("arriba"))] };

/** «Tres cosas para mirar», en el frente. */
export const mirar = {
  fila: { personaje: "Duba", filas: ["A,-,-,P"] } satisfies EscenaTablero,
  adentro: { inicio: 1, cuerpo: [repetir(2, sumar(5), mostrar())] } satisfies ProgramaPuntos,
  afuera: { inicio: 1, cuerpo: [repetir(2, sumar(5)), mostrar()] } satisfies ProgramaPuntos,
  ordenA: { inicio: 0, cuerpo: [repetir(2, sumar(3), duplicar()), mostrar()] } satisfies ProgramaPuntos,
  ordenB: { inicio: 0, cuerpo: [repetir(2, duplicar(), sumar(3)), mostrar()] } satisfies ProgramaPuntos,
};

/*
  El cierre, en el dorso: del 1 al 4 para todos, después del paso 3; el 5 y
  el 6 acompañan los pasos 4 y 5; el 7, para ir más lejos. Ningún programa del
  cierre aparece en la página (lo comprueba el test).
*/
const mostrarP = mostrar();
const mostrarQ = mostrar();
const flechaW = mover("derecha");

export const cierre = {
  P: { nombre: "P", inicio: 0, cuerpo: [repetir(3, sumar(2), mostrarP)] } satisfies ProgramaPuntos,
  Q: { nombre: "Q", inicio: 0, cuerpo: [repetir(3, sumar(2)), mostrarQ] } satisfies ProgramaPuntos,
  R: { nombre: "R", inicio: 1, cuerpo: [repetir(2, sumar(1), duplicar()), mostrar()] } satisfies ProgramaPuntos,
  /** Una fila de 6 casillas: Duba en la primera, el churrasco en la última. */
  filaY: { personaje: "Duba", filas: ["A,-,-,-,-,P"] } satisfies EscenaTablero,
  Y: { nombre: "Y", cuerpo: [repetir(6, mover("derecha")), comer()] },
  W: { nombre: "W", cuerpo: [mover("arriba"), repetir(4, flechaW, mover("arriba"))] } satisfies ProgramaCamino,
  S: { nombre: "S", inicio: 1, cuerpo: [repetir(2, sumar(1)), repetir(2, duplicar()), mostrar()] } satisfies ProgramaPuntos,
  /** Se muestra desplegado, sin Repetir. */
  X: { nombre: "X", cuerpo: [repetir(3, mover("derecha"), mover("derecha"), mover("abajo"))] } satisfies ProgramaCamino,
};

/* ------------------------------------------------------------------------ */
/* Clave                                                                    */
/* ------------------------------------------------------------------------ */

const primerRepetir = (cuerpo: readonly Instruccion[]) => {
  const r = cuerpo.find((i): i is Repeticion => i.tipo === "repetir");
  if (!r) throw new Error("Sin Repetir");
  return r;
};

/** Respuesta esperada de cada casillero del papelito. */
export function clave() {
  const [A, B, C, D] = (["A", "B", "C", "D"] as const).map(desafioPorLetra);
  const conProgramaOriginal = (d: Desafio) => ejecutarEscena(d.escena, d.programa ?? []);
  const fallaC = ejecutarTablero(C.escena as EscenaTablero, C.programa ?? []).falla;
  const afueraC = C.solucion.find((i) => i.tipo === "mover");
  const { P, Q, R, S, W, X, Y, filaY } = cierre;
  const y = ejecutarTablero(filaY, Y.cuerpo);
  let ySolucion = 0;
  for (let n = 1; n <= 10 && !ySolucion; n++) {
    if (ejecutarTablero(filaY, [repetir(n, mover("derecha")), comer()]).resuelto) ySolucion = n;
  }
  const rX = primerRepetir(X.cuerpo);
  return {
    A: primerRepetir(A.solucion).veces,
    B: primerRepetir(B.solucion).veces,
    C: {
      vuelta: vueltaDe(fallaC),
      numero: primerRepetir(C.solucion).veces,
      afuera: afueraC ? FLECHA[direccion(afueraC)] : "",
    },
    D: conProgramaOriginal(D).resuelto ? "Sí" : "No",
    1: { P: vecesQueSeEjecuta(P.cuerpo, mostrarP), Q: vecesQueSeEjecuta(Q.cuerpo, mostrarQ) },
    2: { P: ejecutarPuntos(P).muestras.join(" "), Q: ejecutarPuntos(Q).muestras.join(" ") },
    3: ejecutarPuntos(R).final,
    4: { vuelta: vueltaDe(y.falla), numero: ySolucion },
    5: { flecha: vecesQueSeEjecuta(W.cuerpo, flechaW), total: desplegar(W.cuerpo).length },
    6: ejecutarPuntos(S).final === ejecutarPuntos(R).final ? "Sí" : "No",
    7: { veces: rX.veces, cuerpo: rX.cuerpo.map((i) => FLECHA[direccion(i)]).join(" ") },
  };
}
