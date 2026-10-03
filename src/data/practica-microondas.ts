export type Opcion = {
  id: string;
  texto: string;
};

export type Decision = {
  id: string;
  enunciado: string;
  opciones: readonly Opcion[];
  respuesta: string;
  /** Un comentario por cada opción que no encaja con el caso. */
  devoluciones: Record<string, string>;
  explicacion: string;
};

export type Referencia = {
  href: string;
  titulo: string;
  donde: string;
};

export type Ayuda = {
  titulo: string;
  parrafos: readonly string[];
  preguntas?: readonly string[];
  referencias?: readonly Referencia[];
};

export type Unidad = {
  id: string;
  titulo: string;
  caso: readonly string[];
  consigna: string;
  decisiones: readonly Decision[];
  ayudas: readonly Ayuda[];
};

const papeles: readonly Opcion[] = [
  { id: "entrada", texto: "Entrada" },
  { id: "operacion", texto: "Operación" },
  { id: "estado", texto: "Estado" },
  { id: "salida", texto: "Salida" },
];

const entradaProcesamientoSalida = {
  href: "/pizarrones/entrada-procesamiento-y-salida/",
  titulo: "Entrada, procesamiento y salida",
};

const estadoDeUnSistema = {
  href: "/pizarrones/el-estado-de-un-sistema/",
  titulo: "El estado de un sistema",
};

const instruccionesDatosOperaciones = {
  href: "/pizarrones/instrucciones-datos-operaciones-y-resultados/",
  titulo: "Instrucciones, datos, operaciones y resultados",
};

/** Recorte funcional del sistema, sin electrónica. */
export const sistema =
  "El sistema es el microondas: teclado, puerta, control, visor y parlante son partes de él. La persona y la comida quedan afuera. Para distinguir entrada, operación, estado y salida miramos el procesamiento desde el control: qué información le llega por el teclado o la puerta, qué hace con ella, qué conserva y qué comunica por el visor o el parlante. Tocar una tecla es una acción de la persona; al control le llega la señal de esa tecla.";

export const toque: Unidad = {
  id: "toque",
  titulo: "Un toque en el microondas",
  caso: [
    "Un microondas calienta una taza de sopa. Mientras calienta, el control lleva la cuenta del tiempo restante para saber cuándo apagarse. Faltan 0:40 y el visor muestra «0:40».",
    "La persona cree que no va a alcanzar y toca la tecla «+30 s». Enseguida el visor muestra «1:10» y suena un pitido corto.",
  ],
  consigna:
    "Mirá sólo el momento del toque. Donde las opciones son Entrada, Operación, Estado y Salida, elegí qué papel cumple cada cosa.",
  decisiones: [
    {
      id: "senal",
      enunciado: "La señal que el teclado manda al control: se tocó «+30 s»",
      opciones: papeles,
      respuesta: "entrada",
      devoluciones: {
        operacion:
          "En el caso, la señal sólo indica qué tecla se tocó; lo que el control hace con ella viene después. ¿La señal es algo que el control hace o algo que le llega?",
        estado:
          "¿Esta señal es información que el control mantiene para saber cómo está y seguir, o información que le llega en el instante del toque? Mirá de dónde viene.",
        salida:
          "La señal va del teclado hacia el control; no es algo que el control comunica. ¿En qué dirección viaja?",
      },
      explicacion:
        "Tocar la tecla es una acción de la persona. Lo que llega al control es la señal de esa tecla, que indica que se tocó «+30 s»: es la entrada de este momento. La señal no trae el nuevo tiempo; con ella, el control ejecuta lo que su programa indica para esa tecla.",
    },
    {
      id: "calculo",
      enunciado: "¿Cómo obtuvo el control el 1:10?",
      opciones: [
        { id: "tecla", texto: "Tomó el 1:10 que le mandó la tecla «+30 s»." },
        {
          id: "guardado",
          texto: "Sumó 30 segundos a los 0:40 que tenía en la cuenta.",
        },
        { id: "nueva", texto: "Empezó una cuenta nueva de 30 segundos." },
        {
          id: "visor",
          texto: "Leyó en el visor los 0:40 y les sumó 30 segundos.",
        },
      ],
      respuesta: "guardado",
      devoluciones: {
        tecla:
          "La tecla «+30 s» manda la misma señal falten 0:40 o 5:00. Si la señal fuera siempre la misma, ¿cómo podría traer el 1:10 de este caso?",
        nueva:
          "Si hubiera empezado una cuenta nueva de 30 segundos, ¿qué tiempo restante habría quedado? Compará con lo que muestra el visor en el caso.",
        visor:
          "Es cierto que el visor mostraba 0:40. Pero ese número aparece en el visor porque el control ya lo tenía. ¿Dónde estaba el 0:40 antes de mostrarse?",
      },
      explicacion:
        "El control usa dos informaciones: la señal que recibe (se tocó «+30 s») y el tiempo restante que ya tenía en la cuenta (0:40). Con ellas ejecuta la suma que su programa indica para esa tecla y obtiene 1:10: esa suma es la operación, porque usa información para obtener otra. La tecla no trae el resultado: si faltaran 2:00, la misma señal llevaría a 2:30. Y el control no lee el visor: el visor muestra el tiempo que el control ya tiene en la cuenta.",
    },
    {
      id: "tiempo",
      enunciado:
        "El tiempo restante que el control guarda para seguir descontando y saber cuándo apagarse (después del toque vale 1:10)",
      opciones: papeles,
      respuesta: "estado",
      devoluciones: {
        entrada:
          "Ese tiempo no le llega al control por el teclado ni por la puerta: lo tiene en la cuenta y lo actualiza él. ¿Qué información le llegó con el toque?",
        operacion:
          "Acá se pregunta por el dato que el control guarda, no por la suma que lo cambió. Después del toque, ¿para qué sigue usando el control ese dato?",
        salida:
          "Acá se trata del dato que el control guarda, no de los números que lo dan a conocer en el visor. ¿Para qué necesita el control ese dato mientras sigue calentando?",
      },
      explicacion:
        "El 1:10 es el resultado de sumar 30 segundos a 0:40. Ese resultado no queda suelto: pasa a ser el nuevo valor del tiempo restante, el dato que el control mantiene para seguir descontando y saber cuándo apagarse. Mirado así, como información que el sistema conserva para continuar, es parte de su estado. Ser resultado de una operación y ser parte del estado no se contradicen: son dos miradas sobre el mismo valor. Un resultado puede mostrarse, guardarse o usarse para continuar la tarea.",
    },
    {
      id: "visor",
      enunciado: "Los números «1:10» en el visor y el pitido corto",
      opciones: papeles,
      respuesta: "salida",
      devoluciones: {
        entrada:
          "Los números del visor y el pitido no le llegan al control: los produce el microondas. ¿Hacia dónde van?",
        operacion:
          "Encender esos números no obtiene un valor nuevo: el 1:10 ya estaba calculado. ¿Qué hace el microondas con ese valor en el visor?",
        estado:
          "El visor muestra el mismo valor que el tiempo restante. ¿Esos números encendidos son lo que el control mantiene para seguir, o la forma en que el microondas da a conocer ese valor?",
      },
      explicacion:
        "Los números encendidos y el pitido son lo que el microondas comunica hacia afuera en este momento: son las salidas que miramos en este caso. Una salida puede comunicar un resultado o producir una acción (calentar la comida también es algo que el microondas produce), y puede convertirse en entrada de otro sistema. El visor muestra el mismo valor que el tiempo restante: el número es el mismo, pero la función es otra. El control usa el dato para seguir; el visor lo da a conocer.",
    },
    {
      id: "intencion",
      enunciado:
        "En la misma situación, con 0:40 restantes, otra persona toca «+30 s» por error: quería tocar «Detener». En ese momento, el microondas…",
      opciones: [
        { id: "detiene", texto: "se detiene, porque eso quería la persona." },
        { id: "igual", texto: "suma 30 segundos, igual que en el primer toque." },
        {
          id: "queda",
          texto: "deja el tiempo en 0:40, porque nadie quería sumar.",
        },
      ],
      respuesta: "igual",
      devoluciones: {
        detiene:
          "Para detenerse, el control tendría que recibir la señal de «Detener». En este caso se tocó «+30 s». ¿Qué información le llegó en ese momento?",
        queda:
          "Que nadie quería sumar, ¿le llega al control de alguna manera? Compará la señal que recibe con la del primer toque.",
      },
      explicacion:
        "El control sólo puede actuar con la información que efectivamente recibe. En este toque recibe la misma señal que en el primero, con el mismo tiempo restante, así que hace lo mismo: suma 30 segundos y el tiempo pasa a 1:10. No le llega ninguna información que indique que la persona quería detenerlo o que se equivocó. Si hubiera tocado «Detener», esa señal sí habría comunicado su pedido.",
    },
  ],
  ayudas: [
    {
      titulo: "Ayuda",
      parrafos: ["Para cada cosa del caso, probá estas preguntas:"],
      preguntas: [
        "¿Es información que le llega al control en ese momento, por el teclado o por la puerta? Eso es una entrada. Puede venir de una persona, de un sensor o de otro sistema.",
        "¿Usa o transforma información para obtener otra? Eso es una operación.",
        "¿Es información que el control mantiene para saber cómo está y poder seguir? Eso es parte del estado.",
        "¿Es algo que el microondas comunica o produce hacia afuera? Eso es una salida: puede comunicar un resultado o producir una acción.",
      ],
      referencias: [
        {
          ...entradaProcesamientoSalida,
          donde:
            "las tres cajas («incorpora información», «realiza operaciones con la información recibida», «comunica un resultado o produce una acción») y la flecha final: una salida puede convertirse en entrada de otro sistema.",
        },
        {
          ...estadoDeUnSistema,
          donde:
            "la primera frase y el diagrama: la entrada «vender 2» y la operación «Descontar 2» están en lugares distintos, y la operación deja un estado actualizado.",
        },
        {
          ...instruccionesDatosOperaciones,
          donde:
            "la frase final: «Un resultado puede mostrarse, guardarse o utilizarse como dato para continuar la tarea».",
        },
      ],
    },
    {
      titulo: "Otra ayuda, más concreta",
      parrafos: [
        "En el caso, 1:10 aparece de tres maneras: como resultado de una suma, como nuevo valor del tiempo que el control guarda y como números en el visor. Mirá qué función cumple en cada frase.",
        "Para saber de dónde salió el 1:10, fijate qué información tenía el control antes del toque y cuál le llegó con el toque.",
        "Cuando alguien toca «+30 s» sin querer, ¿qué información recibe el control? ¿Es distinta de la del primer toque?",
      ],
    },
  ],
};

export const puerta: Unidad = {
  id: "puerta",
  titulo: "Otra situación, si querés seguir",
  caso: [
    "Otro día, el mismo microondas calienta un plato de arroz. Faltan 0:25. Alguien abre la puerta para revolver el arroz: el microondas deja de calentar y deja de descontar. Nadie tocó ninguna tecla.",
    "Unos segundos después, cierra la puerta y toca «Iniciar». El microondas calienta los 25 segundos que faltaban.",
  ],
  consigna:
    "Es optativa. Mirá dos momentos: cuando se abre la puerta y cuando se vuelve a iniciar.",
  decisiones: [
    {
      id: "aviso",
      enunciado:
        "Cuando se abrió la puerta, ¿le llegó información al control? ¿Qué lo muestra en el caso?",
      opciones: [
        {
          id: "quiere",
          texto: "Sí: la persona abrió la puerta porque quería revolver el arroz.",
        },
        {
          id: "nada",
          texto: "No: si nadie toca una tecla, al control no le llega nada.",
        },
        {
          id: "detuvo",
          texto:
            "Sí: dejó de calentar y de descontar justo al abrirse, sin que nadie tocara una tecla.",
        },
        {
          id: "iniciar",
          texto: "Sí: después, al tocar «Iniciar», volvió a calentar.",
        },
      ],
      respuesta: "detuvo",
      devoluciones: {
        quiere:
          "Para qué se abrió la puerta es algo que el control no tiene cómo registrar. ¿Qué cambió en el microondas en el instante en que se abrió?",
        nada:
          "En el caso, el microondas dejó de calentar y de descontar justo al abrirse la puerta, sin ninguna tecla. Si no le hubiera llegado nada al control, ¿por qué habría cambiado lo que hacía en ese instante?",
        iniciar:
          "Eso muestra que llegó la señal de «Iniciar», más tarde. ¿Qué pasó en el instante en que se abrió la puerta?",
      },
      explicacion:
        "El cambio de comportamiento justo en ese instante, sin ninguna tecla, es la evidencia: al control le llegó la información de que la puerta se abrió. En este modelo simple, el microondas detecta si la puerta está abierta o cerrada, y esa información llega al control. Es una entrada aunque nadie haya querido dar una orden: una entrada puede venir de una persona, de un sensor o de otro sistema. Para qué se abrió la puerta no le llega al control; le llega que se abrió.",
    },
    {
      id: "pausa",
      enunciado:
        "Si la puerta hubiera quedado abierta dos minutos en lugar de unos segundos, al cerrarla y tocar «Iniciar», ¿cuánto calentaría el microondas?",
      opciones: [
        {
          id: "cero",
          texto: "Nada: en dos minutos el tiempo restante habría llegado a 0:00.",
        },
        {
          id: "nueva",
          texto: "Una cuenta nueva: al cerrar la puerta, el tiempo vuelve a empezar.",
        },
        {
          id: "persona",
          texto: "Lo que la persona recuerde que faltaba.",
        },
        {
          id: "conserva",
          texto: "Los 25 segundos que faltaban: ese tiempo no cambia mientras la puerta está abierta.",
        },
      ],
      respuesta: "conserva",
      devoluciones: {
        cero: "Según el caso, al abrirse la puerta el microondas dejó de calentar y de descontar. ¿Qué le pasa entonces al tiempo restante mientras la puerta sigue abierta, sea un rato corto o largo?",
        nueva:
          "En el caso, después de cerrar y tocar «Iniciar», el microondas calentó los 25 segundos que faltaban, no una cuenta nueva. ¿Por qué cambiaría eso si la puerta estuviera abierta más tiempo?",
        persona:
          "Al volver a iniciar, la persona sólo cierra la puerta y toca «Iniciar». ¿Por dónde le llegaría al control lo que ella recuerda?",
      },
      explicacion:
        "Al abrirse la puerta, el control dejó de descontar: el tiempo restante quedó en 0:25 y se conserva mientras el microondas está detenido, dure lo que dure la pausa. Al recibir la señal de «Iniciar», el control usa ese dato para seguir con 25 segundos. Ésa es la función del estado: mantener la información de cómo está el sistema para que el programa pueda continuar. La señal de «Iniciar» no trae cuánto falta, y lo que recuerda la persona no le llega al control.",
    },
  ],
  ayudas: [
    {
      titulo: "Ayuda",
      parrafos: [
        "Para la primera: fijate qué cambió en el microondas en el instante en que se abrió la puerta, y qué no pasó en ese instante.",
        "Para la segunda: buscá en el caso qué hace el microondas con el tiempo restante mientras la puerta está abierta.",
      ],
      referencias: [
        {
          ...entradaProcesamientoSalida,
          donde: "debajo de «Entrada»: persona · sensor · otro sistema.",
        },
        {
          ...estadoDeUnSistema,
          donde:
            "la primera frase: el estado «permite que el programa continúe».",
        },
      ],
    },
  ],
};

export const unidades: readonly Unidad[] = [toque, puerta];

export const paraLlevarte: readonly string[] = [
  "Un sistema sólo puede actuar con la información que efectivamente recibe: qué tecla se tocó, si la puerta se abrió. Una persona puede comunicar lo que quiere mediante una señal adecuada; lo que no llega como información no interviene en lo que hace el sistema.",
  "Una operación usa o transforma información para obtener otra: el control sumó lo que indicaba la señal al tiempo que tenía en la cuenta. Ese resultado pasó a ser el nuevo valor de un dato del estado.",
  "El estado es la información que el sistema mantiene para saber cómo está y poder seguir. Una salida comunica un resultado o produce una acción; puede mostrar el mismo valor que un dato del estado, con otra función.",
];
