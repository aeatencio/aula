/*
  Programas de «Cuándo importa el orden»: única fuente para la hoja (que va
  dentro de un folio y no se escribe), el pizarrón «Seguir un programa paso a
  paso», el papelito de cierre y la guía docente. Las claves no se escriben a
  mano: salen de ejecutar estos mismos programas con `seguir`.

  Un solo contexto, un juego que guarda puntos. El frente trabaja un casillero
  (PUNTOS) con «Mostrar» al final; el dorso, «Para seguir», suma MONEDAS.
  Cada programa se escribe en el orden en que se ejecuta, numerado desde 1:
  nunca hay que traducir una notación como «2 · 1 · 3».

  Trabaja sólo secuencia y orden: no hay condiciones ni repeticiones.
*/

/** Los valores que guarda la memoria, por nombre de casillero. */
export type Memoria = Readonly<Record<string, number>>;

export type Instruccion = {
  texto: string;
  /** Devuelve la memoria después de la instrucción y, si muestra algo, qué. */
  hacer: (memoria: Memoria) => { memoria: Memoria; muestra?: number };
};

export type Programa = {
  casilleros: readonly string[];
  inicial: Memoria;
  /** En el orden en que se ejecutan. */
  instrucciones: readonly Instruccion[];
};

export type Fila = {
  numero: number;
  texto: string;
  /** Cómo queda la memoria después de ejecutar la instrucción. */
  memoria: Memoria;
  /** Lo que muestra, sólo si es una instrucción «Mostrar». */
  muestra?: number;
};

/** Ejecuta el programa y devuelve una fila de la tabla por instrucción. */
export function seguir(programa: Programa): Fila[] {
  let memoria = programa.inicial;
  return programa.instrucciones.map((instruccion, indice) => {
    const efecto = instruccion.hacer(memoria);
    memoria = efecto.memoria;
    return { numero: indice + 1, texto: instruccion.texto, memoria, muestra: efecto.muestra };
  });
}

/** Lo que mostró la pantalla al terminar: el último valor mostrado. */
export function mostro(programa: Programa): number | undefined {
  return seguir(programa).findLast((fila) => fila.muestra !== undefined)?.muestra;
}

/** El valor que tenía un casillero justo antes de ejecutar la instrucción que empieza con `texto`. */
export function valorAntesDe(programa: Programa, texto: string, casillero = "PUNTOS"): number {
  const indice = programa.instrucciones.findIndex((instruccion) => instruccion.texto.startsWith(texto));
  if (indice < 0) throw new Error(`No hay instrucción «${texto}»`);
  const memoria = indice === 0 ? programa.inicial : seguir(programa)[indice - 1].memoria;
  return memoria[casillero];
}

export const formatear = (n: number) => n.toLocaleString("es-AR");

/* ------------------------------------------------------------------------ */
/* Instrucciones                                                            */
/* ------------------------------------------------------------------------ */

const sumarle = (n: number): Instruccion => ({
  texto: `Sumarle ${n} a PUNTOS.`,
  hacer: (m) => ({ memoria: { ...m, PUNTOS: m.PUNTOS + n } }),
});

const duplicar: Instruccion = {
  texto: "Duplicar PUNTOS.",
  hacer: (m) => ({ memoria: { ...m, PUNTOS: m.PUNTOS * 2 } }),
};

const mostrar: Instruccion = {
  texto: "Mostrar PUNTOS.",
  hacer: (m) => ({ memoria: m, muestra: m.PUNTOS }),
};

const sumarleMonedas: Instruccion = {
  texto: "Sumarle a PUNTOS el valor de MONEDAS.",
  hacer: (m) => ({ memoria: { ...m, PUNTOS: m.PUNTOS + m.MONEDAS } }),
};

const anotar0: Instruccion = {
  texto: "Anotar 0 en MONEDAS.",
  hacer: (m) => ({ memoria: { ...m, MONEDAS: 0 } }),
};

const conPuntos = (puntos: number, ...instrucciones: Instruccion[]): Programa => ({
  casilleros: ["PUNTOS"],
  inicial: { PUNTOS: puntos },
  instrucciones,
});

const conMonedas = (...instrucciones: Instruccion[]): Programa => ({
  casilleros: ["PUNTOS", "MONEDAS"],
  inicial: { PUNTOS: 4, MONEDAS: 3 },
  instrucciones,
});

/** Para cada verbo, qué hace. Visible en la hoja, el pizarrón y el papelito. */
export const verbos: readonly { verbo: string; explicacion: string }[] = [
  { verbo: "Sumarle", explicacion: "agrega al valor que hay ahora." },
  { verbo: "Duplicar", explicacion: "deja el doble del valor que hay ahora." },
  { verbo: "Mostrar", explicacion: "pone el valor en la pantalla; el casillero no cambia." },
];

export const verbosDorso: readonly { verbo: string; explicacion: string }[] = [
  {
    verbo: "Sumarle a PUNTOS el valor de MONEDAS",
    explicacion: "agrega a PUNTOS lo que vale MONEDAS ahora.",
  },
  {
    verbo: "Anotar 0 en MONEDAS",
    explicacion: "reemplaza lo que había en MONEDAS por 0. PUNTOS no cambia.",
  },
];

/** Cómo seguir un programa, paso por paso. No contiene resultados. */
export const rutina: readonly string[] = [
  "Mirá cuánto vale el casillero ahora.",
  "Ejecutá una sola instrucción con ese valor.",
  "Anotá cómo queda.",
  "Pasá a la instrucción siguiente.",
];

/* ------------------------------------------------------------------------ */
/* Ejemplo: en el pizarrón y resuelto en la hoja                            */
/* ------------------------------------------------------------------------ */

export const preguntaInicial = "¿Cuándo cambiar el orden cambia lo que se muestra?";

export const casoEjemplo = "Un juego guarda los puntos en el casillero PUNTOS. Al empezar, PUNTOS vale 2.";

export const ejemplo = {
  primero: conPuntos(2, sumarle(1), duplicar, mostrar),
  segundo: conPuntos(2, duplicar, sumarle(1), mostrar),
};

/* ------------------------------------------------------------------------ */
/* Frente: núcleo común                                                     */
/* ------------------------------------------------------------------------ */

export const casoNivel =
  "Al terminar un nivel, el juego tiene que sumar 3 puntos de premio y después duplicar todo.";

/** A hace lo que se quería; B tiene el orden cambiado. */
export const programaA = conPuntos(4, sumarle(3), duplicar, mostrar);
export const programaB = conPuntos(4, duplicar, sumarle(3), mostrar);

/** Dos sumas: el orden cambia el camino pero no lo que se muestra. */
export const programaC = conPuntos(4, sumarle(3), sumarle(1), mostrar);
export const programaD = conPuntos(4, sumarle(1), sumarle(3), mostrar);

export type Consigna = { numero: number; texto: string };

export const consignasFrente: readonly Consigna[] = [
  { numero: 1, texto: "Antes de seguirlos: ¿A y B van a mostrar lo mismo? Escribí sí o no. No importa si no acertás." },
  { numero: 2, texto: "Seguí A en la carpeta, como en el ejemplo. Después seguí B, empezando otra vez con PUNTOS\u00a0=\u00a04." },
  { numero: 3, texto: "Mirá «Duplicar PUNTOS» en tus dos tablas. ¿Qué número se duplica en A? ¿Y en B?" },
  { numero: 4, texto: "Se quería sumar los 3 puntos y después duplicar todo. ¿Cuál de los dos programas lo hace?" },
  { numero: 5, texto: "Seguí C y D en la carpeta. ¿Muestran lo mismo? ¿Pasan por los mismos valores?" },
];

/** Después de la consigna 3, la hoja marca una pausa para comparar en común. */
export const pausaDespuesDe = 3;

export const ideaInicial =
  "Cada instrucción usa el valor que hay en ese momento. Por eso cambiar el orden a veces cambia lo que se muestra y a veces no.";

/** Síntesis para el pizarrón, después de comparar A y B, y C y D. */
export const conclusion =
  "En A se duplica 7 y en B se duplica 4: cada instrucción usa el valor que hay cuando le toca. En C y D las dos sumas dan lo mismo en cualquier orden: el camino cambia, pero se muestra lo mismo.";

/* ------------------------------------------------------------------------ */
/* Dorso: Para seguir                                                       */
/* ------------------------------------------------------------------------ */

export const casoMonedas =
  "Ahora el juego también guarda MONEDAS. Al terminar el nivel, cada moneda vale un punto: se suman las monedas, el contador de monedas vuelve a 0, se duplica PUNTOS y se muestra.";

export type ConsignaDorso = Consigna & {
  programa: Programa;
  /** Lo que tiene que quedar; se imprime al pie del dorso, para comprobar. */
  respuesta: string;
};

/** Ejemplo resuelto del dorso: cómo se sigue un programa con dos casilleros. */
export const ejemploMonedas: Programa = {
  casilleros: ["PUNTOS", "MONEDAS"],
  inicial: { PUNTOS: 1, MONEDAS: 2 },
  instrucciones: [sumarleMonedas, anotar0, mostrar],
};

const nivel = conMonedas(sumarleMonedas, anotar0, duplicar, mostrar);
const borraAntes = conMonedas(anotar0, sumarleMonedas, duplicar, mostrar);
const duplicaAntes = conMonedas(sumarleMonedas, duplicar, anotar0, mostrar);
const muestraAntes = conMonedas(sumarleMonedas, anotar0, mostrar, duplicar);

export const consignasDorso: readonly ConsignaDorso[] = [
  {
    numero: 6,
    programa: nivel,
    texto: "Seguí este programa en la carpeta, con PUNTOS y MONEDAS. ¿Qué muestra?",
    respuesta: `muestra ${mostro(nivel)}`,
  },
  {
    numero: 7,
    programa: borraAntes,
    texto: "¿Qué muestra este otro programa? Cuando se suma, ¿cuánto vale MONEDAS?",
    respuesta: `muestra ${mostro(borraAntes)}; MONEDAS vale ${valorAntesDe(borraAntes, "Sumarle", "MONEDAS")}`,
  },
  {
    numero: 8,
    programa: duplicaAntes,
    texto: "¿Muestra lo mismo que el programa de la 6? ¿Por qué?",
    respuesta: `sí, ${mostro(duplicaAntes)}: cuando se duplica, PUNTOS ya vale ${valorAntesDe(duplicaAntes, "Duplicar")} en los dos`,
  },
  {
    numero: 9,
    programa: muestraAntes,
    texto: "¿Qué número se vio en la pantalla? Al terminar, ¿cuánto vale PUNTOS en la memoria?",
    respuesta: `pantalla ${mostro(muestraAntes)}; PUNTOS ${seguir(muestraAntes).at(-1)!.memoria.PUNTOS}`,
  },
];

/* ------------------------------------------------------------------------ */
/* Papelito de cierre: evidencia individual                                 */
/* ------------------------------------------------------------------------ */

/*
  Mismo tipo de programa que A y B, con otros números. Se resuelve sin la hoja
  ni la carpeta; los verbos vienen impresos en el papelito.
*/
export const cierre = {
  primero: conPuntos(3, sumarle(2), duplicar, mostrar),
  segundo: conPuntos(3, duplicar, sumarle(2), mostrar),
  /** ¿Muestran lo mismo? Sí: dos sumas. */
  sumas: [conPuntos(3, sumarle(2), sumarle(4), mostrar), conPuntos(3, sumarle(4), sumarle(2), mostrar)] as const,
};

export const preguntaSumas = "Estos dos programas empiezan con PUNTOS = 3. ¿Muestran lo mismo?";

/** Respuestas esperables equivocadas en el papelito y qué sugieren. Para la guía. */
export const erroresCierre: readonly { si: string; sugiere: string }[] = [
  {
    si: "En el primero, 5 · 6 · 6",
    sugiere: "duplicó el valor del comienzo (3), no el que había en ese momento.",
  },
  {
    si: "El segundo igual al primero",
    sugiere: "siguió el orden de antes, no el que está escrito.",
  },
  {
    si: "«Se duplica» 3 en los dos",
    sugiere: "piensa que la instrucción usa el valor inicial.",
  },
  {
    si: "«Mostró» distinto de la última fila",
    sugiere: "cree que «Mostrar» cambia el valor, o anota en otro lugar.",
  },
  {
    si: "«No» en las dos sumas",
    sugiere: "generaliza: cree que cambiar el orden siempre cambia lo que se muestra.",
  },
];

/* ------------------------------------------------------------------------ */
/* Web: probar órdenes                                                      */
/* ------------------------------------------------------------------------ */

/*
  En pantalla, la actividad no reproduce la hoja: el estudiante predice qué
  mostrará un programa, lo ejecuta paso a paso, cambia el orden de las
  instrucciones y compara. Cada probador empieza con un programa; las
  instrucciones fijas (Mostrar al final, en el frente) no se mueven.
*/

export type Desafio = {
  texto: string;
  cumple: (resultado: { muestra?: number; memoria: Memoria }) => boolean;
};

export type Probador = {
  id: string;
  titulo: string;
  consigna: string;
  programa: Programa;
  /** Cuántas instrucciones del final quedan fijas. */
  fijasAlFinal: number;
  /** Instrucciones cuyo valor usado se informa al terminar: «Cuando se ejecutó X, C valía n». */
  usos: readonly { instruccion: string; casillero: string }[];
  desafios: readonly Desafio[];
};

export const probadores: readonly Probador[] = [
  {
    id: "arreglar",
    titulo: "Arreglá el programa",
    consigna:
      "Al terminar un nivel se quiere sumar 3 puntos de premio y después duplicar todo. Este programa tiene el orden cambiado: predecí qué muestra, ejecutalo y después cambiá el orden para que haga lo que se quería.",
    programa: programaB,
    fijasAlFinal: 1,
    usos: [{ instruccion: duplicar.texto, casillero: "PUNTOS" }],
    desafios: [
      {
        texto: "Que sume los 3 puntos antes de duplicar.",
        cumple: (r) => r.muestra === mostro(programaA),
      },
    ],
  },
  {
    id: "siempre-cambia",
    titulo: "¿Siempre cambia?",
    consigna:
      "Ahora el programa suma dos veces. Probá los dos órdenes y compará: ¿cambia lo que se muestra? ¿Y los valores por los que pasa PUNTOS?",
    programa: programaC,
    fijasAlFinal: 1,
    usos: [],
    desafios: [],
  },
  {
    id: "dos-casilleros",
    titulo: "Dos casilleros",
    consigna:
      "Ahora el juego también guarda MONEDAS. Podés mover todas las instrucciones, también «Mostrar». Buscá un orden para cada desafío.",
    programa: nivel,
    fijasAlFinal: 0,
    usos: [
      { instruccion: sumarleMonedas.texto, casillero: "MONEDAS" },
      { instruccion: duplicar.texto, casillero: "PUNTOS" },
    ],
    desafios: [
      { texto: "Que muestre 14.", cumple: (r) => r.muestra === 14 },
      { texto: "Que muestre 8.", cumple: (r) => r.muestra === 8 },
      {
        texto: "Que la pantalla muestre 7, pero PUNTOS termine valiendo 14.",
        cumple: (r) => r.muestra === 7 && r.memoria.PUNTOS === 14,
      },
    ],
  },
];
