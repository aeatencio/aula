import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { iniciarSeguimiento } from "../src/scripts/seguir-programa.ts";
import { recorridos } from "../src/data/recorridos.ts";
import { serieCuandoImportaElOrden } from "../src/data/serie-cuando-importa-el-orden.ts";
import {
  cierre,
  conclusion,
  consignasDorso,
  consignasFrente,
  ejemplo,
  ideaInicial,
  mostro,
  preguntaInicial,
  preguntaSumas,
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

describe("Cuándo importa el orden: hoja en el folio", () => {
  const html = () => readDist("cuando-importa-el-orden", "index.html");

  it("muestra los programas y las consignas, en su orden de ejecución y sin la clave", () => {
    const texto = textoVisible(html());
    for (const c of consignasFrente) assert.ok(texto.includes(normalizar(c.texto)), `consigna ${c.numero}`);
    for (const c of consignasDorso) assert.ok(texto.includes(normalizar(c.texto)), `consigna ${c.numero}`);
    for (const programa of [...Object.values(frente), ...consignasDorso.map((c) => c.programa)]) {
      for (const instruccion of programa.instrucciones) assert.ok(texto.includes(instruccion.texto), instruccion.texto);
    }
    for (const { verbo } of verbos) assert.ok(texto.includes(verbo));
    for (const paso of rutina) assert.ok(texto.includes(paso));
    assert.doesNotMatch(texto, NOTACION_ORDEN);
    assert.ok(!/\bClave\b/.test(texto));
    assert.ok(!texto.includes(normalizar(conclusion)), "la conclusión se escribe en el pizarrón después de comparar");
  });

  it("no se escribe: avisa que todo va a la carpeta y no tiene casilleros en blanco", () => {
    const { document } = new JSDOM(html()).window;
    assert.match(document.querySelector(".consigna-general").textContent, /no se escribe.*carpeta/);
    assert.equal(document.querySelectorAll(".linea, input, textarea, .casilla").length, 0);
    const tablas = [...document.querySelectorAll("table.seguimiento")];
    assert.equal(tablas.length, 2, "sólo el ejemplo resuelto");
    for (const tabla of tablas) {
      for (const celda of tabla.querySelectorAll("td")) assert.notEqual(celda.textContent.trim(), "", "tabla resuelta");
    }
    assert.ok(document.querySelector(".carpeta"), "muestra cómo anotar en la carpeta");
  });

  it("marca la pausa para comparar en común después de A y B", () => {
    const texto = textoVisible(html());
    const pausa = texto.indexOf("comparamos A y B entre todos");
    assert.ok(pausa > texto.indexOf(normalizar(consignasFrente[2].texto)));
    assert.ok(pausa < texto.indexOf(normalizar(consignasFrente[3].texto)));
  });

  it("el dorso «Para seguir» trae sus respuestas cabeza abajo para autocorregirse", () => {
    const { document } = new JSDOM(html()).window;
    const dorso = document.querySelector(".dorso");
    assert.match(dorso.querySelector("h2").textContent, /^Para seguir$/);
    assert.doesNotMatch(dorso.textContent, /avanzad|nivel [0-9]|difícil/i, "sin rótulos de nivel");
    const respuestas = dorso.querySelector(".respuestas-dorso").textContent;
    for (const c of consignasDorso) assert.ok(respuestas.includes(`${c.numero}: ${c.respuesta}`));
    assert.match(cssDe(html()), /\.respuestas-dorso[^{]*span[^{]*\{[^}]*transform:rotate\(180deg\)/);
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

  it("se imprime en oficio doble faz: núcleo en el frente, «Para seguir» en el dorso", () => {
    const css = cssDe(html());
    assert.match(css, /@page\{size:216mm 356mm/);
    const impresion = css.slice(css.indexOf("@media print"));
    assert.match(impresion, /\.hoja-pdf\[data-astro-cid-[^\]]+\][^{]*\{display:none!important/);
    assert.match(impresion, /\.dorso\[data-astro-cid-[^\]]+\]\{break-before:page/);
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
    assert.match(referencia, /carpeta/);
    assert.ok(document.querySelector('.continuar a[href="/cuando-importa-el-orden/"]'));
    assert.ok(!document.body.textContent.includes(conclusion), "deja la síntesis en la guía");
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
      recorrido.materiales.slice(3).map((material) => material.href),
      ["/pizarrones/seguir-un-programa-paso-a-paso/", "/cuando-importa-el-orden/"],
    );
  });

  it("el pizarrón es el paso 4 y la hoja el 5, el último", () => {
    const piz = nav(readDist("pizarrones", "seguir-un-programa-paso-a-paso", "index.html"));
    assert.match(piz, /Paso 4 de 5/);
    assert.match(piz, /href="\/lo-que-queriamos-y-lo-que-paso\/probar\/\?recorrido=gm-2026-4b"[^>]+rel="prev"/);
    assert.match(piz, /href="\/cuando-importa-el-orden\/\?recorrido=gm-2026-4b"[^>]+rel="next"/);
    const hoja = nav(readDist("cuando-importa-el-orden", "index.html"));
    assert.match(hoja, /Paso 5 de 5/);
    assert.doesNotMatch(hoja, /rel="next"/);
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
