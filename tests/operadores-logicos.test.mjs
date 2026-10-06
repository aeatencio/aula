import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { iniciarTablaDeVerdad } from "../src/scripts/operadores-logicos.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

function readDist(...parts) {
  const path = join(dist, ...parts);
  assert.ok(existsSync(path), `Falta ${path}. Ejecutá npm run build.`);
  return readFileSync(path, "utf8");
}

function pagina() {
  return new JSDOM(readDist("operadores-logicos", "index.html")).window.document;
}

const texto = (nodo) => nodo.textContent.replace(/\s+/g, " ").trim();

function celdas(tabla) {
  return [...tabla.querySelectorAll("tbody tr")].map((tr) =>
    [...tr.children].map(texto),
  );
}

describe("Operadores lógicos: Y y O", () => {
  it("la portada la ofrece en Técnicas de Programación", () => {
    const doc = new JSDOM(readDist("index.html")).window.document;
    const campo = doc.querySelector('[aria-labelledby="campo-tp"]');
    assert.ok(campo, "Falta el campo Técnicas de Programación");
    assert.equal(texto(campo.querySelector("h2")), "Técnicas de Programación");
    assert.ok(campo.querySelector('a[href="/operadores-logicos/"]'));
  });

  it("sigue la secuencia Y, O, tabla de verdad y práctica", () => {
    const doc = pagina();
    assert.equal(doc.title, "Operadores lógicos: Y y O · Aula");
    const ids = [...doc.querySelectorAll("h2[id]")].map((h2) => h2.id);
    assert.deepEqual(ids, [
      "combinar",
      "operador-y",
      "operador-o",
      "tabla",
      "practica",
    ]);
  });

  it("presenta los cuatro casos de cada ejemplo con Sí y No, en el orden de la tabla", () => {
    const [boliche, recital] = pagina().querySelectorAll("table.casos");
    assert.deepEqual(celdas(boliche), [
      ["21 años, con entrada", "Sí", "Sí", "Entra"],
      ["20 años, sin entrada", "Sí", "No", "No entra"],
      ["16 años, con entrada", "No", "Sí", "No entra"],
      ["16 años, sin entrada", "No", "No", "No entra"],
    ]);
    assert.deepEqual(celdas(recital), [
      ["Tiene las dos", "Sí", "Sí", "Entra"],
      ["Solo la digital", "Sí", "No", "Entra"],
      ["Solo la impresa", "No", "Sí", "Entra"],
      ["No tiene ninguna", "No", "No", "No entra"],
    ]);
  });

  it("las tablas de casos se desplazan dentro de una región con nombre, sin ensanchar la página", () => {
    const doc = pagina();
    for (const tabla of doc.querySelectorAll("table.casos")) {
      const region = tabla.parentElement;
      assert.ok(region.classList.contains("tabla-desplazable"));
      assert.equal(region.getAttribute("role"), "region");
      assert.equal(region.getAttribute("tabindex"), "0");
      const caption = tabla.querySelector("caption");
      assert.equal(region.getAttribute("aria-labelledby"), caption.id);
    }
  });

  it("introduce V y F recién con la tabla de verdad", () => {
    const doc = pagina();
    for (const id of ["combinar", "operador-y", "operador-o"]) {
      const seccion = doc.getElementById(id).closest("section");
      assert.doesNotMatch(texto(seccion), /\b[VF]\b|verdadero|falso/i, id);
    }
    const tabla = doc.getElementById("tabla").closest("section");
    assert.match(texto(tabla), /V = verdadero/);
    assert.match(texto(tabla), /F = falso/);
  });

  it("la tabla de verdad es una tabla nativa con los valores de Y y O", () => {
    const tabla = pagina().querySelector("table.verdad");
    assert.deepEqual(
      [...tabla.querySelectorAll("thead th")].map(texto),
      ["A", "B", "A Y B", "A O B"],
    );
    assert.deepEqual(celdas(tabla), [
      ["V", "V", "V", "V"],
      ["V", "F", "F", "V"],
      ["F", "V", "F", "V"],
      ["F", "F", "F", "F"],
    ]);
  });

  it("expresa «mayor de 18» como edad > 18", () => {
    const doc = pagina();
    const html = doc.querySelector("article").innerHTML;
    assert.match(html, /edad &gt; 18 Y tieneEntrada/);
    assert.doesNotMatch(html, /&gt;=|≥/);
  });

  it("ofrece cuatro ejercicios, alternando Y y O, sin soluciones", () => {
    const doc = pagina();
    const ejercicios = [...doc.querySelectorAll(".ejercicio")];
    assert.deepEqual(
      ejercicios.map((ejercicio) => texto(ejercicio.querySelector(".op"))),
      ["Y", "O", "Y", "O"],
    );
    assert.deepEqual(
      ejercicios.map((ejercicio) => texto(ejercicio.querySelector("h3"))),
      ["Entrar al boliche", "Entrar al recital", "Pasar de nivel", "Ganar un premio"],
    );
    for (const ejercicio of ejercicios) {
      assert.ok(ejercicio.querySelector(".diagrama"), `${ejercicio.id} sin diagrama`);
      assert.doesNotMatch(texto(ejercicio), /FinSi|Algoritmo|SiNo/);
    }
    for (const id of ["ejercicio-1", "ejercicio-2"]) {
      assert.equal(doc.querySelectorAll(`#${id} .pruebas li`).length, 4);
    }
    assert.match(texto(doc.querySelector(".ayuda")), /Definir tieneEntrada Como Logico/);
  });

  it("no queda atada a una escuela, un curso ni a fotos de clase", () => {
    const doc = pagina();
    const visible = texto(doc.querySelector("article"));
    assert.doesNotMatch(visible, /Gabriela|CFP|Nico|2\/10|1\/10|2026/);
    assert.equal(doc.querySelectorAll("article img").length, 0);
  });
});

describe("Operadores lógicos: explorar la tabla", () => {
  function montar() {
    const dom = new JSDOM(readDist("operadores-logicos", "index.html"));
    for (const nombre of ["window", "document", "HTMLElement", "HTMLInputElement"]) {
      globalThis[nombre] = nombre === "window" ? dom.window : dom.window[nombre];
    }
    const doc = dom.window.document;
    return {
      doc,
      elegir(condicion, valor) {
        const radio = doc.querySelector(
          `input[data-condicion="${condicion}"][value="${valor}"]`,
        );
        radio.checked = true;
        radio.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      },
      elegidas: () =>
        [...doc.querySelectorAll("tr[data-elegida]")].map((tr) => tr.dataset.fila),
      lectura: () => texto(doc.querySelector("[data-lectura]")),
    };
  }

  it("sin JavaScript los controles quedan ocultos", () => {
    assert.equal(pagina().querySelector("[data-explorador]").hidden, true);
  });

  it("muestra los controles y marca la fila V y V al iniciar", () => {
    const p = montar();
    iniciarTablaDeVerdad();
    assert.equal(p.doc.querySelector("[data-explorador]").hidden, false);
    assert.deepEqual(p.elegidas(), ["VV"]);
    assert.match(p.lectura(), /A Y B da V · A O B da V/);
  });

  it("cada combinación marca una sola fila y la relaciona con los dos ejemplos", () => {
    const p = montar();
    iniciarTablaDeVerdad();
    const esperadas = {
      VF: ["A Y B da F · A O B da V", "20 años, sin entrada → no entra", "solo la digital → entra"],
      FV: ["A Y B da F · A O B da V", "16 años, con entrada → no entra", "solo la impresa → entra"],
      FF: ["A Y B da F · A O B da F", "16 años, sin entrada → no entra", "no tiene ninguna → no entra"],
      VV: ["A Y B da V · A O B da V", "21 años, con entrada → entra", "tiene las dos → entra"],
    };
    for (const [fila, fragmentos] of Object.entries(esperadas)) {
      p.elegir("a", fila[0]);
      p.elegir("b", fila[1]);
      assert.deepEqual(p.elegidas(), [fila]);
      for (const fragmento of fragmentos) {
        assert.ok(p.lectura().includes(fragmento), `${fila}: falta «${fragmento}»`);
      }
    }
  });
});
