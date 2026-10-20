/*
  Segundo tramo de Pensamiento Computacional: secuencia y orden. El pizarrón
  «Seguir un programa paso a paso» presenta la tabla de seguimiento; la hoja la
  pone en manos de cada estudiante, con el mismo ejemplo resuelto. Un solo
  contexto, un juego que guarda puntos, para toda la clase.

  La guía docente (/cuando-importa-el-orden/guia/) no figura en esta lista a
  propósito: contiene la clave de la hoja y del papelito de cierre, y la lista
  aparece al pie de la hoja. Sigue pública y se enlaza desde «Para docentes» en la
  portada.
*/

import type { MaterialSerie, Serie } from "./serie";

export const serieCuandoImportaElOrden = {
  titulo: "Seguir un programa paso a paso",
  href: "/pizarrones/seguir-un-programa-paso-a-paso/",
  categoria: "Pensamiento Computacional",
  materiales: [
    {
      href: "/pizarrones/seguir-un-programa-paso-a-paso/",
      title: "Seguir un programa paso a paso",
      tipo: "Pizarrón",
      para: "para seguir la ejecución y comparar dos órdenes",
    },
    {
      href: "/cuando-importa-el-orden/",
      title: "Cuándo importa el orden",
      tipo: "Actividad",
      para: "para leer en un folio y resolver en la carpeta",
    },
  ] satisfies MaterialSerie[],
  pizarrones: [
    {
      href: "/pizarrones/la-maquina-obedece-exactamente/",
      title: "La máquina obedece exactamente",
    },
    {
      href: "/lo-que-queriamos-y-lo-que-paso/",
      title: "Lo que queríamos y lo que pasó",
    },
    {
      href: "/pizarrones/procesador-y-memoria-durante-la-ejecucion/",
      title: "Procesador y memoria durante la ejecución",
    },
    {
      href: "/pizarrones/el-estado-de-un-sistema/",
      title: "El estado de un sistema",
    },
  ],
} satisfies Serie;
