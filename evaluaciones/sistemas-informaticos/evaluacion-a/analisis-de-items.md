# Análisis de ítems · Evaluación A · Sistemas Informáticos

Este análisis sirve para interpretar respuestas y diseñar futuras evaluaciones. El criterio de corrección está en `clave-docente.md`.

La columna «Fuente» nombra, con títulos abreviados, los materiales de Aula donde se trabaja cada contenido: *Hardware y software* (Sistemas digitales: hardware y software), *Datos y operaciones* (Instrucciones, datos, operaciones y resultados), *Entrada y salida* (Entrada, procesamiento y salida), *Procesador y memoria* (Procesador y memoria durante la ejecución), *Estado* (El estado de un sistema), *Von Neumann* (Arquitectura de Von Neumann), *Sistema operativo* (El sistema operativo) y *Tres miradas* (Tres miradas sobre una misma situación). «Act.» refiere a las Actividades y «Ficha» a la ficha de síntesis de *Estudiar y practicar el sistema operativo*.

## Qué mide cada ítem

### Parte 1 · Reconocer

| Ítem | Qué mide | Distractores y confusiones | Fuente |
|---|---|---|---|
| 1 | Componente físico frente a programa y datos. | A: aplicación; C: archivo. | *Hardware y software* |
| 2 | Los programas permiten tareas distintas con el mismo hardware. | B: teclado; C: pantalla que muestra cosas distintas. Son distractores accesibles para esta parte inicial. | *Hardware y software* |
| 3 | Papel de un número como resultado de una operación. | A: todo número es dato; B: operación. | *Datos y operaciones* |
| 4 | Dispositivo de entrada. | A: auriculares; C: impresora, ambos de salida. | *Entrada y salida* |
| 5 | Dispositivo de salida. | A y B: dispositivos de entrada. | *Entrada y salida* |
| 6 | La CPU ejecuta instrucciones. | B: atribuir ejecución a la memoria; C: confundir ejecución con almacenamiento. | *Procesador y memoria*, *Von Neumann* |
| 7 | Información en uso en RAM frente a información guardada. | A: asumir que ya se guardó; C: atribuir el guardado a la CPU. La figura indica que aún no se usó «Guardar». | *Procesador y memoria*, Ficha §5 |
| 8 | Lugar del SO entre el programa que solicita recursos y el hardware. | A: otra aplicación; B: Internet. | *Sistema operativo* |

### Parte 2 · Relacionar

| Ítem | Qué mide | Distractores y confusiones | Fuente |
|---|---|---|---|
| 9 | Clasificar hardware y software, incluidos programas y datos. | A: categorías invertidas; B: CPU como software; C: archivo como hardware por estar guardado físicamente. | *Hardware y software* |
| 10 | Identificar la operación. | A: dato; C: resultado; D: programa. | *Datos y operaciones* |
| 11 | Un resultado puede volver a usarse como dato. | B: operación; C: resultado final; D: instrucción. | *Datos y operaciones* |
| 12 | Identificar la información que entra al celular en ese momento. | A: confundir la intención de desbloquear con la huella que lee el sensor; B: resultado; C: huella ya guardada. A resultó especialmente plausible (ver hallazgos). | *Entrada y salida* |
| 13 | Recorrido al abrir un programa. | Inversiones entre almacenamiento, RAM, CPU y resultado. | *Sistema operativo*, Act. 10–14 |
| 14 | Reconocer los datos del estado. | A y D: componentes; B: programa. | *Estado* |
| 15 | Función del driver para comunicarse con un periférico. | B y C: falta de hardware; D: confundir driver con aplicación. | *Sistema operativo*, Ficha §6 |
| 16 | Elegir la representación que permite comparar un dato antes y después. | A: recorrido de información; B: papeles de los componentes; D: creer que todas las representaciones muestran lo mismo. | *Tres miradas*, *Estado* |

### Parte 3 · Interpretar

| Ítem | Qué mide | Distractores y confusiones | Fuente |
|---|---|---|---|
| 17 | Leer una actualización parcial del estado. | A y D: creer que cambia todo; C: excluir la canción del estado. | *Estado* |
| 18 | Distinguir entrada y operación. | A: salida; C: estado. B y D son interpretaciones defendibles por la redacción (ver hallazgos). | *Estado* |
| 19 | Reconocer el límite de una tabla como representación. | B: creer que muestra todo; C: leer información ausente; D: conclusión correcta con razón falsa. | *Tres miradas* |
| 20 | Interpretar el intercambio entre CPU y RAM en el modelo de Von Neumann. | B: la RAM ejecuta; C: la CPU guarda; D: confundir CPU/RAM con entrada/salida. | *Procesador y memoria*, *Von Neumann* |
| 21 | Una salida puede ser entrada de otro sistema. | A: fijar el papel de salida; B y D: confundir papeles. | *Entrada y salida* |
| 22 | Diferenciar almacenamiento y RAM para programas abiertos. | A y C: otras confusiones entre componentes; D: asumir que basta el espacio libre. | *Sistema operativo*, Ficha §5 |
| 23 | El SO administra recursos. | A: componente físico; B: sólo interfaz; D: confundirlo con las aplicaciones. | *Sistema operativo* |
| 24 | Seguir dependencias en un esquema de cálculo. | A: detenerse en el subtotal; B: mirar sólo el total; C: incluir el envío, que no depende de la cantidad. | *Datos y operaciones* |

### Parte 4 · Usar lo que sabés

| Ítem | Qué mide | Distractores y confusiones | Fuente |
|---|---|---|---|
| 25 | Entrada frente a estado en el riego automático. | A: dato del estado; B: salida; D: quien configuró el sistema. | *Entrada y salida*, *Estado* |
| 26 | Una consulta no siempre cambia el estado definido para el caso. | A: incorporar la entrada al estado; C: toda operación lo cambia; D: se borra. | *Estado* |
| 27 | Detectar que la salida del riego afecta la próxima entrada. | A: hecho cierto que no explica la secuencia; B: contradice el caso; C: la CPU guarda todo. | *Entrada y salida*, *Estado*, *Tres miradas* |
| 28 | Cambio de contexto: guardar y restaurar el estado de cada proceso. | B: reabrir desde cero; C: la RAM ejecuta; D: alternancia sin intervención del SO. | Ficha §8–9, Act. 15–18 |
| 29 | Aplicar el modelo del arranque a una versión guardada. | A: omitir la RAM; C: la CPU conserva la versión; D: descargarla en cada encendido. | Ficha §7, Act. 8–9 |
| 30 | La RAM mantiene disponibles datos y resultados durante una tarea. | B: almacenamiento pese a que el trabajo no se guardó; C: pantalla como fuente; D: la CPU guarda todo. | *Datos y operaciones*, *Procesador y memoria* |

## Cobertura

| Eje | Ítems (entre paréntesis, donde aparece integrado) |
|---|---|
| Hardware, software, programa | 1, 2, 9 |
| Instrucciones, datos, operaciones, resultados | 3, 10, 11, 24 (30) |
| Entrada, procesamiento y salida | 4, 5, 12, 21, 25 (18, 27) |
| CPU y memoria / Von Neumann | 6, 20, 30 |
| RAM, almacenamiento y recorrido | 7, 13, 22 (29) |
| Estado | 14, 17, 18, 26 (25, 28) |
| SO y administración de recursos | 8, 15, 23, 28, 29 |
| Representaciones y miradas | 16, 19, 27 (20, 24) |

## Hallazgos para futuras evaluaciones

- **Ítem 12:** en el uso del instrumento, la opción A resultó especialmente plausible. La opción confunde lo que el usuario quiere lograr con la información que ingresa al celular. La clave sigue siendo sólo D. En otra versión conviene revisar ese distractor o trabajar explícitamente la distinción entre intención y entrada.
- **Ítem 18:** la redacción permite entender «Siguiente» como entrada recibida (D) o como operación solicitada (B). Se aceptan B, D y B+D en este instrumento. Para volver a evaluar la distinción, separar explícitamente lo que llega al reproductor de lo que éste hace.
- **Límites del modelo:** el recorrido del ítem 13 y la explicación del ítem 22 responden al modelo trabajado; la memoria virtual introduce matices técnicos. El estado del ítem 26 comprende sólo límite y llave, según el recuadro. Al adaptar esos ítems, mantener claros esos alcances.
- **Equilibrio y pistas:** la RAM aparece con frecuencia (7, 13, 20, 22, 29, 30), mientras Von Neumann se evalúa explícitamente en 20 y 21. El esquema del 8 anticipa la idea de administración de recursos del 23. Conviene considerar ambos puntos al diseñar otro instrumento.
- **Dificultad:** el ítem 29 da el dato de que la versión está guardada, por lo que puede exigir menos que otros de la Parte 4. En el 16, «directamente» y la comparación antes/después son claves para elegir la tabla; revisar esa precisión si se reescribe.
