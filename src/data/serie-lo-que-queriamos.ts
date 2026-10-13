/*
  Primeros materiales de Pensamiento Computacional: una hoja para resolver en
  papel y una práctica para la pantalla, con el mismo objetivo y actividades
  distintas. Trabajan el pizarrón «La máquina obedece exactamente», que
  funciona como portada: no hay una lectura introductoria aparte.

  La guía docente (/lo-que-queriamos-y-lo-que-paso/guia/) no figura en esta
  lista a propósito: contiene la clave, y la lista aparece al pie de la hoja y
  de la práctica en pantalla. Sigue pública y se enlaza desde «Para docentes»
  en la portada.
*/

import type { MaterialSerie, Serie } from "./serie";

export const serieLoQueQueriamos = {
  titulo: "La máquina obedece exactamente",
  href: "/pizarrones/la-maquina-obedece-exactamente/",
  categoria: "Pensamiento Computacional",
  materiales: [
    {
      href: "/pizarrones/la-maquina-obedece-exactamente/",
      title: "La máquina obedece exactamente",
      tipo: "Pizarrón",
      para: "para proyectar o copiar antes de la hoja",
    },
    {
      href: "/lo-que-queriamos-y-lo-que-paso/",
      title: "Lo que queríamos y lo que pasó",
      tipo: "Actividad",
      para: "para resolver en papel; en pantalla se puede revisar",
    },
    {
      href: "/lo-que-queriamos-y-lo-que-paso/probar/",
      title: "Probar y ajustar el programa",
      tipo: "Práctica",
      para: "para predecir, ejecutar y ajustar en pantalla",
    },
  ] satisfies MaterialSerie[],
  pizarrones: [
    {
      href: "/pizarrones/instrucciones-datos-operaciones-y-resultados/",
      title: "Instrucciones, datos, operaciones y resultados",
    },
    {
      href: "/practicar-sistemas-informaticos/",
      title: "Qué llega, qué hace, qué conserva y qué comunica",
    },
  ],
} satisfies Serie;
