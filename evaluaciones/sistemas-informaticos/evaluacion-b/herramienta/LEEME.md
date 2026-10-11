# Corrección y análisis · Evaluación B

Carga de respuestas, resultados y devolución pedagógica.

Página local para pasar a digital, ítem por ítem, lo que cada estudiante
marcó en el papel de la [Evaluación B](../). Conserva la respuesta cruda de
cada ítem y muestra, como lectura derivada, la corrección y los resultados por
parte, el resultado global, los ejes y una devolución breve y otra extendida.
No calcula notas.

No forma parte del sitio Aula: no se publica ni se enlaza desde él.

Funciona igual que la [herramienta de la Evaluación A](../../evaluacion-a/herramienta/):
el uso, los valores de cada ítem, los resultados, la devolución, el formato TSV
y la importación están descritos en su
[LEEME](../../evaluacion-a/herramienta/LEEME.md). Aquí, sólo lo propio de B.

## Abrir

Con `npm run dev`:

```
http://localhost:4321/herramientas/evaluacion-b/
```

La home local la enlaza en «Herramientas locales»; la ruta existe sólo en
`astro dev` y no entra en `dist/`. También se puede abrir `index.html`
directamente con Chrome o Edge, sin servidor ni conexión. `file://` y
`localhost` guardan por separado; se pasa de uno a otro exportando e
importando el TSV.

## Datos y privacidad

Los nombres y las respuestas reales son privados y nunca se versionan. Lo
cargado queda sólo en el `localStorage` de ese navegador, bajo la clave
`aula-evaluacion-b-v1`, separada de la de la Evaluación A
(`aula-evaluacion-a-v1`). El `.tsv` exportado (`respuestas-si-b-AAAA-MM-DD.tsv`)
es privado: guardarlo fuera del repositorio.

## Lo propio de la Evaluación B

- **Clave:** la de `clave-docente.md`, con una sola respuesta aceptada por ítem
  (no hay particularidades como las de los ítems 12 y 18 de la A). Varias letras
  nunca suman.
- **TSV:** el mismo esquema de 37 columnas, con `evaluacion` = `SI-B`. Un TSV
  de la Evaluación A (`SI-A`) se rechaza sin importar nada.
- **Ejes:** columna de la Evaluación B en la tabla «Cobertura» de
  `analisis-de-items.md`, sólo con los ítems principales. El 28 es principal en
  dos ejes y cuenta en los dos: un error en el 28 descuenta en «RAM y
  almacenamiento» y en «Sistema operativo».

| Eje (`analisis-de-items.md`) | Rótulo en pantalla | Ítems | n |
|---|---|---|---|
| Hardware, software, programa | Hardware y software | 1, 2, 9 | 3 |
| Instrucciones, datos, operaciones, resultados | Datos y operaciones | 3, 10, 11, 24 | 4 |
| Entrada, procesamiento y salida | Entrada y salida | 4, 5, 12, 21, 25 | 5 |
| CPU y memoria / Von Neumann | CPU y memoria | 6, 20 | 2 |
| RAM, almacenamiento y recorrido | RAM y almacenamiento | 7, 13, 22, 28 | 4 |
| Estado | Estado | 14, 17, 18, 26, 27 | 5 |
| SO y administración de recursos | Sistema operativo | 8, 15, 28, 29, 30 | 5 |
| Representaciones y miradas | Representaciones | 16, 19, 23 | 3 |

Con la regla de la devolución, «CPU y memoria» (dos ítems) llega como mucho a
«repasar». Las ideas de la devolución extendida salen de «Qué mide» en el
`analisis-de-items.md` de la B; la del 28 aparece en los dos ejes cuando ambos
quedan señalados.

## Cierre A+B

Para cerrar un curso, la pantalla «Cierre A+B»
(`/herramientas/cierre-evaluaciones/` con `npm run dev`, o «Ir a Cierre A+B →»)
lista a cada estudiante con su categoría (la sugerida por la evidencia, salvo que
el docente elija otra) y su estado, y permite intervenir sólo en las excepciones; ver el [LEEME de la A](../../evaluacion-a/herramienta/LEEME.md#cierre-ab).


En **Ver**, el panel «Cierre A+B» muestra por parte el resultado en A y en B, la
mejor evidencia y qué partes cuentan para el cierre (o el modo manual, con
categoría y devolución del docente), la evidencia por contenidos de A y B
acumulados y una orientación para seguir trabajando acorde a la categoría
(«Cierre del curso: imprimir o exportar…» las reúne para todo el curso, con la
clave de A y B en cada una, y exporta datos anonimizados para análisis); en la tabla, cada fila guardada tiene su
línea «Cierre: …». Lee en sólo lectura los registros de la Evaluación A del mismo
navegador y origen, y guarda sólo las decisiones docentes en
`aula-evaluacion-cierre-v1`, incluidos los vínculos manuales A ↔ B para nombres
que no coinciden («Consolidar manualmente con: … Vincular»). Reglas, umbrales (Suficiente desde el 55 %,
Avanzado sólo con las cuatro partes y 24/30, y en ambos casos el requisito de la
Parte 1: 9/16 sumando A y B, o 6/8 con un solo intento) y emparejamiento:
[Cierre A+B](../../evaluacion-a/herramienta/LEEME.md#cierre-ab) en el LEEME de la A.

## Configuración y pruebas

Todo lo propio de B está en el bloque `// <CONFIG>` … `// </CONFIG>` de
`index.html`. Fuera de ese bloque, el archivo es idéntico al de la Evaluación A:
`tests/herramienta-evaluacion-b.test.mjs` lo exige mientras sean copias (un
control temporal de la duplicación), y además compara la clave y los ejes con
`clave-docente.md` y `analisis-de-items.md`, comprueba las ideas, un recorrido
de carga con teclado, guardado, TSV `SI-B`, rechazo de un TSV `SI-A` y la
devolución con el 28 en dos ejes. Usa sólo datos ficticios.
