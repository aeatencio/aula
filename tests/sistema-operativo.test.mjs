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
    "0d62817b15d69dccd9a1fd0e745c1e9de51502951c641ad8cea91796a125b13e",
  "el-sistema-operativo-actividades.pdf":
    "ddc51273d306bc6fefe6ab25d0de0a27a15381f69ada8fa6f5e5df34f410bb3c",
  "el-sistema-operativo-ficha.docx":
    "e58a12a0f24049d10f36ea46fa21343b16b3a1022c82d05a0ab96ce27847430c",
  "el-sistema-operativo-ficha.pdf":
    "52dd9620aa61257d64bf708908064757a1ea142a9fd1ad665514bfcd6497ae40",
  "el-sistema-operativo-guia-de-trabajo.docx":
    "a2f0f8c06da0bacfb90d98423d7fd50343f006949efff99ecfe843997ac0d076",
  "el-sistema-operativo-guia-de-trabajo.pdf":
    "5b68bf8cb0850904bd5eb80a83607bb7720dbe6305382e35968a47dbd46a1d7e",
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
