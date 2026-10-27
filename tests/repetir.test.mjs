import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { recorridos } from "../src/data/recorridos.ts";
import { serieRepetir } from "../src/data/serie-repetir.ts";
import {
  cierre,
  clave,
  comer,
  desafios,
  ejecutarCamino,
  ejecutarEscena,
  ejecutarPuntos,
  ejecutarTablero,
  ejemplo,
  masDesafios,
  mirar,
  mismasCasillas,
  mover,
  repetir,
} from "../src/data/actividad-repetir.ts";
import { firma, generar } from "../src/data/ejercicios-repetir.ts";
import { anotaciones, etapas, grupos } from "../src/data/recorrido-repetir.ts";
import { iniciarRepetir } from "../src/scripts/repetir.ts";

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
    .replace(/\s+/g, " ");
}

const desafio = (letra) => desafios.find((d) => d.letra === letra);

describe("Repetir: programas y clave", () => {
  it("la clave sale de ejecutar los programas", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(clave())), {
      A: 7,
      B: 5,
      C: { vuelta: 5, numero: 4, afuera: "→" },
      D: "No",
      1: { P: 3, Q: 1 },
      2: { P: "2 4 6", Q: "6" },
      3: 10,
      4: { vuelta: 6, numero: 5 },
      5: { flecha: 4, total: 9 },
      6: "No",
      7: { veces: 3, cuerpo: "→ → ↓" },
    });
  });

  it("los desafíos con programa fallan tal como abren y se resuelven con la corrección", () => {
    for (const d of desafios) {
      if (d.programa) assert.equal(ejecutarEscena(d.escena, d.programa).resuelto, false, `${d.letra} ya funcionaba`);
      assert.equal(ejecutarEscena(d.escena, d.solucion).resuelto, true, `${d.letra} no se resuelve`);
    }
  });

  it("C se rompe chocando en la vuelta 5; también vale el bloque afuera antes del Repetir", () => {
    const c = desafio("C");
    assert.equal(ejecutarTablero(c.escena, c.programa).falla.error, "No puedo ir para abajo");
    assert.equal(ejecutarTablero(c.escena, [mover("derecha"), repetir(4, mover("abajo"), mover("derecha")), comer()]).resuelto, true);
  });

  it("D: el programa original termina donde el corregido, pero dibuja otra cosa", () => {
    const d = desafio("D");
    assert.deepEqual(ejecutarEscena(d.escena, d.programa).final, ejecutarEscena(d.escena, d.solucion).final);
  });

  it("los enlaces abren cada desafío de Pilas Bloques en línea", () => {
    assert.deepEqual(
      [...desafios, ...masDesafios].map((d) => d.enlace.replace("https://pilasbloques.program.ar/online/#/desafio/", "")),
      ["230", "236", "237", "238", "241", "235", "239", "240"],
    );
  });

  it("los ejemplos de la hoja dan lo que la hoja dice", () => {
    assert.deepEqual(ejecutarPuntos(ejemplo).pasos.map((p) => p.puntos), [2, 4, 8, 8]);
    assert.deepEqual(ejecutarPuntos(mirar.adentro).muestras, [6, 11]);
    assert.deepEqual(ejecutarPuntos(mirar.afuera).muestras, [11]);
    assert.equal(ejecutarPuntos(mirar.ordenA).final, 18);
    assert.equal(ejecutarPuntos(mirar.ordenB).final, 9);
  });
});

describe("Repetir: el recorrido", () => {
  it("lo común va primero y termina en el cierre; después, la continuación", () => {
    assert.deepEqual(
      etapas.map((e) => [e.id, e.grupo]),
      [["paso-1", "todos"], ["paso-2", "todos"], ["paso-3", "todos"], ["cierre", "todos"], ["paso-4", "tiempo"], ["paso-5", "tiempo"]],
    );
    assert.equal(etapas.find((e) => e.id === "cierre").medio, "Papel");
  });

  it("cada paso con Pilas Bloques tiene antes, qué hacer, franja y después", () => {
    for (const e of etapas.filter((x) => x.pb)) {
      assert.ok(e.antes.texto && e.antes.papelito, e.id);
      assert.ok(e.pb.hacer.length > 0 && e.pb.mientras, e.id);
      assert.ok(e.despues?.llevarte, e.id);
    }
    assert.deepEqual(anotaciones.map((p) => p.etapa.marca), ["1", "3", "4", "5"]);
  });

  it("los ejercicios de los pasos tienen las respuestas de la guía", () => {
    const respuestas = (id) => etapas.find((e) => e.id === id).despues.ejercicios.map((ej) => ej.respuestaTexto);
    assert.deepEqual(respuestas("paso-2"), ["5 9 13", "13"]);
    assert.deepEqual(respuestas("paso-3"), ["8"]);
    assert.deepEqual(respuestas("paso-4"), ["7"]);
    assert.deepEqual(respuestas("paso-5"), ["Sí"]);
  });

  it("el paso 5 compara los dos programas de Coty: mismo final, otro camino, mismas subidas", () => {
    const [antes, despues] = etapas.find((e) => e.id === "paso-5").despues.ejecutores.map((p) => ejecutarCamino(p));
    assert.deepEqual(antes.final, despues.final);
    assert.equal(mismasCasillas(antes.casillas, despues.casillas), false);
  });

  it("ni la página ni la referencia usan un programa del cierre", () => {
    const delCierre = new Set([cierre.P, cierre.Q, cierre.R, cierre.S, cierre.W, cierre.X, cierre.Y].map(firma));
    const enPagina = etapas.flatMap((e) => [...(e.despues?.ejecutores ?? []), ...(e.despues?.ejercicios ?? []).flatMap((ej) => ej.programas)]);
    for (const p of [...enPagina, ejemplo, mirar.adentro, mirar.afuera, mirar.ordenA, mirar.ordenB]) {
      assert.ok(!delCierre.has(firma(p)), "un programa de la página está en el cierre");
    }
  });

  it("el cierre: R y S tienen las mismas instrucciones, las mismas veces, y muestran distinto", () => {
    assert.notEqual(ejecutarPuntos(cierre.R).final, ejecutarPuntos(cierre.S).final);
    assert.equal(ejecutarTablero(cierre.filaY, [repetir(5, mover("derecha")), comer()]).resuelto, true);
  });
});

describe("Repetir: ejercicios con devolución", () => {
  it("aceptan su respuesta, rechazan los errores típicos sin revelarla y no repiten el cierre", () => {
    const delCierre = new Set([cierre.P, cierre.Q, cierre.R, cierre.S, cierre.W, cierre.X, cierre.Y].map(firma));
    const ejercicios = [
      ...etapas.flatMap((e) => e.despues?.ejercicios ?? []),
      ...Array.from({ length: 700 }, (_, i) => generar(i + 1)),
    ];
    for (const ej of ejercicios) {
      assert.equal(ej.comprobar(ej.respuesta).ok, true, ej.consigna);
      for (const mala of ej.erroresTipicos) {
        const r = ej.comprobar(mala);
        assert.equal(r.ok, false);
        assert.ok(!r.mensaje.includes(ej.respuestaTexto), `revela la respuesta: ${r.mensaje}`);
      }
      for (const p of ej.programas) assert.ok(!delCierre.has(firma(p)));
    }
    assert.deepEqual(new Set(ejercicios.map((ej) => ej.tipo)).size, 7);
  });
});

describe("Repetir: la página", () => {
  const html = () => readDist("repetir", "index.html");

  it("tiene el mapa del recorrido con los tres grupos y una sección por etapa, en orden", () => {
    const { document } = new JSDOM(html()).window;
    const mapa = [...document.querySelectorAll("[data-mapa] a")].map((a) => a.getAttribute("href"));
    assert.deepEqual(mapa, ["#paso-1", "#paso-2", "#paso-3", "#cierre", "#paso-4", "#paso-5", "#mas"]);
    assert.deepEqual([...document.querySelectorAll("[data-mapa] .mapa-titulo")].map((p) => p.textContent), Object.values(grupos));
    assert.deepEqual([...document.querySelectorAll("[data-etapa]")].map((s) => s.id), ["paso-1", "paso-2", "paso-3", "cierre", "paso-4", "paso-5", "mas"]);
  });

  it("desde el comienzo se llega a la hoja y al papelito, en la web y en PDF", () => {
    const { document } = new JSDOM(html()).window;
    const accesos = [...document.querySelectorAll(".empezar .recurso a")].map((a) => a.getAttribute("href"));
    assert.deepEqual(accesos, [
      "/repetir/hoja/",
      "/materiales/repetir/repetir-hoja-a4.pdf",
      "/repetir/papelitos/",
      "/materiales/repetir/repetir-papelitos-a4.pdf",
    ]);
  });

  it("cada recurso aparece donde se usa: el frente en el paso 2, el dorso y el papelito en el cierre", () => {
    const { document } = new JSDOM(html()).window;
    const enlaces = (id) => [...document.querySelectorAll(`#${id} .recurso-cerca a`)].map((a) => a.getAttribute("href"));
    assert.deepEqual(enlaces("paso-2"), ["/repetir/hoja/#frente"]);
    assert.deepEqual(enlaces("cierre"), ["/repetir/hoja/#dorso", "/repetir/papelitos/"]);
    assert.deepEqual(enlaces("paso-4"), ["/repetir/hoja/#dorso"]);
    assert.deepEqual(enlaces("paso-5"), ["/repetir/hoja/#dorso"]);
  });

  it("el cierre permite consultar el frente de la hoja del folio mientras se resuelve en papel", () => {
    const { document } = new JSDOM(html()).window;
    const cierre = document.querySelector("#cierre");
    const consigna = cierre.querySelector(".accion-cuerpo > p").textContent;
    assert.match(consigna, /Resolvé del 1 al 4 solo y sin mirar la pantalla/);
    assert.match(consigna, /Podés volver a consultar el frente de la hoja del folio mientras resolvés/);
    assert.match(cierre.querySelector(".anota").textContent, /papelito, columna «Cierre»: del 1 al 4/);
    assert.match(cierre.querySelector(".accion-cuerpo > .nota").textContent, /Si seguís con los pasos 4 y 5, conservá el papelito/);
    assert.match(cierre.querySelector(".siguiente").textContent, /Si no, entregá el papelito/);
  });

  it("las preguntas 5 y 6 de la hoja se responden en los mismos números de la columna Cierre", () => {
    const { document } = new JSDOM(html()).window;
    const hoja = new JSDOM(readDist("repetir", "hoja", "index.html")).window.document;
    const papelito = new JSDOM(readDist("repetir", "papelitos", "index.html")).window.document;
    for (const [paso, numero] of [[4, 5], [5, 6]]) {
      const indicacion = document.querySelector(`#paso-${paso} [data-despues-cuerpo] .anota`).textContent;
      assert.match(indicacion, new RegExp(`pregunta ${numero} del dorso de la hoja del folio`));
      assert.match(indicacion, new RegExp(`papelito, columna «Cierre», número ${numero}`));
      assert.ok([...hoja.querySelectorAll("#dorso .preguntas .num")].some((n) => n.textContent === String(numero)));
      assert.ok([...papelito.querySelectorAll(".columnas > div:last-child .n")].some((n) => n.textContent === String(numero)));
    }
  });

  it("pestaña nueva sólo para Pilas Bloques y los PDF; lo de Aula, en la misma", () => {
    for (const ruta of [["repetir", "index.html"], ["repetir", "hoja", "index.html"], ["repetir", "papelitos", "index.html"]]) {
      const { document } = new JSDOM(readDist(...ruta)).window;
      const contenido = document.querySelector(".material");
      for (const a of contenido.querySelectorAll('a[target="_blank"]')) {
        const href = a.getAttribute("href");
        assert.match(href, /^https:\/\/pilasbloques\.program\.ar\/|\.pdf$/, `${ruta.join("/")}: ${href} no debería abrir aparte`);
        assert.match(a.getAttribute("rel") ?? "", /noopener/, href);
      }
      for (const a of contenido.querySelectorAll('a[href^="/"]:not([href$=".pdf"]), a[href^="#"]')) {
        assert.equal(a.getAttribute("target"), null, `${ruta.join("/")}: ${a.getAttribute("href")} tiene que quedar en la misma pestaña`);
      }
    }
  });

  it("cada paso dice en qué renglón del papelito anotar, con la misma forma y el gesto", () => {
    const { document } = new JSDOM(html()).window;
    const anota = (sel) => [...document.querySelectorAll(sel)].map((p) => p.textContent.replace(/\s+/g, " ").trim());
    assert.deepEqual(anota("#paso-1 .anota"), ["En el papelito, Paso 1: Repetir veces (escribí el número)"]);
    assert.deepEqual(anota("#paso-3 .anota"), ["En el papelito, Paso 3: Repetir veces (escribí el número)"]);
    assert.deepEqual(anota("#paso-4 .accion-cuerpo > .anota"), [
      "En el papelito, Paso 4: Se rompe en la vuelta (escribí el número)",
      "Cuando funcione: En el papelito, Paso 4: Repetir veces · afuera: ↑︎↓︎←︎→︎ (escribí el número y marcá con una X)",
    ]);
    assert.deepEqual(anota("#paso-5 .accion-cuerpo > .anota"), ["En el papelito, Paso 5: ¿Dibuja la escalera? SíNo (marcá con una X)"]);
  });

  it("Aula indica cuándo responder y las referencias al papelito sólo dicen qué completar y cómo", () => {
    const { document } = new JSDOM(html()).window;
    for (const id of ["paso-1", "paso-3", "paso-4", "paso-5"]) {
      const accion = document.querySelector(`#${id} .accion`);
      assert.equal(accion.querySelector("h3").textContent, "Antes de ejecutar", id);
      assert.ok(accion.querySelector(".anota"), id);
    }
    for (const p of document.querySelectorAll(".anota")) {
      assert.doesNotMatch(p.textContent, /antes|después/i);
    }
    const c = document.querySelectorAll("#paso-4 .accion-cuerpo > .anota");
    assert.equal(c.length, 2);
    assert.match(c[1].textContent, /^Cuando funcione:/);
    assert.equal(c[0].querySelectorAll(".campo-casillero").length, 1);
    assert.equal(c[1].querySelectorAll(".campo-casillero").length, 1);
    assert.equal(c[1].querySelectorAll(".campo-cuadro").length, 4);
  });

  it("las superficies de estudiantes no muestran etiquetas de respuesta ANTES o DESPUÉS", () => {
    for (const ruta of [["repetir", "index.html"], ["repetir", "papelitos", "index.html"], ["repetir", "hoja", "index.html"]]) {
      const { document } = new JSDOM(readDist(...ruta)).window;
      for (const el of document.querySelectorAll("body *:not(script):not(style)")) {
        assert.doesNotMatch(el.textContent.trim(), /^(antes|después)$/i, ruta.join("/"));
      }
    }
  });

  it("los pasos para todos llevan al cierre si queda poco tiempo", () => {
    const { document } = new JSDOM(html()).window;
    for (const id of ["paso-1", "paso-2", "paso-3"]) {
      assert.ok(document.querySelector(`#${id} .corte a[href="#cierre"]`), id);
    }
    assert.equal(document.querySelector("#paso-4 .corte"), null);
    assert.match(document.querySelector("#paso-3 .siguiente a").getAttribute("href"), /#cierre/);
    assert.match(document.querySelector("#cierre .siguiente").textContent, /Si queda tiempo.*Si no, entregá el papelito/);
  });

  it("los estudiantes no ven duraciones ni cronograma", () => {
    assert.doesNotMatch(textoVisible(html()), /\d+\s*min/i);
  });

  it("enlaza Pilas Bloques en otra pestaña, con «Abrir acá» y respaldo", () => {
    const { document } = new JSDOM(html()).window;
    for (const [id, letra] of [["paso-1", "A"], ["paso-3", "B"], ["paso-4", "C"], ["paso-5", "D"]]) {
      const bloque = document.querySelector(`#${id} [data-pb]`);
      assert.equal(bloque.dataset.pb, desafio(letra).enlace);
      const enlace = bloque.querySelector('a[target="_blank"]');
      assert.equal(enlace.getAttribute("href"), desafio(letra).enlace);
      assert.match(enlace.getAttribute("rel"), /noopener/);
      assert.ok(bloque.querySelector("[data-incrustar][hidden]"), `${id}: «Abrir acá» sin JS queda oculto`);
      assert.ok(bloque.querySelector(".pb-respaldo svg"), `${id}: respaldo`);
    }
  });

  it("protege el recorrido de la navegación por flechas entre materiales", () => {
    const { document } = new JSDOM(html()).window;
    const raiz = document.querySelector("[data-recorrido-repetir]");
    assert.ok(raiz.hasAttribute("data-navegacion-recorrido-excluir"));
    assert.equal(raiz.getAttribute("tabindex"), "-1");
  });

  it("publica la hoja y los papelitos en PDF, y no enlaza la guía", () => {
    for (const [pdf, paginas] of [["repetir-hoja-a4.pdf", 2], ["repetir-papelitos-a4.pdf", 1]]) {
      const ruta = join(root, "public", "materiales", "repetir", pdf);
      assert.ok(existsSync(ruta), pdf);
      assert.ok(html().includes(`/materiales/repetir/${pdf}`), pdf);
      // Lo mismo que comprueba npm run pdf:repetir al regenerarlos.
      assert.equal((readFileSync(ruta, "latin1").match(/\/Type\s*\/Page\b/g) ?? []).length, paginas, pdf);
    }
    for (const ruta of [["repetir", "index.html"], ["repetir", "hoja", "index.html"], ["repetir", "papelitos", "index.html"]]) {
      assert.ok(!readDist(...ruta).includes('href="/repetir/guia/"'), `${ruta.join("/")} no enlaza la guía`);
    }
    assert.ok(!serieRepetir.materiales.some((m) => m.href.includes("guia")));
  });

  it("no queda atada a la escuela: sin el recorrido no muestra navegación", () => {
    for (const ruta of [["repetir", "index.html"], ["repetir", "hoja", "index.html"], ["repetir", "papelitos", "index.html"], ["repetir", "guia", "index.html"]]) {
      const contenido = textoVisible(readDist(...ruta).replace(/<nav class="recorrido"[\s\S]*?<\/nav>/g, ""));
      assert.doesNotMatch(contenido, /Mistral|bimestre/i, ruta.join("/"));
    }
  });
});

describe("Repetir: en el navegador", () => {
  function montar(hash = "") {
    const dom = new JSDOM(readDist("repetir", "index.html"), { url: `http://localhost/repetir/${hash}` });
    let semilla = 0.123;
    iniciarRepetir(dom.window.document, () => (semilla = (semilla * 9301 + 49297) % 1) || 0.5);
    const doc = dom.window.document;
    return { dom, doc, q: (s, raiz = doc) => raiz.querySelector(s), qq: (s, raiz = doc) => [...raiz.querySelectorAll(s)] };
  }
  const visibles = (doc) => [...doc.querySelectorAll("[data-etapa]")].filter((s) => !s.hidden).map((s) => s.id);

  it("muestra un paso por vez, según la dirección, y marca el actual en el mapa", async () => {
    const { dom, doc, q } = montar();
    assert.deepEqual(visibles(doc), ["paso-1"]);
    assert.equal(q('[data-mapa] a[aria-current="step"]').getAttribute("href"), "#paso-1");
    // Se espera el evento, no un tiempo fijo: la página registró su manejador antes y ya actualizó.
    const cambio = new Promise((ok) => dom.window.addEventListener("hashchange", ok, { once: true }));
    dom.window.location.hash = "#cierre";
    await cambio;
    assert.deepEqual(visibles(doc), ["cierre"]);
    assert.equal(q('[data-mapa] a[aria-current="step"]').getAttribute("href"), "#cierre");
    assert.deepEqual(visibles(montar("#paso-4").doc), ["paso-4"]);
    assert.deepEqual(visibles(montar("#no-existe").doc), ["paso-1"]);
  });

  it("«Abrir acá» incrusta un solo Pilas Bloques; «Ya funciona» lo cierra y abre el después", () => {
    const { doc, q, qq } = montar("#paso-3");
    const paso = q("#paso-3");
    assert.equal(q("[data-despues-cuerpo]", paso).hidden, true);
    assert.equal(q("[data-compuerta]", paso).hidden, false);
    q("[data-incrustar]", paso).click();
    assert.equal(q("iframe", paso).getAttribute("src"), desafio("B").enlace);
    q("#paso-4 [data-incrustar]").click();
    assert.equal(qq("iframe").length, 1);
    q("#paso-3 [data-incrustar]").click();
    q("[data-ya]", paso).click();
    assert.equal(qq("iframe", doc).length, 0);
    assert.equal(q("[data-despues-cuerpo]", paso).hidden, false);
    assert.equal(q("[data-compuerta]", paso), null);
  });

  it("el ejecutor despliega vuelta por vuelta y compara con la predicción", () => {
    const { q, qq } = montar("#paso-2");
    const ej = q("#paso-2 .ejecutor");
    q("[data-prediccion]", ej).value = "23";
    q("[data-paso]", ej).click();
    assert.match(q(".rep-vuelta", ej).textContent, /vuelta 1 de 3/);
    assert.ok(q(".linea.actual", ej));
    q("[data-todo]", ej).click();
    assert.equal(qq("tbody tr", ej).length, 8);
    assert.match(q("[data-resultado]", ej).textContent, /Coincide/);
  });

  it("los ejercicios orientan sin dar la respuesta y no muestran la ejecución antes de responder", () => {
    const { q, qq } = montar("#paso-2");
    const [adentro] = qq("#paso-2 .ejercicio");
    assert.equal(q("[data-ver]", adentro).hidden, true);
    q("[data-respuesta]", adentro).value = "13";
    q("[data-comprobar]", adentro).click();
    assert.match(q("[data-devolucion]", adentro).textContent, /^Todavía no.*adentro/);
    assert.equal(q("[data-ver]", adentro).hidden, false);
    q("[data-respuesta]", adentro).value = "5 9 13";
    q("[data-comprobar]", adentro).click();
    assert.match(q("[data-devolucion]", adentro).textContent, /^Coincide/);
  });

  it("la práctica sortea ejercicios y cambia de tipo", () => {
    const { dom, q } = montar("#mas");
    const select = q("[data-practica] [data-tipo]");
    select.value = "plegar";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    assert.ok(q("[data-practica] .secuencia"));
    q("[data-practica] [data-otro]").click();
    assert.ok(q("[data-practica] .ejercicio"));
  });
});

describe("Repetir: hoja, papelitos y guía", () => {
  it("la hoja trae la referencia al frente y el cierre al dorso, sin la clave", () => {
    const texto = textoVisible(readDist("repetir", "hoja", "index.html"));
    for (const frase of ["Cuatro palabras", "Tres cosas para mirar", "Si Aula no abre", "Para todos · después del paso 3", "Si hiciste los pasos 4 y 5", "Para ir más lejos"]) {
      assert.ok(texto.includes(frase), frase);
    }
    assert.ok(!texto.includes("Clave"));
    assert.match(texto, /El primero muestra 6 y después 11\s*; el segundo, sólo 11/);
    assert.ok(texto.includes("«Duplicar» y «Mostrar» están escritos una vez cada uno, pero entre los dos se ejecutan 4 veces"));
  });

  it("Aula y los cuatro papelitos se ubican por Paso 1, 3, 4 y 5, con los mismos campos", () => {
    const { document } = new JSDOM(readDist("repetir", "papelitos", "index.html")).window;
    const aula = new JSDOM(readDist("repetir", "index.html")).window.document;
    const papelitos = document.querySelectorAll(".papelito");
    assert.equal(papelitos.length, 4);
    const titulos = ["Paso 1 · Más churrascos 1", "Paso 3 · Corregimos 1", "Paso 4 · Corregimos 2", "Paso 5 · Corregimos 3"];
    const normalizar = (el) => el.textContent.replace(/\s+/g, " ").trim();
    const campos = (el) => [...el.querySelectorAll(".campo-texto, .campo-opcion")].map(normalizar);
    for (const papelito of papelitos) {
      assert.doesNotMatch(papelito.textContent, /antes|después/i);
      assert.match(papelito.querySelector(".indicacion").textContent, /Casillero: escribí.*marcá con una X.*tachá y escribí al lado/s);
      const pasos = [...papelito.querySelectorAll(".paso-papelito")];
      assert.deepEqual(pasos.map((p) => normalizar(p.querySelector("h3"))), titulos);
      for (const [i, numero] of ["1", "3", "4", "5"].entries()) {
        const paso = pasos[i];
        const etapa = aula.querySelector(`#paso-${numero}`);
        const identificador = normalizar(paso.querySelector("h3 span"));
        assert.equal(identificador, `Paso ${numero}`);
        assert.equal(normalizar(etapa.querySelector(".etapa-ubicacion > span:last-child")), identificador);
        const indicaciones = [...etapa.querySelectorAll(".accion-cuerpo > .anota")];
        const respuestas = [...paso.querySelectorAll(".respuesta")];
        assert.equal(respuestas.length, numero === "4" ? 2 : 1);
        for (const [j, respuesta] of respuestas.entries()) {
          assert.match(normalizar(indicaciones[j]), new RegExp(`En el papelito, ${identificador}:`));
          assert.deepEqual(campos(respuesta), campos(indicaciones[j]));
          for (const selector of [".campo-casillero", ".campo-cuadro"]) {
            assert.equal(respuesta.querySelectorAll(selector).length, indicaciones[j].querySelectorAll(selector).length);
          }
        }
        assert.match(normalizar(etapa.querySelector(".pb-mientras")), new RegExp(`papelito, ${identificador}, antes de ejecutar`));
        assert.doesNotMatch(paso.textContent, /\b[A-D]\b/);
        assert.doesNotMatch(etapa.textContent, /(?:En el papelito:|Anotalo en|Marcá Sí o No en)\s*[A-D]\b/);
      }
      // Paso 4 reúne la predicción y la corrección bajo un mismo encabezado.
      const respuestas = [...papelito.querySelectorAll(".respuesta")];
      assert.deepEqual(respuestas.map((f) => f.textContent.replace(/\s+/g, "")), [
        "Repetirveces", "Repetirveces", "Serompeenlavuelta",
        "Cuandofuncione:Repetirveces·afuera:↑︎↓︎←︎→︎", "¿Dibujalaescalera?SíNo",
      ]);
      assert.equal(pasos[2].querySelectorAll(".cuando").length, 1);
      assert.equal(respuestas[2].nextElementSibling, respuestas[3]);
      assert.match(normalizar(respuestas[3]), /^Cuando funcione:/);
      assert.equal(respuestas[3].querySelectorAll(".campo-cuadro").length, 4);
      assert.equal(respuestas[4].querySelectorAll(".campo-cuadro").length, 2);
      for (const opcion of papelito.querySelectorAll(".campo-opcion")) {
        assert.equal(opcion.querySelectorAll(".campo-cuadro").length, 1);
      }
      // El cierre conserva su numeración, sus campos y su orden.
      assert.deepEqual([...papelito.querySelectorAll(".n")].map(normalizar), ["1", "2", "3", "4", "5", "6", "7"]);
      const derecha = [...papelito.querySelectorAll(".columnas > div:last-child .fila")].map((f) => f.textContent.replace(/\s+/g, ""));
      assert.deepEqual(derecha, [
        "1«Mostrar»seejecuta:Pveces·Qveces", "2enlapantalla,enorden:PQ", "3Rmuestra",
        "4Yfallaenlavuelta·Repetirveces", "5enW,→veces·entotalmovimientos",
        "6¿SmuestralomismoqueR?SíNo", "7Repetirveces·adentro:",
      ]);
    }
  });

  it("la guía trae la clave calculada y los minutos como referencia", () => {
    const texto = textoVisible(readDist("repetir", "guia", "index.html"));
    const k = clave();
    assert.ok(texto.includes(`Antes: se rompe en la vuelta ${k.C.vuelta}. Después de corregir: ${k.C.numero}`));
    assert.ok(texto.includes("Aula indica cuándo completar cada respuesta"));
    assert.doesNotMatch(texto, /lo marcado «(?:antes|después)»/i);
    assert.doesNotMatch(texto, /Antes de ejecutar \(izquierda del papelito\)/);
    // La pregunta 4 se diagnostica por seguir la ejecución y contar movimientos, no por adentro/afuera.
    assert.match(texto, /4\s*: seguir la ejecución hasta la vuelta en que falla y contar movimientos, no casillas/);
    assert.ok(texto.includes(`P ${k[2].P} · Q ${k[2].Q}`));
    assert.match(texto, /Unos \d+ minutos, como referencia/);
  });
});

describe("Repetir: dónde aparece", () => {
  it("en la portada de Aula, con su guía en «Para docentes»", () => {
    const { document } = new JSDOM(readDist("index.html")).window;
    const campo = document.querySelector('section[aria-labelledby="campo-pc"]');
    assert.ok(campo.querySelector('.indice a[href="/repetir/"]'));
    assert.ok(campo.querySelector('.secundario a[href="/repetir/guia/"]'));
  });

  it("al final del recorrido de Gabriela Mistral de 4.º bimestre", () => {
    const recorrido = recorridos.find((r) => r.id === "gm-2026-4b");
    assert.equal(recorrido.materiales.at(-1).href, "/repetir/");
    const nav = readDist("repetir", "index.html").match(/<nav class="recorrido"[^>]*data-recorrido-id="gm-2026-4b"[\s\S]*?<\/nav>/)[0];
    assert.match(nav, /Paso 6 de 6/);
    assert.match(nav, /href="\/cuando-importa-el-orden\/\?recorrido=gm-2026-4b"[^>]+rel="prev"/);
    assert.doesNotMatch(nav, /rel="next"/);
    assert.match(readDist("escuelas", "gabriela-mistral", "4-bimestre-2026", "index.html"), /href="\/repetir\/\?recorrido=gm-2026-4b"/);
  });
});
