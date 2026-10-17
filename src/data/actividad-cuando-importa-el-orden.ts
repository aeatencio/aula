/*
  Programas y preguntas de «Cuándo importa el orden»: única fuente para la hoja
  impresa, el pizarrón «Seguir un programa paso a paso», la guía docente y los
  papelitos. Las tablas de la clave no se escriben a mano: salen de ejecutar
  estos mismos programas con `seguir`, para que hoja y clave no puedan
  desencontrarse.

  Trabaja sólo secuencia y orden: no hay condiciones ni repeticiones.
*/

export type Letra = "A" | "B" | "C" | "D";

export const letras: readonly Letra[] = ["A", "B", "C", "D"];

/** Los valores que guarda la memoria, por nombre de casillero. */
export type Memoria = Readonly<Record<string, number>>;

export type Instruccion = {
  texto: string;
  /** Devuelve la memoria después de la instrucción y, si muestra algo, qué. */
  hacer: (memoria: Memoria) => { memoria: Memoria; pantalla?: number };
};

export type Programa = {
  casilleros: readonly string[];
  inicial: Memoria;
  /** Numeradas desde 1, en el orden en que están escritas. */
  instrucciones: readonly Instruccion[];
};

export type Fila = {
  /** Número de la instrucción en el programa escrito. */
  numero: number;
  texto: string;
  /** Cómo queda la memoria después de ejecutarla. */
  memoria: Memoria;
  /** Lo que muestra, sólo si es una instrucción «Mostrar». */
  pantalla?: number;
};

/**
 * Ejecuta las instrucciones en el orden indicado (números de instrucción) y
 * devuelve una fila de la tabla de seguimiento por cada una.
 */
export function seguir(
  programa: Programa,
  orden: readonly number[] = programa.instrucciones.map((_, i) => i + 1),
  inicial: Memoria = programa.inicial,
  instrucciones: readonly Instruccion[] = programa.instrucciones,
): Fila[] {
  let memoria = inicial;
  return orden.map((numero) => {
    const instruccion = instrucciones[numero - 1];
    if (!instruccion) throw new Error(`No hay instrucción ${numero}`);
    const efecto = instruccion.hacer(memoria);
    memoria = efecto.memoria;
    return {
      numero,
      texto: instruccion.texto,
      memoria,
      pantalla: efecto.pantalla,
    };
  });
}

/** Lo que mostró la pantalla al seguir el programa (la última vez que mostró). */
export function pantallaFinal(filas: readonly Fila[]): number | undefined {
  return filas.findLast((fila) => fila.pantalla !== undefined)?.pantalla;
}

export const formatear = (n: number) => n.toLocaleString("es-AR");

/* ------------------------------------------------------------------------ */
/* Pizarrón: la cantina                                                     */
/* ------------------------------------------------------------------------ */

export const cantina: Programa = {
  casilleros: ["CANTIDAD", "TOTAL"],
  inicial: { CANTIDAD: 2, TOTAL: 0 },
  instrucciones: [
    {
      texto: "Sumarle 1 a CANTIDAD.",
      hacer: (m) => ({ memoria: { ...m, CANTIDAD: m.CANTIDAD + 1 } }),
    },
    {
      texto: "Anotar en TOTAL: CANTIDAD × 800.",
      hacer: (m) => ({ memoria: { ...m, TOTAL: m.CANTIDAD * 800 } }),
    },
    {
      texto: "Mostrar TOTAL.",
      hacer: (m) => ({ memoria: m, pantalla: m.TOTAL }),
    },
  ],
};

export const casoCantina =
  "En la cantina de la escuela, una persona había pedido 2 empanadas y agrega una más. Cada empanada cuesta $800. El programa tiene que cobrar las 3.";

/** En el pizarrón, después de seguirlo como está, se prueba este otro orden. */
export const ordenCantinaCambiado: readonly number[] = [2, 1, 3];

/* ------------------------------------------------------------------------ */
/* Hoja: el juego                                                           */
/* ------------------------------------------------------------------------ */

export const juego: Programa = {
  casilleros: ["PUNTOS", "MONEDAS"],
  inicial: { PUNTOS: 40, MONEDAS: 5 },
  instrucciones: [
    {
      texto: "Sumarle a PUNTOS el valor de MONEDAS × 10.",
      hacer: (m) => ({ memoria: { ...m, PUNTOS: m.PUNTOS + m.MONEDAS * 10 } }),
    },
    {
      texto: "Anotar 0 en MONEDAS.",
      hacer: (m) => ({ memoria: { ...m, MONEDAS: 0 } }),
    },
    {
      texto: "Duplicar PUNTOS.",
      hacer: (m) => ({ memoria: { ...m, PUNTOS: m.PUNTOS * 2 } }),
    },
    {
      texto: "Mostrar PUNTOS.",
      hacer: (m) => ({ memoria: m, pantalla: m.PUNTOS }),
    },
  ],
};

export const casoJuego =
  "Al terminar un nivel de un juego, cada moneda juntada se cambia por 10 puntos y las monedas vuelven a 0. Después, como premio por terminar el nivel, se duplican todos los puntos. Al final, la pantalla muestra los puntos.";

export type Version = {
  id: string;
  /** Número de la consigna en la hoja y en el papelito. */
  numero: number;
  nombre: string;
  orden: readonly number[];
  /**
   * Primero se predice el resultado; la tabla queda disponible para quien la
   * necesite y para la corrección.
   */
  primeroPredecir?: boolean;
};

export const versiones: readonly Version[] = [
  { id: "v1", numero: 2, nombre: "Versión 1", orden: [1, 3, 2, 4] },
  { id: "v2", numero: 3, nombre: "Versión 2", orden: [2, 1, 3, 4] },
  { id: "v3", numero: 5, nombre: "Versión 3", orden: [3, 1, 2, 4], primeroPredecir: true },
  { id: "v4", numero: 6, nombre: "Versión 4", orden: [1, 2, 4, 3] },
];

/* ------------------------------------------------------------------------ */
/* Hoja: el kiosco                                                          */
/* ------------------------------------------------------------------------ */

export const kiosco: Programa = {
  casilleros: ["STOCK", "VENTA"],
  inicial: { STOCK: 12, VENTA: 3 },
  instrucciones: [
    {
      texto: "Mostrar STOCK.",
      hacer: (m) => ({ memoria: m, pantalla: m.STOCK }),
    },
    {
      texto: "Restarle a STOCK el valor de VENTA.",
      hacer: (m) => ({ memoria: { ...m, STOCK: m.STOCK - m.VENTA } }),
    },
    {
      texto: "Anotar 0 en VENTA.",
      hacer: (m) => ({ memoria: { ...m, VENTA: 0 } }),
    },
  ],
};

export const casoKiosco =
  "En el kiosco de la escuela, cuando se venden alfajores, el programa tiene que descontar la venta del stock y mostrar cuántos alfajores quedan.";

/** Lo que se quiere que muestre: los alfajores que quedan después de la venta. */
export const quedan = (m: Memoria) => m.STOCK - m.VENTA;

/** La otra venta con la que se prueba si el ajuste sirve para cualquier venta. */
export const otraVenta: Memoria = { STOCK: 12, VENTA: 5 };

const mostrarMenos3: Instruccion = {
  texto: "Mostrar STOCK − 3.",
  hacer: (m) => ({ memoria: m, pantalla: m.STOCK - 3 }),
};

/**
 * Cada opción de la pregunta del kiosco, como programa que se puede seguir.
 * Las instrucciones se numeran como en el programa escrito; la opción C
 * reemplaza la instrucción 1.
 */
export const ajustesKiosco: Record<
  Letra,
  { orden: readonly number[]; instrucciones: readonly Instruccion[] }
> = {
  A: { orden: [2, 3, 1], instrucciones: kiosco.instrucciones },
  B: { orden: [1, 3, 2], instrucciones: kiosco.instrucciones },
  C: {
    orden: [1, 2, 3],
    instrucciones: [mostrarMenos3, ...kiosco.instrucciones.slice(1)],
  },
  D: { orden: [3, 2, 1], instrucciones: kiosco.instrucciones },
};

export function seguirAjuste(letra: Letra, inicial: Memoria = kiosco.inicial): Fila[] {
  const ajuste = ajustesKiosco[letra];
  return seguir(kiosco, ajuste.orden, inicial, ajuste.instrucciones);
}

/* ------------------------------------------------------------------------ */
/* Preguntas para elegir                                                    */
/* ------------------------------------------------------------------------ */

export type Pregunta = {
  id: string;
  /** Número de la consigna en la hoja y en el papelito. */
  numero: number;
  enunciado: string;
  opciones: Record<Letra, string>;
  respuesta: Letra;
  /** Por qué es la mejor respuesta. Sólo en la guía. */
  porque: string;
  /** Qué preguntar a quien eligió cada opción incorrecta. Sólo en la guía. */
  siEligieron: Partial<Record<Letra, string>>;
};

export const preguntaPorQue: Pregunta = {
  id: "por-que",
  numero: 4,
  enunciado:
    "¿Por qué la versión 1 muestra lo mismo que el programa original y la versión 2 no?",
  opciones: {
    A: "Porque en la versión 2 «Anotar 0 en MONEDAS» va primero, y anotar 0 borra todos los valores de la memoria.",
    B: "Porque en la versión 1 la máquina se da cuenta de que esas dos pueden ir en cualquier orden.",
    C: "Porque en la versión 2 la instrucción 1 se ejecuta cuando MONEDAS ya vale 0; en la versión 1, cuando se duplica, PUNTOS ya tiene las monedas.",
    D: "Porque en la versión 2 la máquina hace mal la cuenta de MONEDAS × 10 y suma menos puntos.",
  },
  respuesta: "C",
  porque:
    "Cada instrucción trabaja con los valores que hay en ese momento. En la versión 2, la instrucción 1 se ejecuta cuando MONEDAS ya vale 0: suma 0 puntos. En la versión 1, al duplicar, PUNTOS vale 90 como en el original; que MONEDAS se ponga en 0 antes o después no cambia PUNTOS.",
  siEligieron: {
    A: "Mirá tu tabla de la versión 2: después de «Anotar 0 en MONEDAS», ¿cuánto vale PUNTOS? Anotar cambia sólo su casillero.",
    B: "La máquina no sabe qué orden conviene: ejecuta lo que está escrito. ¿Qué valores hay en la memoria cuando se duplica, en cada versión?",
    D: "Hacé la cuenta con lo que hay en la memoria en ese momento: si MONEDAS vale 0, ¿cuánto es MONEDAS × 10? La cuenta está bien hecha.",
  },
};

export const preguntaMemoriaYPantalla: Pregunta = {
  id: "memoria-y-pantalla",
  numero: 7,
  enunciado:
    "Al terminar la versión 4, ¿cuánto vale PUNTOS en la memoria y qué número se vio en la pantalla?",
  opciones: {
    A: "PUNTOS vale 180 y la pantalla mostró 180.",
    B: "PUNTOS vale 90 y la pantalla mostró 90.",
    C: "PUNTOS vale 90 y la pantalla mostró 180.",
    D: "PUNTOS vale 180 y la pantalla mostró 90.",
  },
  respuesta: "D",
  porque:
    "«Mostrar PUNTOS» se ejecuta cuando PUNTOS vale 90 y muestra ese valor. Después se duplica: la memoria queda en 180, pero la pantalla ya mostró 90.",
  siEligieron: {
    A: "Mirá la fila de «Mostrar PUNTOS» en tu tabla: cuando se ejecuta, ¿ya se duplicaron los puntos?",
    B: "Después de mostrar se ejecuta la instrucción 3. ¿Qué le hace a PUNTOS?",
    C: "La pantalla muestra lo que vale PUNTOS cuando se ejecuta «Mostrar». ¿Cuánto valía en ese momento? ¿Y al final?",
  },
};

export const preguntaAjuste: Pregunta = {
  id: "ajuste",
  numero: 8,
  enunciado: "¿Cuál de estos ajustes sirve para cualquier valor de VENTA?",
  opciones: {
    A: "Pasar la instrucción 1 al final.",
    B: "Intercambiar las instrucciones 2 y 3.",
    C: "Cambiar la instrucción 1 por «Mostrar STOCK − 3».",
    D: "Intercambiar las instrucciones 1 y 3.",
  },
  respuesta: "A",
  porque:
    "Así se muestra STOCK cuando ya tiene descontada la venta, sea cual sea VENTA: con 3 muestra 9 y con 5 muestra 7.",
  siEligieron: {
    B: "Seguilo: VENTA vale 0 cuando se resta. ¿Cuánto se descuenta? ¿Y cuándo se muestra STOCK?",
    C: "Con VENTA = 3 muestra 9. Probalo en la tabla con VENTA = 5: ¿muestra cuántos quedan?",
    D: "Seguilo: VENTA se pone en 0 antes de restar. ¿Cuánto se descuenta?",
  },
};

export const preguntas: readonly Pregunta[] = [
  preguntaPorQue,
  preguntaMemoriaYPantalla,
  preguntaAjuste,
];

/* ------------------------------------------------------------------------ */
/* Papelito                                                                 */
/* ------------------------------------------------------------------------ */

/** Número de las dos consignas que no son versiones ni preguntas para elegir. */
export const numeroOriginal = 1;
export const numeroPrueba = 9;

export type Casillero = { numero: number; tipo: "numero" | "letra" };

/**
 * Casilleros del papelito en el orden de la hoja: una fila por cara, para que
 * un curso que sólo llegó al frente complete la primera.
 */
export const casillerosPapelito: readonly { cara: string; casilleros: readonly Casillero[] }[] = [
  {
    cara: "Frente",
    casilleros: [
      { numero: 1, tipo: "numero" },
      { numero: 2, tipo: "numero" },
      { numero: 3, tipo: "numero" },
      { numero: 4, tipo: "letra" },
    ],
  },
  {
    cara: "Dorso",
    casilleros: [
      { numero: 5, tipo: "numero" },
      { numero: 6, tipo: "numero" },
      { numero: 7, tipo: "letra" },
      { numero: 8, tipo: "letra" },
      { numero: 9, tipo: "numero" },
    ],
  },
];

/* ------------------------------------------------------------------------ */
/* Ideas                                                                    */
/* ------------------------------------------------------------------------ */

export const preguntaInicial = "¿Cuándo cambiar el orden cambia el resultado?";

export const ideaInicial =
  "Cada instrucción trabaja con los valores que hay en ese momento. Por eso cambiar el orden a veces cambia el resultado y a veces no.";

/** Se escribe recién al final de la corrección, a partir de los casos. */
export const conclusion =
  "Cambiar el orden puede cambiar el resultado cuando una instrucción usa un valor que otra cambia. Mostrar muestra el valor que hay en ese momento.";

export const verbos: readonly { verbo: string; explicacion: string }[] = [
  { verbo: "Anotar", explicacion: "reemplaza lo que había en el casillero." },
  {
    verbo: "Sumarle, Restarle, Duplicar",
    explicacion: "cambian el valor a partir de lo que había.",
  },
  { verbo: "Mostrar", explicacion: "pone un valor en la pantalla; no cambia la memoria." },
];

/** Sin punto final: se cita entre comillas. */
export const consignaFrase =
  "Cambiar el orden de dos instrucciones a veces cambia el resultado y a veces no. Explicalo con un ejemplo de hoy";
