// Herramienta de corrección y análisis de la Evaluación B, con datos ficticios,
// sobre el HTML real en jsdom. Es una copia de la herramienta de la Evaluación A
// que sólo difiere en su bloque CONFIG: el comportamiento común se prueba a fondo
// en tests/herramienta-evaluacion-a.test.mjs; aquí, la configuración de B, que
// las copias no se separen y un recorrido corto con la clave y los ejes de B.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SI = join(root, "evaluaciones", "sistemas-informaticos");
const EVALUACION = join(SI, "evaluacion-b");
const html = readFileSync(join(EVALUACION, "herramienta", "index.html"), "utf8");
const htmlA = readFileSync(join(SI, "evaluacion-a", "herramienta", "index.html"), "utf8");

const CONFIG = /\n {2}\/\/ <CONFIG>[^\n]*\n[\s\S]*?\n {2}\/\/ <\/CONFIG>[^\n]*\n/;
const ejesDe = (h) => JSON.parse(h.match(/const EJES = (\[[\s\S]*?\n {2}\]);/)[1]);
const EJES = ejesDe(html);
const ACEPTADAS = JSON.parse(html.match(/const ACEPTADAS = (\[[\s\S]*?\]\s*\]);/)[1]);
// Objeto literal propio del archivo (claves numéricas, no es JSON).
const IDEAS = new Function(`return ${html.match(/const IDEAS = (\{[\s\S]*?\n {2}\});/)[1]};`)();

function abrir(almacen = null) {
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(w) {
      if (almacen) w.localStorage.setItem("aula-evaluacion-b-v1", almacen);
      w.confirm = () => true;
    },
  });
  const w = dom.window;
  const d = w.document;
  const $ = (id) => d.getElementById(id);
  const tecla = (key, el = d.activeElement) =>
    el.dispatchEvent(new w.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  const escribir = (seq) => {
    for (const m of seq.matchAll(/\{(\w+)\}|./gsu)) tecla(m[1] ?? m[0]);
  };
  const escribirCampo = (id, texto) => {
    $(id).focus();
    $(id).value = texto;
    $(id).dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const valores = () => [...d.querySelectorAll("#grilla .celda .val")].slice(0, 30).map((e) => e.textContent);
  const filas = () => [...d.querySelectorAll("#tabla tbody tr")];
  return { dom, w, d, $, tecla, escribir, escribirCampo, valores, filas };
}

const CLAVE30 = "BCABCCAB DBCABADC CBDABCAD ADBCAD".replace(/ /g, "").split("");
const T = true;
const mal = (...items) => CLAVE30.map((v, i) => (items.includes(i + 1) ? (v === "A" ? "B" : "A") : v));
const almacenCon = (s) => JSON.stringify({ s, filas: [], proximoId: 1, exportado: "" });
const enCarga = (respuestas, cuentan = [T, T, T, T]) =>
  abrir(almacenCon({ curso: "F", estudiante: "Prueba Devolución", respuestas, cuentan, cursor: 30, editando: null }));
const dev = (t) => ({
  breve: t.d.getElementById("devolucionBreve")?.textContent,
  extendida: t.d.getElementById("devolucionExtendida")?.textContent,
  niveles: [...t.d.querySelectorAll("#vivo .ve")].map((e) => e.querySelector(".nivel")?.textContent ?? ""),
  ejes: [...t.d.querySelectorAll("#vivo .ve")].map((e) => e.querySelector("b").textContent),
  focos: [...t.d.querySelectorAll("#devolucionBreve .foco")].map((s) => `${s.dataset.ejes}:${s.dataset.nivel}`),
});
const conDev = (respuestas, cuentan) => { const t = enCarga(respuestas, cuentan); const d = dev(t); t.dom.window.close(); return d; };
const importarArchivo = async (t, texto) => {
  const archivo = new t.w.File([texto], "respuestas-ficticias.tsv", { type: "text/tab-separated-values" });
  const input = t.$("archivoImport");
  Object.defineProperty(input, "files", { value: [archivo], configurable: true });
  t.$("avisoImport").textContent = "";
  input.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  for (let espera = 0; !t.$("avisoImport").textContent && espera < 2000; espera += 5) {
    await new Promise((r) => setTimeout(r, 5));
  }
};

// Temporal: mientras A y B sean copias, sólo pueden diferir en el bloque CONFIG.
// Cuando el motor común pase a un archivo propio, esta prueba se reemplaza.
test("A y B son el mismo código fuera de su bloque CONFIG", () => {
  for (const h of [html, htmlA]) assert.equal(h.match(new RegExp(CONFIG.source, "g"))?.length, 1, "un solo bloque CONFIG");
  assert.equal(html.replace(CONFIG, "\n"), htmlA.replace(CONFIG, "\n"));
  const nombres = (h) => [...h.match(CONFIG)[0].matchAll(/^ {2}const (\w+) =/gm)].map((m) => m[1]);
  assert.deepEqual(nombres(html), nombres(htmlA), "las dos configuraciones declaran lo mismo");
  assert.deepEqual(nombres(html), ["EVALUACION", "TITULO", "BAJADA", "CLAVE_LOCAL", "PARTES", "ACEPTADAS", "NOTA_CLAVE", "EJES", "IDEAS"]);
});

test("la clave de la herramienta B coincide con clave-docente.md versionada", () => {
  const md = readFileSync(join(EVALUACION, "clave-docente.md"), "utf8");
  const filas = [...md.matchAll(/^\| (\d+) \| ((?:\*\*[A-D](?:\+[A-D])*\*\*(?:, )?)+) \|/gm)];
  const desdeMd = filas.map((f) => [...f[2].matchAll(/\*\*([A-D](?:\+[A-D])*)\*\*/g)].map((m) => m[1]));
  assert.deepEqual(filas.map((f) => Number(f[1])), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.ok(desdeMd.every((a) => a.length === 1), "en B cada ítem tiene una sola respuesta aceptada");
  assert.deepEqual(ACEPTADAS, desdeMd);
  assert.deepEqual(ACEPTADAS.map((a) => a[0]), CLAVE30);
});

test("los ejes de B coinciden con analisis-de-items.md (columna de B, sólo ítems principales)", () => {
  const md = readFileSync(join(EVALUACION, "analisis-de-items.md"), "utf8");
  const tabla = md.split("## Cobertura")[1].split("\n## ")[0];
  const numeros = (x) => x.split(",").map((n) => Number(n.trim())).filter(Boolean);
  const desdeMd = [...tabla.matchAll(/^\| ([^|]+?) \| [^|]+ \| ([\d, ]+)(?:\([^)]*\))? *\|$/gm)]
    .map((m) => ({ nombre: m[1].trim(), items: numeros(m[2]) }));
  assert.equal(desdeMd.length, 8);
  assert.deepEqual(EJES.map(({ nombre, items }) => ({ nombre, items })), desdeMd);
  // Los mismos ejes que A, con los mismos ids, rótulos y orden: sólo cambian los ítems.
  const sinItems = (ejes) => ejes.map(({ id, nombre, corto, foco }) => ({ id, nombre, corto, foco }));
  assert.deepEqual(sinItems(EJES), sinItems(ejesDe(htmlA)));
  assert.deepEqual(EJES.map((e) => e.id), ["hw", "datos", "es", "cpu", "ram", "estado", "so", "repr"]);
  // Todos los ítems tienen eje; el 28 es el único en dos (RAM y almacenamiento; SO).
  const todos = EJES.flatMap((e) => e.items);
  assert.deepEqual([...new Set(todos)].sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual(todos.filter((n, k) => todos.indexOf(n) !== k), [28]);
  assert.deepEqual(EJES.filter((e) => e.items.includes(28)).map((e) => e.id), ["ram", "so"]);
});

test("IDEAS de B: una por ítem, como frase nominal", () => {
  assert.deepEqual(Object.keys(IDEAS).map(Number).sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1));
  for (const [n, idea] of Object.entries(IDEAS)) {
    assert.ok(typeof idea === "string" && idea.length > 10, `ítem ${n}`);
    assert.doesNotMatch(idea, /^[A-ZÁÉÍÓÚ]|\.$|\d/, `ítem ${n}: frase nominal en minúscula, sin punto ni cifras`);
  }
  assert.match(IDEAS[30], /drivers/);
  assert.match(IDEAS[28], /encender/);
});

test("B: identidad, leyenda sin particularidades y columnas iguales", () => {
  const t = abrir();
  assert.equal(t.d.title, "Corrección y análisis · Evaluación B");
  assert.equal(t.d.querySelector("h1").textContent, "Corrección y análisis · Evaluación B");
  assert.match(t.d.querySelector(".bajada").textContent, /^Carga de respuestas, resultados y devolución pedagógica · Sistemas Informáticos$/);
  const leyenda = t.$("leyenda").textContent.replace(/\s+/g, " ");
  assert.match(leyenda, /Según clave-docente\.md\. En blanco, varias letras y letras fuera de opciones no suman\./);
  assert.match(leyenda, /lo que acepta la clave; nunca junto/);
  assert.doesNotMatch(leyenda, /18|B\+D|salvo/);
  assert.equal(t.d.querySelectorAll(".ancho").length, 0, "ninguna columna ancha: no hay ítems con varias aceptadas");
  // Sintesis: rótulos de los ocho ejes, iguales a los de A.
  assert.deepEqual([...t.d.querySelectorAll("#cabResp .s.eje")].map((e) => e.textContent), EJES.map((e) => e.corto));
  assert.match(t.d.querySelector("#cabResp .s.eje:nth-of-type(6)").title, /RAM, almacenamiento y recorrido · ítems 7, 13, 22, 28/);
  t.dom.window.close();
});

test("B: carga con teclado, múltiple, guardado bajo su clave y TSV SI-B de 37 columnas", () => {
  const t = abrir();
  const { $ } = t;
  t.escribirCampo("curso", "3.º Ficticio");
  t.tecla("Enter");
  t.escribirCampo("estudiante", "Prueba B Uno");
  t.tecla("Enter");
  assert.equal(t.d.activeElement, $("zona"));
  // 1–27 según la clave; 28 con dos marcas (B+C); 29 y 30 bien.
  t.escribir(CLAVE30.slice(0, 27).join(" "));
  t.escribir("B+C{Enter}");
  t.escribir(CLAVE30.slice(28).join(""));
  assert.equal(t.valores()[27], "B+C");
  assert.equal($("titular").textContent, "Completa");
  // En vivo: el 28 incorrecto descuenta en RAM (3/4) y en SO (4/5) a la vez.
  assert.equal(t.d.querySelector("#vivo .vp.global b").textContent, "29/30 · 97 %");
  assert.deepEqual([...t.d.querySelectorAll("#vivo .ve b")].map((b) => b.textContent), ["3/3", "4/4", "5/5", "2/2", "3/4", "5/5", "4/5", "3/3"]);
  t.tecla("Enter");
  assert.equal(t.filas().length, 1);
  const guardado = JSON.parse(t.w.localStorage.getItem("aula-evaluacion-b-v1"));
  assert.equal(guardado.filas[0].respuestas[27], "B+C");
  assert.equal(t.w.localStorage.getItem("aula-evaluacion-a-v1"), null, "no escribe en el almacenamiento de A");
  // Corrección roja con la clave de B: «C» en el 28, ✓ en el 1.
  const v = t.filas()[0].querySelectorAll(".v");
  assert.equal(v[27].querySelector(".corr").textContent, "C");
  assert.equal(v[0].querySelector(".corr").textContent, "✓");
  const lineas = $("vista").textContent.trimEnd().split("\n").map((l) => l.split("\t"));
  assert.equal(lineas.length, 2);
  assert.ok(lineas.every((l) => l.length === 37));
  assert.deepEqual(lineas[0].slice(0, 4), ["evaluacion", "curso", "estudiante", "i01"]);
  assert.deepEqual(lineas[0].slice(-4), ["parte1_cuenta", "parte2_cuenta", "parte3_cuenta", "parte4_cuenta"]);
  assert.deepEqual(lineas[1].slice(0, 3), ["SI-B", "3.º Ficticio", "Prueba B Uno"]);
  assert.equal(lineas[1][3 + 27], "B+C");
  assert.deepEqual(lineas[1].slice(-4), ["1", "1", "1", "1"]);
  // Recargar: sigue bajo la clave de B.
  const r = abrir(t.w.localStorage.getItem("aula-evaluacion-b-v1"));
  assert.equal(r.filas().length, 1);
  r.dom.window.close();
  t.dom.window.close();
});

test("B: importa su propio TSV y rechaza uno de la Evaluación A", async () => {
  const t = abrir();
  const cab = ["evaluacion", "curso", "estudiante", ...Array.from({ length: 30 }, (_, i) => `i${String(i + 1).padStart(2, "0")}`),
    "parte1_cuenta", "parte2_cuenta", "parte3_cuenta", "parte4_cuenta"].join("\t");
  const fila = (ev) => [ev, "F", "Prueba Importada", ...mal(6, 20), "1", "1", "1", "1"].join("\t");
  await importarArchivo(t, `${cab}\n${fila("SI-A")}\n`);
  assert.match(t.$("avisoImport").textContent, /evaluacion es «SI-A»; se esperaba «SI-B»/);
  assert.equal(t.filas().length, 0);
  const propio = `${cab}\n${fila("SI-B")}\n`;
  await importarArchivo(t, propio);
  assert.match(t.$("avisoImport").textContent, /Importadas 1/);
  assert.equal(t.$("vista").textContent, propio, "se reexporta idéntico");
  t.dom.window.close();
});

test("devolución de B: el 28 cuenta en RAM y en SO; CPU con dos ítems llega a «repasar»", () => {
  assert.deepEqual(conDev(CLAVE30).breve, "Bien: seguir así.");
  // Sólo el 28: un error en cada eje, ningún tema marcado.
  const solo28 = conDev(mal(28));
  assert.equal(solo28.breve, "Revisar los errores marcados.");
  assert.deepEqual(solo28.ejes, ["3/3", "4/4", "5/5", "2/2", "3/4", "5/5", "4/5", "3/3"]);
  // El 28 con un error más en cada eje: los dos ejes se marcan con la misma idea.
  const ambos = conDev(mal(28, 7, 8));
  assert.equal(ambos.breve, "Repasar: RAM y almacenamiento; sistema operativo.");
  assert.deepEqual(ambos.focos, ["ram:repasar", "so:repasar"]);
  assert.equal(ambos.extendida,
    "Conviene repasar RAM y almacenamiento: qué información está en uso (RAM) y qué información queda guardada (almacenamiento); " +
    "qué pasa al encender, cuando el sistema operativo guardado se carga en la RAM. " +
    "También repasá sistema operativo: qué es un sistema operativo frente a las aplicaciones y los archivos; " +
    "qué pasa al encender, cuando el sistema operativo guardado se carga en la RAM.");
  // El 28 decide: con 7 y 13, RAM pasa a mayoría (3 de 4); SO sigue con un solo error.
  const ram = conDev(mal(7, 13, 28));
  assert.equal(ram.breve, "Volver a estudiar: RAM y almacenamiento.");
  assert.deepEqual(ram.niveles, ["", "", "", "", "volver a estudiar", "", "", ""]);
  // CPU y memoria tiene dos ítems en B: como mucho «repasar» (en A, con tres, sería «volver»).
  assert.equal(conDev(mal(6, 20)).breve, "Repasar: CPU y memoria.");
  // Par CPU + RAM con la misma intensidad: se nombran juntos.
  assert.equal(conDev(mal(6, 20, 7, 22)).breve, "Repasar: CPU, RAM y almacenamiento.");
  // Estado tiene cinco ítems en B (con el 27): 3 de 5 es «volver».
  assert.equal(conDev(mal(14, 17, 27)).breve, "Volver a estudiar: estado.");
  // Sin la Parte 4, el 28 no cuenta en ningún eje.
  assert.equal(conDev(mal(7, 28), [T, T, T, false]).breve, "Revisar los errores marcados.");
});

test("devolución de B: todo eje con indicación aparece, con su intensidad, y ningún otro", () => {
  const PARTE = (n) => (n <= 8 ? 0 : n <= 16 ? 1 : n <= 24 ? 2 : 3);
  const nivel = (respuestas, cuentan, e) => {
    const items = e.items.filter((n) => cuentan[PARTE(n)]);
    const errores = items.filter((n) => { const v = respuestas[n - 1]; return !v.includes("?") && !ACEPTADAS[n - 1].includes(v); }).length;
    return errores < 2 ? "" : items.length >= 3 && 2 * errores > items.length ? "volver" : "repasar";
  };
  let semilla = 20261008;
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
  let conFocos = 0;
  for (let caso = 0; caso < 150; caso++) {
    const respuestas = CLAVE30.map((v) => {
      const r = azar();
      if (r < 0.3) return v === "A" ? "B" : "A";
      if (r < 0.34) return "-";
      if (r < 0.37) return "?";
      return v;
    });
    const cuentan = [0, 1, 2, 3].map(() => azar() > 0.15);
    if (!cuentan.some(Boolean)) continue;
    const esperados = Object.fromEntries(EJES.map((e) => [e.id, nivel(respuestas, cuentan, e)]).filter(([, n]) => n));
    const t = enCarga(respuestas, cuentan);
    const marcados = (id) => Object.fromEntries([...t.d.querySelectorAll(`#${id} .foco`)]
      .flatMap((s) => s.dataset.ejes.split(" ").map((k) => [k, s.dataset.nivel])));
    assert.deepEqual(marcados("devolucionBreve"), esperados, `caso ${caso}: breve`);
    assert.deepEqual(marcados("devolucionExtendida"), esperados, `caso ${caso}: extendida`);
    if (Object.keys(esperados).length) conFocos++;
    t.dom.window.close();
  }
  assert.ok(conFocos > 50, `casos con focos: ${conFocos}`);
});
