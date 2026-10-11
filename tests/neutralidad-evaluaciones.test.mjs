// Las Evaluaciones A y B de Sistemas Informáticos son instrumentos neutrales:
// ninguna superficie propia (fuentes, PDF y sus metadatos, claves, análisis,
// LEEME, herramientas, sus pruebas y scripts) las asocia a una escuela, curso,
// recorrido o fecha de toma. Alcance acotado a esos artefactos: otros
// materiales de Aula pueden pertenecer legítimamente a una institución.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SI = join(root, "evaluaciones", "sistemas-informaticos");
const archivos = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === "regenerado" ? [] : archivos(join(dir, e.name))) : [join(dir, e.name)]);
const CORPUS = [
  ...archivos(join(SI, "evaluacion-a")),
  ...archivos(join(SI, "evaluacion-b")),
  ...["herramienta-evaluacion-a", "herramienta-evaluacion-b", "herramienta-cierre"].map((t) => join(root, "tests", `${t}.test.mjs`)),
];

// Identificadores institucionales conocidos y formas de contar la toma.
const INSTITUCIONAL = [
  /mistral/i, /gabriela/i, /\bGM\b/, /\bgm-\d/i, /escuelas\//i, /recorridos\.ts/i,
  /3\.er bimestre/i, /bimestre 2026/i, /\b29\/09\b/, /\b06\/10\b/,
  /tras la toma/i, /uso registrado/i, /se tomó/i, /recuperatorio de/i, /para tomarse/i,
];
const hallazgos = (texto) => INSTITUCIONAL.filter((r) => r.test(texto)).map(String);

test("el corpus de las Evaluaciones A y B cubre instrumentos, PDF, claves, análisis, herramientas y pruebas", () => {
  const nombres = CORPUS.map((r) => relative(root, r));
  for (const x of ["a", "b"]) {
    for (const f of ["LEEME.md", "clave-docente.md", "analisis-de-items.md", "fuente/evaluacion.html", "fuente/generar-pdf.mjs",
      "evaluacion-oficio-216x356.pdf", "evaluacion-oficio-216x340.pdf", "herramienta/index.html", "herramienta/LEEME.md"]) {
      assert.ok(nombres.includes(`evaluaciones/sistemas-informaticos/evaluacion-${x}/${f}`), `${x}/${f}`);
    }
  }
  assert.ok(nombres.some((n) => n.endsWith("pruebas-navegador/cierre.mjs")));
});

test("ningún archivo de texto ni nombre de archivo de A y B asocia el instrumento a una institución", () => {
  for (const ruta of CORPUS) {
    const rel = relative(root, ruta);
    assert.deepEqual(hallazgos(rel), [], `nombre: ${rel}`);
    if (ruta.endsWith(".pdf")) continue;
    assert.deepEqual(hallazgos(readFileSync(ruta, "utf8")), [], rel);
  }
});

// ---------- PDF: metadatos y texto visible ----------
// Lectura mínima de PDF (como los genera Chrome/Skia): objetos, streams por
// /Length, mapas ToUnicode de cada fuente y texto de las páginas.
function leerPdf(ruta) {
  const data = readFileSync(ruta);
  const bin = data.toString("latin1");
  const marcas = [...bin.matchAll(/^(\d+) 0 obj/gm)];
  const objs = new Map(marcas.map((m, i) => [Number(m[1]), [m.index + m[0].length, i + 1 < marcas.length ? marcas[i + 1].index : bin.length]]));
  const cuerpo = (n) => bin.slice(...objs.get(n));
  const stream = (n) => {
    const t = cuerpo(n);
    const i = t.search(/stream\r?\n/);
    if (i < 0) return "";
    const ini = i + t.slice(i).match(/stream\r?\n/)[0].length;
    const cab = t.slice(0, i);
    let lon = cab.match(/\/Length\s+(\d+)(\s+0 R)?/);
    let n2 = Number(lon[1]);
    if (lon[2]) n2 = Number(cuerpo(n2).match(/\d+/)[0]);
    const desde = objs.get(n)[0] + ini;
    const raw = data.subarray(desde, desde + n2);
    return (/FlateDecode/.test(cab) ? inflateSync(raw) : raw).toString("latin1");
  };
  const cmap = (texto) => {
    const mapa = new Map();
    for (const [, blk] of texto.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const [, a, b] of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) mapa.set(parseInt(a, 16), Buffer.from(b, "hex").swap16().toString("utf16le"));
    }
    for (const [, blk] of texto.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const [, a, z, b] of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        for (let c = parseInt(a, 16); c <= parseInt(z, 16); c++) mapa.set(c, String.fromCharCode(parseInt(b, 16) + c - parseInt(a, 16)));
      }
    }
    return mapa;
  };
  const info = {};
  for (const k of ["Title", "Subject", "Author", "Keywords", "Creator", "Producer"]) {
    const m = bin.match(new RegExp(`/${k}\\s*(\\((?:\\\\.|[^\\\\)])*\\)|<[0-9A-Fa-f]*>)`));
    if (!m) continue;
    const v = m[1];
    if (v.startsWith("<")) {
      const b = Buffer.from(v.slice(1, -1), "hex");
      info[k] = b[0] === 0xfe ? b.subarray(2).swap16().toString("utf16le") : b.toString("latin1");
    } else {
      const b = Buffer.from(v.slice(1, -1).replace(/\\([()\\])/g, "$1"), "latin1");
      info[k] = b[0] === 0xfe && b[1] === 0xff ? Buffer.from(b.subarray(2)).swap16().toString("utf16le") : b.toString("latin1");
    }
  }
  const paginas = [];
  for (const [n] of objs) {
    const o = cuerpo(n);
    if (!/\/Type\s*\/Page\b/.test(o)) continue;
    const r = o.match(/\/Resources\s+(\d+) 0 R/);
    const res = r ? cuerpo(Number(r[1])) : o;
    const fuentes = new Map();
    const fd = res.match(/\/Font\s*<<([\s\S]*?)>>/);
    for (const [, nombre, f] of fd ? fd[1].matchAll(/\/(\w+)\s+(\d+) 0 R/g) : []) {
      const tu = cuerpo(Number(f)).match(/\/ToUnicode\s+(\d+) 0 R/);
      fuentes.set(nombre, tu ? cmap(stream(Number(tu[1]))) : new Map());
    }
    const cont = o.match(/\/Contents\s*(\[[\s\S]*?\]|\d+ 0 R)/)[1];
    const cs = [...cont.matchAll(/(\d+) 0 R/g)].map(([, k]) => stream(Number(k))).join("");
    let fuente = null;
    let texto = "";
    for (const [, nombre, hex] of cs.matchAll(/\/(\w+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>\s*Tj/g)) {
      if (nombre) fuente = nombre;
      else for (let i = 0; i < hex.length; i += 4) texto += fuentes.get(fuente)?.get(parseInt(hex.slice(i, i + 4), 16)) ?? "";
    }
    paginas.push(texto);
  }
  // Streams no de página (XMP u otros) también se revisan como texto.
  const otros = [...objs.keys()].map((n) => { try { return stream(n); } catch { return ""; } }).join("\n");
  return { info, paginas, otros };
}

for (const x of ["a", "b"]) {
  for (const alto of ["356", "340"]) {
    test(`PDF ${x.toUpperCase()} 216×${alto}: metadatos y texto visible neutrales`, () => {
      const pdf = leerPdf(join(SI, `evaluacion-${x}`, `evaluacion-oficio-216x${alto}.pdf`));
      assert.equal(pdf.info.Title, `Evaluación ${x.toUpperCase()} · Sistemas Informáticos`);
      for (const [k, v] of Object.entries(pdf.info)) assert.deepEqual(hallazgos(v), [], `metadato ${k}: ${v}`);
      assert.equal(pdf.paginas.length, 4);
      const visible = pdf.paginas.join("\n");
      assert.match(visible, /^Evaluación\s*Nombre y apellido:\s*Curso:\s*Fecha:/, "el texto visible se pudo leer");
      assert.match(visible, /Parte 4 · Usar lo que sabés/);
      assert.deepEqual(hallazgos(visible), [], "texto visible");
      assert.deepEqual(hallazgos(pdf.otros), [], "otros streams (XMP, etc.)");
    });
  }
}

test("el <title> de cada fuente es el Title de sus PDF", () => {
  for (const x of ["a", "b"]) {
    const titulo = readFileSync(join(SI, `evaluacion-${x}`, "fuente", "evaluacion.html"), "utf8").match(/<title>([^<]*)<\/title>/)[1];
    assert.equal(titulo, `Evaluación ${x.toUpperCase()} · Sistemas Informáticos`);
  }
});
