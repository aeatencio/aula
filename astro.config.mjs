import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// Herramienta local de transcripción de la Evaluación A. Se sirve sólo con
// `astro dev` (apply: "serve"): no es una página del sitio, no se copia a
// public/ ni entra en dist/.
const RUTA_TRANSCRIPCION = "/herramientas/transcripcion-evaluacion-a";
const HTML_TRANSCRIPCION = fileURLToPath(
  new URL("./evaluaciones/sistemas-informaticos/evaluacion-a/herramienta-transcripcion/index.html", import.meta.url),
);

const herramientasLocales = {
  name: "aula-herramientas-locales",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const ruta = (req.url ?? "").split("?")[0];
      if (ruta !== `${RUTA_TRANSCRIPCION}/` && ruta !== `${RUTA_TRANSCRIPCION}/index.html`) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(readFileSync(HTML_TRANSCRIPCION));
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
