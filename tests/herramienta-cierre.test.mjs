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
function abrir(x, { a = null, b = null, cierre = null, escrituras = [] } = {}) {
  const dom = new JSDOM(HTML[x], {
    url: "http://localhost/",
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
  assert.deepEqual(datosBloque(bs[0]), { nombre: "Estudiante 01", modo: "procesado", cat: "Avanzado",
    secciones: ["Resultados por parte", "Por contenidos (A y B juntos)", "Para seguir trabajando"] });
  assert.deepEqual(datosBloque(bs[1]), { nombre: "Estudiante 02", modo: "manual", cat: "Suficiente",
    secciones: ["Resultados por parte", "Por contenidos (A y B juntos)", "Para seguir trabajando", "Devolución"] });
  assert.equal(bs[1].querySelector(".final-texto").textContent, "Texto sintético de la devolución.\nSegunda línea.");
  // La clave, siempre al final de cada bloque.
  for (const b of bs) assert.equal(b.lastElementChild.className, "clave-compacta");
  // Resultados por parte con porcentajes y lo que cuenta para el cierre.
  assert.match(bs[0].querySelector("tbody tr").textContent, /^P1 · Reconocer7\/8 \(87,5 %\)6\/8 \(75 %\)7\/8 \(87,5 %\) · A✓$/);
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
    const r = bloques(t).map((b) => [datosBloque(b).nombre, b.dataset.clave, datosBloque(b).cat, b.querySelector(".final-contenidos").textContent,
      b.querySelector(".final-orientacion").textContent]);
    t.cerrar();
    return r;
  };
  assert.deepEqual(resumen("A"), resumen("B"));
});

test("sin publicación: ninguna ruta nueva y nada de evaluaciones, claves ni herramientas en dist/", () => {
  // Las únicas rutas locales son las dos herramientas, sólo en `astro dev`.
  const config = readFileSync(join(root, "astro.config.mjs"), "utf8");
  assert.match(config, /apply: "serve"/);
  assert.match(config, /\["a", "b"\]\.flatMap/);
  assert.doesNotMatch(config, /clave|cierre|imprim/i);
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
      assert.doesNotMatch(readFileSync(r, "utf8"), /aula-evaluacion|clave-docente|Clave de corrección|Cierre A\+B|Devoluciones de cierre/, r);
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
