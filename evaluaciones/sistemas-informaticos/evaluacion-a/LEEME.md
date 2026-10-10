# Evaluación A · Sistemas Informáticos

Instrumento individual, escrito, a libro cerrado y de opción múltiple sobre Sistemas Informáticos. La fuente del examen y los PDF quedan congelados. La [Evaluación B](../evaluacion-b/) es una versión paralela, comparable en estructura, ejes y exigencia.

Tiene 30 ítems en cuatro partes —Reconocer (1–8), Relacionar (9–16), Interpretar (17–24) y Usar lo que sabés (25–30)—, una por cara. Los resultados se registran por parte (sobre 8, 8, 8 y 6).

## Archivos

| Archivo | Uso |
|---|---|
| `evaluacion-oficio-216x356.pdf` y `evaluacion-oficio-216x340.pdf` | Variantes listas para imprimir, con el mismo contenido. |
| `clave-docente.md` | Clave y criterio de corrección. |
| `analisis-de-items.md` | Qué mide cada ítem, distractores, cobertura y hallazgos para futuras evaluaciones. |
| `herramienta/` | Corrección y análisis: página local para cargar las respuestas en papel, corregirlas y ver resultados y devolución pedagógica. |
| `fuente/evaluacion.html` | Fuente HTML del instrumento. |
| `fuente/generar-pdf.mjs` | Genera ambas variantes desde el HTML. |

## Imprimir

Elegir el PDF que corresponda al papel oficio disponible (216 × 356 o 216 × 340 mm). Imprimir al 100 %, doble faz, con giro por el borde largo; abrochar las dos hojas. La clave docente se usa por separado.

## Corrección y análisis

[`herramienta/index.html`](herramienta/) se abre en `http://localhost:4321/herramientas/evaluacion-a/` con `npm run dev` (sólo en desarrollo; no se publica) o directamente en Chrome o Edge, sin servidor ni conexión. Permite cargar con el teclado lo que cada estudiante marcó, ítem por ítem, conservando la respuesta cruda; muestra la corrección y los resultados por parte, un resultado global y ejes sólo con las partes que se contabilicen, propone una devolución breve (para escribir a mano) y otra extendida, y exporta e importa un TSV. En «Ver» integra el cierre A+B con la [Evaluación B](../evaluacion-b/): mejor resultado por parte, partes que el docente elige y categoría de cierre, o cierre manual. El uso detallado está en su [LEEME](herramienta/LEEME.md).

Los nombres y respuestas reales son privados y nunca se versionan. La herramienta no tiene backend ni transmite datos: lo cargado queda en el `localStorage` de ese navegador hasta vaciar la sesión (por separado en `file://` y en `localhost`; se pasa de uno a otro exportando e importando el TSV), y el TSV exportado debe tratarse como privado y guardarse fuera del repositorio.

## Regenerar o adaptar

Desde esta carpeta, ejecutar `node fuente/generar-pdf.mjs`. El script requiere Node.js 22 o superior, WSL, Chrome o Edge de Windows y la fuente Segoe UI. Escribe en `fuente/regenerado/` sin sobrescribir los PDF conservados; revisar sus mediciones de espacio antes de imprimir.

Para adaptar el examen, trabajar sobre una copia de `fuente/evaluacion.html` y actualizar la clave y el análisis correspondientes.
