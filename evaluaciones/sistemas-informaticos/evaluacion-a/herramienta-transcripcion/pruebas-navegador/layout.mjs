// Comprobaciones de layout en Chrome real a varios anchos, con datos ficticios.
// Se ejecuta con correr.sh (node.exe de Windows contra Chrome en 127.0.0.1:9333):
//   ./correr.sh layout.mjs [sufijo-capturas] [anchos separados por coma]
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const salida = process.argv[2];
const sufijo = process.argv[3] || "layout";
const anchos = (process.argv[4] || "1650,1100,820,700,600,480").split(",").map(Number);
const lista = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const ws = new WebSocket(lista.find((p) => p.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let idMsg = 0;
const pendientes = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); }
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

// Estado ficticio: seis filas con casos variados y una evaluación en curso.
const base = "BACBCABC DBADBCAC BBAACBCD CBDABA".replace(/ /g, "").split("");
const fila = (id, estudiante, cambios) => {
  const r = [...base];
  for (const [n, v] of Object.entries(cambios)) r[n - 1] = v;
  return { id, curso: "3.º B", estudiante, respuestas: r };
};
const filas = [
  fila(1, "Ficticia Uno", {}),
  fila(2, "María José Ficticia-O'Prueba de la Prueba", { 4: "C", 6: "-", 7: "-", 1: "B+D", 5: "?", 10: "B?", 18: "A+C", 22: "C", 25: "D", 30: "B" }),
  { ...fila(3, "Ficticio Tres", { 18: "B+D", 17: "A+B", 12: "A", 3: "D" }), cuentan: [true, true, false, false] },
  fila(4, "Ficticia Cuatro", { 18: "B+D?", 24: "-", 26: "A", 27: "C" }),
  fila(5, "Ficticio Cinco", { 18: "-", 9: "A", 10: "C", 11: "D", 13: "C" }),
  fila(6, "Ficticia Seis", { 18: "B+C", 2: "B", 8: "A", 19: "B+C+D" }),
];
// Evaluación en curso completa (con correcciones y una dudosa) para ver los resultados en vivo.
const borrador = fila(0, "", { 4: "C", 6: "-", 18: "A", 10: "B?", 1: "B+D", 30: "B" }).respuestas;
const almacen = JSON.stringify({
  s: { curso: "3.º B", estudiante: "Ficticio en curso", respuestas: borrador, cuentan: [true, true, true, false], cursor: 22, editando: null },
  filas, proximoId: 7, exportado: "",
});

await cdp("Page.enable");
await evaluar(`localStorage.setItem("aula-transcripcion-si-a-v1", ${JSON.stringify(almacen)})`);
const fallas = [];
const verificar = (cond, que) => { console.log(`${cond ? "ok  " : "FALLA"} ${que}`); if (!cond) fallas.push(que); };

for (const ancho of anchos) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: ancho, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.reload");
  await espera(700);
  await evaluar('document.getElementById("zona").focus()');
  const m = await evaluar(`(() => {
    const de = document.documentElement;
    const vw = de.clientWidth;
    const fuera = [...document.querySelectorAll("body *")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width && r.right > vw + 0.5 && !e.closest("pre");
    }).map((e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : e.className ? "." + String(e.className).split(" ")[0] : "")).slice(0, 6);
    const zona = document.getElementById("zona").getBoundingClientRect();
    const cs = [...document.querySelectorAll("#grilla .celda")];
    const choques = [];
    cs.forEach((c, i) => {
      const k = c.querySelector(".corr");
      if (!k || !k.textContent) return;
      const rc = c.getBoundingClientRect(), rk = k.getBoundingClientRect();
      const rs = cs[i + 1] && cs[i + 1].parentElement === c.parentElement ? cs[i + 1].getBoundingClientRect() : null;
      const sig = rs && Math.abs(rs.top - rc.top) < 1 ? rs : null; // sólo si está en la misma línea
      if (rk.left < rc.right || (sig && rk.right > sig.left - 5) || rk.right > zona.right) choques.push(\`\${i + 1}:\${k.textContent} \${Math.round(rk.width)}px en hueco \${sig ? Math.round(sig.left - rc.right) : "-"}\`);
    });
    const tabla = document.getElementById("tabla").getBoundingClientRect();
    const seccion = document.getElementById("tabla").parentElement.getBoundingClientRect();
    const sec = [...document.querySelectorAll("section")].map((s) => Math.round(s.getBoundingClientRect().width));
    const celda = cs[0].getBoundingClientRect();
    return {
      scroll: [de.scrollWidth, vw], fuera, choques, alto: de.scrollHeight,
      tabla: [Math.round(tabla.width), Math.round(seccion.width)], secciones: sec,
      celda: Math.round(celda.width), grilla: [Math.round(document.getElementById("grilla").getBoundingClientRect().width), Math.round(zona.width)],
    };
  })()`);
  console.log(`\n— ${ancho}px: alto ${m.alto}, secciones ${m.secciones}, grilla ${m.grilla} (celda ${m.celda}), tabla ${m.tabla}`);
  verificar(m.scroll[0] <= m.scroll[1], `${ancho}: sin desborde horizontal de página (${m.scroll})`);
  verificar(!m.fuera.length, `${ancho}: ningún elemento sale del viewport ${m.fuera.join(" ")}`);
  verificar(!m.choques.length, `${ancho}: correcciones de la grilla sin choques ${m.choques}`);
  verificar(m.tabla[0] <= m.tabla[1] + 0.5, `${ancho}: la tabla cabe en su sección (${m.tabla})`);
  const c = await evaluar(`(() => {
    const vw = document.documentElement.clientWidth;
    const r = (sel) => document.querySelector(sel).getBoundingClientRect();
    const tarjetas = getComputedStyle(document.querySelector("#tabla tr")).display === "grid";
    const cab = [...document.querySelectorAll("#cabResp .v")].map((e) => e.getBoundingClientRect().left);
    const filas = [...document.querySelectorAll("#tabla tbody tr")].map((tr) => [...tr.querySelectorAll("td.resp .v")].map((e) => e.getBoundingClientRect().left));
    const cabS = [...document.querySelectorAll("#cabResp .sintesis .s")].map((e) => e.getBoundingClientRect().left);
    const filasS = [...document.querySelectorAll("#tabla tbody tr")].map((tr) => [...tr.querySelectorAll(".sintesis .s")].map((e) => e.getBoundingClientRect().left));
    const sintesisMal = filasS.flatMap((f) => f.map((x, i) => Math.abs(x - (tarjetas ? filasS[0][i] : cabS[i])) > 1 ? i : null)).filter((x) => x !== null);
    const vivo = r("#vivo"), colG = r(".col-grilla");
    const vivoVisible = vivo.height > 0 && vivo.top < r("#zona").bottom + 200;
    const desalineados = tarjetas
      ? filas.flatMap((f) => f.map((x, i) => Math.abs(x - filas[0][i]) > 1 ? i + 1 : null)).filter(Boolean)
      : filas.flatMap((f) => f.map((x, i) => Math.abs(x - cab[i]) > 1 ? i + 1 : null)).filter(Boolean);
    const zona = r("#zona"), ayuda = r(".ayuda"), seccion = r("section.carga");
    const derecha = Math.max(...[...document.querySelectorAll("section")].map((s) => s.getBoundingClientRect().right));
    const solapes = [...document.querySelectorAll("#tabla tbody td.resp .v")].filter((v) => v.scrollWidth > v.clientWidth + 1).map((v) => v.title + "=" + v.textContent + " " + v.scrollWidth + "/" + v.clientWidth);
    const salen = [".datos", ".col-grilla", ".ayuda", "section.guardadas", "#vivo"].flatMap((sel) => {
      const caja = r(sel);
      return [...document.querySelectorAll(sel + " *")].filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width && !e.closest("pre") && (b.right > caja.right + 0.5 || b.left < caja.left - 0.5);
      }).map((e) => sel + " " + e.tagName.toLowerCase() + (e.id ? "#" + e.id : ""));
    });
    // Resultado de cada parte: dentro de su banda, sin pisar casilleros ni
    // correcciones; posición relativa a los casilleros.
    const bandas = [...document.querySelectorAll("#grilla .parte")].map((b) => {
      const rb = b.getBoundingClientRect(), rr = b.querySelector(".parte-res").getBoundingClientRect();
      const piezas = [...b.querySelectorAll(".celda, .celda .corr")].map((e) => e.getBoundingClientRect()).filter((x) => x.width);
      const pisa = piezas.some((x) => x.left < rr.right && x.right > rr.left && x.top < rr.bottom && x.bottom > rr.top);
      const cel = b.querySelector(".celdas").getBoundingClientRect();
      const dentro = rr.left >= rb.left - 0.5 && rr.right <= rb.right + 0.5 && rr.top >= rb.top - 0.5 && rr.bottom <= rb.bottom + 0.5;
      const pos = rr.left >= cel.right - 1 ? "derecha" : rr.bottom <= cel.top + 1 ? "arriba" : rr.right <= cel.left + 1 ? "izquierda" : "?";
      return { dentro, pisa, pos, texto: b.querySelector(".parte-res").textContent };
    });
    return { bandas, sintesisMal: [...new Set(sintesisMal)], vivoVisible, nS: cabS.length, salen: [...new Set(salen)].slice(0, 6), tarjetas, desalineados: [...new Set(desalineados)], aLado: ayuda.left >= zona.right && ayuda.top < zona.bottom,
      uso: Math.round((derecha / vw) * 100), altoCarga: Math.round(seccion.height), solapes, nCab: cab.length };
  })()`);
  console.log(`   tabla en ${c.tarjetas ? "tarjetas" : "columnas"}, uso horizontal ${c.uso} %, alto de «en curso» ${c.altoCarga}px`);
  verificar(!c.sintesisMal.length && c.nS === 9, `${ancho}: global y ejes alineados ${c.tarjetas ? "entre tarjetas" : "con la cabecera"} ${c.sintesisMal}`);
  verificar(c.bandas.every((b) => b.dentro && !b.pisa && b.pos !== "?"), `${ancho}: resultado de cada parte dentro de su banda, sin pisar casilleros (${c.bandas.map((b) => b.pos).join(", ")})`);
  if (ancho >= 1100) verificar(c.bandas.every((b) => b.pos === "derecha"), `${ancho}: resultado a la derecha de cada banda`);
  verificar(c.vivoVisible, `${ancho}: resultados en vivo justo debajo de la grilla`);
  verificar(!c.salen.length, `${ancho}: nada sobresale de su columna ${c.salen.join(" ")}`);
  verificar(!c.desalineados.length, `${ancho}: respuestas alineadas ${c.tarjetas ? "entre tarjetas" : "con los números de la cabecera"} ${c.desalineados}`);
  verificar(!c.solapes.length, `${ancho}: ninguna respuesta + corrección excede su columna ${c.solapes}`);
  if (ancho >= 1480) {
    verificar(c.aLado, `${ancho}: la ayuda va al costado de la grilla`);
    verificar(c.uso >= 95, `${ancho}: el contenido usa el ancho disponible (${c.uso} %)`);
  }
  if (ancho <= 760) verificar(c.tarjetas, `${ancho}: la tabla pasa a tarjetas`);
  const { data } = await cdp("Page.captureScreenshot", { captureBeyondViewport: true });
  writeFileSync(join(salida, `${sufijo}-${ancho}.png`), Buffer.from(data, "base64"));
  // Modo Ver (sólo lectura) en el mismo ancho.
  await evaluar('document.querySelector("#tabla tbody tr:nth-child(2) button[data-accion=\\"ver\\"]").click()');
  const mv = await evaluar(`(() => {
    const de = document.documentElement, datos = document.querySelector(".datos").getBoundingClientRect();
    const sale = [...document.querySelectorAll(".datos *")].some((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > datos.right + 0.5 || b.left < datos.left - 0.5); });
    return { ok: de.scrollWidth <= de.clientWidth, sale, barra: !document.getElementById("barraVer").hidden };
  })()`);
  verificar(mv.ok && !mv.sale && mv.barra, `${ancho}: modo Ver sin desborde y con la barra dentro de su columna`);
  const cv = await cdp("Page.captureScreenshot", { captureBeyondViewport: true });
  writeFileSync(join(salida, `${sufijo}-${ancho}-ver.png`), Buffer.from(cv.data, "base64"));
  await evaluar('document.getElementById("btnCerrarVista").click()');
}
await evaluar("localStorage.clear()");
await cdp("Emulation.clearDeviceMetricsOverride");
console.log(fallas.length ? `\n${fallas.length} fallas` : "\nsin fallas");
ws.close();
process.exit(fallas.length ? 1 : 0);
