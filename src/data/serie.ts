/*
  Forma compartida de una serie concreta de materiales.
  No es un índice general de formatos: cada serie declara la suya.
*/

export type MaterialSerie = {
  href: string;
  title: string;
  tipo: string;
  para: string;
};

export type Serie = {
  titulo: string;
  href: string;
  categoria: string;
  materiales: MaterialSerie[];
  pizarrones: { href: string; title: string }[];
};
