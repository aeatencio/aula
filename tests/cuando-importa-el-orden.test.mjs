import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { iniciarSeguimiento } from "../src/scripts/seguir-programa.ts";
import { iniciarProbadores } from "../src/scripts/probar-orden.ts";
import { recorridos } from "../src/data/recorridos.ts";
import { serieCuandoImportaElOrden } from "../src/data/serie-cuando-importa-el-orden.ts";
import {
  cierre,
  conclusion,
  consignasDorso,
  consignasFrente,
  ejemplo,
  ejemploMonedas,
  ideaInicial,
  mostro,
  preguntaInicial,
  preguntaSumas,
  probadores,
  programaA,
  programaB,
  programaC,
  programaD,
  rutina,
  seguir,
  valorAntesDe,
  verbos,
} from "../src/data/actividad-cuando-importa-el-orden.ts";

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
    .replace(/[\s ]+/g, " ");
}

const normalizar = (texto) => texto.replace(/[\s ]+/g, " ").trim();

function cssDe(html) {
  return (
    [...html.matchAll(/<link[^>]+href="\/(_astro\/[^"]+\.css)"/g)].map((m) => readDist(m[1])).join("\n") +
    [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n")
  );
}

/*
  Ejecutor escrito aparte de los datos, a partir del texto de cada
  instrucción, para que la clave no se valide contra sí misma. Devuelve los
  estados después de cada instrucción y lo que se mostró.
*/
function ejecutar(programa) {
  const m = { ...programa.inicial };
  const estados = [];
  let mostrado;
  for (const { texto } of programa.instrucciones) {
    let r;
    if ((r = texto.match(/^Sumarle (\d+) a PUNTOS\.$/))) m.PUNTOS += Number(r[1]);
    else if (texto === "Sumarle a PUNTOS el valor de MONEDAS.") m.PUNTOS += m.MONEDAS;
    else if (texto === "Duplicar PUNTOS.") m.PUNTOS *= 2;
    else if (texto === "Anotar 0 en MONEDAS.") m.MONEDAS = 0;
    else if (texto === "Mostrar PUNTOS.") mostrado = m.PUNTOS;
    else throw new Error(`Instrucción desconocida: ${texto}`);
    estados.push({ ...m });
  }
  return { estados, mostrado, puntos: estados.map((e) => e.PUNTOS) };
}

const frente = { programaA, programaB, programaC, programaD, ...ejemplo };

const permutaciones = (xs) =>
  xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutaciones([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));

/** Sólo secuencia y orden: ni condiciones ni repeticiones. */
const ADELANTA = /\bentonces\b|repet|\bpor cada\b|\bcada vez\b|\bhasta que\b|\bmientras que\b/i;
/** Otros contextos que esta clase dejó afuera: uno solo, el juego. */
const OTROS_CONTEXTOS = /empanada|kiosco|alfajor|tienda|campera|microondas|STOCK|VENTA|CANTIDAD/i;
/** Notación de órdenes por número («2 · 1 · 3»): los programas se escriben en su orden. */
const NOTACION_ORDEN = /\b\d+ · \d+ · \d+\b/;

describe("Cuándo importa el orden: programas y clave", () => {
  it("los datos coinciden con un ejecutor independiente", () => {
    for (const programa of [...Object.values(frente), ...consignasDorso.map((c) => c.programa), cierre.primero, cierre.segundo, ...cierre.sumas]) {
      const esperado = ejecutar(programa);
      assert.deepEqual(seguir(programa).map((fila) => fila.memoria), esperado.estados);
      assert.equal(mostro(programa), esperado.mostrado);
    }
  });

  it("el ejemplo, A y B: mismo par de instrucciones, otro orden, otro resultado", () => {
    assert.deepEqual(ejecutar(ejemplo.primero).puntos, [3, 6, 6]);
    assert.deepEqual(ejecutar(ejemplo.segundo).puntos, [4, 5, 5]);
    assert.deepEqual(ejecutar(programaA).puntos, [7, 14, 14]);
    assert.deepEqual(ejecutar(programaB).puntos, [8, 11, 11]);
    assert.equal(valorAntesDe(programaA, "Duplicar"), 7);
    assert.equal(valorAntesDe(programaB, "Duplicar"), 4);
  });

  it("C y D muestran lo mismo pasando por valores distintos", () => {
    assert.equal(mostro(programaC), mostro(programaD));
    assert.notDeepEqual(ejecutar(programaC).puntos, ejecutar(programaD).puntos);
  });

  it("el frente es accesible: un casillero, tres instrucciones, «Mostrar» al final y números chicos", () => {
    for (const programa of Object.values(frente)) {
      assert.deepEqual(programa.casilleros, ["PUNTOS"]);
      assert.equal(programa.instrucciones.length, 3);
      assert.equal(programa.instrucciones.at(-1).texto, "Mostrar PUNTOS.");
      assert.ok(ejecutar(programa).puntos.every((n) => n <= 20));
    }
  });

  it("el dorso agrega MONEDAS y cada respuesta impresa sale de ejecutar su programa", () => {
    const [nivel, borra, duplica, muestra] = consignasDorso.map((c) => c.programa);
    for (const c of consignasDorso) assert.deepEqual(c.programa.casilleros, ["PUNTOS", "MONEDAS"]);
    assert.equal(ejecutar(nivel).mostrado, 14);
    assert.match(consignasDorso[0].respuesta, /muestra 14/);
    assert.equal(ejecutar(borra).mostrado, 8);
    assert.match(consignasDorso[1].respuesta, /muestra 8; MONEDAS vale 0/);
    assert.equal(ejecutar(duplica).mostrado, ejecutar(nivel).mostrado, "intercambio que no cambia lo que se muestra");
    assert.match(consignasDorso[2].respuesta, /^sí, 14/);
    const memoriaYPantalla = ejecutar(muestra);
    assert.equal(memoriaYPantalla.mostrado, 7);
    assert.equal(memoriaYPantalla.estados.at(-1).PUNTOS, 14, "la memoria sigue cambiando después de mostrar");
    assert.match(consignasDorso[3].respuesta, /pantalla 7; PUNTOS 14/);
  });

  it("el papelito usa el mismo tipo de programa con otros números", () => {
    assert.deepEqual(ejecutar(cierre.primero).puntos, [5, 10, 10]);
    assert.deepEqual(ejecutar(cierre.segundo).puntos, [6, 8, 8]);
    assert.equal(valorAntesDe(cierre.primero, "Duplicar"), 5);
    assert.equal(valorAntesDe(cierre.segundo, "Duplicar"), 3);
    assert.equal(mostro(cierre.sumas[0]), mostro(cierre.sumas[1]));
    assert.notEqual(cierre.primero.inicial.PUNTOS, programaA.inicial.PUNTOS, "no se copia de la hoja");
  });

  it("la idea y la conclusión hablan de posibilidad, no de absolutos", () => {
    assert.match(ideaInicial, /a veces cambia lo que se muestra y a veces no/);
    assert.doesNotMatch(`${ideaInicial} ${conclusion}`, /siempre|nunca/i);
  });
});

describe("Cuándo importa el orden: hoja en el folio (impresión)", () => {
  const html = () => readDist("cuando-importa-el-orden", "index.html");
  /** Lo que se imprime: la referencia común y la hoja de papel. */
  const papel = () => {
    const { document } = new JSDOM(html()).window;
    return { document, texto: normalizar(`${document.querySelector(".referencia").textContent} ${document.querySelector(".papel").textContent}`) };
  };

  it("muestra los programas y las consignas, en su orden de ejecución y sin la clave", () => {
    const { texto } = papel();
    for (const c of consignasFrente) assert.ok(texto.includes(normalizar(c.texto)), `consigna ${c.numero}`);
    for (const c of consignasDorso) assert.ok(texto.includes(normalizar(c.texto)), `consigna ${c.numero}`);
    for (const programa of [...Object.values(frente), ...consignasDorso.map((c) => c.programa)]) {
      for (const instruccion of programa.instrucciones) assert.ok(texto.includes(instruccion.texto), instruccion.texto);
    }
    for (const { verbo } of verbos) assert.ok(texto.includes(verbo));
    for (const paso of rutina) assert.ok(texto.includes(paso));
    assert.doesNotMatch(textoVisible(html()), NOTACION_ORDEN);
    assert.ok(!/\bClave\b/.test(textoVisible(html())));
    assert.ok(!texto.includes(normalizar(conclusion)), "la conclusión se escribe en el pizarrón después de comparar");
  });

  it("no se escribe: avisa que todo va a la carpeta y no tiene casilleros en blanco", () => {
    const { document } = papel();
    const hoja = document.querySelector(".papel");
    assert.match(document.querySelector(".consigna-general").textContent, /no se escribe.*carpeta/);
    assert.equal(hoja.querySelectorAll(".linea, input, textarea, .casilla").length, 0);
    const tablas = [...hoja.querySelectorAll("table.seguimiento")];
    assert.equal(tablas.length, 3, "los ejemplos resueltos: dos en el frente y uno con dos casilleros en el dorso");
    for (const tabla of tablas) {
      for (const celda of tabla.querySelectorAll("td")) assert.notEqual(celda.textContent.trim(), "", "tabla resuelta");
    }
    assert.equal(hoja.querySelectorAll(".carpeta").length, 2, "muestra cómo anotar en la carpeta, con uno y con dos casilleros");
  });

  it("marca la pausa para comparar en común después de A y B", () => {
    const { texto } = papel();
    const pausa = texto.indexOf("comparamos A y B entre todos");
    assert.ok(pausa > texto.indexOf(normalizar(consignasFrente[2].texto)));
    assert.ok(pausa < texto.indexOf(normalizar(consignasFrente[3].texto)));
  });

  it("el dorso «Para seguir» tiene un ejemplo con dos casilleros y respuestas para comprobar, sin texto rotado", () => {
    const { document } = papel();
    const dorso = document.querySelector(".papel .dorso");
    assert.match(dorso.querySelector("h2").textContent, /^Para seguir$/);
    assert.doesNotMatch(dorso.textContent, /avanzad|nivel [0-9]|difícil/i, "sin rótulos de nivel");
    assert.deepEqual(ejecutar(ejemploMonedas).estados.map((e) => `${e.PUNTOS}/${e.MONEDAS}`), ["3/2", "3/0", "3/0"]);
    const comprobar = normalizar(dorso.querySelector(".comprobar").textContent);
    assert.match(comprobar, /^Para comprobar, cuando termines/);
    for (const c of consignasDorso) assert.ok(comprobar.toLowerCase().includes(`${c.numero}. ${c.respuesta}.`.toLowerCase()), `respuesta ${c.numero}`);
    assert.doesNotMatch(cssDe(html()), /rotate\(/, "nada de texto dado vuelta, ni en pantalla ni en papel");
  });

  it("un solo contexto y nada de condiciones ni repeticiones", () => {
    for (const ruta of [
      ["cuando-importa-el-orden", "index.html"],
      ["cuando-importa-el-orden", "respuestas", "index.html"],
      ["pizarrones", "seguir-un-programa-paso-a-paso", "index.html"],
    ]) {
      const texto = textoVisible(readDist(...ruta).replace(/<footer[\s\S]*?<\/footer>/g, "").replace(/<nav[\s\S]*?<\/nav>/g, ""));
      assert.doesNotMatch(texto, ADELANTA, ruta.join("/"));
      assert.doesNotMatch(texto, OTROS_CONTEXTOS, ruta.join("/"));
    }
  });

  it("en pantalla se prueba; al imprimir sale la hoja, en oficio doble faz", () => {
    const css = cssDe(html());
    assert.match(css, /@page\{size:216mm 356mm/);
    // El bloque de impresión de esta página: el que oculta la actividad en pantalla.
    const impresion = css.slice(css.search(/@media print\{(?:(?!@media)[\s\S])*\.web\[data-astro-cid-/));
    assert.match(css, /\.papel\[data-astro-cid-[^\]]+\]\{display:none\}/, "en pantalla no se ve la hoja de papel");
    assert.match(impresion, /\.web\[data-astro-cid-[^\]]+\]\{display:none!important/);
    assert.match(impresion, /\.papel\[data-astro-cid-[^\]]+\]\{display:block\}/);
    assert.match(impresion, /\.hoja-pdf\[data-astro-cid-[^\]]+\][^{]*\{display:none!important/);
    assert.match(impresion, /\.dorso\[data-astro-cid-[^\]]+\]\{break-before:page/);
  });
});

describe("Cuándo importa el orden: probar órdenes en pantalla", () => {
  const html = () => readDist("cuando-importa-el-orden", "index.html");

  function pagina() {
    const { document, Event } = new JSDOM(html()).window;
    iniciarProbadores(document);
    const probador = (id) => {
      const raiz = document.querySelector(`[data-probador="${id}"]`);
      const q = (selector) => raiz.querySelector(selector);
      return {
        raiz,
        q,
        orden: () => [...raiz.querySelectorAll(".orden-texto")].map((e) => e.textContent),
        predecir(valor) {
          q("[data-prediccion]").value = valor;
          q("[data-prediccion]").dispatchEvent(new Event("input"));
        },
        ejecutarTodo() {
          while (!q("[data-siguiente]").disabled) q("[data-siguiente]").click();
        },
        mover(texto, direccion) {
          const item = [...raiz.querySelectorAll("li[data-instruccion]")].find((li) => li.textContent.includes(texto));
          item.querySelector(direccion === "subir" ? "[data-subir]" : "[data-bajar]").click();
        },
        devolucion: () => normalizar(q("[data-devolucion]").textContent),
        historial: () => [...raiz.querySelectorAll("[data-historial] li")].map((li) => normalizar(li.textContent)),
      };
    };
    return { document, probador };
  }

  it("tres probadores con el mismo juego que la hoja: arreglar B, dos sumas y, para seguir, dos casilleros", () => {
    assert.deepEqual(probadores.map((p) => p.id), ["arreglar", "siempre-cambia", "dos-casilleros"]);
    assert.equal(probadores[0].programa, programaB);
    assert.equal(probadores[1].programa, programaC);
    const { probador } = pagina();
    assert.deepEqual(probador("arreglar").orden(), programaB.instrucciones.map((i) => i.texto));
    for (const id of ["arreglar", "siempre-cambia"]) {
      const fija = probador(id).raiz.querySelector("li.fija");
      assert.match(fija.textContent, /Mostrar PUNTOS\./);
      assert.equal(fija.querySelector("button"), null, "«Mostrar» queda al final en el núcleo");
    }
    assert.equal(probador("dos-casilleros").raiz.querySelectorAll("li.fija").length, 0, "para seguir, también se mueve «Mostrar»");
  });

  it("cada desafío se puede lograr con algún orden", () => {
    for (const p of probadores) {
      for (const desafio of p.desafios) {
        const logrado = permutaciones(p.programa.instrucciones).some((instrucciones) => {
          const r = ejecutar({ ...p.programa, instrucciones });
          return desafio.cumple({ muestra: r.mostrado, memoria: r.estados.at(-1) });
        });
        assert.ok(logrado, desafio.texto);
      }
    }
  });

  it("sin predicción no se ejecuta; ejecutado, compara con la predicción y dice qué valor usó «Duplicar»", () => {
    const { probador } = pagina();
    const p = probador("arreglar");
    assert.equal(p.q("[data-siguiente]").disabled, true);
    assert.match(p.q("[role=status]").textContent, /Escribí tu predicción/);
    p.predecir("14");
    p.q("[data-siguiente]").click();
    assert.equal(p.q("[data-prediccion]").readOnly, true, "la predicción no se cambia a mitad de camino");
    p.ejecutarTodo();
    const valores = [...p.raiz.querySelectorAll("tbody tr:not(.fila-inicial) td")].map((td) => td.textContent.trim());
    assert.deepEqual(valores, ["8", "11", "11"]);
    assert.equal(p.q("tfoot td").textContent.trim(), "11");
    assert.match(p.devolucion(), /La pantalla mostró 11; tu predicción era 14/);
    assert.match(p.devolucion(), /primera fila/);
    assert.match(p.devolucion(), /Cuando se ejecutó «Duplicar PUNTOS», PUNTOS valía 4\./);
    assert.match(p.q("[data-desafio]").textContent, /Pendiente/);
  });

  it("cambiar el orden reinicia la ejecución; al arreglarlo se logra el desafío y el historial compara", () => {
    const { probador } = pagina();
    const p = probador("arreglar");
    p.predecir("11");
    p.ejecutarTodo();
    assert.match(p.devolucion(), /coincide con tu predicción/);
    p.mover("Sumarle 3", "subir");
    assert.deepEqual(p.orden(), ["Sumarle 3 a PUNTOS.", "Duplicar PUNTOS.", "Mostrar PUNTOS."]);
    assert.equal(p.q("[data-prediccion]").value, "", "un programa nuevo pide una predicción nueva");
    assert.equal(p.q("tfoot td").textContent.trim(), "");
    assert.match(p.raiz.querySelector("tbody tr:nth-child(2) th").textContent, /Sumarle 3 a PUNTOS/);
    p.predecir("14");
    p.ejecutarTodo();
    assert.match(p.devolucion(), /PUNTOS valía 7\./);
    assert.match(p.devolucion(), /Los 2 órdenes que probaste no mostraron lo mismo/);
    assert.match(p.q("[data-desafio]").className, /cumplido/);
    assert.deepEqual(p.historial(), [
      "Duplicar PUNTOS · Sumarle 3 a PUNTOS · Mostrar PUNTOS → mostró 11",
      "Sumarle 3 a PUNTOS · Duplicar PUNTOS · Mostrar PUNTOS → mostró 14",
    ]);
  });

  it("con dos sumas, los dos órdenes muestran lo mismo", () => {
    const { probador } = pagina();
    const p = probador("siempre-cambia");
    p.predecir("8");
    p.ejecutarTodo();
    p.mover("Sumarle 1", "subir");
    p.predecir("8");
    p.ejecutarTodo();
    assert.match(p.devolucion(), /Los 2 órdenes que probaste mostraron lo mismo/);
    assert.equal(p.historial().length, 2);
  });

  it("para seguir: mover «Mostrar» separa lo que se ve de lo que queda en PUNTOS", () => {
    const { probador } = pagina();
    const p = probador("dos-casilleros");
    p.mover("Mostrar PUNTOS", "subir");
    p.predecir("7");
    p.ejecutarTodo();
    assert.equal(p.q("tfoot td").textContent.trim(), "7");
    assert.match(p.historial()[0], /mostró 7 \(al final, PUNTOS = 14, MONEDAS = 0\)/);
    const desafios = [...p.raiz.querySelectorAll("[data-desafio]")];
    assert.match(desafios[2].className, /cumplido/);
    assert.doesNotMatch(desafios[0].className, /cumplido/);
  });

  it("sin JavaScript explica que hace falta y muestra el programa, sin controles inactivos", () => {
    const { document } = new JSDOM(html()).window;
    for (const raiz of document.querySelectorAll("[data-probador]")) {
      assert.equal(raiz.querySelector("[data-sin-js]").hidden, false);
      assert.ok([...raiz.querySelectorAll("[data-con-js]")].every((e) => e.hidden));
      assert.ok(raiz.querySelectorAll(".orden-texto").length >= 3);
    }
  });
});

describe("Cuándo importa el orden: pizarrón", () => {
  const html = () => readDist("pizarrones", "seguir-un-programa-paso-a-paso", "index.html");

  it("presenta el ejemplo de la hoja en dos órdenes, con la rutina, los verbos y un enlace para continuar", () => {
    const { document } = new JSDOM(html()).window;
    assert.ok(document.body.textContent.includes(preguntaInicial));
    assert.equal(document.querySelectorAll("[data-ejecucion]").length, 2);
    const referencia = document.querySelector(".referencia").textContent;
    for (const paso of rutina) assert.ok(referencia.includes(paso));
    assert.match(referencia, /después/);
    assert.doesNotMatch(document.querySelector("main, body").textContent, /En la carpeta/, "la carpeta se explica en la hoja");
    assert.ok(document.querySelector('.continuar a[href="/cuando-importa-el-orden/"]'));
    assert.ok(!document.body.textContent.includes(conclusion), "deja la síntesis en la guía");
  });

  it("cierra la comparación con lo que mostró cada programa y por qué", () => {
    const { document } = new JSDOM(html()).window;
    const cierre = normalizar(document.querySelector("[data-comparacion]").textContent);
    assert.ok(cierre.includes(`Primero sumar → muestra ${mostro(ejemplo.primero)} (duplica ${valorAntesDe(ejemplo.primero, "Duplicar")})`));
    assert.ok(cierre.includes(`Primero duplicar → muestra ${mostro(ejemplo.segundo)} (duplica ${valorAntesDe(ejemplo.segundo, "Duplicar")})`));
    assert.match(cierre, /«Duplicar» usa el valor que hay en ese momento\./);
    assert.match(cierre, /El orden de las instrucciones puede cambiar lo que se muestra\./);
    assert.doesNotMatch(cierre, /siempre|nunca/i);
  });

  it("lo que no es control de la web se puede copiar al pizarrón: líneas breves", () => {
    const { document } = new JSDOM(html()).window;
    const contenido = document.querySelector(".ejecuciones").closest("article, main, body");
    const bloques = [...contenido.querySelectorAll("p, li, dd")]
      .filter((el) => !el.closest(".controles, .continuar, .leyenda, nav, header, footer"));
    assert.ok(bloques.length > 10);
    for (const el of bloques) {
      const texto = normalizar(el.textContent);
      assert.ok(texto.length <= 90, `demasiado largo para copiar: «${texto}»`);
    }
  });

  it("la pantalla no es una columna: va aparte, en la última fila", () => {
    const { document } = new JSDOM(html()).window;
    for (const tabla of document.querySelectorAll("[data-ejecucion] table")) {
      assert.deepEqual([...tabla.querySelectorAll("thead th")].map((th) => th.textContent), ["Después de ejecutar", "PUNTOS"]);
      assert.match(tabla.querySelector("tfoot").textContent, /La pantalla mostró/);
    }
  });

  it("sin JavaScript conserva las dos trazas completas y oculta controles inactivos", () => {
    const { window } = new JSDOM(html());
    const { document } = window;
    const estilo = document.createElement("style");
    estilo.textContent = cssDe(html());
    document.head.append(estilo);
    const tablas = [...document.querySelectorAll("[data-ejecucion] table")];
    assert.deepEqual(tablas.map((t) => t.querySelector("tfoot td").textContent.trim()), ["6", "5"]);
    assert.equal(document.querySelectorAll(".pendiente").length, 0);
    assert.ok([...document.querySelectorAll(".controles")].every((e) => e.hidden));
    assert.ok([...document.querySelectorAll("[data-ejecucion] .valor")].every((e) => window.getComputedStyle(e).visibility === "visible"));
  });

  it("con JavaScript oculta las respuestas antes de cargar el módulo y sólo revela el paso ejecutado", () => {
    // JSDOM no ejecuta módulos; permite comprobar el estado anterior a su carga.
    const { window } = new JSDOM(html(), { runScripts: "dangerously" });
    const { document } = window;
    const estilo = document.createElement("style");
    estilo.textContent = cssDe(html().replace(/<noscript>[\s\S]*?<\/noscript>/g, ""));
    document.head.append(estilo);
    const valores = [...document.querySelectorAll("[data-ejecucion] .valor")];
    assert.ok(valores.every((e) => window.getComputedStyle(e).visibility === "hidden"));
    iniciarSeguimiento(document);
    assert.ok(valores.every((e) => window.getComputedStyle(e).visibility === "hidden"));
    document.querySelector("[data-siguiente]").click();
    assert.equal(valores.filter((e) => window.getComputedStyle(e).visibility === "visible").length, 1);
  });

  it("permite predecir, ejecutar cada orden por separado y ver la pantalla recién al mostrar", () => {
    const { document } = new JSDOM(html()).window;
    iniciarSeguimiento(document);
    const paneles = [...document.querySelectorAll("[data-ejecucion]")];
    const comparacion = document.querySelector("[data-comparacion]");
    assert.equal(comparacion.hidden, true);
    const trazas = [["3", "6", "6"], ["4", "5", "5"]];
    for (const [i, panel] of paneles.entries()) {
      const pantalla = panel.querySelector("tfoot tr");
      assert.ok(pantalla.classList.contains("pendiente"));
      for (let paso = 0; paso < 3; paso++) {
        panel.querySelector("[data-siguiente]").click();
        const actual = panel.querySelector('[aria-current="step"]');
        assert.equal(actual.querySelector("td").textContent.trim(), trazas[i][paso]);
        assert.equal(pantalla.classList.contains("pendiente"), paso < 2, "la pantalla aparece con «Mostrar»");
      }
      assert.equal(panel.querySelector("[data-siguiente]").disabled, true);
      if (i === 0) assert.equal(paneles[1].querySelectorAll(".pendiente").length, 4, "el otro orden no avanza solo");
    }
    assert.equal(comparacion.hidden, false);
    paneles[0].querySelector("[data-reiniciar]").click();
    assert.equal(paneles[0].querySelectorAll(".pendiente").length, 4);
    assert.equal(comparacion.hidden, true);
  });

  it("figura en el índice de pizarrones y en la portada", () => {
    assert.match(readDist("pizarrones", "index.html"), /href="\/pizarrones\/seguir-un-programa-paso-a-paso\/"/);
    assert.match(readDist("index.html"), /href="\/pizarrones\/seguir-un-programa-paso-a-paso\/"/);
    assert.match(readDist("index.html"), /href="\/cuando-importa-el-orden\/"/);
  });
});

describe("Cuándo importa el orden: papelito de cierre", () => {
  const html = () => readDist("cuando-importa-el-orden", "respuestas", "index.html");

  it("dos por hoja: cada uno pide nombre, curso y fecha", () => {
    const { document } = new JSDOM(html()).window;
    const papelitos = [...document.querySelectorAll(".papelito")];
    assert.equal(papelitos.length, 2);
    for (const papelito of papelitos) {
      for (const campo of ["Nombre y apellido", "Curso", "Fecha"]) assert.ok(papelito.textContent.includes(campo), campo);
      assert.doesNotMatch(papelito.textContent, /Mistral|bimestre/i, "no se ata a una escuela");
    }
    assert.match(cssDe(html()), /\.papelito\[data-astro-cid-[^\]]+\]\{[^}]*height:169mm/);
  });

  it("registra estados intermedios, lo que se mostró, el valor usado y un sí/no, en blanco", () => {
    const { document } = new JSDOM(html()).window;
    for (const papelito of document.querySelectorAll(".papelito")) {
      const tablas = [...papelito.querySelectorAll("table.seguimiento")];
      assert.equal(tablas.length, 2);
      for (const [i, programa] of [cierre.primero, cierre.segundo].entries()) {
        const filas = [...tablas[i].querySelectorAll("tbody tr")];
        assert.match(filas[0].textContent, /Al empezar\s*3/);
        const sinEspacios = (texto) => texto.replace(/\s+/g, "");
        assert.deepEqual(
          filas.slice(1).map((fila) => sinEspacios(fila.querySelector("th").textContent)),
          programa.instrucciones.map((instruccion, n) => sinEspacios(`${n + 1}. ${instruccion.texto}`)),
        );
        for (const celda of [...tablas[i].querySelectorAll("tbody tr:not(.fila-inicial) td, tfoot td")]) {
          assert.equal(celda.textContent.trim(), "", "para escribir");
        }
      }
      assert.equal(papelito.querySelectorAll(".pregunta .casilla").length, 2);
      assert.ok(papelito.textContent.includes(preguntaSumas));
      assert.match(papelito.querySelector(".marcar").textContent, /Sí\s+No/);
    }
    assert.ok(!/\bClave\b/.test(textoVisible(html())));
  });
});

describe("Cuándo importa el orden: guía docente", () => {
  const texto = () => textoVisible(readDist("cuando-importa-el-orden", "guia", "index.html"));

  it("tiene un solo plan para todos los cursos, breve, con la conclusión", () => {
    const t = texto();
    assert.match(t, /El mismo plan para todos los cursos/);
    assert.doesNotMatch(t, /En los cursos que ya hicieron la apertura/);
    assert.ok(t.includes(normalizar(conclusion)));
    assert.match(t, /primera fila que no coincide/);
    assert.match(t, /Si hay menos tiempo/);
  });

  it("contiene la clave de la hoja, del dorso y del papelito", () => {
    const t = texto();
    assert.ok(t.includes("A: 4 → 7 → 14 → 14 · mostró 14. B: 4 → 8 → 11 → 11 · mostró 11."));
    assert.ok(t.includes("Primer programa: 3 → 5 → 10 → 10 · mostró 10"));
    assert.ok(t.includes("Segundo programa: 3 → 6 → 8 → 8 · mostró 8"));
    assert.ok(t.includes("Se duplica: 5 en el primero y 3 en el segundo. ¿Muestran lo mismo? Sí."));
    for (const c of consignasDorso) {
      assert.ok(t.toLowerCase().includes(`${c.numero}. ${c.respuesta}.`.toLowerCase()), `dorso ${c.numero}`);
    }
  });

  it("la portada la enlaza desde «Para docentes»", () => {
    assert.match(readDist("index.html"), /id="docentes-pc"[\s\S]*?href="\/cuando-importa-el-orden\/guia\/"/);
  });
});

describe("Cuándo importa el orden: PDF finales y visibilidad de la guía", () => {
  const CARPETA = "/materiales/cuando-importa-el-orden/";
  const PDF_HOJA = `${CARPETA}cuando-importa-el-orden-oficio-216x356.pdf`;
  const PDF_GUIA = `${CARPETA}cuando-importa-el-orden-guia-oficio-216x356.pdf`;
  const PDF_PAPELITOS = `${CARPETA}cuando-importa-el-orden-respuestas-oficio-216x356.pdf`;
  const GUIA = "/cuando-importa-el-orden/guia/";
  const partes = (href) => href.split("/").filter(Boolean);

  it("los tres PDF están versionados en public/, en oficio, y llegan al build sin vínculos locales", () => {
    for (const href of [PDF_HOJA, PDF_GUIA, PDF_PAPELITOS]) {
      const fuente = join(root, "public", ...partes(href));
      assert.ok(existsSync(fuente), `Falta ${fuente}`);
      const binario = readFileSync(fuente).toString("latin1");
      assert.ok(binario.startsWith("%PDF-"), href);
      const paginas = binario.match(/\/Type\s*\/Page\b/g)?.length;
      assert.equal(paginas, href === PDF_PAPELITOS ? 1 : 2, `${href}: conserva la paginación para imprimir`);
      const [ancho, alto] = binario.match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)/).slice(1).map(Number);
      assert.ok(Math.abs(ancho - 612) < 2 && Math.abs(alto - 1009) < 2, `${href}: oficio 216 × 356 mm`);
      assert.ok(!binario.includes("localhost"), `${href} no enlaza localhost`);
      assert.ok(existsSync(join(dist, ...partes(href))), `Falta en dist: ${href}`);
    }
  });

  it("cada página enlaza su PDF y la guía enlaza los papelitos", () => {
    assert.ok(readDist("cuando-importa-el-orden", "index.html").includes(`href="${PDF_HOJA}"`));
    const guia = readDist("cuando-importa-el-orden", "guia", "index.html");
    assert.ok(guia.includes(`href="${PDF_GUIA}"`));
    assert.ok(guia.includes('href="/cuando-importa-el-orden/respuestas/"'));
    assert.ok(readDist("cuando-importa-el-orden", "respuestas", "index.html").includes(`href="${PDF_PAPELITOS}"`));
  });

  it("decisión: la guía con la clave no se enlaza desde la experiencia del estudiante", () => {
    assert.ok(!serieCuandoImportaElOrden.materiales.some((material) => material.href === GUIA));
    for (const ruta of [
      ["cuando-importa-el-orden", "index.html"],
      ["pizarrones", "seguir-un-programa-paso-a-paso", "index.html"],
      ["escuelas", "gabriela-mistral", "4-bimestre-2026", "index.html"],
    ]) {
      const html = readDist(...ruta);
      assert.ok(!html.includes(`href="${GUIA}`), `${ruta.join("/")} no enlaza la guía`);
      assert.ok(!html.includes(PDF_GUIA), `${ruta.join("/")} no enlaza el PDF de la guía`);
    }
  });
});

describe("recorrido Gabriela Mistral · 4.º bimestre 2026: secuencia y orden", () => {
  const recorrido = recorridos.find((item) => item.id === "gm-2026-4b");

  function nav(html) {
    const inicio = html.search(/<nav class="recorrido"[^>]*data-recorrido-id="gm-2026-4b"/);
    assert.ok(inicio >= 0, "falta la navegación del recorrido");
    return html.slice(inicio, html.indexOf("</nav>", inicio));
  }

  it("suma el pizarrón y la hoja después del primer tramo", () => {
    assert.deepEqual(
      recorrido.materiales.slice(3, 5).map((material) => material.href),
      ["/pizarrones/seguir-un-programa-paso-a-paso/", "/cuando-importa-el-orden/"],
    );
  });

  it("el pizarrón es el paso 4 y la hoja el 5; después sigue Repetir", () => {
    const piz = nav(readDist("pizarrones", "seguir-un-programa-paso-a-paso", "index.html"));
    assert.match(piz, /Paso 4 de 6/);
    assert.match(piz, /href="\/lo-que-queriamos-y-lo-que-paso\/probar\/\?recorrido=gm-2026-4b"[^>]+rel="prev"/);
    assert.match(piz, /href="\/cuando-importa-el-orden\/\?recorrido=gm-2026-4b"[^>]+rel="next"/);
    const hoja = nav(readDist("cuando-importa-el-orden", "index.html"));
    assert.match(hoja, /Paso 5 de 6/);
    assert.match(hoja, /href="\/repetir\/\?recorrido=gm-2026-4b"[^>]+rel="next"/);
  });

  it("los materiales no quedan atados a la escuela: sin el recorrido no muestran navegación", () => {
    for (const ruta of [
      ["pizarrones", "seguir-un-programa-paso-a-paso", "index.html"],
      ["cuando-importa-el-orden", "index.html"],
      ["cuando-importa-el-orden", "guia", "index.html"],
      ["cuando-importa-el-orden", "respuestas", "index.html"],
    ]) {
      const html = readDist(...ruta);
      const contenido = textoVisible(html.replace(/<nav class="recorrido"[\s\S]*?<\/nav>/g, ""));
      assert.doesNotMatch(contenido, /Mistral|bimestre/i, ruta.join("/"));
    }
  });
});
