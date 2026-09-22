import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const CLAVE =
  "programa · entrada · sistema operativo · almacenamiento · RAM · instrucciones · datos · temporal · CPU · salida · hardware · driver";

const BANCO = [
  "almacenamiento",
  "CPU",
  "datos",
  "driver",
  "entrada",
  "hardware",
  "instrucciones",
  "programa",
  "RAM",
  "salida",
  "sistema operativo",
  "temporal",
];

const ARCHIVOS = {
  "el-sistema-operativo-actividades.docx":
    "c765657213a4a71f628b84c9d4df939db40e6dfe4309f12d32aa7b8517986a5d",
  "el-sistema-operativo-actividades.pdf":
    "4df18174cdeea644588afeaf42645729531d8d8ea4ae229ad690adee34636d20",
  "el-sistema-operativo-ficha.docx":
    "257eec3b265bbb8b436f2e8416f7d34f5b9c355dcada530a5aa39c49ccbd945a",
  "el-sistema-operativo-ficha.pdf":
    "00cea4c9e06206f921ef8e37c72fdc161c05d0ab5a5074013b90821b384cd16e",
  "el-sistema-operativo-guia-de-trabajo.docx":
    "51401fd925ea44823d38bfcc046ddb197065455328d678b362612872457cf475",
  "el-sistema-operativo-guia-de-trabajo.pdf":
    "a12e14f18a38e9f6525ad64679bc700b7dc35c1a0ec884c546ab80eb33dc2955",
};

const PIZARRONES = [
  "/pizarrones/preguntas-y-conceptos-principales/",
  "/pizarrones/hardware-software-y-tarea/",
  "/pizarrones/instrucciones-datos-operaciones-y-resultados/",
  "/pizarrones/entrada-procesamiento-y-salida/",
  "/pizarrones/procesador-y-memoria-durante-la-ejecucion/",
  "/pizarrones/el-estado-de-un-sistema/",
  "/pizarrones/arquitectura-de-von-neumann/",
  "/pizarrones/el-sistema-operativo/",
  "/pizarrones/tres-miradas-sobre-una-situacion/",
];

function requireDist() {
  assert.ok(
    existsSync(join(dist, "index.html")),
    "Falta dist/. Ejecutá npm run build antes de npm test.",
  );
}

function readDist(...parts) {
  requireDist();
  const path = join(dist, ...parts);
  assert.ok(existsSync(path), `Falta ${path}`);
  return readFileSync(path, "utf8");
}

function sinScripts(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "");
}

describe("unidad Sistema operativo", () => {
  it("la actividad está en el build con banco, Revisar y sin clave visible", () => {
    const html = readDist("cuando-se-abre-un-programa", "index.html");
    const visible = sinScripts(html);

    for (const palabra of BANCO) {
      assert.match(visible, new RegExp(palabra));
    }

    assert.match(visible, />Revisar</);
    assert.match(visible, /Vaciar espacios/);
    assert.match(visible, /data-actividad-abrir-programa/);
    assert.doesNotMatch(visible, /Clave del ejercicio/);
    assert.doesNotMatch(visible, new RegExp(CLAVE.replace(/[·]/g, "·")));
    assert.equal(visible.includes(CLAVE), false);
  });

  it("la portada ofrece caminos distintos sin imponer un orden", () => {
    const html = readDist("sistema-operativo", "index.html");
    const visible = sinScripts(html);

    assert.match(visible, /No hace falta hacer todo ni seguir un único orden/);
    assert.match(visible, /Repasar de un vistazo/);
    assert.match(visible, /Estudiar paso a paso/);
    assert.match(visible, /Resolver actividades integradoras/);
    assert.match(visible, /Practicar en pantalla/);
    assert.match(visible, /Pizarrones para estudiar y relacionar ideas/);
    assert.match(visible, /Descargar DOCX editable/);
    assert.doesNotMatch(visible, /El sistema operativopresenta/);
    assert.match(visible, /<details[^>]+id="docentes"[^>]+class="docentes"/);
    assert.doesNotMatch(visible, /Clave de corrección de las 21 actividades/);
    assert.doesNotMatch(visible, /el-sistema-operativo-clave-de-correccion/);
    assert.equal(visible.includes(CLAVE), false);
    assert.match(visible, /data-recorrido-id="gm-2026-2"/);
    assert.match(visible, /data-recorrido-id="cfp7-si-2026"/);

    for (const nombre of Object.keys(ARCHIVOS)) {
      assert.match(
        visible,
        new RegExp(`/materiales/sistema-operativo/${nombre}`),
      );
    }

    for (const href of PIZARRONES) {
      assert.match(visible, new RegExp(`href="${href}"`));
    }
  });

  it("publica intactos los seis archivos previstos y excluye la clave", () => {
    for (const [nombre, hashEsperado] of Object.entries(ARCHIVOS)) {
      const path = join(dist, "materiales", "sistema-operativo", nombre);
      assert.ok(existsSync(path), `Falta ${path}`);
      const contenido = readFileSync(path);
      const hash = createHash("sha256").update(contenido).digest("hex");
      assert.equal(hash, hashEsperado, `${nombre} no coincide con el adjunto`);

      if (nombre.endsWith(".pdf")) {
        assert.equal(contenido.subarray(0, 5).toString("ascii"), "%PDF-");
      } else {
        assert.equal(contenido.subarray(0, 2).toString("ascii"), "PK");
      }
    }

    assert.equal(
      existsSync(
        join(
          dist,
          "materiales",
          "sistema-operativo",
          "el-sistema-operativo-clave-de-correccion.docx",
        ),
      ),
      false,
      "La clave docente no debe formar parte del build público",
    );
  });

  it("el apoyo docente publica la clave y la pregunta inicial", () => {
    const html = readDist("cuando-se-abre-un-programa", "guia", "index.html");
    const visible = sinScripts(html);

    assert.match(visible, /Clave del ejercicio/);
    assert.match(visible, new RegExp(CLAVE));
    assert.match(
      visible,
      /el programa pasa directamente del disco a la pantalla/,
    );
    assert.match(visible, /La CPU guarda todo/);
    assert.match(visible, /localizar/);
  });

  it("el pizarrón existente sigue siendo el de la familia y menciona driver", () => {
    const html = readDist("pizarrones", "el-sistema-operativo", "index.html");
    const visible = sinScripts(html);

    assert.match(visible, /utiliza un driver/);
    assert.match(visible, /Almacenamiento/);
    assert.match(visible, /cuando-se-abre-un-programa/);
    assert.match(visible, /data-recorrido-id="gm-2026-2"/);
  });

  it("los dos recorridos llevan a la familia después del pizarrón", () => {
    const gm = readDist(
      "escuelas",
      "gabriela-mistral",
      "2-cuatrimestre-2026",
      "index.html",
    );
    const cfp = readDist(
      "escuelas",
      "cfp-7",
      "sistemas-informaticos-2026",
      "index.html",
    );

    assert.match(gm, /sistema-operativo\/\?recorrido=gm-2026-2/);
    assert.match(cfp, /sistema-operativo\/\?recorrido=cfp7-si-2026/);
    assert.match(gm, /Recursos/);
    assert.match(cfp, /Recursos/);
    assert.match(gm, /Los pizarrones son la referencia principal/);
    assert.match(gm, /integra y relaciona varios conceptos anteriores/);
    assert.match(gm, /distintas maneras de repasar o practicar/);
    assert.doesNotMatch(gm, /familia<a/);
    assert.match(gm, /Gabriela Mistral · 3.º año · 3.er bimestre 2026/);
    assert.doesNotMatch(gm, /2.º cuatrimestre 2026/);

    const ordenGm = gm.indexOf("el-sistema-operativo");
    const familiaGm = gm.indexOf("sistema-operativo/?recorrido");
    assert.ok(ordenGm !== -1 && familiaGm !== -1 && ordenGm < familiaGm);

    const ordenCfp = cfp.indexOf("el-sistema-operativo");
    const familiaCfp = cfp.indexOf("sistema-operativo/?recorrido");
    assert.ok(ordenCfp !== -1 && familiaCfp !== -1 && ordenCfp < familiaCfp);
  });

  it("la Home enlaza la familia y mantiene secundario el apoyo docente", () => {
    const html = readDist("index.html");
    assert.match(html, /href="\/sistema-operativo\/"/);
    assert.match(html, /href="\/cuando-se-abre-un-programa\/guia\/"/);
    assert.doesNotMatch(html, /Guía para la clase— para conducir/);
    assert.doesNotMatch(
      html,
      /Orientaciones para la actividad interactiva— pregunta inicial/,
    );
  });

  it("no imprime el pie de serie en el pizarrón de Sistema operativo", () => {
    const html = readDist("pizarrones", "el-sistema-operativo", "index.html");
    assert.match(html, /pie-serie--sin-impresion/);
  });

  it("nombra correctamente el recorrido de Gabriela Mistral", () => {
    const escuelas = readDist("escuelas", "index.html");
    const home = readDist("index.html");
    const nombre = /Gabriela Mistral · 3.º año · 3.er bimestre 2026/;

    assert.match(home, nombre);
    assert.match(
      readDist(
        "escuelas",
        "gabriela-mistral",
        "2-cuatrimestre-2026",
        "index.html",
      ),
      nombre,
    );
    assert.match(escuelas, /3.º año · 3.er bimestre 2026/);
    assert.doesNotMatch(escuelas, />2.º cuatrimestre 2026</);
  });
});
