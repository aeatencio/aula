/*
  Forma compartida de una práctica de opciones: unidades con un caso, una
  consigna, decisiones y ayudas. No pertenece a ningún material: cada práctica
  declara sus propias unidades con estos tipos.
*/

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
