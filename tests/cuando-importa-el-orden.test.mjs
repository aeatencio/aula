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
  ajustesKiosco,
  pedido,
  casillerosPapelito,
  conclusion,
  ideaInicial,
  juego,
  kiosco,
  letras,
  numeroOriginal,
  numeroPrueba,
  ordenPedidoCambiado,
  otraVenta,
  pantallaFinal,
  preguntaAjuste,
  preguntaInicial,
  preguntaMemoriaYPantalla,
  preguntaPorQue,
  preguntas,
  seguir,
  seguirAjuste,
  versiones,
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
  Ejecutores escritos aparte de los datos, para que la clave no se valide
  contra sí misma. Devuelven la memoria final y lo que se mostró.
*/
function nivel(orden, puntos = 40, monedas = 5) {
  let mostrado;
  for (const n of orden) {
    if (n === 1) puntos += monedas * 10;
    if (n === 2) monedas = 0;
    if (n === 3) puntos *= 2;
    if (n === 4) mostrado = puntos;
  }
  return { puntos, monedas, mostrado };
}

function kioscoA(orden, stock, venta, mostrarMenos3 = false) {
  let mostrado;
  for (const n of orden) {
    if (n === 1) mostrado = mostrarMenos3 ? stock - 3 : stock;
    if (n === 2) stock -= venta;
    if (n === 3) venta = 0;
  }
  return mostrado;
}

const permutaciones = (xs) =>
  xs.length <= 1
    ? [xs]
    : xs.flatMap((x, i) => permutaciones([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));

describe("Cuándo importa el orden: programas y clave", () => {
  it("el programa del nivel y sus versiones dan lo que dice la clave", () => {
    assert.equal(pantallaFinal(seguir(juego)), 180);
    assert.equal(nivel([1, 2, 3, 4]).mostrado, 180);
    const esperado = { v1: 180, v2: 80, v3: 130, v4: 90 };
    for (const version of versiones) {
      const filas = seguir(juego, version.orden);
      assert.equal(pantallaFinal(filas), esperado[version.id], version.id);
      assert.equal(pantallaFinal(filas), nivel(version.orden).mostrado, version.id);
      assert.deepEqual(filas.at(-1).memoria, {
        PUNTOS: nivel(version.orden).puntos,
        MONEDAS: nivel(version.orden).monedas,
      });
    }
  });

  it("una versión no cambia el resultado y las otras tres sí, cada una con otro valor", () => {
    const mostrados = versiones.map((version) => nivel(version.orden).mostrado);
    assert.equal(mostrados.filter((valor) => valor === 180).length, 1, "sólo una versión muestra lo mismo");
    assert.equal(new Set(mostrados).size, 4, "las versiones distintas dan valores distintos");
  });

  it("en la versión 4 la memoria y la pantalla no coinciden", () => {
    const v4 = versiones.find((version) => version.id === "v4");
    const { puntos, mostrado } = nivel(v4.orden);
    assert.equal(puntos, 180);
    assert.equal(mostrado, 90);
    const respuesta = preguntaMemoriaYPantalla.opciones[preguntaMemoriaYPantalla.respuesta];
    assert.equal(respuesta, `PUNTOS vale ${puntos} y la pantalla mostró ${mostrado}.`);
  });

  it("del kiosco, sólo el ajuste A sirve para cualquier valor de VENTA", () => {
    assert.equal(kioscoA([1, 2, 3], 12, 3), 12, "como está, muestra 12");
    assert.equal(pantallaFinal(seguir(kiosco)), 12);
    for (const letra of letras) {
      const { orden } = ajustesKiosco[letra];
      const conC = letra === "C";
      for (const venta of [3, 5]) {
        assert.equal(
          pantallaFinal(seguirAjuste(letra, { STOCK: 12, VENTA: venta })),
          kioscoA(orden, 12, venta, conC),
          `${letra} con VENTA = ${venta}`,
        );
      }
    }
    const sirve = (letra) =>
      [1, 3, 5, 7].every(
        (venta) => pantallaFinal(seguirAjuste(letra, { STOCK: 12, VENTA: venta })) === 12 - venta,
      );
    assert.deepEqual(letras.filter(sirve), ["A"]);
    assert.equal(preguntaAjuste.respuesta, "A");
  });

  it("el distractor C acierta con la venta del caso y falla con la de la prueba", () => {
    assert.equal(pantallaFinal(seguirAjuste("C")), 9);
    assert.equal(pantallaFinal(seguirAjuste("C", otraVenta)), 9);
    assert.equal(pantallaFinal(seguirAjuste("A", otraVenta)), 12 - otraVenta.VENTA);
    assert.notEqual(otraVenta.VENTA, kiosco.inicial.VENTA, "la prueba usa otra venta");
  });

  it("ningún otro ajuste ofrecido es un orden correcto del kiosco", () => {
    const correctos = permutaciones([1, 2, 3]).filter((orden) => kioscoA(orden, 12, 3) === 9);
    assert.deepEqual(correctos, [
      [2, 1, 3],
      [2, 3, 1],
    ]);
    assert.ok(!["B", "D"].some((letra) => correctos.some((o) => o.join() === ajustesKiosco[letra].orden.join())));
  });

  it("el pedido del pizarrón: como está calcula 3 empanadas; con 1 y 2 intercambiadas, 2", () => {
    assert.equal(pantallaFinal(seguir(pedido)), 2400);
    assert.equal(pantallaFinal(seguir(pedido, ordenPedidoCambiado)), 1600);
  });

  it("las preguntas para elegir tienen cuatro opciones, una devolución por cada error y respuestas variadas", () => {
    for (const pregunta of preguntas) {
      assert.deepEqual(Object.keys(pregunta.opciones), [...letras], pregunta.id);
      assert.deepEqual(
        Object.keys(pregunta.siEligieron).sort(),
        letras.filter((letra) => letra !== pregunta.respuesta),
        pregunta.id,
      );
      assert.ok(pregunta.porque.length > 0, pregunta.id);
    }
    assert.equal(new Set(preguntas.map((pregunta) => pregunta.respuesta)).size, preguntas.length);
  });

  it("las consignas se numeran del 1 al 9 en el orden de la hoja, igual que el papelito", () => {
    const numeros = [
      numeroOriginal,
      ...versiones.map((version) => version.numero),
      ...preguntas.map((pregunta) => pregunta.numero),
      numeroPrueba,
    ].sort((a, b) => a - b);
    assert.deepEqual(numeros, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const papelito = casillerosPapelito.flatMap((cara) => cara.casilleros);
    assert.deepEqual(papelito.map((c) => c.numero), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(
      papelito.filter((c) => c.tipo === "letra").map((c) => c.numero),
      preguntas.map((pregunta) => pregunta.numero),
    );
    assert.equal(preguntaPorQue.numero, 4, "la pregunta del porqué queda en el frente");
  });

  it("la idea inicial no da la regla; la conclusión la da como posibilidad, no como absoluto", () => {
    assert.equal(preguntaInicial, "¿Cuándo cambiar el orden cambia el resultado?");
    assert.match(ideaInicial, /a veces cambia el resultado y a veces no/);
    assert.doesNotMatch(ideaInicial, /usa un valor que otra cambia/);
    assert.match(conclusion, /^Cambiar el orden puede cambiar el resultado cuando una instrucción usa un valor que otra cambia\./);
    assert.match(conclusion, /los cambios posteriores en la memoria no actualizan la pantalla/);
    assert.doesNotMatch(conclusion, /siempre|nunca/i);
  });
});

/** Sólo secuencia y orden: ni condiciones ni repeticiones. */
const ADELANTA = /\bentonces\b|repet|\bpor cada\b|\bcada vez\b|\bhasta que\b|\bmientras que\b/i;

describe("Cuándo importa el orden: hoja del estudiante", () => {
  const html = () => readDist("cuando-importa-el-orden", "index.html");

  it("muestra los programas, las versiones y las opciones, pero no la clave", () => {
    const texto = textoVisible(html());
    for (const programa of [juego, kiosco]) {
      for (const instruccion of programa.instrucciones) {
        assert.ok(texto.includes(normalizar(instruccion.texto)), instruccion.texto);
      }
    }
    for (const version of versiones) {
      assert.ok(texto.includes(`${version.nombre}: ${version.orden.join(" · ")}.`), version.id);
    }
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
    assert.ok(!texto.includes(normalizar(conclusion)), "la conclusión no se anticipa en la hoja");
    assert.ok(texto.includes(normalizar(ideaInicial)));
  });

  it("las tablas están en blanco: sólo la fila inicial tiene valores", () => {
    const { document } = new JSDOM(html()).window;
    const tablas = [...document.querySelectorAll("table.seguimiento")];
    assert.equal(tablas.length, 6, "original, cuatro versiones y la prueba del kiosco");
    for (const tabla of tablas) {
      const filas = [...tabla.querySelectorAll("tbody tr")];
      assert.match(filas[0].textContent, /Al empezar/);
      for (const fila of filas.slice(1)) {
        for (const celda of fila.querySelectorAll("td")) {
          assert.equal(celda.textContent.trim(), "", "celda para completar");
        }
      }
    }
    const v3 = versiones.find((version) => version.id === "v3");
    assert.match(textoVisible(html()), new RegExp(`${v3.numero}\\. ${v3.nombre}: [^?]+predecí`));
    assert.match(textoVisible(html()), /Predicción: la pantalla muestra/);
  });

  it("no adelanta condiciones ni repeticiones", () => {
    assert.doesNotMatch(textoVisible(html()), ADELANTA);
    assert.doesNotMatch(textoVisible(readDist("pizarrones", "seguir-un-programa-paso-a-paso", "index.html")), ADELANTA);
  });

  it("se imprime en oficio doble faz, sin el aviso del PDF", () => {
    const css = cssDe(html());
    assert.match(css, /@page\{size:216mm 356mm/);
    const impresion = css.slice(css.indexOf("@media print"));
    assert.match(impresion, /\.hoja-pdf\[data-astro-cid-[^\]]+\][^{]*\{display:none!important/);
    assert.match(impresion, /\.dorso\[data-astro-cid-[^\]]+\]\{break-before:page/);
  });
});

describe("Cuándo importa el orden: pizarrón", () => {
  const html = () => readDist("pizarrones", "seguir-un-programa-paso-a-paso", "index.html");

  it("presenta el problema y dos órdenes, con una referencia textual y un enlace para continuar", () => {
    const { document } = new JSDOM(html()).window;
    assert.ok(document.body.textContent.includes(preguntaInicial));
    assert.equal(document.querySelectorAll("[data-ejecucion]").length, 2);
    assert.match(document.querySelector(".referencia").textContent, /después/);
    assert.match(document.querySelector(".referencia").textContent, /no significa que se borre/);
    assert.ok(document.querySelector('.continuar a[href="/cuando-importa-el-orden/"]'));
    assert.equal(document.querySelector("details"), null, "no representa momentos de clase con un cierre plegado");
    assert.ok(!document.body.textContent.includes(conclusion), "deja la síntesis en la guía");
  });

  it("sin JavaScript conserva las dos trazas completas y oculta controles inactivos", () => {
    const { document } = new JSDOM(html()).window;
    const tablas = [...document.querySelectorAll("[data-ejecucion] table")];
    assert.deepEqual(tablas.map(t => t.querySelector("tbody tr:last-child td:last-child").textContent), ["2.400", "1.600"]);
    assert.equal(document.querySelectorAll(".pendiente").length, 0);
    assert.ok([...document.querySelectorAll(".controles")].every(e => e.hidden));
  });

  it("permite predecir, ejecutar cada orden por separado y reiniciar sin conservar resultados", () => {
    const { document } = new JSDOM(html()).window;
    iniciarSeguimiento(document);
    const paneles = [...document.querySelectorAll("[data-ejecucion]")];
    const comparacion = document.querySelector("[data-comparacion]");
    for (const panel of paneles) {
      assert.equal(panel.querySelectorAll(".pendiente").length, 3);
      assert.equal(panel.querySelector(".controles").hidden, false);
      assert.equal(panel.querySelector("[data-reiniciar]").disabled, true);
    }
    assert.equal(comparacion.hidden, true);

    const trazas = [
      [["3", "0", ""], ["3", "2.400", ""], ["3", "2.400", "2.400"]],
      [["2", "1.600", ""], ["3", "1.600", ""], ["3", "1.600", "1.600"]],
    ];
    for (const [i, panel] of paneles.entries()) {
      for (let paso = 0; paso < 3; paso++) {
        panel.querySelector("[data-siguiente]").click();
        assert.equal(panel.querySelectorAll(".pendiente").length, 2 - paso);
        const actual = panel.querySelector('[aria-current="step"]');
        assert.deepEqual([...actual.querySelectorAll("td")].map(td => td.textContent.trim()), trazas[i][paso]);
        assert.ok([...actual.querySelectorAll("td")].every(td => !td.hasAttribute("aria-label")));
      }
      assert.equal(panel.querySelector("[data-siguiente]").disabled, true);
      if (i === 0) {
        assert.equal(paneles[1].querySelectorAll(".pendiente").length, 3, "el otro orden no avanza solo");
        assert.equal(comparacion.hidden, true);
      }
    }
    assert.equal(comparacion.hidden, false);
    paneles[0].querySelector("[data-reiniciar]").click();
    assert.equal(paneles[0].querySelectorAll(".pendiente").length, 3);
    assert.equal(paneles[0].querySelectorAll(".actual").length, 0);
    assert.equal(paneles[0].querySelector("[data-siguiente]").disabled, false);
    assert.equal(paneles[1].querySelectorAll(".pendiente").length, 0);
    assert.equal(comparacion.hidden, true);
  });

  it("figura en el índice de pizarrones y en la portada", () => {
    assert.match(readDist("pizarrones", "index.html"), /href="\/pizarrones\/seguir-un-programa-paso-a-paso\/"/);
    assert.match(readDist("index.html"), /href="\/pizarrones\/seguir-un-programa-paso-a-paso\/"/);
    assert.match(readDist("index.html"), /href="\/cuando-importa-el-orden\/"/);
  });
});

describe("Cuándo importa el orden: guía docente", () => {
  const texto = () => textoVisible(readDist("cuando-importa-el-orden", "guia", "index.html"));

  it("contiene la clave completa y las respuestas del papelito", () => {
    const t = texto();
    assert.match(t, /Clave/);
    for (const pregunta of preguntas) {
      assert.ok(
        t.includes(`${pregunta.numero}. ${pregunta.respuesta} ${normalizar(pregunta.opciones[pregunta.respuesta])}`),
        `${pregunta.id}: respuesta`,
      );
      assert.ok(t.includes(normalizar(pregunta.porque)), `${pregunta.id}: explicación`);
    }
    assert.ok(t.includes("Papelito: 1: 180 2: 180 3: 80 4: C 5: 130 6: 90 7: D 8: A 9: 7"));
  });

  it("tiene los dos recorridos y la conclusión", () => {
    const t = texto();
    assert.match(t, /En los cursos que ya hicieron la apertura/);
    assert.match(t, /En los cursos que no tuvieron la apertura/);
    assert.ok(t.includes(normalizar(conclusion)));
  });

  it("la portada la enlaza desde «Para docentes»", () => {
    assert.match(readDist("index.html"), /id="docentes-pc"[\s\S]*?href="\/cuando-importa-el-orden\/guia\/"/);
  });
});

describe("Cuándo importa el orden: papelitos", () => {
  it("cada papelito pide nombre, curso y fecha y tiene un casillero vacío por consigna, por cara", () => {
    const html = readDist("cuando-importa-el-orden", "respuestas", "index.html");
    const { document } = new JSDOM(html).window;
    const papelitos = [...document.querySelectorAll(".papelito")];
    assert.equal(papelitos.length, 12);
    for (const papelito of papelitos) {
      const texto = papelito.textContent;
      for (const campo of ["Nombre y apellido", "Curso", "Fecha"]) assert.ok(texto.includes(campo), campo);
      assert.doesNotMatch(texto, /Mistral|bimestre/i, "no se ata a una escuela");
      const caras = [...papelito.querySelectorAll(".cara")];
      assert.deepEqual(caras.map((cara) => cara.querySelector(".cara-nombre").textContent), ["Frente", "Dorso"]);
      assert.deepEqual(
        caras.map((cara) => [...cara.querySelectorAll(".numero")].map((n) => n.textContent)),
        [
          ["1", "2", "3", "4"],
          ["5", "6", "7", "8", "9"],
        ],
      );
      for (const casilla of papelito.querySelectorAll(".casilla")) assert.equal(casilla.textContent, "");
    }
    assert.ok(!/\bClave\b/.test(textoVisible(html)));
  });
});

describe("Cuándo importa el orden: PDF finales y visibilidad de la guía", () => {
  const CARPETA = "/materiales/cuando-importa-el-orden/";
  const PDF_HOJA = `${CARPETA}cuando-importa-el-orden-oficio-216x356.pdf`;
  const PDF_GUIA = `${CARPETA}cuando-importa-el-orden-guia-oficio-216x356.pdf`;
  const PDF_PAPELITOS = `${CARPETA}cuando-importa-el-orden-respuestas-oficio-216x356.pdf`;
  const GUIA = "/cuando-importa-el-orden/guia/";
  const partes = (href) => href.split("/").filter(Boolean);

  it("los tres PDF están versionados en public/ y llegan al build, sin vínculos locales", () => {
    for (const href of [PDF_HOJA, PDF_GUIA, PDF_PAPELITOS]) {
      const fuente = join(root, "public", ...partes(href));
      assert.ok(existsSync(fuente), `Falta ${fuente}`);
      const binario = readFileSync(fuente);
      assert.equal(binario.subarray(0, 5).toString("latin1"), "%PDF-", href);
      const paginas = binario.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length;
      assert.equal(paginas, href === PDF_PAPELITOS ? 1 : 2, `${href}: conserva la paginación para imprimir`);
      assert.ok(!binario.toString("latin1").includes("localhost"), `${href} no enlaza localhost`);
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
