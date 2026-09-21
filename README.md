# Aula

Materiales para enseñar y trabajar en clase.

**Sitio:** https://aula.andresatencio.com

Aula reúne materiales utilizados en clase para proyectarlos, consultarlos y recuperarlos después.

Los pizarrones fueron su punto de partida y siguen siendo el material predominante, especialmente útiles cuando un estudiante faltó o no pudo copiar uno. No son el límite del producto: Aula puede incorporar otros recursos cuando una necesidad real de enseñanza lo requiera. El corpus actual refleja principalmente la práctica docente en Tecnologías de la Información y Ciencias de la Computación, sin convertir ese origen en una restricción permanente.

## Publicación y privacidad

Este repositorio contiene material público. El material didáctico legítimamente publicable puede incorporarse directamente; quedan fuera los datos personales de estudiantes, los secretos, la documentación privada y cualquier otro contenido sensible. Los materiales externos deben respetar su autoría, procedencia y condiciones de licencia.

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
- Hilos y agentes
- Agentes y arneses

### Temas

Un tema reúne varios materiales que se usan juntos.

- [Un sistema, distintas miradas](/un-sistema-distintas-miradas/) · Sistemas Informáticos. Lectura, actividad imprimible y guía docente alrededor del pizarrón *Tres miradas sobre una misma situación*, que reutiliza *Entrada, procesamiento y salida*, *El estado de un sistema* e *Instrucciones, datos, operaciones y resultados*.
- [El sistema operativo](/sistema-operativo/) · Sistemas Informáticos. Ficha de síntesis, guía gradual, práctica escrita e interactiva, pizarrones relacionados y recursos docentes.
- [Hilos, agentes y arneses](/hilos-agentes-y-arneses/) · Pensamiento Computacional. Lectura breve que combina los pizarrones *Hilos y agentes* y *Agentes y arneses*.

La relación entre los materiales de un tema se declara en `src/data/`, junto a los recorridos. No hay un sistema general de formatos ni un índice de tipos: cada tema describe su propio conjunto.

### Recorridos por escuela

- **Gabriela Mistral · 3.º año · 3.er bimestre 2026**
- **Sistemas Informáticos · CFP 7 · 2026**

Cada material tiene una única página. Un mismo material puede formar parte de más de un recorrido; los recorridos lo referencian sin duplicar el contenido.

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

- Node.js 22 o superior, en una versión par;
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
