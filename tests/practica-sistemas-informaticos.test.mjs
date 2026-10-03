import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { paraLlevarte, unidades } from "../src/data/practica-microondas.ts";
import {
  crearPractica,
  iniciarPracticaMicroondas,
  resumirRevision,
} from "../src/scripts/practica-microondas.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const RUTA = ["practicar-sistemas-informaticos", "index.html"];

// Copia de terminos_resguardo de tmp/issue-12-preparacion-interactiva/casos-a-evitar.json.
// Es sólo una alarma de coincidencias literales con casos de A, B y del corpus:
// no prueba independencia del razonamiento.
const RESGUARDO = [
  "huella",
  "riego",
  "humedad",
  "estacionamiento",
  "barrera",
  "biblioteca",
  "préstamo",
  "joystick",
  "ascensor",
  "traductor",
  "robot",
  "saldo",
  "cuaderno",
  "luna",
  "termostato",
];

const PERSISTENCIA =
  /localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|\bfetch\s*\(|XMLHttpRequest/;

const PAPELES = ["entrada", "operacion", "estado", "salida"];

function readDist(...parts) {
  const path = join(dist, ...parts);
  assert.ok(existsSync(path), `Falta ${path}. Ejecutá npm run build.`);
  return readFileSync(path, "utf8");
}

/** Devuelve el elemento completo que abre en `inicio`, contando etiquetas del mismo tipo. */
function elementoDesde(html, inicio, etiqueta) {
  const patron = new RegExp(`<${etiqueta}\\b|</${etiqueta}>`, "g");
  patron.lastIndex = inicio;
  let profundidad = 0;
  for (let m = patron.exec(html); m; m = patron.exec(html)) {
    profundidad += m[0].startsWith("</") ? -1 : 1;
    if (profundidad === 0) return html.slice(inicio, m.index + m[0].length);
  }
  throw new Error(`No cierra <${etiqueta}>`);
}

function region(html) {
  const inicio = html.search(/<div class="practica"/);
  assert.ok(inicio >= 0, "Falta la región de la práctica");
  return elementoDesde(html, inicio, "div");
}

function textoVisible(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function bloques(html, etiqueta) {
  return [
    ...html.matchAll(new RegExp(`<${etiqueta}\\b[^>]*>[\\s\\S]*?<\\/${etiqueta}>`, "g")),
  ].map((m) => m[0]);
}

function palabra(termino) {
  return new RegExp(`(?<!\\p{L})${termino}(?!\\p{L})`, "iu");
}

const decisiones = unidades.flatMap((unidad) => unidad.decisiones);
const esDePapeles = (decision) =>
  decision.opciones.length === 4 && decision.opciones.every((o) => PAPELES.includes(o.id));

describe("práctica de Sistemas Informáticos: página", () => {
  it("se construye como práctica, sin evaluaciones ni datos de un curso en su contenido", () => {
    const html = readDist(...RUTA);
    assert.match(textoVisible(html), /Sistemas Informáticos · Práctica/);
    assert.match(html, /<h1[^>]*>[^<]+<\/h1>/);
    // A y B nunca se enlazan desde esta página.
    assert.doesNotMatch(html, /href="[^"]*evaluaci/i);

    // El contenido propio de la práctica no menciona el curso ni el evento.
    // (La navegación de un recorrido, fuera de la región, sí podrá nombrarlo.)
    const contenido = textoVisible(region(html));
    assert.doesNotMatch(
      contenido,
      /evaluaci[oó]n|recuperatorio|Mistral|clave docente|\b20\d\d\b|\d{1,2}\/\d{1,2}\/\d{2,4}/i,
    );
    for (const termino of RESGUARDO) {
      assert.doesNotMatch(contenido, palabra(termino), `Usa «${termino}», propio de otro caso`);
    }
    assert.doesNotMatch(contenido, /Ver respuestas|puntaje:\s*\d|\d+\s*\/\s*\d+|%/);
  });

  it("no persiste ni envía respuestas", () => {
    const html = readDist(...RUTA);
    const externos = [...html.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"/g)].map((m) =>
      readDist(m[1]),
    );
    assert.ok(externos.length >= 1, "Falta el script de la práctica");
    const fuentes = [
      readFileSync(join(root, "src/scripts/practica-microondas.ts"), "utf8"),
      ...[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]),
      ...externos,
    ];
    for (const fuente of fuentes) {
      assert.doesNotMatch(fuente, PERSISTENCIA);
    }
  });

  it("contiene toda la interacción dentro de la región excluida del recorrido", () => {
    const html = readDist(...RUTA);
    const practica = region(html);
    assert.match(practica.slice(0, 200), /data-navegacion-recorrido-excluir/);
    for (const control of [
      "<fieldset",
      "data-revisar",
      "data-reiniciar",
      'class="ayuda"',
      "para-llevarte",
      "data-vigencia",
      "data-atajos",
    ]) {
      assert.ok(practica.includes(control), `${control} debe estar dentro de la región`);
    }
    assert.equal(
      (html.match(/<fieldset\b/g) ?? []).length,
      (practica.match(/<fieldset\b/g) ?? []).length,
    );
    assert.doesNotMatch(html, /draggable/);
  });

  it("tiene grupos con legend, radios con label y sin descripciones fijas", () => {
    const html = readDist(...RUTA);
    const fieldsets = bloques(html, "fieldset");
    assert.equal(fieldsets.length, decisiones.length);

    const nombres = new Set();
    for (const [indice, fieldset] of fieldsets.entries()) {
      const decision = decisiones[indice];
      assert.match(fieldset, new RegExp(`id="decision-${decision.id}"`));
      assert.match(fieldset, /tabindex="-1"/);
      assert.match(fieldset, /<legend\b[^>]*>[\s\S]+?<\/legend>/);

      const labels = bloques(fieldset, "label");
      assert.equal(labels.length, decision.opciones.length);
      const grupo = new Set(labels.map((label) => label.match(/name="([^"]+)"/)?.[1]));
      assert.equal(grupo.size, 1, "Cada decisión es un solo grupo de radios");
      for (const label of labels) assert.match(label, /type="radio"/);
      const [nombre] = grupo;
      assert.ok(!nombres.has(nombre), `Grupo repetido: ${nombre}`);
      nombres.add(nombre);
      assert.doesNotMatch(fieldset, /aria-describedby/);
    }

    for (const unidad of unidades) {
      const inicio = html.search(new RegExp(`<section[^>]*data-unidad="${unidad.id}"`));
      const seccion = elementoDesde(html, inicio, "section");
      assert.match(seccion, /<button\b[^>]*type="button"[^>]*data-revisar=/);
      assert.match(seccion, /role="status"/);
      // La ayuda está al comienzo de la unidad, antes de la primera decisión.
      const ayuda = seccion.search(/<details class="ayuda"/);
      assert.ok(ayuda > 0 && ayuda < seccion.indexOf("<fieldset"), unidad.id);
    }

    assert.match(html, /<noscript>/);
  });

  it("la ayuda remite a materiales del corpus que existen", () => {
    const html = readDist(...RUTA);
    const enlaces = [...region(html).matchAll(/class="referencias"[\s\S]*?<\/ul>/g)].flatMap(
      (m) => [...m[0].matchAll(/href="([^"]+)"/g)].map((e) => e[1]),
    );
    assert.ok(enlaces.length >= 2);
    for (const href of enlaces) {
      assert.match(href, /^\/pizarrones\//);
      readDist(...href.split("/").filter(Boolean), "index.html");
    }
  });

  it("deja que las opciones cortas pasen a una columna cuando no entran", () => {
    const html = readDist(...RUTA);
    const hojas = [
      ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
      ...[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\/([^"]+)"/g)].map((m) =>
        readDist(m[1]),
      ),
    ].join("\n");
    const reglas = (selector) =>
      [...hojas.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => m[1].includes(selector))
        .map((m) => m[2])
        .join(";");
    assert.match(reglas(".opciones--cortas"), /flex-wrap:\s*wrap/);
    assert.doesNotMatch(reglas(".opciones"), /grid-template-columns/);
    assert.match(reglas(".opcion"), /min-width:\s*0/);
    assert.match(hojas, /overflow-wrap:\s*break-word/);
  });
});

describe("práctica de Sistemas Informáticos: contenido", () => {
  it("tiene ids únicos, respuestas válidas y un comentario por cada opción que no encaja", () => {
    const ids = decisiones.map((decision) => decision.id);
    assert.equal(new Set(ids).size, ids.length);

    for (const decision of decisiones) {
      const opciones = decision.opciones.map((opcion) => opcion.id);
      assert.equal(new Set(opciones).size, opciones.length);
      assert.ok(opciones.includes(decision.respuesta), decision.id);
      assert.deepEqual(
        Object.keys(decision.devoluciones).sort(),
        opciones.filter((id) => id !== decision.respuesta).sort(),
        decision.id,
      );
    }
  });

  it("el núcleo no se resuelve completando una correspondencia de papeles", () => {
    const [toque] = unidades;
    const clasificaciones = toque.decisiones.filter(esDePapeles);
    const respuestas = clasificaciones.map((decision) => decision.respuesta);
    const completaCorrespondencia =
      respuestas.length === PAPELES.length && new Set(respuestas).size === PAPELES.length;
    assert.ok(!completaCorrespondencia, "Entrada/Operación/Estado/Salida una vez cada una");
    // Al menos una decisión pide usar una relación del caso, no sólo nombrar un papel.
    assert.ok(toque.decisiones.some((d) => !esDePapeles(d) && d.id !== "intencion"));
  });

  it("los comentarios no nombran el papel esperado ni atribuyen una confusión", () => {
    for (const decision of decisiones) {
      const correcta = decision.opciones.find((opcion) => opcion.id === decision.respuesta);
      for (const mensaje of Object.values(decision.devoluciones)) {
        assert.doesNotMatch(mensaje, /confund|te equivocaste|error tuyo|incorrect/i);
        if (esDePapeles(decision)) {
          assert.doesNotMatch(mensaje, palabra(correcta.texto), decision.id);
        }
      }
    }
  });

  it("evita las reglas demasiado estrechas que señaló la auditoría", () => {
    const textos = [
      ...decisiones.flatMap((d) => [d.enunciado, d.explicacion, ...Object.values(d.devoluciones)]),
      ...unidades.flatMap((u) =>
        u.ayudas.flatMap((a) => [...a.parrafos, ...(a.preguntas ?? [])]),
      ),
      ...paraLlevarte,
    ].join("\n");
    assert.doesNotMatch(textos, /quiere no llega/i, "intención como regla absoluta");
    assert.doesNotMatch(textos, /vea o (lo )?escuche/i, "salida reducida a ver o escuchar");
    assert.doesNotMatch(textos, /no se ve|no queda guardad/i, "operación por rasgos externos");
    assert.doesNotMatch(textos, /visor (se )?(rompiera|apagara)/i, "lema del visor roto");
  });

  it("la explicación del tiempo restante relaciona resultado y estado", () => {
    const tiempo = decisiones.find((decision) => decision.id === "tiempo");
    assert.match(tiempo.explicacion, /resultado/);
    assert.match(tiempo.explicacion, /estado/);
  });
});

describe("práctica de Sistemas Informáticos: modelo", () => {
  const [toque, puerta] = unidades;
  const incorrecta = (decision) =>
    decision.opciones.find((opcion) => opcion.id !== decision.respuesta).id;

  it("no muestra comentarios ni explicaciones antes de revisar", () => {
    const practica = crearPractica(unidades);
    for (const decision of toque.decisiones) {
      practica.elegir(decision.id, decision.respuesta);
      assert.equal(practica.devolucion(decision.id), undefined);
      assert.equal(practica.explicacionDisponible(decision.id), false);
    }
    assert.equal(practica.resumen(toque.id), undefined);
  });

  it("revisa una unidad sin exigir completarla y sin tocar la otra", () => {
    const practica = crearPractica(unidades);
    const [primera, segunda, tercera] = toque.decisiones;
    practica.elegir(primera.id, primera.respuesta);
    practica.elegir(segunda.id, incorrecta(segunda));
    practica.elegir(puerta.decisiones[0].id, puerta.decisiones[0].respuesta);

    const resumen = practica.revisar(toque.id);
    assert.deepEqual(practica.devolucion(primera.id), { resultado: "encaja" });
    assert.deepEqual(practica.devolucion(segunda.id), {
      resultado: "revisar",
      mensaje: segunda.devoluciones[incorrecta(segunda)],
    });
    assert.equal(practica.devolucion(tercera.id), undefined);
    assert.equal(practica.explicacionDisponible(tercera.id), false);
    assert.equal(practica.devolucion(puerta.decisiones[0].id), undefined);
    assert.match(resumen, /encajan con el caso y otras que conviene revisar: la 2\./);
    assert.match(resumen, /Quedan sin elegir: la 3, la 4 y la 5\./);
    assert.deepEqual(practica.pendientes(toque.id), {
      revisar: [{ id: segunda.id, numero: 2 }],
      sinElegir: toque.decisiones.slice(2).map((d, i) => ({ id: d.id, numero: i + 3 })),
    });
  });

  it("al cambiar una elección revisada invalida el resumen sin tocar lo demás", () => {
    const practica = crearPractica(unidades);
    for (const decision of toque.decisiones) practica.elegir(decision.id, decision.respuesta);
    assert.match(practica.revisar(toque.id), /^Todo lo que elegiste encaja/);

    const [cambiada, otra] = toque.decisiones;
    practica.elegir(cambiada.id, incorrecta(cambiada));
    assert.equal(practica.resumen(toque.id), undefined);
    assert.equal(practica.desactualizada(toque.id), true);
    assert.equal(practica.devolucion(cambiada.id), undefined);
    assert.equal(practica.cambiadaTrasRevisar(cambiada.id), true);
    assert.equal(practica.explicacionDisponible(cambiada.id), true);
    assert.deepEqual(practica.devolucion(otra.id), { resultado: "encaja" });
    assert.equal(practica.cambiadaTrasRevisar(otra.id), false);

    assert.match(practica.revisar(toque.id), /conviene revisar: la 1\./);
    assert.equal(practica.desactualizada(toque.id), false);
    assert.equal(practica.cambiadaTrasRevisar(cambiada.id), false);
    assert.equal(practica.devolucion(cambiada.id)?.resultado, "revisar");
  });

  it("elegir una fila que quedó sin elegir también invalida el resumen", () => {
    const practica = crearPractica(unidades);
    practica.revisar(toque.id);
    const decision = toque.decisiones[0];
    practica.elegir(decision.id, decision.respuesta);
    assert.equal(practica.desactualizada(toque.id), true);
    assert.equal(practica.cambiadaTrasRevisar(decision.id), false);
  });

  it("cambiar en una unidad no invalida la otra", () => {
    const practica = crearPractica(unidades);
    const [aviso] = puerta.decisiones;
    practica.elegir(aviso.id, aviso.respuesta);
    practica.revisar(puerta.id);
    practica.revisar(toque.id);
    practica.elegir(toque.decisiones[0].id, toque.decisiones[0].respuesta);
    assert.equal(practica.desactualizada(toque.id), true);
    assert.equal(practica.desactualizada(puerta.id), false);
    assert.ok(practica.resumen(puerta.id));
  });

  it("elegir otra vez la misma opción no borra el comentario ni el resumen", () => {
    const practica = crearPractica(unidades);
    const decision = toque.decisiones[0];
    practica.elegir(decision.id, decision.respuesta);
    practica.revisar(toque.id);
    practica.elegir(decision.id, decision.respuesta);
    assert.equal(practica.devolucion(decision.id)?.resultado, "encaja");
    assert.ok(practica.resumen(toque.id));
  });

  it("empezar de nuevo borra todo", () => {
    const practica = crearPractica(unidades);
    for (const unidad of unidades) {
      for (const decision of unidad.decisiones) practica.elegir(decision.id, incorrecta(decision));
      practica.revisar(unidad.id);
    }
    practica.elegir(toque.decisiones[0].id, toque.decisiones[0].respuesta);
    practica.reiniciar();
    for (const decision of decisiones) {
      assert.equal(practica.eleccion(decision.id), undefined);
      assert.equal(practica.devolucion(decision.id), undefined);
      assert.equal(practica.explicacionDisponible(decision.id), false);
      assert.equal(practica.cambiadaTrasRevisar(decision.id), false);
    }
    for (const unidad of unidades) {
      assert.equal(practica.resumen(unidad.id), undefined);
      assert.equal(practica.desactualizada(unidad.id), false);
    }
  });

  it("rechaza opciones que no pertenecen a la decisión", () => {
    const practica = crearPractica(unidades);
    assert.throws(() => practica.elegir(toque.decisiones[0].id, "inventada"));
  });

  it("resume sin puntajes ni lenguaje de aprobación", () => {
    for (const caso of [
      [[], [], [1, 2, 3]],
      [[1, 2, 3], [], []],
      [[1], [], [2, 3]],
      [[], [1, 2], [3]],
      [[1], [2, 3], []],
    ]) {
      assert.doesNotMatch(
        resumirRevision(...caso),
        /\d+\s*(\/|de)\s*\d+|%|puntaje|nota|aprob|correct|bien|mal\b/i,
      );
    }
  });
});

describe("práctica de Sistemas Informáticos: comportamiento en el DOM", () => {
  const GLOBALES = [
    "window",
    "document",
    "Element",
    "Node",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLAnchorElement",
    "HTMLFieldSetElement",
    "HTMLDetailsElement",
  ];
  const esperar = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

  function montar() {
    const dom = new JSDOM(readDist(...RUTA), {
      url: "http://localhost/practicar-sistemas-informaticos/",
    });
    for (const nombre of GLOBALES) {
      globalThis[nombre] = nombre === "window" ? dom.window : dom.window[nombre];
    }
    iniciarPracticaMicroondas();
    const doc = dom.window.document;
    const q = (selector) => doc.querySelector(selector);
    return {
      doc,
      q,
      elegir(decision, valor) {
        q(`input[data-decision="${decision}"][value="${valor}"]`).click();
      },
      revisar(unidad) {
        q(`[data-revisar="${unidad}"]`).click();
      },
      estado: (unidad) => q(`[data-unidad="${unidad}"] [data-estado]`).textContent,
      vigencia: (unidad) => q(`[data-unidad="${unidad}"] [data-vigencia]`),
      atajos: (unidad) => q(`[data-unidad="${unidad}"] [data-atajos]`),
      devolucion: (decision) => q(`#devolucion-${decision}`),
      descritos: (decision) =>
        [...doc.querySelectorAll(`input[data-decision="${decision}"]`)]
          .filter((input) => input.hasAttribute("aria-describedby"))
          .map((input) => [input.value, input.getAttribute("aria-describedby")]),
    };
  }

  const [toque, puerta] = unidades;
  const responderBien = (p, unidad) => {
    for (const decision of unidad.decisiones) p.elegir(decision.id, decision.respuesta);
  };

  it("elegir no muestra comentarios ni resumen", async () => {
    const p = montar();
    assert.equal(p.q("[data-revisar]").closest("[hidden]"), null, "Revisar visible con JS");
    p.elegir("senal", "operacion");
    await esperar();
    assert.equal(p.devolucion("senal").hidden, true);
    assert.equal(p.estado("toque"), "");
    assert.deepEqual(p.descritos("senal"), []);
  });

  it("correcto → Revisar → cambiar → el resumen deja de afirmar que todo encaja → Revisar", async () => {
    const p = montar();
    responderBien(p, toque);
    p.revisar("toque");
    await esperar();
    assert.match(p.estado("toque"), /^Todo lo que elegiste encaja/);

    p.elegir("tiempo", "operacion");
    assert.equal(p.estado("toque"), "");
    assert.doesNotMatch(p.q('[data-unidad="toque"]').textContent, /Todo lo que elegiste encaja/);
    assert.equal(p.vigencia("toque").hidden, false);
    assert.match(p.vigencia("toque").textContent, /todavía no está revisado/);
    // La decisión cambiada lo dice de manera neutra; las demás conservan su comentario.
    assert.match(p.devolucion("tiempo").textContent, /todavía no está revisada/);
    assert.equal(p.q("#devolucion-tiempo a").getAttribute("href"), "#revisar-toque");
    assert.match(p.devolucion("senal").textContent, /encaja con el caso/);
    assert.equal(p.q("#decision-tiempo [data-explicacion]").hidden, false);
    assert.deepEqual(p.descritos("tiempo"), []);
    await esperar();
    assert.equal(p.estado("toque"), "");

    p.revisar("toque");
    await esperar();
    assert.match(p.estado("toque"), /conviene revisar: la 3\./);
    assert.equal(p.vigencia("toque").hidden, true);
    assert.match(p.devolucion("tiempo").textContent, /^↺Conviene revisar tu elección\./);
  });

  it("cancela el anuncio pendiente si la selección cambia enseguida", async () => {
    const p = montar();
    responderBien(p, toque);
    p.revisar("toque");
    p.elegir("visor", "estado");
    await esperar();
    assert.equal(p.estado("toque"), "");
    assert.equal(p.vigencia("toque").hidden, false);
  });

  it("asocia cada comentario sólo a la elección revisada", async () => {
    const p = montar();
    p.elegir("senal", "operacion");
    p.elegir("tiempo", "estado");
    p.revisar("toque");
    assert.deepEqual(p.descritos("senal"), [["operacion", "devolucion-senal"]]);
    assert.deepEqual(p.descritos("tiempo"), [["estado", "devolucion-tiempo"]]);
    assert.match(p.devolucion("senal").textContent, /Conviene revisar tu elección/);
    assert.match(p.devolucion("tiempo").textContent, /Tu elección encaja con el caso/);
    assert.deepEqual(p.descritos("visor"), []);
  });

  it("ofrece volver a cada decisión pendiente sin cambiar la URL", async () => {
    const p = montar();
    p.elegir("senal", "operacion");
    p.revisar("toque");
    const atajos = p.atajos("toque");
    assert.equal(atajos.hidden, false);
    const enlaces = [...atajos.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    assert.deepEqual(enlaces, [
      "#decision-senal",
      ...toque.decisiones.slice(1).map((d) => `#decision-${d.id}`),
    ]);
    atajos.querySelector("a").click();
    assert.equal(p.doc.activeElement, p.q("#decision-senal"));
    assert.equal(p.doc.location.hash, "");

    // Al cambiar la elección, el atajo a esa decisión desaparece.
    p.elegir("senal", "entrada");
    assert.ok(!p.atajos("toque").innerHTML.includes("#decision-senal"));
  });

  it("la decisión relacional devuelve un comentario propio de cada alternativa", () => {
    const p = montar();
    const calculo = toque.decisiones.find((decision) => decision.id === "calculo");
    for (const opcion of calculo.opciones) {
      p.elegir("calculo", opcion.id);
      p.revisar("toque");
      const texto = p.devolucion("calculo").textContent;
      if (opcion.id === calculo.respuesta) {
        assert.match(texto, /Tu elección encaja con el caso/);
      } else {
        assert.ok(texto.includes(calculo.devoluciones[opcion.id]), opcion.id);
      }
      assert.deepEqual(p.descritos("calculo"), [[opcion.id, "devolucion-calculo"]]);
    }
  });

  it("la variación se revisa aparte y no altera la unidad principal", async () => {
    const p = montar();
    responderBien(p, toque);
    p.revisar("toque");
    await esperar();
    const principal = p.estado("toque");
    p.elegir("aviso", "iniciar");
    p.revisar("puerta");
    await esperar();
    assert.match(p.estado("puerta"), /Conviene revisar la 1\. Quedan sin elegir: la 2\./);
    assert.equal(p.estado("toque"), principal);
    assert.equal(p.vigencia("toque").hidden, true);
  });

  it("empezar de nuevo limpia elecciones, comentarios, avisos y desplegables", async () => {
    const p = montar();
    responderBien(p, toque);
    p.revisar("toque");
    p.elegir("tiempo", "entrada");
    p.q('[data-unidad="toque"] details.ayuda').open = true;
    p.q("[data-reiniciar]").click();
    assert.equal(p.doc.querySelectorAll("input:checked").length, 0);
    assert.equal(p.doc.querySelectorAll("[data-devolucion]:not([hidden])").length, 0);
    assert.equal(p.doc.querySelectorAll("[data-explicacion]:not([hidden])").length, 0);
    assert.equal(p.doc.querySelectorAll("details[open]").length, 0);
    assert.equal(p.vigencia("toque").hidden, true);
    assert.equal(p.atajos("toque").hidden, true);
    assert.equal(p.doc.activeElement, p.q("#titulo-toque"));
    await esperar();
    assert.match(p.estado("toque"), /Empezaste de nuevo/);
    assert.equal(p.estado(puerta.id), "");
  });
});
