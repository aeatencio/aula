export type MaterialRef = {
  href: string;
  title: string;
  tipo?: string;
};

export type Recorrido = {
  id: string;
  nombre: string;
  href: string;
  materiales: MaterialRef[];
};

export type VecinoRecorrido = {
  href: string;
  title: string;
};

export type NavegacionRecorrido = {
  id: string;
  nombre: string;
  href: string;
  paso: number;
  total: number;
  anterior?: VecinoRecorrido;
  siguiente?: VecinoRecorrido;
};

export const recorridos: Recorrido[] = [
  {
    id: "gm-2026-2",
    nombre: "Gabriela Mistral · 3.º año · 3.er bimestre 2026",
    href: "/escuelas/gabriela-mistral/2-cuatrimestre-2026/",
    materiales: [
      {
        href: "/pizarrones/preguntas-y-conceptos-principales/",
        title: "Preguntas y conceptos principales",
      },
      {
        href: "/pizarrones/hardware-software-y-tarea/",
        title: "Sistemas digitales: hardware y software",
      },
      {
        href: "/pizarrones/instrucciones-datos-operaciones-y-resultados/",
        title: "Instrucciones, datos, operaciones y resultados",
      },
      {
        href: "/pizarrones/entrada-procesamiento-y-salida/",
        title: "Entrada, procesamiento y salida",
      },
      {
        href: "/pizarrones/procesador-y-memoria-durante-la-ejecucion/",
        title: "Procesador y memoria durante la ejecución",
      },
      {
        href: "/pizarrones/el-estado-de-un-sistema/",
        title: "El estado de un sistema",
      },
      {
        href: "/pizarrones/arquitectura-de-von-neumann/",
        title: "Arquitectura de Von Neumann",
      },
      {
        href: "/pizarrones/el-sistema-operativo/",
        title: "El sistema operativo",
      },
      {
        href: "/sistema-operativo/",
        title: "Estudiar y practicar el sistema operativo",
        tipo: "Recursos",
      },
      {
        href: "/pizarrones/tres-miradas-sobre-una-situacion/",
        title: "Tres miradas sobre una misma situación",
      },
    ],
  },
  {
    id: "cfp7-si-2026",
    nombre: "Sistemas Informáticos · CFP 7 · 2026",
    href: "/escuelas/cfp-7/sistemas-informaticos-2026/",
    materiales: [
      {
        href: "/pizarrones/hardware-software-y-tarea/",
        title: "Sistemas digitales: hardware y software",
      },
      {
        href: "/pizarrones/entrada-procesamiento-y-salida/",
        title: "Entrada, procesamiento y salida",
      },
      {
        href: "/pizarrones/arquitectura-de-von-neumann/",
        title: "Arquitectura de Von Neumann",
      },
      {
        href: "/pizarrones/el-sistema-operativo/",
        title: "El sistema operativo",
      },
      {
        href: "/sistema-operativo/",
        title: "Estudiar y practicar el sistema operativo",
        tipo: "Recursos",
      },
    ],
  },
];

export function hrefConRecorrido(href: string, recorridoId: string): string {
  return `${href}?recorrido=${encodeURIComponent(recorridoId)}`;
}

export function requireRecorrido(id: string): Recorrido {
  const recorrido = recorridos.find((item) => item.id === id);
  if (!recorrido) {
    throw new Error(`Recorrido no encontrado: ${id}`);
  }
  return recorrido;
}

export function navegacionesParaMaterial(
  pathname: string,
): NavegacionRecorrido[] {
  const actual = normalizarPathname(pathname);

  return recorridos.flatMap((recorrido) => {
    const indice = recorrido.materiales.findIndex(
      (material) => normalizarPathname(material.href) === actual,
    );
    if (indice === -1) {
      return [];
    }

    const total = recorrido.materiales.length;
    const anterior = recorrido.materiales[indice - 1];
    const siguiente = recorrido.materiales[indice + 1];

    return [
      {
        id: recorrido.id,
        nombre: recorrido.nombre,
        href: recorrido.href,
        paso: indice + 1,
        total,
        anterior: anterior
          ? {
              href: hrefConRecorrido(anterior.href, recorrido.id),
              title: anterior.title,
            }
          : undefined,
        siguiente: siguiente
          ? {
              href: hrefConRecorrido(siguiente.href, recorrido.id),
              title: siguiente.title,
            }
          : undefined,
      },
    ];
  });
}

function normalizarPathname(pathname: string): string {
  const sinQuery = pathname.split("?")[0] ?? pathname;
  return sinQuery.endsWith("/") ? sinQuery : `${sinQuery}/`;
}
