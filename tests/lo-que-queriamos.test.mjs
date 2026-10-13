import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { recorridos } from "../src/data/recorridos.ts";
import { serieLoQueQueriamos } from "../src/data/serie-lo-que-queriamos.ts";
import { iniciarActividadLoQueQueriamos } from "../src/scripts/actividad-lo-que-queriamos.ts";
import { iniciarNavegacionRecorrido } from "../src/scripts/navegacion-recorrido.ts";
import {
  ORIGINAL,
  compras,
  diagnosticar,
  ejecutar as ejecutarProbar,
  iniciarProbarYAjustar,
  mover,
  querido,
} from "../src/scripts/probar-y-ajustar.ts";
import {
  instrucciones,
  letras,
  preguntas,
  traza,
} from "../src/data/actividad-lo-que-queriamos.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

function readDist(...parts) {
  const path = join(dist, ...parts);
  assert.ok(existsSync(path), `Falta ${path}. Ejecutá npm run build.`);
  return readFileSync(path, "utf8");
}

function textoVisible(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replace(/[\s ]+/g, " ");
}

const normalizar = (texto) => texto.replace(/[\s ]+/g, " ").trim();

const pesos = (n) => `$${n.toLocaleString("es-AR")}`;

/**
 * Ejecuta el programa de la tienda en el orden indicado (números de
 * instrucción) y devuelve lo que muestra la pantalla.
 */
function ejecutar(orden, precio, envio, descuentoFijo) {
  let total = 0;
  let mostrado;
  for (const n of orden) {
    if (n === 1) total = precio;
    if (n === 2) total += envio;
    if (n === 3) total = descuentoFijo ? total - descuentoFijo : total * 0.9;
    if (n === 4) mostrado = total;
  }
  return mostrado;
}

const porId = (id) => preguntas.find((pregunta) => pregunta.id === id);

describe("Lo que queríamos y lo que pasó", () => {
  it("tiene entre 4 y 6 preguntas con cuatro opciones y una clave completa", () => {
    assert.ok(preguntas.length >= 4 && preguntas.length <= 6);
    for (const pregunta of preguntas) {
      assert.deepEqual(Object.keys(pregunta.opciones), [...letras], pregunta.id);
      assert.ok(letras.includes(pregunta.respuesta), pregunta.id);
      assert.deepEqual(
        Object.keys(pregunta.siEligieron).sort(),
        letras.filter((letra) => letra !== pregunta.respuesta),
        `${pregunta.id}: cada opción incorrecta tiene su devolución`,
      );
      assert.ok(pregunta.porque.length > 0, pregunta.id);
    }
    const respuestas = new Set(preguntas.map((pregunta) => pregunta.respuesta));
    assert.ok(respuestas.size >= 3, "las respuestas correctas no se concentran en una letra");
  });

  it("la clave coincide con lo que hace el programa", () => {
    assert.equal(instrucciones.length, 4);
    assert.equal(pesos(ejecutar([1, 2, 3, 4], 10000, 2000)), "$10.800");
    assert.equal(traza.at(-1), "$10.800");
    assert.deepEqual(traza, ["$10.000", "$12.000", "$10.800", "$10.800"]);

    // Pregunta 2: el programa sin ajustar con las zapatillas.
    const zapatillas = porId("zapatillas");
    assert.equal(
      zapatillas.opciones[zapatillas.respuesta],
      pesos(ejecutar([1, 2, 3, 4], 30000, 2000)),
    );
    // El distractor de la intención es lo que la dueña quería cobrar.
    assert.equal(zapatillas.opciones.C, pesos(ejecutar([1, 3, 2, 4], 30000, 2000)));

    // Pregunta 3: sólo el intercambio sirve con la campera y con las zapatillas.
    const ajuste = porId("ajuste");
    assert.equal(ajuste.respuesta, "C");
    for (const precio of [10000, 30000]) {
      const querido = (precio * 9) / 10 + 2000;
      assert.equal(ejecutar([1, 3, 2, 4], precio, 2000), querido);
      assert.notEqual(ejecutar([1, 3, 4, 2], precio, 2000), querido, "B");
      assert.notEqual(ejecutar([1, 3, 4], precio, 2000), querido, "D");
    }
    assert.equal(ejecutar([1, 2, 3, 4], 10000, 2000, 1000), 11000, "A acomoda la campera");
    assert.notEqual(ejecutar([1, 2, 3, 4], 30000, 2000, 1000), 29000, "A falla con otra compra");
  });

  it("la hoja del estudiante muestra preguntas y opciones, pero no la clave", () => {
    const html = readDist("lo-que-queriamos-y-lo-que-paso", "index.html");
    const texto = textoVisible(html);
    for (const pregunta of preguntas) {
      assert.ok(texto.includes(normalizar(pregunta.enunciado)), pregunta.id);
      for (const letra of letras) {
        assert.ok(texto.includes(normalizar(pregunta.opciones[letra])), `${pregunta.id} ${letra}`);
      }
      assert.ok(!texto.includes(normalizar(pregunta.porque)), `${pregunta.id}: explicación`);
      for (const devolucion of Object.values(pregunta.siEligieron)) {
        assert.ok(!texto.includes(normalizar(devolucion)), `${pregunta.id}: devolución`);
      }
    }
    assert.ok(!/\bClave\b/.test(texto));
  });

  it("la guía docente contiene la clave completa", () => {
    const texto = textoVisible(readDist("lo-que-queriamos-y-lo-que-paso", "guia", "index.html"));
    assert.match(texto, /Clave/);
    for (const pregunta of preguntas) {
      assert.ok(
        texto.includes(`${pregunta.respuesta} ${normalizar(pregunta.opciones[pregunta.respuesta])}`),
        `${pregunta.id}: respuesta`,
      );
      assert.ok(texto.includes(normalizar(pregunta.porque)), `${pregunta.id}: explicación`);
    }
  });

  it("la portada enlaza la actividad y la guía", () => {
    const html = readDist("index.html");
    assert.match(html, /href="\/lo-que-queriamos-y-lo-que-paso\/"/);
    assert.match(html, /href="\/lo-que-queriamos-y-lo-que-paso\/guia\/"/);
  });
});

const GLOBALES = [
  "window",
  "document",
  "Element",
  "Node",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLFieldSetElement",
  "HTMLDetailsElement",
  "KeyboardEvent",
  "Event",
];

function montar(busqueda = "") {
  const dom = new JSDOM(readDist("lo-que-queriamos-y-lo-que-paso", "index.html"), {
    url: `http://localhost/lo-que-queriamos-y-lo-que-paso/${busqueda}`,
  });
  for (const nombre of GLOBALES) {
    globalThis[nombre] = nombre === "window" ? dom.window : dom.window[nombre];
  }
  iniciarActividadLoQueQueriamos();
  const doc = dom.window.document;
  const q = (selector) => doc.querySelector(selector);
  return {
    dom,
    doc,
    q,
    elegir: (id, letra) => q(`input[data-pregunta="${id}"][value="${letra}"]`).click(),
    revisar: () => q("[data-revisar]").click(),
    reiniciar: () => q("[data-reiniciar]").click(),
    devolucion: (id) => q(`#devolucion-${id}`),
    porque: (id) => q(`#pregunta-${id} [data-porque]`),
    estado: () => q("[data-estado]").textContent,
  };
}

const esperar = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
const incorrecta = (pregunta) => letras.find((letra) => letra !== pregunta.respuesta);

describe("Lo que queríamos y lo que pasó: en pantalla", () => {
  it("cada pregunta es un fieldset con legend y un grupo de radios con label", () => {
    const { doc } = montar();
    const fieldsets = [...doc.querySelectorAll("fieldset[data-pregunta]")];
    assert.equal(fieldsets.length, preguntas.length);
    for (const [indice, fieldset] of fieldsets.entries()) {
      const pregunta = preguntas[indice];
      assert.ok(fieldset.querySelector("legend").textContent.includes(normalizar(pregunta.enunciado).slice(0, 30)));
      const radios = [...fieldset.querySelectorAll("label > input[type='radio']")];
      assert.deepEqual(radios.map((radio) => radio.value), [...letras]);
      assert.equal(new Set(radios.map((radio) => radio.name)).size, 1, "un solo grupo por pregunta");
    }
    const nombres = fieldsets.map((f) => f.querySelector("input").name);
    assert.equal(new Set(nombres).size, nombres.length);
    assert.equal(doc.querySelector("[data-revisar]").tagName, "BUTTON");
    assert.equal(doc.querySelector("[data-estado]").getAttribute("role"), "status");
    assert.equal(doc.querySelector("[data-revisar]").closest("[data-con-script]").hidden, false);
  });

  it("toda la interacción queda en la región excluida de los gestos del recorrido", () => {
    const { q } = montar();
    const region = q("[data-actividad-lo-que-queriamos]");
    assert.ok(region.hasAttribute("data-navegacion-recorrido-excluir"));
    for (const selector of ["fieldset", "[data-revisar]", "[data-reiniciar]", "[data-estado]"]) {
      assert.ok(region.querySelector(selector), selector);
    }
  });

  it("una respuesta incorrecta recibe su devolución sin revelar la correcta; el segundo intento encaja", async () => {
    const p = montar();
    for (const pregunta of preguntas) {
      const mal = incorrecta(pregunta);
      p.elegir(pregunta.id, mal);
      p.revisar();
      const caja = p.devolucion(pregunta.id);
      assert.equal(caja.hidden, false);
      assert.match(caja.textContent, /Conviene revisar/);
      assert.ok(caja.textContent.includes(pregunta.siEligieron[mal]), pregunta.id);
      assert.ok(!caja.textContent.includes(pregunta.porque), `${pregunta.id}: no da la explicación`);
      assert.equal(p.porque(pregunta.id).hidden, true);
      assert.equal(p.porque(pregunta.id).textContent.includes(pregunta.porque), false);
      assert.equal(
        p.q(`input[data-pregunta="${pregunta.id}"][value="${mal}"]`).getAttribute("aria-describedby"),
        caja.id,
      );

      // Cambiar la respuesta invalida la devolución anterior.
      p.elegir(pregunta.id, pregunta.respuesta);
      assert.match(caja.textContent, /todavía no está revisada/);
      assert.equal(p.q(`#pregunta-${pregunta.id}`).dataset.resultado, "cambiada");

      // Segundo intento.
      p.revisar();
      assert.match(caja.textContent, /Encaja con el caso/);
      assert.equal(p.porque(pregunta.id).hidden, false);
      assert.ok(p.porque(pregunta.id).textContent.includes(pregunta.porque));
    }
    await esperar();
    assert.match(p.estado(), /Todas tus respuestas encajan/);
  });

  it("resume qué revisar y qué falta elegir, sin puntaje", async () => {
    const p = montar();
    p.revisar();
    await esperar();
    assert.match(p.estado(), /Todavía no elegiste ninguna respuesta/);

    const [primera, segunda] = preguntas;
    p.elegir(primera.id, incorrecta(primera));
    p.elegir(segunda.id, segunda.respuesta);
    p.revisar();
    await esperar();
    assert.match(p.estado(), /Conviene revisar la 1\./);
    assert.match(p.estado(), /Quedan sin elegir: la 3 y la 4\./);
    assert.doesNotMatch(p.estado(), /\d+\s*\/\s*\d+|puntaje:/);

    p.elegir(segunda.id, incorrecta(segunda));
    assert.equal(p.q("[data-vigencia]").hidden, false);
    assert.equal(p.estado(), "");
  });

  it("Empezar de nuevo borra elecciones, devoluciones y explicaciones", () => {
    const p = montar();
    for (const pregunta of preguntas) p.elegir(pregunta.id, pregunta.respuesta);
    p.revisar();
    p.reiniciar();
    assert.equal(p.doc.querySelectorAll("input:checked").length, 0);
    for (const pregunta of preguntas) {
      assert.equal(p.devolucion(pregunta.id).hidden, true);
      assert.equal(p.porque(pregunta.id).hidden, true);
      assert.equal(p.porque(pregunta.id).textContent.includes(pregunta.porque), false);
    }
  });

  it("con el recorrido activo, revisar no navega", () => {
    const p = montar("?recorrido=gm-2026-4b");
    iniciarNavegacionRecorrido();
    const nav = p.q('nav.recorrido[data-recorrido-id="gm-2026-4b"]');
    assert.equal(nav.hidden, false);
    const radio = p.q("input[data-pregunta]");
    radio.focus();
    radio.dispatchEvent(new p.dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    p.revisar();
    assert.equal(p.doc.location.search, "?recorrido=gm-2026-4b");
  });
});

describe("Lo que queríamos y lo que pasó: impresión", () => {
  it("la hoja impresa oculta controles, devoluciones y explicaciones, en oficio", () => {
    const html = readDist("lo-que-queriamos-y-lo-que-paso", "index.html");
    const hojas = [...html.matchAll(/<link[^>]+href="\/(_astro\/[^"]+\.css)"/g)].map((m) => readDist(m[1]));
    const css = hojas.join("\n") + [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
    assert.match(css, /@page\{size:216mm 356mm/);
    const impresion = css.slice(css.indexOf("@media print"));
    for (const clase of ["como-usar", "devolucion", "porque", "acciones", "estado", "vigencia"]) {
      assert.match(impresion, new RegExp(`\\.${clase}\\[data-astro-cid-[^\\]]+\\][^{]*\\{display:none!important`), clase);
    }
  });
});

describe("recorrido Gabriela Mistral · 4.º bimestre 2026", () => {
  const recorrido = recorridos.find((item) => item.id === "gm-2026-4b");

  it("ordena el pizarrón y la actividad sin duplicarlos", () => {
    assert.equal(recorrido.nombre, "Gabriela Mistral · 3.º año · 4.º bimestre 2026");
    assert.deepEqual(
      recorrido.materiales.map((material) => material.href),
      [
        "/pizarrones/la-maquina-obedece-exactamente/",
        "/lo-que-queriamos-y-lo-que-paso/",
        "/lo-que-queriamos-y-lo-que-paso/probar/",
      ],
    );
    assert.ok(!existsSync(join(dist, "escuelas", "gabriela-mistral", "4-bimestre-2026", "la-maquina-obedece-exactamente")));
  });

  it("la página del recorrido enlaza los materiales con el recorrido activo", () => {
    const html = readDist("escuelas", "gabriela-mistral", "4-bimestre-2026", "index.html");
    const enlaces = [...html.matchAll(/href="([^"]+\?recorrido=gm-2026-4b)"/g)].map((m) => m[1]);
    assert.deepEqual(enlaces, [
      "/pizarrones/la-maquina-obedece-exactamente/?recorrido=gm-2026-4b",
      "/lo-que-queriamos-y-lo-que-paso/?recorrido=gm-2026-4b",
      "/lo-que-queriamos-y-lo-que-paso/probar/?recorrido=gm-2026-4b",
    ]);
    assert.match(readDist("escuelas", "index.html"), /href="\/escuelas\/gabriela-mistral\/4-bimestre-2026\/"/);
    assert.match(readDist("index.html"), /href="\/escuelas\/gabriela-mistral\/4-bimestre-2026\/"/);
  });

  function nav(html) {
    const inicio = html.search(/<nav class="recorrido"[^>]*data-recorrido-id="gm-2026-4b"/);
    assert.ok(inicio >= 0, "falta la navegación del recorrido");
    return html.slice(inicio, html.indexOf("</nav>", inicio));
  }

  it("el pizarrón es el paso 1 y lleva a la actividad", () => {
    const n = nav(readDist("pizarrones", "la-maquina-obedece-exactamente", "index.html"));
    assert.match(n, /Paso 1 de 3/);
    assert.doesNotMatch(n, /rel="prev"/);
    assert.match(n, /href="\/lo-que-queriamos-y-lo-que-paso\/\?recorrido=gm-2026-4b"[^>]+rel="next"/);
  });

  it("la hoja es el paso 2, entre el pizarrón y la práctica en pantalla", () => {
    const n = nav(readDist("lo-que-queriamos-y-lo-que-paso", "index.html"));
    assert.match(n, /Paso 2 de 3/);
    assert.match(n, /href="\/pizarrones\/la-maquina-obedece-exactamente\/\?recorrido=gm-2026-4b"[^>]+rel="prev"/);
    assert.match(n, /href="\/lo-que-queriamos-y-lo-que-paso\/probar\/\?recorrido=gm-2026-4b"[^>]+rel="next"/);
  });

  it("la práctica en pantalla es el paso 3 y vuelve a la hoja", () => {
    const n = nav(readDist("lo-que-queriamos-y-lo-que-paso", "probar", "index.html"));
    assert.match(n, /Paso 3 de 3/);
    assert.match(n, /href="\/lo-que-queriamos-y-lo-que-paso\/\?recorrido=gm-2026-4b"[^>]+rel="prev"/);
    assert.doesNotMatch(n, /rel="next"/);
  });

  it("los materiales no quedan atados a la escuela: sin el recorrido no muestran navegación", () => {
    for (const ruta of [
      ["pizarrones", "la-maquina-obedece-exactamente", "index.html"],
      ["lo-que-queriamos-y-lo-que-paso", "index.html"],
      ["lo-que-queriamos-y-lo-que-paso", "probar", "index.html"],
    ]) {
      const html = readDist(...ruta);
      assert.match(html, /<nav class="recorrido"[^>]*hidden/, ruta.join("/"));
      const contenido = textoVisible(html.replace(/<nav class="recorrido"[\s\S]*?<\/nav>/g, ""));
      assert.doesNotMatch(contenido, /Mistral|bimestre/i, ruta.join("/"));
    }
  });
});

describe("Probar y ajustar el programa: lógica", () => {
  it("el programa original muestra $10.800 con la campera y no coincide con lo querido", () => {
    const [campera] = compras;
    assert.deepEqual(ejecutarProbar(ORIGINAL, campera).totales, [10000, 12000, 10800, 10800]);
    assert.equal(querido(campera), 11000);
    assert.ok(diagnosticar(ORIGINAL));
  });

  it("de las 24 órdenes posibles, sólo descontar antes de sumar el envío sirve para todas las compras", () => {
    const permutaciones = (xs) =>
      xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutaciones([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
    const correctas = permutaciones([1, 2, 3, 4]).filter((orden) => diagnosticar(orden) === undefined);
    assert.deepEqual(correctas, [[1, 3, 2, 4]]);
    for (const orden of permutaciones([1, 2, 3, 4])) {
      const comentario = diagnosticar(orden);
      if (comentario) assert.doesNotMatch(comentario, /1, 3, 2, 4|intercambi/i, "no dicta la solución");
    }
  });

  it("mover respeta los extremos", () => {
    assert.deepEqual(mover([1, 2, 3, 4], 0, -1), [1, 2, 3, 4]);
    assert.deepEqual(mover([1, 2, 3, 4], 2, -1), [1, 3, 2, 4]);
    assert.deepEqual(mover([1, 2, 3, 4], 3, 1), [1, 2, 3, 4]);
  });
});

describe("Probar y ajustar el programa: en pantalla", () => {
  function montarProbar() {
    const dom = new JSDOM(readDist("lo-que-queriamos-y-lo-que-paso", "probar", "index.html"), {
      url: "http://localhost/lo-que-queriamos-y-lo-que-paso/probar/",
    });
    for (const nombre of [...GLOBALES, "HTMLButtonElement", "HTMLOListElement", "HTMLTableRowElement", "HTMLTableSectionElement"]) {
      globalThis[nombre] = nombre === "window" ? dom.window : dom.window[nombre];
    }
    iniciarProbarYAjustar();
    const doc = dom.window.document;
    const q = (selector) => doc.querySelector(selector);
    return {
      doc,
      q,
      totales: () => [...doc.querySelectorAll("[data-traza] [data-total]")].map((c) => c.textContent),
      programa: () => [...doc.querySelectorAll("[data-programa] li")].map((li) => Number(li.dataset.instruccion)),
      boton: (n, accion) => q(`[data-programa] button[data-instruccion="${n}"][data-mover="${accion}"]`),
      filas: () => [...doc.querySelectorAll("[data-resultados] tbody tr")].map((tr) => tr.dataset.coincide),
    };
  }

  it("pide predecir antes de revelar el resultado y después ejecuta paso a paso", async () => {
    const p = montarProbar();
    p.q("[data-paso]").click();
    await esperar();
    assert.match(p.q("[data-estado-traza]").textContent, /elegí tu predicción/);
    assert.deepEqual(p.totales(), ["—", "—", "—", "—"]);
    assert.equal(p.q("[data-pantalla]").textContent, "—");

    p.q("input[name='prediccion'][value='11000']").click();
    for (let i = 0; i < 4; i++) p.q("[data-paso]").click();
    await esperar();
    assert.deepEqual(p.totales(), ["$10.000", "$12.000", "$10.800", "$10.800"]);
    assert.equal(p.q("[data-pantalla]").textContent, "$10.800");
    assert.equal(p.q("[data-paso]").disabled, true);
    const estado = p.q("[data-estado-traza]").textContent;
    assert.match(estado, /La pantalla muestra \$10\.800\. La dueña quería \$11\.000\./);
    assert.match(estado, /Predijiste \$11\.000/);

    p.q("[data-reiniciar-traza]").click();
    assert.deepEqual(p.totales(), ["—", "—", "—", "—"]);
    assert.equal(p.q("[data-paso]").disabled, false);
  });

  it("reordenar, probar, fallar y volver a intentar hasta que coincida", async () => {
    const p = montarProbar();
    assert.deepEqual(p.programa(), [1, 2, 3, 4]);
    assert.equal(p.boton(1, "subir").disabled, true);
    assert.equal(p.boton(4, "bajar").disabled, true);
    assert.equal(p.boton(2, "bajar").getAttribute("aria-label"), "Bajar: Sumarle al total el envío.");

    p.q("[data-probar]").click();
    await esperar();
    assert.deepEqual(p.filas(), ["false", "false", "false"]);
    assert.match(p.q("[data-estado-ajuste]").textContent, /Todavía no coincide/);

    // Un intento equivocado: el envío queda después de mostrar el total.
    p.boton(2, "bajar").click();
    assert.equal(p.q("[data-resultados]").hidden, true, "los resultados viejos no quedan a la vista");
    p.boton(2, "bajar").click();
    assert.deepEqual(p.programa(), [1, 3, 4, 2]);
    assert.equal(p.doc.activeElement, p.boton(2, "subir"), "en el extremo, el foco pasa al otro botón");
    p.q("[data-probar]").click();
    await esperar();
    assert.match(p.q("[data-estado-ajuste]").textContent, /antes de que terminen los cálculos/);

    // Segundo intento.
    p.boton(2, "subir").click();
    assert.deepEqual(p.programa(), [1, 3, 2, 4]);
    assert.equal(p.doc.activeElement, p.boton(2, "subir"));
    p.q("[data-probar]").click();
    await esperar();
    assert.deepEqual(p.filas(), ["true", "true", "true"]);
    assert.match(p.q("[data-estado-ajuste]").textContent, /cambió el orden de las instrucciones/);

    p.q("[data-restaurar]").click();
    assert.deepEqual(p.programa(), ORIGINAL);
  });

  it("queda en la región excluida del recorrido y no se imprime con controles", () => {
    const html = readDist("lo-que-queriamos-y-lo-que-paso", "probar", "index.html");
    assert.match(html, /data-probar-y-ajustar[^>]+data-navegacion-recorrido-excluir/);
    const css = [...html.matchAll(/<link[^>]+href="\/(_astro\/[^"]+\.css)"/g)].map((m) => readDist(m[1])).join("\n")
      + [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
    assert.match(css, /@media print\{[^@]*\.practica\[data-astro-cid-[^\]]+\]\{display:none\}/);
    assert.match(textoVisible(html), /Esta práctica es para hacer en pantalla/);
  });
});

describe("Lo que queríamos y lo que pasó: PDF finales y visibilidad de la guía", () => {
  const CARPETA = "/materiales/lo-que-queriamos-y-lo-que-paso/";
  const PDF_HOJA = `${CARPETA}lo-que-queriamos-y-lo-que-paso-oficio-216x356.pdf`;
  const PDF_GUIA = `${CARPETA}lo-que-queriamos-y-lo-que-paso-guia-oficio-216x356.pdf`;
  const GUIA = "/lo-que-queriamos-y-lo-que-paso/guia/";
  const partes = (href) => href.split("/").filter(Boolean);

  it("los dos PDF finales están versionados en public/ y llegan al build", () => {
    for (const href of [PDF_HOJA, PDF_GUIA]) {
      const fuente = join(root, "public", ...partes(href));
      assert.ok(existsSync(fuente), `Falta ${fuente}`);
      assert.equal(readFileSync(fuente).subarray(0, 5).toString("latin1"), "%PDF-", href);
      assert.ok(existsSync(join(dist, ...partes(href))), `Falta en dist: ${href}`);
    }
  });

  it("la hoja enlaza su PDF y la guía enlaza el suyo", () => {
    const hoja = readDist("lo-que-queriamos-y-lo-que-paso", "index.html");
    assert.ok(hoja.includes(`href="${PDF_HOJA}"`), "la hoja enlaza el PDF del estudiante");
    const guia = readDist("lo-que-queriamos-y-lo-que-paso", "guia", "index.html");
    assert.ok(guia.includes(`href="${PDF_GUIA}"`), "la guía enlaza su PDF");
  });

  it("decisión: la guía con la clave no se enlaza desde la experiencia del estudiante", () => {
    assert.ok(
      !serieLoQueQueriamos.materiales.some((material) => material.href === GUIA),
      "la serie, que se muestra al pie de la hoja y de la práctica, no incluye la guía",
    );
    const paginas = [
      ["lo-que-queriamos-y-lo-que-paso", "index.html"],
      ["lo-que-queriamos-y-lo-que-paso", "probar", "index.html"],
      ["pizarrones", "la-maquina-obedece-exactamente", "index.html"],
      ["escuelas", "gabriela-mistral", "4-bimestre-2026", "index.html"],
    ];
    for (const ruta of paginas) {
      const html = readDist(...ruta);
      assert.ok(!html.includes(`href="${GUIA}`), `${ruta.join("/")} no enlaza la guía`);
      assert.ok(!html.includes(PDF_GUIA), `${ruta.join("/")} no enlaza el PDF de la guía`);
    }
    // Sigue pública y al alcance de docentes desde «Para docentes».
    assert.match(readDist("index.html"), /id="docentes-pc"[\s\S]*?href="\/lo-que-queriamos-y-lo-que-paso\/guia\/"/);
  });

  it("el aviso del PDF no se imprime en la hoja", () => {
    const html = readDist("lo-que-queriamos-y-lo-que-paso", "index.html");
    const css = [...html.matchAll(/<link[^>]+href="\/(_astro\/[^"]+\.css)"/g)].map((m) => readDist(m[1])).join("\n")
      + [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
    assert.match(css, /@media print\{[^@]*\.hoja-pdf\[data-astro-cid-[^\]]+\][^{]*\{display:none!important/);
  });
});

describe("Lo que queríamos y lo que pasó: papelitos de respuestas", () => {
  const PDF = "/materiales/lo-que-queriamos-y-lo-que-paso/lo-que-queriamos-y-lo-que-paso-respuestas-oficio-216x356.pdf";
  const PAGINA = "/lo-que-queriamos-y-lo-que-paso/respuestas/";

  it("cada papelito pide nombre, curso y fecha y un casillero por pregunta, sin respuestas", () => {
    const html = readDist("lo-que-queriamos-y-lo-que-paso", "respuestas", "index.html");
    const { document } = new JSDOM(html).window;
    const papelitos = [...document.querySelectorAll(".papelito")];
    assert.equal(papelitos.length, 14);
    for (const papelito of papelitos) {
      const texto = papelito.textContent;
      for (const campo of ["Nombre y apellido", "Curso", "Fecha"]) assert.ok(texto.includes(campo), campo);
      assert.match(texto, /Lo que queríamos y lo que pasó/);
      assert.doesNotMatch(texto, /Mistral|bimestre/i, "no se ata a una escuela");
      const filas = [...papelito.querySelectorAll(".respuestas li")];
      assert.equal(filas.length, preguntas.length);
      for (const [indice, fila] of filas.entries()) {
        assert.equal(fila.querySelector(".numero").textContent, String(indice + 1));
        assert.equal(fila.querySelectorAll(".casilla").length, 1);
        assert.equal(fila.querySelector(".casilla").textContent, "", "el casillero está vacío");
      }
    }
    const visible = textoVisible(html);
    for (const pregunta of preguntas) {
      assert.ok(!visible.includes(normalizar(pregunta.porque)), `${pregunta.id}: explicación`);
    }
    assert.ok(!/\bClave\b/.test(visible));
  });

  it("el PDF está versionado, llega al build y se enlaza desde su página y desde la guía", () => {
    const partes = PDF.split("/").filter(Boolean);
    const fuente = join(root, "public", ...partes);
    assert.ok(existsSync(fuente));
    assert.equal(readFileSync(fuente).subarray(0, 5).toString("latin1"), "%PDF-");
    assert.ok(existsSync(join(dist, ...partes)));
    assert.ok(readDist("lo-que-queriamos-y-lo-que-paso", "respuestas", "index.html").includes(`href="${PDF}"`));
    assert.ok(readDist("lo-que-queriamos-y-lo-que-paso", "guia", "index.html").includes(`href="${PAGINA}"`));
  });
});
