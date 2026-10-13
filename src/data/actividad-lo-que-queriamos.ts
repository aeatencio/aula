/*
  Caso y preguntas de «Lo que queríamos y lo que pasó»: única fuente para la
  hoja impresa, la actividad en pantalla y la clave de la guía docente. El HTML
  de la actividad muestra sólo enunciados y opciones; la revisión en pantalla y
  la clave usan estos mismos datos, para que no puedan desencontrarse.
*/

export type Letra = "A" | "B" | "C" | "D";

export type Pregunta = {
  id: string;
  enunciado: string;
  /** Indicación breve debajo del enunciado. */
  nota?: string;
  opciones: Record<Letra, string>;
  respuesta: Letra;
  /** Por qué es la mejor respuesta. En pantalla, sólo aparece cuando se elige. */
  porque: string;
  /**
   * Devolución para cada opción incorrecta. Se muestra en pantalla después de
   * Revisar y en la clave docente: orienta sin decir cuál es la respuesta.
   */
  siEligieron: Partial<Record<Letra, string>>;
};

export const letras: readonly Letra[] = ["A", "B", "C", "D"];

/** Las instrucciones del programa de la tienda, en el orden en que se ejecutan. */
export const instrucciones: readonly string[] = [
  "Anotar como total el precio del producto.",
  "Sumarle al total el envío.",
  "Descontarle al total el 10\u00a0%.",
  "Mostrar el total.",
];

/** Valor del total después de cada instrucción, con la campera. */
export const traza: readonly string[] = ["$10.000", "$12.000", "$10.800", "$10.800"];

export const preguntas: readonly Pregunta[] = [
  {
    id: "por-que",
    enunciado: "¿Por qué la pantalla mostró $10.800 y no $11.000? Porque la máquina…",
    opciones: {
      A: "calculó mal el 10\u00a0% de los $12.000.",
      B: "ejecutó la instrucción 3 antes que la 2.",
      C: "no le sumó al total el costo del envío.",
      D: "descontó cuando el total ya tenía el envío.",
    },
    respuesta: "D",
    porque:
      "Cuando llega la instrucción 3, el total vale $12.000 (producto + envío). El 10\u00a0% de $12.000 es $1.200: queda $10.800.",
    siEligieron: {
      A: "Calculá el 10\u00a0% de $12.000 y restalo: ¿da $10.800? Entonces la cuenta está bien hecha.",
      B: "Las instrucciones se ejecutan en el orden en que están escritas. Si el descuento hubiera ido antes que el envío, ¿qué habría mostrado?",
      C: "Si el envío no se hubiera sumado, ¿qué habría mostrado la pantalla? Mirá la instrucción 2.",
    },
  },
  {
    id: "zapatillas",
    enunciado:
      "Con el programa tal como está, alguien compra unas zapatillas de $30.000 con el mismo envío de $2.000. ¿Qué total muestra la pantalla?",
    opciones: {
      A: "$27.000",
      B: "$28.800",
      C: "$29.000",
      D: "$32.000",
    },
    respuesta: "B",
    porque:
      "$30.000 + $2.000 = $32.000; menos el 10\u00a0% ($3.200) queda $28.800. El programa todavía no fue ajustado.",
    siEligieron: {
      A: "Es el precio con descuento. ¿Qué hace la instrucción 2 con el envío?",
      C: "Es lo que la dueña quería cobrar. La pregunta es qué hace el programa tal como está escrito.",
      D: "Es producto más envío. ¿Qué hace después la instrucción 3?",
    },
  },
  {
    id: "ajuste",
    enunciado:
      "La dueña quiere que el programa funcione con cualquier compra, no sólo con la campera. ¿Qué ajuste conviene hacer?",
    nota: "Antes de elegir, probá cada opción con la campera y pensá si serviría con otra compra.",
    opciones: {
      A: "Cambiar la instrucción 3 por «Descontarle al total $1.000».",
      B: "Pasar la instrucción 2 al final, después de «Mostrar el total».",
      C: "Intercambiar las instrucciones 2 y 3.",
      D: "Sacar la instrucción 2, para que el envío no cambie el descuento.",
    },
    respuesta: "C",
    porque:
      "Con la campera: $10.000 − $1.000 + $2.000 = $11.000. Y sirve con cualquier precio, porque el descuento se calcula antes de que el envío entre en el total.",
    siEligieron: {
      A: "Con la campera da $11.000. ¿Y con las zapatillas de $30.000? La dueña quiere que sirva con cualquier compra.",
      B: "Seguí el total instrucción por instrucción: ¿cuánto vale cuando se ejecuta «Mostrar el total»?",
      D: "Sin la instrucción 2, ¿se cobra el envío? La dueña quiere cobrarlo.",
    },
  },
  {
    id: "entrada-o-instrucciones",
    enunciado:
      "En el microondas, alguien tocó «+30\u00a0s» cuando quería detenerlo. En la tienda, la dueña quería descontar sólo del producto. En ninguno de los dos casos la máquina hizo lo que la persona quería. ¿Dónde estuvo el problema en cada caso?",
    opciones: {
      A: "En el microondas, en la entrada que recibió; en la tienda, en el orden de las instrucciones.",
      B: "En el microondas, la máquina interpretó mal; en la tienda, la máquina calculó mal.",
      C: "En los dos, en la entrada: las dos máquinas recibieron datos equivocados.",
      D: "En los dos, en las instrucciones: los dos programas estaban mal escritos.",
    },
    respuesta: "A",
    porque:
      "El microondas recibió la señal de «+30\u00a0s» y su programa hizo lo que indica para esa tecla: la entrada no era la que la persona quería. En la tienda, el precio y el envío eran correctos: el problema estaba en el orden de las instrucciones. En ninguno de los dos casos la máquina sabe lo que se quería.",
    siEligieron: {
      B: "Revisá las cuentas de la tienda: ¿hay alguna mal hecha? ¿Y el microondas «entendió» algo, o hizo lo que indica la tecla que recibió?",
      C: "En la tienda, el precio y el envío que recibió el programa, ¿estaban equivocados? Pensá qué habría que cambiar para que muestre $11.000.",
      D: "En el microondas, para que se detuviera, ¿había que cambiar su programa o la tecla que se tocó?",
    },
  },
];

export const ideaFinal =
  "La máquina no sabe lo que queremos: actúa según la entrada que recibe y las instrucciones de su programa, tal como están escritas y en ese orden. Programar es organizar instrucciones, probar qué pasa y ajustar.";
