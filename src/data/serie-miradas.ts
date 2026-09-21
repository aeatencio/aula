/*
  «Un sistema, distintas miradas» reúne materiales de tipos diferentes que se
  usan juntos. Esta es la relación entre ellos, en un solo lugar, para que cada
  página pueda mostrar el resto de la serie sin repetir la lista.

  No es una taxonomía de formatos ni un índice general de Aula: describe una
  serie concreta.
*/

import type { MaterialSerie, Serie } from "./serie";

export const serieMiradas = {
  titulo: "Un sistema, distintas miradas",
  href: "/un-sistema-distintas-miradas/",
  categoria: "Sistemas Informáticos",
  materiales: [
    {
      href: "/pizarrones/tres-miradas-sobre-una-situacion/",
      title: "Tres miradas sobre una misma situación",
      tipo: "Pizarrón",
      para: "para proyectar y mirar juntos",
    },
    {
      href: "/un-sistema-distintas-miradas/",
      title: "Un sistema, distintas miradas",
      tipo: "Lectura",
      para: "para leer después de la clase",
    },
    {
      href: "/un-sistema-distintas-miradas/actividad/",
      title: "Elegir la mirada",
      tipo: "Actividad",
      para: "para trabajar y para imprimir",
    },
    {
      href: "/un-sistema-distintas-miradas/guia/",
      title: "Guía para la clase",
      tipo: "Guía docente",
      para: "para preparar y conducir la clase",
    },
  ] satisfies MaterialSerie[],
  pizarrones: [
    {
      href: "/pizarrones/entrada-procesamiento-y-salida/",
      title: "Entrada, procesamiento y salida",
    },
    {
      href: "/pizarrones/el-estado-de-un-sistema/",
      title: "El estado de un sistema",
    },
    {
      href: "/pizarrones/instrucciones-datos-operaciones-y-resultados/",
      title: "Instrucciones, datos, operaciones y resultados",
    },
  ],
} satisfies Serie;
