// Cierre A+B en las herramientas de corrección de las Evaluaciones A y B, con
// datos sintéticos («Estudiante 01», «Curso X»), sobre el HTML real en jsdom.
// Evidencia: mejor resultado válido por parte entre A y B. Decisión: el docente
// elige qué partes cuentan. Sólo esa decisión se guarda, en su propia clave.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { crc32 } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const herramienta = (x) => readFileSync(join(root, "evaluaciones", "sistemas-informaticos", `evaluacion-${x}`, "herramienta", "index.html"), "utf8");
const HTML = { A: herramienta("a"), B: herramienta("b") };
const CLAVE = { A: "aula-evaluacion-a-v1", B: "aula-evaluacion-b-v1" };
const CIERRE = "aula-evaluacion-cierre-v1";
const correctas = (h) => JSON.parse(h.match(/const ACEPTADAS = (\[[\s\S]*?\]\s*\]);/)[1]).map((a) => a[0]);
const BUENAS = { A: correctas(HTML.A), B: correctas(HTML.B) };
const PARTES = [[1, 8], [9, 16], [17, 24], [25, 30]];
const T = true, F = false;

// Respuestas de un intento con un puntaje dado por parte: los primeros ítems
// de cada parte bien, el resto con una letra incorrecta de las opciones.
// null en una parte: sin cargar (sólo vale si esa parte no se contabiliza).
function respuestas(x, puntajes) {
  const r = [];
  PARTES.forEach(([d, h], k) => {
    for (let n = d; n <= h; n++) {
      const bien = BUENAS[x][n - 1];
      r.push(puntajes[k] === null ? null : n - d < puntajes[k] ? bien : bien === "A" ? "B" : "A");
    }
  });
  return r;
}
let ids = 0;
const fila = (x, estudiante, puntajes, { curso = "Curso X", cuentan = [T, T, T, T], cambios = {} } = {}) => {
  const r = respuestas(x, puntajes);
  for (const [n, v] of Object.entries(cambios)) r[n - 1] = v;
  return { id: ++ids, curso, estudiante, respuestas: r, cuentan };
};
// Mismo formato que escribe la herramienta: así se puede comparar byte a byte.
const almacen = (filas) => JSON.stringify({
  s: { curso: "", estudiante: "", respuestas: Array(30).fill(null), cuentan: [T, T, T, T], cursor: 0, editando: null },
  filas, proximoId: filas.length + 1, exportado: "",
});

// Abre la herramienta x con los datos de A, B y decisiones dados; registra
// cada escritura en localStorage.
function abrir(x, { a = null, b = null, cierre = null, escrituras = [], url = "http://localhost/" } = {}) {
  const dom = new JSDOM(HTML[x], {
    url,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(w) {
      if (a) w.localStorage.setItem(CLAVE.A, almacen(a));
      if (b) w.localStorage.setItem(CLAVE.B, almacen(b));
      if (cierre) w.localStorage.setItem(CIERRE, cierre);
      const original = w.Storage.prototype.setItem;
      w.Storage.prototype.setItem = function (k, v) { escrituras.push(k); return original.call(this, k, v); };
      const borrar = w.Storage.prototype.removeItem;
      w.Storage.prototype.removeItem = function (k) { escrituras.push(`borrar ${k}`); return borrar.call(this, k); };
      w.confirm = () => true;
    },
  });
  const w = dom.window;
  const d = w.document;
  const $ = (id) => d.getElementById(id);
  const filas = () => [...d.querySelectorAll("#tabla tbody tr")];
  const ver = (n) => filas()[n].querySelector('button[data-accion="ver"]').click();
  const casilla = (parte) => $("cierre").querySelector(`input[data-parte="${parte - 1}"]`);
  const marcar = (parte, valor) => {
    const c = casilla(parte);
    c.checked = valor;
    c.dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  // Lectura del panel de cierre de la fila vista.
  const panel = () => {
    const txt = (sel) => $("cierre").querySelector(sel)?.textContent ?? null;
    return {
      partes: [...$("cierre").querySelectorAll(".cierre-partes tbody tr")].map((tr) => {
        const td = [...tr.querySelectorAll("td")];
        // Sin los porcentajes (se prueban aparte, en «pct»).
        const sinPct = (e) => { const x = e.cloneNode(true); x.querySelectorAll(".pct").forEach((p) => p.remove()); return x.textContent; };
        return { A: sinPct(td[0]), B: sinPct(td[1]), mejor: sinPct(td[2]), pct: td.slice(0, 3).map((e) => e.querySelector(".pct")?.textContent.trim() ?? null), cuenta: td[3]?.querySelector("input").checked ?? null, habilitada: td[3] ? !td[3].querySelector("input").disabled : null };
      }),
      resultado: txt("#cierreResultado"),
      categoria: txt("#cierreCategoria"),
      provisoria: txt("#cierreProvisoria"),
      cuerpo: txt(".cierre-res")?.replace(/\s+/g, " ") ?? null,
      emparejamiento: [...$("cierre").querySelectorAll(".cierre-par")].map((p) => p.textContent.replace(/\s+/g, " ")),
      alerta: !!$("cierre").querySelector(".cierre-par.alerta"),
      estado: txt("#cierreEstado"),
    };
  };
  const lineas = () => filas().map((tr) => tr.querySelector(".cierre-fila").textContent);
  return { dom, w, d, $, filas, ver, casilla, marcar, panel, lineas, escrituras, cerrar: () => dom.window.close() };
}
// Abre B con un estudiante en A y en B y muestra su cierre.
function cierreDe(pa, pb, opciones = {}) {
  const a = pa ? [fila("A", "Estudiante 01", pa, opciones.a)] : [];
  const b = [fila("B", "Estudiante 01", pb, opciones.b)];
  const t = abrir("B", { a, b, cierre: opciones.cierre });
  t.ver(0);
  return t;
}
const mejores = (t) => t.panel().partes.map((p) => p.mejor);

// ---------- 1. Mejor evidencia ----------
test("A gana todas las partes: cada parte usa A", () => {
  const t = cierreDe([7, 7, 7, 5], [5, 5, 5, 4]);
  const p = t.panel();
  assert.deepEqual(p.partes.map((x) => [x.A, x.B, x.mejor]), [["7/8", "5/8", "7/8 · A"], ["7/8", "5/8", "7/8 · A"], ["7/8", "5/8", "7/8 · A"], ["5/6", "4/6", "5/6 · A"]]);
  assert.equal(p.resultado, "26/30 · 86,7 %");
  assert.equal(p.categoria, "Avanzado");
  t.cerrar();
});

test("B gana todas las partes: cada parte usa B", () => {
  const t = cierreDe([3, 3, 3, 2], [6, 6, 6, 5]);
  assert.deepEqual(mejores(t), ["6/8 · B", "6/8 · B", "6/8 · B", "5/6 · B"]);
  assert.equal(t.panel().resultado, "23/30 · 76,7 %");
  assert.equal(t.panel().categoria, "Suficiente");
  t.cerrar();
});

test("mezcla A/B: cada parte puede venir de un intento distinto", () => {
  const t = cierreDe([7, 5, 6, 3], [6, 7, 4, 5]);
  assert.deepEqual(mejores(t), ["7/8 · A", "7/8 · B", "6/8 · A", "5/6 · B"]);
  assert.equal(t.panel().resultado, "25/30 · 83,3 %");
  assert.equal(t.panel().categoria, "Avanzado");
  t.cerrar();
});

test("empate A = B: conserva el puntaje e indica los dos", () => {
  const t = cierreDe([6, 4, 5, 3], [6, 5, 5, 2]);
  assert.deepEqual(mejores(t), ["6/8 · A = B", "5/8 · B", "5/8 · A = B", "3/6 · A"]);
  assert.equal(t.panel().resultado, "19/30 · 63,3 %");
  t.cerrar();
});

test("parte sólo válida en A (en B no se contabiliza) y parte sólo válida en B (en A sin cargar)", () => {
  const t = cierreDe([6, 6, null, 4], [5, 7, 7, 3], {
    a: { cuentan: [T, T, F, T] },
    b: { cuentan: [T, T, T, F] },
  });
  const p = t.panel();
  assert.equal(p.partes[2].A, "no contabilizada");
  assert.equal(p.partes[2].mejor, "7/8 · B");
  assert.equal(p.partes[3].B, "3/6, no contabilizada", "se informa el puntaje, pero no es evidencia válida");
  assert.equal(p.partes[3].mejor, "4/6 · A");
  assert.equal(p.resultado, "24/30 · 80 %");
  assert.equal(p.categoria, "Avanzado");
  t.cerrar();
});

test("ninguna evidencia válida en una parte: sin evidencia y sin casilla", () => {
  const t = cierreDe([6, 6, 6, null], [6, 6, 6, null], { a: { cuentan: [T, T, T, F] }, b: { cuentan: [T, T, T, F] } });
  const p = t.panel();
  assert.equal(p.partes[3].mejor, "sin evidencia");
  assert.equal(p.partes[3].habilitada, false);
  assert.equal(p.partes[3].cuenta, false);
  assert.equal(p.resultado, "18/24 · 75 %");
  assert.equal(p.categoria, "Suficiente");
  t.cerrar();
});

test("estudiante sólo con B: cuenta B, sin adivinar A", () => {
  const t = abrir("B", { a: [fila("A", "Estudiante 02", [8, 8, 8, 6])], b: [fila("B", "Estudiante 01", [6, 5, 4, 3])] });
  t.ver(0);
  const p = t.panel();
  assert.deepEqual(p.partes.map((x) => x.A), ["—", "—", "—", "—"]);
  assert.deepEqual(mejores(t), ["6/8 · B", "5/8 · B", "4/8 · B", "3/6 · B"]);
  assert.match(p.emparejamiento[0], /^No se encontró Evaluación A correspondiente en este navegador; sólo cuenta la Evaluación B\./);
  assert.equal(p.alerta, false);
  assert.equal(p.resultado, "18/30 · 60 %");
  assert.equal(p.categoria, "Suficiente");
  assert.equal(p.provisoria, null);
  assert.equal(t.lineas()[0], "Cierre: Suficiente · 18/30 · sin A · propuesta");
  t.cerrar();
});

// ---------- 2. Decisión docente y categoría ----------
test("todas disponibles, sólo algunas seleccionadas; cambiar la selección recalcula al instante", () => {
  const t = cierreDe([8, 3, 5, 2], [6, 4, 5, 3]);
  let p = t.panel();
  assert.deepEqual(p.partes.map((x) => x.cuenta), [T, T, T, T], "propuesta: todas las partes con evidencia");
  assert.equal(p.resultado, "20/30 · 66,7 %");
  assert.match(p.estado, /^Propuesta/);
  t.marcar(2, false);
  p = t.panel();
  assert.deepEqual(p.partes.map((x) => x.cuenta), [T, F, T, T]);
  assert.equal(p.resultado, "16/22 · 72,7 %");
  assert.equal(p.categoria, "Suficiente");
  assert.match(p.estado, /^Selección docente guardada/);
  t.marcar(4, false);
  assert.equal(t.panel().resultado, "13/16 · 81,3 %");
  assert.equal(t.panel().categoria, "Suficiente");
  assert.match(t.panel().cuerpo, /Avanzado requiere las cuatro partes/);
  t.marcar(3, false);
  assert.equal(t.panel().resultado, "8/8 · 100 %");
  assert.equal(t.panel().categoria, "Suficiente", "sólo P1, 8/8 → Suficiente");
  assert.match(t.panel().cuerpo, /\(parte 1\)/);
  t.marcar(1, false);
  assert.equal(t.panel().resultado, null);
  assert.match(t.panel().cuerpo, /Categoría de cierre: falta la decisión docente \(ninguna parte seleccionada\)/);
  assert.equal(t.lineas()[0], "Cierre: falta decisión");
  t.marcar(2, true);
  assert.equal(t.panel().resultado, "4/8 · 50 %");
  assert.equal(t.panel().categoria, "En proceso");
  assert.equal(t.lineas()[0], "Cierre: En proceso · 4/8");
  // La parte elegida usa siempre su mejor puntaje (4/8 de B), nunca otro.
  assert.equal(t.panel().partes[1].mejor, "4/8 · B");
  t.cerrar();
});

test("umbrales con las cuatro partes (con P1 cumplida): 16 En proceso, 17 y 23 Suficiente (55 % inclusive), 24 Avanzado", () => {
  for (const [puntajes, esperado] of [
    [[6, 4, 3, 3], ["16/30 · 53,3 %", "En proceso"]],
    [[6, 4, 4, 3], ["17/30 · 56,7 %", "Suficiente"]],
    [[6, 4, 4, 4], ["18/30 · 60 %", "Suficiente"]],
    [[7, 6, 5, 5], ["23/30 · 76,7 %", "Suficiente"]],
    [[8, 6, 5, 5], ["24/30 · 80 %", "Avanzado"]],
    [[8, 8, 8, 6], ["30/30 · 100 %", "Avanzado"]],
    [[0, 0, 0, 0], ["0/30 · 0 %", "En proceso"]],
  ]) {
    const t = cierreDe(null, puntajes);
    assert.deepEqual([t.panel().resultado, t.panel().categoria], esperado, puntajes.join("+"));
    t.cerrar();
  }
});

test("55 % con la fracción exacta sobre las partes elegidas: 9/16 y 14/24 Suficiente, 13/24 En proceso", () => {
  for (const [puntajes, quitar, esperado] of [
    [[6, 3, 0, 0], [3, 4], ["9/16 · 56,3 %", "Suficiente"]],
    [[6, 2, 0, 0], [3, 4], ["8/16 · 50 %", "En proceso"]],
    [[6, 3, 4, 0], [4], ["13/24 · 54,2 %", "En proceso"]],
    [[6, 4, 4, 0], [4], ["14/24 · 58,3 %", "Suficiente"]],
    [[6, 0, 0, 0], [2, 3, 4], ["6/8 · 75 %", "Suficiente"]],
    [[4, 0, 0, 0], [2, 3, 4], ["4/8 · 50 %", "En proceso"]],
    [[6, 0, 0, 4], [1, 2, 3], ["4/6 · 66,7 %", "Suficiente"]],
    [[6, 0, 0, 3], [1, 2, 3], ["3/6 · 50 %", "En proceso"]],
  ]) {
    const t = cierreDe(null, puntajes);
    for (const k of quitar) t.marcar(k, false);
    assert.deepEqual([t.panel().resultado, t.panel().categoria], esperado, `${puntajes.join("+")} sin ${quitar.join(", ")}`);
    t.cerrar();
  }
});

test("24/24 con tres partes es Suficiente; nunca Avanzado con menos de cuatro partes", () => {
  const t = cierreDe(null, [8, 8, 8, 6]);
  t.marcar(4, false);
  assert.equal(t.panel().resultado, "24/24 · 100 %");
  assert.equal(t.panel().categoria, "Suficiente");
  // Todas las selecciones de 1 a 3 partes con puntaje perfecto.
  for (let m = 1; m < 15; m++) {
    for (let k = 0; k < 4; k++) if (t.casilla(k + 1).checked !== Boolean(m & (1 << k))) t.marcar(k + 1, Boolean(m & (1 << k)));
    assert.equal(t.panel().categoria, "Suficiente", `selección ${m.toString(2)}`);
  }
  t.marcar(4, true);
  for (let k = 0; k < 3; k++) t.marcar(k + 1, true);
  assert.equal(t.panel().categoria, "Avanzado");
  t.cerrar();
});

test("Confirmar la propuesta la guarda tal cual; la decisión persiste y se recupera", () => {
  const escrituras = [];
  const a = [fila("A", "Estudiante 01", [6, 6, 6, 4])];
  const b = [fila("B", "  ESTUDIANTE   01 ", [7, 2, 6, 3], { curso: "curso x" }), fila("B", "Estudiante 03", [5, 5, 5, 5])];
  const t = abrir("B", { a, b, escrituras });
  t.ver(0);
  t.$("btnConfirmarCierre").click();
  assert.match(t.panel().estado, /^Selección docente guardada/);
  assert.equal(t.$("btnConfirmarCierre"), null);
  t.marcar(2, false);
  const guardado = JSON.parse(t.w.localStorage.getItem(CIERRE));
  // Sólo la decisión: clave normalizada de curso y estudiante, modo y cuatro booleanos.
  assert.deepEqual(guardado, { estudiantes: { "curso x\testudiante 01": { modo: "procesado", partes: [T, F, T, T] } } });
  assert.equal(t.lineas()[1], "Cierre: En proceso · 20/30 · P1 no alcanza · sin A · propuesta", "la otra fila sigue con su propuesta (P1 5/8 < 6/8)");
  const guardadoTexto = t.w.localStorage.getItem(CIERRE);
  t.cerrar();
  // Recargar: la decisión vuelve, para la misma persona aunque cambie la grafía.
  const r = abrir("B", { a, b: [fila("B", "Estudiante 01", [7, 2, 6, 3], { curso: "Curso  X" })], cierre: guardadoTexto });
  r.ver(0);
  assert.deepEqual(r.panel().partes.map((x) => x.cuenta), [T, F, T, T]);
  assert.equal(r.panel().resultado, "17/22 · 77,3 %");
  assert.equal(r.lineas()[0], "Cierre: Suficiente · 17/22");
  r.cerrar();
});

test("la decisión es la misma en las dos herramientas (misma clave de cierre)", () => {
  const a = [fila("A", "Estudiante 01", [6, 6, 6, 4])];
  const b = [fila("B", "Estudiante 01", [7, 2, 6, 3])];
  const enB = abrir("B", { a, b });
  enB.ver(0);
  enB.marcar(4, false);
  const decision = enB.w.localStorage.getItem(CIERRE);
  enB.cerrar();
  const enA = abrir("A", { a, b, cierre: decision });
  enA.ver(0);
  const p = enA.panel();
  assert.deepEqual(p.partes.map((x) => [x.A, x.B, x.mejor, x.cuenta]),
    [["6/8", "7/8", "7/8 · B", T], ["6/8", "2/8", "6/8 · A", T], ["6/8", "6/8", "6/8 · A = B", T], ["4/6", "3/6", "4/6 · A", F]]);
  assert.equal(p.resultado, "19/24 · 79,2 %");
  assert.match(p.emparejamiento[0], /^Evaluación B: «Estudiante 01» \(Curso X\), emparejada/);
  enA.cerrar();
});

// ---------- 3. Emparejamiento ----------
test("emparejamiento: ignora mayúsculas, tildes y espacios repetidos", () => {
  const a = [fila("A", "  ESTUDIANTE   Núñez  Cero  Uno ", [8, 8, 8, 6], { curso: " curso   x " })];
  const b = [fila("B", "Estudiante Nunez cero uno", [2, 2, 2, 2], { curso: "Curso X" })];
  const t = abrir("B", { a, b });
  t.ver(0);
  assert.deepEqual(mejores(t), ["8/8 · A", "8/8 · A", "8/8 · A", "6/6 · A"]);
  assert.match(t.panel().emparejamiento[0], /emparejada por curso y estudiante/);
  t.cerrar();
});

test("emparejamiento ambiguo: no adivina, no usa A y deja la categoría provisoria", () => {
  const a = [fila("A", "Estudiante 01", [8, 8, 8, 6]), fila("A", "estudiante 01", [1, 1, 1, 1])];
  const b = [fila("B", "Estudiante 01", [6, 5, 4, 4])];
  const t = abrir("B", { a, b });
  t.ver(0);
  const p = t.panel();
  assert.deepEqual(p.partes.map((x) => x.A), ["ambiguo", "ambiguo", "ambiguo", "ambiguo"]);
  assert.deepEqual(mejores(t), ["6/8 · B", "5/8 · B", "4/8 · B", "4/6 · B"]);
  assert.equal(p.alerta, true);
  assert.match(p.emparejamiento[0], /hay 2 registros con este curso y estudiante; no se usa ninguno/);
  assert.equal(p.categoria, "Suficiente");
  assert.match(p.provisoria, /provisoria: no se usa la Evaluación A: el emparejamiento es ambiguo/);
  assert.match(t.lineas()[0], /^Cierre: Suficiente · 19\/30 · provisoria/);
  t.cerrar();
});

test("emparejamiento no seguro: mismo estudiante en otro curso se informa y no se usa", () => {
  const a = [fila("A", "Estudiante 01", [8, 8, 8, 6], { curso: "Curso Y" })];
  const t = abrir("B", { a, b: [fila("B", "Estudiante 01", [5, 5, 4, 4])] });
  t.ver(0);
  const p = t.panel();
  assert.deepEqual(p.partes.map((x) => x.A), ["—", "—", "—", "—"]);
  assert.match(p.emparejamiento[0], /pero sí «Estudiante 01» \(Curso Y\) con otro curso; no se empareja/);
  assert.match(p.provisoria, /el emparejamiento no es seguro/);
  t.cerrar();
});

test("dos registros de B del mismo estudiante: se avisa y la categoría queda provisoria", () => {
  const t = abrir("B", { b: [fila("B", "Estudiante 01", [5, 5, 4, 4]), fila("B", "Estudiante 01 ", [6, 6, 6, 6])] });
  t.ver(1);
  assert.match(t.panel().emparejamiento.join(" "), /Hay 2 registros de la Evaluación B con este curso y estudiante/);
  assert.match(t.panel().provisoria, /hay 2 registros de la Evaluación B/);
  t.cerrar();
});

// ---------- 4. A revisar ----------
test("evidencia a revisar en una parte elegida: se muestra y la categoría queda provisoria si podría cambiar", () => {
  // B: 23/30 con un «?» en la Parte 1 (podría ser 24 → Avanzado).
  const t = cierreDe([5, 5, 5, 3], [7, 6, 5, 5], { b: { cambios: { 8: "?" } } });
  let p = t.panel();
  assert.equal(p.partes[0].B, "7/8 · 1 a revisar");
  assert.equal(p.partes[0].mejor, "7/8 · B · puede subir: a revisar");
  assert.equal(p.resultado, "23/30 · 76,7 %");
  assert.match(p.cuerpo, /hay respuestas a revisar: podría llegar a 24\/30/);
  assert.equal(p.categoria, "Suficiente");
  assert.match(p.provisoria, /provisoria: hay respuestas a revisar que podrían llevarla a Avanzado/);
  assert.match(t.lineas()[0], /provisoria/);
  // Sin la Parte 1 en la selección, lo pendiente ya no afecta: categoría firme.
  t.marcar(1, false);
  p = t.panel();
  assert.equal(p.resultado, "16/22 · 72,7 %");
  assert.equal(p.provisoria, null);
  t.cerrar();
  // Pendiente que no puede cambiar la categoría: se muestra, pero la categoría es firme.
  const u = cierreDe(null, [7, 7, 7, 5], { b: { cambios: { 8: "B?" } } });
  assert.match(u.panel().cuerpo, /podría llegar a 27\/30/);
  assert.equal(u.panel().categoria, "Avanzado");
  assert.equal(u.panel().provisoria, null);
  u.cerrar();
  // Una dudosa en el intento que no gana, pero que podría superarlo, también cuenta.
  const v = cierreDe([6, 8, 8, 6], [7, 8, 8, 6], { a: { cambios: { 7: "?", 8: "?" } } });
  assert.equal(v.panel().partes[0].mejor, "7/8 · B · puede subir: a revisar");
  v.cerrar();
});

// Ayudas del modo manual (también se usan en el requisito de P1).
const modo = (t, valor) => {
  const r = t.$("cierre").querySelector(`input[name="modoCierre"][value="${valor}"]`);
  r.checked = true;
  r.dispatchEvent(new t.w.Event("change", { bubbles: true }));
};
const categoriaManual = (t, valor) => {
  const sel = t.$("cierreManualCategoria");
  sel.value = valor;
  sel.dispatchEvent(new t.w.Event("change", { bubbles: true }));
};
const escribirManual = (t, texto) => {
  const ta = t.$("cierreManualTexto");
  ta.focus();
  ta.value = texto;
  ta.dispatchEvent(new t.w.Event("input", { bubbles: true }));
};

// ---------- 4 bis. Requisito de la Parte 1 · Reconocer ----------
const p1 = (t) => t.$("cierreP1")?.textContent ?? null;
const porP1 = (t) => t.$("cierrePorP1") !== null;

test("requisito P1 con dos intentos válidos: suma real de A y B, mínimo 9/16 (no el mejor resultado)", () => {
  for (const [pa, pb, linea, cat] of [
    [5, 4, "Parte 1 · Reconocer: 9/16 (A 5/8 + B 4/8) · mínimo de 9/16 alcanzado", "Avanzado"],
    [6, 3, "Parte 1 · Reconocer: 9/16 (A 6/8 + B 3/8) · mínimo de 9/16 alcanzado", "Avanzado"],
    [8, 1, "Parte 1 · Reconocer: 9/16 (A 8/8 + B 1/8) · mínimo de 9/16 alcanzado", "Avanzado"],
    [4, 4, "Parte 1 · Reconocer: 8/16 (A 4/8 + B 4/8) · no alcanza el mínimo de 9/16", "En proceso"],
  ]) {
    const t = cierreDe([pa, 8, 8, 6], [pb, 8, 8, 6]);
    assert.equal(p1(t), linea);
    assert.equal(t.panel().categoria, cat, `${pa}+${pb}`);
    assert.equal(porP1(t), cat === "En proceso", "el motivo se dice sólo cuando P1 decide");
    t.cerrar();
  }
  // 8/8 + 1/8: el mejor P1 es 8/8, pero el requisito usa la suma (9/16), no el mejor.
  const t = cierreDe([4, 8, 8, 6], [4, 8, 8, 6]);
  assert.equal(t.panel().partes[0].mejor, "4/8 · A = B");
  assert.equal(t.panel().resultado, "26/30 · 86,7 %");
  assert.equal(t.panel().categoria, "En proceso", "global 26/30 y cuatro partes, pero P1 no cumple");
  assert.match(t.panel().cuerpo, /Categoría de cierre: En proceso por el requisito de la Parte 1/);
  assert.doesNotMatch(t.panel().cuerpo, /Avanzado requiere/);
  assert.equal(t.lineas()[0], "Cierre: En proceso · 26/30 · P1 no alcanza · propuesta");
  t.cerrar();
});

test("requisito P1 con un solo intento válido: mínimo 6/8; sin intentos válidos no se cumple", () => {
  const casos = [
    // [A, B, opciones, línea, categoría]
    [[6, 8, 8, 6], [2, 8, 8, 6], { b: { cuentan: [F, T, T, T] } }, "Parte 1 · Reconocer: 6/8 (sólo A) · mínimo de 6/8 alcanzado", "Avanzado"],
    [[null, 8, 8, 6], [7, 8, 8, 6], { a: { cuentan: [F, T, T, T] } }, "Parte 1 · Reconocer: 7/8 (sólo B) · mínimo de 6/8 alcanzado", "Avanzado"],
    [[5, 8, 8, 6], [8, 8, 8, 6], { b: { cuentan: [F, T, T, T] } }, "Parte 1 · Reconocer: 5/8 (sólo A) · no alcanza el mínimo de 6/8", "En proceso"],
    [[null, 8, 8, 6], [8, 8, 8, 6], { a: { cuentan: [F, T, T, T] }, b: { cuentan: [F, T, T, T] } },
      "Parte 1 · Reconocer: sin intento válido · no se cumple: no hay ningún intento válido", "En proceso"],
  ];
  for (const [pa, pb, opciones, linea, cat] of casos) {
    const t = cierreDe(pa, pb, opciones);
    assert.equal(p1(t), linea);
    assert.equal(t.panel().categoria, cat, linea);
    t.cerrar();
  }
  // Sin P1 válida, el resto perfecto (22/22) no alcanza para salir de En proceso.
  const t = cierreDe([null, 8, 8, 6], [8, 8, 8, 6], { a: { cuentan: [F, T, T, T] }, b: { cuentan: [F, T, T, T] } });
  assert.equal(t.panel().resultado, "22/22 · 100 %");
  assert.equal(porP1(t), true);
  t.cerrar();
});

test("requisito P1 y porcentaje: 17/30 y 24/30, con y sin P1 cumplida", () => {
  for (const [pb, resultado, cat, motivo] of [
    [[6, 4, 4, 3], "17/30 · 56,7 %", "Suficiente", false],
    [[5, 4, 4, 4], "17/30 · 56,7 %", "En proceso", true],
    [[8, 6, 5, 5], "24/30 · 80 %", "Avanzado", false],
    [[5, 8, 6, 5], "24/30 · 80 %", "En proceso", true],
    [[4, 4, 3, 3], "14/30 · 46,7 %", "En proceso", false],
  ]) {
    const t = cierreDe(null, pb);
    assert.deepEqual([t.panel().resultado, t.panel().categoria, porP1(t)], [resultado, cat, motivo], pb.join("+"));
    t.cerrar();
  }
});

test("requisito P1 con denominador reducido, y aunque P1 no esté seleccionada", () => {
  // P1 y P2 elegidas, 11/16 (≥ 55 %): con P1 6/8 Suficiente; con P1 5/8 En proceso.
  let t = cierreDe(null, [6, 5, 4, 4]);
  t.marcar(3, false); t.marcar(4, false);
  assert.deepEqual([t.panel().resultado, t.panel().categoria], ["11/16 · 68,8 %", "Suficiente"]);
  t.cerrar();
  t = cierreDe(null, [5, 6, 4, 4]);
  t.marcar(3, false); t.marcar(4, false);
  assert.deepEqual([t.panel().resultado, t.panel().categoria, porP1(t)], ["11/16 · 68,8 %", "En proceso", true]);
  t.cerrar();
  // P1 fuera del denominador: el requisito se evalúa igual con su evidencia válida.
  t = cierreDe([4, 5, 4, 4], [5, 5, 4, 4]);
  t.marcar(1, false);
  assert.equal(t.panel().resultado, "13/22 · 59,1 %");
  assert.equal(p1(t), "Parte 1 · Reconocer: 9/16 (A 4/8 + B 5/8) · mínimo de 9/16 alcanzado");
  assert.equal(t.panel().categoria, "Suficiente");
  t.cerrar();
  t = cierreDe(null, [5, 5, 4, 4]);
  t.marcar(1, false);
  assert.equal(t.panel().resultado, "13/22 · 59,1 %");
  assert.equal(t.panel().categoria, "En proceso", "no seleccionar P1 no evita el requisito");
  assert.equal(porP1(t), true);
  t.cerrar();
});

test("requisito P1 y respuestas a revisar: provisoria sólo si lo pendiente puede cruzar el mínimo", () => {
  // A 4/8 + B 4/8 con un «?» en B: 8/16, podría ser 9/16 → la categoría podría pasar a Avanzado.
  let t = cierreDe([4, 8, 8, 6], [4, 8, 8, 6], { b: { cambios: { 8: "?" } } });
  assert.equal(p1(t), "Parte 1 · Reconocer: 8/16 (A 4/8 + B 4/8) · no alcanza el mínimo de 9/16 · puede alcanzarlo: a revisar");
  assert.equal(t.panel().categoria, "En proceso");
  assert.match(t.panel().provisoria, /provisoria: hay respuestas a revisar que podrían llevarla a Avanzado \(también en la Parte 1, que podría alcanzar su mínimo\)/);
  assert.match(t.lineas()[0], /^Cierre: En proceso · 26\/30 · P1 no alcanza · provisoria/);
  t.cerrar();
  // Un solo intento 5/8 con un «?»: podría ser 6/8.
  t = cierreDe(null, [5, 8, 8, 6], { b: { cambios: { 8: "B?" } } });
  assert.match(p1(t), /5\/8 \(sólo B\) · no alcanza el mínimo de 6\/8 · puede alcanzarlo: a revisar/);
  assert.match(t.panel().provisoria, /provisoria/);
  t.cerrar();
  // A 3/8 + B 4/8 con un «?»: como mucho 8/16, no cruza 9/16 → no es provisoria por P1.
  t = cierreDe([3, 8, 8, 6], [4, 8, 8, 6], { b: { cambios: { 8: "?" } } });
  assert.equal(p1(t), "Parte 1 · Reconocer: 7/16 (A 3/8 + B 4/8) · no alcanza el mínimo de 9/16");
  assert.match(t.panel().cuerpo, /podría llegar a 27\/30/, "lo pendiente se sigue mostrando");
  assert.equal(t.panel().categoria, "En proceso");
  assert.equal(t.panel().provisoria, null);
  t.cerrar();
  // P1 ya cumplida, con algo a revisar en P1: no cambia el cumplimiento ni la categoría.
  t = cierreDe([6, 8, 8, 6], [4, 8, 8, 6], { b: { cambios: { 8: "?" } } });
  assert.match(p1(t), /mínimo de 9\/16 alcanzado$/);
  assert.equal(t.panel().categoria, "Avanzado");
  assert.equal(t.panel().provisoria, null);
  t.cerrar();
});

test("modo Manual sin requisito de P1: la categoría es la elegida", () => {
  const t = cierreDe([4, 8, 8, 6], [4, 8, 8, 6]);
  assert.equal(t.panel().categoria, "En proceso");
  modo(t, "manual");
  assert.equal(p1(t), null, "en Manual no se muestra ni aplica el requisito");
  assert.equal(t.panel().categoria, null);
  categoriaManual(t, "Avanzado");
  assert.equal(t.lineas()[0], "Cierre: Avanzado · manual");
  assert.deepEqual(Object.keys(JSON.parse(t.w.localStorage.getItem(CIERRE)).estudiantes["curso x\testudiante 01"]).sort(), ["categoria", "modo"],
    "nada del requisito de P1 en el almacenamiento de cierre");
  t.cerrar();
});

// ---------- 5. Modo manual ----------
test("manual: de procesado a manual, sin categoría automática; categoría y devolución elegidas por el docente", () => {
  const escrituras = [];
  const a = [fila("A", "Estudiante 01", [8, 8, 8, 6])];
  const b = [fila("B", "Estudiante 01", [7, 7, 7, 5])];
  const t = abrir("B", { a, b, escrituras });
  t.ver(0);
  assert.equal(t.panel().categoria, "Avanzado", "procesado por defecto");
  const antes = { A: t.w.localStorage.getItem(CLAVE.A), B: t.w.localStorage.getItem(CLAVE.B) };
  const desde = escrituras.length;
  modo(t, "manual");
  let p = t.panel();
  // A y B siguen a la vista como evidencia; nada calculado ni casillas.
  assert.deepEqual(mejores(t), ["8/8 · A", "8/8 · A", "8/8 · A", "6/6 · A"]);
  assert.equal(t.$("cierre").querySelectorAll("input[data-parte]").length, 0, "sin selección de partes");
  assert.equal(p.resultado, null);
  assert.equal(p.categoria, null, "en manual no hay categoría automática");
  assert.doesNotMatch(t.$("cierre").textContent, /Resultado considerado|Avanzado requiere|Propuesta/);
  assert.equal(t.$("cierreManualCategoria").value, "", "la categoría manual empieza sin elegir");
  assert.equal(t.lineas()[0], "Cierre: manual · falta categoría");
  categoriaManual(t, "Suficiente");
  assert.equal(t.lineas()[0], "Cierre: Suficiente · manual");
  escribirManual(t, "Devolución sintética.\nSegunda línea, con «comillas» y <signos>.");
  assert.equal(t.d.activeElement, t.$("cierreManualTexto"), "escribir no redibuja el panel ni pierde el foco");
  assert.deepEqual(JSON.parse(t.w.localStorage.getItem(CIERRE)), { estudiantes: { "curso x\testudiante 01": {
    modo: "manual", categoria: "Suficiente", devolucion: "Devolución sintética.\nSegunda línea, con «comillas» y <signos>.",
  } } });
  // Sólo el almacenamiento de cierre; A y B intactos.
  assert.deepEqual([...new Set(escrituras.slice(desde))], [CIERRE]);
  assert.equal(t.w.localStorage.getItem(CLAVE.A), antes.A);
  assert.equal(t.w.localStorage.getItem(CLAVE.B), antes.B);
  const guardado = t.w.localStorage.getItem(CIERRE);
  t.cerrar();
  // Recuperar: modo, categoría y devolución vuelven tal cual, en las dos herramientas.
  for (const x of ["B", "A"]) {
    const r = abrir(x, { a, b, cierre: guardado });
    r.ver(0);
    assert.equal(r.$("cierre").querySelector('input[name="modoCierre"]:checked').value, "manual", x);
    assert.equal(r.$("cierreManualCategoria").value, "Suficiente", x);
    assert.equal(r.$("cierreManualTexto").value, "Devolución sintética.\nSegunda línea, con «comillas» y <signos>.", x);
    assert.equal(r.panel().categoria, null, x);
    assert.equal(r.lineas()[0], "Cierre: Suficiente · manual", x);
    r.cerrar();
  }
});

test("manual → procesado: vuelve el cálculo con la selección anterior y sin tocar A ni B; lo manual se conserva", () => {
  const escrituras = [];
  const a = [fila("A", "Estudiante 01", [8, 3, 5, 2])];
  const b = [fila("B", "Estudiante 01", [6, 4, 5, 3])];
  const t = abrir("B", { a, b, escrituras });
  t.ver(0);
  const antes = { A: t.w.localStorage.getItem(CLAVE.A), B: t.w.localStorage.getItem(CLAVE.B) };
  const desde = escrituras.length;
  t.marcar(2, false);
  assert.equal(t.panel().resultado, "16/22 · 72,7 %");
  modo(t, "manual");
  categoriaManual(t, "En proceso");
  escribirManual(t, "Texto sintético.");
  modo(t, "procesado");
  const p = t.panel();
  assert.deepEqual(p.partes.map((x) => x.cuenta), [T, F, T, T], "la selección de partes se recupera");
  assert.equal(p.resultado, "16/22 · 72,7 %");
  assert.equal(p.categoria, "Suficiente", "la categoría vuelve a ser la calculada, no la manual");
  assert.equal(t.$("cierreManualTexto"), null);
  assert.equal(t.lineas()[0], "Cierre: Suficiente · 16/22");
  assert.deepEqual([...new Set(escrituras.slice(desde))], [CIERRE]);
  assert.equal(t.w.localStorage.getItem(CLAVE.A), antes.A);
  assert.equal(t.w.localStorage.getItem(CLAVE.B), antes.B);
  // Lo manual queda guardado, sin usarse, por si se vuelve a Manual.
  modo(t, "manual");
  assert.equal(t.$("cierreManualCategoria").value, "En proceso");
  assert.equal(t.$("cierreManualTexto").value, "Texto sintético.");
  t.cerrar();
});

test("manual en un estudiante no cambia el cierre procesado de los demás", () => {
  const b = [fila("B", "Estudiante 01", [7, 7, 7, 5]), fila("B", "Estudiante 02", [6, 5, 4, 4])];
  const t = abrir("B", { b });
  t.ver(0);
  modo(t, "manual");
  categoriaManual(t, "Avanzado");
  assert.deepEqual(t.lineas(), ["Cierre: Avanzado · manual", "Cierre: Suficiente · 19/30 · sin A · propuesta"]);
  t.$("btnSiguienteVista").click();
  assert.equal(t.$("cierre").querySelector('input[name="modoCierre"]:checked').value, "procesado");
  assert.equal(t.panel().categoria, "Suficiente");
  t.cerrar();
});

test("Borrar decisiones de cierre: confirma, borra sólo esa clave y vuelve a la propuesta", () => {
  const escrituras = [];
  const a = [fila("A", "Estudiante 01", [6, 6, 6, 4])];
  const b = [fila("B", "Estudiante 01", [7, 2, 6, 3])];
  const t = abrir("B", { a, b, escrituras });
  t.ver(0);
  t.marcar(2, false);
  modo(t, "manual");
  escribirManual(t, "Texto sintético.");
  const antes = { A: t.w.localStorage.getItem(CLAVE.A), B: t.w.localStorage.getItem(CLAVE.B) };
  t.w.confirm = () => false;
  t.$("btnBorrarCierre").click();
  assert.notEqual(t.w.localStorage.getItem(CIERRE), null, "cancelar no borra");
  t.w.confirm = () => true;
  const desde = escrituras.length;
  t.$("btnBorrarCierre").click();
  assert.equal(t.w.localStorage.getItem(CIERRE), null);
  assert.deepEqual(escrituras.slice(desde), [`borrar ${CIERRE}`]);
  assert.equal(t.w.localStorage.getItem(CLAVE.A), antes.A);
  assert.equal(t.w.localStorage.getItem(CLAVE.B), antes.B);
  assert.equal(t.$("cierre").querySelector('input[name="modoCierre"]:checked').value, "procesado");
  assert.match(t.panel().estado, /^Propuesta/);
  t.cerrar();
});

// ---------- 5 bis. Consolidación manual A ↔ B ----------
const vincularCon = (t, nombre) => {
  const sel = t.$("cierreCandidato");
  const op = [...sel.options].find((o) => o.textContent === nombre);
  assert.ok(op, `«${nombre}» entre los candidatos: ${[...sel.options].map((o) => o.textContent).join(", ")}`);
  sel.value = op.value;
  t.$("btnVincular").click();
};
const candidatos = (t) => (t.$("cierreCandidato") ? [...t.$("cierreCandidato").options].slice(1).map((o) => o.textContent) : null);

test("vínculo manual: nombres distintos no emparejan solos; al vincular se consolidan con todo el cierre", () => {
  const escrituras = [];
  const a = [fila("A", "Pérez, Juan", [4, 8, 8, 6]), fila("A", "Estudiante 02", [6, 6, 6, 4]), fila("A", "Estudiante 05", [6, 6, 6, 4], { curso: "Curso Y" })];
  const b = [fila("B", "Juan Pérez", [5, 2, 3, 2]), fila("B", "Estudiante 02", [7, 7, 7, 5])];
  const t = abrir("B", { a, b, escrituras });
  const antes = { A: t.w.localStorage.getItem(CLAVE.A), B: t.w.localStorage.getItem(CLAVE.B) };
  t.ver(0);
  let p = t.panel();
  assert.match(p.emparejamiento[0], /^No se encontró Evaluación A correspondiente/);
  assert.deepEqual(p.partes.map((x) => x.A), ["—", "—", "—", "—"]);
  assert.equal(p.categoria, "En proceso", "sólo B: 12/30");
  // Sólo del mismo curso y libres: «Estudiante 02» ya está emparejado automáticamente; «Estudiante 05» es de otro curso.
  assert.deepEqual(candidatos(t), ["Pérez, Juan"]);
  const desde = escrituras.length;
  vincularCon(t, "Pérez, Juan");
  p = t.panel();
  assert.match(p.emparejamiento[0], /^Evaluación A: vinculado manualmente con «Pérez, Juan» \(Curso X\)\./);
  assert.ok(t.$("btnDesvincular"));
  assert.equal(t.$("cierreCandidato"), null);
  // Mejor evidencia, P1 (suma real 4 + 5 = 9/16), porcentaje y Avanzado, con los dos intentos.
  assert.deepEqual(mejores(t), ["5/8 · B", "8/8 · A", "8/8 · A", "6/6 · A"]);
  assert.equal(p1(t), "Parte 1 · Reconocer: 9/16 (A 4/8 + B 5/8) · mínimo de 9/16 alcanzado");
  assert.equal(p.resultado, "27/30 · 90 %");
  assert.equal(p.categoria, "Avanzado");
  assert.equal(t.lineas()[0], "Cierre: Avanzado · 27/30 · vínculo manual · propuesta");
  assert.equal(t.lineas()[1], "Cierre: Avanzado · 26/30 · propuesta", "el emparejamiento automático de los demás sigue igual");
  // Sólo se escribió la clave de cierre, con la referencia mínima A ↔ B.
  assert.deepEqual([...new Set(escrituras.slice(desde))], [CIERRE]);
  assert.deepEqual(JSON.parse(t.w.localStorage.getItem(CIERRE)), { estudiantes: {}, vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }] });
  assert.equal(t.w.localStorage.getItem(CLAVE.A), antes.A);
  assert.equal(t.w.localStorage.getItem(CLAVE.B), antes.B);
  // Decidir después: la decisión va con la clave de la A (la misma desde las dos herramientas).
  t.marcar(2, false);
  const guardado = t.w.localStorage.getItem(CIERRE);
  assert.deepEqual(Object.keys(JSON.parse(guardado).estudiantes), ["curso x\tperez, juan"]);
  t.cerrar();
  // Recargar B: el vínculo y la decisión siguen.
  const r = abrir("B", { a, b, cierre: guardado });
  r.ver(0);
  assert.match(r.panel().emparejamiento[0], /vinculado manualmente con «Pérez, Juan»/);
  assert.deepEqual(r.panel().partes.map((x) => x.cuenta), [T, F, T, T]);
  assert.equal(r.panel().resultado, "19/22 · 86,4 %");
  r.cerrar();
  // Abrir A: el mismo vínculo, visto desde el otro lado, con la misma decisión.
  const enA = abrir("A", { a, b, cierre: guardado });
  enA.ver(0);
  assert.match(enA.panel().emparejamiento[0], /^Evaluación B: vinculado manualmente con «Juan Pérez» \(Curso X\)\./);
  assert.deepEqual(enA.panel().partes.map((x) => [x.A, x.B, x.cuenta]), [["4/8", "5/8", T], ["8/8", "2/8", F], ["8/8", "3/8", T], ["6/6", "2/6", T]]);
  assert.equal(enA.panel().resultado, "19/22 · 86,4 %");
  assert.equal(enA.lineas()[0], "Cierre: Suficiente · 19/22 · vínculo manual");
  enA.cerrar();
});

test("desvincular: vuelve al emparejamiento normal y no toca A ni B", () => {
  const escrituras = [];
  const a = [fila("A", "Pérez, Juan", [4, 8, 8, 6]), fila("A", "Gómez, Ana", [6, 6, 6, 4])];
  const b = [fila("B", "Juan Pérez", [5, 2, 3, 2]), fila("B", "Ana Gómez", [6, 6, 6, 4])];
  const otro = { A: "curso x\tgomez, ana", B: "curso x\tana gomez" };
  const cierre = JSON.stringify({ estudiantes: {}, vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }, otro] });
  const t = abrir("A", { a, b, cierre, escrituras });
  const antes = { A: t.w.localStorage.getItem(CLAVE.A), B: t.w.localStorage.getItem(CLAVE.B) };
  t.ver(0);
  assert.equal(t.panel().resultado, "27/30 · 90 %");
  const desde = escrituras.length;
  t.$("btnDesvincular").click();
  const p = t.panel();
  assert.match(p.emparejamiento[0], /^No se encontró Evaluación B correspondiente/);
  assert.deepEqual(p.partes.map((x) => x.B), ["—", "—", "—", "—"]);
  assert.equal(p.resultado, "26/30 · 86,7 %");
  assert.equal(p.categoria, "En proceso", "sólo A: P1 4/8 con un intento no alcanza 6/8");
  assert.deepEqual(candidatos(t), ["Juan Pérez"], "se puede volver a vincular (Ana Gómez sigue vinculada)");
  assert.deepEqual(JSON.parse(t.w.localStorage.getItem(CIERRE)), { estudiantes: {}, vinculos: [otro] }, "se borró sólo ese vínculo");
  assert.match(t.lineas()[1], /vínculo manual/);
  assert.deepEqual([...new Set(escrituras.slice(desde))], [CIERRE]);
  assert.equal(t.w.localStorage.getItem(CLAVE.A), antes.A);
  assert.equal(t.w.localStorage.getItem(CLAVE.B), antes.B);
  t.cerrar();
});

test("un registro de la otra evaluación no se puede vincular dos veces", () => {
  const a = [fila("A", "Pérez, Juan", [4, 8, 8, 6]), fila("A", "Estudiante 07", [4, 4, 4, 4])];
  const b = [fila("B", "Juan Pérez", [5, 2, 3, 2]), fila("B", "Estudiante Siete", [5, 5, 5, 5])];
  const t = abrir("B", { a, b });
  t.ver(0);
  assert.deepEqual(candidatos(t), ["Pérez, Juan", "Estudiante 07"]);
  // Elegido el candidato en la otra fila mientras tanto: no se ofrece ni se acepta.
  t.$("btnSiguienteVista").click();
  vincularCon(t, "Pérez, Juan");
  t.$("btnAnteriorVista").click();
  assert.deepEqual(candidatos(t), ["Estudiante 07"], "el ya vinculado no se ofrece");
  // Aun forzando el valor, la operación se rechaza y no cambia nada.
  const antes = t.w.localStorage.getItem(CIERRE);
  const sel = t.$("cierreCandidato");
  const op = t.d.createElement("option");
  op.value = "curso x\tperez, juan";
  sel.append(op);
  sel.value = op.value;
  t.$("btnVincular").click();
  assert.match(t.$("mensaje").textContent, /ya no está disponible para vincular/);
  assert.equal(t.w.localStorage.getItem(CIERRE), antes);
  // Y un vínculo duplicado escrito a mano en el almacenamiento se ignora.
  t.cerrar();
  const doble = JSON.stringify({ estudiantes: {}, vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }, { A: "curso x\tperez, juan", B: "curso x\testudiante siete" }] });
  const r = abrir("B", { a, b, cierre: doble });
  assert.deepEqual(r.lineas().map((l) => /vínculo manual/.test(l)), [true, false]);
  r.cerrar();
});

test("vínculo manual: la decisión que tenía la B pasa al par; el vínculo roto se avisa y no se usa", () => {
  const a = [fila("A", "Pérez, Juan", [4, 8, 8, 6])];
  const b = [fila("B", "Juan Pérez", [5, 2, 3, 2])];
  const t = abrir("B", { a, b });
  t.ver(0);
  modo(t, "manual");
  categoriaManual(t, "Suficiente");
  vincularCon(t, "Pérez, Juan");
  assert.equal(t.$("cierreManualCategoria").value, "Suficiente", "la decisión sigue al vincular");
  assert.deepEqual(Object.keys(JSON.parse(t.w.localStorage.getItem(CIERRE)).estudiantes), ["curso x\tperez, juan"]);
  const guardado = t.w.localStorage.getItem(CIERRE);
  t.cerrar();
  // Si después se renombra el registro de A, el vínculo no adivina: queda roto y visible.
  const r = abrir("B", { a: [fila("A", "Pérez, Juan Carlos", [4, 8, 8, 6])], b, cierre: guardado });
  r.ver(0);
  modo(r, "procesado");
  assert.equal(r.panel().alerta, true);
  assert.match(r.panel().emparejamiento[0], /el vínculo manual ya no encuentra un registro único/);
  assert.deepEqual(r.panel().partes.map((x) => x.A), ["—", "—", "—", "—"]);
  assert.match(r.panel().provisoria, /el vínculo manual con la Evaluación A no encuentra un registro único/);
  r.$("btnDesvincular").click();
  assert.deepEqual(candidatos(r), ["Pérez, Juan Carlos"]);
  r.cerrar();
});

test("precedencia: un vínculo manual sigue firme aunque después aparezca una coincidencia automática", () => {
  const vinculo = JSON.stringify({ estudiantes: {}, vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }] });
  // Más tarde se carga en A otro registro llamado como el de B.
  const a = [fila("A", "Pérez, Juan", [4, 8, 8, 6]), fila("A", "Juan Pérez", [1, 1, 1, 1])];
  const b = [fila("B", "Juan Pérez", [5, 2, 3, 2])];
  const enB = abrir("B", { a, b, cierre: vinculo });
  enB.ver(0);
  assert.match(enB.panel().emparejamiento[0], /vinculado manualmente con «Pérez, Juan»/);
  assert.equal(enB.panel().partes[0].A, "4/8");
  enB.cerrar();
  // Desde A, el nuevo registro no se empareja con el B ya vinculado: no hay contradicción.
  const enA = abrir("A", { a, b, cierre: vinculo });
  assert.deepEqual(enA.lineas().map((l) => l.replace(/ · propuesta$/, "")), ["Cierre: Avanzado · 27/30 · vínculo manual", "Cierre: En proceso · 4/30 · sin B"]);
  enA.ver(1);
  assert.match(enA.panel().emparejamiento[0], /^No se encontró Evaluación B correspondiente/);
  assert.match(enA.panel().emparejamiento[1], /No hay registros de la Evaluación B de este curso disponibles/);
  enA.cerrar();
});

test("registros indistinguibles en un mismo intento: siguen ambiguos y no se ofrecen para vincular", () => {
  const a = [fila("A", "Estudiante 08", [8, 8, 8, 6]), fila("A", "estudiante 08", [1, 1, 1, 1]), fila("A", "Otro Nombre", [6, 6, 6, 4])];
  const b = [fila("B", "Estudiante 08", [6, 5, 4, 4]), fila("B", "Nombre Distinto", [6, 6, 6, 4])];
  const t = abrir("B", { a, b });
  t.ver(0);
  assert.match(t.panel().emparejamiento[0], /hay 2 registros con este curso y estudiante; no se usa ninguno/);
  assert.equal(t.$("cierreCandidato"), null, "ambiguo: sin consolidación manual");
  t.$("btnSiguienteVista").click();
  assert.deepEqual(candidatos(t), ["Otro Nombre"], "los duplicados de A no se ofrecen");
  t.cerrar();
});

// ---------- 5 ter. Devolución: capa objetiva y orientación ----------
// Cambios que dejan mal los ítems dados (con una letra válida de la parte).
const errar = (x, items, extra = {}) => ({ ...Object.fromEntries(items.map((n) => [n, BUENAS[x][n - 1] === "A" ? "B" : "A"])), ...extra });
const PERFECTO = [8, 8, 8, 6];
const contenido = (t, id) => {
  const tr = t.$("cierre").querySelector(`.cierre-tabla-contenidos tr[data-eje="${id}"]`);
  const td = [...tr.querySelectorAll("td")];
  const sinPct = (e) => { const x = e.cloneNode(true); x.querySelectorAll(".pct").forEach((p) => p.remove()); return x.textContent; };
  return { A: td[0].textContent, B: td[1].textContent, AB: sinPct(td[2]), pct: td[2].querySelector(".pct")?.textContent.trim() ?? null, lectura: td[3].textContent };
};
// Orientación: { id de eje: verbo } según las unidades marcadas, y el texto.
const orienta = (t) => {
  const o = t.$("cierreOrientacion");
  return {
    verbos: Object.fromEntries([...o.querySelectorAll(".foco")].flatMap((f) => f.dataset.ejes.split(" ").map((k) => [k, f.dataset.verbo]))),
    texto: o.textContent,
    categoria: o.dataset.categoria,
  };
};
const capaObjetiva = (t) => ({
  rapida: t.$("cierreResumenPartes").textContent,
  partes: t.panel().partes.map(({ A, B, mejor, pct }) => ({ A, B, mejor, pct })),
  contenidos: t.$("cierre").querySelector(".cierre-tabla-contenidos").outerHTML,
});

test("resultados por parte: A y B con porcentaje, mejor evidencia con porcentaje y procedencia, lectura rápida", () => {
  const t = cierreDe([6, 5, 7, 5], [7, 7, 5, null], { b: { cuentan: [T, T, T, F], cambios: { 3: "?" } } });
  const p = t.panel();
  assert.deepEqual(p.partes[1], { A: "5/8", B: "7/8", mejor: "7/8 · B", pct: ["(62,5 %)", "(87,5 %)", "(87,5 %)"], cuenta: T, habilitada: T });
  // Empate: procedencia A = B (y el «?» de B podría desempatar).
  assert.equal(p.partes[0].mejor, "6/8 · A = B · puede subir: a revisar");
  // «?» en B: visible y no es error firme (6 aciertos + 1 a revisar sobre 8).
  assert.equal(p.partes[0].B, "6/8 · 1 a revisar");
  // Parte 4: sólo válida en A; la de B no se presenta como evidencia (sin porcentaje).
  assert.equal(p.partes[3].B, "no contabilizada");
  assert.deepEqual(p.partes[3].pct, ["(83,3 %)", null, "(83,3 %)"]);
  assert.equal(p.partes[3].mejor, "5/6 · A");
  assert.equal(t.$("cierreResumenPartes").textContent, "Reconocer 75 % · Relacionar 87,5 % · Interpretar 87,5 % · Usar lo que sabés 83,3 %");
  t.cerrar();
});

test("contenidos: A+B acumulados con los ítems de cada evaluación (el 28 de B en dos ejes), sólo evidencia firme", () => {
  // RAM: A {7, 13, 22}; B {7, 13, 22, 28}. SO: A {8, 15, 23, 28, 29}; B {8, 15, 28, 29, 30}.
  const t = cierreDe(PERFECTO, PERFECTO, { a: { cambios: errar("A", [7]) }, b: { cambios: errar("B", [13, 28], { 22: "?" }) } });
  assert.deepEqual(contenido(t, "ram"), { A: "2/3", B: "1/3 · 1 a revisar", AB: "3/6 · 1 a revisar", pct: "(50 %)", lectura: "merece atención" });
  // El 28 de B también resta en SO; el 28 de A está bien y el 23 de A cuenta en SO, no en representaciones.
  assert.deepEqual(contenido(t, "so"), { A: "5/5", B: "4/5", AB: "9/10", pct: "(90 %)", lectura: "sin señal" });
  assert.deepEqual(contenido(t, "repr").AB, "6/6", "repr: A {16, 19, 27} + B {16, 19, 23}");
  // CPU: A {6, 20, 30} y B {6, 20}: distinta cantidad de evidencia.
  assert.deepEqual(contenido(t, "cpu"), { A: "3/3", B: "2/2", AB: "5/5", pct: "(100 %)", lectura: "sin señal" });
  // Sólo partes válidas: sin la Parte 1 de B, sus ítems 7 y 8 no entran.
  t.cerrar();
  const u = cierreDe(PERFECTO, PERFECTO, { a: { cambios: errar("A", [7]) }, b: { cuentan: [F, T, T, T], cambios: errar("B", [7, 13]) } });
  assert.deepEqual(contenido(u, "ram"), { A: "2/3", B: "2/3", AB: "4/6", pct: "(66,7 %)", lectura: "merece atención" });
  u.cerrar();
});

test("contenidos: la selección docente de partes no recorta la evidencia; Manual y Procesado comparten la capa objetiva", () => {
  const escrituras = [];
  const a = [fila("A", "Estudiante 01", PERFECTO, { cambios: errar("A", [7, 13, 14, 17]) })];
  const b = [fila("B", "Estudiante 01", PERFECTO, { cambios: errar("B", [7, 22, 18, 27], { 26: "?" }) })];
  const t = abrir("B", { a, b, escrituras });
  t.ver(0);
  const antes = capaObjetiva(t);
  t.marcar(1, false); t.marcar(3, false);
  assert.equal(capaObjetiva(t).contenidos, antes.contenidos, "quitar partes de la categoría no cambia los contenidos");
  const desde = escrituras.length;
  modo(t, "manual");
  const enManual = capaObjetiva(t);
  assert.equal(enManual.contenidos, antes.contenidos);
  assert.equal(enManual.rapida, antes.rapida);
  assert.deepEqual(enManual.partes, antes.partes);
  categoriaManual(t, "Suficiente");
  escribirManual(t, "Texto sintético.");
  modo(t, "procesado");
  assert.equal(capaObjetiva(t).contenidos, antes.contenidos, "cambiar de modo no altera los datos");
  // Nada derivado en el almacenamiento de cierre: sólo decisiones.
  const guardado = JSON.parse(t.w.localStorage.getItem(CIERRE));
  assert.deepEqual(guardado, { estudiantes: { "curso x\testudiante 01": { modo: "procesado", partes: [F, T, F, T], categoria: "Suficiente", devolucion: "Texto sintético." } } });
  assert.doesNotMatch(t.w.localStorage.getItem(CIERRE), /%|aciertos|errores|nivel|orient|Repasar|Volver|ram|estado/);
  assert.deepEqual([...new Set(escrituras.slice(desde))], [CIERRE]);
  t.cerrar();
});

test("intensidad por contenido: sin señal, merece atención, fuerte; poca evidencia no se sobreinterpreta", () => {
  // Entrada y salida en A y B (5 + 5 ítems firmes): 3 errores de 10 no marcan; 4 sí; 6 es fuerte.
  for (const [ma, mb, lectura] of [
    [[4], [4], "sin señal"],
    [[4, 5], [4], "sin señal"],
    [[4, 5], [4, 5], "merece atención"],
    [[4, 5, 12], [4, 5, 12], "dificultad fuerte"],
  ]) {
    const t = cierreDe(PERFECTO, PERFECTO, { a: { cambios: errar("A", ma) }, b: { cambios: errar("B", mb) } });
    assert.equal(contenido(t, "es").lectura, lectura, `${ma.length + mb.length} de 10`);
    t.cerrar();
  }
  // Un solo intento, como la devolución por intento: 2 de 3 es fuerte; 2 de 4, atención.
  let t = cierreDe(null, PERFECTO, { b: { cambios: errar("B", [1, 2, 7, 13]) } });
  assert.equal(contenido(t, "hw").lectura, "dificultad fuerte");
  assert.equal(contenido(t, "ram").lectura, "merece atención");
  t.cerrar();
  // CPU de B: 2 ítems, los dos mal → como mucho «merece atención», con aviso de poca evidencia.
  t = cierreDe(null, PERFECTO, { b: { cambios: errar("B", [6, 20]) } });
  assert.equal(contenido(t, "cpu").lectura, "merece atención poca evidencia");
  t.cerrar();
  // Lo «a revisar» no endurece: con 2 errores y 1 «?» de 4 (RAM de B), fuerte en firme pero la orientación usa la lectura menor.
  t = cierreDe(null, PERFECTO, { b: { cambios: errar("B", [7, 13], { 22: "?" }) } });
  assert.deepEqual(contenido(t, "ram"), { A: "—", B: "1/3 · 1 a revisar", AB: "1/3 · 1 a revisar", pct: "(33,3 %)", lectura: "dificultad fuerte (a confirmar)" });
  modo(t, "manual");
  categoriaManual(t, "En proceso");
  assert.equal(orienta(t).verbos.ram, "Repasar", "no «Volver a estudiar» mientras dependa de lo pendiente");
  t.cerrar();
  // Si lo pendiente puede borrar la señal, se nombra aparte («a confirmar»), no como dificultad.
  t = cierreDe(PERFECTO, PERFECTO, { a: { cambios: errar("A", [4], { 5: "?" }) }, b: { cambios: errar("B", [4], { 5: "?", 12: "?", 21: "?" }) } });
  assert.equal(contenido(t, "es").AB, "4/6 · 4 a revisar");
  assert.equal(contenido(t, "es").lectura, "merece atención (a confirmar)");
  assert.equal(t.panel().categoria, "Avanzado");
  assert.doesNotMatch(orienta(t).texto, /entrada y salida/, "en Avanzado, lo menor no se nombra");
  modo(t, "manual");
  categoriaManual(t, "En proceso");
  assert.equal(orienta(t).verbos.es, undefined);
  assert.match(orienta(t).texto, /A confirmar cuando se resuelvan las respuestas a revisar: entrada y salida\./);
  t.cerrar();
});

test("orientación coherente con la categoría: la misma evidencia se dice distinto en En proceso, Suficiente y Avanzado", () => {
  // RAM: 0 de 7 (fuerte). Estado: 3 errores de 9 (merece atención). El resto, bien.
  const a = [fila("A", "Estudiante 01", PERFECTO, { cambios: errar("A", [7, 13, 22, 14, 17]) })];
  const b = [fila("B", "Estudiante 01", PERFECTO, { cambios: errar("B", [7, 13, 22, 28, 18]) })];
  const t = abrir("B", { a, b });
  t.ver(0);
  assert.equal(contenido(t, "ram").lectura, "dificultad fuerte");
  assert.equal(contenido(t, "estado").lectura, "merece atención");
  const objetiva = capaObjetiva(t);
  modo(t, "manual");
  const esperado = {
    "En proceso": { ram: "Volver a estudiar", estado: "Repasar" },
    Suficiente: { ram: "Repasar", estado: "Consolidar" },
    Avanzado: { ram: "Reforzar" },
  };
  for (const [cat, verbos] of Object.entries(esperado)) {
    categoriaManual(t, cat);
    const o = orienta(t);
    assert.equal(o.categoria, cat);
    assert.deepEqual(o.verbos, verbos, cat);
    assert.equal(t.$("cierreManualCategoria").value, cat, "la categoría manual no se toca");
    assert.equal(t.lineas()[0], `Cierre: ${cat} · manual`);
    assert.equal(capaObjetiva(t).contenidos, objetiva.contenidos, "los datos no cambian con la categoría");
  }
  // Suficiente: nunca un mensaje de dificultad estructural; Avanzado: no menciona lo menor.
  categoriaManual(t, "Suficiente");
  assert.doesNotMatch(orienta(t).texto, /Volver a estudiar/);
  categoriaManual(t, "Avanzado");
  assert.doesNotMatch(orienta(t).texto, /estado|Repasar|Consolidar|Volver/);
  t.cerrar();
});

test("orientación procesada: En proceso pide revisión profunda; Avanzado sin errores relevantes no recibe una devolución negativa", () => {
  // En proceso real (procesado): RAM y SO muy flojos en los dos intentos.
  let t = cierreDe([3, 3, 3, 2], [3, 3, 3, 2], {
    a: { cambios: errar("A", [7, 13, 22, 8, 15, 23, 28, 29]) }, b: { cambios: errar("B", [7, 13, 22, 28, 8, 15, 29, 30]) },
  });
  assert.equal(t.panel().categoria, "En proceso");
  let o = orienta(t);
  assert.equal(o.verbos.ram, "Volver a estudiar");
  assert.equal(o.verbos.so, "Volver a estudiar");
  t.cerrar();
  // Avanzado con errores sueltos: ninguno llega a dificultad; nada que reforzar.
  t = cierreDe(PERFECTO, PERFECTO, { a: { cambios: errar("A", [4, 14, 19]) }, b: { cambios: errar("B", [10, 21]) } });
  assert.equal(t.panel().categoria, "Avanzado");
  o = orienta(t);
  assert.deepEqual(o.verbos, {});
  assert.match(o.texto, /Sin contenidos que haga falta reforzar/);
  t.cerrar();
  // Avanzado con una dificultad defendible (RAM 0 de 7): aparece como algo a reforzar.
  t = cierreDe(PERFECTO, PERFECTO, { a: { cambios: errar("A", [7, 13, 22]) }, b: { cambios: errar("B", [7, 13, 22, 28]) } });
  assert.equal(t.panel().categoria, "Avanzado");
  assert.deepEqual(orienta(t).verbos, { ram: "Reforzar" });
  t.cerrar();
  // En proceso por el requisito de la Parte 1: lo dice también la orientación.
  t = cierreDe([4, 8, 8, 6], [4, 8, 8, 6]);
  assert.match(orienta(t).texto, /afianzar la Parte 1 · Reconocer/);
  t.cerrar();
});

// ---------- 5 quater. Sin categoría y devolución del intento ----------
const VERBOS_CIERRE = /Volver a estudiar|Repasar|Consolidar|Reforzar/;
const lecturas = (t) => [...t.$("cierre").querySelectorAll(".cierre-tabla-contenidos tbody tr")].map((tr) => `${tr.dataset.eje}: ${tr.lastElementChild.textContent}`);
// RAM 0 de 7 (fuerte) y Estado 3 errores de 9 (merece atención); el resto, bien.
const dificultades = () => ({
  a: [fila("A", "Estudiante 01", PERFECTO, { cambios: errar("A", [7, 13, 22, 14, 17]) })],
  b: [fila("B", "Estudiante 01", PERFECTO, { cambios: errar("B", [7, 13, 22, 28, 18]) })],
});

test("Manual sin categoría: evidencia completa, orientación neutral; al elegir y quitar la categoría, cambia al instante", () => {
  const escrituras = [];
  const t = abrir("B", { ...dificultades(), escrituras });
  t.ver(0);
  const objetiva = capaObjetiva(t);
  const intensidad = lecturas(t);
  modo(t, "manual");
  let o = orienta(t);
  // Sin categoría: los mismos datos, y «aspectos a revisar» sin verbos de cierre.
  assert.equal(capaObjetiva(t).contenidos, objetiva.contenidos);
  assert.equal(t.$("cierreResumenPartes").textContent, objetiva.rapida);
  assert.equal(o.categoria, "");
  assert.ok(t.$("cierreSinCategoria"));
  assert.deepEqual(o.verbos, { ram: "Aspectos a revisar", estado: "Aspectos a revisar" });
  assert.doesNotMatch(o.texto, VERBOS_CIERRE);
  // Con categoría, la tabla de esa categoría; sin ella otra vez, neutral.
  categoriaManual(t, "Suficiente");
  o = orienta(t);
  assert.deepEqual(o.verbos, { ram: "Repasar", estado: "Consolidar" });
  assert.equal(t.$("cierreSinCategoria"), null);
  categoriaManual(t, "");
  o = orienta(t);
  assert.deepEqual(o.verbos, { ram: "Aspectos a revisar", estado: "Aspectos a revisar" });
  assert.doesNotMatch(o.texto, VERBOS_CIERRE);
  assert.deepEqual(lecturas(t), intensidad, "la intensidad no depende de la categoría");
  // Sólo decisiones en el almacenamiento, y ninguna clave nueva.
  assert.deepEqual(JSON.parse(t.w.localStorage.getItem(CIERRE)), { estudiantes: { "curso x\testudiante 01": { modo: "manual", categoria: null } } });
  assert.deepEqual(Object.keys(t.w.localStorage).sort(), [CLAVE.A, CLAVE.B, CIERRE].sort());
  t.cerrar();
});

test("Procesado sin categoría (ninguna parte elegida): neutral; al obtener categoría, la orientación correspondiente", () => {
  const t = abrir("B", dificultades());
  t.ver(0);
  const intensidad = lecturas(t);
  assert.equal(t.panel().categoria, "Avanzado");
  assert.deepEqual(orienta(t).verbos, { ram: "Reforzar" });
  for (const k of [1, 2, 3, 4]) t.marcar(k, false);
  assert.match(t.panel().cuerpo, /falta la decisión docente/);
  let o = orienta(t);
  assert.equal(o.categoria, "");
  assert.deepEqual(o.verbos, { ram: "Aspectos a revisar", estado: "Aspectos a revisar" });
  assert.doesNotMatch(o.texto, VERBOS_CIERRE);
  assert.equal(t.panel().partes.length, 4, "la evidencia por partes sigue visible");
  assert.deepEqual(lecturas(t), intensidad);
  t.marcar(3, true);
  assert.equal(t.panel().categoria, "Suficiente");
  o = orienta(t);
  assert.equal(o.categoria, "Suficiente");
  assert.deepEqual(o.verbos, { ram: "Repasar", estado: "Consolidar" });
  t.cerrar();
  // Sin categoría y sin dificultades: no se inventa ninguna frase.
  const u = abrir("B", { b: [fila("B", "Estudiante 02", PERFECTO)] });
  u.ver(0);
  modo(u, "manual");
  assert.equal(u.$("cierreOrientacion").querySelectorAll(".orienta").length, 0);
  u.cerrar();
});

test("devolución del intento: sigue existiendo, plegada y subordinada al cierre en Ver; igual que antes en la carga", () => {
  const t = abrir("B", dificultades());
  // En la carga (sin panel de cierre), la devolución del intento se ve como siempre.
  assert.equal(t.$("detalleIntento"), null);
  t.ver(0);
  const det = t.$("detalleIntento");
  assert.ok(det, "en Ver, dentro de un detalle");
  assert.equal(det.open, false, "cerrado por defecto");
  assert.match(det.querySelector("summary").textContent, /^Resultados y devolución de este intento sólo la Evaluación B · no es la devolución de cierre$/);
  assert.match(det.querySelector(".aviso-intento").textContent, /panel «Cierre A\+B»/);
  // Debajo del cierre.
  assert.ok(t.$("cierre").compareDocumentPosition(det) & t.w.Node.DOCUMENT_POSITION_FOLLOWING);
  // Su contenido es el del intento: la devolución de la B sola (RAM 0/4, estado 4/5).
  det.open = true;
  assert.ok(det.contains(t.$("devolucionBreve")));
  assert.equal(t.$("devolucionBreve").textContent, "Volver a estudiar: RAM y almacenamiento.");
  assert.equal(det.querySelectorAll(".ve").length, 8);
  // El cierre, en cambio, dice lo que corresponde a su categoría (Avanzado).
  assert.deepEqual(orienta(t).verbos, { ram: "Reforzar" });
  t.$("btnCerrarVista").click();
  assert.equal(t.$("detalleIntento"), null);
  assert.ok(t.$("vivo").querySelector(".vivo-cab"));
  t.cerrar();
});

// ---------- 5 quinquies. Devoluciones para imprimir, con la clave compacta ----------
const leerClave = (x) => {
  const md = readFileSync(join(root, "evaluaciones", "sistemas-informaticos", `evaluacion-${x}`, "clave-docente.md"), "utf8");
  return [...md.matchAll(/^\| (\d+) \| ((?:\*\*[A-D](?:\+[A-D])*\*\*(?:, )?)+) \|/gm)]
    .map((f) => [...f[2].matchAll(/\*\*([A-D](?:\+[A-D])*)\*\*/g)].map((m) => m[1]));
};
const CLAVE_DOCENTE = { A: leerClave("a"), B: leerClave("b") };
const curso = () => {
  // Pareja procesada, pareja manual con texto, sólo A, sólo B, vínculo manual y otro curso.
  const a = [
    fila("A", "Estudiante 01", [7, 6, 6, 5]), fila("A", "Estudiante 02", [5, 5, 5, 4]), fila("A", "Estudiante 03", [8, 8, 7, 6]),
    fila("A", "Pérez, Juan", [4, 8, 8, 6]), fila("A", "Estudiante 06", [6, 6, 6, 4], { curso: "Curso Y" }),
  ];
  const b = [
    fila("B", "Estudiante 01", [6, 7, 5, 4]), fila("B", "Estudiante 02", [6, 6, 4, 3]), fila("B", "Estudiante 04", [6, 5, 4, 4]),
    fila("B", "Juan Pérez", [5, 2, 3, 2]),
  ];
  const cierre = JSON.stringify({
    estudiantes: { "curso x\testudiante 02": { modo: "manual", categoria: "Suficiente", devolucion: "Texto sintético de la devolución.\nSegunda línea." } },
    vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }],
  });
  return { a, b, cierre };
};
const PARA_REVISAR = "Para revisar — preguntas que tuviste mal en cada evaluación, por tema";
// El encuadre, igual en todos los papeles: A+B es una evidencia; la calificación mira el período.
const ENCUADRE = "Las Evaluaciones A y B son una evidencia importante, pero la calificación del tercer bimestre considera también tus otros trabajos, las actividades de aprendizaje en el aula y la valoración conceptual del período.";
const bloques = (t) => {
  t.$("btnImpresion").click();
  return [...t.$("impresionBloques").querySelectorAll("article.final")];
};
const datosBloque = (b) => ({
  nombre: b.querySelector(".final-nombre").textContent,
  modo: b.dataset.modo,
  cat: b.querySelector(".final-cat b").textContent,
  secciones: [...b.querySelectorAll("h3")].map((h) => h.textContent),
});

test("impresión: un bloque por estudiante del curso (A y B), en orden, con todo lo previsto y la clave al final", () => {
  const escrituras = [];
  const t = abrir("B", { ...curso(), escrituras });
  assert.equal(t.$("impresion").hidden, true, "cerrada hasta pedirla");
  const desde = escrituras.length;
  const bs = bloques(t);
  assert.equal(t.$("impresion").hidden, false);
  // Sólo A (03), sólo B (04), parejas (01, 02, Pérez) y otro curso (06): cada uno una vez.
  assert.deepEqual(bs.map((b) => datosBloque(b).nombre), ["Estudiante 01", "Estudiante 02", "Estudiante 03", "Estudiante 04", "Pérez, Juan", "Estudiante 06"]);
  assert.match(bs[4].querySelector(".final-cab").textContent, /\(B: Juan Pérez\)/, "vínculo manual: los dos nombres");
  // Sin override docente: la categoría efectiva es la de la evidencia.
  assert.deepEqual(datosBloque(bs[0]), { nombre: "Estudiante 01", modo: "procesado", cat: "Avanzado",
    secciones: ["Tus resultados en las Evaluaciones A y B", PARA_REVISAR] });
  assert.deepEqual(datosBloque(bs[1]), { nombre: "Estudiante 02", modo: "manual", cat: "Suficiente",
    secciones: ["Tus resultados en las Evaluaciones A y B", PARA_REVISAR, "Nota de tu docente"] });
  assert.equal(bs[1].querySelector(".final-texto").textContent, "Texto sintético de la devolución.\nSegunda línea.");
  // La clave, siempre al final de cada bloque.
  for (const b of bs) assert.equal(b.lastElementChild.className, "clave-compacta");
  // Resultados por parte: A, B y Para A+B, sólo puntajes y sin procedencia.
  assert.deepEqual([...bs[0].querySelector("tbody tr").children].map((c) => c.textContent), ["1 · Reconocer", "7 de 8", "6 de 8", "7 de 8"]);
  // Filtrar por curso.
  t.$("impresionCurso").value = "curso y";
  t.$("impresionCurso").dispatchEvent(new t.w.Event("change"));
  assert.deepEqual([...t.$("impresionBloques").querySelectorAll(".final-nombre")].map((e) => e.textContent), ["Estudiante 06"]);
  assert.deepEqual([...new Set(escrituras.slice(desde))], [], "la vista de impresión no guarda nada");
  t.cerrar();
});

test("impresión: las líneas A y B coinciden con clave-docente.md (30 ítems, cuatro partes, A18 «B/D» con su aclaración)", () => {
  const t = abrir("B", curso());
  const bs = bloques(t);
  const textos = new Set();
  for (const b of bs) {
    const clave = b.querySelector(".clave-compacta");
    textos.add(clave.textContent);
    for (const x of ["A", "B"]) {
      const linea = clave.querySelector(`.clave-linea[data-evaluacion="${x}"]`);
      const items = [...linea.querySelectorAll(".clave-item")];
      assert.equal(items.length, 30, `línea ${x}: 30 ítems`);
      assert.deepEqual(items.map((i) => Number(i.dataset.item)), Array.from({ length: 30 }, (_, k) => k + 1));
      // Cada ítem, la respuesta de clave-docente.md (con varias aceptadas, las simples unidas por «/»).
      assert.deepEqual(items.map((i) => i.dataset.clave), CLAVE_DOCENTE[x].map((a) => a.filter((v) => !v.includes("+")).join("/")), `línea ${x}`);
      assert.deepEqual(items.map((i) => i.textContent), items.map((i) => `${i.dataset.item}${i.dataset.clave}`));
      // Cuatro partes separadas: 8, 8, 8 y 6 ítems.
      assert.deepEqual([...linea.querySelectorAll(".clave-parte")].map((p) => [p.querySelector(".clave-p").textContent, p.querySelectorAll(".clave-item").length]),
        [["P1", 8], ["P2", 8], ["P3", 8], ["P4", 6]]);
    }
    assert.equal(clave.querySelector('[data-evaluacion="A"] [data-item="18"]').textContent, "18B/D");
    assert.deepEqual(CLAVE_DOCENTE.A[17], ["B", "D", "B+D"]);
    assert.equal(clave.querySelector(".clave-nota").textContent, "A18: se acepta B, D o B+D.", "la excepción no se pierde");
  }
  assert.equal(textos.size, 1, "la misma clave repetida en cada bloque");
  assert.ok(bs.some((b) => b.dataset.modo === "manual") && bs.some((b) => b.dataset.modo === "procesado"), "en Procesado y en Manual");
  t.cerrar();
});

test("impresión: el mismo curso desde la herramienta A y desde la B", () => {
  const resumen = (x) => {
    const t = abrir(x, curso());
    const r = bloques(t).map((b) => [datosBloque(b).nombre, b.dataset.clave, datosBloque(b).cat, b.textContent]);
    t.cerrar();
    return r;
  };
  assert.deepEqual(resumen("A"), resumen("B"));
});

test("sin publicación: ninguna ruta nueva y nada de evaluaciones, claves ni herramientas en dist/", () => {
  // Las únicas rutas locales son las dos herramientas y el Cierre A+B (la misma
  // página en modo cierre), sólo en `astro dev`.
  const config = readFileSync(join(root, "astro.config.mjs"), "utf8");
  assert.match(config, /apply: "serve"/);
  assert.match(config, /\["a", "b"\]\.flatMap/);
  assert.deepEqual([...config.matchAll(/"(\/herramientas\/[^"]*)"/g)].map((m) => m[1]), ["/herramientas/cierre-evaluaciones/", "/herramientas/evaluacion-a/", "/herramientas/evaluacion-a/"]);
  assert.doesNotMatch(config, /clave|imprim/i);
  const paginas = [];
  const recorrer = (dir, salida) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta, salida);
      else salida.push(ruta);
    }
    return salida;
  };
  for (const r of recorrer(join(root, "src", "pages"), paginas)) assert.doesNotMatch(r, /evaluac|herramienta|clave|cierre/i, r);
  const dist = join(root, "dist");
  assert.ok(existsSync(join(dist, "index.html")), "Falta dist/. Ejecutá npm run build antes de npm test.");
  for (const r of recorrer(dist, [])) {
    assert.doesNotMatch(r.slice(dist.length), /evaluac|herramienta|clave|cierre/i, r);
    if (/\.(html|js|css|json|txt|xml)$/.test(r)) {
      assert.doesNotMatch(readFileSync(r, "utf8"), /aula-evaluacion|clave-docente|Clave de corrección|Cierre A\+B|Devoluciones de cierre|cierre-completo|cierre completo/i, r);
    }
  }
});

// ---------- 5 sexies. Datos anonimizados para análisis (issue #17) ----------
// Descarga interceptada: el Blob y el nombre del archivo, sin navegar.
async function exportar(t, curso = "") {
  const capturas = [];
  t.w.URL.createObjectURL = (blob) => { capturas.push({ blob }); return "blob:prueba"; };
  t.w.URL.revokeObjectURL = () => {};
  t.w.HTMLAnchorElement.prototype.click = function () { capturas.at(-1).nombre = this.download; };
  if (t.$("impresion").hidden) t.$("btnImpresion").click();
  t.$("impresionCurso").value = curso;
  t.$("impresionCurso").dispatchEvent(new t.w.Event("change"));
  t.$("btnExportarAnonimo").click();
  const { blob, nombre } = capturas.at(-1);
  const texto = await blob.text();
  return { nombre, texto, datos: JSON.parse(texto), tipo: blob.type };
}
// Dos cursos, todos los casos: A+B procesado (P1 cumple), A+B manual con texto, sólo A,
// sólo B, vínculo manual con nombres distintos, partes no elegidas, P1 no cumplida,
// «a revisar» y un caso provisorio. Nombres sintéticos rastreables.
const PRIVADOS = ["Zoila Ficticia", "Quintín Inventado", "Úrsula Sintética", "Ramón Prueba", "Pérez, Juan", "Juan Pérez", "Wanda Ejemplo", "Texto manual secreto 7319"];
function cursoAnalisis() {
  const a = [
    fila("A", "Zoila Ficticia", [7, 6, 6, 5], { cambios: errar("A", [], { 9: "?" }) }),
    fila("A", "Quintín Inventado", [5, 5, 5, 4]),
    fila("A", "Úrsula Sintética", [8, 8, 7, 6]),
    fila("A", "Pérez, Juan", [4, 8, 8, 6]),
    fila("A", "Wanda Ejemplo", [6, 6, 6, 4], { curso: "Curso Y" }),
  ];
  const b = [
    fila("B", "Zoila Ficticia", [6, 7, 5, 4]),
    fila("B", "Quintín Inventado", [6, 6, 4, 3]),
    fila("B", "Ramón Prueba", [5, 5, 4, 4]),
    fila("B", "Juan Pérez", [5, 2, 3, 2]),
  ];
  const cierre = JSON.stringify({
    estudiantes: {
      "curso x\tquintin inventado": { modo: "manual", categoria: "Suficiente", devolucion: "Texto manual secreto 7319" },
      "curso x\tzoila ficticia": { modo: "procesado", partes: [T, T, T, F] },
    },
    vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }],
  });
  return { a, b, cierre };
}

test("export anonimizado: estructura, alcance y evidencia por estudiante (procesado, manual, sólo A, sólo B, vínculo)", async () => {
  const t = abrir("B", cursoAnalisis());
  const { nombre, datos, tipo } = await exportar(t);
  assert.match(nombre, /^cierre-anonimizado-todos-los-cursos-\d{4}-\d{2}-\d{2}\.json$/);
  assert.match(tipo, /^application\/json/);
  assert.deepEqual(Object.keys(datos), ["formato", "version", "generado", "descripcion", "alcance", "definiciones", "estructura", "estudiantes"]);
  assert.equal(datos.version, 1);
  assert.ok(!Number.isNaN(Date.parse(datos.generado)));
  assert.deepEqual(datos.alcance.cursos, ["Curso X", "Curso Y"]);
  assert.equal(datos.alcance.estudiantes, 6);
  assert.deepEqual(datos.alcance.por_curso.map((c) => [c.curso, c.estudiantes]), [["Curso X", 5], ["Curso Y", 1]]);
  assert.deepEqual(datos.estructura.partes.map((p) => p.items), [8, 8, 8, 6]);
  assert.deepEqual(datos.estructura.contenidos.find((c) => c.id === "ram").items, { A: [7, 13, 22], B: [7, 13, 22, 28] });
  // Ids efímeros: curso + número, distintos y sin relación con los nombres.
  const ids = datos.estudiantes.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of datos.estudiantes) assert.match(e.id, new RegExp(`^${e.curso} · \\d{2}$`));
  // Ubicar a cada estudiante sintético por su evidencia (no por nombre).
  const por = (f) => datos.estudiantes.filter(f);
  const manual = por((e) => e.cierre.modo === "manual");
  assert.equal(manual.length, 1);
  assert.deepEqual(manual[0].cierre, { modo: "manual", categoria: "Suficiente", provisoria: false, motivos_provisoria: [],
    seleccion_confirmada: null, partes_consideradas: null, resultado_considerado: null, en_proceso_por_requisito_p1: null });
  assert.deepEqual(manual[0].partes[0].A, { estado: "valida", aciertos: 5, total: 8, porcentaje: 62.5, revisar: 0 }, "en manual, la evidencia objetiva completa");
  // Zoila: A+B procesado con P4 no elegida y un «?» en A (ítem 9).
  const zoila = por((e) => e.cierre.partes_consideradas?.join() === "1,2,3")[0];
  assert.deepEqual(zoila.intentos, { presentes: { A: true, B: true }, validos: 2, emparejamiento: "automatico" });
  assert.deepEqual(zoila.cierre.resultado_considerado, { aciertos: 20, total: 24, porcentaje: 83.3 });
  assert.equal(zoila.cierre.categoria, "Suficiente");
  assert.equal(zoila.cierre.seleccion_confirmada, true);
  assert.deepEqual(zoila.partes.map((p) => p.cuenta_para_cierre), [T, T, T, F]);
  assert.deepEqual(zoila.partes[1], { parte: 2, A: { estado: "valida", aciertos: 5, total: 8, porcentaje: 62.5, revisar: 1 },
    B: { estado: "valida", aciertos: 7, total: 8, porcentaje: 87.5, revisar: 0 }, mejor: { aciertos: 7, total: 8, porcentaje: 87.5, de: ["B"], puede_subir_al_revisar: false },
    cuenta_para_cierre: true });
  assert.deepEqual(zoila.requisito_p1, { cumple: true, intentos_validos: 2, aciertos: 13, total: 16, minimo: 9, alcanzable_si_se_revisa: false });
  // Contenidos: A y B por separado (para analizar la evolución) y acumulados.
  const datosZ = zoila.contenidos.find((c) => c.id === "hw");
  assert.deepEqual(datosZ, { id: "hw", A: { aciertos: 2, errores: 0, revisar: 1 }, B: { aciertos: 3, errores: 0, revisar: 0 },
    AB: { aciertos: 5, errores: 0, firme: 5, porcentaje: 100, revisar: 1 }, intensidad: 0, intensidad_incierta: false });
  // Sólo A, sólo B y vínculo manual.
  assert.equal(por((e) => e.intentos.presentes.A && !e.intentos.presentes.B && e.curso === "Curso X").length, 1);
  const soloB = por((e) => !e.intentos.presentes.A && e.intentos.presentes.B);
  assert.equal(soloB.length, 1);
  assert.deepEqual(soloB[0].partes[0].A, null);
  assert.deepEqual(soloB[0].contenidos[0].A, null);
  assert.equal(soloB[0].requisito_p1.cumple, false, "sólo B con P1 5/8");
  assert.equal(soloB[0].cierre.en_proceso_por_requisito_p1, true);
  const vinculado = por((e) => e.intentos.emparejamiento === "manual");
  assert.equal(vinculado.length, 1);
  assert.deepEqual(vinculado[0].intentos.presentes, { A: true, B: true });
  t.cerrar();
});

test("export anonimizado: a revisar y caso provisorio, con motivos estructurados", async () => {
  // B: 23/30 con un «?» en P1 (podría ser Avanzado) → provisoria.
  const t = abrir("B", { b: [fila("B", "Estudiante Provisorio", [7, 6, 5, 5], { cambios: { 8: "?" } })] });
  const { datos } = await exportar(t);
  const [e] = datos.estudiantes;
  assert.equal(e.cierre.categoria, "Suficiente");
  assert.equal(e.cierre.provisoria, true);
  assert.deepEqual(e.cierre.motivos_provisoria, ["respuestas_a_revisar"]);
  assert.equal(e.partes[0].B.revisar, 1);
  assert.equal(e.partes[0].mejor.puede_subir_al_revisar, true);
  assert.equal(e.contenidos.find((c) => c.id === "so").AB.revisar, 1, "el ítem 8 de B es de SO");
  t.cerrar();
});

test("export anonimizado: privacidad estricta (sin nombres, claves, respuestas, textos ni vínculos) y sin escribir nada", async () => {
  const escrituras = [];
  const t = abrir("B", { ...cursoAnalisis(), escrituras });
  const antes = Object.fromEntries([CLAVE.A, CLAVE.B, CIERRE].map((k) => [k, t.w.localStorage.getItem(k)]));
  const desde = escrituras.length;
  const { texto, datos } = await exportar(t);
  // Ninguna cadena privada sintética, en ninguna forma.
  const plano = texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  for (const p of PRIVADOS) {
    assert.ok(!texto.includes(p), `contiene «${p}»`);
    assert.ok(!plano.includes(p.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()), `contiene «${p}» normalizado`);
  }
  for (const palabra of ["zoila", "quintin", "ursula", "ramon", "perez", "wanda", "secreto", "7319"]) assert.ok(!plano.includes(palabra), palabra);
  // Ni claves de emparejamiento, ni ids de registro, ni vínculos, ni almacenamiento.
  assert.doesNotMatch(texto, /\\t|curso x\\t|aula-evaluacion|localStorage|"vinculos?"|"devolucion"|"respuestas"|claveRegistro/i);
  const claves = new Set();
  const recorrer = (v) => { if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { claves.add(k); recorrer(x); } };
  recorrer(datos);
  for (const k of ["estudiante", "nombre_estudiante", "clave", "respuestas", "devolucion", "vinculo", "vinculos", "otra", "registro"]) assert.ok(!claves.has(k), k);
  // Respuestas crudas: ninguna lista de 30 letras ni valores tipo «B+D», «B?».
  assert.doesNotMatch(texto, /"[A-D](\+[A-D])*\??"(,\s*"[A-D](\+[A-D])*\??"){7,}/);
  assert.doesNotMatch(texto, /"[A-D]\?"|"[A-D]\+[A-D]"/);
  // Ids: no derivan del nombre; regenerar no necesita identidad estable.
  for (const e of datos.estudiantes) assert.match(e.id, /^Curso [XY] · \d{2}$/);
  const otra = (await exportar(t)).datos;
  assert.deepEqual(otra.estudiantes.map((e) => e.id).sort(), datos.estudiantes.map((e) => e.id).sort());
  // Nada se escribe: ni A, ni B, ni las decisiones.
  assert.deepEqual([...new Set(escrituras.slice(desde))], []);
  for (const [k, v] of Object.entries(antes)) assert.equal(t.w.localStorage.getItem(k), v, k);
  t.cerrar();
});

test("export anonimizado: el número del id no sigue el orden de los nombres (se asigna al azar en cada export)", async () => {
  const t = abrir("B", cursoAnalisis());
  const primeros = new Set();
  for (let i = 0; i < 20; i++) {
    const { datos } = await exportar(t);
    const e = datos.estudiantes.find((x) => x.id === "Curso X · 01");
    primeros.add(JSON.stringify(e.partes));
  }
  assert.ok(primeros.size > 1, "con cinco estudiantes, en 20 exports el 01 no es siempre el mismo");
  t.cerrar();
});

test("export anonimizado: un curso o todos; el mismo contenido desde A y desde B", async () => {
  const t = abrir("A", cursoAnalisis());
  const unCurso = await exportar(t, "curso y");
  assert.match(unCurso.nombre, /^cierre-anonimizado-curso-y-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(unCurso.datos.alcance.seleccion, "un curso");
  assert.deepEqual(unCurso.datos.alcance.cursos, ["Curso Y"]);
  assert.deepEqual(unCurso.datos.estudiantes.map((e) => e.id), ["Curso Y · 01"]);
  const desdeA = (await exportar(t, "")).datos;
  t.cerrar();
  const u = abrir("B", cursoAnalisis());
  const desdeB = (await exportar(u, "")).datos;
  u.cerrar();
  // Sin ids (efímeros) ni fecha, el contenido es el mismo.
  const sinId = (d) => d.estudiantes.map(({ id, ...resto }) => JSON.stringify(resto)).sort();
  assert.deepEqual(sinId(desdeA), sinId(desdeB));
  assert.deepEqual(desdeA.alcance, desdeB.alcance);
});

// ---------- 5 septies. Pantalla «Cierre A+B» ----------
const URL_CIERRE = "http://localhost/herramientas/cierre-evaluaciones/";
const pantalla = (opciones) => abrir("A", { ...opciones, url: URL_CIERRE });
const listaCC = (t) => [...t.$("cierreCurso").querySelectorAll(".cc-lista tbody tr")].map((tr) => {
  const td = [...tr.children];
  return { num: td[0].textContent, nombre: td[1].textContent, A: td[2].textContent, B: td[3].textContent, cat: td[4].textContent, estado: td[5].querySelector(".cc-estado").textContent,
    solo: td[5].querySelector(".cc-solo")?.textContent ?? "", propuesta: td[4].classList.contains("propuesta") };
});
const revisar = (t, nombre) => {
  const tr = [...t.$("cierreCurso").querySelectorAll(".cc-lista tbody tr")].find((r) => r.children[1].textContent.startsWith(nombre));
  tr.querySelector("[data-revisar]").click();
};
const quien = (t) => t.$("ccQuien")?.textContent ?? null;
// Curso X: decisiones variadas; Curso Y: uno pendiente (no debe alcanzarse desde X).
function cursoCierre() {
  const a = [
    fila("A", "Estudiante 01", [6, 6, 6, 4]),
    fila("A", "Estudiante 02", [7, 7, 7, 5]),
    fila("A", "Estudiante 03", [7, 6, 5, 5]),
    fila("A", "Estudiante 04", [6, 6, 6, 4], { curso: "Curso Z" }),
    fila("A", "Estudiante 05", [6, 5, 5, 4]),
    fila("A", "Estudiante 06", [5, 5, 5, 4]),
    fila("A", "Estudiante 08", [6, 6, 6, 4], { curso: "Curso Y" }),
  ];
  const b = [
    fila("B", "Estudiante 01", [6, 6, 6, 4]),
    fila("B", "Estudiante 02", [7, 7, 7, 5]),
    fila("B", "Estudiante 03", [7, 6, 5, 5], { cambios: { 8: "?" } }),
    fila("B", "Estudiante 04", [6, 6, 6, 4]),
    fila("B", "Estudiante 07", [6, 6, 4, 4]),
  ];
  const cierre = JSON.stringify({ estudiantes: { "curso x\testudiante 02": { modo: "procesado", partes: [T, T, T, T] } } });
  return { a, b, cierre };
}

test("Cierre A+B: URL propia, título neutral, sólo la pantalla de cierre y enlaces a A y B", () => {
  const t = pantalla(cursoCierre());
  assert.equal(t.d.title, "Cierre A+B · Sistemas Informáticos");
  assert.equal(t.d.querySelector("main.pagina").hidden, true, "sin carga ni corrección");
  assert.equal(t.$("cierreCurso").hidden, false);
  assert.doesNotMatch(t.$("cierreCurso").querySelector(".cc-cab").textContent, /Corrección/);
  assert.deepEqual([...t.$("cierreCurso").querySelectorAll(".cc-cab nav a")].map((a) => [a.textContent, a.getAttribute("href")]),
    [["Evaluación A", "/herramientas/evaluacion-a/"], ["Evaluación B", "/herramientas/evaluacion-b/"]]);
  t.cerrar();
  // Desde las herramientas, el enlace; sin servidor, «#cierre» abre el mismo modo.
  for (const x of ["A", "B"]) {
    const h = abrir(x, cursoCierre());
    assert.equal(h.$("irCierre").textContent, "Ir a Cierre A+B →");
    assert.equal(h.$("irCierre").getAttribute("href"), "/herramientas/cierre-evaluaciones/");
    assert.equal(h.$("cierreCurso").hidden, true);
    h.cerrar();
  }
  // (jsdom no da localStorage a un origen file://: sin datos alcanza para ver el modo y los enlaces.)
  const local = abrir("B", { url: "file:///C:/aula/evaluacion-b/herramienta/index.html#cierre" });
  assert.equal(local.$("cierreCurso").hidden, false);
  assert.equal(local.d.title, "Cierre A+B · Sistemas Informáticos");
  assert.equal(local.$("cierreCurso").querySelector(".cc-cab nav a").getAttribute("href"), "../../evaluacion-a/herramienta/index.html");
  local.cerrar();
});

const finalCC = (t, cat) => t.$("cierreCurso").querySelector(`[data-cc-final="${cat}"]`).click();
const decisionDe = (t, clave) => JSON.parse(t.w.localStorage.getItem(CIERRE) ?? "{}").estudiantes?.[clave];
const pulsada = (t) => t.$("cierreCurso").querySelector('[data-cc-final][aria-pressed="true"]')?.dataset.ccFinal ?? null;
const marca = (t, n) => [...t.$("cierreCurso").querySelectorAll(".cc-lista tbody tr")].find((r) => r.children[1].textContent.startsWith(n)).querySelector(".cc-difiere")?.textContent ?? "";

test("Cierre A+B: un curso recién abierto ya tiene sus categorías (la sugerida es la efectiva) y sólo se señala lo que pide atención", () => {
  const escrituras = [];
  const t = pantalla({ ...cursoCierre(), escrituras });
  const tabla = t.$("cierreCurso").querySelector(".cc-lista");
  assert.deepEqual([...tabla.querySelectorAll("thead th")].map((th) => th.textContent), ["N.º", "Estudiante", "A", "B", "Categoría", "Estado", ""]);
  assert.doesNotMatch(tabla.textContent, /%|\d+\/\d+|sugerida|Requiere decisión/, "sin puntajes ni «pendientes» de confirmar");
  const l = listaCC(t);
  const por = (n) => l.find((x) => x.nombre.startsWith(n));
  assert.deepEqual(por("Estudiante 01"), { num: "01", nombre: "Estudiante 01", A: "✓", B: "✓", cat: "Suficiente", estado: "Lista", solo: "", propuesta: false });
  assert.deepEqual([por("Estudiante 02").cat, por("Estudiante 02").estado], ["Avanzado", "Lista"]);
  // Lo que de verdad pide atención sigue a la vista.
  assert.equal(por("Estudiante 03").estado, "Provisorio");
  assert.equal(por("Estudiante 04").estado, "Revisar pareja");
  assert.equal(por("Estudiante 04").A, "?");
  assert.deepEqual([por("Estudiante 05").estado, por("Estudiante 05").solo, por("Estudiante 05").cat], ["Lista", "Sólo A", "Suficiente"]);
  assert.deepEqual([por("Estudiante 07").solo, por("Estudiante 07").estado], ["Sólo B", "Lista"]);
  assert.match(t.$("ccResumen").textContent, /^Listas 6 de 9 · Requieren atención 3 · Modificadas por el docente 0$/);
  // Mirar, revisar y recorrer no guarda nada.
  revisar(t, "Estudiante 01");
  t.$("ccSiguiente").click();
  t.$("ccVolver").click();
  assert.deepEqual(escrituras.filter((k) => k === CIERRE), []);
  t.$("ccCurso").value = "curso y";
  t.$("ccCurso").dispatchEvent(new t.w.Event("change", { bubbles: true }));
  assert.deepEqual(listaCC(t).map((x) => x.nombre), ["Estudiante 08"]);
  t.cerrar();
});

test("Cierre A+B: revisión con la sugerida marcada como efectiva, sin confirmar nada; lo demás plegado", () => {
  const escrituras = [];
  const t = pantalla({ ...cursoCierre(), escrituras });
  revisar(t, "Estudiante 01");
  const dec = t.$("cierreCurso").querySelector(".cc-decision");
  assert.match(dec.textContent, /Categoría sugerida por la evidencia:Suficiente/);
  assert.match(t.$("ccResultado").textContent, /^Resultado integrado: 22\/30 · 73,3 %/);
  assert.match(dec.textContent, /Categoría del período: En proceso/);
  assert.deepEqual([...dec.querySelectorAll("[data-cc-final]")].map((b) => b.dataset.ccFinal), ["En proceso", "Suficiente", "Avanzado"]);
  assert.equal(pulsada(t), "Suficiente", "la sugerida, marcada como valor efectivo");
  assert.equal(t.$("ccConfirmar"), null, "no hace falta confirmar");
  assert.equal(t.$("ccVolverSugerencia"), null);
  assert.equal(t.$("ccNotaDetalle").open, false);
  assert.doesNotMatch(dec.textContent, /Procesado|Manual|Hardware y software|Emparejamiento/);
  const pliegues = [...t.$("cierreCurso").querySelectorAll(".cc-pliegues > details")];
  assert.deepEqual(pliegues.map((d) => d.querySelector("summary").textContent),
    ["Detalle por parte: A, B y mejor resultado", "Contenidos y orientación", "Devoluciones de cada intento", "Información técnica"]);
  assert.ok(pliegues.every((d) => !d.open));
  const id = (x) => JSON.parse(t.w.localStorage.getItem(CLAVE[x])).filas[0].id;
  assert.deepEqual([...pliegues[2].querySelectorAll("a")].map((a) => a.getAttribute("href")), [`/herramientas/evaluacion-a/#ver=${id("A")}`, `/herramientas/evaluacion-b/#ver=${id("B")}`]);
  assert.deepEqual(escrituras.filter((k) => k === CIERRE), []);
  // Las partes que cuentan sí son una decisión: se guardan y la sugerencia se recalcula.
  t.$("cierreCurso").querySelector('[data-cc-parte="3"]').click();
  assert.match(t.$("ccResultado").textContent, /18\/24/);
  assert.deepEqual(decisionDe(t, "curso x\testudiante 01"), { modo: "procesado", partes: [T, T, T, F] });
  t.cerrar();
});

test("Cierre A+B: P1 sin cumplir nunca sugiere Suficiente/Avanzado (21/24 con P1 8/16 → En proceso)", () => {
  const t = pantalla({ a: [fila("A", "Estudiante 09", [5, 8, 8, 5])], b: [fila("B", "Estudiante 09", [3, 7, 7, 5])] });
  revisar(t, "Estudiante 09");
  t.$("cierreCurso").querySelector('[data-cc-parte="3"]').click();
  assert.match(t.$("ccResultado").textContent, /21\/24 · 87,5 %/);
  assert.equal(t.$("ccSugerida").textContent, "En proceso");
  assert.equal(pulsada(t), "En proceso");
  assert.match(t.$("ccP1").textContent, /Parte 1 · Reconocer: 8\/16 \(A 5\/8 \+ B 3\/8\) · no alcanza el mínimo de 9\/16: la sugerencia no puede ser Suficiente ni Avanzado/);
  t.$("ccVolver").click();
  assert.equal(listaCC(t)[0].cat, "En proceso");
  t.cerrar();
});

test("Cierre A+B: overrides del docente (S→EP, S→A, A→S, EP→S); volver a la sugerencia los quita", () => {
  // Sugerencias: 22/30 Suficiente, 26/30 Avanzado, 15/30 En proceso (mismos puntajes en A y B).
  const puntajes = [["Estudiante 31", [6, 6, 6, 4]], ["Estudiante 32", [6, 6, 6, 4]], ["Estudiante 33", [7, 7, 7, 5]],
    ["Estudiante 34", [4, 4, 4, 3]], ["Estudiante 35", [6, 6, 6, 4]]];
  const t = pantalla({ a: puntajes.map(([n, p]) => fila("A", n, p)), b: puntajes.map(([n, p]) => fila("B", n, p)) });
  const casos = [["Estudiante 31", "Suficiente", "En proceso"], ["Estudiante 32", "Suficiente", "Avanzado"],
    ["Estudiante 33", "Avanzado", "Suficiente"], ["Estudiante 34", "En proceso", "Suficiente"]];
  for (const [nombre, sugerida, final] of casos) {
    t.$("ccVolver")?.click();
    revisar(t, nombre);
    assert.equal(t.$("ccSugerida").textContent, sugerida, nombre);
    finalCC(t, final);
    assert.equal(pulsada(t), final);
    assert.deepEqual(decisionDe(t, `curso x\t${nombre.toLowerCase()}`), { modo: "manual", categoria: final }, nombre);
    assert.match(t.$("ccOverride").textContent, new RegExp(`Elegida por el docente; la sugerida es ${sugerida}`));
    assert.ok(t.$("ccVolverSugerencia"));
  }
  t.$("ccVolver").click();
  assert.deepEqual(listaCC(t).map((x) => [x.nombre, x.cat, x.estado]),
    [...casos.map(([n, , f]) => [n, f, "Lista"]), ["Estudiante 35", "Suficiente", "Lista"]]);
  assert.deepEqual(puntajes.map(([n]) => marca(t, n)), ["≠ sugerida", "≠ sugerida", "≠ sugerida", "≠ sugerida", ""]);
  assert.match(t.$("ccResumen").textContent, /Modificadas por el docente 4$/);
  // Elegir la sugerida (35) no guarda nada.
  revisar(t, "Estudiante 35");
  finalCC(t, "Suficiente");
  assert.equal(decisionDe(t, "curso x\testudiante 35"), undefined);
  // «Volver a la sugerencia» elimina el override.
  t.$("ccVolver").click();
  revisar(t, "Estudiante 31");
  t.$("ccVolverSugerencia").click();
  assert.equal(pulsada(t), "Suficiente");
  assert.equal(decisionDe(t, "curso x\testudiante 31"), undefined, "sin decisión guardada");
  assert.equal(t.$("ccVolverSugerencia"), null);
  // Elegir la sugerida sobre un override también lo quita, y conserva otros datos humanos (partes, nota).
  t.$("ccVolver").click();
  revisar(t, "Estudiante 32");
  t.$("cierreCurso").querySelector('[data-cc-parte="3"]').click();
  finalCC(t, t.$("ccSugerida").textContent);
  assert.deepEqual(decisionDe(t, "curso x\testudiante 32"), { modo: "procesado", partes: [T, T, T, F] });
  t.cerrar();
});

test("Cierre A+B: los casos que requieren atención siguen señalados y bloquean el override", () => {
  const t = pantalla(cursoCierre());
  revisar(t, "Estudiante 03");
  assert.equal(t.$("ccEstado").textContent, "Provisorio");
  assert.match(t.$("cierreCurso").querySelector(".cc-decision").textContent, /Hay respuestas a revisar que podrían cambiar la sugerencia/);
  t.$("ccVolver").click();
  const filaB04 = [...t.$("cierreCurso").querySelectorAll(".cc-lista tbody tr")].find((r) => r.children[1].textContent.startsWith("Estudiante 04") && r.children[3].textContent === "✓");
  filaB04.querySelector("[data-revisar]").click();
  assert.equal(t.$("ccEstado").textContent, "Revisar pareja");
  assert.ok([...t.$("cierreCurso").querySelectorAll("[data-cc-final]")].every((b) => b.disabled));
  t.cerrar();
});

test("impresión del curso completo sin confirmar nada: la categoría efectiva (override o sugerida), sin decir de dónde sale", () => {
  const t = pantalla(cursoCierre());
  revisar(t, "Estudiante 01");
  finalCC(t, "En proceso");
  t.$("ccVolver").click();
  const bs = bloques(t);
  assert.equal(bs.length, 9);
  const de = (n, curso = "Curso X") => bs.find((b) => b.querySelector(".final-nombre").textContent === n && b.querySelector(".final-cab").textContent.includes(curso));
  assert.equal(de("Estudiante 01").querySelector(".final-cat b").textContent, "En proceso", "override");
  assert.equal(de("Estudiante 05").querySelector(".final-cat b").textContent, "Suficiente", "sugerida, sin entrar al estudiante");
  assert.equal(de("Estudiante 02").querySelector(".final-cat b").textContent, "Avanzado");
  assert.deepEqual([...de("Estudiante 05").querySelector("tfoot tr").children].map((c) => c.textContent), ["Total", "20 de 30 (66,7 %)", "", "20 de 30 (66,7 %)"]);
  assert.equal(de("Estudiante 05").querySelector("tbody td.sin-resultado").textContent, "Sin resultado", "sólo A: B sin resultado");
  for (const b of bs) {
    assert.match(b.querySelector(".final-cat").textContent, /^Calificación del Tercer Bimestre: /);
    assert.equal(b.querySelector(".final-encuadre").textContent, ENCUADRE);
    assert.equal(b.querySelector("h3").textContent, "Tus resultados en las Evaluaciones A y B");
    assert.doesNotMatch(b.textContent, /sugerid|automátic|sin confirmar|≠|pendiente de decisión/i);
  }
  t.cerrar();
});

test("trabajo por excepción: un cambio de categoría no oculta el estado de la evidencia (Provisorio, pareja, sin evidencia)", () => {
  const P = [T, T, T, T];
  const a = [
    fila("A", "Estudiante 51", [7, 6, 5, 5]),
    fila("A", "Estudiante 52", [6, 6, 6, 4], { curso: "Curso Z" }),
    fila("A", "Estudiante 53", [null, null, null, null], { cuentan: [F, F, F, F] }),
    fila("A", "Estudiante 54", [6, 6, 6, 4]),
  ];
  const b = [
    fila("B", "Estudiante 51", [7, 6, 5, 5], { cambios: { 8: "?" } }),
    fila("B", "Estudiante 52", [6, 6, 6, 4]),
    fila("B", "Estudiante 54", [6, 6, 6, 4]), fila("B", "estudiante 54", [2, 2, 2, 2]),
  ];
  const cierre = JSON.stringify({ estudiantes: Object.fromEntries(["51", "52", "53", "54"].map((n) => [`curso ${n === "52" ? "z" : "x"}\testudiante ${n}`, { modo: "manual", categoria: "Avanzado", partes: P }])) });
  const t = pantalla({ a, b, cierre });
  const est = (n) => listaCC(t).find((x) => x.nombre.startsWith(n));
  // 51: respuestas a revisar que podrían cambiar la lectura → Provisorio, aunque el docente eligió Avanzado.
  assert.deepEqual([est("Estudiante 51").cat, est("Estudiante 51").estado], ["Avanzado", "Provisorio"]);
  assert.equal(marca(t, "Estudiante 51"), "≠ sugerida");
  // 52: mismo estudiante en otro curso → Revisar pareja.
  assert.ok(listaCC(t).filter((x) => x.nombre === "Estudiante 52").every((x) => x.estado === "Revisar pareja"));
  // 53: ninguna parte válida → Sin evidencia.
  assert.equal(est("Estudiante 53").estado, "Sin evidencia");
  // 54: dos registros de B → Revisar pareja.
  assert.equal(est("Estudiante 54").estado, "Revisar pareja");
  // 7 filas: 52 aparece en sus dos cursos y los dos registros de B de 54 también se listan; todas piden atención.
  assert.match(t.$("ccResumen").textContent, /^Listas 0 de 7 · Requieren atención 7/);
  // En el papel: la categoría del docente, y lo pendiente dicho como evidencia.
  const bs = bloques(t);
  const b51 = bs.find((x) => x.querySelector(".final-nombre").textContent === "Estudiante 51");
  assert.equal(b51.querySelector(".final-cat").textContent, "Calificación del Tercer Bimestre: Avanzado");
  assert.equal(b51.querySelector(".final-pendiente").textContent, "Algunas respuestas todavía se están revisando: estos resultados pueden cambiar.");
  t.cerrar();
});

test("Cierre A+B: una corrección hecha en la herramienta de A o de B (otra pestaña) se ve al instante", () => {
  const t = pantalla({
    a: [fila("A", "Estudiante 71", [5, 5, 5, 4]), fila("A", "Estudiante 72", [7, 6, 5, 5])],
    b: [fila("B", "Estudiante 72", [7, 6, 5, 5], { cambios: { 8: "?" } })],
  });
  const de = (n) => listaCC(t).find((x) => x.nombre === n);
  assert.deepEqual([de("Estudiante 71").cat, de("Estudiante 72").estado], ["En proceso", "Provisorio"], "71: sólo A con P1 5/8");
  const corregir = (x, fila0, item, valor) => {
    const d = JSON.parse(t.w.localStorage.getItem(CLAVE[x]));
    d.filas[fila0].respuestas[item - 1] = valor;
    t.w.localStorage.setItem(CLAVE[x], JSON.stringify(d));
    t.w.dispatchEvent(new t.w.StorageEvent("storage", { key: CLAVE[x] }));
  };
  // En la herramienta de A, el ítem 6 de 71 estaba mal transcripto: P1 6/8 → Suficiente.
  corregir("A", 0, 6, BUENAS.A[5]);
  assert.equal(de("Estudiante 71").cat, "Suficiente");
  // En la de B se resuelve el «?» de 72.
  corregir("B", 0, 8, BUENAS.B[7]);
  assert.equal(de("Estudiante 72").estado, "Lista");
  t.cerrar();
});

test("N.º de lista: alfabético dentro del curso, una pareja = un número, reinicia por curso, igual en el papel y sin guardarse", () => {
  const escrituras = [];
  const t = pantalla({ ...cursoCierre(), escrituras });
  const filtrar = (k) => { t.$("ccCurso").value = k; t.$("ccCurso").dispatchEvent(new t.w.Event("change", { bubbles: true })); };
  filtrar("curso x");
  const lista = () => listaCC(t).map((x) => `${x.num} ${x.nombre}${x.solo ? ` (${x.solo})` : ""}`);
  const esperado = ["01 Estudiante 01", "02 Estudiante 02", "03 Estudiante 03", "04 Estudiante 04", "05 Estudiante 05 (Sólo A)", "06 Estudiante 06 (Sólo A)", "07 Estudiante 07 (Sólo B)"];
  assert.deepEqual(lista(), esperado, "pareja A+B (01, 02, 03) en una fila; Sólo A / Sólo B también numerados");
  // Estable: no depende de categorías ni decisiones.
  revisar(t, "Estudiante 02");
  finalCC(t, "En proceso");
  t.$("ccVolver").click();
  assert.deepEqual(lista(), esperado);
  // Reinicia en cada curso (también en «todos»).
  filtrar("");
  assert.deepEqual(listaCC(t).filter((x) => ["Estudiante 08", "Estudiante 04"].includes(x.nombre) && x.num === "01").length, 2, "Curso Y y Curso Z empiezan en 01");
  filtrar("curso y");
  assert.deepEqual(lista(), ["01 Estudiante 08 (Sólo A)"]);
  // En el papel, el mismo número junto al nombre.
  filtrar("curso x");
  t.$("ccImprimir").click();
  const bs = [...t.$("impresionBloques").querySelectorAll("article.final")];
  assert.deepEqual(bs.map((b) => `${b.querySelector(".final-num").textContent} ${b.querySelector(".final-nombre").textContent}`), esperado.map((e) => e.replace(/ \(.*\)$/, "")));
  // Nada nuevo guardado: sólo el override de 02.
  assert.deepEqual(Object.keys(JSON.parse(t.w.localStorage.getItem(CIERRE)).estudiantes).sort(), ["curso x\testudiante 02"]);
  assert.doesNotMatch(t.w.localStorage.getItem(CIERRE), /"num"|"01"/);
  t.cerrar();
});

test("fila Total por intento y Mejor: partes válidas con su propio denominador, a revisar aparte, en el detalle; en el papel, A, B y Para A+B", () => {
  const casos = [
    // [opciones A, opciones B, esperado A, esperado B, esperado Mejor]
    [{}, {}, "16/30 (53,3 %)", "13/30 (43,3 %)", "17/30 (56,7 %)"],
    // A sin la Parte 4 (no contabilizada y sin cargar): 14/24, no 14/30; Mejor toma P4 de B.
    [{ cuentan: [T, T, T, F], p4: null }, {}, "14/24 (58,3 %)", "13/30 (43,3 %)", "17/30 (56,7 %)"],
    // A y B con distintas partes válidas: A sin P4, B sin P1.
    [{ cuentan: [T, T, T, F], p4: null }, { cuentan: [F, T, T, T] }, "14/24 (58,3 %)", "9/22 (40,9 %)", "17/30 (56,7 %)"],
    // Una respuesta a revisar en B (ítem 11): no suma ni resta, se indica.
    [{}, { cambios: { 11: "?" } }, "16/30 (53,3 %)", "13/30 (43,3 %) · 1 a revisar", "17/30 (56,7 %)"],
  ];
  for (const [oa, ob, ea, eb, em] of casos) {
    const escrituras = [];
    const pa = [6, 3, 5, "p4" in oa ? oa.p4 : 2];
    const t = pantalla({
      a: [fila("A", "Estudiante 81", pa, { cuentan: oa.cuentan })],
      b: [fila("B", "Estudiante 81", [4, 2, 4, 3], { cuentan: ob.cuentan, cambios: ob.cambios })],
      escrituras,
    });
    revisar(t, "Estudiante 81");
    const total = [...t.$("cierreCurso").querySelector(".cc-pliegues tfoot tr").children].map((c) => c.textContent);
    assert.deepEqual(total, ["Total", ea, eb, em], JSON.stringify([oa, ob]));
    // El papel muestra los mismos totales de A, de B y de Para A+B (aquí
    // cuentan las cuatro partes, así que es la suma de la mejor de cada una),
    // dichos para el estudiante.
    const [b] = bloques(t);
    const papel = [...b.querySelector("tfoot tr").children].map((c) => c.textContent);
    assert.deepEqual(papel, ["Total", ...[ea, eb, em].map((x) => x.replace(/^(\d+)\/(\d+) (\([^)]*\)).*$/, "$1 de $2 $3"))]);
    assert.equal(b.querySelectorAll("tbody tr").length, 4, "las partes siguen siendo cuatro filas");
    // Sólo visual: nada se guarda.
    assert.deepEqual(escrituras.filter((k) => k === CIERRE), []);
    t.cerrar();
  }
});

// ---------- Cierre completo (privado) ----------
// Lee un ZIP «stored» por su directorio central y comprueba el CRC de cada entrada.
function leerZip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fin = bytes.length - 22;
  assert.equal(v.getUint32(fin, true), 0x06054b50, "fin de directorio central");
  const n = v.getUint16(fin + 10, true);
  let p = v.getUint32(fin + 16, true);
  const entradas = [];
  for (let i = 0; i < n; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50);
    const largo = v.getUint16(p + 28, true), tam = v.getUint32(p + 20, true), crc = v.getUint32(p + 16, true), off = v.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + largo));
    assert.equal(v.getUint32(off, true), 0x04034b50, `cabecera local de ${nombre}`);
    const ini = off + 30 + v.getUint16(off + 26, true);
    const datos = bytes.subarray(ini, ini + tam);
    assert.equal(crc32(datos), crc, `CRC de ${nombre}`);
    entradas.push([nombre, new TextDecoder().decode(datos)]);
    p += 46 + largo;
  }
  return entradas;
}
async function exportarCompleto(t, curso = "") {
  const capturas = [];
  t.w.URL.createObjectURL = (blob) => { capturas.push({ blob }); return "blob:prueba"; };
  t.w.URL.revokeObjectURL = () => {};
  t.w.HTMLAnchorElement.prototype.click = function () { capturas.at(-1).nombre = this.download; };
  if (t.$("impresion").hidden) t.$("btnImpresion").click();
  t.$("impresionCurso").value = curso;
  t.$("impresionCurso").dispatchEvent(new t.w.Event("change"));
  t.$("btnExportarCompleto").click();
  const { blob, nombre } = capturas.at(-1);
  const entradas = leerZip(new Uint8Array(await blob.arrayBuffer()));
  const archivos = Object.fromEntries(entradas);
  return { nombre, tipo: blob.type, entradas: entradas.map(([n]) => n), archivos, json: JSON.parse(archivos["cierre-completo.json"]) };
}
// Curso sintético con todos los casos del cierre.
function cursoCompleto() {
  const a = [
    fila("A", "Estudiante 01", [6, 6, 6, 4]),
    fila("A", "Pérez, Juan", [4, 8, 8, 6]),
    fila("A", "Estudiante 03", [6, 5, 5, 4]),
    fila("A", "Estudiante 04", [6, 6, 6, 4]),
    fila("A", "Estudiante 05", [6, 6, 6, 4]),
    fila("A", "Estudiante 06", [4, 8, 8, 6]),
    fila("A", "Estudiante 07", [6, 6, 6, 4], { curso: "Curso Y" }),
  ];
  const b = [
    fila("B", "Estudiante 01", [6, 2, 6, 4], { cambios: { 11: "?" } }),
    fila("B", "Juan Pérez", [5, 2, 3, 2]),
    fila("B", "Estudiante 04", [6, 6, 6, 4]),
    fila("B", "Estudiante 05", [6, 6, 6, 4]),
    fila("B", "Estudiante 06", [4, 8, 8, 6]),
    fila("B", "Estudiante 07", [6, 6, 6, 4], { curso: "Curso Y" }),
    fila("B", "Estudiante 08", [6, 6, 5, 4]),
  ];
  const cierre = JSON.stringify({
    estudiantes: {
      "curso x\testudiante 04": { modo: "manual", categoria: "En proceso", devolucion: "Nota privada 9911: completar los trabajos pendientes." },
      "curso x\testudiante 05": { modo: "procesado", partes: [T, T, T, F] },
    },
    vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }],
  });
  return { a, b, cierre };
}

test("cierre completo: un ZIP válido con LEEME, JSON maestro, resumen, TSV de A y B y devoluciones", async () => {
  const t = pantalla(cursoCompleto());
  t.$("ccImprimir").click();
  const { nombre, tipo, entradas, json, archivos } = await exportarCompleto(t);
  assert.match(nombre, /^cierre-completo-todos-los-cursos-\d{4}-\d{2}-\d{2}\.zip$/);
  assert.equal(tipo, "application/zip");
  assert.deepEqual(entradas, ["LEEME.txt", "cierre-completo.json", "resumen.tsv", "evaluacion-a.tsv", "evaluacion-b.tsv", "devoluciones.html"]);
  assert.deepEqual(Object.keys(json), ["formato", "version", "generado", "privacidad", "alcance", "evaluaciones", "reglas", "fuentes", "vinculos_manuales", "estudiantes"]);
  assert.equal(json.version, 1);
  assert.ok(!Number.isNaN(Date.parse(json.generado)));
  assert.deepEqual(json.alcance, { seleccion: "todos los cursos", cursos: ["Curso X", "Curso Y"], estudiantes: 8 });
  assert.match(archivos["LEEME.txt"], /PRIVADO/);
  assert.match(archivos["LEEME.txt"], /Estudiantes: 8/);
  assert.match(archivos["LEEME.txt"], /A y B son dos evaluaciones paralelas/);
  assert.match(archivos["LEEME.txt"], /la categoría del período es la que decidió el docente si la cambió/);
  // La clave aplicada, con la excepción de A18.
  assert.deepEqual(json.evaluaciones.A.excepciones, [{ item: 18, aceptadas: ["B", "D", "B+D"] }]);
  assert.deepEqual(json.evaluaciones.B.excepciones, []);
  t.cerrar();
});

test("cierre completo: fuentes crudas exactas, emparejamiento por estudiante y sin duplicar parejas", async () => {
  const t = pantalla(cursoCompleto());
  t.$("ccImprimir").click();
  const { json } = await exportarCompleto(t);
  for (const x of ["A", "B"]) assert.deepEqual(json.fuentes[x].registros, JSON.parse(t.w.localStorage.getItem(CLAVE[x])).filas, `fuente ${x}: tal como está guardada`);
  assert.deepEqual(json.fuentes.B.registros[0].respuestas[10], "?", "respuestas crudas, sin limpiar");
  const de = (n) => json.estudiantes.find((e) => e.estudiante === n);
  assert.equal(json.estudiantes.length, 8, "una pareja es un solo estudiante");
  assert.equal(de("Estudiante 01").emparejamiento.tipo, "automatico");
  assert.deepEqual(de("Pérez, Juan").emparejamiento, { tipo: "manual", vinculo_manual: { A: "curso x\tperez, juan", B: "curso x\tjuan perez" }, anomalias: [], estado: "Lista" });
  assert.deepEqual([de("Pérez, Juan").registros.A.estudiante, de("Pérez, Juan").registros.B.estudiante], ["Pérez, Juan", "Juan Pérez"]);
  assert.equal(de("Estudiante 03").emparejamiento.tipo, "solo_A");
  assert.equal(de("Estudiante 08").emparejamiento.tipo, "solo_B");
  assert.deepEqual(json.vinculos_manuales, [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }]);
  t.cerrar();
});

test("cierre completo: corrección, sugerencia y decisión docente separadas (implícita, override, partes, nota, P1, a revisar)", async () => {
  const t = pantalla(cursoCompleto());
  t.$("ccImprimir").click();
  const { json } = await exportarCompleto(t);
  const de = (n) => json.estudiantes.find((e) => e.estudiante === n);
  // 01: sugerencia aceptada sin hacer nada; una respuesta a revisar en B.
  const e01 = de("Estudiante 01");
  assert.deepEqual(e01.correccion.A.total_valido, { aciertos: 22, errores: 8, revisar: 0, total: 30, porcentaje: 73.3, partes: [1, 2, 3, 4] });
  assert.equal(e01.correccion.B.total_valido.revisar, 1);
  assert.deepEqual(e01.correccion.B.items[10], { item: 11, respuesta: "?", aceptadas: ["C"], resultado: "a revisar" });
  assert.deepEqual(e01.correccion.A.items[0], { item: 1, respuesta: "B", aceptadas: ["B"], resultado: "correcta" });
  assert.equal(e01.sugerencia.categoria, "Suficiente");
  assert.deepEqual(e01.decision_docente, { categoria_elegida: null, categoria_final: "Suficiente", coincide_con_sugerida: true, partes_elegidas: null, nota: null, registro_guardado: null },
    "no se infiere una decisión docente");
  // 04: override con nota; la sugerida y la final quedan las dos.
  const e04 = de("Estudiante 04");
  assert.equal(e04.sugerencia.categoria, "Suficiente");
  assert.deepEqual([e04.decision_docente.categoria_elegida, e04.decision_docente.categoria_final, e04.decision_docente.coincide_con_sugerida], ["En proceso", "En proceso", false]);
  assert.equal(e04.decision_docente.nota, "Nota privada 9911: completar los trabajos pendientes.");
  assert.equal(e04.devolucion_entregada.categoria_del_periodo, "Calificación del Tercer Bimestre: En proceso");
  assert.equal(e04.devolucion_entregada.nota_docente, "Nota privada 9911: completar los trabajos pendientes.");
  // 05: partes elegidas por el docente.
  const e05 = de("Estudiante 05");
  assert.deepEqual(e05.decision_docente.partes_elegidas, [T, T, T, F]);
  assert.deepEqual(e05.sugerencia.resultado_considerado, { aciertos: 18, total: 24, porcentaje: 75, partes: [1, 2, 3] });
  assert.equal(e05.decision_docente.categoria_elegida, null);
  // 06: P1 8/16 → la sugerencia es En proceso aunque el porcentaje alcance.
  const e06 = de("Estudiante 06");
  assert.deepEqual([e06.sugerencia.categoria, e06.sugerencia.requisito_p1.cumple, e06.sugerencia.requisito_p1.aciertos], ["En proceso", false, 8]);
  // La Parte 1 queda en la sugerencia (arriba) y en la orientación docente, no en el papel.
  assert.ok(!e06.devolucion_entregada.temas.some((x) => /Parte 1|afianzar/.test(x)));
  assert.ok(e06.orientacion.some((x) => /afianzar la Parte 1/.test(x)));
  // Mejor evidencia integrada y devolución entregada.
  assert.deepEqual(e01.correccion.integrada.suma_mejor, { aciertos: 22, total: 30, porcentaje: 73.3 });
  assert.deepEqual(e01.devolucion_entregada.resultados.at(-1), ["Total", "22 de 30 (73,3 %)", "18 de 30 (60 %)", "22 de 30 (73,3 %)"]);
  assert.equal(e01.devolucion_entregada.conjunto, "Para valorar las Evaluaciones A y B, en cada parte se conserva tu mejor resultado entre las dos. Así obtuviste 22 de 30 (73,3 %).");
  assert.equal(e01.devolucion_entregada.pendiente, "Algunas respuestas todavía se están revisando: estos resultados pueden cambiar.");
  assert.equal(e01.devolucion_entregada.encuadre, ENCUADRE);
  assert.ok(e01.orientacion.length > 0);
  t.cerrar();
});

test("cierre completo: evaluacion-a.tsv y evaluacion-b.tsv son exactamente los exports de cada herramienta; resumen.tsv por estudiante", async () => {
  const datos = cursoCompleto();
  const t = pantalla(datos);
  t.$("ccImprimir").click();
  const { archivos } = await exportarCompleto(t);
  for (const x of ["A", "B"]) {
    const h = abrir(x, datos);
    assert.equal(archivos[`evaluacion-${x.toLowerCase()}.tsv`], h.$("vista").textContent, `TSV de ${x}`);
    h.cerrar();
  }
  const filasR = archivos["resumen.tsv"].replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
  assert.deepEqual(filasR[0], ["curso", "n_lista", "estudiante", "nombre_en_A", "nombre_en_B", "presencia_A", "presencia_B", "emparejamiento",
    "total_A", "porcentaje_A", "total_B", "porcentaje_B", "mejor_A+B", "porcentaje_A+B", "categoria_sugerida", "categoria_final", "modificada_por_docente", "estado", "nota_docente"]);
  assert.equal(filasR.length, 9);
  assert.ok(filasR.every((f) => f.length === 19));
  const fila04 = filasR.find((f) => f[2] === "Estudiante 04");
  assert.deepEqual(fila04.slice(14), ["Suficiente", "En proceso", "sí", "Lista", "Nota privada 9911: completar los trabajos pendientes."]);
  const filaPerez = filasR.find((f) => f[2] === "Pérez, Juan");
  assert.deepEqual(filaPerez.slice(0, 8), ["Curso X", "07", "Pérez, Juan", "Pérez, Juan", "Juan Pérez", "sí", "sí", "manual"]);
  assert.deepEqual(filasR.find((f) => f[2] === "Estudiante 08").slice(5, 8), ["no", "sí", "solo_B"]);
  t.cerrar();
});

test("cierre completo: devoluciones.html autocontenido con lo que se entrega", async () => {
  const t = pantalla(cursoCompleto());
  t.$("ccImprimir").click();
  const { archivos } = await exportarCompleto(t);
  const html = archivos["devoluciones.html"];
  assert.match(html, /^<!doctype html>/);
  assert.doesNotMatch(html, /<script|localStorage|aula-evaluacion/i, "sin JavaScript ni datos del navegador");
  const doc = new JSDOM(html).window.document;
  const bs = [...doc.querySelectorAll("article.final")];
  assert.equal(bs.length, 8);
  const b04 = bs.find((b) => b.querySelector(".final-nombre").textContent === "Estudiante 04");
  assert.equal(b04.querySelector(".final-num").textContent, "03", "N.º de lista: 01, 03, 04… y Pérez al final");
  assert.equal(b04.querySelector(".final-cat").textContent, "Calificación del Tercer Bimestre: En proceso");
  assert.equal(b04.querySelector(".final-texto").textContent, "Nota privada 9911: completar los trabajos pendientes.");
  assert.ok(b04.querySelector(".clave-compacta"));
  assert.ok(doc.querySelector("style").textContent.includes(".final {"), "estilos incorporados");
  t.cerrar();
});

test("cierre completo: un curso sólo incluye sus estudiantes y registros; nada se escribe; el anonimizado sigue sin datos privados", async () => {
  const escrituras = [];
  const t = pantalla({ ...cursoCompleto(), escrituras });
  const antes = Object.fromEntries([CLAVE.A, CLAVE.B, CIERRE].map((k) => [k, t.w.localStorage.getItem(k)]));
  t.$("ccImprimir").click();
  const desde = escrituras.length;
  const { nombre, json, archivos } = await exportarCompleto(t, "curso y");
  assert.match(nombre, /^cierre-completo-curso-y-\d{4}-\d{2}-\d{2}\.zip$/);
  assert.deepEqual(json.alcance, { seleccion: "un curso", cursos: ["Curso Y"], estudiantes: 1 });
  assert.deepEqual(json.fuentes.A.registros.map((f) => f.estudiante), ["Estudiante 07"]);
  assert.deepEqual(json.fuentes.B.registros.map((f) => f.estudiante), ["Estudiante 07"]);
  assert.deepEqual(json.vinculos_manuales, []);
  assert.equal(archivos["evaluacion-a.tsv"].trimEnd().split("\n").length, 2);
  assert.doesNotMatch(archivos["devoluciones.html"], /Estudiante 0[1-68]|Pérez/);
  // Nada se escribe: ni A, ni B, ni las decisiones.
  await exportarCompleto(t);
  assert.deepEqual(escrituras.slice(desde), []);
  for (const [k, v] of Object.entries(antes)) assert.equal(t.w.localStorage.getItem(k), v, k);
  // El export anonimizado no cambió: sin nombres, notas ni respuestas.
  const anon = await exportar(t);
  assert.doesNotMatch(anon.texto, /Pérez|Estudiante 0|9911|"respuestas"|"vinculos?"|perez/);
  t.cerrar();
});

test("papel: calificación y encuadre exactos; A y B a la vista; sin «Resultado considerado», «Mejor resultado» ni lecturas internas; devoluciones.html = impresión", async () => {
  const t = pantalla(cursoCompleto());
  t.$("ccImprimir").click();
  const bs = [...t.$("impresionBloques").querySelectorAll("article.final")];
  const { archivos, json } = await exportarCompleto(t);
  const zip = [...new JSDOM(archivos["devoluciones.html"]).window.document.querySelectorAll("article.final")];
  assert.deepEqual(zip.map((b) => b.outerHTML), bs.map((b) => b.outerHTML), "el ZIP entrega exactamente el papel impreso");
  assert.equal(bs.length, 8);
  for (const b of bs) {
    assert.match(b.querySelector(".final-cat").textContent, /^Calificación del Tercer Bimestre: (En proceso|Suficiente|Avanzado)/);
    assert.equal(b.querySelector(".final-encuadre").textContent, ENCUADRE);
    assert.deepEqual([...b.querySelectorAll("thead th")].map((th) => th.textContent), ["Parte", "Evaluación A", "Evaluación B", "Para A+B"]);
    // Cuatro columnas; con una evaluación sin resultado, su celda única abarca las filas de las partes.
    const unica = b.querySelector("td.sin-resultado");
    assert.ok([...b.querySelectorAll("tbody tr, tfoot tr")].every((tr, k) => tr.children.length === (unica && k > 0 && k < 4 ? 3 : 4)));
    assert.doesNotMatch(b.textContent, /Categoría del período|Cuenta|✓|Resultado considerado|Mejor resultado|mejor evidencia|A = B|A=B|merece atención|dificultad fuerte|sin señal|intensidad|\d+\/\d+|Por contenidos|Aspectos a revisar|Sin contenidos|manejás bien|Qué ya sabés|no aparecen temas/);
    // Porcentajes sólo junto a su puntaje («18 de 30 (60 %)»), nunca sueltos.
    assert.equal(b.textContent.match(/%/g)?.length ?? 0, b.textContent.match(/\d+ de \d+ \(\d+(,\d)? %\)/g)?.length ?? 0);
  }
  // Las partes elegidas por el docente no se explican en el papel; la decisión y los cálculos, iguales.
  const e05 = json.estudiantes.find((e) => e.estudiante === "Estudiante 05");
  assert.equal(e05.devolucion_entregada.categoria_del_periodo, "Calificación del Tercer Bimestre: Suficiente");
  assert.deepEqual(e05.decision_docente.partes_elegidas, [T, T, T, F]);
  assert.deepEqual(e05.sugerencia.resultado_considerado, { aciertos: 18, total: 24, porcentaje: 75, partes: [1, 2, 3] });
  assert.deepEqual(Object.keys(e05.devolucion_entregada), ["categoria_del_periodo", "encuadre", "pendiente", "resultados", "conjunto", "mejoras", "temas", "nota_docente", "clave"]);
  t.cerrar();
});

test("papel: sin textos técnicos ni rótulos internos, también con pareja ambigua", () => {
  const a = [fila("A", "Estudiante 61", [6, 6, 6, 4]), fila("A", "Estudiante 62", [7, 7, 7, 5])];
  const b = [fila("B", "Estudiante 61", [6, 6, 6, 4]), fila("B", "Estudiante 61", [1, 1, 1, 1]), fila("B", "Estudiante 62", [7, 7, 7, 5])];
  const cierre = JSON.stringify({ estudiantes: { "curso x\testudiante 62": { modo: "manual", categoria: "Suficiente" } } });
  const t = pantalla({ a, b, cierre });
  for (const bl of bloques(t)) {
    assert.doesNotMatch(bl.textContent, /ambiguo|emparejamiento|procesado|manual|override|sugerid|Provisorio|Revisar pareja|Lista|≠|automátic|sin confirmar|pendiente de decisión/i,
      bl.querySelector(".final-nombre").textContent);
  }
  t.cerrar();
});

test("papel igual con o sin cambio docente: sólo cambia la calificación; la Parte 1 nunca como explicación (queda para el docente)", () => {
  const sinCalificacion = (b) => { const x = b.cloneNode(true); x.querySelector(".final-cat").remove(); return x.innerHTML; };
  const alto = { a: [fila("A", "Estudiante 41", [8, 8, 7, 6])], b: [fila("B", "Estudiante 41", [7, 8, 8, 6])] };
  let t = pantalla(alto);
  let [b] = bloques(t);
  assert.equal(b.querySelector(".final-cat b").textContent, "Avanzado");
  const antes = sinCalificacion(b);
  t.$("btnCerrarImpresion").click();
  revisar(t, "Estudiante 41");
  assert.equal(t.$("ccSugerida").textContent, "Avanzado");
  finalCC(t, "En proceso");
  [b] = bloques(t);
  assert.equal(b.querySelector(".final-cat b").textContent, "En proceso");
  assert.equal(sinCalificacion(b), antes, "la evidencia y lo que hay para revisar no dependen de la decisión");
  assert.doesNotMatch(b.textContent, /Avanzado/, "la sugerida no aparece");
  t.cerrar();
  // P1: sugerida En proceso por la Parte 1 (8 de 16). El papel no lo explica; la pantalla docente sí.
  const p1 = { a: [fila("A", "Estudiante 42", [4, 8, 8, 6])], b: [fila("B", "Estudiante 42", [4, 8, 8, 6])] };
  t = pantalla(p1);
  [b] = bloques(t);
  assert.equal(b.querySelector(".final-cat b").textContent, "En proceso");
  assert.doesNotMatch(b.textContent, /requisito|afianzar|Para alcanzar|hacían falta|mínimo/);
  assert.deepEqual([...b.querySelector("tbody tr").children].map((c) => c.textContent), ["1 · Reconocer", "4 de 8", "4 de 8", "4 de 8"], "el resultado de P1 sigue a la vista");
  const p1Antes = sinCalificacion(b);
  t.$("btnCerrarImpresion").click();
  revisar(t, "Estudiante 42");
  assert.match(t.$("ccP1").textContent, /^Parte 1 · Reconocer: 8\/16 \(A 4\/8 \+ B 4\/8\) · no alcanza el mínimo de 9\/16/, "para el docente, la explicación de P1 sigue");
  finalCC(t, "Suficiente");
  [b] = bloques(t);
  assert.equal(sinCalificacion(b), p1Antes);
  t.cerrar();
});

// Contenidos de cada evaluación, como los define su herramienta.
const EJES_DE = Object.fromEntries(["A", "B"].map((x) => [x, JSON.parse(HTML[x].match(/const EJES = (\[[\s\S]*?\]);/)[1])]));
const TEMA = {
  "Hardware y software": ["hw"], "CPU, RAM y almacenamiento": ["cpu", "ram"], "CPU y memoria": ["cpu"], "RAM y almacenamiento": ["ram"], "Sistema operativo": ["so"],
  "Datos y operaciones": ["datos"], "Entrada, salida y estado": ["es", "estado"], "Entrada y salida": ["es"], "Estado": ["estado"], "Representaciones": ["repr"],
};
const ORDEN_TEMAS = ["hw", "cpu", "ram", "so", "datos", "es", "estado", "repr"];
const COMO_SEGUIR = "Cómo seguir: buscá esas preguntas en tus evaluaciones, compará tus respuestas con la clave y volvé a los materiales de clase de esos temas.";
// «Para revisar» de un papel: [[tema, { A: [preguntas], B: [preguntas] }]].
const paraRevisar = (b) => [...b.querySelectorAll(".final-revisar li")].map((li) => {
  const [tema, preguntas] = li.textContent.split(" — ");
  return [tema, Object.fromEntries(preguntas.split(" · ").map((g) => [g[0], g.slice(2).split(", ").map(Number)]))];
});
// Preguntas incorrectas firmes (sin las que están en revisión) de las partes contabilizadas.
const incorrectas = (x, f) => f.respuestas.flatMap((v, i) => (f.cuentan[PARTES.findIndex(([d, h]) => i + 1 >= d && i + 1 <= h)] && v !== BUENAS[x][i] && !v.includes("?") &&
  !(x === "A" && i === 17 && ["B", "D", "B+D"].includes(v)) ? [i + 1] : []));

test("papel «Para revisar»: todas las respuestas incorrectas firmes, por tema, sin interpretación; una sola orientación fija", () => {
  const filasA = [fila("A", "Estudiante 91", [6, 6, 6, 4]), fila("A", "Estudiante 92", [3, 3, 3, 2]),
    fila("A", "Estudiante 97", [6, 6, 6, 4], { cuentan: [T, T, T, F], cambios: { 7: "?" } }), fila("A", "Estudiante 98", PERFECTO)];
  const filasB = [fila("B", "Estudiante 91", [6, 6, 6, 4]), fila("B", "Estudiante 92", [4, 3, 4, 2]), fila("B", "Estudiante 98", PERFECTO)];
  const t = pantalla({ a: filasA, b: filasB });
  const bs = bloques(t);
  for (const b of bs) {
    const n = b.querySelector(".final-nombre").textContent;
    assert.deepEqual([...b.querySelectorAll("h3")].map((h) => h.textContent), ["Tus resultados en las Evaluaciones A y B", n === "Estudiante 98" ? "Para revisar" : PARA_REVISAR], n);
    // Nada de interpretación heurística en el papel.
    assert.doesNotMatch(b.textContent, /te fue mejor|Necesitás|Te conviene|volver a estudiar|consolidar|reforzar|Todavía en revisión|Seguí así|dificultades marcadas|manejás|dominás|Cómo te fue/i, n);
    const reg = { A: filasA.find((f) => f.estudiante === n), B: filasB.find((f) => f.estudiante === n) };
    const lista = paraRevisar(b);
    for (const x of ["A", "B"]) {
      // Completo y exacto: cada incorrecta firme de una parte contabilizada aparece, y sólo ellas.
      const listadas = [...new Set(lista.flatMap(([, g]) => g[x] ?? []))].sort((p, q) => p - q);
      assert.deepEqual(listadas, reg[x] ? incorrectas(x, reg[x]) : [], `${n} ${x}`);
      // Cada pregunta, en un tema al que pertenece en esa evaluación.
      for (const [tema, g] of lista) {
        const items = EJES_DE[x].filter((e) => TEMA[tema].includes(e.id)).flatMap((e) => e.items);
        for (const q of g[x] ?? []) assert.ok(items.includes(q), `${n}: ${x}${q} en ${tema}`);
      }
    }
    // Temas en el orden fijo de siempre.
    const orden = lista.map(([tema]) => ORDEN_TEMAS.indexOf(TEMA[tema][0]));
    assert.deepEqual(orden, [...orden].sort((p, q) => p - q), n);
  }
  const de = (n) => papelDe(bs, n);
  assert.deepEqual([...de("Estudiante 92").querySelectorAll(".final-contenidos > p, .final-revisar li")].map((e) => e.textContent), [
    "CPU, RAM y almacenamiento — A 6, 7, 13, 20, 22, 30 · B 6, 7, 13, 22, 28",
    "Sistema operativo — A 8, 15, 23, 28, 29 · B 8, 15, 28, 29, 30",
    "Datos y operaciones — A 24 · B 24",
    "Entrada, salida y estado — A 4, 5, 12, 14, 21 · B 5, 12, 14, 21, 27",
    "Representaciones — A 16, 27 · B 16, 23",
    COMO_SEGUIR,
  ]);
  // La 7 en revisión y la Parte 4 que no se contabiliza no se listan.
  assert.deepEqual(paraRevisar(de("Estudiante 97")).flatMap(([, g]) => g.A).sort((p, q) => p - q), [8, 15, 16, 23, 24]);
  // Sin incorrectas: lo dice, sin elogios ni lista.
  assert.equal(de("Estudiante 98").querySelector(".final-revisar"), null);
  assert.equal(de("Estudiante 98").querySelector(".final-contenidos").textContent, "No tuviste respuestas incorrectas en las partes consideradas.");
  for (const n of ["Estudiante 91", "Estudiante 92", "Estudiante 97"]) assert.equal(de(n).querySelector(".final-como").textContent, COMO_SEGUIR, n);
  // La clave, presentada como herramienta para corregirse.
  for (const b of bs) {
    assert.equal(b.querySelector(".clave-tit").textContent, "Para corregir tus evaluaciones, compará tus respuestas con esta clave: una línea para la Evaluación A y otra para la B; cada número es una pregunta y la letra que lo sigue, su respuesta correcta.");
    assert.deepEqual([...b.querySelectorAll(".clave-ev")].map((e) => e.textContent), ["A", "B"]);
  }
  t.cerrar();
});

test("papel: con una sola evaluación, «Sin resultado» una vez en su columna y sin causa; lo de la otra, sin inventar", () => {
  const t = pantalla({
    a: [fila("A", "Estudiante 93", [6, 6, 6, 4])],
    b: [fila("B", "Estudiante 94", [6, 6, 6, 4])],
  });
  const bs = bloques(t);
  const de = (n) => bs.find((b) => b.querySelector(".final-nombre").textContent === n);
  const filas = (b) => [...b.querySelectorAll("tbody tr, tfoot tr")].map((tr) => [...tr.children].map((c) => c.textContent));
  // Sólo A: la columna B dice una vez «Sin resultado» (abarca las cuatro partes) y su total queda vacío;
  // Para A+B es lo de la A.
  assert.deepEqual(filas(de("Estudiante 93")), [
    ["1 · Reconocer", "6 de 8", "Sin resultado", "6 de 8"], ["2 · Relacionar", "6 de 8", "6 de 8"], ["3 · Interpretar", "6 de 8", "6 de 8"], ["4 · Usar lo que sabés", "4 de 6", "4 de 6"],
    ["Total", "22 de 30 (73,3 %)", "", "22 de 30 (73,3 %)"],
  ]);
  // Sólo B: lo mismo en la columna A.
  assert.deepEqual(filas(de("Estudiante 94")), [
    ["1 · Reconocer", "Sin resultado", "6 de 8", "6 de 8"], ["2 · Relacionar", "6 de 8", "6 de 8"], ["3 · Interpretar", "6 de 8", "6 de 8"], ["4 · Usar lo que sabés", "4 de 6", "4 de 6"],
    ["Total", "", "22 de 30 (73,3 %)", "22 de 30 (73,3 %)"],
  ]);
  for (const [n, x] of [["Estudiante 93", "A"], ["Estudiante 94", "B"]]) {
    const b = de(n);
    const celda = b.querySelector("td.sin-resultado");
    assert.equal(celda.getAttribute("rowspan"), "4", n);
    assert.equal(b.querySelectorAll("td.sin-resultado").length, 1, n);
    assert.doesNotMatch(b.querySelector("table").textContent, /—/, `${n}: sin guiones repetidos`);
    // No se dice por qué falta la evaluación.
    assert.doesNotMatch(b.textContent, /ausente|no realizada|no la hiciste|no rendiste|faltaste|no se presentó|no entregaste/i, n);
    assert.equal(b.querySelector(".final-mejoras"), null, n);
    // Para revisar: sólo preguntas de la evaluación que hay.
    assert.ok(paraRevisar(b).length && paraRevisar(b).every(([, g]) => Object.keys(g).join() === x), n);
  }
  t.cerrar();
});

// ---------- Papel: evidencia A+B (el mejor resultado de cada parte) ----------
const papelDe = (bs, nombre) => bs.find((b) => b.querySelector(".final-nombre").textContent === nombre);
const columna = (b, k) => [...b.querySelectorAll("tbody tr, tfoot tr")].map((tr) => tr.children[tr.children.length - 4 + k]?.textContent ?? null);
const paraAB = (b) => [...b.querySelectorAll("tbody tr, tfoot tr")].map((tr) => tr.lastElementChild.textContent);
const totales = (b) => [...b.querySelector("tfoot tr").children].map((c) => c.textContent);
const conjunto = (b) => b.querySelector(".final-conjunto")?.textContent ?? null;
const REGLA = "Para valorar las Evaluaciones A y B, en cada parte se conserva tu mejor resultado entre las dos.";
const SOLO = (x) => `Como de la Evaluación ${x === "A" ? "B" : "A"} no hay resultado, para valorar las Evaluaciones A y B se toma tu resultado en la ${x}.`;
// « Así obtuviste[, por ahora,] 18 de 24 (75 %)[ en las partes que se consideraron].»
const obtuviste = (total, { ahora = false, menos = false } = {}) => ` Así obtuviste${ahora ? ", por ahora," : ""} ${total}${menos ? " en las partes que se consideraron" : ""}.`;
// Porcentaje con coma decimal, a lo sumo un decimal y sin «,0»; cálculo
// independiente del de la herramienta.
const pctEsperado = (a, n) => (a * 100 / n).toFixed(1).replace(/\.0$/, "").replace(".", ",");
const conPct = (a, n) => `${a} de ${n} (${pctEsperado(a, n)} %)`;

test("papel A+B: cada parte conserva su mejor resultado, aunque venga de la evaluación con menor total", () => {
  const casos = [
    // [A, B, Para A+B por parte, total A, total B, total Para A+B, calificación]
    // A > B en total, pero Usar lo que sabés viene de B.
    [[8, 8, 7, 1], [6, 6, 6, 5], ["8 de 8", "8 de 8", "7 de 8", "5 de 6"], conPct(24, 30), conPct(23, 30), "28 de 30 (93,3 %)", "Avanzado"],
    // B > A en total, pero Reconocer viene de A.
    [[7, 2, 2, 2], [4, 6, 6, 5], ["7 de 8", "6 de 8", "6 de 8", "5 de 6"], conPct(13, 30), conPct(21, 30), "24 de 30 (80 %)", "Avanzado"],
    // Ninguno de los dos totales alcanza Suficiente (9/30 y 14/30); la combinación sí (18/30).
    [[6, 0, 1, 2], [3, 4, 6, 1], ["6 de 8", "4 de 8", "6 de 8", "2 de 6"], "9 de 30 (30 %)", "14 de 30 (46,7 %)", "18 de 30 (60 %)", "Suficiente"],
    // A 23/30 y B 20/30 (Suficiente cada una); la combinación llega a 25/30 (Avanzado).
    [[8, 7, 6, 2], [5, 5, 7, 3], ["8 de 8", "7 de 8", "7 de 8", "3 de 6"], "23 de 30 (76,7 %)", "20 de 30 (66,7 %)", "25 de 30 (83,3 %)", "Avanzado"],
  ];
  for (const [pa, pb, partes, ta, tb, tj, cat] of casos) {
    const t = pantalla({ a: [fila("A", "Estudiante 71", pa)], b: [fila("B", "Estudiante 71", pb)] });
    const [b] = bloques(t);
    const que = JSON.stringify([pa, pb]);
    assert.deepEqual(paraAB(b), [...partes, tj], que);
    assert.deepEqual(totales(b), ["Total", ta, tb, tj], que);
    assert.equal(conjunto(b), REGLA + obtuviste(tj), que);
    assert.equal(b.querySelector(".final-cat b").textContent, cat, que);
    // Ni procedencias ni rótulos técnicos.
    assert.doesNotMatch(b.textContent, /Mejor resultado|Resultado considerado|A = B|mejor evidencia/, que);
    t.cerrar();
  }
});

test("papel A+B = cálculo del cierre, al azar: contra una regla independiente (mejor por parte, P1, umbrales) y contra el export", async () => {
  // Generador determinista: cada parte de cada intento es válida, no se
  // contabiliza (con o sin respuestas cargadas) o tiene una respuesta en
  // revisión (una parte contabilizada siempre está completa); hay
  // estudiantes sólo con A o sólo con B, y partes elegidas por el docente.
  let semilla = 20261010;
  const azar = (n) => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla % n; };
  const TAM = [8, 8, 8, 6];
  const intento = () => {
    const puntajes = TAM.map((n) => azar(n + 1));
    const estado = TAM.map(() => ["valida", "valida", "valida", "no cuenta", "no cuenta vacía", "revisar"][azar(6)]);
    return { puntajes, estado };
  };
  const enRevision = (r, k) => r.estado[k] === "revisar" && r.puntajes[k] < TAM[k];
  const registro = (x, nombre, r) => {
    const cambios = {};
    r.estado.forEach((e, k) => {
      const [d, h] = PARTES[k];
      if (e === "no cuenta vacía") for (let n = d; n <= h; n++) cambios[n] = null;
      // En revisión, sobre una respuesta incorrecta: no cambia los aciertos firmes.
      if (e === "revisar" && r.puntajes[k] < h - d + 1) cambios[h] = "?";
    });
    return fila(x, nombre, r.puntajes, { cuentan: r.estado.map((e) => !e.startsWith("no cuenta")), cambios });
  };
  const gente = Array.from({ length: 48 }, (_, i) => {
    const nombre = `Estudiante ${100 + i}`;
    const quien = azar(5);
    const partes = azar(3) === 0 ? TAM.map(() => azar(4) !== 0) : null;
    return { nombre, A: quien === 4 ? null : intento(), B: quien === 3 ? null : intento(), partes };
  });
  const a = gente.filter((g) => g.A).map((g) => registro("A", g.nombre, g.A));
  const b = gente.filter((g) => g.B).map((g) => registro("B", g.nombre, g.B));
  const cierre = JSON.stringify({ estudiantes: Object.fromEntries(gente.filter((g) => g.partes).map((g) => [`curso x\t${g.nombre.toLowerCase()}`, { modo: "procesado", partes: g.partes }])) });
  const t = pantalla({ a, b, cierre });
  const bs = bloques(t);
  const { json } = await exportarCompleto(t);
  let combinados = 0;
  for (const g of gente) {
    // La regla, calculada aparte: por parte, el mayor puntaje entre los intentos válidos.
    const valido = (r, k) => r && ["valida", "revisar"].includes(r.estado[k]);
    const mejor = TAM.map((n, k) => { const vs = [g.A, g.B].filter((r) => valido(r, k)).map((r) => r.puntajes[k]); return vs.length ? Math.max(...vs) : null; });
    const elegidas = TAM.map((n, k) => mejor[k] !== null && (g.partes ? g.partes[k] : true));
    const aciertos = mejor.reduce((s, m, k) => s + (elegidas[k] ? m : 0), 0);
    const total = TAM.reduce((s, n, k) => s + (elegidas[k] ? n : 0), 0);
    const p1 = [g.A, g.B].filter((r) => valido(r, 0));
    const cumpleP1 = p1.length > 0 && p1.reduce((s, r) => s + r.puntajes[0], 0) >= { 1: 6, 2: 9 }[p1.length];
    const partes = elegidas.filter(Boolean).length;
    const cat = !partes ? null : !cumpleP1 || 20 * aciertos < 11 * total ? "En proceso" : partes === 4 && 5 * aciertos >= 4 * total ? "Avanzado" : "Suficiente";
    if (g.A && g.B && mejor.some((m, k) => valido(g.A, k) && valido(g.B, k) && g.A.puntajes[k] !== g.B.puntajes[k])) combinados++;
    // El papel.
    const bl = papelDe(bs, g.nombre);
    const que = JSON.stringify(g);
    assert.deepEqual(paraAB(bl).slice(0, 4), mejor.map((m, k) => (m === null ? "—" : !elegidas[k] ? "no se consideró" : `${m} de ${TAM[k]}`)), que);
    assert.equal(paraAB(bl)[4], total ? conPct(aciertos, total) : "", que);
    // Lo que está en revisión puede subir el total si, en una parte que cuenta, supera al mejor firme.
    const ahora = TAM.some((n, k) => elegidas[k] && [g.A, g.B].some((r) => valido(r, k) && r.puntajes[k] + (enRevision(r, k) ? 1 : 0) > mejor[k]));
    assert.equal(conjunto(bl), !total ? null : (g.A && g.B ? REGLA : SOLO(g.A ? "A" : "B")) + obtuviste(conPct(aciertos, total), { ahora, menos: partes < 4 }), que);
    assert.equal(bl.querySelector(".final-cat b").textContent, cat ?? "sin definir", que);
    // Totales de A y de B: sus partes válidas, con su propio denominador.
    for (const [x, col] of [["A", 1], ["B", 2]]) {
      const r = g[x];
      const ks = TAM.map((n, k) => k).filter((k) => valido(r, k));
      const esperado = !r ? "" : !ks.length ? "—" : conPct(ks.reduce((s, k) => s + r.puntajes[k], 0), ks.reduce((s, k) => s + TAM[k], 0));
      assert.equal(totales(bl)[col], esperado, `${x} ${que}`);
    }
    // Cada porcentaje del papel: coma decimal, a lo sumo un decimal, sin «,0», y coincide con su puntaje.
    for (const [, x, n, p] of bl.textContent.matchAll(/(\d+) de (\d+) \(([^)]*) %\)/g)) {
      assert.match(p, /^\d+(,\d)?$/, que);
      assert.doesNotMatch(p, /,0$/, que);
      assert.equal(p, pctEsperado(+x, +n), que);
    }
    // El export: la misma evidencia que usa la sugerencia, y la misma categoría.
    const e = json.estudiantes.find((x) => x.estudiante === g.nombre);
    assert.deepEqual([e.sugerencia.resultado_considerado.aciertos, e.sugerencia.resultado_considerado.total, e.sugerencia.categoria], [aciertos, total, cat], que);
    assert.equal(e.devolucion_entregada.conjunto, conjunto(bl), que);
    assert.deepEqual(e.devolucion_entregada.resultados.at(-1), totales(bl), que);
  }
  assert.ok(combinados >= 10, `casos con partes de A y de B distintas: ${combinados}`);
  t.cerrar();
});

test("papel A+B: una parte que no cuenta no entra; el total y el porcentaje usan el denominador real, no 30", () => {
  // Elegida por el docente sin la Parte 4; A completa y B sin la Parte 1.
  const t = pantalla({
    a: [fila("A", "Estudiante 72", [6, 6, 6, 5]), fila("A", "Estudiante 73", [5, 6, 6, 4])],
    b: [fila("B", "Estudiante 72", [5, 7, 4, 2]), fila("B", "Estudiante 73", [8, 6, 6, 4], { cuentan: [F, T, T, T] })],
    cierre: JSON.stringify({ estudiantes: { "curso x\testudiante 72": { modo: "procesado", partes: [T, T, T, F] } } }),
  });
  const bs = bloques(t);
  const b72 = papelDe(bs, "Estudiante 72");
  assert.deepEqual(paraAB(b72), ["6 de 8", "7 de 8", "6 de 8", "no se consideró", "19 de 24 (79,2 %)"]);
  assert.equal(conjunto(b72), REGLA + obtuviste("19 de 24 (79,2 %)", { menos: true }));
  // Las evaluaciones, completas: lo que no cuenta para A+B sigue a la vista en su columna.
  assert.deepEqual(totales(b72), ["Total", "23 de 30 (76,7 %)", "18 de 30 (60 %)", "19 de 24 (79,2 %)"]);
  assert.doesNotMatch(b72.textContent, /de 30 \(\d+(,\d)? %\)\.$/m);
  // Sin la Parte 1 en B: Para A+B toma P1 sólo de A (el 8 de B no se contabiliza).
  const b73 = papelDe(bs, "Estudiante 73");
  assert.deepEqual(columna(b73, 2).slice(0, 1), ["no se consideró"]);
  assert.deepEqual(paraAB(b73), ["5 de 8", "6 de 8", "6 de 8", "4 de 6", "21 de 30 (70 %)"]);
  assert.deepEqual(totales(b73), ["Total", "21 de 30 (70 %)", "16 de 22 (72,7 %)", "21 de 30 (70 %)"]);
  t.cerrar();
});

test("papel A+B: sólo A y sólo B, sin inventar la otra evaluación", () => {
  const t = pantalla({
    a: [fila("A", "Estudiante 74", [7, 6, 5, 4]), fila("A", "Estudiante 76", [7, 6, 5, 4])],
    b: [fila("B", "Estudiante 75", [5, 6, 7, 3])],
    cierre: JSON.stringify({ estudiantes: { "curso x\testudiante 76": { modo: "procesado", partes: [T, T, F, T] } } }),
  });
  const bs = bloques(t);
  const b74 = papelDe(bs, "Estudiante 74"), b75 = papelDe(bs, "Estudiante 75"), b76 = papelDe(bs, "Estudiante 76");
  assert.deepEqual(totales(b74), ["Total", "22 de 30 (73,3 %)", "", "22 de 30 (73,3 %)"]);
  assert.equal(conjunto(b74), "Como de la Evaluación B no hay resultado, para valorar las Evaluaciones A y B se toma tu resultado en la A. Así obtuviste 22 de 30 (73,3 %).");
  assert.deepEqual(totales(b75), ["Total", "", "21 de 30 (70 %)", "21 de 30 (70 %)"]);
  assert.equal(conjunto(b75), "Como de la Evaluación A no hay resultado, para valorar las Evaluaciones A y B se toma tu resultado en la B. Así obtuviste 21 de 30 (70 %).");
  assert.equal(conjunto(b76), SOLO("A") + obtuviste("17 de 22 (77,3 %)", { menos: true }));
  // Sólo A con una parte que no cuenta: el total de A sigue siendo la evaluación; Para A+B, lo que cuenta.
  assert.deepEqual(paraAB(b76), ["7 de 8", "6 de 8", "no se consideró", "4 de 6", "17 de 22 (77,3 %)"]);
  assert.equal(totales(b76)[1], "22 de 30 (73,3 %)");
  for (const b of [b74, b75, b76]) {
    assert.equal(b.querySelectorAll("td.sin-resultado").length, 1);
    assert.equal(b.querySelector(".final-mejoras"), null);
    assert.doesNotMatch(b.textContent, /ausente|no realizada|no la hiciste|no rendiste|faltaste|no se presentó|no entregaste|entre las dos/i);
  }
  t.cerrar();
});

test("papel A+B con respuestas en revisión: sólo lo firme, con el aviso; «por ahora» sólo si el total puede cambiar", () => {
  // A: la 7 (Parte 1) y la 30 en revisión, sobre respuestas incorrectas.
  const t = pantalla({ a: [fila("A", "Estudiante 77", [6, 3, 5, 4], { cambios: { 7: "?", 30: "?" } })], b: [fila("B", "Estudiante 77", [5, 5, 4, 3])] });
  const [b] = bloques(t);
  assert.equal(b.querySelector(".final-pendiente").textContent, "Algunas respuestas todavía se están revisando: estos resultados pueden cambiar.");
  assert.deepEqual(columna(b, 1).slice(0, 4), ["6 de 8 (1 en revisión)", "3 de 8", "5 de 8", "4 de 6 (1 en revisión)"]);
  assert.deepEqual(paraAB(b), ["6 de 8", "5 de 8", "5 de 8", "4 de 6", "20 de 30 (66,7 %)"]);
  // La 7 de A podría llevar Reconocer a 7 de 8: el total de A+B todavía puede cambiar.
  assert.equal(conjunto(b), REGLA + obtuviste("20 de 30 (66,7 %)", { ahora: true }));
  // Las respuestas en revisión no se listan como incorrectas.
  assert.ok(!paraRevisar(b).some(([, g]) => g.A?.includes(7) || g.A?.includes(30)));
  t.cerrar();
  // En revisión en una parte donde la otra evaluación ya es mejor: el total no puede cambiar.
  const u = pantalla({ a: [fila("A", "Estudiante 87", [5, 3, 5, 4], { cambios: { 7: "?" } })], b: [fila("B", "Estudiante 87", [8, 5, 4, 3])] });
  const [b87] = bloques(u);
  assert.ok(b87.querySelector(".final-pendiente"));
  assert.equal(conjunto(b87), REGLA + obtuviste("22 de 30 (73,3 %)"));
  u.cerrar();
});

test("papel sin evidencia válida o sin partes que cuenten: ningún porcentaje sin denominador", () => {
  const t = pantalla({
    a: [fila("A", "Estudiante 78", [null, null, null, null], { cuentan: [F, F, F, F] }), fila("A", "Estudiante 79", [6, 6, 6, 4])],
    b: [fila("B", "Estudiante 78", [5, null, 5, 3], { cuentan: [T, T, T, T] })],
    cierre: JSON.stringify({ estudiantes: { "curso x\testudiante 79": { modo: "procesado", partes: [F, F, F, F] } } }),
  });
  const bs = bloques(t);
  // 78: A sin ninguna parte contabilizada, B incompleta en la Parte 2.
  const b78 = papelDe(bs, "Estudiante 78");
  assert.deepEqual(columna(b78, 1).slice(0, 4), ["no se consideró", "no se consideró", "no se consideró", "no se consideró"]);
  assert.deepEqual(paraAB(b78), ["5 de 8", "—", "5 de 8", "3 de 6", "13 de 22 (59,1 %)"]);
  assert.deepEqual(totales(b78), ["Total", "—", "13 de 22 (59,1 %)", "13 de 22 (59,1 %)"]);
  // 79: el docente no eligió ninguna parte: sin total ni porcentaje de Para A+B, sin frase.
  const b79 = papelDe(bs, "Estudiante 79");
  assert.deepEqual(paraAB(b79), ["no se consideró", "no se consideró", "no se consideró", "no se consideró", ""]);
  assert.equal(conjunto(b79), null);
  assert.equal(totales(b79)[1], "22 de 30 (73,3 %)");
  for (const b of bs) assert.doesNotMatch(b.textContent, /NaN|Infinity|undefined|\(\s*%\)|de 0\b/);
  t.cerrar();
  // Sin ninguna parte válida en A ni en B: ni total ni porcentaje en ninguna columna.
  const u = pantalla({ a: [fila("A", "Estudiante 80", [null, null, null, null], { cuentan: [F, F, F, F] })], b: [fila("B", "Estudiante 80", [3, 3, 3, 3], { cuentan: [F, F, F, F] })] });
  const [b80] = bloques(u);
  assert.deepEqual(totales(b80), ["Total", "—", "—", ""]);
  assert.equal(conjunto(b80), null);
  assert.doesNotMatch(b80.querySelector("table").textContent + (b80.querySelector(".final-conjunto")?.textContent ?? ""), /%/);
  u.cerrar();
});

test("encuadre del bimestre en todos los papeles, coincida o no la decisión docente; nunca la categoría sugerida ni un cambio", () => {
  // 81: sugerida (Avanzado), sin decisión. 82: el docente eligió la misma que la sugerida.
  // 83: sugerida Avanzado, el docente eligió En proceso. 84: sugerida En proceso, el docente eligió Suficiente.
  const t = pantalla({
    a: ["81", "82", "83"].map((n) => fila("A", `Estudiante ${n}`, [8, 8, 7, 6])).concat(fila("A", "Estudiante 84", [4, 3, 4, 2])),
    b: ["81", "82", "83"].map((n) => fila("B", `Estudiante ${n}`, [7, 8, 8, 6])).concat(fila("B", "Estudiante 84", [4, 4, 4, 3])),
    cierre: JSON.stringify({ estudiantes: {
      "curso x\testudiante 82": { modo: "manual", categoria: "Avanzado" },
      "curso x\testudiante 83": { modo: "manual", categoria: "En proceso" },
      "curso x\testudiante 84": { modo: "manual", categoria: "Suficiente" },
    } }),
  });
  const bs = bloques(t);
  const esperado = { "Estudiante 81": ["Avanzado", null], "Estudiante 82": ["Avanzado", null], "Estudiante 83": ["En proceso", "Avanzado"], "Estudiante 84": ["Suficiente", "En proceso"] };
  for (const [n, [final, oculta]] of Object.entries(esperado)) {
    const b = papelDe(bs, n);
    assert.equal(b.querySelector(".final-cat").textContent, `Calificación del Tercer Bimestre: ${final}`, n);
    assert.equal(b.querySelector(".final-encuadre").textContent, ENCUADRE, n);
    // El encuadre va antes de los resultados, junto a la calificación.
    assert.equal(b.querySelector(".final-encuadre").nextElementSibling.textContent, "Tus resultados en las Evaluaciones A y B", n);
    // La evidencia A+B se muestra igual, con o sin cambio docente.
    assert.ok(conjunto(b).startsWith(REGLA), n);
    if (oculta) assert.doesNotMatch(b.textContent, new RegExp(oculta), `${n}: no aparece la sugerida (${oculta})`);
    assert.doesNotMatch(b.textContent, /sugerid|automátic|override|manual|procesad|modificad|cambió|umbral|55|80 %\)?\s*o más|requisito/i, n);
  }
  // Iguales para todos: el texto del encuadre no depende de la decisión.
  assert.equal(new Set(bs.map((b) => b.querySelector(".final-encuadre").outerHTML)).size, 1);
  t.cerrar();
});

test("export privado: devolucion_entregada lee el papel nuevo; lo técnico de antes sigue igual", async () => {
  const t = pantalla(cursoCompleto());
  t.$("ccImprimir").click();
  const bs = [...t.$("impresionBloques").querySelectorAll("article.final")];
  const { json, archivos } = await exportarCompleto(t);
  for (const e of json.estudiantes) {
    const b = bs.find((x) => x.querySelector(".final-nombre").textContent === e.estudiante);
    const plano = (n) => n.textContent.replace(/\s+/g, " ").trim();
    assert.deepEqual(e.devolucion_entregada.resultados, [...b.querySelectorAll("thead tr, tbody tr, tfoot tr")].map((tr) => [...tr.children].map(plano)), e.estudiante);
    assert.equal(e.devolucion_entregada.conjunto, conjunto(b), e.estudiante);
    assert.equal(e.devolucion_entregada.encuadre, ENCUADRE);
    // Para A+B del papel = resultado considerado de la sugerencia.
    const r = e.sugerencia.resultado_considerado;
    assert.equal(e.devolucion_entregada.resultados.at(-1).at(-1), r.total ? `${r.aciertos} de ${r.total} (${String(r.porcentaje).replace(".", ",")} %)` : "", e.estudiante);
    // Lo técnico, con las mismas claves de siempre.
    assert.deepEqual(Object.keys(e.sugerencia), ["categoria", "resultado_considerado", "requisito_p1", "provisoria", "motivos", "categoria_si_lo_pendiente_resultara_correcto"]);
    assert.deepEqual(Object.keys(e.correccion.integrada), ["partes", "suma_mejor", "contenidos"]);
    assert.deepEqual(Object.keys(e.decision_docente), ["categoria_elegida", "categoria_final", "coincide_con_sugerida", "partes_elegidas", "nota", "registro_guardado"]);
  }
  // Estudiante 05: el docente dejó afuera la Parte 4. El papel dice 18 de 24; el export conserva
  // la suma de la mejor evidencia de todas las partes (22/30) y el resultado considerado (18/24).
  const e05 = json.estudiantes.find((e) => e.estudiante === "Estudiante 05");
  assert.deepEqual(e05.correccion.integrada.suma_mejor, { aciertos: 22, total: 30, porcentaje: 73.3 });
  assert.deepEqual(e05.sugerencia.resultado_considerado, { aciertos: 18, total: 24, porcentaje: 75, partes: [1, 2, 3] });
  assert.equal(e05.devolucion_entregada.conjunto, REGLA + obtuviste("18 de 24 (75 %)", { menos: true }));
  assert.equal(archivos["resumen.tsv"].split("\n")[0], ["curso", "n_lista", "estudiante", "nombre_en_A", "nombre_en_B", "presencia_A", "presencia_B", "emparejamiento",
    "total_A", "porcentaje_A", "total_B", "porcentaje_B", "mejor_A+B", "porcentaje_A+B", "categoria_sugerida", "categoria_final", "modificada_por_docente", "estado", "nota_docente"].join("\t"));
  t.cerrar();
});

test("nota docente: opcional; se abre con una guía si se cambia la categoría; la guía no se guarda; va a la impresión y no al export", async () => {
  const escrituras = [];
  const t = pantalla({ ...cursoCierre(), escrituras });
  revisar(t, "Estudiante 01");
  assert.equal(t.$("ccNota").getAttribute("placeholder"), null);
  finalCC(t, "En proceso");
  assert.equal(t.$("ccNotaDetalle").open, true);
  assert.equal(t.$("ccNota").getAttribute("placeholder"), "¿En qué otras evidencias del período se apoya la categoría? ¿Qué se valora del proceso y qué conviene hacer ahora?");
  assert.equal(t.$("ccNota").value, "");
  assert.deepEqual(decisionDe(t, "curso x\testudiante 01"), { modo: "manual", categoria: "En proceso" }, "sin nota guardada");
  // Nota en un estudiante con la sugerida (opcional también ahí).
  t.$("ccVolver").click();
  revisar(t, "Estudiante 06");
  t.$("ccNotaDetalle").open = true;
  const nota = t.$("ccNota");
  nota.value = "Nota sintética 5521: buen trabajo en clase.";
  nota.dispatchEvent(new t.w.Event("input", { bubbles: true }));
  assert.equal(t.$("ccEstado").textContent, "Lista");
  assert.equal(decisionDe(t, "curso x\testudiante 06").categoria, undefined, "la nota no cambia la categoría");
  t.$("ccVolver").click();
  const bs = bloques(t);
  const de = (n) => bs.find((b) => b.querySelector(".final-nombre").textContent === n);
  assert.equal(de("Estudiante 06").querySelector(".final-texto").textContent, "Nota sintética 5521: buen trabajo en clase.");
  assert.ok([...de("Estudiante 06").querySelectorAll("h3")].some((h) => h.textContent === "Nota de tu docente"));
  assert.equal(de("Estudiante 01").querySelector(".final-texto"), null, "vacía: no aparece");
  const { texto, datos } = await exportar(t);
  assert.ok(!texto.includes("5521") && !texto.includes("Nota sintética"));
  assert.doesNotMatch(texto, /≠|sugerid/i);
  assert.ok(datos.estudiantes.every((e) => !("sugerida" in e.cierre)));
  t.cerrar();
});

test("Cierre A+B: Sólo A y Sólo B se pueden consolidar a mano desde cualquiera de los dos", () => {
  const t = pantalla({ a: [fila("A", "Pérez, Juan", [4, 8, 8, 6])], b: [fila("B", "Juan Pérez", [5, 2, 3, 2])] });
  assert.deepEqual(listaCC(t).map((x) => [x.nombre, x.solo]), [["Juan Pérez", "Sólo B"], ["Pérez, Juan", "Sólo A"]]);
  revisar(t, "Juan Pérez");
  const sel = t.$("ccCandidato");
  assert.deepEqual([...sel.options].slice(1).map((o) => o.textContent), ["Pérez, Juan"]);
  sel.value = sel.options[1].value;
  t.$("ccVincular").click();
  assert.equal(quien(t), "Pérez, Juan");
  assert.equal(t.$("ccSugerida").textContent, "Avanzado");
  t.$("ccVolver").click();
  assert.deepEqual(listaCC(t).map((x) => [x.num, x.nombre, x.A, x.B, x.solo]), [["01", "Pérez, Juan↔ B: Juan Pérez · vínculo manual", "✓", "✓", ""]]);
  assert.deepEqual(JSON.parse(t.w.localStorage.getItem(CIERRE)).vinculos, [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }]);
  t.cerrar();
});

test("principio de Aula documentado: «La herramienta propone. El docente decide.»", () => {
  for (const f of ["README.md", "AGENTS.md"]) {
    const texto = readFileSync(join(root, f), "utf8");
    assert.match(texto, /La herramienta propone\. El docente decide\./, f);
    assert.match(texto, /no reemplazan el criterio pedagógico del docente\. La decisión final debe permanecer explícitamente bajo control humano\./, f);
  }
});

test("herramientas: «#ver=<id>» abre esa evaluación guardada en Ver", () => {
  const a = [fila("A", "Estudiante 01", [6, 6, 6, 4]), fila("A", "Estudiante 02", [7, 7, 7, 5])];
  const t = abrir("A", { a, url: `http://localhost/herramientas/evaluacion-a/#ver=${a[1].id}` });
  assert.equal(t.$("barraVer").hidden, false);
  assert.match(t.$("verNombre").textContent, /^Estudiante 02/);
  t.cerrar();
});

// ---------- 6. Nunca escribe A ni B ----------
test("integrar y decidir nunca escribe en el almacenamiento de A ni de B, desde ninguna de las dos herramientas", () => {
  const a = [fila("A", "Estudiante 01", [6, 6, 6, 4]), fila("A", "Estudiante 02", [2, 2, 2, 2])];
  const b = [fila("B", "Estudiante 01", [7, 2, 6, 3]), fila("B", "Estudiante 03", [5, 5, 5, 5])];
  for (const x of ["B", "A"]) {
    const escrituras = [];
    const t = abrir(x, { a, b, escrituras });
    const antes = { A: t.w.localStorage.getItem(CLAVE.A), B: t.w.localStorage.getItem(CLAVE.B) };
    t.ver(0);
    const desde = escrituras.length;
    t.marcar(2, false);
    t.marcar(3, false);
    t.$("btnSiguienteVista").click();
    t.$("btnConfirmarCierre").click();
    t.$("btnAnteriorVista").click();
    t.marcar(2, true);
    const otra = x === "A" ? "B" : "A";
    assert.ok(!escrituras.includes(CLAVE[otra]), `la herramienta ${x} nunca escribe ${CLAVE[otra]}`);
    assert.ok(escrituras.slice(desde).every((k) => k === CIERRE || k === CLAVE[x]), `${x}: sólo la decisión (y la propia sesión al navegar)`);
    assert.equal(t.w.localStorage.getItem(CLAVE.A), antes.A, "datos de A intactos");
    assert.equal(t.w.localStorage.getItem(CLAVE.B), antes.B, "datos de B intactos");
    t.cerrar();
  }
  // Las casillas del cierre, por sí solas, escriben sólo la clave de cierre.
  const escrituras = [];
  const t = abrir("B", { a, b, escrituras });
  t.ver(0);
  const desde = escrituras.length;
  t.marcar(1, false);
  t.$("cierre").querySelector("input[data-parte='0']").click();
  assert.deepEqual([...new Set(escrituras.slice(desde))], [CIERRE]);
  t.cerrar();
});

// ---------- 7. Recorrer un curso ----------
test("recorrer un curso: línea de cierre por fila y Anterior / Siguiente en Ver", () => {
  const a = [fila("A", "Estudiante 01", [8, 8, 8, 6]), fila("A", "Estudiante 02", [4, 4, 4, 4])];
  const b = [fila("B", "Estudiante 01", [6, 6, 6, 4]), fila("B", "Estudiante 02", [5, 5, 4, 2]), fila("B", "Estudiante 03", [1, 1, 1, 1])];
  const t = abrir("B", { a, b });
  assert.deepEqual(t.lineas(), [
    "Cierre: Avanzado · 30/30 · propuesta",
    "Cierre: Suficiente · 18/30 · propuesta",
    "Cierre: En proceso · 4/30 · sin A · propuesta",
  ]);
  assert.equal(t.$("cierre").hidden, true, "el panel aparece sólo en Ver");
  t.ver(0);
  assert.equal(t.$("cierre").hidden, false);
  assert.equal(t.$("btnAnteriorVista").disabled, true);
  t.$("btnSiguienteVista").click();
  assert.match(t.$("verNombre").textContent, /^Estudiante 02/);
  assert.equal(t.panel().resultado, "18/30 · 60 %");
  assert.equal(t.d.activeElement, t.$("btnSiguienteVista"), "el foco queda en el botón para seguir recorriendo");
  t.$("btnSiguienteVista").click();
  assert.equal(t.$("btnSiguienteVista").disabled, true);
  assert.equal(t.d.activeElement, t.$("btnAnteriorVista"), "en la última, el foco pasa a Anterior");
  t.$("btnAnteriorVista").click();
  assert.match(t.$("verNombre").textContent, /^Estudiante 02/);
  t.$("btnCerrarVista").click();
  assert.equal(t.$("cierre").hidden, true);
  t.cerrar();
});

test("sin datos de A en el navegador: B funciona igual y lo dice", () => {
  const t = abrir("B", { b: [fila("B", "Estudiante 01", [8, 8, 8, 6])] });
  t.ver(0);
  assert.match(t.panel().emparejamiento[0], /^No se encontró Evaluación A correspondiente/);
  assert.match(t.panel().emparejamiento[1], /No hay registros de la Evaluación A de este curso disponibles para vincular/);
  assert.equal(t.panel().categoria, "Avanzado");
  t.cerrar();
});
