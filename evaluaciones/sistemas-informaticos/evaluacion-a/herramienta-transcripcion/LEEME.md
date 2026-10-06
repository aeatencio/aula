# Herramienta de transcripción · Evaluación A

Página local para pasar a digital, ítem por ítem, lo que cada estudiante
marcó en el papel de la [Evaluación A](../). Conserva la respuesta cruda de
cada ítem y muestra, como lectura derivada, la corrección y los resultados por
parte, el resultado global y los ejes. No calcula notas.

No forma parte del sitio Aula: no se publica ni se enlaza desde él.

## Abrir

Recomendado, con el servidor de desarrollo del repositorio (`npm run dev`):

```
http://localhost:4321/herramientas/transcripcion-evaluacion-a/
```

La home local muestra un enlace en «Herramientas locales». Esa ruta y ese
enlace existen sólo en `astro dev` (un plugin de Vite en `astro.config.mjs`
sirve este `index.html`): no se publican ni entran en `dist/`.

También se puede abrir `index.html` directamente con Chrome o Edge (desde WSL,
`\\wsl.localhost\<distribución>\…\herramienta-transcripcion\index.html`). No
necesita servidor, dependencias ni conexión.

**`file://` y `localhost` guardan por separado.** El navegador tiene un
`localStorage` distinto para cada origen: lo cargado abriendo el archivo no
aparece en `localhost` ni al revés, y no se migra solo. Para pasar datos de uno
a otro: «Descargar .tsv» en uno e «Importar TSV…» en el otro (ver
[Importación](#importación)).

## Datos y privacidad

- **Los nombres y las respuestas reales de estudiantes son privados.** Nunca
  se versionan: ni en este repositorio público, ni en pruebas, ni en
  documentación. Las pruebas usan sólo datos ficticios.
- **No hay backend ni transmisión de datos.** La página no carga recursos
  externos ni hace conexiones de red; todo ocurre en el navegador.
- **`localStorage` conserva los datos en ese navegador** (en su perfil) para
  no perderlos al recargar o cerrar la pestaña, hasta usar «Vaciar sesión».
  Usarla sólo en una computadora y un perfil propios.
- **El TSV exportado es privado.** Guardarlo fuera del repositorio; nunca
  copiarlo dentro de `aula/`.
- Mientras haya cambios sin exportar, cerrar o recargar la pestaña pide
  confirmación.
- Al terminar: exportar, guardar el archivo fuera del repositorio y vaciar la
  sesión.

## Cargar una evaluación

1. Curso / división (se conserva entre evaluaciones) → `Enter`.
2. Estudiante → `Enter`: el teclado pasa a la grilla.
3. Tipear las respuestas: cada letra carga el ítem actual y avanza.
4. Con los 30 cargados, `Enter` guarda y vuelve a «Estudiante».

| Tecla | Efecto |
|---|---|
| `A` `B` `C` `D` | Carga y avanza. En 1–8 (opciones A–C) una `D` pide repetirla para registrarla. |
| `-` | Casillero en blanco; avanza. |
| letra `+` letras `Enter` | Varias marcas en un casillero: `B` `+` `C` `Enter` → `B+C` en ese ítem y pasa al siguiente (`B` `+` `C` `+` `D` `Enter` → `B+C+D`). El `+` justo después de una letra sigue esa respuesta; en cualquier otro caso agrega letras al ítem actual (por ejemplo, tras ir a él con un número). En la composición, `Retroceso` quita la última letra y `Esc` deja todo como antes del `+`. |
| `?` | En un ítem sin cargar: ilegible. Sobre una letra cargada: la marca como dudosa (`B?`) o quita la marca. |
| número | Ir al ítem: `1` `8` salta al 18; `3` `Enter` (o `3` y una letra) va al 3. |
| flechas, `Inicio`, `Fin` | Moverse. `↑` `↓` mantienen la columna entre partes. |
| `Retroceso` / `Supr` | Borra la respuesta anterior (o la actual si tiene valor) / la actual. |
| `Espacio` | Se ignora: se pueden separar letras con espacios. |

Ayudas para detectar errores: ítem actual destacado y con su parte; cuenta de
cargados; grilla agrupada como en el papel (una fila por parte); celda «fin»
después del 30, donde una letra de más avisa que algo se corrió; colores para
blanco, múltiple, dudosa y fuera de opciones; aviso de duplicado
(mismo curso y estudiante); `Enter` con faltantes lleva al primero que falta.

Cada fila guardada tiene tres acciones:

- **Ver:** muestra esa evaluación completa en sólo lectura (respuestas,
  corrección, partes contabilizadas, resultados por parte, global y ejes). No
  modifica nada, no la abre para edición y no pide confirmaciones: se puede
  pasar a otra con «Ver», volver a la carga («Volver a la carga» o `Esc`) o
  pasar a «Editar esta evaluación». Lo que se estaba cargando queda intacto.
- **Editar:** reabre la transcripción en la grilla; `Enter` guarda en el mismo
  lugar, con sus resultados recalculados. Sólo se pide confirmación si se
  perderían cambios sin guardar (de esa edición o de una evaluación nueva a
  medio cargar).
- **Borrar.**

## Resultados por parte

Debajo de las respuestas de cada parte de una fila guardada:
`aciertos/total · porcentaje` y `resp. respondidas/total` (sobre 8, 8, 8 y 6).
Se derivan de las respuestas crudas cada vez que se muestran; no se exportan.

Criterios, según [`clave-docente.md`](../clave-docente.md):

| Valor | ¿Respondida? | ¿Acierto? |
|---|---|---|
| `-` (en blanco) | no | no |
| letra de la clave | sí | sí |
| otra letra, incluida una `D` en 1–8 | sí | no |
| varias letras (`B+C`) | sí | no, salvo `B+D` en el 18 |
| `?` (ilegible) | sí | no; se cuenta «a revisar» |
| dudosa (`B?`, `B+D?`) | sí | no, aunque coincida con la clave; se cuenta «a revisar» |

- Ítem 12: sólo `D`. Ítem 18: `B`, `D` o `B+D`.
- Porcentaje = aciertos ÷ ítems de la parte × 100, redondeado a entero.
- Con algo «a revisar», el número de aciertos es provisorio: la clave pide
  consultar antes de anular un ilegible. Se resuelve volviendo al papel y
  editando la transcripción.

### Resultado global y ejes

- **Partes contabilizadas:** cada evaluación registra qué partes cuentan para
  el global y los ejes (casilla «Contabilizar» en cada banda; por defecto, las
  cuatro). Desmarcar una parte no borra ni cambia sus respuestas, no impide
  cargarla y no oculta su resultado propio ni su corrección: sólo la saca de los
  resultados agregados. Se puede cambiar al cargar y al editar; es de cada fila.
- **Resultado global:** aciertos de los ítems de las partes contabilizadas ÷
  cantidad de esos ítems × 100, redondeado a entero. Denominadores: 1+2+3+4 →
  30; 1+2+3 → 24; 1+2 → 16; 1+3+4 → 22 (p. ej. `14/22 · 64 %`). Sin partes
  contabilizadas: «sin partes contabilizadas», sin porcentaje. No es el
  promedio de los porcentajes de las partes ni una nota: los resultados por
  parte siguen siendo el resultado principal (ver `clave-docente.md`).
- **Ejes:** tabla «Cobertura» de `analisis-de-items.md`, sólo con los ítems
  principales (sin los integrados entre paréntesis). Cada ítem queda en un único
  eje. Sólo entran sus ítems de partes contabilizadas: numerador = aciertos
  entre ellos, denominador = cuántos son (varía por estudiante). Se muestra
  `aciertos/ítems · %`; con denominador 0, «— sin ítems contabilizados». Un eje
  con ítems a revisar aparece subrayado en punteado; su detalle está en el
  título (mouse).

| Eje (`analisis-de-items.md`) | Rótulo en pantalla | Ítems | n |
|---|---|---|---|
| Hardware, software, programa | Hardware y software | 1, 2, 9 | 3 |
| Instrucciones, datos, operaciones, resultados | Instrucciones y datos | 3, 10, 11, 24 | 4 |
| Entrada, procesamiento y salida | Entrada y salida | 4, 5, 12, 21, 25 | 5 |
| CPU y memoria / Von Neumann | CPU y memoria | 6, 20, 30 | 3 |
| RAM, almacenamiento y recorrido | RAM y almacenamiento | 7, 13, 22 | 3 |
| Estado | Estado | 14, 17, 18, 26 | 4 |
| SO y administración de recursos | Sistema operativo | 8, 15, 23, 28, 29 | 5 |
| Representaciones y miradas | Representaciones | 16, 19, 27 | 3 |

Partes, global y ejes usan la misma regla por ítem. En las filas guardadas, el
global (recuadro) y los ejes van en una línea debajo de las partes, en columnas
alineadas con la cabecera.

**En vivo:** el resultado de cada parte aparece junto a su banda de la grilla
(a la derecha en ancho; debajo del rótulo o junto a él en anchos menores) y,
debajo de la grilla, «Resultados en vivo» muestra el global y los ejes de la
evaluación en curso (nueva o en edición). Todo se recalcula con cada tecla, sin
guardar. Cuenta como cargado todo ítem con un valor explícito (letra,
múltiple, `-`, `?` o dudosa). Cada parte muestra sus cifras en cuanto todos sus
ítems están cargados; si no, indica cuántos faltan («falta 1: 16», «faltan 4»,
«sin cargar»), sin porcentaje. Global y ejes aparecen cuando están cargados
todos los ítems de las partes contabilizadas (p. ej., si cuentan 1 y 2, al
completar el 16); activar una parte incompleta los vuelve a ocultar hasta
completarla. Guardar pide los 30 ítems con valor aunque alguna parte no se
contabilice (una parte no rendida se transcribe con `-`); es una limitación
conocida. La fila guardada se actualiza recién al guardar.

### Corrección visible

Como en la corrección en papel, el casillero muestra siempre lo que respondió
el estudiante y, afuera, en rojo, lo que acepta la clave. En la grilla aparece
a la derecha del casillero; en las filas guardadas, como superíndice. Es sólo
presentación: no cambia la respuesta cruda, el TSV ni los resultados.

| Respuesta | Corrección roja |
|---|---|
| correcta | ninguna |
| incorrecta, en blanco o varias letras incorrectas | la letra de la clave |
| ítem 18 incorrecto (incluido en blanco) | `B/D` (el título aclara: B, D o B+D) |
| `?` o dudosa (`B?`, `B+D?`) | ninguna: queda «a revisar» |

Una `D` en 1–8 se señala con borde u ondulado rojo (aviso de transcripción) y
lleva su corrección afuera, como cualquier incorrecta.

La clave está copiada en `index.html` (`ACEPTADAS`) y los ejes en `EJES`,
porque un archivo abierto desde el disco no puede leer otro archivo.
`tests/transcripcion-evaluacion-a.test.mjs` los compara con `clave-docente.md`
y `analisis-de-items.md` y falla si difieren: si cambia alguno de esos
documentos, actualizar también `index.html`.

## Valores de cada ítem

| Valor | Significa |
|---|---|
| `A` … `D` | La letra escrita en el casillero. |
| `-` | Casillero en blanco. |
| `B+D` | Varias letras, en orden alfabético, unidas por `+`. |
| `?` | Ilegible: hay que volver al papel. |
| `B?` / `B+D?` | Lectura dudosa: lo más probable es eso, pero conviene revisar. |

No hay valor para «no cargado»: no se puede guardar una evaluación incompleta.
Una `D` en 1–8 se conserva tal cual (con borde rojo de aviso) porque es lo que
dice el papel; no se reinterpreta.

## Exportación

TSV (separado por tabulaciones), UTF-8 sin BOM, fin de línea `\n`, una fila
por evaluación y encabezado:

```
evaluacion	curso	estudiante	i01	i02	…	i30	parte1_cuenta	parte2_cuenta	parte3_cuenta	parte4_cuenta
SI-A	3.º A	Nombre Ficticio	B	A	C	…	A	1	1	1	0
```

- `evaluacion` vale siempre `SI-A`, para no mezclar archivos al pegar.
- `curso` y `estudiante` se guardan como se escribieron, sin tabulaciones ni
  saltos de línea (se reemplazan por un espacio) y sin espacios en los extremos.
- `i01`…`i30` siguen la tabla de valores anterior.
- `parte1_cuenta`…`parte4_cuenta`: `1` si la parte se contabiliza en el global
  y los ejes de ese estudiante, `0` si no. Con estas columnas y la clave se
  reconstruyen todos los resultados.

Son 37 columnas. Versiones anteriores de la herramienta exportaban 33, sin las
cuatro últimas: `i01`…`i30` ocupan las mismas posiciones (columnas 4–33) y una
exportación así equivale a las cuatro partes contabilizadas.

«Copiar TSV» deja el texto en el portapapeles para pegarlo en la celda A1 de
una planilla: Sheets y Excel separan las columnas sin diálogo de importación.
«Descargar .tsv» guarda `respuestas-si-a-AAAA-MM-DD.tsv` en Descargas.

Se eligió TSV y no CSV porque al pegar se separa sola en columnas, porque un
Excel en español espera `;` en los CSV y porque los nombres con comas no
necesitan comillas.

## Importación

**Dónde:** botón «Importar TSV…», en la sección «Evaluaciones guardadas en esta
sesión», entre «Descargar .tsv» y «Vaciar sesión». Abre el selector de archivos
del sistema; el archivo se lee en el navegador y no se envía a ningún lado.

**Qué acepta:** el mismo TSV que exporta la herramienta, de 37 columnas
(`evaluacion`, `curso`, `estudiante`, `i01`–`i30`, `parte1_cuenta`–`parte4_cuenta`).
Se valida todo antes de cambiar nada:

- el encabezado debe ser exactamente ese, en ese orden;
- cada fila debe tener 37 columnas, `evaluacion` = `SI-A` y un estudiante;
- cada `i01`–`i30` debe ser un valor que la herramienta registra, tal cual: `A`–`D`,
  varias letras en orden alfabético sin repetir (`A+B`, `B+C+D`), `-`, `?` o con
  `?` final (`B?`, `B+D?`). Las respuestas no se recalculan ni se transforman:
  `B+A`, por ejemplo, se rechaza en lugar de reordenarse;
- `parte1_cuenta`–`parte4_cuenta` deben ser `1` (se contabiliza) o `0` (no).

Se toleran el final de línea `\r\n` y una marca BOM inicial, que suelen agregar
las planillas al volver a guardar. `curso` y `estudiante` se limpian igual que al
cargar (sin espacios en los extremos).

**Todo o nada:** si algo no cumple, no se importa ninguna fila y el aviso indica
cada problema con su número de línea (por ejemplo, «Línea 3: i12 es «E»…»).

**Qué ocurre al importar:** las evaluaciones del archivo **reemplazan** a las
guardadas en esta sesión. Si ya hay alguna, primero se pide confirmación (con
aviso si tienen cambios sin exportar); «Cancelar» no cambia nada. La evaluación
que se está cargando no se toca. Durante una edición no se puede importar
(primero guardarla o descartarla). Las filas importadas aparecen enseguida en la
tabla y se pueden ver y editar; si el archivo coincide exactamente con lo que la
herramienta exportaría, quedan como «sin cambios desde la última exportación».

**Para restaurar o pasar de `file://` a `localhost`:** «Descargar .tsv» donde
están los datos, abrir la herramienta en el otro origen e «Importar TSV…» con ese
archivo. El `.tsv` es privado: guardarlo fuera del repositorio.

## Compatibilidad

Datos guardados en `localStorage` por versiones anteriores (sin la
configuración de partes) se abren con las cuatro partes contabilizadas. La
clave de almacenamiento (`aula-transcripcion-si-a-v1`) es la misma que usaba el
prototipo.

## Pruebas (sólo datos ficticios)

`npm test` incluye `tests/transcripcion-evaluacion-a.test.mjs`, que carga
`index.html` en jsdom y lo maneja con el teclado: carga y autoavance, `B+C
Enter`, blanco, ilegible, dudosa, D fuera de opciones, correcciones, edición,
corrección roja, resultados por parte (también parciales), global con
denominadores 30, 24, 22, 16, 6 y sin partes, ejes con denominadores variables,
configuración independiente por evaluación, resultados en vivo, recarga, datos
del formato anterior, TSV de 37 columnas, Ver en sólo lectura (sin cambios ni
advertencias) frente a Editar, importación (ida y vuelta exacta con partes
`1110`, `1011` y `0001`, confirmación al reemplazar, archivos inválidos sin
importación parcial, `\r\n` y BOM) y coincidencia de la clave y los ejes con
sus documentos.

`pruebas-navegador/` repite el flujo y el layout en Chrome real (WSL con Chrome
y Node.js de Windows, como `fuente/generar-pdf.mjs`):

```
./pruebas-navegador/correr.sh flujo.mjs
./pruebas-navegador/correr.sh layout.mjs despues 1650,1100,820,700,600,480
```

`flujo.mjs` usa teclas y clics nativos (incluidas la descarga del `.tsv`, Ver
/ Editar y la importación de un `.tsv` con partes `1011` y de uno inválido). Con `URL_HERRAMIENTA=http://localhost:4321/herramientas/transcripcion-evaluacion-a/`
prueba la ruta de `npm run dev` en lugar del archivo.
`layout.mjs` comprueba, en cada ancho, que no haya desborde horizontal, que
nada sobresalga de su columna, que las correcciones y los resultados de cada
parte no pisen casilleros, y que las respuestas queden alineadas con la
cabecera. Perfil del navegador, descargas y capturas quedan en
`tmp/transcripcion-evaluacion-a-navegador/`, fuera de Git.
