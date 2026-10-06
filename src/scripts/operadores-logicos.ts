/*
  Tabla de verdad de Operadores lógicos: elegir A y B marca la fila y la
  relaciona con los dos ejemplos de la página. Sin JavaScript, la tabla
  estática sigue completa y los controles quedan ocultos.
*/

type Valor = "V" | "F";

export function iniciarTablaDeVerdad(): void {
  const tabla = document.querySelector("[data-tabla-verdad]");
  const explorador = document.querySelector("[data-explorador]");
  if (!(tabla instanceof HTMLElement) || !(explorador instanceof HTMLElement)) {
    return;
  }

  const lectura = explorador.querySelector("[data-lectura]");
  if (!(lectura instanceof HTMLElement)) return;

  const radios = [
    ...explorador.querySelectorAll<HTMLInputElement>("input[data-condicion]"),
  ];

  function valor(condicion: "a" | "b"): Valor {
    const elegido = radios.find(
      (radio) => radio.dataset.condicion === condicion && radio.checked,
    );
    return elegido?.value === "F" ? "F" : "V";
  }

  function actualizar(): void {
    const a = valor("a");
    const b = valor("b");
    const clave = `${a}${b}`;

    let fila: HTMLElement | null = null;
    for (const tr of tabla!.querySelectorAll<HTMLElement>("tr[data-fila]")) {
      const elegida = tr.dataset.fila === clave;
      tr.toggleAttribute("data-elegida", elegida);
      if (elegida) fila = tr;
    }
    if (!fila) return;

    const y: Valor = a === "V" && b === "V" ? "V" : "F";
    const o: Valor = a === "V" || b === "V" ? "V" : "F";

    lectura!.replaceChildren(
      parrafo(`A Y B da ${y} · A O B da ${o}`, true),
      parrafo(`Boliche (Y): ${fila.dataset.boliche ?? ""}`),
      parrafo(`Recital (O): ${fila.dataset.recital ?? ""}`),
    );
  }

  for (const radio of radios) {
    radio.addEventListener("change", actualizar);
  }

  explorador.hidden = false;
  actualizar();
}

function parrafo(texto: string, destacado = false): HTMLParagraphElement {
  const p = document.createElement("p");
  if (destacado) {
    const strong = document.createElement("strong");
    strong.textContent = texto;
    p.append(strong);
  } else {
    p.textContent = texto;
  }
  return p;
}
