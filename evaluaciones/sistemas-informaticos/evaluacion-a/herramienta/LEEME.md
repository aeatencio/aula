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
- Las decisiones de cierre A+B (ver [Cierre A+B](#cierre-ab)) están en otra
  clave, `aula-evaluacion-cierre-v1`, que «Vaciar sesión» no toca porque es de
  las dos herramientas. Contienen el curso y el estudiante normalizados y, en
  modo manual, la categoría y la devolución escritas: también son privadas. Se
  borran con «Borrar decisiones de cierre».

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

## Cierre A+B

**Pantalla «Cierre A+B»** (la entrada para cerrar un curso):
`http://localhost:4321/herramientas/cierre-evaluaciones/` con `npm run dev`, o
`index.html#cierre` abriendo el archivo. Las herramientas la enlazan con «Ir a
Cierre A+B →». Es esta misma página en modo cierre: muestra sólo el cierre, con
los mismos cálculos y decisiones descritos abajo.

La herramienta propone y el docente decide: la evidencia **sugiere** una
categoría con las reglas de abajo (incluida la Parte 1), y esa sugerencia es la
**categoría efectiva** mientras el docente no elija otra. Aceptarla no requiere
ningún paso ni guarda nada: el docente interviene sólo en las excepciones.

- **Lista del curso** (filtro por curso): N.º de lista (orden alfabético dentro
  de cada curso, 01, 02…; una pareja A+B es un solo número; se deriva, no se
  guarda, y también se imprime junto al nombre para ordenar y repartir),
  estudiante (si los nombres de A y B difieren o el vínculo es manual, se ven los
  dos), A y B presentes (✓, —, o
  «?» si hay un problema de pareja), la categoría efectiva y un estado: **Lista**
  o lo que pide atención: **Provisorio** (respuestas a revisar que podrían
  cambiar la sugerencia), **Revisar pareja**, **Sin evidencia** o **Sin
  categoría** (ninguna parte elegida). El estado describe la evidencia: cambiar
  la categoría no lo oculta (por ejemplo, «Provisorio ≠ sugerida»). Una
  corrección hecha en la herramienta de A o de B, en otra pestaña del mismo
  navegador, se ve al instante. Con un solo intento, «Sólo A» o «Sólo B».
  Si el docente eligió una categoría distinta de la sugerida, una marca discreta
  «≠ sugerida», sólo para el docente (no se imprime ni se exporta). Imprimir y
  exportar quedan como acción secundaria: el curso se puede imprimir sin entrar
  a ningún estudiante.
- **Revisar** un estudiante: «Categoría sugerida por la evidencia», resultado
  integrado, las partes que cuentan (cambiarlas se guarda y recalcula la
  sugerencia), la alerta de la Parte 1 y las que impiden cambiar la categoría.
  En **Categoría del período** aparece marcada la efectiva; elegir otra guarda
  el override (como cierre manual) y **Volver a la sugerencia** lo quita (elegir
  la sugerida hace lo mismo). Al cambiar la categoría, «Agregar nota docente para
  la devolución…» se abre sola con una guía («¿En qué otras evidencias del
  período se apoya la categoría? …») que no se guarda; la nota es siempre
  opcional, se imprime («Nota docente») y no va al export. «← Anterior» y
  «Siguiente →» recorren la lista. Plegados: detalle A/B por parte, contenidos y
  orientación, enlaces a la devolución de cada intento en su herramienta
  (`#ver=<id>` abre esa evaluación en Ver) e información técnica.
- Un estudiante con «Sólo A» o «Sólo B» puede consolidarse ahí mismo con un
  registro de la otra evaluación del mismo curso.


Las herramientas de A y de B (abiertas en el mismo origen: las dos en
`localhost`, o las dos como archivo) leen, en sólo lectura, los registros
guardados de la otra para el cierre del bimestre. Cada una muestra el cierre
de sus propias filas; un estudiante que hizo los dos intentos tiene el mismo
cierre en las dos.

**Dónde:** en **Ver**, debajo de la grilla, el panel «Cierre A+B»; en la tabla
de evaluaciones guardadas, una línea «Cierre: …» debajo de cada estudiante.
«← Anterior» y «Siguiente →» recorren las filas guardadas sin salir de Ver.

**Emparejamiento**, igual desde A y desde B:

1. Un **vínculo manual** del docente manda: es estable aunque los nombres no
   coincidan («vinculado manualmente con …», con «Desvincular»). Si después uno
   de los dos registros se renombra o se repite, el vínculo queda «roto»: se
   avisa en rojo, no se usa ni se adivina, y se puede desvincular.
2. Si no hay vínculo, la coincidencia **automática** por curso y estudiante, sin
   espacios de más, mayúsculas ni tildes, sin contar los registros que ya tienen
   vínculo manual. Si en la otra evaluación hay más de un registro igual, no se
   usa ninguno («ambiguo»); si sólo coincide el estudiante con otro curso, se
   informa y no se empareja.
3. Si no hay ninguno de los dos: «No se encontró Evaluación A correspondiente»
   y cuenta sólo el intento propio.

Sin pareja, el panel ofrece **consolidar manualmente**: «Consolidar manualmente
con: [registro] [Vincular]». El selector lista sólo registros de la otra
evaluación del mismo curso que todavía están disponibles (sin vínculo, sin
pareja automática y únicos en su intento), con el nombre tal como está
guardado. Cada registro puede estar en un solo vínculo. No hay similitud de
nombres ni sugerencias: decide el docente. Dos registros indistinguibles
(mismo curso y nombre normalizado) dentro de un mismo intento siguen
«ambiguos» y no se ofrecen. En modo procesado, ambiguo, no seguro y vínculo
roto dejan la categoría provisoria.

**Evidencia (siempre calculada):** por parte, el mejor resultado válido entre
A y B. Una parte es válida en un intento si se contabiliza y está completa.
Si las dos son válidas, la de más aciertos; si empatan, `A = B`; si ninguna,
«sin evidencia». Las respuestas a revisar no suman; si su resolución pudiera
subir el mejor resultado, la parte dice «puede subir: a revisar».

**Modo de cierre (por estudiante):**

- **Procesado A+B** (por defecto). La columna «Cuenta para cierre» decide qué
  partes con evidencia cuentan; si una parte cuenta, cuenta con su mejor
  resultado. Mientras el docente no decida, se proponen todas las partes con
  evidencia («propuesta»); cambiar una casilla o «Confirmar esta selección»
  guarda la decisión. Debajo: resultado considerado (aciertos ÷ total de las
  partes elegidas, con un decimal) y categoría, recalculados al instante.
- **Manual.** A y B siguen a la vista como evidencia, pero no se calcula
  ninguna categoría: el docente la elige (En proceso, Suficiente, Avanzado) y
  escribe la devolución en texto libre. Se guardan mientras se escribe. Volver a
  Procesado recupera la selección de partes; lo manual queda guardado sin usarse.

**Categoría en modo procesado**, con la fracción exacta (sin redondear):

| Partes elegidas | En proceso | Suficiente | Avanzado |
|---|---|---|---|
| las cuatro (sobre 30) | menos del 55 % (0–16), o P1 sin cumplir | 55 % o más (17–23) y P1 cumplida | 80 % o más (24–30) y P1 cumplida |
| una, dos o tres | menos del 55 %, o P1 sin cumplir | 55 % o más y P1 cumplida | nunca |

El 55 % reproduce la tolerancia de 5,5 → 6 (17/30, 9/16 y 14/24 superan el
porcentaje; 16/30 y 13/24, no). Sin partes elegidas: «falta la decisión
docente».

**Requisito de la Parte 1 · Reconocer:** para salir de En proceso (Suficiente
o Avanzado) también hay que cumplirlo, aunque el porcentaje alcance. Se usan
los intentos válidos reales de P1, no el mejor resultado, y no depende de que
P1 esté elegida para el resultado considerado:

- con P1 válida en A y en B, la suma de aciertos debe llegar a **9/16**
  (5 + 4, 6 + 3 u 8 + 1 cumplen; 4 + 4 no);
- con un solo intento válido de P1, **6/8**;
- sin intentos válidos de P1, no se cumple.

El panel lo muestra en una línea («Parte 1 · Reconocer: 8/16 (A 4/8 + B 4/8) ·
no alcanza el mínimo de 9/16»; con un intento, «5/8 (sólo B) · no alcanza el
mínimo de 6/8»), y la categoría dice «por el requisito de la Parte 1» cuando es
lo que la deja En proceso. En la tabla, la línea de la fila agrega «P1 no
alcanza». No se guarda nada: se deriva de A y de B.

La categoría se marca **provisoria**, y el panel dice por qué, si respuestas a
revisar podrían cambiarla (por el porcentaje o porque P1 podría alcanzar su
mínimo: «puede alcanzarlo: a revisar») o si el emparejamiento es ambiguo o no
seguro. Si lo pendiente no puede cambiar la categoría, se muestra pero no la
vuelve provisoria. En modo Manual no se aplica nada de esto.

**Devolución: capa objetiva y orientación** (igual en Procesado y en Manual,
todo derivado; nada de esto se guarda). El panel se lee en este orden:

1. **Síntesis del cierre:** resultado considerado, requisito de P1 y categoría
   (procesado), o la categoría elegida (manual).
2. **Evidencia por partes:** una lectura rápida («Reconocer 75 % · Relacionar
   87,5 % · …», con la mejor evidencia) y la tabla con A, B y la mejor
   evidencia, cada una con aciertos/total, porcentaje y procedencia (A, B o
   A = B). Una parte no contabilizada o incompleta no se presenta como evidencia
   (sin porcentaje); las respuestas a revisar se indican aparte.
3. **Evidencia por contenidos** (plegable; el resumen dice qué contenidos tienen
   dificultad): por eje común, A y B **acumulados** (no el mejor), cada uno con
   los ítems que su evaluación asigna a ese eje (el 28 de la B cuenta en RAM y
   en SO) y de todas sus partes válidas, aunque el docente no las haya elegido
   para la categoría. Aciertos sobre respuestas firmes y porcentaje; las
   respuestas a revisar, aparte y nunca como error. No es una nota ni cambia la
   categoría.
4. **Para seguir trabajando:** orientación por unidades de estudio (las mismas
   agrupaciones y el mismo orden que la devolución por intento).

**Intensidad por contenido** (con n = aciertos + errores firmes de A+B): sin
señal si hay menos de 2 errores o los errores son menos de un tercio de n;
**dificultad fuerte** si los errores son mayoría y n ≥ 3; si no, **merece
atención**. Con 5 ítems o menos coincide con la regla de la devolución por
intento; con más evidencia (A+B), pocos errores entre muchos aciertos no marcan.
Con n < 3 se avisa «poca evidencia». Si las respuestas a revisar, resueltas a
favor, bajarían la intensidad, se marca «(a confirmar)» y la orientación usa la
menor; si la borrarían, el contenido se nombra aparte: «A confirmar cuando se
resuelvan las respuestas a revisar».

**De intensidad a orientación**, según la categoría de cierre (la procesada, o
la manual, que manda en Manual):

| Categoría | dificultad fuerte | merece atención |
|---|---|---|
| En proceso | Volver a estudiar | Repasar |
| Suficiente | Repasar | Consolidar |
| Avanzado | Reforzar | (no se menciona) |
| sin categoría todavía | Aspectos a revisar | Aspectos a revisar |

Sin categoría (procesado sin partes elegidas, o manual antes de elegirla) la
evidencia se muestra igual y la orientación es neutral, sin verbos de cierre;
al aparecer la categoría se recalcula. Sin contenidos marcados, una frase
acorde a la categoría (sin categoría, ninguna). Si la categoría
procesada es En proceso por el requisito de la Parte 1, la orientación lo
recuerda.

**La devolución de un solo intento** (global, ejes y devolución breve y
extendida de esa evaluación) sigue igual en la carga y al editar. En Ver queda
debajo del panel, plegada en «Resultados y devolución de este intento · sólo la
Evaluación A · no es la devolución de cierre»: es una consulta sobre ese intento;
la lectura vigente para el cierre es el panel «Cierre A+B».

**Devoluciones de cierre para imprimir.** «Cierre del curso: imprimir o
exportar…» (en la tabla de evaluaciones guardadas) abre una vista previa con
una devolución por estudiante del curso completo: las filas de esta
herramienta y los registros de la otra evaluación que no tienen pareja aquí
(desde A y desde B sale lo mismo), ordenados por curso y estudiante, con un
filtro por curso. «Imprimir» imprime sólo esas devoluciones, para hoja Oficio
(216 × 356 mm, márgenes de 12 mm), al 100 %. Cada bloque no se corta entre
páginas (`break-inside: avoid`) y lleva, en este orden:

1. estudiante (si un vínculo manual une nombres distintos, los dos), curso y
   «Calificación del Tercer Bimestre» (así se llama en el papel, como en el
   boletín): la categoría efectiva (la elegida por el docente o, si no, la
   de la evidencia, con «provisoria» si corresponde), sin decir de dónde sale.
   Debajo, el mismo encuadre para todos: «La calificación del tercer bimestre
   valora el proceso del período. Las Evaluaciones A y B son una de las
   evidencias consideradas.» (A+B describe una evidencia; la categoría valora el
   período);
2. resultado considerado (si la categoría es la de la evidencia); si hay
   respuestas pendientes de revisión, una línea lo dice («estos resultados
   todavía pueden cambiar»), sea cual sea la categoría;
3. «Resultados en las Evaluaciones A y B»: A, B y el mejor, con porcentajes (sin
   la columna «Cuenta»: las partes consideradas ya las dice «Resultado
   considerado»), con una fila
   **Total**: para A y para B, la suma de sus partes válidas con su propio
   denominador (14/24 si una parte no es válida, nunca sobre 30 inventado) y lo
   que queda a revisar; para «Mejor», la suma de la mejor evidencia de cada parte
   (no es una evaluación completa). La misma fila está en el detalle por parte de
   la revisión individual;
4. por contenidos, A y B juntos, con las dificultades marcadas;
5. para seguir trabajando: la orientación por contenidos respaldada por A+B. Si
   la categoría final difiere de la sugerida, no se agregan frases generales de
   respaldo ni la Parte 1 como explicación (eso lo dice la nota), y si no queda
   nada respaldado la sección no aparece;
6. la nota docente, si se escribió;
7. la **clave de corrección** de A y de B, una línea por evaluación separada
   por partes (`A | P1 1B 2A … 8C | P2 9D … | P3 17B 18B/D … | P4 … 30A`), para que
   el estudiante se autocorrija con su hoja. Sale de la clave de cada
   herramienta (que las pruebas comparan con cada `clave-docente.md`); con
   varias respuestas aceptadas se muestran las simples unidas por «/» y una
   aclaración debajo («A18: se acepta B, D o B+D.»). Sólo esta sección usa una
   letra algo menor (9 pt) para que cada evaluación entre en un renglón.

No se publica nada: no hay página, ruta ni QR; la clave sólo está en el papel.

**Datos anonimizados para análisis.** En la misma vista, «Exportar datos
anonimizados para análisis (.json)» descarga, del curso elegido o de todos,
`cierre-anonimizado-<curso | todos-los-cursos>-<fecha>.json`: una proyección
derivada para analizar cursos, la escuela, fortalezas, dificultades y cambios
entre A y B fuera de la herramienta. Se genera sólo al pedirlo, no se guarda y
no escribe nada. Contiene metadatos (formato, versión, fecha, cursos y
cantidades por categoría), definiciones de cada campo, la estructura de partes
y contenidos (con los ítems de cada evaluación) y, por estudiante:

- un id efímero `<curso> · 01`, asignado al azar dentro del curso en cada
  export (no sigue el orden de los nombres ni es estable entre exports);
- el curso, los intentos presentes y válidos y el tipo de emparejamiento;
- el cierre: modo, categoría (la manual en Manual), si es provisoria y por qué
  (`respuestas_a_revisar`, `emparejamiento_*`, `registro_duplicado`), partes
  consideradas, resultado considerado y si queda En proceso por P1;
- el requisito de P1 (aciertos, total, mínimo, si podría cumplirse al revisar);
- por parte, A y B por separado (estado; puntaje sólo si es válida) y la mejor;
- por contenido, A y B por separado y acumulados (aciertos, errores, firme,
  porcentaje, a revisar) y la intensidad.

No incluye nombres (ni normalizados), claves de emparejamiento, ids de registro,
vínculos manuales, respuestas por ítem, devoluciones ni textos del docente, ni
claves de almacenamiento. Aun así, el archivo es sensible: un curso chico y una
categoría pueden bastar para reconocer a alguien; guardarlo fuera del
repositorio.

**Cierre completo (privado).** En la misma vista, separado del anonimizado y
con su advertencia, «Exportar cierre completo (privado) (.zip)» descarga, del
curso elegido o de todos, `cierre-completo-<curso | todos-los-cursos>-<fecha>.zip`:
un snapshot del cierre para archivar (por ejemplo, en Drive como archivo
privado). Contiene datos personales: nombres, respuestas y decisiones docentes.
Se genera en el navegador (un ZIP sin compresión armado por la propia página, sin
dependencias), no se envía a ningún lado, no se guarda en el navegador y no se
puede reimportar: es un archivo documental. Adentro:

- `LEEME.txt`: fecha, cursos, cantidad de estudiantes, aviso de privacidad y
  qué es cada archivo;
- `cierre-completo.json` (formato, versión, generado): las claves aplicadas
  (con la excepción de A18), las reglas vigentes, las **fuentes** de A y B tal
  como están guardadas (respuestas crudas incluidas), los vínculos manuales y,
  por estudiante, el emparejamiento, la **corrección** (por intento, parte por
  parte e ítem por ítem; integrada por parte, contenidos), la **sugerencia** de
  la herramienta (categoría, resultado considerado, P1, provisoria y motivos),
  la **decisión docente** (categoría elegida si la cambió, final, partes
  elegidas, nota y el registro guardado; si no hizo nada, no se inventa una
  decisión) y la **devolución entregada** (lo que se imprime);
- `resumen.tsv`: una fila por estudiante para abrir en una planilla;
- `evaluacion-a.tsv` y `evaluacion-b.tsv`: los registros del alcance con la misma
  serialización que el TSV de cada herramienta;
- `devoluciones.html`: las devoluciones tal como se imprimen, con los estilos
  incluidos y sin JavaScript; se abre en cualquier navegador.

No incluye otras claves del navegador ni datos del dispositivo.

**Qué se guarda:** sólo las decisiones que no se pueden derivar, en
`aula-evaluacion-cierre-v1`:
`{ estudiantes: { "<curso>\t<estudiante>": { modo, partes, categoria, devolucion } }, vinculos: [{ A: "<curso>\t<estudiante>", B: "<curso>\t<estudiante>" }] }`
con curso y estudiante normalizados (cada campo, sólo si se decidió; `vinculos`,
sólo si hay alguno). La decisión de un estudiante con A emparejada (automática
o manual) va con la clave de su registro de A, para que sea la misma desde las
dos herramientas; al vincular, si sólo había una decisión con la clave de B,
pasa a la de A. Desvincular borra sólo ese vínculo. Nunca respuestas ni resultados. Las claves
`aula-evaluacion-a-v1` y `aula-evaluacion-b-v1` no se escriben desde el cierre.
Si otra pestaña cambia la otra evaluación o las decisiones, el panel se
actualiza solo.

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

`tests/herramienta-cierre.test.mjs` prueba el cierre A+B en las dos
herramientas con datos sintéticos (`Estudiante 01`, `Curso X`): mejor evidencia
(A gana, B gana, mezcla, empate, parte sólo en A o sólo en B, estudiante sólo
con B), selección docente y recálculo, umbrales (16, 17, 23 y 24 sobre 30; 9/16,
13/24, 14/24; nunca Avanzado con menos de cuatro partes), requisito de la
Parte 1 (9/16 sumando A y B, 6/8 con un intento, sin intentos, fuera de la
selección, con respuestas a revisar), emparejamiento
(mayúsculas, tildes, espacios, ambiguo, otro curso, duplicados), a revisar,
modo manual (categoría y devolución, ida y vuelta con procesado), capa objetiva
(partes con porcentajes, contenidos acumulados, el 28 en dos ejes, sólo
evidencia firme, intensidad, orientación según la categoría, igual en Manual y
Procesado, nada derivado guardado), vínculo
manual (vincular, desde A y desde B, recarga, desvincular, sin reutilizar un
registro, precedencia, vínculo roto, indistinguibles), persistencia,
borrado, export anonimizado (estructura, casos, privacidad estricta buscando
nombres y textos sintéticos, ids al azar, curso o todos, igual desde A y B, sin
escribir nada), devoluciones para imprimir (curso completo, orden, secciones, clave de A
y B igual a cada `clave-docente.md`, A18, en Procesado y Manual), que no haya
rutas nuevas ni nada de esto en `dist/`, y que nada escriba en los
almacenamientos de A ni de B.

`pruebas-navegador/` repite el flujo y el layout en Chrome real (WSL con Chrome
y Node.js de Windows, como `fuente/generar-pdf.mjs`):

```
./pruebas-navegador/correr.sh flujo.mjs
./pruebas-navegador/correr.sh layout.mjs despues 1650,1100,820,700,600,480
./pruebas-navegador/correr.sh cierre.mjs
```

`cierre.mjs` abre las herramientas de B y de A en el mismo origen (con
`URL_HERRAMIENTA`, en `localhost`), con clics y teclas nativos: mejor evidencia,
selección de partes, recarga, recorrido con Siguiente, modo manual, capa
objetiva y orientación en los dos modos, devoluciones para imprimir (cada línea
de clave en un renglón, bloques de menos de media página, PDF en Oficio), export
anonimizado de un curso y de todos con descarga real,
vincular,
recargar y desvincular, y que A y B queden intactos.

`flujo.mjs` usa teclas y clics nativos (incluidas la descarga del `.tsv`, Ver
/ Editar y la importación de un `.tsv` con partes `1011` y de uno inválido). Con `URL_HERRAMIENTA=http://localhost:4321/herramientas/evaluacion-a/`
prueba la ruta de `npm run dev` en lugar del archivo.
`layout.mjs` comprueba, en cada ancho, que no haya desborde horizontal, que
nada sobresalga de su columna, que las correcciones y los resultados de cada
parte no pisen casilleros, y que las respuestas queden alineadas con la
cabecera. Perfil del navegador, descargas y capturas quedan en
`tmp/herramienta-evaluacion-a-navegador/`, fuera de Git.
