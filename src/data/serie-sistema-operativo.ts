/*
  Familia de estudio y práctica sobre el sistema operativo. Reúne documentos,
  una actividad web y pizarrones relacionados sin convertir sus formatos en una
  taxonomía general de Aula.
*/

import type { MaterialSerie, Serie } from "./serie";

export const serieSistemaOperativo = {
  titulo: "El sistema operativo",
  href: "/sistema-operativo/",
  categoria: "Sistemas Informáticos",
  materiales: [
    {
      href: "/sistema-operativo/",
      title: "Estudiar y practicar el sistema operativo",
      tipo: "Recursos de estudio",
      para: "para elegir cómo repasar o practicar",
    },
    {
      href: "/materiales/sistema-operativo/el-sistema-operativo-ficha.pdf",
      title: "El sistema operativo · Ficha de dos caras",
      tipo: "Síntesis",
      para: "para repasar ideas y relaciones de un vistazo",
    },
    {
      href: "/materiales/sistema-operativo/el-sistema-operativo-guia-de-trabajo.pdf",
      title: "El sistema operativo · Guía de trabajo",
      tipo: "Guía de estudio",
      para: "para estudiar paso a paso y comprobar respuestas",
    },
    {
      href: "/materiales/sistema-operativo/el-sistema-operativo-actividades.pdf",
      title: "El sistema operativo · Actividades",
      tipo: "Práctica escrita",
      para: "para integrar lo estudiado en 21 consignas",
    },
    {
      href: "/cuando-se-abre-un-programa/",
      title: "Cuando se abre un programa",
      tipo: "Práctica interactiva",
      para: "para reconstruir el recorrido en pantalla",
    },
  ] satisfies MaterialSerie[],
  pizarrones: [
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
      href: "/pizarrones/tres-miradas-sobre-una-situacion/",
      title: "Tres miradas sobre una misma situación",
    },
  ],
} satisfies Serie;
