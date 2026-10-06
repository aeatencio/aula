// Herramienta de transcripción de la Evaluación A, con datos ficticios: se
// maneja la grilla con teclado sobre el HTML real, en jsdom. No usa dist/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVALUACION = join(root, "evaluaciones", "sistemas-informaticos", "evaluacion-a");
const html = readFileSync(join(EVALUACION, "herramienta-transcripcion", "index.html"), "utf8");

function abrir(almacen = null) {
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(w) {
      if (almacen) w.localStorage.setItem("aula-transcripcion-si-a-v1", almacen);
      w.confirmaciones = [];
      w.respuestaConfirm = true;
      w.confirm = (t) => { w.confirmaciones.push(t); return w.respuestaConfirm; };
      w.portapapeles = null;
      Object.defineProperty(w.navigator, "clipboard", {
        value: { writeText: async (t) => { w.portapapeles = t; } },
      });
    },
  });
  const w = dom.window;
  const d = w.document;
  const $ = (id) => d.getElementById(id);
  const tecla = (key, el = d.activeElement) =>
    el.dispatchEvent(new w.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  // Cada carácter es una tecla; los nombres largos van entre llaves: {Enter}.
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
  // Texto de los cuatro resultados de una fila, p. ej. "6/8 · 75 %resp. 8/8".
  const resultados = (n) => [...filas()[n].querySelectorAll(".res")].map((e) => e.textContent);
  return { dom, w, d, $, tecla, escribir, escribirCampo, valores, filas, resultados };
}

const CLAVE_SIMPLE = "B A C B C A B C D B A D B C A C B D A A C B C D C B D A B A";

test("flujo completo sólo con teclado y exportación de varias evaluaciones", async () => {
  const t = abrir();
  const { d, $, w } = t;
  assert.equal(d.activeElement, $("estudiante"), "arranca en el campo Estudiante");

  // 1) 30 respuestas simples, separadas por espacios como al dictar.
  t.escribirCampo("curso", "3.º A");
  t.tecla("Enter");
  assert.equal(d.activeElement, $("estudiante"));
  t.escribirCampo("estudiante", "Prueba Uno");
  t.tecla("Enter");
  assert.equal(d.activeElement, $("zona"));
  t.escribir(CLAVE_SIMPLE);
  assert.equal($("titular").textContent, "Completa");
  t.escribir("A"); // letra de más: no debe pisar el 30
  assert.match($("mensaje").textContent, /sobra una letra/);
  assert.equal(t.valores()[29], "A");
  t.tecla("Enter");
  assert.equal(t.filas().length, 1);
  assert.equal(d.activeElement, $("estudiante"));
  assert.equal($("curso").value, "3.º A", "el curso se conserva para la siguiente");

  // 2) Vacías, múltiple, ilegible, dudosa, D fuera de opciones, corrección.
  t.escribirCampo("estudiante", "Ñandú O'Ficticio, Prueba «Pepe»");
  t.tecla("Enter");
  t.escribir("BA");
  t.escribir("D"); // ítem 3 sólo tiene A–C: pide confirmación y no avanza
  assert.equal($("titular").textContent, "Ítem 3");
  assert.equal(t.valores()[2], "·");
  t.escribir("D"); // segunda D: queda registrada y marcada
  assert.equal(t.valores()[2], "D");
  assert.ok(d.querySelectorAll(".celda")[2].classList.contains("rango"));
  t.escribir("C"); // ítem 4
  t.escribir("?"); // ítem 5 ilegible
  t.escribir("--"); // 6 y 7 en blanco
  t.escribir("E"); // tecla inválida: no cambia nada
  assert.match($("mensaje").textContent, /no es una opción/);
  assert.equal($("titular").textContent, "Ítem 8");
  t.escribir("C D B A"); // 8, 9, 10, 11
  t.escribir("{ArrowLeft}{ArrowLeft}?"); // 10 dudosa
  assert.equal(t.valores()[9], "B?");
  t.escribir("{ArrowRight}{ArrowRight}"); // vuelve al 12
  t.escribir("A B C A C B"); // 12–17
  t.escribir("b+d{Enter}"); // 18 = B+D, de forma natural
  assert.equal(t.valores()[17], "B+D");
  t.escribir("A A C"); // 19–21, pero en el papel el 21 dice B
  t.escribir("{Backspace}B"); // retroceso corrige la última
  t.escribir("C C - D B C A B A"); // 22–30
  assert.equal($("titular").textContent, "Completa");
  // corrección posterior: ir al 12 con números
  t.escribir("12");
  assert.equal($("titular").textContent, "Ítem 12");
  t.escribir("D");
  assert.equal(t.valores()[11], "D");
  t.tecla("Enter");
  assert.equal(t.filas().length, 2);

  // 3) Evaluación incompleta: Enter lleva al primer faltante.
  t.escribirCampo("estudiante", "Prueba\tTres\n");
  t.tecla("Enter");
  t.escribir("ABCABCAB");
  t.escribir("4{Delete}"); // borra el 4
  t.escribir("{End}{Enter}");
  assert.equal(t.filas().length, 2, "no guarda incompleta");
  assert.equal($("titular").textContent, "Ítem 4");
  assert.match($("mensaje").textContent, /Faltan 23 ítems \(4, 9,/);
  t.escribir("A");
  t.escribir("9"); // ya está en el 5: saltar al 9 (inmediato: no hay ítem 90)
  t.escribir("DDDDDDDD CCCCCCCC BBBBBB");
  t.tecla("Enter");
  assert.equal(t.filas().length, 3);

  // 4) Duplicado: pide confirmación; si se rechaza no guarda.
  t.escribirCampo("estudiante", "prueba uno");
  t.tecla("Enter");
  t.escribir(CLAVE_SIMPLE);
  w.respuestaConfirm = false;
  t.tecla("Enter");
  assert.equal(t.filas().length, 3);
  assert.match(w.confirmaciones.at(-1), /Ya hay una evaluación guardada de «prueba uno» en 3.º A/);
  w.respuestaConfirm = true;
  $("btnDescartar").click();
  assert.equal(t.valores().filter((v) => v !== "·").length, 0);

  // Resultados por parte, derivados de la clave.
  assert.deepEqual(t.resultados(0), ["8/8 · 100 %resp. 8/8", "8/8 · 100 %resp. 8/8", "8/8 · 100 %resp. 8/8", "6/6 · 100 %resp. 6/6"]);
  assert.deepEqual(t.resultados(1), [
    "3/8 · 38 %resp. 6/8 · 1 a revisar", // D fuera de opciones, ? ilegible, dos en blanco
    "7/8 · 88 %resp. 8/8 · 1 a revisar", // B? dudosa en el 10 (la clave es B) no suma
    "5/8 · 63 %resp. 7/8", // B+D en el 18 suma; en blanco el 24
    "4/6 · 67 %resp. 6/6",
  ]);
  assert.deepEqual(t.resultados(2), ["1/8 · 13 %resp. 8/8", "2/8 · 25 %resp. 8/8", "2/8 · 25 %resp. 8/8", "2/6 · 33 %resp. 6/6"]);

  // 5) Editar la transcripción de una fila guardada: queda en el mismo lugar
  // y sus resultados se recalculan.
  const editar = t.filas()[0].querySelector('button[data-accion="editar"]');
  assert.equal(editar.textContent, "Editar");
  editar.click();
  assert.equal(d.activeElement, $("zona"));
  assert.match($("edicion").textContent, /fila 1/);
  t.escribir("30B{Enter}");
  assert.equal(t.filas().length, 3);
  assert.equal(t.filas()[0].querySelector("td:nth-child(3)").textContent, "Prueba Uno");
  assert.deepEqual(t.resultados(0), ["8/8 · 100 %resp. 8/8", "8/8 · 100 %resp. 8/8", "8/8 · 100 %resp. 8/8", "5/6 · 83 %resp. 6/6"]);
  t.filas()[0].querySelector('button[data-accion="editar"]').click();
  t.escribir("30-{Enter}");
  assert.deepEqual(t.resultados(0).at(3), "5/6 · 83 %resp. 5/6", "en blanco: ni respondida ni acierto");
  t.filas()[0].querySelector('button[data-accion="editar"]').click();
  t.escribir("30A{Enter}");
  assert.deepEqual(t.resultados(0).at(3), "6/6 · 100 %resp. 6/6");
  t.filas()[0].querySelector('button[data-accion="editar"]').click();
  t.escribir("30B{Enter}");
  assert.match($("estadoExport").textContent, /sin exportar/);

  // 6) Exportación.
  $("btnCopiar").click();
  await new Promise((r) => setTimeout(r, 0));
  // Esquema TSV (séptima iteración): las 30 respuestas siguen en las mismas
  // columnas; al final, cuatro columnas explícitas de partes contabilizadas.
  const cab = ["evaluacion", "curso", "estudiante", ...Array.from({ length: 30 }, (_, i) => `i${String(i + 1).padStart(2, "0")}`),
    "parte1_cuenta", "parte2_cuenta", "parte3_cuenta", "parte4_cuenta"];
  const todas = ["1", "1", "1", "1"];
  const esperado = [
    cab,
    ["SI-A", "3.º A", "Prueba Uno", ...CLAVE_SIMPLE.split(" ").slice(0, 29), "B", ...todas],
    ["SI-A", "3.º A", "Ñandú O'Ficticio, Prueba «Pepe»",
      "B", "A", "D", "C", "?", "-", "-", "C", "D", "B?", "A", "D", "B", "C", "A", "C", "B", "B+D",
      "A", "A", "B", "C", "C", "-", "D", "B", "C", "A", "B", "A", ...todas],
    ["SI-A", "3.º A", "Prueba Tres", ..."ABCABCAB", ..."DDDDDDDD", ..."CCCCCCCC", ..."BBBBBB", ...todas],
  ].map((l) => l.join("\t")).join("\n") + "\n";
  assert.equal(w.portapapeles, esperado);
  assert.equal($("vista").textContent, esperado);
  assert.match($("estadoExport").textContent, /sin cambios/);
  for (const linea of esperado.trimEnd().split("\n")) assert.equal(linea.split("\t").length, 37);
  t.dom.window.close();
});

test("navegación: números, flechas y teclas de control", () => {
  const t = abrir();
  const { $ } = t;
  $("zona").focus();
  t.escribir("4");
  assert.equal($("titular").textContent, "Ítem 4");
  t.escribir("3{Enter}");
  assert.equal($("titular").textContent, "Ítem 3");
  t.escribir("0");
  assert.match($("mensaje").textContent, /No hay ítem 0/);
  t.escribir("2B");
  assert.equal(t.valores()[1], "B", "«2 B» carga B en el ítem 2 sin esperar");
  assert.equal($("titular").textContent, "Ítem 3");
  t.escribir("2{Escape}C");
  assert.equal(t.valores()[2], "C", "Esc cancela el salto pendiente");
  t.escribir("{Home}{Delete}{ArrowRight}{Delete}{ArrowRight}{Delete}");
  t.escribir("18{ArrowDown}");
  assert.equal($("titular").textContent, "Ítem 26");
  t.escribir("{ArrowUp}{ArrowUp}{ArrowUp}");
  assert.equal($("titular").textContent, "Ítem 2");
  t.escribir("24{ArrowDown}");
  assert.equal($("titular").textContent, "Fin");
  t.escribir("{Home}+{Escape}");
  assert.equal(t.valores()[0], "·", "cancelar varias letras no cambia el ítem");
  t.escribir("+{Enter}");
  assert.equal(t.valores()[0], "·");
  t.escribir("+a{Enter}");
  assert.equal(t.valores()[0], "A", "una sola letra en modo múltiple queda simple");
  t.escribir("{ArrowLeft}??");
  assert.equal(t.valores()[0], "A", "? dos veces quita la marca de duda");
  t.escribir("{Backspace}{Backspace}");
  assert.equal(t.valores()[0], "·");
  assert.equal($("titular").textContent, "Ítem 1");
  t.dom.window.close();
});

test("una evaluación en curso sobrevive a recargar la pestaña", () => {
  const t = abrir();
  t.escribirCampo("estudiante", "Prueba Recarga");
  t.tecla("Enter");
  t.escribir("BAC");
  const almacen = t.w.localStorage.getItem("aula-transcripcion-si-a-v1");
  t.dom.window.close();

  const r = abrir(almacen);
  assert.equal(r.$("estudiante").value, "Prueba Recarga");
  assert.deepEqual(r.valores().slice(0, 4), ["B", "A", "C", "·"]);
  assert.equal(r.$("titular").textContent, "Ítem 4");
  assert.equal(r.d.activeElement, r.$("zona"));
  r.dom.window.close();
});

test("la clave del prototipo coincide con clave-docente.md versionada", () => {
  const md = readFileSync(join(EVALUACION, "clave-docente.md"), "utf8");
  const tabla = md.split("## Clave")[1];
  const desdeMd = [];
  for (const fila of tabla.matchAll(/^\| \d · [^|]+\| [\d–]+ \| ([^|]+) \|$/gm)) {
    const celda = fila[1].trim();
    const items = celda.includes("·") ? celda.split("·") : celda.split(/\s+/);
    for (const item of items) desdeMd.push([...item.matchAll(/\b[A-D](?:\+[A-D])*\b/g)].map((m) => m[0]));
  }
  assert.equal(desdeMd.length, 30);
  assert.deepEqual(desdeMd[17], ["B", "D", "B+D"]);
  assert.match(md, /Ítem 12:\*\* sólo D/);
  assert.match(md, /Un casillero vacío o con dos letras no suma, salvo \*\*B\+D en el ítem 18\*\*/);
  const embebida = JSON.parse(html.match(/const ACEPTADAS = (\[[\s\S]*?\]\s*\]);/)[1]);
  assert.deepEqual(embebida, desdeMd);
});

test("cómputo por parte: ítems 12 y 18, múltiples, dudosas y fuera de opciones", () => {
  const base = "BACBCABC DBADBCAC BBAACBCD CBDABA".replace(/ /g, "").split("");
  const fila = (id, cambios) => {
    const r = [...base];
    for (const [n, v] of Object.entries(cambios)) r[n - 1] = v;
    return { id, curso: "Ficticio", estudiante: `Caso ${id}`, respuestas: r };
  };
  const filas = [
    fila(1, { 18: "D" }),
    fila(2, { 18: "B+D" }),
    fila(3, { 18: "B+D?", 12: "A" }),
    fila(4, { 18: "A+B", 17: "B+C", 12: "D?" }),
    fila(5, { 18: "?", 1: "B+D", 2: "D", 3: "?" }),
    fila(6, { 25: "-", 26: "-", 27: "-", 28: "-", 29: "-", 30: "-" }),
  ];
  const almacen = JSON.stringify({ s: { curso: "", estudiante: "", respuestas: Array(30).fill(null), cursor: 0, editando: null }, filas, proximoId: 7, exportado: "" });
  const t = abrir(almacen);
  const p = (n, parte) => t.resultados(n)[parte - 1];
  assert.equal(p(0, 3), "8/8 · 100 %resp. 8/8", "18 = D suma");
  assert.equal(p(1, 3), "8/8 · 100 %resp. 8/8", "18 = B+D suma");
  assert.equal(p(2, 3), "7/8 · 88 %resp. 8/8 · 1 a revisar", "18 = B+D? no suma: a revisar");
  assert.equal(p(2, 2), "7/8 · 88 %resp. 8/8", "12 = A no suma");
  assert.equal(p(3, 3), "6/8 · 75 %resp. 8/8", "varias letras no suman (17 y 18)");
  assert.equal(p(3, 2), "7/8 · 88 %resp. 8/8 · 1 a revisar", "12 = D? no suma aunque coincida");
  assert.equal(p(4, 1), "5/8 · 63 %resp. 8/8 · 1 a revisar", "B+D en el 1 y D fuera de opciones no suman");
  assert.equal(p(4, 3), "7/8 · 88 %resp. 8/8 · 1 a revisar");
  assert.equal(p(5, 4), "0/6 · 0 %resp. 0/6");
  // La respuesta cruda se exporta intacta.
  assert.match(t.$("vista").textContent, /\tCaso 3\tB\tA\tC\tB\tC\tA\tB\tC\tD\tB\tA\tA\t[^\n]*\tB\+D\?\t/);
  t.dom.window.close();
});

test("corrección roja: sólo capa visual, fuera de la respuesta cruda", () => {
  const base = "BACBCABC DBADBCAC BBAACBCD CBDABA".replace(/ /g, "").split("");
  const fila = (id, cambios) => {
    const r = [...base];
    for (const [n, v] of Object.entries(cambios)) r[n - 1] = v;
    return { id, curso: "Ficticio", estudiante: `Caso ${id}`, respuestas: r };
  };
  const filas = [
    // incorrecta, blanco, múltiple incorrecta, ?, dudosa correcta y dudosa
    // incorrecta, fuera de opciones, 18 incorrecta
    fila(1, { 4: "C", 6: "-", 1: "B+D", 5: "?", 10: "B?", 11: "C?", 3: "D", 18: "A" }),
    fila(2, { 18: "B+D", 17: "A+B" }),
    fila(3, { 18: "B+D?" }),
    fila(4, { 18: "-", 12: "A" }),
    fila(5, { 18: "B+C" }),
  ];
  const almacen = JSON.stringify({ s: { curso: "", estudiante: "", respuestas: Array(30).fill(null), cursor: 0, editando: null }, filas, proximoId: 6, exportado: "" });
  const t = abrir(almacen);
  const tsvAntes = t.$("vista").textContent;
  // Por fila: { ítem: corrección } y la respuesta cruda mostrada.
  const enFila = (n) => {
    const vs = [...t.filas()[n].querySelectorAll("td.resp .v")];
    const corr = {};
    vs.forEach((v, i) => { const c = v.querySelector(".corr"); if (c) corr[i + 1] = c.textContent; });
    return { corr, crudas: vs.map((v) => v.firstChild.textContent) };
  };
  const f1 = enFila(0);
  assert.deepEqual(f1.corr, { 1: "B", 3: "C", 4: "B", 6: "A", 18: "B/D" });
  assert.deepEqual(f1.crudas, filas[0].respuestas, "la respuesta cruda se muestra intacta");
  assert.deepEqual(enFila(1).corr, { 17: "B" }, "B+D en el 18 es correcta; A+B en el 17 no");
  assert.deepEqual(enFila(2).corr, {}, "B+D? queda a revisar, sin corrección");
  assert.deepEqual(enFila(3).corr, { 12: "D", 18: "B/D" }, "blanco en el 18 → B/D");
  assert.deepEqual(enFila(4).corr, { 18: "B/D" });
  assert.match(t.filas()[0].querySelector(".v.i18 .corr").title, /Clave del ítem 18: B, D o B\+D/);
  // Resultados sin cambios por la capa visual.
  assert.deepEqual(t.resultados(0), ["3/8 · 38 %resp. 7/8 · 1 a revisar", "6/8 · 75 %resp. 8/8 · 2 a revisar", "7/8 · 88 %resp. 8/8", "6/6 · 100 %resp. 6/6"]);

  // Durante la carga: la grilla muestra lo mismo fuera del casillero.
  t.filas()[0].querySelector('button[data-accion="editar"]').click();
  const celdas = [...t.d.querySelectorAll("#grilla .celda")].slice(0, 30);
  const corrGrilla = {};
  celdas.forEach((c, i) => { const x = c.querySelector(".corr").textContent; if (x) corrGrilla[i + 1] = x; });
  assert.deepEqual(corrGrilla, { 1: "B", 3: "C", 4: "B", 6: "A", 18: "B/D" });
  assert.deepEqual(t.valores().slice(0, 6), ["B+D", "A", "D", "C", "?", "–"], "en el casillero, lo que respondió");
  // Al cambiar la respuesta, la corrección se actualiza al instante.
  t.escribir("4B");
  assert.equal(celdas[3].querySelector(".corr").textContent, "");
  t.escribir("4C");
  assert.equal(celdas[3].querySelector(".corr").textContent, "B");
  assert.equal(t.valores()[3], "C");
  t.escribir("{Escape}");
  t.tecla("Enter");
  assert.equal(t.$("vista").textContent, tsvAntes, "el TSV no cambia");
  t.dom.window.close();
});

test("varias marcas de forma natural: letra + letra Enter", () => {
  const t = abrir();
  const { $ } = t;
  const celda = (n) => t.valores()[n - 1];
  t.escribirCampo("curso", "Ficticio");
  t.escribirCampo("estudiante", "Prueba Múltiple");
  t.tecla("Enter");

  // 6) Respuesta simple: una tecla, carga y avanza.
  t.escribir("B");
  assert.equal(celda(1), "B");
  assert.equal($("titular").textContent, "Ítem 2");

  // 1) y 4) B+C Enter desde un ítem vacío; el siguiente no se toca.
  t.escribir("B");
  assert.equal($("titular").textContent, "Ítem 3", "B solo avanza como siempre");
  t.escribir("+");
  assert.equal($("titular").textContent, "Ítem 2", "el + vuelve al ítem recién cargado");
  assert.equal(celda(2), "B+", "vista previa de la composición");
  assert.equal(celda(3), "·", "el ítem siguiente sigue intacto");
  t.escribir("C");
  assert.equal(celda(2), "B+C+");
  assert.equal(celda(3), "·", "el ítem siguiente sigue intacto");
  t.escribir("{Enter}");
  // 5) Cursor después de Enter: el ítem siguiente.
  assert.equal(celda(2), "B+C");
  assert.equal(celda(3), "·");
  assert.equal($("titular").textContent, "Ítem 3");

  // 2) B+D en el 18 (con espacios, como al dictar) y 3) B+C+D en el 19.
  t.escribir("17");
  t.escribir("A B + D {Enter}");
  assert.equal(celda(17), "A");
  assert.equal(celda(18), "B+D");
  assert.equal($("titular").textContent, "Ítem 19");
  t.escribir("B+C+D{Enter}");
  assert.equal(celda(19), "B+C+D");
  assert.equal(celda(20), "·");
  assert.equal($("titular").textContent, "Ítem 20");
  // Orden y repetidos: D + B → B+D; una letra repetida no se duplica.
  t.escribir("D+B+B{Enter}");
  assert.equal(celda(20), "B+D");
  // A+D en el último ítem: desde «fin» vuelve al 30.
  t.escribir("30A");
  assert.equal($("titular").textContent, "Fin");
  t.escribir("+D{Enter}");
  assert.equal(celda(30), "A+D");
  assert.equal($("titular").textContent, "Fin");

  // 8) Interacción con Retroceso, Esc, -, ? y flechas.
  t.escribir("4C+D{Backspace}A{Enter}");
  assert.equal(celda(4), "A+C", "Retroceso quita la última letra agregada");
  assert.equal($("titular").textContent, "Ítem 5");
  t.escribir("B+D{Escape}");
  assert.equal(celda(5), "B", "Esc deja el ítem como antes del +");
  assert.equal($("titular").textContent, "Ítem 6", "y el cursor donde estaba");
  t.escribir("-+");
  assert.equal($("titular").textContent, "Ítem 7", "tras - el + compone sobre el ítem actual");
  t.escribir("{Escape}");
  assert.equal(celda(6), "–");
  t.escribir("C{ArrowRight}+");
  assert.equal($("titular").textContent, "Ítem 9", "tras una flecha el + es sobre el ítem actual");
  t.escribir("{Escape}{ArrowLeft}{ArrowLeft}+A{Enter}");
  assert.equal(celda(7), "A+C", "+ sobre un ítem ya cargado agrega letras");
  t.escribir("{ArrowLeft}?");
  assert.equal(celda(7), "A+C?", "? sigue marcando dudosa la respuesta actual");
  t.escribir("{ArrowRight}?");
  assert.equal(celda(8), "?", "? en ítem sin cargar sigue siendo ilegible y avanza");
  assert.equal($("titular").textContent, "Ítem 9");
  t.escribir("B{Backspace}");
  assert.equal(celda(9), "·", "Retroceso tras una letra la borra, como antes");
  assert.equal($("titular").textContent, "Ítem 9");
  t.escribir("B+→");
  assert.match($("mensaje").textContent, /Varias letras/);
  t.escribir("{ArrowRight}");
  assert.match($("mensaje").textContent, /Varias letras/, "las flechas no salen de la composición");
  t.escribir("{Enter}");
  assert.equal(celda(9), "B");
  assert.equal(celda(10), "·");
  // En 1–8, «D + B Enter»: el + confirma la D como parte de la respuesta.
  t.escribir("3D");
  assert.equal(celda(3), "·", "la primera D sólo pide confirmación");
  t.escribir("+B{Enter}");
  assert.equal(celda(3), "B+D");
  assert.ok(t.d.querySelectorAll("#grilla .celda")[2].classList.contains("rango"));
  t.escribir("3D D");
  assert.equal(celda(3), "D", "con espacio en medio, D D sigue confirmando");
  // Un clic en otra celda abandona la composición sin cambiar nada.
  t.escribir("12C+D");
  t.d.querySelectorAll("#grilla .celda")[0].dispatchEvent(new t.w.MouseEvent("mousedown", { bubbles: true }));
  assert.equal(celda(12), "C");
  assert.equal($("titular").textContent, "Ítem 1");
  t.dom.window.close();
});

test("varias marcas al editar una transcripción guardada y en el TSV", () => {
  const t = abrir();
  const { $ } = t;
  t.escribirCampo("curso", "Ficticio");
  t.escribirCampo("estudiante", "Prueba Edición");
  t.tecla("Enter");
  t.escribir("BACBCABC DBADBCAC BBAACBCD CBDABA");
  t.tecla("Enter");
  assert.equal(t.filas().length, 1);

  // 7) Editar: ir al 18, B + D Enter (la B ya estaba y no se duplica), y al 25.
  t.filas()[0].querySelector('button[data-accion="editar"]').click();
  t.escribir("18B+D{Enter}");
  assert.equal(t.valores()[17], "B+D");
  assert.equal(t.valores()[18], "A", "el 19 no cambia");
  t.escribir("25C+B+D{Enter}");
  assert.equal(t.valores()[24], "B+C+D");
  t.tecla("Enter");
  assert.equal(t.filas().length, 1);

  // 9) TSV con la respuesta múltiple exacta; resultados y corrección coherentes.
  const linea = $("vista").textContent.trimEnd().split("\n")[1].split("\t");
  assert.equal(linea.length, 37);
  assert.equal(linea[3 + 17], "B+D");
  assert.equal(linea[3 + 18], "A");
  assert.equal(linea[3 + 24], "B+C+D");
  assert.deepEqual(t.resultados(0).slice(2), ["8/8 · 100 %resp. 8/8", "5/6 · 83 %resp. 6/6"]);
  const v25 = t.filas()[0].querySelectorAll("td.resp .v")[24];
  assert.equal(v25.firstChild.textContent, "B+C+D");
  assert.equal(v25.querySelector(".corr").textContent, "C");
  t.dom.window.close();
});

// ---------- Sexta iteración: resultado global, ejes y resultados en vivo ----------
const CLAVE30 = "BACBCABC DBADBCAC BBAACBCD CBDABA".replace(/ /g, "").split("");
const conCambios = (cambios) => {
  const r = [...CLAVE30];
  for (const [n, v] of Object.entries(cambios)) r[n - 1] = v;
  return r;
};
const almacenCon = (filas, s = null) => JSON.stringify({
  s: s ?? { curso: "", estudiante: "", respuestas: Array(30).fill(null), cursor: 0, editando: null },
  filas, proximoId: filas.length + 1, exportado: "",
});
// Textos de la síntesis de una fila: [global, eje1 … eje8].
const sintesisFila = (t, n) => [...t.filas()[n].querySelectorAll(".sintesis .s")].map((e) => e.textContent);
const vivo = (t) => ({
  texto: t.$("vivo").textContent,
  // Cifras de una parte completa, o el aviso de lo que falta.
  partes: [...t.d.querySelectorAll("#grilla .parte-res")].map((e) => (e.querySelector("b") ?? e.querySelector(".faltan")).textContent),
  global: t.d.querySelector("#vivo .vp.global b")?.textContent,
  ejes: [...t.d.querySelectorAll("#vivo .ve")].map((e) => e.querySelector("b").textContent + " " + e.textContent.split("·").at(-1).trim()),
});

test("los ejes del prototipo coinciden con analisis-de-items.md (sólo ítems principales)", () => {
  const md = readFileSync(join(EVALUACION, "analisis-de-items.md"), "utf8");
  const tabla = md.split("## Cobertura")[1].split("##")[0];
  const desdeMd = [...tabla.matchAll(/^\| ([^|]+?) \| ([\d, ]+)(?:\([^)]*\))? *\|$/gm)]
    .map((m) => ({ nombre: m[1].trim(), items: m[2].split(",").map((x) => Number(x.trim())).filter(Boolean) }));
  assert.equal(desdeMd.length, 8);
  const embebidos = JSON.parse(html.match(/const EJES = (\[[\s\S]*?\n  \]);/)[1]).map(({ nombre, items }) => ({ nombre, items }));
  assert.deepEqual(embebidos, desdeMd);
  // Con los ítems principales cada ítem queda en un único eje.
  assert.deepEqual(embebidos.flatMap((e) => e.items).sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1));
});

test("resultado global sobre 30 y ejes: casos de corrección", () => {
  const filas = [
    { id: 1, curso: "F", estudiante: "Todo bien", respuestas: conCambios({}) },
    // Partes 1 y 4 completas, 2 y 3 todo incorrecto.
    { id: 2, curso: "F", estudiante: "Global no es promedio", respuestas: conCambios({
      9: "A", 10: "A", 11: "B", 12: "A", 13: "A", 14: "A", 15: "B", 16: "A",
      17: "A", 18: "A", 19: "B", 20: "B", 21: "A", 22: "A", 23: "A", 24: "A" }) },
    // 12 = A (incorrecta), 18 = B+D (correcta), 5 en blanco, 17 = A+B (múltiple
    // incorrecta), 20 ilegible, 21 = C? (dudosa aunque coincida con la clave).
    { id: 3, curso: "F", estudiante: "Casos especiales", respuestas: conCambios({ 12: "A", 18: "B+D", 5: "-", 17: "A+B", 20: "?", 21: "C?" }) },
  ];
  const t = abrir(almacenCon(filas));
  assert.deepEqual(sintesisFila(t, 0), ["30/30 · 100 %", "3/3 · 100 %", "4/4 · 100 %", "5/5 · 100 %", "3/3 · 100 %", "3/3 · 100 %", "4/4 · 100 %", "5/5 · 100 %", "3/3 · 100 %"]);

  assert.deepEqual(t.resultados(1).map((r) => r.split("%")[0] + "%"), ["8/8 · 100 %", "0/8 · 0 %", "0/8 · 0 %", "6/6 · 100 %"]);
  const s2 = sintesisFila(t, 1);
  assert.equal(s2[0], "14/30 · 47 %", "14/30 = 47 %, no el promedio de 100, 0, 0 y 100 (50 %)");
  assert.deepEqual(s2.slice(1), ["2/3 · 67 %", "1/4 · 25 %", "3/5 · 60 %", "2/3 · 67 %", "1/3 · 33 %", "1/4 · 25 %", "3/5 · 60 %", "1/3 · 33 %"]);

  const s3 = sintesisFila(t, 2);
  assert.equal(s3[0], "25/30 · 83 % · 2 a revisar");
  assert.deepEqual(s3.slice(1), ["3/3 · 100 %", "4/4 · 100 %", "2/5 · 40 %", "2/3 · 67 %", "3/3 · 100 %", "3/4 · 75 %", "5/5 · 100 %", "3/3 · 100 %"]);
  const ejes3 = [...t.filas()[2].querySelectorAll(".sintesis .s.eje")];
  assert.deepEqual(ejes3.map((e) => e.classList.contains("provisorio")), [false, false, true, true, false, false, false, false],
    "sólo los ejes con ítems a revisar quedan marcados");
  assert.match(ejes3[3].title, /CPU y memoria \/ Von Neumann · ítems 6, 20, 30 · 1 a revisar/);
  // Las partes siguen igual que antes.
  assert.deepEqual(t.resultados(2), ["7/8 · 88 %resp. 7/8", "7/8 · 88 %resp. 8/8", "5/8 · 63 %resp. 8/8 · 2 a revisar", "6/6 · 100 %resp. 6/6"]);
  // TSV: mismas 33 columnas y valores crudos.
  const lineas = t.$("vista").textContent.trimEnd().split("\n");
  assert.equal(lineas[0].split("\t").length, 37);
  assert.deepEqual(lineas[3].split("\t").slice(3, 33), filas[2].respuestas);
  t.dom.window.close();
});

test("resultados en vivo: se recalculan antes de guardar; global con los 30 cargados", () => {
  const t = abrir();
  const { $ } = t;
  t.escribirCampo("curso", "Ficticio");
  t.escribirCampo("estudiante", "Prueba En Vivo");
  t.tecla("Enter");
  t.escribir(CLAVE30.slice(0, 29).join(""));
  assert.deepEqual(vivo(t).partes, ["8/8 · 100 %", "8/8 · 100 %", "8/8 · 100 %", "falta 1: 30"]);
  assert.equal(vivo(t).global, undefined, "sin global mientras falte un ítem");
  assert.match(vivo(t).texto, /con las 4 partes completas · falta 1: 30/);
  t.escribir("A");
  let v = vivo(t);
  assert.deepEqual(v.partes, ["8/8 · 100 %", "8/8 · 100 %", "8/8 · 100 %", "6/6 · 100 %"]);
  assert.equal(v.global, "30/30 · 100 %");
  assert.equal(t.filas().length, 0, "nada guardado todavía");

  // Correcta → incorrecta en el 30: Parte 4, global y eje CPU y memoria.
  t.escribir("30B");
  v = vivo(t);
  assert.equal(v.partes[3], "5/6 · 83 %");
  assert.equal(v.global, "29/30 · 97 %");
  assert.equal(v.ejes[3], "2/3 67 %", "CPU y memoria / Von Neumann incluye el 30");
  assert.equal(v.ejes[0], "3/3 100 %", "los demás ejes no cambian");
  // Incorrecta → correcta.
  t.escribir("30A");
  assert.equal(vivo(t).global, "30/30 · 100 %");
  // Respuesta → blanco y blanco → respuesta.
  t.escribir("12-");
  v = vivo(t);
  assert.equal(v.partes[1], "7/8 · 88 %");
  assert.match(t.d.querySelector('#grilla .parte-res[data-parte="2"]').textContent, /resp\. 7\/8/);
  assert.equal(v.ejes[2], "4/5 80 %", "Entrada y salida incluye el 12");
  t.escribir("12A");
  assert.equal(vivo(t).partes[1], "7/8 · 88 %", "12 = A sigue sin sumar");
  t.escribir("12D");
  assert.equal(vivo(t).partes[1], "8/8 · 100 %");
  // Múltiple: B+C incorrecta en el 18; B+D correcta (con B + D Enter).
  t.escribir("18B+C{Enter}");
  assert.equal(vivo(t).partes[2], "7/8 · 88 %");
  assert.equal(vivo(t).ejes[5], "3/4 75 %", "Estado incluye el 18");
  t.escribir("18B+D{Enter}");
  assert.equal(vivo(t).partes[2], "8/8 · 100 %");
  // Dudosa: marcar el 1 como B? lo saca de los aciertos y lo deja a revisar.
  t.escribir("1{Delete}B{ArrowLeft}?");
  v = vivo(t);
  assert.equal(v.global, "29/30 · 97 %");
  assert.match($("vivo").querySelector(".vp.global").textContent, /1 a revisar/);
  assert.equal(v.ejes[0], "2/3 67 %");
  assert.ok($("vivo").querySelectorAll(".ve")[0].classList.contains("provisorio"));
  t.escribir("?");
  assert.equal(vivo(t).global, "30/30 · 100 %");
  // Un ítem sin cargar: desaparecen las cifras; al volver a cargarlo, reaparecen.
  t.escribir("7{Delete}");
  assert.equal(vivo(t).partes[0], "falta 1: 7");
  assert.equal(vivo(t).partes[1], "8/8 · 100 %", "las otras partes siguen con cifras");
  assert.equal(vivo(t).global, undefined);
  t.escribir("B");
  assert.equal(vivo(t).global, "30/30 · 100 %");
  t.dom.window.close();
});

test("resultados en vivo al editar una fila guardada y tras recargar", () => {
  const filas = [{ id: 1, curso: "F", estudiante: "Prueba Guardada", respuestas: conCambios({ 25: "D" }) }];
  const t = abrir(almacenCon(filas));
  const { $ } = t;
  assert.equal(sintesisFila(t, 0)[0], "29/30 · 97 %");
  t.filas()[0].querySelector('button[data-accion="editar"]').click();
  assert.equal(vivo(t).global, "29/30 · 97 %");
  assert.match($("vivo").textContent, /la fila guardada se actualiza al guardar/);
  // Ítem 25: Parte 4, global y eje Entrada y salida a la vez.
  t.escribir("25C");
  const v = vivo(t);
  assert.equal(v.partes[3], "6/6 · 100 %");
  assert.equal(v.global, "30/30 · 100 %");
  assert.equal(v.ejes[2], "5/5 100 %");
  assert.equal(sintesisFila(t, 0)[0], "29/30 · 97 %", "la fila guardada no cambia hasta guardar");
  const tsvAntes = $("vista").textContent;
  assert.equal(tsvAntes.split("\n")[1].split("\t")[3 + 24], "D");

  // Recargar con la edición en curso: los resultados en vivo se recalculan.
  const almacen = t.w.localStorage.getItem("aula-transcripcion-si-a-v1");
  t.dom.window.close();
  const r = abrir(almacen);
  assert.equal(vivo(r).global, "30/30 · 100 %");
  assert.equal(vivo(r).partes[3], "6/6 · 100 %");
  assert.equal(sintesisFila(r, 0)[0], "29/30 · 97 %");
  r.$("zona").focus();
  r.tecla("Enter");
  assert.equal(sintesisFila(r, 0)[0], "30/30 · 100 %", "al guardar, la fila toma el nuevo resultado");
  assert.equal(r.$("vista").textContent.split("\n")[1].split("\t")[3 + 24], "C");
  r.dom.window.close();
});

test("cada parte muestra sus resultados en cuanto está completa", () => {
  const t = abrir();
  const sinCifrasGlobales = () => {
    assert.equal(vivo(t).global, undefined, "global oculto");
    assert.equal(t.d.querySelectorAll("#vivo .ve").length, 0, "ejes ocultos");
    assert.match(t.d.querySelector("#vivo .vivo-ejes").textContent, /aparecen con las 4 partes completas/);
  };
  t.escribirCampo("curso", "Ficticio");
  t.escribirCampo("estudiante", "Prueba Por Parte");
  t.tecla("Enter");
  assert.deepEqual(vivo(t).partes, ["sin cargar", "sin cargar", "sin cargar", "sin cargar"]);
  // Cada resultado vive dentro de la banda de su parte; el panel no las repite.
  for (const n of [1, 2, 3, 4]) {
    assert.ok(t.d.querySelector(`#grilla .parte[data-parte="${n}"] > .parte-res[data-parte="${n}"]`), `resultado dentro de la banda ${n}`);
  }
  assert.equal(t.d.querySelectorAll("#vivo .vp[data-parte]").length, 0);

  // Parte 1 completa (con el 2 incorrecto) y 9–30 vacíos.
  t.escribir("BBCBCABC");
  assert.deepEqual(vivo(t).partes, ["7/8 · 88 %", "sin cargar", "sin cargar", "sin cargar"]);
  assert.match(t.d.querySelector('#grilla .parte-res[data-parte="1"]').textContent, /resp\. 8\/8/);
  sinCifrasGlobales();

  // Parte 2 aparece al completar el 16.
  t.escribir("DBADBCA");
  assert.equal(vivo(t).partes[1], "falta 1: 16");
  t.escribir("C");
  assert.equal(vivo(t).partes[1], "8/8 · 100 %");
  sinCifrasGlobales();

  // Recálculo al modificar una respuesta de una parte completa.
  t.escribir("2A");
  assert.equal(vivo(t).partes[0], "8/8 · 100 %");
  t.escribir("9C");
  assert.equal(vivo(t).partes[1], "7/8 · 88 %");

  // Completa → incompleta → completa.
  t.escribir("3{Delete}");
  assert.equal(vivo(t).partes[0], "falta 1: 3");
  t.escribir("{ArrowRight}{Delete}{ArrowRight}{Delete}{ArrowRight}{Delete}");
  assert.equal(vivo(t).partes[0], "faltan 4", "con más de 3 faltantes, sólo la cantidad");
  t.escribir("3CBCA");
  assert.equal(vivo(t).partes[0], "8/8 · 100 %");

  // Dudosa, ilegible, blanco y múltiple cuentan como cargados (Parte 3).
  t.escribir("17B{ArrowLeft}?{ArrowRight}B+D{Enter}-?CBCD");
  assert.deepEqual(t.valores().slice(16, 24), ["B?", "B+D", "–", "?", "C", "B", "C", "D"]);
  assert.equal(vivo(t).partes[2], "5/8 · 63 %");
  assert.match(t.d.querySelector('#grilla .parte-res[data-parte="3"]').textContent, /resp\. 7\/8 · 2 a revisar/);
  assert.equal(vivo(t).partes[3], "sin cargar");
  sinCifrasGlobales();

  // Con la Parte 4 completa aparecen global y ejes.
  t.escribir("25CBDAB");
  assert.equal(vivo(t).partes[3], "falta 1: 30");
  sinCifrasGlobales();
  t.escribir("A");
  assert.equal(vivo(t).partes[3], "6/6 · 100 %");
  assert.equal(vivo(t).global, "26/30 · 87 %", "8 + 7 (el 9 quedó en C) + 5 + 6");
  assert.equal(t.d.querySelectorAll("#vivo .ve").length, 8);
  t.dom.window.close();
});

// ---------- Séptima iteración: partes contabilizadas por evaluación ----------
const casilla = (t, n) => t.d.querySelector(`#grilla .parte[data-parte="${n}"] .cuenta input`);
const T = true, F = false;

test("global y ejes sólo con las partes contabilizadas: denominadores 30, 24, 16, 22 y 6", () => {
  // Incorrectos: 1 (P1), 9 (P2), 17 (P3) y 25 (P4).
  const r = conCambios({ 1: "A", 9: "A", 17: "A", 25: "A" });
  const fila = (id, cuentan) => ({ id, curso: "F", estudiante: `Config ${id}`, respuestas: [...r], cuentan });
  const filas = [fila(1, [T, T, T, T]), fila(2, [T, T, T, F]), fila(3, [T, T, F, F]), fila(4, [T, F, T, T]), fila(5, [F, F, F, T]), fila(6, [F, F, F, F])];
  const t = abrir(almacenCon(filas));
  const global = (n) => sintesisFila(t, n)[0];
  assert.equal(global(0), "26/30 · 87 %");
  assert.equal(global(1), "21/24 · 88 %");
  assert.equal(global(2), "14/16 · 88 %");
  assert.equal(global(3), "19/22 · 86 %");
  assert.equal(global(4), "5/6 · 83 %");
  assert.equal(global(5), "sin partes contabilizadas");

  // Ejes con denominadores variables (sólo Partes 1 y 2: ítems 1–16).
  assert.deepEqual(sintesisFila(t, 2).slice(1), ["1/3 · 33 %", "3/3 · 100 %", "3/3 · 100 %", "1/1 · 100 %", "2/2 · 100 %", "1/1 · 100 %", "2/2 · 100 %", "1/1 · 100 %"]);
  // Sólo Parte 4: ejes sin ítems contabilizados muestran «—», no 0 %.
  const s5 = sintesisFila(t, 4).slice(1);
  assert.deepEqual(s5, ["— sin ítems contabilizados", "— sin ítems contabilizados", "0/1 · 0 %", "1/1 · 100 %",
    "— sin ítems contabilizados", "1/1 · 100 %", "2/2 · 100 %", "1/1 · 100 %"]);
  assert.match(t.filas()[4].querySelectorAll(".sintesis .s.eje")[2].title, /contabilizados: 25/);

  // Una parte excluida conserva su resultado propio y lo indica.
  assert.match(t.resultados(2)[2], /^7\/8 · 88 %resp\. 8\/8no se contabiliza$/);
  assert.ok(t.filas()[2].querySelectorAll(".grupo")[2].classList.contains("no-cuenta"));
  assert.equal(t.resultados(0)[2], "7/8 · 88 %resp. 8/8");

  // TSV: respuestas intactas y la configuración explícita al final.
  const lineas = t.$("vista").textContent.trimEnd().split("\n").map((l) => l.split("\t"));
  assert.deepEqual(lineas[0].slice(33), ["parte1_cuenta", "parte2_cuenta", "parte3_cuenta", "parte4_cuenta"]);
  assert.deepEqual(lineas.slice(1).map((l) => l.slice(33).join("")), ["1111", "1110", "1100", "1011", "0001", "0000"]);
  for (const l of lineas.slice(1)) assert.deepEqual(l.slice(3, 33), r);
  t.dom.window.close();
});

test("contabilizar partes en vivo: recálculo, completitud y respuestas intactas", () => {
  const t = abrir();
  const { $ } = t;
  t.escribirCampo("curso", "Ficticio");
  t.escribirCampo("estudiante", "Prueba Partes A");
  t.tecla("Enter");
  assert.deepEqual([1, 2, 3, 4].map((n) => casilla(t, n).checked), [T, T, T, T], "por defecto cuentan las cuatro");
  t.escribir("AACBCABC DBADBCAC"); // sólo el 1 incorrecto; Partes 1 y 2 completas
  assert.equal(vivo(t).global, undefined);
  assert.match(vivo(t).texto, /con las 4 partes completas · faltan 14/);

  // Desactivar 3 y 4: el global aparece al instante sobre 16.
  casilla(t, 3).click();
  casilla(t, 4).click();
  assert.equal(vivo(t).global, "15/16 · 94 %");
  assert.match($("vivo").textContent, /sobre 16 ítems \(partes 1 y 2\)/);
  assert.equal(t.d.querySelectorAll("#vivo .ve").length, 8);
  assert.match(t.d.querySelector('#grilla .parte-res[data-parte="3"]').textContent, /sin cargar.*no se contabiliza/);
  assert.equal(t.d.activeElement, $("zona"), "la grilla conserva el foco");

  // Se sigue transcribiendo una parte excluida, con su corrección propia.
  t.escribir("25CBDABB");
  assert.deepEqual(t.valores().slice(24), ["C", "B", "D", "A", "B", "B"]);
  assert.equal(vivo(t).partes[3], "5/6 · 83 %");
  assert.equal(vivo(t).global, "15/16 · 94 %", "la Parte 4 excluida no cambia el global");

  // Activar la Parte 3 (incompleta) oculta el global hasta completarla.
  casilla(t, 3).click();
  assert.equal(vivo(t).global, undefined);
  assert.match(vivo(t).texto, /con partes 1, 2 y 3 completas · faltan 8/);
  t.escribir("17BBAACBCD");
  assert.equal(vivo(t).global, "23/24 · 96 %");
  // Activar la 4 (completa): /30; desactivar la 2: /22.
  casilla(t, 4).click();
  assert.equal(vivo(t).global, "28/30 · 93 %");
  casilla(t, 2).click();
  assert.equal(vivo(t).global, "20/22 · 91 %");
  assert.equal(vivo(t).partes[1], "8/8 · 100 %", "la parte excluida conserva su resultado");
  // Ninguna parte contabilizada.
  [1, 3, 4].forEach((n) => casilla(t, n).click());
  assert.match(vivo(t).texto, /sin partes contabilizadas/);
  assert.equal(vivo(t).global, undefined);
  [1, 3, 4].forEach((n) => casilla(t, n).click());

  // Teclas dirigidas a la casilla no cargan respuestas en la grilla.
  casilla(t, 1).dispatchEvent(new t.w.KeyboardEvent("keydown", { key: "B", bubbles: true, cancelable: true }));
  assert.equal(t.valores()[0], "A");
  t.dom.window.close();
});

test("la selección es de cada estudiante, se edita, persiste y es compatible con datos anteriores", () => {
  const t = abrir();
  const { $ } = t;
  t.escribirCampo("curso", "Ficticio");
  t.escribirCampo("estudiante", "Prueba Partes A");
  t.tecla("Enter");
  t.escribir(CLAVE30.join(""));
  casilla(t, 4).click();
  $("zona").focus();
  t.tecla("Enter");
  assert.equal(sintesisFila(t, 0)[0], "24/24 · 100 %");
  // La siguiente evaluación empieza con las cuatro.
  assert.deepEqual([1, 2, 3, 4].map((n) => casilla(t, n).checked), [T, T, T, T]);
  t.escribirCampo("estudiante", "Prueba Partes B");
  t.tecla("Enter");
  t.escribir(CLAVE30.join(""));
  t.tecla("Enter");
  assert.equal(sintesisFila(t, 1)[0], "30/30 · 100 %");
  assert.equal(sintesisFila(t, 0)[0], "24/24 · 100 %", "cambiar a B no afecta a A");

  // Editar A: las casillas reflejan su configuración; el cambio se guarda en su fila.
  t.filas()[0].querySelector('button[data-accion="editar"]').click();
  assert.deepEqual([1, 2, 3, 4].map((n) => casilla(t, n).checked), [T, T, T, F]);
  casilla(t, 4).click();
  casilla(t, 1).click();
  assert.equal(vivo(t).global, "22/22 · 100 %");
  assert.equal(sintesisFila(t, 0)[0], "24/24 · 100 %", "la fila no cambia hasta guardar");
  $("zona").focus();
  t.tecla("Enter");
  assert.equal(sintesisFila(t, 0)[0], "22/22 · 100 %");
  assert.equal(sintesisFila(t, 1)[0], "30/30 · 100 %");

  // Recargar: configuración por fila y de la evaluación en curso.
  t.escribirCampo("estudiante", "Prueba Partes C");
  casilla(t, 2).click();
  const almacen = t.w.localStorage.getItem("aula-transcripcion-si-a-v1");
  t.dom.window.close();
  const r = abrir(almacen);
  assert.equal(sintesisFila(r, 0)[0], "22/22 · 100 %");
  assert.equal(sintesisFila(r, 1)[0], "30/30 · 100 %");
  assert.deepEqual([1, 2, 3, 4].map((n) => casilla(r, n).checked), [T, F, T, T]);
  assert.deepEqual(r.$("vista").textContent.trimEnd().split("\n").slice(1).map((l) => l.split("\t").slice(33).join("")), ["0111", "1111"]);
  r.dom.window.close();

  // Datos de una versión anterior (sin «cuentan»): las cuatro partes cuentan.
  const viejo = JSON.stringify({
    s: { curso: "F", estudiante: "Prueba Vieja En Curso", respuestas: [...CLAVE30], cursor: 30, editando: null },
    filas: [{ id: 1, curso: "F", estudiante: "Prueba Vieja", respuestas: conCambios({ 30: "B" }) }],
    proximoId: 2, exportado: "",
  });
  const v = abrir(viejo);
  assert.equal(sintesisFila(v, 0)[0], "29/30 · 97 %");
  assert.equal(vivo(v).global, "30/30 · 100 %");
  assert.deepEqual([1, 2, 3, 4].map((n) => casilla(v, n).checked), [T, T, T, T]);
  assert.equal(v.$("vista").textContent.trimEnd().split("\n")[1].split("\t").slice(33).join(""), "1111");
  v.dom.window.close();
});

// ---------- Ver (sólo lectura) y Editar ----------
const boton = (t, n, accion) => t.filas()[n].querySelector(`button[data-accion="${accion}"]`);
const avisoSalida = (t) => {
  const ev = new t.w.Event("beforeunload", { cancelable: true });
  t.w.dispatchEvent(ev);
  return ev.defaultPrevented;
};
const pantalla = (t) => ({
  valores: t.valores(),
  correcciones: [...t.d.querySelectorAll("#grilla .celda .corr")].slice(0, 30).map((c) => c.textContent),
  cuentan: [1, 2, 3, 4].map((n) => casilla(t, n).checked),
  partes: vivo(t).partes,
  global: vivo(t).global,
  ejes: vivo(t).ejes,
});
const filasVer = [
  { id: 1, curso: "F", estudiante: "Prueba Ver Uno", respuestas: conCambios({ 4: "C", 6: "-", 18: "A", 10: "B?", 1: "B+D" }), cuentan: [T, T, T, F] },
  { id: 2, curso: "F", estudiante: "Prueba Ver Dos", respuestas: conCambios({ 30: "B" }) }, // formato anterior: sin «cuentan»
];

test("Ver muestra una evaluación guardada completa y no permite modificar nada", () => {
  const t = abrir(almacenCon(filasVer));
  const { $, w } = t;
  const almacenAntes = w.localStorage.getItem("aula-transcripcion-si-a-v1");
  const tsvAntes = $("vista").textContent;
  boton(t, 0, "ver").click();
  assert.equal($("barraVer").hidden, false);
  assert.equal($("accionesCarga").hidden, true, "sin Guardar ni Descartar");
  assert.match($("verNombre").textContent, /Prueba Ver Uno \(F\), fila 1/);
  assert.match($("edicion").textContent, /viendo la fila 1 \(sólo lectura\)/);
  assert.ok(t.filas()[0].classList.contains("viendo"));
  assert.equal($("estudiante").value, "Prueba Ver Uno");
  assert.ok($("estudiante").readOnly && $("curso").readOnly);
  const v = pantalla(t);
  assert.deepEqual(v.valores.slice(0, 10), ["B+D", "A", "C", "C", "C", "–", "B", "C", "D", "B?"]);
  assert.equal(v.valores[17], "A");
  assert.deepEqual([v.correcciones[0], v.correcciones[3], v.correcciones[5], v.correcciones[9], v.correcciones[17]], ["B", "B", "A", "", "B/D"]);
  assert.deepEqual(v.cuentan, [T, T, T, F]);
  assert.ok([1, 2, 3, 4].every((n) => casilla(t, n).disabled));
  assert.deepEqual(v.partes, ["5/8 · 63 %", "7/8 · 88 %", "7/8 · 88 %", "6/6 · 100 %"]);
  assert.equal(v.global, "19/24 · 79 %");
  assert.equal(v.ejes.length, 8);
  assert.equal(t.d.querySelectorAll("#grilla .celda.actual").length, 0, "sin ítem actual");

  // Nada se modifica: teclas de carga, celdas, casillas, Enter.
  t.escribir("B-?+C{Enter}12A{Backspace}{Delete}{ArrowRight}");
  t.d.querySelectorAll("#grilla .celda")[3].dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true }));
  casilla(t, 4).click();
  casilla(t, 4).checked = true;
  casilla(t, 4).dispatchEvent(new w.Event("change", { bubbles: true }));
  $("btnGuardar").click();
  assert.deepEqual(pantalla(t), v);
  assert.equal(w.localStorage.getItem("aula-transcripcion-si-a-v1"), almacenAntes, "localStorage intacto");
  assert.equal($("vista").textContent, tsvAntes, "TSV intacto");
  assert.equal(w.confirmaciones.length, 0);
  t.dom.window.close();
});

test("Ver → otra con Ver → salir: sin advertencias y sin tocar lo que se estaba cargando", async () => {
  const t = abrir(almacenCon(filasVer));
  const { $, w } = t;
  assert.equal(avisoSalida(t), true, "con filas sin exportar, la advertencia existente sigue");
  $("btnCopiar").click(); // exportado: aísla la advertencia de cambios sin exportar
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(avisoSalida(t), false);
  // Una evaluación nueva a medio cargar.
  t.escribirCampo("estudiante", "Prueba Borrador");
  t.tecla("Enter");
  t.escribir("BAC");
  boton(t, 0, "ver").click();
  assert.equal(avisoSalida(t), false);
  boton(t, 1, "ver").click();
  assert.match($("verNombre").textContent, /Prueba Ver Dos/);
  assert.equal(pantalla(t).global, "29/30 · 97 %", "fila del formato anterior: las cuatro partes cuentan");
  assert.deepEqual(pantalla(t).cuentan, [T, T, T, T]);
  assert.equal(avisoSalida(t), false);
  // Salir con Esc (o «Volver a la carga»): vuelve el borrador intacto.
  t.tecla("Escape");
  assert.equal($("barraVer").hidden, true);
  assert.equal($("estudiante").value, "Prueba Borrador");
  assert.deepEqual(t.valores().slice(0, 4), ["B", "A", "C", "·"]);
  assert.equal($("titular").textContent, "Ítem 4");
  boton(t, 0, "ver").click();
  $("btnCerrarVista").click();
  assert.equal($("barraVer").hidden, true);
  assert.equal(w.confirmaciones.length, 0, "ninguna confirmación en todo el recorrido");
  // «Comenzar una nueva» desde aquí: el borrador sigue siendo la evaluación en carga.
  t.escribir("B");
  assert.equal(t.valores()[3], "B");
  t.dom.window.close();
});

test("Ver → Editar abre esa misma evaluación; una edición modificada conserva la advertencia", () => {
  const t = abrir(almacenCon(filasVer));
  const { $, w } = t;
  boton(t, 0, "ver").click();
  const enVer = pantalla(t);
  $("btnEditarVista").click();
  assert.equal(w.confirmaciones.length, 0, "Ver → Editar sin cambios previos: sin advertencia");
  assert.equal($("barraVer").hidden, true);
  assert.equal($("accionesCarga").hidden, false);
  assert.match($("edicion").textContent, /editando la transcripción de la fila 1/);
  assert.ok(!$("estudiante").readOnly);
  assert.equal(t.d.activeElement, $("zona"));
  // Los mismos resultados que en Ver (salvo el ítem actual, que en edición existe).
  assert.deepEqual(pantalla(t), enVer);
  assert.ok(![1, 2, 3, 4].some((n) => casilla(t, n).disabled));

  // Editar sin cambios → Editar otra: no hay nada que perder, no pregunta.
  boton(t, 1, "editar").click();
  assert.equal(w.confirmaciones.length, 0);
  assert.match($("edicion").textContent, /fila 2/);
  // Con un cambio real, sí pregunta (y si se rechaza, la edición sigue).
  t.escribir("30A");
  w.respuestaConfirm = false;
  boton(t, 0, "editar").click();
  assert.equal(w.confirmaciones.length, 1);
  assert.match(w.confirmaciones[0], /cambios sin guardar/);
  assert.match($("edicion").textContent, /fila 2/);
  assert.equal(t.valores()[29], "A");
  // Ver otra fila no descarta la edición ni pregunta; al volver sigue el cambio.
  boton(t, 0, "ver").click();
  assert.equal(w.confirmaciones.length, 1);
  t.tecla("Escape");
  assert.equal(t.valores()[29], "A");
  assert.match($("edicion").textContent, /fila 2/);
  // Descartar una edición modificada pregunta; sin cambios, no.
  $("btnDescartar").click();
  assert.equal(w.confirmaciones.length, 2);
  w.respuestaConfirm = true;
  t.escribir("30B");
  $("btnDescartar").click();
  assert.equal(w.confirmaciones.length, 2, "edición sin cambios: descartar no pregunta");
  // La fila guardada no cambió y el TSV tampoco.
  assert.equal(sintesisFila(t, 1)[0], "29/30 · 97 %");
  t.dom.window.close();
});

test("Ver no cambia el formato de localStorage ni de exportación", () => {
  const t = abrir(almacenCon(filasVer));
  const { $, w } = t;
  const claves = () => Object.keys(JSON.parse(w.localStorage.getItem("aula-transcripcion-si-a-v1"))).sort();
  const tsv = $("vista").textContent;
  boton(t, 1, "ver").click();
  assert.deepEqual(claves(), ["exportado", "filas", "proximoId", "s"]);
  assert.equal(JSON.parse(w.localStorage.getItem("aula-transcripcion-si-a-v1")).s.estudiante, "", "Ver no escribe en la evaluación en carga");
  assert.equal($("vista").textContent, tsv);
  const lineas = tsv.trimEnd().split("\n").map((l) => l.split("\t"));
  assert.ok(lineas.every((l) => l.length === 37));
  assert.equal(lineas[2].slice(33).join(""), "1111");
  // Recargar no restaura el modo Ver (es sólo de pantalla).
  const r = abrir(w.localStorage.getItem("aula-transcripcion-si-a-v1"));
  assert.equal(r.$("barraVer").hidden, true);
  r.dom.window.close();
  t.dom.window.close();
});

// ---------- Importar TSV ----------
const importarArchivo = async (t, texto) => {
  const archivo = new t.w.File([texto], "respuestas-ficticias.tsv", { type: "text/tab-separated-values" });
  const input = t.$("archivoImport");
  Object.defineProperty(input, "files", { value: [archivo], configurable: true });
  input.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
};
const almacenado = (t) => JSON.parse(t.w.localStorage.getItem("aula-transcripcion-si-a-v1"));
const filasImport = [
  { id: 1, curso: "3.º F", estudiante: "Prueba Importar Uno", respuestas: conCambios({ 1: "A+B", 4: "-", 10: "B?", 18: "B+D", 20: "?", 25: "B+C+D" }), cuentan: [T, T, T, F] },
  { id: 2, curso: "3.º F", estudiante: "Prueba Importar Dos, «coma»", respuestas: conCambios({ 3: "D", 12: "A", 30: "-" }), cuentan: [T, F, T, T] },
  { id: 3, curso: "", estudiante: "Prueba Importar Tres", respuestas: conCambios({ 17: "A+C" }), cuentan: [F, F, F, T] },
];

test("Importar TSV: restaura exactamente lo exportado, con partes contabilizadas distintas de 1111", async () => {
  const origen = abrir(almacenCon(filasImport));
  const texto = origen.$("vista").textContent;
  const sintesisOrigen = [0, 1, 2].map((n) => sintesisFila(origen, n));
  const partesOrigen = [0, 1, 2].map((n) => origen.resultados(n));
  origen.dom.window.close();
  assert.deepEqual(texto.trimEnd().split("\n").slice(1).map((l) => l.split("\t").slice(33).join("")), ["1110", "1011", "0001"]);

  const t = abrir(); // otro origen, sin datos (como pasar de file:// a localhost)
  assert.equal(t.$("btnImportar").textContent, "Importar TSV…");
  await importarArchivo(t, texto);
  assert.equal(t.w.confirmaciones.length, 0, "sin evaluaciones previas no hay nada que confirmar");
  assert.match(t.$("avisoImport").textContent, /Importadas 3 evaluaciones/);
  assert.equal(t.filas().length, 3);
  // Respuestas y configuración tal cual, sin transformar.
  const guardadas = almacenado(t).filas;
  for (const [k, f] of filasImport.entries()) {
    assert.equal(guardadas[k].curso, f.curso);
    assert.equal(guardadas[k].estudiante, f.estudiante);
    assert.deepEqual(guardadas[k].respuestas, f.respuestas);
    assert.deepEqual(guardadas[k].cuentan, f.cuentan);
  }
  assert.deepEqual(Object.keys(almacenado(t)).sort(), ["exportado", "filas", "proximoId", "s"], "formato de localStorage sin cambios");
  // Mismo TSV y mismos resultados; idéntico a lo exportado, así que no hay cambios sin exportar.
  assert.equal(t.$("vista").textContent, texto);
  assert.match(t.$("estadoExport").textContent, /sin cambios/);
  assert.deepEqual([0, 1, 2].map((n) => sintesisFila(t, n)), sintesisOrigen);
  assert.deepEqual([0, 1, 2].map((n) => t.resultados(n)), partesOrigen);
  assert.equal(sintesisFila(t, 0)[0], "20/24 · 83 % · 2 a revisar", "no suman 1 (A+B), 4 (-), 10 (B?) y 20 (?)");
  assert.equal(sintesisFila(t, 2)[0], "6/6 · 100 %", "sólo cuenta la Parte 4, toda correcta");

  // Ver y Editar sobre una fila importada.
  boton(t, 0, "ver").click();
  assert.deepEqual(pantalla(t).cuentan, [T, T, T, F]);
  assert.equal(pantalla(t).valores[0], "A+B");
  assert.equal(pantalla(t).valores[24], "B+C+D");
  t.$("btnEditarVista").click();
  t.escribir("30B{Enter}");
  assert.equal(sintesisFila(t, 0)[0], "20/24 · 83 % · 2 a revisar", "la Parte 4 no cuenta: el 30 no cambia el global");
  assert.equal(t.resultados(0)[3].split("resp")[0], "4/6 · 67 %", "pero sí su resultado propio");
  assert.match(t.$("estadoExport").textContent, /sin exportar/);
  t.dom.window.close();
});

test("Importar TSV: confirma antes de reemplazar y no toca la evaluación en carga", async () => {
  const origen = abrir(almacenCon(filasImport.slice(0, 2)));
  const texto = origen.$("vista").textContent;
  origen.dom.window.close();
  const t = abrir(almacenCon([{ id: 1, curso: "F", estudiante: "Prueba Existente", respuestas: [...CLAVE30], cuentan: [T, T, T, T] }]));
  t.escribirCampo("estudiante", "Prueba Borrador Import");
  t.tecla("Enter");
  t.escribir("BAC");
  t.w.respuestaConfirm = false;
  await importarArchivo(t, texto);
  assert.match(t.w.confirmaciones[0], /reemplaza las 1 evaluaciones guardadas en esta sesión \(hay cambios sin exportar que se perderían\) por las 2 del archivo/);
  assert.match(t.$("avisoImport").textContent, /cancelada/);
  assert.equal(t.filas().length, 1);
  assert.equal(almacenado(t).filas[0].estudiante, "Prueba Existente");
  t.w.respuestaConfirm = true;
  await importarArchivo(t, texto);
  assert.equal(t.filas().length, 2);
  assert.equal(almacenado(t).filas[0].estudiante, "Prueba Importar Uno");
  assert.equal(t.$("estudiante").value, "Prueba Borrador Import");
  assert.deepEqual(t.valores().slice(0, 4), ["B", "A", "C", "·"]);
  // Durante una edición no se importa.
  t.$("btnDescartar").click();
  boton(t, 0, "editar").click();
  await importarArchivo(t, texto);
  assert.match(t.$("avisoImport").textContent, /terminá o descartá la edición/);
  t.dom.window.close();
});

test("Importar TSV: un archivo inválido no importa nada e informa el problema", async () => {
  const origen = abrir(almacenCon(filasImport));
  const texto = origen.$("vista").textContent;
  origen.dom.window.close();
  const t = abrir(almacenCon([{ id: 1, curso: "F", estudiante: "Prueba Existente", respuestas: [...CLAVE30], cuentan: [T, T, T, T] }]));
  const antes = t.w.localStorage.getItem("aula-transcripcion-si-a-v1");
  const lineas = texto.trimEnd().split("\n");
  const cambiar = (n, col, valor) => lineas.map((l, k) => (k === n ? l.split("\t").map((c, i) => (i === col ? valor : c)).join("\t") : l)).join("\n") + "\n";
  const casos = [
    [lineas.map((l) => l.split("\t").slice(0, 33).join("\t")).join("\n"), /encabezado tiene 33 columnas; se esperaban 37/],
    [cambiar(0, 34, "cuenta_p2"), /columna 35: «cuenta_p2» en lugar de «parte2_cuenta»/],
    [cambiar(2, 3 + 11, "E"), /Línea 3: i12 es «E»/],
    [cambiar(1, 3, "B+A"), /Línea 2: i01 es «B\+A»/],
    [cambiar(3, 36, "2"), /Línea 4: parte4_cuenta es «2»; debe ser 1 o 0/],
    [cambiar(1, 0, "SI-B"), /Línea 2: evaluacion es «SI-B»/],
    [cambiar(1, 2, " "), /Línea 2: falta el estudiante/],
    [lineas[0] + "\n", /sólo el encabezado/],
    ["", /vacío/],
  ];
  for (const [archivo, motivo] of casos) {
    await importarArchivo(t, archivo);
    assert.match(t.$("avisoImport").textContent, /^No se importó nada\./, `rechaza: ${motivo}`);
    assert.match(t.$("avisoImport").textContent, motivo);
    assert.equal(t.$("avisoImport").className, "error");
  }
  // Varios problemas a la vez se informan juntos, y nada cambió.
  const varios = cambiar(2, 3 + 11, "E").replace(/\t1\t1\t1\t0\n/, "\t1\t1\t1\tx\n");
  await importarArchivo(t, varios);
  assert.match(t.$("avisoImport").textContent, /Línea 2: parte4_cuenta es «x».*Línea 3: i12 es «E»/);
  assert.equal(t.w.confirmaciones.length, 0, "no se llega a preguntar");
  assert.equal(t.w.localStorage.getItem("aula-transcripcion-si-a-v1"), antes);
  assert.equal(t.filas().length, 1);

  // Final de línea CRLF y BOM (planilla que volvió a guardar el archivo): se aceptan.
  await importarArchivo(t, "﻿" + texto.replace(/\n/g, "\r\n"));
  assert.match(t.$("avisoImport").textContent, /Importadas 3/);
  assert.equal(t.$("vista").textContent, texto);
  t.dom.window.close();
});
