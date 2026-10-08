# Evaluación B · Sistemas Informáticos

Instrumento individual, escrito, a libro cerrado y de opción múltiple sobre Sistemas Informáticos. Es una versión paralela de la [Evaluación A](../evaluacion-a/): comparable en estructura, ejes y exigencia, con casos y formulaciones nuevas. Sus contenidos corresponden al [recorrido de estudio](../../../src/data/recorridos.ts) con el que se diseñó.

Uso registrado: se preparó como recuperatorio de la Evaluación A para 3.º año de la escuela Gabriela Mistral, para tomarse el 06/10/2026; el recorrido de referencia fue el que siguió ese curso (Gabriela Mistral · 3.º año · 3.er bimestre 2026).

Tiene 30 ítems en cuatro partes —Reconocer (1–8), Relacionar (9–16), Interpretar (17–24) y Usar lo que sabés (25–30)—, una por cara. Los resultados se registran por parte (sobre 8, 8, 8 y 6): son el resultado principal. Como síntesis puede mostrarse un resultado global con las partes que se contabilicen, que no reemplaza las partes ni es una nota (criterio completo en `clave-docente.md`).

## Archivos

| Archivo | Uso |
|---|---|
| `evaluacion-oficio-216x356.pdf` y `evaluacion-oficio-216x340.pdf` | Variantes listas para imprimir, con el mismo contenido. |
| `clave-docente.md` | Clave y criterio de corrección. |
| `analisis-de-items.md` | Qué mide cada ítem, distractores, cobertura comparada con la Evaluación A y alcances del modelo. |
| `fuente/evaluacion.html` | Fuente HTML del instrumento. |
| `fuente/generar-pdf.mjs` | Genera ambas variantes desde el HTML y mide el espacio de cada cara. |

## Imprimir

Elegir el PDF que corresponda al papel oficio disponible (216 × 356 o 216 × 340 mm). Imprimir al 100 %, doble faz, con giro por el borde largo; abrochar las dos hojas. La clave docente se usa por separado.

## Regenerar o adaptar

Desde esta carpeta, ejecutar `node fuente/generar-pdf.mjs`. El script requiere Node.js 22 o superior, WSL, Chrome o Edge de Windows y la fuente Segoe UI. Sobrescribe los dos PDF de esta carpeta, informa el espacio libre de cada cara y falla si alguna desborda.

Al cambiar un ítem, actualizar la clave y el análisis.
