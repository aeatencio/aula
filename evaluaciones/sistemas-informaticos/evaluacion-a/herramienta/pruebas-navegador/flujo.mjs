// Flujo completo en Chrome real (headless, Windows) con teclas nativas vía
// DevTools y datos ficticios. Se ejecuta con correr.sh: node.exe de Windows
// contra Chrome en 127.0.0.1:9333. Argumento: carpeta de salida (ruta Windows).
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const salida = process.argv[2];
const destinoDescargas = join(salida, "descargas");
const lista = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const pagina = lista.find((p) => p.type === "page");
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let idMsg = 0;
const dialogos = [];
const pendientes = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m);
    pendientes.delete(m.id);
  }
  if (m.method === "Page.javascriptDialogOpening") {
    dialogos.push(m.params.type);
    const id = ++idMsg;
    ws.send(JSON.stringify({ id, method: "Page.handleJavaScriptDialog", params: { accept: true } }));
  }
});
const cdp = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++idMsg;
    const reloj = setTimeout(() => rej(new Error(`${method}: sin respuesta`)), 8000);
    pendientes.set(id, (m) => { clearTimeout(reloj); m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluar = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const ESPECIALES = {
  Enter: [13, "Enter", "\r"], Backspace: [8, "Backspace"], Delete: [46, "Delete"], Escape: [27, "Escape"],
  ArrowLeft: [37, "ArrowLeft"], ArrowUp: [38, "ArrowUp"], ArrowRight: [39, "ArrowRight"], ArrowDown: [40, "ArrowDown"],
  Home: [36, "Home"], End: [35, "End"], Tab: [9, "Tab"],
};
async function tecla(nombre) {
  let p;
  if (ESPECIALES[nombre]) {
    const [vk, code, text] = ESPECIALES[nombre];
    p = { key: nombre, code, windowsVirtualKeyCode: vk, text };
  } else {
    const c = nombre;
    const sym = { "?": [191, "Slash", 8], "+": [107, "NumpadAdd", 0], "-": [189, "Minus", 0], " ": [32, "Space", 0] }[c];
    if (sym) p = { key: c, code: sym[1], windowsVirtualKeyCode: sym[0], modifiers: sym[2], text: c };
    else if (/[0-9]/.test(c)) p = { key: c, code: `Digit${c}`, windowsVirtualKeyCode: c.charCodeAt(0), text: c };
    else p = { key: c, code: `Key${c.toUpperCase()}`, windowsVirtualKeyCode: c.toUpperCase().charCodeAt(0), text: c, modifiers: c === c.toUpperCase() ? 8 : 0 };
  }
  await cdp("Input.dispatchKeyEvent", { type: p.text ? "keyDown" : "rawKeyDown", ...p });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", ...p, text: undefined });
}
const escribir = async (seq) => { for (const m of seq.matchAll(/\{(\w+)\}|./gsu)) await tecla(m[1] ?? m[0]); };
const texto = (t) => cdp("Input.insertText", { text: t });
const foco = () => evaluar("document.activeElement.id");
const estado = () => evaluar(`({
  titular: document.getElementById("titular").textContent,
  mensaje: document.getElementById("mensaje").textContent,
  valores: [...document.querySelectorAll("#grilla .celda .val")].slice(0, 30).map((e) => e.textContent).join(" "),
  filas: document.querySelectorAll("#tabla tbody tr").length,
  vista: document.getElementById("vista").textContent,
  export: document.getElementById("estadoExport").textContent,
  resultados: [...document.querySelectorAll("#tabla tbody tr")].map((tr) => [...tr.querySelectorAll(".res")].map((r) => r.textContent).join(" | ")),
})`);
const clic = async (selector) => {
  const r = await evaluar(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await cdp("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
};
const captura = async (nombre) => {
  const { data } = await cdp("Page.captureScreenshot", { captureBeyondViewport: true });
  writeFileSync(join(salida, nombre), Buffer.from(data, "base64"));
};
const fallas = [];
const verificar = (cond, que) => { console.log(`${cond ? "ok  " : "FALLA"} ${que}`); if (!cond) fallas.push(que); };

await cdp("Page.enable");
await cdp("Runtime.enable");
await evaluar("localStorage.clear()");
await cdp("Page.reload");
await espera(800);
await evaluar("window.confirm = () => true");

verificar((await foco()) === "estudiante", "al abrir, el foco está en Estudiante");
await escribir("{Tab}");
// Shift+Tab no hace falta: se escribe el curso yendo al campo con clic simulado por foco.
await evaluar('document.getElementById("curso").focus()');
await texto("3.º B");
await escribir("{Enter}");
verificar((await foco()) === "estudiante", "Enter en Curso pasa a Estudiante");
await texto("Ficticia Uno");
await escribir("{Enter}");
verificar((await foco()) === "zona", "Enter en Estudiante pasa a la grilla");
await captura("captura-1-inicio.png");
await escribir("b a c b c a b c d b a d b c a c b d a a c b c d c b d a b a");
let e = await estado();
verificar(e.titular === "Completa", `30 respuestas simples con espacios → ${e.titular}`);
await escribir("{Enter}");
e = await estado();
verificar(e.filas === 1 && (await foco()) === "estudiante", "Enter guarda y vuelve a Estudiante");

await texto("María José Ficticia-O'Prueba");
await escribir("{Enter}");
await escribir("BAD");
e = await estado();
verificar(e.titular === "Ítem 3" && /sólo tiene opciones A–C/.test(e.mensaje), "D en el ítem 3 pide confirmación");
await escribir("{Escape}CC?--CDB{ArrowLeft}?{ArrowRight}AABCACBB+D{Enter}AACCC-DBCAB");
await captura("captura-2-carga.png");
await escribir("A{Backspace}B");
e = await estado();
verificar(e.valores === "B A C C ? – – C D B? A A B C A C B B+D A A C C C – D B C A B B", `valores cargados → ${e.valores}`);
// Recarga accidental en medio de la carga.
await cdp("Page.reload");
await espera(800);
await evaluar("window.confirm = () => true");
e = await estado();
verificar(dialogos.includes("beforeunload"), "recargar con una fila sin exportar muestra el aviso de salida");
verificar(e.valores.endsWith("A B B") && e.titular === "Completa" && (await foco()) === "zona", "la evaluación en curso sobrevive a la recarga");
await escribir("12D{Enter}");
e = await estado();
verificar(e.filas === 2, "cambio del 12 durante la carga y guardado");

// Descarga del TSV.
await cdp("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: destinoDescargas });
await evaluar('document.getElementById("btnDescargar").click()');
await espera(1200);
e = await estado();
verificar(/sin cambios/.test(e.export), `exportación registrada → ${e.export}`);
writeFileSync(join(salida, "vista-esperada.tsv"), e.vista);
verificar(e.resultados[0] === "8/8 · 100 %resp. 8/8 | 8/8 · 100 %resp. 8/8 | 8/8 · 100 %resp. 8/8 | 6/6 · 100 %resp. 6/6", `resultados fila 1 → ${e.resultados[0]}`);
verificar(e.resultados[1] === "4/8 · 50 %resp. 6/8 · 1 a revisar | 7/8 · 88 %resp. 8/8 · 1 a revisar | 6/8 · 75 %resp. 7/8 | 3/6 · 50 %resp. 6/6", `resultados fila 2 → ${e.resultados[1]}`);
// Editar la fila 1 con clic real en «Editar» y cambiar el 30.
await clic('#tabla tbody tr:nth-child(1) button[data-accion="editar"]');
verificar((await foco()) === "zona" && (await evaluar('document.getElementById("edicion").textContent')).includes("editando la transcripción de la fila 1"), "«Editar» abre la fila 1 en la grilla");
await escribir("30B{Enter}");
e = await estado();
verificar(e.filas === 2 && e.resultados[0].endsWith("5/6 · 83 %resp. 6/6"), `tras editar el 30, la parte 4 se recalcula → ${e.resultados[0]}`);
verificar(/cambios sin exportar/.test(e.export), "la edición deja cambios sin exportar");
// Corrección roja en las filas guardadas.
// Corrección (la clave) en incorrectas y blancos; ✓ en las que coinciden con la clave.
const corrFilas = await evaluar(`[...document.querySelectorAll("#tabla tbody tr")].map((tr) =>
  Object.fromEntries([...tr.querySelectorAll("td.resp .v")].flatMap((v, i) => { const c = v.querySelector(".corr"); return c && c.textContent !== "✓" ? [[i + 1, c.textContent]] : []; })))`);
const tildesFilas = await evaluar(`[...document.querySelectorAll("#tabla tbody tr")].map((tr) =>
  [...tr.querySelectorAll("td.resp .v")].flatMap((v, i) => (v.querySelector(".corr")?.textContent === "✓" ? [i + 1] : [])))`);
verificar(JSON.stringify(tildesFilas[0]) === JSON.stringify(Array.from({ length: 29 }, (_, i) => i + 1)), `fila 1: ✓ en las 29 correctas`);
verificar(JSON.stringify(tildesFilas[1]) === JSON.stringify([1, 2, 3, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 26, 28, 29]),
  `fila 2: ✓ en las correctas (incluido B+D en el 18), no en ?, B? ni blancos → ${JSON.stringify(tildesFilas[1])}`);
verificar(JSON.stringify(corrFilas[0]) === JSON.stringify({ 30: "A" }), `fila 1: corrección sólo en el 30 → ${JSON.stringify(corrFilas[0])}`);
verificar(JSON.stringify(corrFilas[1]) === JSON.stringify({ 4: "B", 6: "A", 7: "B", 22: "B", 24: "D", 25: "C", 27: "D", 30: "A" }),
  `fila 2: incorrectas y blancos corregidos; ? y B? sin corrección → ${JSON.stringify(corrFilas[1])}`);
const anchos = await evaluar(`[...document.querySelectorAll("#tabla tbody tr")].map((tr) => [...tr.querySelectorAll(".grupo")].map((g) => Math.round(g.getBoundingClientRect().width * 10) / 10))`);
verificar(anchos[0].every((w, i) => Math.abs(w - anchos[1][i]) < 0.6), `grupos de igual ancho con y sin correcciones → ${JSON.stringify(anchos)}`);
const ancho = await evaluar("[document.documentElement.scrollWidth, document.documentElement.clientWidth]");
verificar(ancho[0] <= ancho[1], `sin desborde horizontal de la página → ${ancho}`);

// Durante la carga: editar la fila 2 y dejar el 18 incorrecto.
await clic('#tabla tbody tr:nth-child(2) button[data-accion="editar"]');
await escribir("18A");
const geo = await evaluar(`(() => {
  const cs = [...document.querySelectorAll("#grilla .celda")];
  const out = [];
  cs.slice(0, 30).forEach((c, i) => {
    const k = c.querySelector(".corr");
    if (!k.textContent) return;
    const rc = c.getBoundingClientRect(), rk = k.getBoundingClientRect(), sig = cs[i + 1] && cs[i + 1].parentElement === c.parentElement ? cs[i + 1].getBoundingClientRect() : null;
    out.push({ item: i + 1, texto: k.textContent, afuera: rk.left >= rc.right, libre: sig ? rk.right <= sig.left - 5 : true, color: getComputedStyle(k).color });
  });
  return out;
})()`);
verificar(geo.find((g) => g.item === 18)?.texto === "B/D", "en la grilla, 18 = A muestra B/D");
verificar(geo.every((g) => g.afuera && g.libre), `correcciones fuera del casillero y sin pisar el siguiente → ${geo.map((g) => g.item + ":" + g.texto + (g.afuera && g.libre ? "" : "!")).join(" ")}`);
verificar(geo.every((g) => g.color === "rgb(192, 38, 45)"), "correcciones en rojo");
const crudaGrilla = await evaluar('[...document.querySelectorAll("#grilla .celda .val")].slice(0, 30).map((e) => e.textContent).join(" ")');
verificar(crudaGrilla === "B A C C ? – – C D B? A D B C A C B A A A C C C – D B C A B B", `en el casillero, la respuesta cargada → ${crudaGrilla}`);
await evaluar("window.scrollTo(0, 0)");
await captura("captura-4-correccion-carga.png");
await escribir("{Escape}");
await evaluar('document.getElementById("btnDescartar").click()');
await captura("captura-5-correccion-filas.png");
await captura("captura-3-guardadas.png");
// Clic real en la celda 18 con el foco fuera de la grilla.
await evaluar('document.getElementById("estudiante").focus()');
const r = await evaluar('(() => { const b = document.querySelectorAll("#grilla .celda")[17].getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()');
for (const type of ["mousePressed", "mouseReleased"]) await cdp("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
e = await estado();
verificar(e.titular === "Ítem 18" && (await foco()) === "zona", `clic en una celda con el teclado fuera de la grilla → ${e.titular}`);
await evaluar('document.getElementById("btnDescartar").click()');

// ---- Varias marcas de forma natural, con teclas nativas ----
const celdaV = (n) => evaluar(`document.querySelectorAll("#grilla .celda .val")[${n - 1}].textContent`);
// «+» de la tecla principal en distribución latinoamericana (sin Shift).
const masPrincipal = async () => {
  const p = { key: "+", code: "BracketRight", windowsVirtualKeyCode: 187, text: "+" };
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", ...p });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", ...p, text: undefined });
};
await evaluar('document.getElementById("estudiante").focus()');
await texto("Ficticia Múltiple");
await escribir("{Enter}");
await escribir("B");
verificar((await celdaV(1)) === "B" && (await estado()).titular === "Ítem 2", "simple: una tecla carga y avanza");
await escribir("B+");
verificar((await estado()).titular === "Ítem 2" && (await celdaV(2)) === "B+" && (await celdaV(3)) === "·", "B + vuelve al ítem 2 y no toca el 3");
await escribir("C");
verificar((await celdaV(3)) === "·", "durante la composición el 3 sigue intacto");
await escribir("{Enter}");
e = await estado();
verificar((await celdaV(2)) === "B+C" && e.titular === "Ítem 3", `B+C Enter → ${await celdaV(2)}, cursor en ${e.titular}`);
await escribir("17A B + D {Enter}");
verificar((await celdaV(18)) === "B+D" && (await celdaV(17)) === "A", "B + D Enter (con espacios) en el 18");
await escribir("B+C+D{Enter}");
e = await estado();
verificar((await celdaV(19)) === "B+C+D" && (await celdaV(20)) === "·" && e.titular === "Ítem 20", `B+C+D Enter en el 19; cursor en ${e.titular}`);
await escribir("A");
await masPrincipal();
await escribir("D{Enter}");
verificar((await celdaV(20)) === "A+D", "A + D con el + de la tecla principal");
await escribir("4C+D{Backspace}A{Enter}");
verificar((await celdaV(4)) === "A+C", "Retroceso quita la última letra de la composición");
await escribir("B+D{Escape}");
e = await estado();
verificar((await celdaV(5)) === "B" && e.titular === "Ítem 6", "Esc deja todo como antes del +");
await escribir("6A?");
verificar((await celdaV(7)) === "?", "? tras una letra sigue marcando ilegible el ítem actual");
await escribir("8C9D10B11A12D13B14C15A16C21C22B23C24D25C26B27D28A29B30A");
await escribir("3C{Enter}");
e = await estado();
verificar(e.filas === 3, "se guarda la evaluación con varias respuestas múltiples");
const filaTsv = () => e.vista.trimEnd().split("\n")[3].split("\t");
let f3 = filaTsv();
verificar(f3[4] === "B+C" && f3[6] === "A+C" && f3[20] === "B+D" && f3[21] === "B+C+D" && f3[22] === "A+D" && f3.length === 37 && f3.slice(33).join("") === "1111",
  `TSV con las múltiples exactas → ${f3.slice(3).join(" ")}`);
// Editar la fila guardada y componer sobre un ítem ya cargado.
await clic('#tabla tbody tr:nth-child(3) button[data-accion="editar"]');
await escribir("25B+");
await evaluar("window.scrollTo(0, 0)");
await captura("captura-6-componiendo.png");
await escribir("C{Enter}");
e = await estado();
verificar(e.titular === "Ítem 26" && (await celdaV(26)) === "B", "al editar, B + C Enter en el 25 no toca el 26");
await escribir("{Enter}");
e = await estado();
f3 = filaTsv();
verificar(e.filas === 3 && f3[27] === "B+C" && f3[28] === "B", `edición guardada en la misma fila → i25=${f3[27]} i26=${f3[28]}`);
// ---- Resultados en vivo (sexta iteración) ----
const vivoTxt = () => evaluar(`({
  texto: document.getElementById("vivo").textContent,
  partes: [...document.querySelectorAll("#grilla .parte-res")].map((e) => (e.querySelector("b") ?? e.querySelector(".faltan")).textContent),
  global: document.querySelector("#vivo .vp.global b")?.textContent ?? null,
  ejes: [...document.querySelectorAll("#vivo .ve b")].map((b) => b.textContent),
})`);
await evaluar('document.getElementById("estudiante").focus()');
await texto("Ficticio En Vivo");
await escribir("{Enter}BBCBCABC");
let vv = await vivoTxt();
verificar(vv.partes.join("|") === "7/8 · 88 %|sin cargar|sin cargar|sin cargar" && vv.global === null && vv.ejes.length === 0,
  `Parte 1 completa con 9–30 vacíos → ${vv.partes.join(" | ")}`);
await escribir("DBADBCA");
vv = await vivoTxt();
verificar(vv.partes[1] === "falta 1: 16", `Parte 2 con 15 cargados → ${vv.partes[1]}`);
await escribir("C");
vv = await vivoTxt();
verificar(vv.partes[1] === "8/8 · 100 %", "Parte 2 aparece al completar el 16");
await escribir("2A");
vv = await vivoTxt();
verificar(vv.partes[0] === "8/8 · 100 %", "modificar el 2 recalcula la Parte 1");
await escribir("5{Delete}");
vv = await vivoTxt();
verificar(vv.partes[0] === "falta 1: 5", "vaciar el 5 deja la Parte 1 incompleta");
await escribir("C");
vv = await vivoTxt();
verificar(vv.partes[0] === "8/8 · 100 %", "al volver a cargar el 5 reaparece");
await escribir("17B{ArrowLeft}?{ArrowRight}B+D{Enter}-?CBC");
await evaluar("window.scrollTo(0, 0)");
await captura("captura-7-partes-en-vivo.png");
await escribir("D");
vv = await vivoTxt();
verificar(vv.partes[2] === "5/8 · 63 %" && vv.global === null, `dudosa, múltiple, blanco e ilegible cuentan como cargados → ${vv.partes[2]}`);
// Restaurar la Parte 3 a la clave para las comprobaciones siguientes.
await escribir("17BB+D{Enter}AA");
vv = await vivoTxt();
verificar(vv.partes[2] === "8/8 · 100 %", "Parte 3 corregida se recalcula");
await escribir("25CBDAB");
vv = await vivoTxt();
verificar(vv.global === null && /con las 4 partes completas · falta 1: 30/.test(vv.texto) && vv.partes[3] === "falta 1: 30", "con 29 ítems: global y ejes ocultos");
await escribir("A");
vv = await vivoTxt();
verificar(vv.global === "30/30 · 100 %" && vv.partes.join("|") === "8/8 · 100 %|8/8 · 100 %|8/8 · 100 %|6/6 · 100 %", "al completar el 30 aparecen los resultados");
await escribir("30B");
vv = await vivoTxt();
verificar(vv.partes[3] === "5/6 · 83 %" && vv.global === "29/30 · 97 %" && vv.ejes[3] === "2/3", `editar el 30 cambia parte 4, global y CPU y memoria al instante → ${vv.partes[3]} | ${vv.global} | ${vv.ejes[3]}`);
await escribir("18B+C{Enter}");
vv = await vivoTxt();
verificar(vv.partes[2] === "7/8 · 88 %" && vv.ejes[5] === "3/4" && vv.global === "28/30 · 93 %", "B+C en el 18 (incorrecta) se descuenta en vivo");
await escribir("18B+D{Enter}");
vv = await vivoTxt();
verificar(vv.partes[2] === "8/8 · 100 %" && vv.ejes[5] === "4/4", "B+D en el 18 (correcta) suma en vivo");
await escribir("7{Delete}");
vv = await vivoTxt();
verificar(vv.global === null && /falta 1: 7/.test(vv.texto), "borrar el 7 vuelve a «incompleta»");
await escribir("B");
vv = await vivoTxt();
verificar(vv.global === "29/30 · 97 %", "al cargar de nuevo el 7, reaparecen al instante");
e = await estado();
const filasAntes = e.filas;
await escribir("{Enter}");
e = await estado();
const sint = await evaluar(`[...document.querySelectorAll("#tabla tbody tr:last-child .sintesis .s")].map((s) => s.textContent)`);
verificar(e.filas === filasAntes + 1 && sint[0] === "29/30 · 97 %" && sint[4] === "2/3", `fila guardada con global y ejes → ${sint.slice(0, 5).join(" | ")}`);
// ---- Partes contabilizadas (séptima iteración) ----
const casillaSel = (n) => `#grilla .parte[data-parte="${n}"] .cuenta input`;
await evaluar('document.getElementById("estudiante").focus()');
await texto("Ficticia Partes");
await escribir("{Enter}AACBCABCDBADBCAC");
vv = await vivoTxt();
verificar(vv.global === null, "Partes 1–2 cargadas con las 4 activas: sin global");
await clic(casillaSel(3));
await clic(casillaSel(4));
vv = await vivoTxt();
verificar(vv.global === "15/16 · 94 %" && (await foco()) === "zona", `clic en «Contabilizar» de 3 y 4: global sobre 16 y foco en la grilla → ${vv.global}`);
await escribir("B");
verificar((await celdaV(17)) === "B", "se sigue cargando con el teclado tras el clic");
await escribir("{Backspace}");
// Teclado: Tab hasta la casilla de la Parte 2 y Espacio la desmarca.
await evaluar('document.getElementById("zona").focus()');
await escribir("{Tab}{Tab}");
const enfocada = await evaluar('document.activeElement.closest(".parte")?.dataset.parte ?? document.activeElement.id');
await escribir(" ");
vv = await vivoTxt();
const c2 = await evaluar(`document.querySelector('${casillaSel(2)}').checked`);
verificar(enfocada === "2" && c2 === false && vv.global === "7/8 · 88 %", `Tab + Espacio sobre «Contabilizar» de la Parte 2 → foco en ${enfocada}, global ${vv.global}`);
await escribir(" ");
await evaluar('document.getElementById("zona").focus()');
await escribir("17BBAACBCD25CBDABB");
await clic(casillaSel(3));
await clic(casillaSel(4));
await clic(casillaSel(2));
vv = await vivoTxt();
verificar(vv.global === "20/22 · 91 %" && vv.partes[1] === "8/8 · 100 %", `Partes 1+3+4 → ${vv.global}; la Parte 2 conserva su resultado`);
await escribir("{Enter}");
e = await estado();
const ultima = e.vista.trimEnd().split("\n").at(-1).split("\t");
verificar(ultima.length === 37 && ultima.slice(33).join("") === "1011" && ultima[3] === "A", `TSV con la configuración explícita → ${ultima.slice(33).join("")}`);
// ---- Ver (sólo lectura) y Editar ----
await evaluar("window.__confirmaciones = 0; window.confirm = () => { window.__confirmaciones++; return true; }");
const filasAntesVer = (await estado()).filas;
const tsvAntesVer = (await estado()).vista;
const almacenAntesVer = await evaluar('localStorage.getItem("aula-evaluacion-a-v1")');
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
let barra = await evaluar('!document.getElementById("barraVer").hidden && document.getElementById("accionesCarga").hidden');
const valoresVer = (await estado()).valores;
await escribir("B-+C{Enter}12A{Backspace}");
await clic(casillaSel(2));
e = await estado();
verificar(barra && e.valores === valoresVer && e.vista === tsvAntesVer && (await evaluar('document.querySelector(\'' + casillaSel(2) + '\').disabled')),
  "Ver: sólo lectura (teclas, casillas y TSV sin cambios)");
await clic('#tabla tbody tr:nth-child(2) button[data-accion="ver"]');
await escribir("{Escape}");
barra = await evaluar('document.getElementById("barraVer").hidden');
const almacenTrasVer = await evaluar('localStorage.getItem("aula-evaluacion-a-v1")');
verificar(barra && almacenTrasVer === almacenAntesVer && (await evaluar("window.__confirmaciones")) === 0,
  "Ver → otra con Ver → Esc: sin confirmaciones y localStorage intacto");
await clic('#tabla tbody tr:nth-child(2) button[data-accion="ver"]');
await clic("#btnEditarVista");
const editando = await evaluar('document.getElementById("edicion").textContent');
verificar(/editando la transcripción de la fila 2/.test(editando) && (await evaluar("window.__confirmaciones")) === 0 && (await foco()) === "zona",
  `Ver → Editar abre la misma fila → ${editando.trim()}`);
await escribir("30C");
await clic('#tabla tbody tr:nth-child(1) button[data-accion="editar"]');
verificar((await evaluar("window.__confirmaciones")) === 1, "edición modificada: Editar otra pide confirmación");
await evaluar('document.getElementById("btnDescartar").click()');
verificar((await estado()).filas === filasAntesVer, "sin filas nuevas ni perdidas");
// ---- Importar TSV ----
const elegirArchivo = async (ruta) => {
  const { root } = await cdp("DOM.getDocument", { depth: 1 });
  const { nodeId } = await cdp("DOM.querySelector", { nodeId: root.nodeId, selector: "#archivoImport" });
  await cdp("DOM.setFileInputFiles", { nodeId, files: [ruta] });
  await espera(600);
};
const exportadoAntes = (await estado()).vista;
const filasExportadas = exportadoAntes.trimEnd().split("\n").length - 1;
const configs = exportadoAntes.trimEnd().split("\n").slice(1).map((l) => l.split("\t").slice(33).join(""));
writeFileSync(join(salida, "importar-ficticio.tsv"), exportadoAntes);
writeFileSync(join(salida, "importar-invalido.tsv"), exportadoAntes.replace(/\t1\t0\t1\t1\n/, "\t1\t0\t1\t7\n"));
await evaluar("window.__confirmaciones = 0; window.confirm = () => { window.__confirmaciones++; return true; }");
await evaluar('document.getElementById("btnVaciar").click()');
verificar((await estado()).filas === 0, "sesión vaciada antes de importar");
await elegirArchivo(join(salida, "importar-invalido.tsv"));
let aviso = await evaluar('document.getElementById("avisoImport").textContent');
verificar(/^No se importó nada\..*parte4_cuenta es «7»/.test(aviso) && (await estado()).filas === 0, `archivo inválido: no importa nada → ${aviso.slice(0, 90)}…`);
await elegirArchivo(join(salida, "importar-ficticio.tsv"));
e = await estado();
aviso = await evaluar('document.getElementById("avisoImport").textContent');
verificar(e.filas === filasExportadas && e.vista === exportadoAntes && /Importadas/.test(aviso) && /sin cambios/.test(e.export),
  `importa el TSV exportado (${filasExportadas} filas, partes ${configs.join(" ")}): TSV idéntico`);
const nConfig = configs.indexOf("1011") + 1;
await clic(`#tabla tbody tr:nth-child(${nConfig}) button[data-accion="ver"]`);
const cuentaVer = await evaluar('[1, 2, 3, 4].map((n) => { const c = document.querySelector(`#grilla .parte[data-parte="${n}"] .cuenta input`); return (c.checked ? "1" : "0") + (c.disabled ? "d" : ""); }).join(" ")');
verificar(cuentaVer === "1d 0d 1d 1d", `Ver sobre una fila importada con partes 1011 → ${cuentaVer}`);
await clic("#btnEditarVista");
verificar(/editando la transcripción de la fila/.test(await evaluar('document.getElementById("edicion").textContent')), "Editar sobre una fila importada");
await evaluar('document.getElementById("btnDescartar").click()');
await evaluar("window.__confirmaciones = 0");
await elegirArchivo(join(salida, "importar-ficticio.tsv"));
verificar((await evaluar("window.__confirmaciones")) === 1 && (await estado()).filas === filasExportadas, "con filas existentes, importar pide confirmación antes de reemplazar");
// ---- Devolución breve y extendida ----
const claveDev = "BACBCABCDBADBCACBBAACBCDCBDABA".split("");
for (const n of [8, 15, 23, 14, 17]) claveDev[n - 1] = claveDev[n - 1] === "A" ? "B" : "A";
await evaluar('document.getElementById("estudiante").focus()');
await texto("Ficticia Devolución");
await escribir(`{Enter}${claveDev.join("")}`);
const devTxt = () => evaluar('({ breve: document.getElementById("devolucionBreve")?.textContent, extendida: document.getElementById("devolucionExtendida")?.textContent })');
let dv = await devTxt();
verificar(dv.breve === "Volver a estudiar: sistema operativo. Repasar: estado." &&
  /^Conviene volver a estudiar sistema operativo, especialmente: cómo administra los recursos; el papel de los drivers\. También repasá estado/.test(dv.extendida),
  `devolución al cargar → ${dv.breve}`);
const almacenDev = await evaluar('localStorage.getItem("aula-evaluacion-a-v1")');
await clic("#btnCopiarBreve");
await espera(200);
const msgBreve = await evaluar('document.getElementById("mensaje").textContent');
await clic("#btnCopiarExtendida");
await espera(200);
const msgExt = await evaluar('document.getElementById("mensaje").textContent');
verificar(/Devolución breve copiada/.test(msgBreve) && /Devolución extendida copiada/.test(msgExt) &&
  (await evaluar('localStorage.getItem("aula-evaluacion-a-v1")')) === almacenDev, "Copiar breve y Copiar extendida no modifican la evaluación");
await evaluar('document.getElementById("zona").focus()');
await escribir("{Enter}");
const nDev = (await estado()).filas;
await clic(`#tabla tbody tr:nth-child(${nDev}) button[data-accion="ver"]`);
dv = await devTxt();
verificar(dv.breve === "Volver a estudiar: sistema operativo. Repasar: estado.", "la misma devolución en Ver");
verificar(!/Volver a estudiar|Conviene/.test((await estado()).vista), "la devolución no está en el TSV");
await evaluar('document.getElementById("btnCerrarVista").click()');
// ---- Esc en Ver: comando de la vista, esté donde esté el foco ----
const abiertaVer = () => evaluar('!document.getElementById("barraVer").hidden');
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
await evaluar('document.getElementById("btnEditarVista").focus()');
const avisoEnVer = await evaluar('getComputedStyle(document.getElementById("fuera")).display');
await escribir("{Escape}");
verificar(avisoEnVer === "none" && !(await abiertaVer()), `Ver con el foco en un botón: sin aviso de la grilla (${avisoEnVer}) y Esc vuelve a la carga`);
await clic('#tabla tbody tr:nth-child(2) button[data-accion="ver"]');
await evaluar("document.activeElement.blur()");
await escribir("{Escape}");
verificar(!(await abiertaVer()), "Ver sin foco: Esc vuelve a la carga");
await clic('#tabla tbody tr:nth-child(1) button[data-accion="ver"]');
await evaluar('document.getElementById("zona").focus()');
await escribir("{Escape}");
verificar(!(await abiertaVer()), "Ver con el foco en la grilla: Esc vuelve a la carga");

// ---- Guardar con partes que no se contabilizan sin cargar ----
const filasAntesParcial = (await estado()).filas;
await evaluar('document.getElementById("estudiante").focus()');
await texto("Ficticia Sin Partes 3 y 4");
await escribir("{Enter}");
await clic(casillaSel(3));
await clic(casillaSel(4));
await escribir("BACBCABCDBADBCAC{Enter}");
e = await estado();
const lineaParcial = e.vista.trimEnd().split("\n").at(-1).split("\t");
verificar(e.filas === filasAntesParcial + 1 && lineaParcial.slice(19, 33).every((c) => c === "") && lineaParcial.slice(33).join("") === "1100",
  "se guarda con las partes 3 y 4 sin cargar: campos vacíos en el TSV, no «-»");
const desborde = await evaluar("document.documentElement.scrollWidth <= document.documentElement.clientWidth");
verificar(desborde, "sin desborde horizontal tras las múltiples");

await evaluar("localStorage.clear()");
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nsin fallas");
ws.close();
process.exit(fallas.length ? 1 : 0);
