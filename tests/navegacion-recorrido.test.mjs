import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  direccionPorSwipe,
  direccionPorTecla,
  mostrarNavegacionActiva,
} from "../src/scripts/navegacion-recorrido.ts";
import { recorridos } from "../src/data/recorridos.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

function readDist(...parts) {
  const path = join(dist, ...parts);
  assert.ok(existsSync(path), `Falta ${path}. Ejecutá npm run build.`);
  return readFileSync(path, "utf8");
}

function navRecorrido(html, id) {
  const nav = html.match(
    new RegExp(
      `<nav\\s+[^>]*data-recorrido-id="${id}"[^>]*>([\\s\\S]*?)<\\/nav>`,
    ),
  )?.[0];
  assert.ok(nav, `Falta la navegación ${id}`);
  return nav;
}

function eventoTeclado(overrides = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    key: "ArrowRight",
    metaKey: false,
    repeat: false,
    shiftKey: false,
    ...overrides,
  };
}

function swipe(overrides = {}) {
  return {
    inicioX: 250,
    inicioY: 300,
    finX: 150,
    finY: 310,
    desplazamientoVerticalMaximo: 10,
    inicioMs: 100,
    finMs: 450,
    anchoViewport: 390,
    ...overrides,
  };
}

describe("navegación progresiva de recorridos", () => {
  it("mapea las flechas y excluye eventos consumidos, modificados, repetidos e interactivos", () => {
    assert.equal(direccionPorTecla(eventoTeclado()), "next");
    assert.equal(
      direccionPorTecla(eventoTeclado({ key: "ArrowLeft" })),
      "prev",
    );
    assert.equal(direccionPorTecla(eventoTeclado({ key: "Enter" })), null);
    assert.equal(
      direccionPorTecla(eventoTeclado({ defaultPrevented: true })),
      null,
    );
    for (const modificador of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      assert.equal(
        direccionPorTecla(eventoTeclado({ [modificador]: true })),
        null,
      );
    }
    assert.equal(direccionPorTecla(eventoTeclado({ repeat: true })), null);
    assert.equal(direccionPorTecla(eventoTeclado(), true), null);
  });

  it("reconoce swipes horizontales deliberados en ambas direcciones", () => {
    assert.equal(direccionPorSwipe(swipe()), "next");
    assert.equal(
      direccionPorSwipe(swipe({ inicioX: 140, finX: 240 })),
      "prev",
    );
  });

  it("descarta scroll vertical, recorridos cortos o lentos, bordes y selección", () => {
    assert.equal(
      direccionPorSwipe(
        swipe({ finX: 210, finY: 420, desplazamientoVerticalMaximo: 120 }),
      ),
      null,
    );
    assert.equal(direccionPorSwipe(swipe({ finX: 200 })), null);
    assert.equal(direccionPorSwipe(swipe({ finMs: 1_100 })), null);
    assert.equal(direccionPorSwipe(swipe({ inicioX: 20, finX: 120 })), null);
    assert.equal(
      direccionPorSwipe(swipe({ inicioX: 370, finX: 270 })),
      null,
    );
    assert.equal(direccionPorSwipe(swipe({ seleccionActiva: true })), null);
  });

  it("sólo muestra una navegación cuando el recorrido solicitado existe y queda visible", () => {
    function candidata(id) {
      return { dataset: { recorridoId: id }, hidden: true };
    }
    const gm = candidata("gm-2026-2");
    const cfp = candidata("cfp7-si-2026");
    const raiz = {
      querySelectorAll() {
        return [gm, cfp];
      },
    };

    assert.equal(mostrarNavegacionActiva(raiz, null, () => true), null);
    assert.equal(mostrarNavegacionActiva(raiz, "inexistente", () => true), null);
    assert.equal(gm.hidden, true);
    assert.equal(cfp.hidden, true);

    assert.equal(
      mostrarNavegacionActiva(raiz, "gm-2026-2", () => true),
      gm,
    );
    assert.equal(gm.hidden, false);
    assert.equal(cfp.hidden, true);
    assert.equal(
      mostrarNavegacionActiva(raiz, "cfp7-si-2026", () => false),
      null,
    );
  });

  it("renderiza vecinos correctos al principio, en el medio y al final", () => {
    const primeroGm = navRecorrido(
      readDist("pizarrones", "preguntas-y-conceptos-principales", "index.html"),
      "gm-2026-2",
    );
    assert.doesNotMatch(primeroGm, /rel="prev"/);
    assert.match(
      primeroGm,
      /hardware-software-y-tarea\/\?recorrido=gm-2026-2[^>]+rel="next"/,
    );

    const intermedioGm = navRecorrido(
      readDist("pizarrones", "entrada-procesamiento-y-salida", "index.html"),
      "gm-2026-2",
    );
    assert.match(intermedioGm, /rel="prev"/);
    assert.match(intermedioGm, /rel="next"/);

    const tresMiradas = navRecorrido(
      readDist("pizarrones", "tres-miradas-sobre-una-situacion", "index.html"),
      "gm-2026-2",
    );
    assert.match(tresMiradas, /rel="prev"/);
    assert.match(
      tresMiradas,
      /href="\/practicar-sistemas-informaticos\/\?recorrido=gm-2026-2"[^>]+rel="next"[^>]+aria-label="Siguiente: Preparación para la evaluación"/,
    );

    const ultimoGm = navRecorrido(
      readDist("practicar-sistemas-informaticos", "index.html"),
      "gm-2026-2",
    );
    assert.match(ultimoGm, /Paso 11 de 11/);
    assert.match(
      ultimoGm,
      /href="\/pizarrones\/tres-miradas-sobre-una-situacion\/\?recorrido=gm-2026-2"[^>]+rel="prev"/,
    );
    assert.doesNotMatch(ultimoGm, /rel="next"/);
  });

  it("incorpora la práctica sólo al final de Gabriela Mistral", () => {
    const gm = recorridos.find((recorrido) => recorrido.id === "gm-2026-2");
    const cfp = recorridos.find((recorrido) => recorrido.id === "cfp7-si-2026");
    assert.equal(gm.materiales.length, 11);
    assert.deepEqual(gm.materiales.at(-2).href, "/pizarrones/tres-miradas-sobre-una-situacion/");
    assert.deepEqual(gm.materiales.at(-1), {
      href: "/practicar-sistemas-informaticos/",
      title: "Preparación para la evaluación",
      tipo: "Práctica",
    });
    assert.deepEqual(
      cfp.materiales.map((material) => material.href),
      [
        "/pizarrones/hardware-software-y-tarea/",
        "/pizarrones/entrada-procesamiento-y-salida/",
        "/pizarrones/arquitectura-de-von-neumann/",
        "/pizarrones/el-sistema-operativo/",
        "/sistema-operativo/",
      ],
    );

    const practica = readDist("practicar-sistemas-informaticos", "index.html");
    assert.match(practica, /<div class="navegacion-recorrido" data-navegacion-recorrido[\s>]/);
    assert.doesNotMatch(practica, /data-recorrido-id="cfp7-si-2026"/);

    const portadaGm = readDist(
      "escuelas",
      "gabriela-mistral",
      "2-cuatrimestre-2026",
      "index.html",
    );
    const enlaces = [...portadaGm.matchAll(/href="([^"]+\?recorrido=gm-2026-2)"/g)].map(
      (m) => m[1],
    );
    assert.equal(enlaces.length, 11);
    assert.equal(enlaces.at(-1), "/practicar-sistemas-informaticos/?recorrido=gm-2026-2");
    assert.match(portadaGm, /Preparación para la evaluación/);

    const portadaCfp = readDist("escuelas", "cfp-7", "sistemas-informaticos-2026", "index.html");
    assert.doesNotMatch(portadaCfp, /practicar-sistemas-informaticos/);
  });

  it("mantiene las evaluaciones A y B y sus claves fuera del sitio y de la navegación", () => {
    const paginas = readdirSync(dist, { recursive: true }).filter((ruta) =>
      String(ruta).endsWith(".html"),
    );
    assert.ok(paginas.length > 20);
    for (const ruta of paginas) {
      const html = readFileSync(join(dist, String(ruta)), "utf8");
      assert.doesNotMatch(html, /href="[^"]*evaluaci[oó]n/i, String(ruta));
      assert.doesNotMatch(html, /clave-docente/i, String(ruta));
    }
    assert.ok(!existsSync(join(dist, "evaluaciones")));
  });

  it("conserva destinos independientes para CFP 7 y para Sistema Operativo", () => {
    const compartido = readDist(
      "pizarrones",
      "entrada-procesamiento-y-salida",
      "index.html",
    );
    const cfp = navRecorrido(compartido, "cfp7-si-2026");
    assert.match(cfp, /hardware-software-y-tarea\/\?recorrido=cfp7-si-2026/);
    assert.match(cfp, /arquitectura-de-von-neumann\/\?recorrido=cfp7-si-2026/);

    const sistemaOperativo = readDist("sistema-operativo", "index.html");
    for (const id of ["gm-2026-2", "cfp7-si-2026"]) {
      const nav = navRecorrido(sistemaOperativo, id);
      assert.match(nav, new RegExp(`el-sistema-operativo/\\?recorrido=${id}`));
      assert.match(nav, /rel="prev"/);
    }
    assert.match(navRecorrido(sistemaOperativo, "gm-2026-2"), /rel="next"/);
    assert.doesNotMatch(
      navRecorrido(sistemaOperativo, "cfp7-si-2026"),
      /rel="next"/,
    );
  });

  it("mantiene la actividad fuera de los gestos del recorrido", () => {
    const actividad = readDist("cuando-se-abre-un-programa", "index.html");
    assert.doesNotMatch(actividad, /data-navegacion-recorrido(?:>|=)/);
    assert.match(
      actividad,
      /data-actividad-abrir-programa[^>]+data-navegacion-recorrido-excluir/,
    );
  });
});
