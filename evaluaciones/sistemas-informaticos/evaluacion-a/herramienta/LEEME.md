# Corrección y análisis · Evaluación A

Carga de respuestas, resultados y devolución pedagógica.

Página local para pasar a digital, ítem por ítem, lo que cada estudiante
marcó en el papel de la [Evaluación A](../). Conserva la respuesta cruda de
cada ítem y muestra, como lectura derivada, la corrección y los resultados por
parte, el resultado global y los ejes. No calcula notas.

No forma parte del sitio Aula: no se publica ni se enlaza desde él.

## Abrir

Recomendado, con el servidor de desarrollo del repositorio (`npm run dev`):

```
http://localhost:4321/herramientas/evaluacion-a/
```

La home local muestra un enlace en «Herramientas locales». Esa ruta y ese
enlace existen sólo en `astro dev` (un plugin de Vite en `astro.config.mjs`
sirve este `index.html`): no se publican ni entran en `dist/`.

También se puede abrir `index.html` directamente con Chrome o Edge (desde WSL,
`\\wsl.localhost\<distribución>\…\evaluacion-a\herramienta\index.html`). No
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
4. Con los ítems de las partes que se contabilizan cargados, `Enter` guarda y
   vuelve a «Estudiante».

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
  pasar a otra con «Ver», volver a la carga («Volver a la carga» o `Esc`, que
  funciona esté donde esté el foco) o
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
  `aciertos/ítems`, **sin porcentaje**: con 3 a 5 ítems por eje, un porcentaje
  aparenta una precisión que no hay (un ítem lo mueve 20 a 33 puntos). Con 1 o 2
  ítems contabilizados se agrega «pocos ítems»; con 0, «— sin ítems
  contabilizados». Un eje con ítems a revisar aparece subrayado en punteado; su
  detalle está en el título (mouse). Son indicios para orientar el repaso, no
  una medición de la competencia.

| Eje (`analisis-de-items.md`) | Rótulo en pantalla | Ítems | n |
|---|---|---|---|
| Hardware, software, programa | Hardware y software | 1, 2, 9 | 3 |
| Instrucciones, datos, operaciones, resultados | Datos y operaciones | 3, 10, 11, 24 | 4 |
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
completarla. La fila guardada se actualiza recién al guardar.

**Qué hace falta para guardar.** Al menos una parte marcada para
contabilizar (si se desmarcan las cuatro, no se guarda: «Marcá al menos una
parte para contabilizar antes de guardar.»; las respuestas no se tocan). Y sólo
los ítems de las partes que se contabilizan tienen que tener un valor. Una parte que no se contabiliza puede
quedar sin cargar, del todo o en parte: esos ítems quedan como «no
transcriptos», que no es lo mismo que `-` (casillero en blanco del estudiante),
y no se convierten en `-`. Las respuestas que sí se cargaron se conservan. Los
ítems sin cargar no entran en denominadores, no cuentan como en blanco y no
afectan ejes ni devolución. Si después se vuelve a contabilizar esa parte, sus
ítems vacíos vuelven a ser obligatorios y no se puede guardar hasta
completarlos. El aviso «Faltan N ítems» cuenta sólo los obligatorios.

### Devolución al estudiante

Junto a los resultados (al cargar, en Ver y en Editar), cuando están completas
las partes contabilizadas, la herramienta propone dos textos derivados de la
misma clasificación. Se recalculan desde las respuestas con cada cambio; no se
guardan en `localStorage` ni se exportan en el TSV.

**Intensidad por eje (la evidencia).** Cuenta los errores firmes del eje entre
sus ítems de partes contabilizadas: respuestas incorrectas, en blanco o con
varias letras incorrectas. Las ilegibles y dudosas (`?`, `B?`) no son error ni
acierto. Un eje necesita al menos 2 errores firmes para tener indicación. Con
al menos 3 ítems contabilizados, es **volver a estudiar** si los errores son
mayoría (más errores que ítems no errados); si no, **repasar**. Con 1 o 2
ítems, como mucho repasar.

| Ítems contabilizados en el eje | Volver a estudiar | Repasar | Sin indicación |
|---|---|---|---|
| 5 | 3 errores o más | 2 | 0 o 1 |
| 4 | 3 o 4 | 2 | 0 o 1 |
| 3 | 2 o 3 | nunca (2 de 3 ya es mayoría) | 0 o 1 |
| 2 | nunca | los 2 | 0 o 1 |
| 1 | nunca | nunca | siempre |

Un solo error nunca marca un tema. No hay umbrales de porcentaje. En el panel,
cada eje marcado muestra «volver a estudiar» o «repasar».

**Unidades de estudio (lo que se comunica).** Los ocho ejes se comunican en
seis unidades, siempre en este orden pedagógico fijo (el orden no depende de
la cantidad de errores):

1. hardware y software;
2. CPU, RAM y almacenamiento (ejes CPU y memoria + RAM y almacenamiento);
3. sistema operativo;
4. datos y operaciones;
5. entrada, salida y estado (ejes entrada y salida + estado);
6. representaciones.

Las tres primeras forman la familia «la máquina» y la cuarta y la quinta, «el
procesamiento de información»; las familias sólo ordenan, no se nombran. Una
unidad de dos ejes se nombra junta sólo si ambos tienen la misma indicación; si
no, cada eje va con su nombre propio («CPU y memoria», «RAM y almacenamiento»,
«entrada y salida», «estado») en su intensidad. Así, todo eje con indicación
queda cubierto con su intensidad y ningún eje sin indicación aparece por una
agrupación demasiado amplia. Nunca se reemplazan contenidos por cantidades
(«varios», «la mayoría», «todos los contenidos»…): si una combinación no se
deja comprimir, la frase es más larga.

- **Devolución breve** (para escribir a mano): «Volver a estudiar: unidad;
  unidad. Repasar: unidad; unidad.», sin cifras ni explicaciones. Por ejemplo:
  «Repasar: estado.», «Volver a estudiar: CPU, RAM y almacenamiento; sistema
  operativo.», «Volver a estudiar: sistema operativo. Repasar: estado.». Con
  los ocho ejes para volver a estudiar: «Volver a estudiar: hardware y
  software; CPU, RAM y almacenamiento; sistema operativo; datos y operaciones;
  entrada, salida y estado; representaciones.».
- **Devolución extendida** (para mail o Classroom): las mismas unidades en el
  mismo orden, una oración por unidad con qué revisar según los ítems fallados
  (hasta dos ideas por eje, derivadas de «Qué mide» en
  `analisis-de-items.md`). Por ejemplo: «Conviene volver a estudiar CPU, RAM y
  almacenamiento, especialmente: qué hace la CPU y qué hace la RAM mientras se
  ejecuta un programa; qué información está en uso (RAM) y qué información queda
  guardada (almacenamiento). También repasá estado: qué datos forman el estado
  de un sistema; qué cambia y qué se mantiene en el estado.».
- Sin temas marcados: «Revisar los errores marcados.» si hay errores sueltos;
  «Bien: seguir así.» si no hay errores.

«Copiar breve» y «Copiar extendida» copian sólo ese texto y no modifican la
evaluación. Si en las partes contabilizadas hay respuestas a revisar, el panel
avisa que la devolución es **provisoria** (el aviso no se copia): conviene
resolverlas en el papel antes de usarla.

### Corrección visible

Como en la corrección en papel, el casillero muestra siempre lo que respondió
el estudiante y, afuera, en rojo, lo que acepta la clave. En la grilla aparece
a la derecha del casillero; en las filas guardadas, como superíndice. Es sólo
presentación: no cambia la respuesta cruda, el TSV ni los resultados.

| Respuesta | Marca roja |
|---|---|
| correcta (coincide con una respuesta aceptada; en el 18, `B`, `D` o `B+D`) | `✓` (carácter de texto, no emoji) |
| incorrecta, en blanco o varias letras incorrectas | la letra de la clave |
| ítem 18 incorrecto (incluido en blanco) | `B/D` (el título aclara: B, D o B+D) |
| `?` o dudosa (`B?`, `B+D?`) | ninguna: queda «a revisar» (sin `✓` aunque la letra coincida) |

Una `D` en 1–8 se señala con borde u ondulado rojo (aviso de transcripción) y
lleva su corrección afuera, como cualquier incorrecta.

La clave está copiada en `index.html` (`ACEPTADAS`) y los ejes en `EJES`,
porque un archivo abierto desde el disco no puede leer otro archivo.
`tests/herramienta-evaluacion-a.test.mjs` los compara con `clave-docente.md`
y `analisis-de-items.md` y falla si difieren: si cambia alguno de esos
documentos, actualizar también `index.html`.

## Configuración y Evaluación B

Todo lo propio de la Evaluación A está en un bloque delimitado por
`// <CONFIG>` y `// </CONFIG>` en `index.html`: código de evaluación (`SI-A`),
título, clave de `localStorage`, partes, clave aceptada, particularidades que
nombra la leyenda, ejes (con un `id` estable: `hw`, `datos`, `es`, `cpu`, `ram`,
`estado`, `so`, `repr`) e ideas de la devolución extendida. El resto se deriva
de ahí: la leyenda, la columna más ancha de los ítems con más de una respuesta
aceptada (aquí, el 18) y el nombre del `.tsv` descargado.

La [herramienta de la Evaluación B](../../evaluacion-b/herramienta/) es una
copia de este archivo con su propio bloque CONFIG. Mientras sean copias,
`tests/herramienta-evaluacion-b.test.mjs` exige que fuera de ese bloque sean
idénticas: un cambio de comportamiento se hace en las dos. Es un control
temporal de la duplicación, no una regla de diseño.

## Valores de cada ítem

| Valor | Significa |
|---|---|
| `A` … `D` | La letra escrita en el casillero. |
| `-` | Casillero en blanco. |
| `B+D` | Varias letras, en orden alfabético, unidas por `+`. |
| `?` | Ilegible: hay que volver al papel. |
| `B?` / `B+D?` | Lectura dudosa: lo más probable es eso, pero conviene revisar. |

Un ítem sin cargar sólo puede guardarse si su parte no se contabiliza (ver
«Qué hace falta para guardar»); en el TSV va como campo vacío.
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
- `i01`…`i30` siguen la tabla de valores anterior. Un campo vacío es un ítem
  sin cargar y sólo puede aparecer en una parte con `parteN_cuenta` = `0`
  (distinto de `-`, que es un casillero en blanco).
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
  `B+A`, por ejemplo, se rechaza en lugar de reordenarse. Un campo vacío
  (ítem sin cargar) se acepta sólo si su parte tiene `parteN_cuenta` = `0`; en
  una parte que se contabiliza, es un error;
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

Lo guardado en el navegador está bajo la clave `aula-evaluacion-a-v1`. Las
versiones anteriores, con el nombre «herramienta de transcripción», usaban
`aula-transcripcion-si-a-v1`. No hay migración automática entre las dos claves:
para recuperar esos datos, exportar el TSV con la versión anterior e importarlo
aquí, porque el formato TSV es el mismo. Datos sin la configuración de partes
se abren con las cuatro partes contabilizadas.

## Pruebas (sólo datos ficticios)

`npm test` incluye `tests/herramienta-evaluacion-a.test.mjs`, que carga
`index.html` en jsdom y lo maneja con el teclado: carga y autoavance, `B+C
Enter`, blanco, ilegible, dudosa, D fuera de opciones, correcciones, edición,
corrección roja, resultados por parte (también parciales), global con
denominadores 30, 24, 22, 16, 6 y sin partes, ejes con denominadores variables,
configuración independiente por evaluación, resultados en vivo, recarga, datos
del formato anterior, TSV de 37 columnas, Ver en sólo lectura (sin cambios ni
advertencias) frente a Editar, devolución breve y extendida (regla de
mayoría, unidades de estudio en orden fijo, correspondencia con la
clasificación, dudosas, partes excluidas, evidencia insuficiente y copiar),
importación (ida y vuelta exacta con partes
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
/ Editar y la importación de un `.tsv` con partes `1011` y de uno inválido). Con `URL_HERRAMIENTA=http://localhost:4321/herramientas/evaluacion-a/`
prueba la ruta de `npm run dev` en lugar del archivo.
`layout.mjs` comprueba, en cada ancho, que no haya desborde horizontal, que
nada sobresalga de su columna, que las correcciones y los resultados de cada
parte no pisen casilleros, y que las respuestas queden alineadas con la
cabecera. Perfil del navegador, descargas y capturas quedan en
`tmp/herramienta-evaluacion-a-navegador/`, fuera de Git.
