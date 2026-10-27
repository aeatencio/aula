/*
  Tercer tramo de Pensamiento Computacional: repetición. La página conduce la
  clase entre Pilas Bloques, la hoja del folio y el papelito; la hoja y los
  papelitos se publican para imprimirlos o volver a consultarlos.

  La guía docente (/repetir/guia/) no figura en esta lista a propósito:
  contiene la clave, y la lista aparece al pie de las páginas de estudiantes.
  Sigue pública y se enlaza desde «Para docentes» en la portada.
*/

import type { MaterialSerie, Serie } from "./serie";

export const serieRepetir = {
  titulo: "Repetir",
  href: "/repetir/",
  categoria: "Pensamiento Computacional",
  materiales: [
    {
      href: "/repetir/",
      title: "Repetir",
      tipo: "Actividad",
      para: "en computadora: la página conduce, Pilas Bloques ejecuta",
    },
    {
      href: "/repetir/hoja/",
      title: "Cómo leer un «Repetir» y cierre",
      tipo: "Para imprimir",
      para: "la hoja del folio, A4 doble faz",
    },
    {
      href: "/repetir/papelitos/",
      title: "Papelitos",
      tipo: "Para imprimir",
      para: "respuestas de los desafíos y del cierre, cuatro por A4",
    },
  ] satisfies MaterialSerie[],
  pizarrones: [
    {
      href: "/pizarrones/seguir-un-programa-paso-a-paso/",
      title: "Seguir un programa paso a paso",
    },
    {
      href: "/cuando-importa-el-orden/",
      title: "Cuándo importa el orden",
    },
    {
      href: "/pizarrones/la-maquina-obedece-exactamente/",
      title: "La máquina obedece exactamente",
    },
  ],
} satisfies Serie;
