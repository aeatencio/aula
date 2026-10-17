# Aula

Materiales para enseñar y trabajar en clase.

**Sitio:** https://aula.andresatencio.com

Aula reúne materiales utilizados en clase para proyectarlos, consultarlos y recuperarlos después.

Los pizarrones fueron su punto de partida y siguen siendo el material predominante, especialmente útiles cuando un estudiante faltó o no pudo copiar uno. No son el límite del producto: Aula puede incorporar otros recursos cuando una necesidad real de enseñanza lo requiera. El corpus actual refleja principalmente la práctica docente en Tecnologías de la Información y Ciencias de la Computación, sin convertir ese origen en una restricción permanente.

## La herramienta propone. El docente decide.

Las herramientas de Aula pueden calcular, organizar evidencia, sugerir categorías, devoluciones o próximos pasos, pero no reemplazan el criterio pedagógico del docente. La decisión final debe permanecer explícitamente bajo control humano.

## Publicación y privacidad

Este repositorio contiene material público. El material didáctico legítimamente publicable puede incorporarse directamente; quedan fuera los datos personales de estudiantes, los secretos, la documentación privada y cualquier otro contenido sensible. Los materiales externos deben respetar su autoría, procedencia y condiciones de licencia.

Los materiales finales se recuperan por defecto: lo destinado a estudiantes, incluidos sus PDF para imprimir, queda versionado y se puede volver a consultar e imprimir desde Aula. Claves, soluciones o información que anticipe una respuesta pueden quedar fuera de la navegación de estudiantes cuando eso protege el aprendizaje; esa exclusión es una decisión deliberada, no un efecto de la implementación.

Las evaluaciones se conservan y versionan en `evaluaciones/`; sólo aparecen en el sitio Aula si se decide integrarlas explícitamente.

## Contenido

Los materiales pueden encontrarse de tres maneras:

- por espacio curricular;
- por recorrido de enseñanza, según el lugar y el período en que se usaron;
- por tema, cuando varios materiales se usan juntos.

### Sistemas Informáticos

- Preguntas y conceptos principales
- El estado de un sistema
- Arquitectura de Von Neumann
- El sistema operativo
- Estudiar y practicar el sistema operativo
- Sistemas digitales: hardware y software
- Instrucciones, datos, operaciones y resultados
- Entrada, procesamiento y salida
- Procesador y memoria durante la ejecución
- Tres miradas sobre una misma situación

### Pensamiento Computacional

- La máquina obedece exactamente
- Seguir un programa paso a paso
- Hilos y agentes
- Agentes y arneses

### Temas

Un tema reúne varios materiales que se usan juntos.

- [Un sistema, distintas miradas](/un-sistema-distintas-miradas/) · Sistemas Informáticos. Lectura, actividad imprimible y guía docente alrededor del pizarrón *Tres miradas sobre una misma situación*, que reutiliza *Entrada, procesamiento y salida*, *El estado de un sistema* e *Instrucciones, datos, operaciones y resultados*.
- [El sistema operativo](/sistema-operativo/) · Sistemas Informáticos. Ficha de síntesis, guía gradual, práctica escrita e interactiva, pizarrones relacionados y recursos docentes.
- [Lo que queríamos y lo que pasó](/lo-que-queriamos-y-lo-que-paso/) · Pensamiento Computacional. Hoja para resolver en papel, práctica en pantalla para predecir, ejecutar y ajustar un programa, y guía docente con clave, alrededor del pizarrón *La máquina obedece exactamente*.
- [Cuándo importa el orden](/cuando-importa-el-orden/) · Pensamiento Computacional. Hoja doble faz para seguir programas con tablas de seguimiento y comparar qué cambia al cambiar el orden, papelitos de respuestas y guía docente con tablas resueltas y clave, alrededor del pizarrón *Seguir un programa paso a paso*.
- [Hilos, agentes y arneses](/hilos-agentes-y-arneses/) · Pensamiento Computacional. Lectura breve que combina los pizarrones *Hilos y agentes* y *Agentes y arneses*.

La relación entre los materiales de un tema se declara en `src/data/`, junto a los recorridos. No hay un sistema general de formatos ni un índice de tipos: cada tema describe su propio conjunto.

### Recorridos por escuela

- **Gabriela Mistral · 3.º año · 3.er bimestre 2026**
- **Gabriela Mistral · 3.º año · 4.º bimestre 2026**
- **Sistemas Informáticos · CFP 7 · 2026**

Cada material tiene una única página. La escuela, el curso y el período son contexto de uso, no identidad del material: los materiales pertenecen al corpus general de Aula, y los recorridos registran dónde y en qué orden se usaron. Un mismo material puede formar parte de más de un recorrido; los recorridos lo referencian sin duplicar el contenido.

## Implementación

Aula es un sitio estático construido con:

- Astro
- TypeScript
- HTML
- CSS
- SVG

No utiliza framework de componentes, CMS, backend, base de datos ni autenticación.

## Deploy

El sitio se publica en **Cloudflare Workers + Static Assets**.

Cada push a `main` ejecuta automáticamente mediante GitHub Actions:

1. `npm ci`
2. `npm run check`
3. `npm run build`
4. `npm test`
5. `npx wrangler deploy`

El dominio público es:

https://aula.andresatencio.com

## Desarrollo local

Requisitos:

- Node.js 22.22.2 o superior dentro de la versión 22, 24.15.0 o superior dentro de la 24, o 26 o posterior (lo exige `jsdom`, que usan los tests), preferentemente en una versión par;
- npm.

Instalación:

```bash
npm ci
```

Servidor de desarrollo:

```bash
npm run dev
```

Por defecto queda disponible en:

```text
http://localhost:4321/
```

## Validación

Comprobación de Astro y TypeScript:

```bash
npm run check
```

Build de producción:

```bash
npm run build
```

El sitio generado queda en:

```text
dist/
```

Los tests inspeccionan ese resultado. Después del build:

```bash
npm test
```

Para servir localmente el build de producción:

```bash
npm run preview
```
