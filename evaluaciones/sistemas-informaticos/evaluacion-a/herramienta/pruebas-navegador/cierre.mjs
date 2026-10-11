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
// Sólo A (13, 15) y sólo B (16): una celda «Sin resultado» que abarca las cuatro partes, en su columna.
const unica = await evaluar(`[...document.querySelectorAll("#impresionBloques td.sin-resultado")].map((td) => {
  const b = td.closest("article"), filas = [...b.querySelectorAll("tbody tr")];
  const alto = filas.at(-1).getBoundingClientRect().bottom - filas[0].getBoundingClientRect().top;
  const col = b.querySelectorAll("thead th")[td.cellIndex].textContent;
  return b.querySelector(".final-nombre").textContent + ":" + col + ":" + (Math.abs(td.getBoundingClientRect().height - alto) < 2 ? "abarca" : "no abarca");
}).join(" ")`);
verificar(unica === "Estudiante 13:Evaluación B:abarca Estudiante 15:Evaluación B:abarca Estudiante 16:Evaluación A:abarca", `«Sin resultado» en papel → ${unica}`);
// Para A+B: el mejor resultado de cada parte (12: A 19 y B 19 por separado; 21 con las mejores partes).
const ab12 = await evaluar(`(() => { const b = [...document.querySelectorAll("#impresionBloques article.final")].find((x) => x.querySelector(".final-nombre").textContent === "Estudiante 12");
  return [...b.querySelectorAll("thead th")].map((th) => th.textContent).join(" | ") + " / " + [...b.querySelectorAll("tbody tr, tfoot tr")].map((tr) => tr.lastElementChild.textContent).join(" | ") +
    " / " + [...b.querySelector("tfoot tr").children].map((c) => c.textContent).join(" | ") + " / " + b.querySelector(".final-conjunto").textContent; })()`);
verificar(ab12 === "Parte | Evaluación A | Evaluación B | Para A+B / 6 de 8 | 6 de 8 | 5 de 8 | 4 de 6 | 21 de 30 (70 %) / Total | 19 de 30 (63,3 %) | 19 de 30 (63,3 %) | 21 de 30 (70 %) / " +
  "Para valorar las Evaluaciones A y B, en cada parte se conserva tu mejor resultado entre las dos. Así obtuviste 21 de 30 (70 %).", `Para A+B en papel → ${ab12}`);
await captura("cierre-impresion-oficio-una-sola.png");
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
for (const f of readdirSync(descargas)) if (f.startsWith("cierre-anonimizado-") || f.startsWith("cierre-completo-")) unlinkSync(join(descargas, f));
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
// Cierre completo (privado): ZIP con nombres, respuestas y decisiones.
const aviso2 = await evaluar('document.querySelector(".impresion-privado").textContent.replace(/\\s+/g, " ").trim()');
verificar(/Privado: incluye nombres, respuestas y decisiones docentes/.test(aviso2), "advertencia de privacidad junto al export completo");
await evaluar('(() => { const s = document.getElementById("impresionCurso"); s.value = ""; s.dispatchEvent(new Event("change")); })()');
const previosZip = new Set(readdirSync(descargas));
await clic("#btnExportarCompleto");
let zipNombre = null;
for (let i = 0; i < 100 && !zipNombre; i++) { zipNombre = readdirSync(descargas).find((f) => !previosZip.has(f) && f.endsWith(".zip")) ?? null; await espera(100); }
const zipBytes = zipNombre ? readFileSync(join(descargas, zipNombre)) : Buffer.alloc(0);
const leerEntradas = (b) => {
  const fin = b.length - 22; const n = b.readUInt16LE(fin + 10); let p = b.readUInt32LE(fin + 16); const out = {};
  for (let i = 0; i < n; i++) { const l = b.readUInt16LE(p + 28), tam = b.readUInt32LE(p + 20), off = b.readUInt32LE(p + 42);
    const nombre = b.subarray(p + 46, p + 46 + l).toString("utf8"); const ini = off + 30 + b.readUInt16LE(off + 26); out[nombre] = b.subarray(ini, ini + tam).toString("utf8"); p += 46 + l; }
  return out;
};
const zipArch = zipNombre ? leerEntradas(zipBytes) : {};
const zipJson = zipArch["cierre-completo.json"] ? JSON.parse(zipArch["cierre-completo.json"]) : {};
verificar(/^cierre-completo-todos-los-cursos-\d{4}-\d{2}-\d{2}\.zip$/.test(zipNombre ?? "") &&
  Object.keys(zipArch).join(",") === "LEEME.txt,cierre-completo.json,resumen.tsv,evaluacion-a.tsv,evaluacion-b.tsv,devoluciones.html",
  `cierre completo descargado → ${zipNombre}: ${Object.keys(zipArch).join(", ")}`);
verificar(zipJson.estudiantes?.length === 4 && zipJson.fuentes?.A.registros.some((f) => f.estudiante === "Zoila Ficticia" && f.respuestas.length === 30) &&
  zipArch["resumen.tsv"].includes("Zoila Ficticia") && zipArch["devoluciones.html"].includes("Calificación del Tercer Bimestre"), "el privado sí tiene nombres, respuestas crudas y devoluciones");
verificar((await almacenes()) === antesExport, "A, B y decisiones idénticos tras el cierre completo");

// Pantalla «Cierre A+B»: lista austera, revisión, P1, Confirmar → siguiente, Manual.
await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
const urlCierre = /^https?:/.test(urlA) ? urlA.replace(/evaluacion-a\/.*$/, "cierre-evaluaciones/") : `${urlA.split("#")[0]}#cierre`;
const A6 = almacen([fila("A", "Estudiante 21", [6, 6, 6, 4]), fila("A", "Estudiante 22", [7, 7, 7, 5]), fila("A", "Estudiante 23", [5, 8, 8, 5]),
  fila("A", "Estudiante 24", [6, 5, 5, 4])]);
const B6 = almacen([fila("B", "Estudiante 21", [6, 6, 6, 4]), fila("B", "Estudiante 22", [7, 7, 7, 5]), fila("B", "Estudiante 23", [3, 7, 7, 5]),
  fila("B", "Estudiante 25", [6, 6, 4, 4])]);
await evaluar(`localStorage.clear(); localStorage.setItem("aula-evaluacion-a-v1", ${JSON.stringify(A6)}); localStorage.setItem("aula-evaluacion-b-v1", ${JSON.stringify(B6)}); localStorage.setItem("aula-evaluacion-cierre-v1", ${JSON.stringify(JSON.stringify({ estudiantes: { "curso x\testudiante 22": { modo: "procesado", partes: [true, true, true, true] } } }))})`);
await ir(urlCierre);
const lista6 = () => evaluar(`[...document.querySelectorAll(".cc-lista tbody tr")].map((tr) => [...tr.children].slice(1, 6).map((td) => td.textContent).join(" | "))`);
let l6 = await lista6();
verificar(await evaluar("document.title") === "Cierre A+B · Sistemas Informáticos" && await evaluar('document.querySelector("main.pagina").hidden'), `pantalla Cierre A+B en ${urlCierre}`);
verificar(l6.join(" / ") === "Estudiante 21 | ✓ | ✓ | Suficiente | Lista / Estudiante 22 | ✓ | ✓ | Avanzado | Lista / " +
  "Estudiante 23 | ✓ | ✓ | En proceso | Lista / Estudiante 24 | ✓ | — | Suficiente | ListaSólo A / Estudiante 25 | — | ✓ | Suficiente | ListaSólo B",
  `curso recién abierto: la sugerida ya es la categoría → ${l6.join(" / ")}`);
await captura("cierre-ab-lista.png");
const nums = await evaluar('[...document.querySelectorAll(".cc-lista tbody td.num-lista")].map((td) => td.textContent).join(" ")');
verificar(nums === "01 02 03 04 05", `N.º de lista en el curso → ${nums}`);
// Imprimir el curso entero sin entrar a ningún estudiante.
const papelDe = () => evaluar(`(() => { const bs = [...document.querySelectorAll("#impresionBloques article.final")];
  return { cats: bs.map((b) => b.querySelector(".final-nombre").textContent + ":" + b.querySelector(".final-cat b").textContent).join(" "),
    limpio: bs.every((b) => /^Calificación del Tercer Bimestre: /.test(b.querySelector(".final-cat").textContent) && !/sugerid|automátic|sin confirmar|≠|Cuenta|Categoría del período|Resultado considerado|merece atención|dificultad fuerte|te fue mejor|Necesitás|Te conviene|consolidar|reforzar|Seguí así|afianzar/i.test(b.textContent) &&
      /^Para corregir tus evaluaciones, compará tus respuestas con esta clave/.test(b.querySelector(".clave-tit")?.textContent ?? "")),
    encuadre: bs.every((b) => b.querySelector(".final-encuadre")?.textContent === "Las Evaluaciones A y B son una evidencia importante, pero la calificación del tercer bimestre considera también tus otros trabajos, las actividades de aprendizaje en el aula y la valoración conceptual del período."),
    nota: bs.find((b) => b.querySelector(".final-nombre").textContent === "Estudiante 23")?.querySelector(".final-texto")?.textContent ?? null }; })()`);
await clic("#ccImprimir");
let papel = await papelDe();
verificar(await evaluar('[...document.querySelectorAll("#impresionBloques .final-num")].map((e) => e.textContent).join(" ")') === "01 02 03 04 05", "el mismo N.º en el papel");
const total21 = await evaluar('[...document.querySelector("#impresionBloques article.final tfoot tr").children].map((c) => c.textContent).join(" | ")');
verificar(total21 === "Total | 22 de 30 (73,3 %) | 22 de 30 (73,3 %) | 22 de 30 (73,3 %)", `fila Total en el papel → ${total21}`);
const temas21 = await evaluar('[...document.querySelectorAll("#impresionBloques article.final:first-child :is(h3, .final-contenidos > p, .final-revisar li)")].map((e) => e.textContent).join(" / ")');
verificar(/^Tus resultados en las Evaluaciones A y B \/ Para revisar — preguntas que tuviste mal en cada evaluación, por tema \/ .*Sistema operativo — A [\d, ]+ · B [\d, ]+ \/ .*Cómo seguir: buscá esas preguntas/.test(temas21), `temas del papel → ${temas21}`);
verificar(papel.cats === "Estudiante 21:Suficiente Estudiante 22:Avanzado Estudiante 23:En proceso Estudiante 24:Suficiente Estudiante 25:Suficiente" && papel.limpio && papel.encuadre,
  `impresión sin confirmar nada → ${papel.cats}`);
verificar(await evaluar('localStorage.getItem("aula-evaluacion-cierre-v1")') === JSON.stringify({ estudiantes: { "curso x\testudiante 22": { modo: "procesado", partes: [true, true, true, true] } } }),
  "abrir, recorrer e imprimir no guardan ninguna decisión");
await clic("#btnCerrarImpresion");
// Excepciones: el docente cambia la categoría donde corresponde.
await clic('.cc-lista tbody tr:nth-child(3) [data-revisar]');
const rev = () => evaluar(`({ quien: document.getElementById("ccQuien")?.textContent, sug: document.getElementById("ccSugerida")?.textContent,
  res: document.getElementById("ccResultado")?.textContent, p1: document.getElementById("ccP1")?.textContent,
  efectiva: document.querySelector('[data-cc-final][aria-pressed="true"]')?.dataset.ccFinal ?? null,
  volver: !!document.getElementById("ccVolverSugerencia"),
  nota: { abierta: document.getElementById("ccNotaDetalle")?.open, guia: document.getElementById("ccNota")?.placeholder ?? "", texto: document.getElementById("ccNota")?.value },
  plegado: [...document.querySelectorAll(".cc-pliegues > details")].every((d) => !d.open && !d.querySelector("table, .cierre-contenidos, p")?.checkVisibility()) })`);
let r6 = await rev();
verificar(r6.quien === "Estudiante 23" && r6.sug === "En proceso" && r6.efectiva === "En proceso" && /Resultado integrado: 26\/30/.test(r6.res) &&
  /8\/16 \(A 5\/8 \+ B 3\/8\) · no alcanza el mínimo de 9\/16/.test(r6.p1 ?? "") && r6.plegado && !r6.volver, "sugerida En proceso por P1 (26/30), marcada como efectiva, sin confirmar nada");
await captura("cierre-ab-revision.png");
await clic('[data-cc-final="Suficiente"]');
r6 = await rev();
verificar(r6.efectiva === "Suficiente" && r6.volver && r6.nota.abierta && /^¿En qué otras evidencias del período/.test(r6.nota.guia) && r6.nota.texto === "",
  "override EP→S: guardado, con «Volver a la sugerencia» y la nota abierta con guía y vacía");
await clic("#ccNota");
await cdp("Input.insertText", { text: "Nota sintética 8812 para la devolución." });
await espera(100);
await captura("cierre-ab-decision.png");
await clic("#ccSiguiente");
await clic('[data-cc-final="Avanzado"]');
r6 = await rev();
verificar(r6.quien === "Estudiante 24" && r6.efectiva === "Avanzado", "override S→A");
await clic("#ccVolver");
await clic('.cc-lista tbody tr:nth-child(1) [data-revisar]');
await clic('[data-cc-final="En proceso"]');
await clic("#ccVolverSugerencia");
r6 = await rev();
verificar(r6.quien === "Estudiante 21" && r6.efectiva === "Suficiente" && !r6.volver, "«Volver a la sugerencia» quita el override");
await clic("#ccVolver");
l6 = await lista6();
const marcas = await evaluar(`[...document.querySelectorAll(".cc-lista tbody tr")].map((tr) => tr.querySelector(".cc-difiere") ? "≠" : "=").join("")`);
verificar(l6.map((x) => x.split(" | ")[3]).join(",") === "Suficiente,Avanzado,Suficiente,Avanzado,Suficiente" && marcas === "==≠≠=", `categorías y marcas «≠ sugerida» → ${marcas}`);
const dec6 = JSON.parse(await evaluar('localStorage.getItem("aula-evaluacion-cierre-v1")')).estudiantes;
verificar(JSON.stringify(Object.keys(dec6).sort()) === JSON.stringify(["curso x\testudiante 22", "curso x\testudiante 23", "curso x\testudiante 24"]) &&
  dec6["curso x\testudiante 23"].categoria === "Suficiente" && dec6["curso x\testudiante 23"].devolucion === "Nota sintética 8812 para la devolución." &&
  dec6["curso x\testudiante 24"].categoria === "Avanzado", `sólo se guardan los overrides y la nota → ${Object.keys(dec6).length} registros`);
verificar(await evaluar('localStorage.getItem("aula-evaluacion-a-v1")') === A6 && await evaluar('localStorage.getItem("aula-evaluacion-b-v1")') === B6, "A y B intactos");
await clic("#ccImprimir");
papel = await papelDe();
verificar(papel.cats === "Estudiante 21:Suficiente Estudiante 22:Avanzado Estudiante 23:Suficiente Estudiante 24:Avanzado Estudiante 25:Suficiente" && papel.limpio &&
  papel.nota === "Nota sintética 8812 para la devolución.", `impresión con overrides y nota → ${papel.cats}`);
const ex6 = await bajar("");
verificar(!ex6.texto.includes("8812") && !/≠|sugerid/i.test(ex6.texto), "ni la nota ni la marca en el export");
await captura("cierre-ab-lista-final.png");
// Un cambio de categoría no oculta evidencia pendiente; el papel la dice.
const A7 = almacen([fila("A", "Estudiante 27", [7, 6, 5, 5]), fila("A", "Estudiante 28", [8, 8, 7, 6])]);
const B7 = almacen([{ ...fila("B", "Estudiante 27", [7, 6, 5, 5]), respuestas: fila("B", "Estudiante 27", [7, 6, 5, 5]).respuestas.map((v, i) => (i === 7 ? "?" : v)) },
  fila("B", "Estudiante 28", [7, 8, 8, 6])]);
await evaluar(`localStorage.clear(); localStorage.setItem("aula-evaluacion-a-v1", ${JSON.stringify(A7)}); localStorage.setItem("aula-evaluacion-b-v1", ${JSON.stringify(B7)})`);
// Misma URL: recargar de verdad (con «#cierre», navegar no recarga).
await cdp("Page.reload");
await espera(900);
await clic('.cc-lista tbody tr:nth-child(1) [data-revisar]');
await clic('[data-cc-final="Avanzado"]');
await clic("#ccSiguiente");
await clic('[data-cc-final="En proceso"]');
await clic("#ccVolver");
l6 = await lista6();
verificar(l6.join(" / ") === "Estudiante 27 | ✓ | ✓ | Avanzado | Provisorio≠ sugerida / Estudiante 28 | ✓ | ✓ | En proceso | Lista≠ sugerida",
  `el cambio no oculta lo pendiente → ${l6.join(" / ")}`);
await clic("#ccImprimir");
const p7 = await evaluar(`[...document.querySelectorAll("#impresionBloques article.final")].map((b) => ({ cat: b.querySelector(".final-cat").textContent,
  pendiente: b.querySelector(".final-pendiente")?.textContent ?? "", conjunto: b.querySelector(".final-conjunto")?.textContent ?? "",
  revisar: [...b.querySelectorAll(".final-revisar li")].length, heuristica: /te fue mejor|Necesitás|Te conviene|Seguí así|dificultades marcadas|sugerid/i.test(b.textContent) }))`);
verificar(p7[0].cat === "Calificación del Tercer Bimestre: Avanzado" && /todavía se están revisando/.test(p7[0].pendiente) && /Así obtuviste, por ahora, /.test(p7[0].conjunto) &&
  p7[1].cat === "Calificación del Tercer Bimestre: En proceso" && p7[1].revisar > 0 && !p7.some((x) => x.heuristica),
  "papel: categoría del docente, lo pendiente dicho, las mismas preguntas para revisar y sin interpretación");


await evaluar("localStorage.clear()");
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nsin fallas");
ws.close();
process.exit(fallas.length ? 1 : 0);
