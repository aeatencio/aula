// Regenera los PDF de «Repetir» desde las páginas construidas:
//
//   npm run pdf:repetir        (hace astro build y después corre este script)
//
// - public/materiales/repetir/repetir-hoja-a4.pdf      ← /repetir/hoja/
// - public/materiales/repetir/repetir-papelitos-a4.pdf ← /repetir/papelitos/
//
// Sirve dist/ con un servidor propio y usa Chrome o Edge sin interfaz. Antes de
// imprimir mide, en cada página A4 y en cada papelito, cuánto espacio queda
// abajo y si algo desborda a lo ancho: si algo desborda, no escribe el PDF.
// Después comprueba la cantidad de páginas de cada PDF.
//
// Navegador: la variable CHROME, si está; si no, Chrome o Edge de Windows
// (desde WSL) o un Chrome/Chromium local. Las medidas usan la fuente Segoe UI,
// que viene con Windows: con otra fuente la composición puede cambiar.

import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(raiz, "dist");
const destino = join(raiz, "public", "materiales", "repetir");

const PDFS = [
  { ruta: "/repetir/hoja/", archivo: "repetir-hoja-a4.pdf", paginas: 2 },
  { ruta: "/repetir/papelitos/", archivo: "repetir-papelitos-a4.pdf", paginas: 1 },
];

/* ---------------------------------------------------------------------- */
/* Navegador                                                              */
/* ---------------------------------------------------------------------- */

const enPath = (nombre) => {
  try {
    return execFileSync("which", [nombre], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || undefined;
  } catch {
    return undefined;
  }
};

const WINDOWS = [
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
  "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const navegador =
  process.env.CHROME ||
  WINDOWS.find((ruta) => existsSync(ruta)) ||
  ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].map(enPath).find(Boolean) ||
  ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((ruta) => existsSync(ruta));
if (!navegador) {
  console.error("No se encontró Chrome ni Edge. Indicá cuál usar con la variable CHROME.");
  process.exit(1);
}

/** Chrome de Windows necesita rutas de Windows. */
const deWindows = navegador.endsWith(".exe");
const ruta = (local) => (deWindows ? execFileSync("wslpath", ["-w", local]).toString().trim() : local);

const temporal = mkdtempSync(join(tmpdir(), "pdf-repetir-"));
/*
  Asíncrono a propósito: el servidor de dist/ corre en este mismo proceso y
  tiene que poder responderle al navegador mientras se espera. Con un timeout,
  por si el navegador no llega al servidor.
*/
const chrome = async (args) =>
  (
    await promisify(execFile)(
      navegador,
      ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${ruta(temporal)}`, "--virtual-time-budget=4000", ...args],
      { maxBuffer: 64 * 1024 * 1024, timeout: 120_000 },
    )
  ).stdout.toString();

/* ---------------------------------------------------------------------- */
/* Servidor de dist/, con la medición agregada a pedido (?medir)          */
/* ---------------------------------------------------------------------- */

const MEDIR = `<script>
addEventListener("load", () => setTimeout(() => {
  // Medir la composición de impresión, aunque la vista web muestre una sola copia.
  for (const hoja of document.styleSheets) {
    for (const regla of hoja.cssRules) {
      if (!(regla instanceof CSSMediaRule)) continue;
      if (regla.media.mediaText.includes("screen")) regla.media.mediaText = "not all";
      else if (regla.media.mediaText === "print") regla.media.mediaText = "all";
    }
  }
  const mm = 96 / 25.4;
  const medidas = [...document.querySelectorAll(".pagina, .papelito")].map((p, i) => {
    const r = p.getBoundingClientRect();
    const e = getComputedStyle(p);
    const pie = p.querySelector(".pie");
    const tope = Math.min(r.bottom - parseFloat(e.paddingBottom), pie ? pie.getBoundingClientRect().top : Infinity);
    let fondo = 0, derecha = 0;
    for (const el of p.querySelectorAll("*")) {
      // El pie va abajo a propósito; las columnas del papelito se estiran hasta el borde.
      if (el.closest(".pie") || el.matches(".columnas, .columnas > div")) continue;
      const b = el.getBoundingClientRect();
      if (b.height) fondo = Math.max(fondo, b.bottom);
      if (b.width) derecha = Math.max(derecha, b.right);
    }
    return {
      nombre: p.id || "papelito " + (i + 1),
      libreMm: Math.round(((tope - fondo) / mm) * 10) / 10,
      desbordeMm: Math.round((Math.max(0, derecha - (r.right - parseFloat(e.paddingRight))) / mm) * 10) / 10,
    };
  });
  document.body.setAttribute("data-medicion", JSON.stringify(medidas));
}, 300));
</script>`;

const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".pdf": "application/pdf" };

const servidor = createServer((pedido, respuesta) => {
  const url = new URL(pedido.url ?? "/", "http://localhost");
  let archivo = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!archivo.startsWith(dist)) return respuesta.writeHead(403).end();
  if (url.pathname.endsWith("/")) archivo = join(archivo, "index.html");
  if (!existsSync(archivo)) return respuesta.writeHead(404).end();
  let cuerpo = readFileSync(archivo);
  if (url.searchParams.has("medir") && archivo.endsWith(".html")) cuerpo = cuerpo.toString().replace("</body>", `${MEDIR}</body>`);
  respuesta.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] ?? "application/octet-stream" }).end(cuerpo);
});

/* ---------------------------------------------------------------------- */

if (!existsSync(join(dist, "repetir", "hoja", "index.html"))) {
  console.error("Falta dist/. Usá npm run pdf:repetir, que construye el sitio antes.");
  process.exit(1);
}

await new Promise((listo) => servidor.listen(0, listo));
const base = `http://localhost:${servidor.address().port}`;
let fallas = 0;

/*
  Desde WSL, Windows tarda un momento en ver un puerto nuevo: las primeras
  conexiones pueden rechazarse. Por eso la medición, que es la primera, se
  reintenta.
*/
async function medir(pagina) {
  for (let intento = 1; intento <= 6; intento++) {
    const dom = await chrome(["--dump-dom", `${base}${pagina}?medir`]);
    const medidas = JSON.parse((dom.match(/data-medicion="([^"]*)"/)?.[1] ?? "[]").replaceAll("&quot;", '"'));
    if (medidas.length > 0) return medidas;
    await new Promise((listo) => setTimeout(listo, 1500));
  }
  throw new Error(`No se pudo medir ${pagina}: el navegador no llegó al servidor`);
}

try {
  for (const { ruta: pagina, archivo, paginas } of PDFS) {
    const medidas = await medir(pagina);
    console.log(pagina);
    const desborda = medidas.filter((m) => m.libreMm < 0 || m.desbordeMm > 0);
    for (const m of medidas) console.log(`  ${m.nombre}: libre ${m.libreMm} mm, desborde horizontal ${m.desbordeMm} mm`);
    if (desborda.length) {
      console.error(`  ✗ desborda: no se escribe ${archivo}`);
      fallas++;
      continue;
    }

    const pdf = join(destino, archivo);
    await chrome(["--no-pdf-header-footer", `--print-to-pdf=${ruta(pdf)}`, `${base}${pagina}`]);
    const contadas = (readFileSync(pdf, "latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
    if (contadas !== paginas) {
      console.error(`  ✗ ${archivo}: ${contadas} páginas; se esperaban ${paginas}`);
      fallas++;
    } else {
      console.log(`  ✓ ${archivo}: ${paginas} ${paginas === 1 ? "página" : "páginas"}`);
    }
  }
} finally {
  servidor.close();
  rmSync(temporal, { recursive: true, force: true });
}

process.exit(fallas ? 1 : 0);
