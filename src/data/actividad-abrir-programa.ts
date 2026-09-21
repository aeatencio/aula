export const bancoPalabras = [
  "almacenamiento",
  "CPU",
  "datos",
  "driver",
  "entrada",
  "hardware",
  "instrucciones",
  "programa",
  "RAM",
  "salida",
  "sistema operativo",
  "temporal",
] as const;

export type PalabraBanco = (typeof bancoPalabras)[number];

export type HuecoActividad = {
  id: string;
  respuesta: PalabraBanco;
  contexto: string;
  pistas: [string, string];
  confusiones: Partial<Record<PalabraBanco, string>>;
};

export const huecos: HuecoActividad[] = [
  {
    id: "programa",
    respuesta: "programa",
    contexto: "abrir un …",
    pistas: [
      "Es lo que la persona quiere usar. Antes del clic todavía no está en marcha.",
      "No es una parte física de la computadora: es el software que se quiere abrir.",
    ],
    confusiones: {
      "sistema operativo":
        "El sistema operativo no es lo que se abre con el clic: es quien ayuda a abrirlo.",
      hardware:
        "El hardware ya está en el equipo. Lo que se abre es un software concreto.",
    },
  },
  {
    id: "entrada",
    respuesta: "entrada",
    contexto: "dispositivo de …",
    pistas: [
      "El clic llega por un periférico. ¿Ese dispositivo incorpora información o muestra un resultado?",
      "Mouse, táctil o teclado incorporan información: son dispositivos de entrada.",
    ],
    confusiones: {
      salida:
        "La salida es cómo se muestra el resultado. El clic es una orden que entra al sistema.",
      hardware:
        "Sí interviene el hardware, pero acá el texto pide el tipo de dispositivo: si incorpora información o si la muestra.",
    },
  },
  {
    id: "so",
    respuesta: "sistema operativo",
    contexto: "quién localiza los archivos",
    pistas: [
      "El programa todavía no está en marcha. ¿Quién busca los archivos y los prepara?",
      "Es el software de base que está entre los programas y el hardware.",
    ],
    confusiones: {
      programa:
        "El programa aún no está en ejecución. ¿Quién localiza sus archivos?",
      CPU: "La CPU ejecuta después. Antes hace falta quien organice ese trabajo.",
      hardware:
        "El hardware no busca archivos por sí solo: lo hace el software de base.",
    },
  },
  {
    id: "almacenamiento",
    respuesta: "almacenamiento",
    contexto: "dónde estaban los archivos",
    pistas: [
      "¿Dónde estaba el programa antes de abrirlo? Ahí permanecen los archivos cuando se apaga el equipo.",
      "Disco, SSD o USB: almacenamiento persistente. No es la memoria de trabajo.",
    ],
    confusiones: {
      RAM: "La RAM es donde se carga lo que se va a usar ahora. ¿Dónde estaban los archivos antes?",
      CPU: "La CPU no guarda los archivos del programa. Distinguí procesamiento, memoria temporal y almacenamiento.",
    },
  },
  {
    id: "ram",
    respuesta: "RAM",
    contexto: "memoria …",
    pistas: [
      "Es la memoria de trabajo: ahí se carga lo que se va a usar ahora.",
      "No es el disco. Es la memoria que la CPU usa mientras el programa está en curso.",
    ],
    confusiones: {
      almacenamiento:
        "El almacenamiento conserva los archivos. ¿En qué memoria se carga lo que se usa ahora?",
      CPU: "La CPU ejecuta instrucciones; no es la memoria donde se cargan.",
      temporal:
        "«Temporal» describe cómo conserva la información esa memoria, no su nombre.",
    },
  },
  {
    id: "instrucciones",
    respuesta: "instrucciones",
    contexto: "carga las …",
    pistas: [
      "Lo que se carga para que la CPU sepa qué hacer.",
      "Se distinguen de los datos: son las órdenes, no la información sobre la que se opera.",
    ],
    confusiones: {
      datos:
        "Los datos son la información sobre la que se opera. ¿Qué necesita ejecutar la CPU?",
      programa:
        "El programa incluye ambas cosas. Acá el texto separa lo que se ejecuta de lo que se usa.",
    },
  },
  {
    id: "datos",
    respuesta: "datos",
    contexto: "y los … que se van a utilizar",
    pistas: [
      "Junto con las instrucciones, ¿qué más hace falta para trabajar?",
      "La información que esas instrucciones van a usar. No son las órdenes mismas.",
    ],
    confusiones: {
      instrucciones:
        "Las instrucciones son las órdenes. ¿Qué información usan esas órdenes?",
    },
  },
  {
    id: "temporal",
    respuesta: "temporal",
    contexto: "conserva de manera …",
    pistas: [
      "¿Qué le pasa a esa memoria al apagar el equipo?",
      "La RAM no conserva el contenido al apagar: guarda la información de manera temporal.",
    ],
    confusiones: {
      RAM: "RAM es el nombre de la memoria. Acá se pregunta de qué manera conserva la información.",
      almacenamiento:
        "El almacenamiento persiste al apagar. Esta memoria, no.",
    },
  },
  {
    id: "cpu",
    respuesta: "CPU",
    contexto: "quién ejecuta las instrucciones",
    pistas: [
      "El componente que ejecuta y produce resultados. No es quien guarda todo.",
      "Es el procesador: ejecuta las instrucciones que están en la RAM.",
    ],
    confusiones: {
      RAM: "La RAM mantiene disponible lo que está en uso. ¿Quién ejecuta las instrucciones?",
      "sistema operativo":
        "El sistema operativo organiza el trabajo; no reemplaza a quien ejecuta las instrucciones.",
      hardware:
        "La CPU es una parte del hardware. El texto pide el componente que ejecuta.",
    },
  },
  {
    id: "salida",
    respuesta: "salida",
    contexto: "dispositivo de … para mostrar",
    pistas: [
      "Pantalla o parlantes muestran o aplican el resultado. ¿Qué tipo de dispositivo es?",
      "Lo contrario de entrada: un dispositivo de salida.",
    ],
    confusiones: {
      entrada:
        "La entrada es cómo llega la orden. ¿Por dónde se muestra el resultado?",
      hardware:
        "Sí es hardware, pero el texto pide el tipo de dispositivo que muestra el resultado.",
    },
  },
  {
    id: "hardware",
    respuesta: "hardware",
    contexto: "el sistema operativo coordina el …",
    pistas: [
      "Durante todo el recorrido se coordinan las partes físicas: CPU, memoria, almacenamiento y periféricos.",
      "El sistema operativo no reemplaza esos componentes: administra el hardware.",
    ],
    confusiones: {
      "sistema operativo":
        "El sistema operativo es quien coordina. ¿Qué es lo coordinado?",
      driver:
        "El driver aparece para un periférico concreto. Acá se habla de todo el conjunto físico.",
    },
  },
  {
    id: "driver",
    respuesta: "driver",
    contexto: "controlador específico",
    pistas: [
      "Si un periférico necesita un controlador específico, ¿qué utiliza el sistema?",
      "Un controlador que permite hablar con ese dispositivo: un driver.",
    ],
    confusiones: {
      "sistema operativo":
        "El sistema operativo usa ese controlador; no es el nombre del controlador.",
      hardware:
        "El hardware es el dispositivo. El driver es el controlador específico que permite usarlo.",
    },
  },
];

export const relato: Array<{ tipo: "texto"; valor: string } | { tipo: "hueco"; id: string }> =
  [
    {
      tipo: "texto",
      valor: "Cuando una persona hace clic para abrir un ",
    },
    { tipo: "hueco", id: "programa" },
    {
      tipo: "texto",
      valor: ", la orden ingresa mediante un dispositivo de ",
    },
    { tipo: "hueco", id: "entrada" },
    { tipo: "texto", valor: ". El " },
    { tipo: "hueco", id: "so" },
    {
      tipo: "texto",
      valor: " localiza los archivos necesarios en el ",
    },
    { tipo: "hueco", id: "almacenamiento" },
    {
      tipo: "texto",
      valor: ". Luego carga en la memoria ",
    },
    { tipo: "hueco", id: "ram" },
    { tipo: "texto", valor: " las " },
    { tipo: "hueco", id: "instrucciones" },
    { tipo: "texto", valor: " y los " },
    { tipo: "hueco", id: "datos" },
    {
      tipo: "texto",
      valor: " que se van a utilizar. Esta memoria conserva la información de manera ",
    },
    { tipo: "hueco", id: "temporal" },
    { tipo: "texto", valor: ". La " },
    { tipo: "hueco", id: "cpu" },
    {
      tipo: "texto",
      valor:
        " ejecuta las instrucciones y produce resultados. Para mostrarlos, el sistema utiliza un dispositivo de ",
    },
    { tipo: "hueco", id: "salida" },
    {
      tipo: "texto",
      valor:
        ". Durante todo el recorrido, el sistema operativo coordina el ",
    },
    { tipo: "hueco", id: "hardware" },
    {
      tipo: "texto",
      valor:
        ". Si un periférico necesita un controlador específico, utiliza un ",
    },
    { tipo: "hueco", id: "driver" },
    { tipo: "texto", valor: "." },
  ];

export function huecoPorId(id: string): HuecoActividad {
  const hueco = huecos.find((item) => item.id === id);
  if (!hueco) {
    throw new Error(`Hueco no encontrado: ${id}`);
  }
  return hueco;
}
