/*
  El recorrido de «Repetir»: la página de Aula conduce la clase.

  Tres grupos, en este orden:
  - Para todos: pasos 1 a 3 y el cierre en papel. Alcanza para la idea
    mínima: qué se repite, cuántas veces y qué pasa en cada vuelta.
  - Si te queda tiempo: pasos 4 y 5. Profundizan (lo de afuera, el orden y
    el camino); cada uno suma una pregunta propia del dorso de la hoja.
  - Para ir más lejos: más desafíos y práctica sorteada.

  El cierre va antes de la continuación para que la clase se pueda cortar en
  cualquier momento sin dejar a nadie sin cerrar lo común.

  Los minutos son una referencia para la guía docente: la página no los
  muestra. Nada se guarda: el paso visible sale de la dirección (#paso-3),
  no de un registro del avance de cada estudiante.
*/

import {
  comer,
  desafioPorLetra,
  duplicar,
  masDesafios,
  mostrar,
  mover,
  repetir,
  sumar,
  type Desafio,
} from "./actividad-repetir.ts";
import { armar, type Ejercicio, type ProgramaEjercicio } from "./ejercicios-repetir.ts";

export type Grupo = "todos" | "tiempo" | "lejos";
export type Medio = "Pilas Bloques" | "Aula" | "Papel";

export const grupos: Record<Grupo, string> = {
  todos: "Para todos",
  tiempo: "Si te queda tiempo",
  lejos: "Para ir más lejos",
};

export type ProgramaVista = ProgramaEjercicio & { titulo?: string };

/*
  Lo que se anota en el papelito, con una sola convención para toda la clase:
  un casillero se escribe; las opciones (☐) se marcan con una X. La misma
  descripción arma la indicación en la página y la fila del papelito, para que
  no puedan desencontrarse.
*/
export type Campo = string | { casillero: "corto" | "largo" } | { opciones: string[] };
export type Anotacion = { letra: string; momento: "antes" | "despues"; campos: Campo[] };

const casillero: Campo = { casillero: "corto" };
const largo: Campo = { casillero: "largo" };
const opciones = (...o: string[]): Campo => ({ opciones: o });
const FLECHAS = ["↑", "↓", "←", "→"];

export type Etapa = {
  id: string;
  /** Lo que se ve en el mapa del recorrido: «1», «2»… y «✓» para el cierre. */
  marca: string;
  titulo: string;
  grupo: Grupo;
  medio: Medio;
  /** Referencia para la guía docente; la página no la muestra. */
  minutos: number;
  antes: { texto: string; papelito?: Anotacion };
  /** `despues`: lo que se anota cuando el programa ya funciona. */
  pb?: { desafio: Desafio; hacer: string[]; mientras: string; despues?: Anotacion };
  despues?: {
    texto?: string;
    ejecutores?: ProgramaVista[];
    /** El primer ejecutor pide predecir qué va a mostrar la pantalla. */
    prediccion?: boolean;
    textoEjercicios?: string;
    ejercicios?: Ejercicio[];
    /** Qué responder en el dorso de la hoja, si corresponde. */
    papel?: string;
    llevarte: string;
    enlace?: { href: string; texto: string };
  };
};

export const etapas: readonly Etapa[] = [
  {
    id: "paso-1",
    marca: "1",
    titulo: "El bloque «Repetir»",
    grupo: "todos",
    medio: "Pilas Bloques",
    minutos: 8,
    antes: {
      texto: "Duba tiene que llegar al churrasco con un solo «Mover a la derecha» adentro de un «Repetir». Abrí el desafío y contá en el tablero: ¿cuántas veces tiene que repetir?",
      papelito: { letra: "A", momento: "antes", campos: ["Repetir", casillero, "veces"] },
    },
    pb: {
      desafio: desafioPorLetra("A"),
      hacer: [
        "Armá el programa: «Repetir» con «Mover a la derecha» adentro, y «Comer churrasco» abajo.",
        "Poné el número y ejecutá.",
      ],
      mientras: "¿Cuántas veces tiene que repetir? Anotalo en A, antes de ejecutar.",
    },
    despues: {
      texto: "Tu programa, de a una instrucción:",
      ejecutores: [
        {
          mundo: "fila",
          escena: { personaje: "Duba", filas: ["A,-,-,-,-,-,-,P"] },
          cuerpo: [repetir(7, mover("derecha")), comer()],
        },
      ],
      llevarte: "«Repetir 7 veces» con un «Mover» adentro hace 7 movimientos seguidos. Cada repetición es una vuelta. Se cuentan movimientos, no casillas.",
    },
  },
  {
    id: "paso-2",
    marca: "2",
    titulo: "Vuelta por vuelta",
    grupo: "todos",
    medio: "Aula",
    minutos: 8,
    antes: {
      texto: "Mirá el ejemplo resuelto en el frente de la hoja: una fila por cada instrucción que se ejecuta.",
    },
    despues: {
      texto: "Escribí qué va a mostrar la pantalla. Después ejecutalo de a una instrucción.",
      ejecutores: [{ mundo: "puntos", inicio: 2, cuerpo: [repetir(3, duplicar(), sumar(1)), mostrar()] }],
      prediccion: true,
      textoEjercicios: "Estos dos sólo cambian en dónde está «Mostrar PUNTOS».",
      ejercicios: [armar.pantalla({ inicio: 1, n: 3, s: 4, adentro: true }), armar.pantalla({ inicio: 1, n: 3, s: 4, adentro: false })],
      llevarte: "Cada vuelta usa el valor que dejó la anterior. Lo de adentro se ejecuta en cada vuelta; lo de afuera, una vez.",
      enlace: { href: "/pizarrones/seguir-un-programa-paso-a-paso/", texto: "Seguir un programa paso a paso" },
    },
  },
  {
    id: "paso-3",
    marca: "3",
    titulo: "Corregir el número",
    grupo: "todos",
    medio: "Pilas Bloques",
    minutos: 8,
    antes: {
      texto: "Duba no llega a comer. Abrí el desafío y mirá el programa sin ejecutarlo. Cambiando sólo el número del «Repetir»: ¿cuántas veces tiene que repetir?",
      papelito: { letra: "B", momento: "antes", campos: ["Repetir", casillero, "veces"] },
    },
    pb: {
      desafio: desafioPorLetra("B"),
      hacer: ["Ejecutá con PASO y mirá dónde queda Duba.", "Cambiá el número hasta que coma."],
      mientras: "¿Cuántas veces tiene que repetir? Anotalo en B, antes de ejecutar.",
    },
    despues: {
      ejercicios: [armar.fila({ k: 9, m: 9 })],
      llevarte: "Se cuentan los movimientos, no las casillas: Duba ya está en la primera.",
    },
  },
  {
    id: "cierre",
    marca: "✓",
    titulo: "Cierre, en papel",
    grupo: "todos",
    medio: "Papel",
    minutos: 8,
    antes: {
      texto: "Dá vuelta la hoja del folio. Resolvé del 1 al 4 solo y sin mirar la pantalla. Si querés, mirá el frente.",
    },
  },
  {
    id: "paso-4",
    marca: "4",
    titulo: "¿En qué vuelta se rompe?",
    grupo: "tiempo",
    medio: "Pilas Bloques",
    minutos: 10,
    antes: {
      texto: "Duba se choca antes de comer. Abrí el desafío y seguí el programa con el dedo en el tablero, vuelta por vuelta: ¿en qué vuelta se rompe?",
      papelito: { letra: "C", momento: "antes", campos: ["se rompe en la vuelta", casillero] },
    },
    pb: {
      desafio: desafioPorLetra("C"),
      hacer: [
        "Ejecutá con PASO. Cada vez que vuelve a «Mover a la derecha» empieza otra vuelta.",
        "Corregilo: cambiá el número y agregá un bloque afuera del «Repetir».",
      ],
      mientras: "¿En qué vuelta se rompe? Anotalo en C, antes de ejecutar.",
      despues: { letra: "C", momento: "despues", campos: ["Repetir", casillero, "veces · afuera:", opciones(...FLECHAS)] },
    },
    despues: {
      ejercicios: [armar.movimientos({ n: 3, patron: ["derecha", "abajo"], despues: ["derecha"] })],
      papel: "5",
      llevarte: "Lo de adentro se ejecuta en cada vuelta; lo de afuera, una sola vez.",
    },
  },
  {
    id: "paso-5",
    marca: "5",
    titulo: "Mismas instrucciones, otro orden",
    grupo: "tiempo",
    medio: "Pilas Bloques",
    minutos: 10,
    antes: {
      texto: "Coty tiene que dibujar una escalera. Abrí el desafío y, sin ejecutar: ¿este programa la dibuja?",
      papelito: { letra: "D", momento: "antes", campos: ["¿dibuja la escalera?", opciones("Sí", "No")] },
    },
    pb: {
      desafio: desafioPorLetra("D"),
      hacer: ["Ejecutalo y mirá qué dibuja.", "Corregilo con un solo «Repetir»."],
      mientras: "¿Dibuja la escalera? Marcá Sí o No en D, antes de ejecutar.",
    },
    despues: {
      texto: "Los dos programas de Coty, con flechas. ¿Cuántas veces sube cada uno? ¿Terminan en el mismo lugar?",
      ejecutores: [
        { titulo: "El que estaba", mundo: "camino", cuerpo: [repetir(4, mover("arriba")), repetir(4, mover("derecha"))] },
        { titulo: "El corregido", mundo: "camino", cuerpo: [repetir(4, mover("arriba"), mover("derecha"))] },
      ],
      textoEjercicios: "¿Cambiar el orden siempre cambia lo que se muestra?",
      ejercicios: [armar.equivalencia({ inicio: 1, n: 2, s: 3, t: 2, variante: 3 })],
      papel: "6",
      llevarte: "Mismas instrucciones en otro orden: a veces cambia el resultado y a veces sólo el camino.",
      enlace: { href: "/cuando-importa-el-orden/", texto: "Cuándo importa el orden" },
    },
  },
];

/** Para ir más lejos. Lita trae una pregunta propia; los demás, sólo la consigna. */
export const masLejos = {
  lita: {
    desafio: desafioPorLetra("E"),
    pregunta: "Lita tiene que agarrar la lechuga y el tomate y preparar la ensalada. Antes de ejecutar: ¿«Agarrar tomate» va adentro o afuera del «Repetir»?",
  },
  desafios: masDesafios,
};

/** Lo que se anota de cada desafío de Pilas Bloques, en el orden del recorrido. */
export const anotaciones = etapas
  .filter((e): e is Etapa & { pb: NonNullable<Etapa["pb"]>; antes: { papelito: Anotacion } } => Boolean(e.pb && e.antes.papelito))
  .map((e) => ({ letra: e.antes.papelito.letra, etapa: e, antes: e.antes.papelito, despues: e.pb.despues }));

/**
  El cierre en el papelito: sólo el rótulo de cada respuesta. La consigna
  completa está en el dorso de la hoja.
*/
export const cierrePapelito: { titulo?: string; filas: { numero: string; campos: Campo[] }[] }[] = [
  {
    filas: [
      { numero: "1", campos: ["«Mostrar» se ejecuta: P", casillero, "veces · Q", casillero, "veces"] },
      { numero: "2", campos: ["en la pantalla, en orden: P", largo, "Q", largo] },
      { numero: "3", campos: ["R muestra", casillero] },
      { numero: "4", campos: ["Y falla en la vuelta", casillero, "· Repetir", casillero, "veces"] },
    ],
  },
  {
    titulo: "Si hiciste los pasos 4 y 5",
    filas: [
      { numero: "5", campos: ["en W, →", casillero, "veces · en total", casillero, "movimientos"] },
      { numero: "6", campos: ["¿S muestra lo mismo que R?", opciones("Sí", "No")] },
    ],
  },
  {
    titulo: grupos.lejos,
    filas: [{ numero: "7", campos: ["Repetir", casillero, "veces · adentro:", largo] }],
  },
];
