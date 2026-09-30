# Evaluación del 3.er bimestre 2026 · Gabriela Mistral · 3.º año

Instrumento individual, escrito, a libro cerrado y de opción múltiple sobre Sistemas Informáticos. Se usó el 29/09/2026 y se conserva como instrumento histórico: la fuente del examen y los PDF quedan congelados.

Tiene 30 ítems en cuatro partes —Reconocer (1–8), Relacionar (9–16), Interpretar (17–24) y Usar lo que sabés (25–30)—, una por cara. Los resultados se registran por parte (sobre 8, 8, 8 y 6).

## Archivos

| Archivo | Uso |
|---|---|
| `evaluacion-oficio-216x356.pdf` y `evaluacion-oficio-216x340.pdf` | Variantes listas para imprimir, con el mismo contenido. |
| `clave-docente.md` | Clave y criterio de corrección. |
| `analisis-de-items.md` | Qué mide cada ítem, distractores, cobertura y hallazgos para futuras evaluaciones. |
| `fuente/evaluacion.html` | Fuente HTML del instrumento. |
| `fuente/generar-pdf.mjs` | Genera ambas variantes desde el HTML. |

## Imprimir

Elegir el PDF que corresponda al papel oficio disponible (216 × 356 o 216 × 340 mm). Imprimir al 100 %, doble faz, con giro por el borde largo; abrochar las dos hojas. La clave docente se usa por separado.

## Regenerar o adaptar

Desde esta carpeta, ejecutar `node fuente/generar-pdf.mjs`. El script requiere Node.js 22 o superior, WSL, Chrome o Edge de Windows y la fuente Segoe UI. Escribe en `fuente/regenerado/` sin sobrescribir los PDF conservados; revisar sus mediciones de espacio antes de imprimir.

Para adaptar el examen, trabajar sobre una copia de `fuente/evaluacion.html` y actualizar la clave y el análisis correspondientes.
