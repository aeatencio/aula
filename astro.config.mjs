import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// Herramientas locales de corrección y análisis de las evaluaciones A y B. Se
// sirven sólo con `astro dev` (apply: "serve"): no son páginas del sitio, no se
// copian a public/ ni entran en dist/.
const HERRAMIENTAS = new Map(
  ["a", "b"].flatMap((x) => {
    const ruta = `/herramientas/evaluacion-${x}/`;
    const html = fileURLToPath(new URL(`./evaluaciones/sistemas-informaticos/evaluacion-${x}/herramienta/index.html`, import.meta.url));
    return [[ruta, html], [`${ruta}index.html`, html]];
  }),
);

const herramientasLocales = {
  name: "aula-herramientas-locales",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const html = HERRAMIENTAS.get((req.url ?? "").split("?")[0]);
      if (!html) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(readFileSync(html));
    });
  },
};

export default defineConfig({
  site: "https://aula.andresatencio.com",
  trailingSlash: "always",
  vite: {
    plugins: [herramientasLocales],
  },
});
