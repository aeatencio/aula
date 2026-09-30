// Genera los PDF de la Evaluación B a partir de evaluacion.html.
//
//   node generar-pdf.mjs
//
// Escribe en la carpeta superior las variantes oficio 216 × 356 y 216 × 340 mm
// y muestra, por cara, el espacio libre en mm (con el contenido apilado arriba; negativo =
// desborda) y el desborde horizontal (debe ser 0).
//
// Requisitos de este script:
// - Node.js 22 o superior;
// - WSL con Chrome o Edge de Windows (se usan en modo headless);
// - la fuente Segoe UI, que viene con Windows. Sin ella el navegador usa
//   otra tipografía y la composición puede cambiar: medir antes de imprimir.
// En otro sistema, alcanza con cambiar `navegadores` y `ventana` para usar un
// Chrome local con rutas nativas.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = dirname(aqui);
const intermedios = mkdtempSync(join(tmpdir(), "aula-evaluacion-b-pdf-"));
mkdirSync(join(intermedios, "perfil-navegador"), { recursive: true });

const navegadores = [
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
  "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const navegador = navegadores.find((ruta) => existsSync(ruta));
if (!navegador) throw new Error("No se encontró Chrome ni Edge de Windows");

// Chrome de Windows necesita rutas de Windows (\\wsl.localhost\... desde WSL).
const ventana = (ruta) => execFileSync("wslpath", ["-w", ruta]).toString().trim();
const urlArchivo = (ruta) => `file:///${ventana(ruta).replaceAll("\\", "/")}`;
const perfil = ventana(join(intermedios, "perfil-navegador"));

const fuente = readFileSync(join(aqui, "evaluacion.html"), "utf8");

const medir = `
<style>.items { justify-content: flex-start !important; } .items > .bloque { flex: 0 0 auto !important; justify-content: flex-start !important; }</style>
<script>
  window.addEventListener("load", () => {
    const mm = 96 / 25.4;
    const caras = [...document.querySelectorAll(".pagina")].map((pagina) => {
      const rect = pagina.getBoundingClientRect();
      const estilo = getComputedStyle(pagina);
      const tope = rect.bottom - parseFloat(estilo.paddingBottom);
      const limite = rect.right - parseFloat(estilo.paddingRight);
      let fondo = 0;
      let derecha = 0;
      pagina.querySelectorAll(".contenido *:not(.items)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height) fondo = Math.max(fondo, r.bottom);
        if (r.width) derecha = Math.max(derecha, r.right);
      });
      return {
        cara: pagina.id,
        libreMm: Math.round(((tope - fondo) / mm) * 10) / 10,
        desbordeDerechaMm: Math.round((Math.max(0, derecha - limite) / mm) * 10) / 10,
      };
    });
    document.body.setAttribute("data-medicion", JSON.stringify(caras));
  });
</script>`;

// El tamaño físico se cambia sólo en la regla @page y en --alto-pagina.
function variante(alto) {
  return fuente
    .replace("size: 216mm 356mm;", `size: 216mm ${alto}mm;`)
    .replace("--alto-pagina: 356mm;", `--alto-pagina: ${alto}mm;`);
}

function chrome(args) {
  return execFileSync(
    navegador,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-breakpad",
      `--user-data-dir=${perfil}`,
      ...args,
    ],
    // stderr descartado: con el perfil en el disco de WSL, Chrome emite avisos
    // LockFileEx inofensivos.
    { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
  ).toString();
}

try {
  for (const alto of [356, 340]) {
    const html = variante(alto);
    const htmlLimpio = join(intermedios, `evaluacion-216x${alto}.html`);
    const htmlMedicion = join(intermedios, `medicion-216x${alto}.html`);
    writeFileSync(htmlLimpio, html);
    writeFileSync(htmlMedicion, html.replace("</body>", `${medir}\n</body>`));

    const dom = chrome(["--virtual-time-budget=4000", "--dump-dom", urlArchivo(htmlMedicion)]);
    const medicion = JSON.parse(
      (dom.match(/data-medicion="([^"]*)"/)?.[1] ?? "[]").replaceAll("&quot;", '"'),
    );

    const pdf = join(salida, `evaluacion-oficio-216x${alto}.pdf`);
    chrome(["--no-pdf-header-footer", "--virtual-time-budget=4000", `--print-to-pdf=${ventana(pdf)}`, urlArchivo(htmlLimpio)]);

    console.log(`216x${alto}: ${pdf}`);
    for (const m of medicion) console.log(`  ${m.cara}: libre ${m.libreMm} mm, desborde horizontal ${m.desbordeDerechaMm} mm`);
    if (medicion.length !== 4 || medicion.some((m) => m.libreMm < 0 || m.desbordeDerechaMm > 0)) {
      throw new Error(`La variante 216x${alto} requiere ajustar la maquetación`);
    }
  }
} finally {
  rmSync(intermedios, { recursive: true, force: true });
}
