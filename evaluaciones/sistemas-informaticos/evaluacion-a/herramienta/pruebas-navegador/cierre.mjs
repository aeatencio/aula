// Flujo mínimo de cierre A+B en Chrome real (headless, Windows), con clics y
// teclas nativos vía DevTools y datos sintéticos. Se ejecuta con correr.sh:
//   ./correr.sh cierre.mjs
// Abre la herramienta B en el mismo origen que la A (la URL de A con
// «evaluacion-b»), revisa la mejor evidencia, cambia la selección docente,
// recarga, recorre con Siguiente y abre la A para ver la misma decisión.
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const salida = process.argv[2];
const lista = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const ws = new WebSocket(lista.find((p) => p.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let idMsg = 0;
const pendientes = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); }
  // «Hay cambios sin exportar» al salir: se acepta (los datos son sintéticos).
  if (m.method === "Page.javascriptDialogOpening") ws.send(JSON.stringify({ id: ++idMsg, method: "Page.handleJavaScriptDialog", params: { accept: true } }));
});
const cdp = (method, params = {}) => new Promise((res, rej) => {
  const id = ++idMsg;
  const reloj = setTimeout(() => rej(new Error(`${method}: sin respuesta`)), 8000);
  pendientes.set(id, (m) => { clearTimeout(reloj); m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluar = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const clic = async (selector) => {
  const r = await evaluar(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await cdp("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
  await espera(80);
};
const espacio = async () => {
  for (const type of ["keyDown", "keyUp"]) await cdp("Input.dispatchKeyEvent", { type, key: " ", code: "Space", windowsVirtualKeyCode: 32, text: type === "keyDown" ? " " : undefined });
  await espera(80);
};
const ir = async (url) => { await cdp("Page.navigate", { url }); await espera(900); };
const captura = async (nombre) => {
  const { data } = await cdp("Page.captureScreenshot", { captureBeyondViewport: true });
  writeFileSync(join(salida, nombre), Buffer.from(data, "base64"));
};
const fallas = [];
const verificar = (cond, que) => { console.log(`${cond ? "ok  " : "FALLA"} ${que}`); if (!cond) fallas.push(que); };

// Datos sintéticos: puntajes por parte (primeros ítems bien, el resto mal).
const BUENAS = { A: "BACBCABCDBADBCACBBAACBCDCBDABA", B: "BCABCCABDBCABADCCBDABCADADBCAD" };
const PARTES = [[1, 8], [9, 16], [17, 24], [25, 30]];
let ids = 0;
const fila = (x, estudiante, puntajes, cuentan = [true, true, true, true]) => ({
  id: ++ids, curso: "Curso X", estudiante, cuentan,
  respuestas: PARTES.flatMap(([d, h], k) => Array.from({ length: h - d + 1 }, (_, j) => {
    const bien = BUENAS[x][d - 1 + j];
    return puntajes[k] === null ? null : j < puntajes[k] ? bien : bien === "A" ? "B" : "A";
  })),
});
const almacen = (filas) => JSON.stringify({
  s: { curso: "", estudiante: "", respuestas: Array(30).fill(null), cuentan: [true, true, true, true], cursor: 0, editando: null },
  filas, proximoId: filas.length + 1, exportado: "",
});
const A = almacen([
  fila("A", "Estudiante 01", [6, 4, 7, 3]),
  fila("A", "Estudiante 04", [8, 8, 8, 6]),
  fila("A", "ESTUDIANTE 04", [1, 1, 1, 1]),
]);
const B = almacen([
  fila("B", "estudiante  01", [8, null, 6, 5], [true, false, true, true]),
  fila("B", "Estudiante 03", [5, 5, 4, 4]),
  fila("B", "Estudiante 04", [3, 3, 3, 3]),
]);

const urlA = await evaluar("location.href");
const urlB = urlA.replace("evaluacion-a", "evaluacion-b");
await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
await ir(urlB);
await evaluar(`localStorage.clear(); localStorage.setItem("aula-evaluacion-a-v1", ${JSON.stringify(A)}); localStorage.setItem("aula-evaluacion-b-v1", ${JSON.stringify(B)})`);
await ir(urlB);
verificar(await evaluar("document.title") === "Corrección y análisis · Evaluación B", `herramienta B en ${urlB}`);

const lineas = () => evaluar('[...document.querySelectorAll("#tabla tbody .cierre-fila")].map((e) => e.textContent)');
let l = await lineas();
verificar(l.join(" | ") === "Cierre: Avanzado · 24/30 · propuesta | Cierre: En proceso · 18/30 · P1 no alcanza · sin A · propuesta | Cierre: En proceso · 12/30 · provisoria · propuesta",
  `línea de cierre por fila → ${l.join(" | ")}`);

const panel = () => evaluar(`(() => {
  const c = document.getElementById("cierre");
  return {
    visible: !c.hidden && c.getBoundingClientRect().height > 0,
    partes: [...c.querySelectorAll(".cierre-partes tbody tr")].map((tr) => [...tr.querySelectorAll("td")].slice(0, 3).map((td) => { const x = td.cloneNode(true); x.querySelectorAll(".pct").forEach((e) => e.remove()); return x.textContent; }).join(" | ") + (tr.querySelector("input") ? (tr.querySelector("input").checked ? " ☑" : " ☐") : "")),
    resultado: document.getElementById("cierreResultado")?.textContent ?? null,
    categoria: document.getElementById("cierreCategoria")?.textContent ?? null,
    p1: document.getElementById("cierreP1")?.textContent ?? null,
    res: c.querySelector(".cierre-res")?.textContent.replace(/\\s+/g, " ") ?? null,
    par: [...c.querySelectorAll(".cierre-par")].map((p) => p.textContent).join(" "),
    foco: document.activeElement.dataset.parte ?? document.activeElement.id,
  };
})()`);
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
let p = await panel();
verificar(p.visible, "Ver muestra el panel de cierre");
verificar(p.partes.join(" / ") === "6/8 | 8/8 | 8/8 · B ☑ / 4/8 | no contabilizada | 4/8 · A ☑ / 7/8 | 6/8 | 7/8 · A ☑ / 3/6 | 5/6 | 5/6 · B ☑",
  `mejor evidencia por parte → ${p.partes.join(" / ")}`);
verificar(p.resultado === "24/30 · 80 %" && p.categoria === "Avanzado", `propuesta: ${p.resultado} · ${p.categoria}`);
verificar(p.p1 === "Parte 1 · Reconocer: 14/16 (A 6/8 + B 8/8) · mínimo de 9/16 alcanzado", `requisito P1 con dos intentos → ${p.p1}`);
await captura("cierre-ver-propuesta.png");

await clic('#cierre input[data-parte="1"]');
p = await panel();
verificar(p.resultado === "20/22 · 90,9 %" && p.categoria === "Suficiente" && /Avanzado requiere las cuatro partes/.test(p.res),
  `sin P2 (clic): ${p.res}`);
verificar(p.foco === "1", "el foco queda en la casilla");
await espacio();
p = await panel();
verificar(p.resultado === "24/30 · 80 %", `Espacio vuelve a marcar P2 → ${p.resultado}`);
await espacio();
p = await panel();
verificar(p.resultado === "20/22 · 90,9 %", `Espacio la desmarca otra vez → ${p.resultado}`);
l = await lineas();
verificar(l[0] === "Cierre: Suficiente · 20/22", `la fila se actualiza al instante → ${l[0]}`);
await captura("cierre-ver-decision.png");

await clic("#btnSiguienteVista");
p = await panel();
verificar(/No se encontró Evaluación A correspondiente/.test(p.par) && p.resultado === "18/30 · 60 %", `Siguiente: estudiante sólo con B → ${p.resultado}`);
verificar(p.p1 === "Parte 1 · Reconocer: 5/8 (sólo B) · no alcanza el mínimo de 6/8" && p.categoria === "En proceso" && /por el requisito de la Parte 1/.test(p.res),
  `18/30 pero P1 5/8 con un solo intento → ${p.categoria}`);
await captura("cierre-ver-p1.png");
await clic("#btnSiguienteVista");
p = await panel();
verificar(/hay 2 registros con este curso y estudiante; no se usa ninguno/.test(p.par) && /provisoria/.test(p.res), "Siguiente: emparejamiento ambiguo, provisoria");

const decision = await evaluar('localStorage.getItem("aula-evaluacion-cierre-v1")');
verificar(decision === JSON.stringify({ estudiantes: { "curso x\testudiante 01": { modo: "procesado", partes: [true, false, true, true] } } }), `sólo se guardó la decisión → ${decision}`);
verificar(await evaluar('localStorage.getItem("aula-evaluacion-a-v1")') === A, "A intacto");

await ir(urlB);
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
p = await panel();
verificar(p.partes[1].endsWith("☐") && p.resultado === "20/22 · 90,9 %", "tras recargar, la decisión se recupera");

const bAntes = await evaluar('localStorage.getItem("aula-evaluacion-b-v1")');
await ir(urlA);
verificar(await evaluar("document.title") === "Corrección y análisis · Evaluación A", "herramienta A en el mismo origen");
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
p = await panel();
verificar(p.partes[1].endsWith("☐") && p.resultado === "20/22 · 90,9 %" && /^Evaluación B: «estudiante {2}01»/.test(p.par),
  `la A muestra el mismo cierre → ${p.resultado} · ${p.par.slice(0, 40)}`);

// Modo manual (desde la A, para la misma persona): sin cálculo, categoría y texto del docente.
await clic('#cierre input[name="modoCierre"][value="manual"]');
p = await panel();
verificar(p.resultado === null && p.categoria === null && p.partes.length === 4, "Manual: evidencia visible, sin categoría automática");
await evaluar('(() => { const s = document.getElementById("cierreManualCategoria"); s.value = "Suficiente"; s.dispatchEvent(new Event("change", { bubbles: true })); })()');
await clic("#cierreManualTexto");
await cdp("Input.insertText", { text: "Devolución sintética de prueba." });
await espera(100);
await ir(urlA);
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
const manual = await evaluar('({ modo: document.querySelector("#cierre input[name=modoCierre]:checked").value, cat: document.getElementById("cierreManualCategoria").value, texto: document.getElementById("cierreManualTexto").value, linea: document.querySelector("#tabla tbody .cierre-fila").textContent })');
verificar(manual.modo === "manual" && manual.cat === "Suficiente" && manual.texto === "Devolución sintética de prueba." && manual.linea === "Cierre: Suficiente · manual",
  `Manual se recupera tras recargar → ${JSON.stringify(manual)}`);
await captura("cierre-ver-manual.png");
await clic('#cierre input[name="modoCierre"][value="procesado"]');
p = await panel();
verificar(p.resultado === "20/22 · 90,9 %" && p.categoria === "Suficiente", "vuelta a Procesado: la selección y el cálculo vuelven");
verificar(await evaluar('localStorage.getItem("aula-evaluacion-b-v1")') === bAntes, "B intacto desde la A");
verificar(await evaluar('localStorage.getItem("aula-evaluacion-a-v1")') === A, "A intacto (sólo lectura y decisiones de cierre)");

for (const ancho of [480]) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: ancho, height: 1000, deviceScaleFactor: 1, mobile: false });
  await espera(300);
  const ok = await evaluar(`(() => { const de = document.documentElement; const c = document.getElementById("cierre").getBoundingClientRect(); const col = document.querySelector(".col-grilla").getBoundingClientRect();
    return de.scrollWidth <= de.clientWidth && c.right <= col.right + 1; })()`);
  verificar(ok, `${ancho}px: el panel de cierre cabe sin desborde`);
  await captura(`cierre-ver-${ancho}.png`);
}

// Devolución: capa objetiva (partes y contenidos) y orientación según la categoría.
// RAM: 0 de 7 en A+B (fuerte); Estado: 3 errores de 9 (merece atención).
await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
const errar = (x, items) => (f) => { for (const n of items) f.respuestas[n - 1] = BUENAS[x][n - 1] === "A" ? "B" : "A"; return f; };
const A3 = almacen([errar("A", [7, 13, 22, 14, 17])(fila("A", "Estudiante 09", [8, 8, 8, 6]))]);
const B3 = almacen([errar("B", [7, 13, 22, 28, 18])(fila("B", "Estudiante 09", [8, 8, 8, 6]))]);
await evaluar(`localStorage.clear(); localStorage.setItem("aula-evaluacion-a-v1", ${JSON.stringify(A3)}); localStorage.setItem("aula-evaluacion-b-v1", ${JSON.stringify(B3)})`);
await ir(urlB);
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
const objetiva = () => evaluar(`({
  rapida: document.getElementById("cierreResumenPartes").textContent,
  partes: [...document.querySelectorAll("#cierre .cierre-partes tbody tr")].map((tr) => tr.querySelector("th").textContent + ": " + [...tr.querySelectorAll("td")].slice(0, 3).map((td) => td.textContent).join(" | ")),
  contenidos: [...document.querySelectorAll("#cierre .cierre-tabla-contenidos tbody tr")].map((tr) => [...tr.children].map((x) => x.textContent).join(" | ")),
  abiertos: document.querySelector("#cierre details.cierre-contenidos").open,
  resumen: document.getElementById("cierreResumenContenidos").textContent,
  orientacion: [...document.querySelectorAll("#cierreOrientacion .orienta")].map((e) => e.textContent),
})`);
let ob = await objetiva();
p = await panel();
verificar(ob.rapida === "Reconocer 87,5 % · Relacionar 87,5 % · Interpretar 75 % · Usar lo que sabés 100 %", `lectura rápida por partes → ${ob.rapida}`);
verificar(ob.partes[0] === "P1 · Reconocer: 7/8 (87,5 %) | 7/8 (87,5 %) | 7/8 (87,5 %) · A = B", `parte con porcentajes → ${ob.partes[0]}`);
verificar(!ob.abiertos && ob.resumen === "RAM y almacenamiento: dificultad fuerte · Estado: merece atención", `contenidos plegados, con resumen → ${ob.resumen}`);
await clic("#cierre details.cierre-contenidos summary");
ob = await objetiva();
verificar(ob.abiertos && ob.contenidos.includes("RAM y almacenamiento | 0/3 | 0/4 | 0/7 (0 %) | dificultad fuerte") &&
  ob.contenidos.includes("Estado | 2/4 | 4/5 | 6/9 (66,7 %) | merece atención"), `contenidos A+B al abrir → ${ob.contenidos[4]} / ${ob.contenidos[5]}`);
verificar(p.categoria === "Avanzado" && ob.orientacion.join(" ") === "Reforzar: RAM y almacenamiento.", `Procesado Avanzado: sólo lo fuerte, a reforzar → ${ob.orientacion.join(" ")}`);
await captura("cierre-contenidos-procesado.png");
const procesada = ob;
await clic('#cierre input[name="modoCierre"][value="manual"]');
const elegirCategoria = (cat) => evaluar(`(() => { const s = document.getElementById("cierreManualCategoria"); s.value = ${JSON.stringify(cat)}; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
ob = await objetiva();
verificar(ob.orientacion.join(" ") === "Aspectos a revisar: RAM y almacenamiento; estado." && JSON.stringify(ob.contenidos) === JSON.stringify(procesada.contenidos),
  `Manual sin categoría: misma evidencia, orientación neutral → ${ob.orientacion.join(" ")}`);
await elegirCategoria("En proceso");
ob = await objetiva();
verificar(ob.abiertos && JSON.stringify([ob.rapida, ob.partes.map((x) => x.split(" | ").slice(0, 3).join(" | ")), ob.contenidos]) ===
  JSON.stringify([procesada.rapida, procesada.partes, procesada.contenidos]), "Manual: los mismos datos objetivos (y contenidos sigue abierto)");
verificar(ob.orientacion.join(" ") === "Volver a estudiar: RAM y almacenamiento. Repasar: estado.", `Manual En proceso: otra orientación con la misma evidencia → ${ob.orientacion.join(" ")}`);
await evaluar('(() => { const s = document.getElementById("cierreManualCategoria"); s.value = "Suficiente"; s.dispatchEvent(new Event("change", { bubbles: true })); })()');
ob = await objetiva();
verificar(ob.orientacion.join(" ") === "Repasar: RAM y almacenamiento. Consolidar: estado.", `Manual Suficiente → ${ob.orientacion.join(" ")}`);
// La devolución de este intento: plegada debajo del cierre y rotulada como sólo de la B.
const intento = () => evaluar(`(() => { const d = document.getElementById("detalleIntento"); const b = document.getElementById("devolucionBreve");
  return { abierto: d.open, despues: !!(document.getElementById("cierre").compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING),
    resumen: d.querySelector("summary").textContent, breveVisible: b.checkVisibility(), breve: b.textContent }; })()`);
let di = await intento();
verificar(!di.abierto && di.despues && !di.breveVisible && /sólo la Evaluación B · no es la devolución de cierre/.test(di.resumen), `devolución del intento plegada debajo del cierre → «${di.resumen}»`);
await captura("cierre-contenidos-manual.png");
await clic("#detalleIntento summary");
di = await intento();
verificar(di.abierto && di.breveVisible && di.breve === "Volver a estudiar: RAM y almacenamiento.", `abierta con clic: la de la B sola → ${di.breve}`);
await captura("cierre-intento-abierto.png");
await elegirCategoria("");
ob = await objetiva();
verificar(ob.orientacion.join(" ") === "Aspectos a revisar: RAM y almacenamiento; estado." && (await intento()).abierto, "sin categoría otra vez: neutral (y el detalle sigue abierto)");
await elegirCategoria("Suficiente");
const decisiones = await evaluar('localStorage.getItem("aula-evaluacion-cierre-v1")');
verificar(decisiones === JSON.stringify({ estudiantes: { "curso x\testudiante 09": { modo: "manual", categoria: "Suficiente" } } }), `sin datos derivados guardados → ${decisiones}`);
await clic('#cierre input[name="modoCierre"][value="procesado"]');
ob = await objetiva();
verificar(JSON.stringify(ob.contenidos) === JSON.stringify(procesada.contenidos) && ob.orientacion.join(" ") === "Reforzar: RAM y almacenamiento.", "vuelta a Procesado: mismos datos y orientación de Avanzado");

// Consolidación manual: nombres distintos en A y B; elegir, Vincular, recargar, Desvincular.
await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
const A2 = almacen([fila("A", "Pérez, Juan", [4, 8, 8, 6]), fila("A", "Estudiante 02", [6, 6, 6, 4])]);
const B2 = almacen([fila("B", "Juan Pérez", [5, 2, 3, 2]), fila("B", "Estudiante 02", [7, 7, 7, 5])]);
await evaluar(`localStorage.clear(); localStorage.setItem("aula-evaluacion-a-v1", ${JSON.stringify(A2)}); localStorage.setItem("aula-evaluacion-b-v1", ${JSON.stringify(B2)})`);
await ir(urlB);
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
p = await panel();
const opciones = await evaluar('[...document.getElementById("cierreCandidato").options].slice(1).map((o) => o.textContent)');
verificar(/^No se encontró Evaluación A correspondiente/.test(p.par) && opciones.join("|") === "Pérez, Juan", `sin pareja: candidatos del mismo curso → ${opciones.join(", ")}`);
await clic("#cierreCandidato");
await evaluar('(() => { const s = document.getElementById("cierreCandidato"); s.value = s.options[1].value; s.dispatchEvent(new Event("change", { bubbles: true })); })()');
await clic("#btnVincular");
p = await panel();
verificar(/vinculado manualmente con «Pérez, Juan»/.test(p.par) && p.resultado === "27/30 · 90 %" && p.categoria === "Avanzado" &&
  p.p1 === "Parte 1 · Reconocer: 9/16 (A 4/8 + B 5/8) · mínimo de 9/16 alcanzado", `Vincular consolida: ${p.resultado} · ${p.categoria}`);
await captura("cierre-vinculo.png");
verificar(await evaluar('localStorage.getItem("aula-evaluacion-a-v1")') === A2 && await evaluar('localStorage.getItem("aula-evaluacion-cierre-v1")') ===
  JSON.stringify({ estudiantes: {}, vinculos: [{ A: "curso x\tperez, juan", B: "curso x\tjuan perez" }] }), "sólo se guardó el vínculo A ↔ B; A intacto");
await ir(urlB);
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
p = await panel();
verificar(/vinculado manualmente con «Pérez, Juan»/.test(p.par) && p.resultado === "27/30 · 90 %", "tras recargar, el vínculo sigue");
const b2Antes = await evaluar('localStorage.getItem("aula-evaluacion-b-v1")');
await ir(urlA);
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
p = await panel();
verificar(/^Evaluación B: vinculado manualmente con «Juan Pérez»/.test(p.par) && p.resultado === "27/30 · 90 %", "el mismo vínculo desde la A");
await clic("#btnDesvincular");
p = await panel();
verificar(/^No se encontró Evaluación B correspondiente/.test(p.par) && p.resultado === "26/30 · 86,7 %" && p.categoria === "En proceso", `Desvincular: vuelve a sin pareja → ${p.resultado} · ${p.categoria}`);
verificar(await evaluar('localStorage.getItem("aula-evaluacion-cierre-v1")') === JSON.stringify({ estudiantes: {} }) &&
  await evaluar('localStorage.getItem("aula-evaluacion-b-v1")') === b2Antes && await evaluar('localStorage.getItem("aula-evaluacion-a-v1")') === A2, "Desvincular borra sólo el vínculo");

// Devoluciones para imprimir en Oficio, con la clave compacta de A y B.
await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
const largo = "Devolución sintética del docente: trabajó con constancia y mejoró entre los dos intentos.\nConviene que vuelva a mirar los ejemplos de la clase antes del próximo trabajo.";
const A4 = almacen([
  errar("A", [7, 13, 22, 14, 17])(fila("A", "Estudiante 11", [8, 8, 8, 6])), fila("A", "Estudiante 12", [5, 5, 5, 4]),
  fila("A", "Estudiante 13", [8, 8, 7, 6]), fila("A", "Estudiante 14", [3, 3, 3, 2]), fila("A", "Estudiante 15", [6, 6, 6, 4]),
]);
const B4 = almacen([
  errar("B", [7, 13, 22, 28, 18])(fila("B", "Estudiante 11", [8, 8, 8, 6])), fila("B", "Estudiante 12", [6, 6, 4, 3]),
  fila("B", "Estudiante 14", [4, 3, 2, 2]), fila("B", "Estudiante 16", [6, 5, 4, 4]),
]);
const C4 = JSON.stringify({ estudiantes: {
  "curso x\testudiante 12": { modo: "manual", categoria: "Suficiente", devolucion: largo },
  "curso x\testudiante 15": { modo: "manual", categoria: "Avanzado", devolucion: largo + "\n" + largo },
} });
await evaluar(`localStorage.clear(); localStorage.setItem("aula-evaluacion-a-v1", ${JSON.stringify(A4)}); localStorage.setItem("aula-evaluacion-b-v1", ${JSON.stringify(B4)}); localStorage.setItem("aula-evaluacion-cierre-v1", ${JSON.stringify(C4)})`);
await ir(urlB);
await clic("#btnImpresion");
const nBloques = await evaluar('document.querySelectorAll("#impresionBloques article.final").length');
verificar(nBloques === 6, `vista de impresión: ${nBloques} devoluciones (A, B, sólo A y sólo B)`);
const claveA = await evaluar('document.querySelector(".clave-linea[data-evaluacion=A]").textContent.replace(/\\s+/g, " ").trim()');
verificar(claveA.startsWith("A P1 1B 2A 3C 4B 5C 6A 7B 8C P2 9D") && /18B\/D/.test(claveA), `línea A → ${claveA}`);
await captura("cierre-impresion-pantalla.png");
// Medio impreso con el ancho útil de Oficio (216 − 2 × 12 mm = 192 mm ≈ 726 px).
await cdp("Emulation.setEmulatedMedia", { media: "print" });
await cdp("Emulation.setDeviceMetricsOverride", { width: 726, height: 1255, deviceScaleFactor: 1, mobile: false });
await espera(300);
const medida = await evaluar(`(() => {
  const pagina = 332 * 96 / 25.4;
  const bloques = [...document.querySelectorAll("#impresionBloques article.final")];
  return {
    oculto: getComputedStyle(document.querySelector(".pagina")).display,
    altos: bloques.map((b) => Math.round(b.getBoundingClientRect().height)),
    pagina: Math.round(pagina),
    // Cada línea de clave en una sola línea: todos sus ítems a la misma altura.
    lineas: [...document.querySelectorAll(".clave-linea")].map((l) => new Set([...l.querySelectorAll(".clave-item")].map((i) => Math.round(i.getBoundingClientRect().top))).size),
    desborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    fuente: getComputedStyle(document.querySelector(".final")).fontSize,
    fuenteClave: getComputedStyle(document.querySelector(".clave-item")).fontSize,
  };
})()`);
verificar(medida.oculto === "none" && !medida.desborde, "al imprimir: sólo las devoluciones, sin desborde");
verificar(medida.altos.every((h) => h < medida.pagina * 0.5), `cada devolución entra holgada en media página Oficio (${medida.altos.join(", ")} px de ${medida.pagina})`);
verificar(medida.lineas.every((n) => n === 1), `cada línea de clave en un solo renglón → ${medida.lineas.join(", ")}`);
console.log(`     tipografía: devolución ${medida.fuente}, clave ${medida.fuenteClave}`);
await captura("cierre-impresion-oficio.png");
// La clave de un bloque, ampliada, para revisar la legibilidad.
const rc = await evaluar('(() => { const b = document.querySelector("article.final").getBoundingClientRect(); return { x: b.x, y: b.y + window.scrollY, width: b.width, height: b.height }; })()');
const zoom = await cdp("Page.captureScreenshot", { clip: { ...rc, scale: 2 }, captureBeyondViewport: true });
writeFileSync(join(salida, "cierre-impresion-bloque.png"), Buffer.from(zoom.data, "base64"));
const pdf = await cdp("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
const bytes = Buffer.from(pdf.data, "base64");
writeFileSync(join(salida, "cierre-impresion-oficio.pdf"), bytes);
const paginas = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
verificar(paginas >= 2 && paginas <= 3, `PDF Oficio: ${paginas} páginas para 6 devoluciones (2 o 3 por hoja)`);
await cdp("Emulation.setEmulatedMedia", { media: "" });

// Datos anonimizados para análisis: un curso y todos, desde la UI, con descarga real.
const descargas = join(salida, "descargas-anonimizado");
mkdirSync(descargas, { recursive: true });
for (const f of readdirSync(descargas)) if (f.startsWith("cierre-anonimizado-")) unlinkSync(join(descargas, f));
await cdp("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: descargas });
const NOMBRES = ["Zoila Ficticia", "Quintín Inventado", "Ramón Prueba", "Wanda Ejemplo", "Texto secreto 4417"];
const A5 = almacen([fila("A", "Zoila Ficticia", [7, 6, 6, 5]), fila("A", "Quintín Inventado", [5, 5, 5, 4]), { ...fila("A", "Wanda Ejemplo", [6, 6, 6, 4]), curso: "Curso Y" }]);
const B5 = almacen([fila("B", "Zoila Ficticia", [6, 7, 5, 4]), fila("B", "Ramón Prueba", [5, 5, 4, 4])]);
const C5 = JSON.stringify({ estudiantes: { "curso x\tquintin inventado": { modo: "manual", categoria: "Suficiente", devolucion: "Texto secreto 4417" } } });
await evaluar(`localStorage.clear(); localStorage.setItem("aula-evaluacion-a-v1", ${JSON.stringify(A5)}); localStorage.setItem("aula-evaluacion-b-v1", ${JSON.stringify(B5)}); localStorage.setItem("aula-evaluacion-cierre-v1", ${JSON.stringify(C5)})`);
await ir(urlB);
const almacenes = () => evaluar('JSON.stringify(["aula-evaluacion-a-v1", "aula-evaluacion-b-v1", "aula-evaluacion-cierre-v1"].map((k) => localStorage.getItem(k)))');
const antesExport = await almacenes();
await clic("#btnImpresion");
const aviso = await evaluar('document.querySelector(".impresion-export").textContent.replace(/\\s+/g, " ").trim()');
verificar(/No incluye nombres, respuestas individuales ni devoluciones escritas/.test(aviso), "aclaración visible antes de exportar");
const bajar = async (curso) => {
  await evaluar(`(() => { const s = document.getElementById("impresionCurso"); s.value = ${JSON.stringify(curso)}; s.dispatchEvent(new Event("change")); })()`);
  const previos = new Set(readdirSync(descargas));
  await clic("#btnExportarAnonimo");
  for (let i = 0; i < 40; i++) {
    const nuevos = readdirSync(descargas).filter((f) => !previos.has(f) && f.endsWith(".json"));
    if (nuevos.length) return { nombre: nuevos[0], texto: readFileSync(join(descargas, nuevos[0]), "utf8") };
    await espera(100);
  }
  return { nombre: null, texto: "{}" };
};
const ex1 = await bajar("curso x");
const d1 = JSON.parse(ex1.texto);
verificar(/^cierre-anonimizado-curso-x-\d{4}-\d{2}-\d{2}\.json$/.test(ex1.nombre ?? "") && d1.alcance.seleccion === "un curso" && d1.alcance.cursos.join() === "Curso X" &&
  d1.estudiantes.length === 3, `export de un curso → ${ex1.nombre}: ${d1.estudiantes?.length} estudiantes`);
const ex2 = await bajar("");
const d2 = JSON.parse(ex2.texto);
verificar(/^cierre-anonimizado-todos-los-cursos-/.test(ex2.nombre ?? "") && d2.alcance.cursos.join() === "Curso X,Curso Y" && d2.estudiantes.length === 4 &&
  d2.estudiantes.filter((e) => e.cierre.modo === "manual").length === 1, `export de todos → ${ex2.nombre}: ${d2.estudiantes.length} estudiantes`);
const sinAcentos = (t) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
verificar(NOMBRES.every((n) => !sinAcentos(ex1.texto + ex2.texto).includes(sinAcentos(n))), "ningún nombre ni texto privado sintético en los archivos");
verificar(d2.estudiantes.every((e) => /^Curso [XY] · \d{2}$/.test(e.id)), `ids anónimos → ${d2.estudiantes.map((e) => e.id).join(", ")}`);
verificar((await almacenes()) === antesExport, "A, B y decisiones idénticos antes y después de exportar");

await evaluar("localStorage.clear()");
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nsin fallas");
ws.close();
process.exit(fallas.length ? 1 : 0);
