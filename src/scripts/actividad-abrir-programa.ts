import { huecoPorId, huecos, type PalabraBanco } from "../data/actividad-abrir-programa";

const CIERRE_OK =
  "El recorrido quedó armado. El sistema operativo administra los recursos y permite que los programas usen el hardware.";

function exigir<T extends HTMLElement>(
  raiz: HTMLElement,
  selector: string,
  tipo: { new (): T },
): T {
  const nodo = raiz.querySelector(selector);
  if (!(nodo instanceof tipo)) {
    throw new Error(`Falta ${selector}`);
  }
  return nodo;
}

export function iniciarActividadAbrirPrograma(): void {
  const raiz = document.querySelector("[data-actividad-abrir-programa]");
  if (!(raiz instanceof HTMLElement)) return;

  const banco = exigir(raiz, "[data-banco]", HTMLElement);
  const estado = exigir(raiz, "[data-estado]", HTMLElement);
  const comentarios = exigir(raiz, "[data-comentarios]", HTMLElement);
  const listaComentarios = exigir(raiz, "[data-lista-comentarios]", HTMLElement);
  const botonRevisar = exigir(raiz, "[data-revisar]", HTMLButtonElement);
  const botonVaciar = exigir(raiz, "[data-vaciar]", HTMLButtonElement);

  const fichas = [...banco.querySelectorAll<HTMLButtonElement>("[data-palabra]")];
  const huecoBotones = [
    ...raiz.querySelectorAll<HTMLButtonElement>("[data-hueco]"),
  ];

  const colocadas: Record<string, string> = {};
  const fijos = new Set<string>();
  const fallos: Record<string, number> = {};
  let palabraElegida: string | null = null;
  let huecoElegido: string | null = null;

  function anunciar(mensaje: string): void {
    estado.textContent = mensaje;
  }

  function usada(palabra: string): boolean {
    return Object.values(colocadas).includes(palabra);
  }

  function etiquetaHueco(id: string): string {
    const hueco = huecoPorId(id);
    const palabra = colocadas[id];
    const partes = [`Espacio: ${hueco.contexto}`];
    if (fijos.has(id)) {
      partes.push(`${palabra}. En su lugar.`);
    } else if (palabra) {
      partes.push(palabra);
    } else {
      partes.push("Vacío");
    }
    return partes.join(". ");
  }

  function pintarFichas(): void {
    for (const ficha of fichas) {
      const palabra = ficha.dataset.palabra ?? "";
      const estaUsada = usada(palabra);
      const estaElegida = palabraElegida === palabra && !estaUsada;
      ficha.disabled = estaUsada;
      ficha.setAttribute("aria-pressed", estaElegida ? "true" : "false");
      ficha.classList.toggle("is-elegida", estaElegida);
      ficha.classList.toggle("is-usada", estaUsada);
      ficha.draggable = !estaUsada;
    }
  }

  function pintarHuecos(): void {
    for (const boton of huecoBotones) {
      const id = boton.dataset.hueco ?? "";
      const palabra = colocadas[id];
      const texto = boton.querySelector(".hueco-palabra");
      if (texto) texto.textContent = palabra ?? "";
      boton.classList.toggle("is-lleno", Boolean(palabra));
      boton.classList.toggle("is-elegido", huecoElegido === id && !fijos.has(id));
      boton.classList.toggle("is-bien", fijos.has(id));
      boton.classList.toggle("is-revisar", boton.dataset.marca === "revisar");
      boton.setAttribute("aria-label", etiquetaHueco(id));
      if (fijos.has(id)) {
        boton.setAttribute("aria-disabled", "true");
      } else {
        boton.removeAttribute("aria-disabled");
      }
    }
  }

  function pintar(): void {
    pintarFichas();
    pintarHuecos();
  }

  function limpiarMarcas(): void {
    for (const boton of huecoBotones) {
      delete boton.dataset.marca;
      boton.removeAttribute("aria-describedby");
    }
  }

  function limpiarSeleccion(): void {
    const habia = palabraElegida || huecoElegido;
    palabraElegida = null;
    huecoElegido = null;
    pintar();
    if (habia) {
      anunciar("Selección cancelada.");
    }
  }

  function colocar(id: string, palabra: string): void {
    if (fijos.has(id)) {
      anunciar("Ese espacio ya quedó en su lugar.");
      return;
    }

    const anterior = colocadas[id];
    if (anterior === palabra) {
      palabraElegida = null;
      huecoElegido = null;
      pintar();
      return;
    }

    colocadas[id] = palabra;
    delete huecoBotones.find((boton) => boton.dataset.hueco === id)?.dataset.marca;
    const boton = huecoBotones.find((item) => item.dataset.hueco === id);
    boton?.removeAttribute("aria-describedby");
    palabraElegida = null;
    huecoElegido = null;
    pintar();
    anunciar(`Colocaste «${palabra}» en el espacio «${huecoPorId(id).contexto}».`);
  }

  function recoger(id: string): void {
    if (fijos.has(id)) {
      anunciar("Ese espacio ya quedó en su lugar.");
      return;
    }
    const palabra = colocadas[id];
    if (!palabra) return;
    delete colocadas[id];
    const boton = huecoBotones.find((item) => item.dataset.hueco === id);
    delete boton?.dataset.marca;
    boton?.removeAttribute("aria-describedby");
    palabraElegida = palabra;
    huecoElegido = null;
    pintar();
    anunciar(
      `Sacaste «${palabra}». Elegí otro espacio o pulsá de nuevo la palabra para dejarla en el banco.`,
    );
  }

  function mensajeConfusion(id: string, palabra: string): string | undefined {
    const hueco = huecoPorId(id);
    return hueco.confusiones[palabra as PalabraBanco];
  }

  function revisar(): void {
    limpiarMarcas();
    listaComentarios.replaceChildren();

    let bien = 0;
    let mal = 0;
    let vacios = 0;
    const notas: HTMLLIElement[] = [];

    for (const hueco of huecos) {
      const palabra = colocadas[hueco.id];
      const boton = huecoBotones.find((item) => item.dataset.hueco === hueco.id);
      if (!boton) continue;

      if (palabra === hueco.respuesta) {
        bien += 1;
        fijos.add(hueco.id);
        continue;
      }

      if (!palabra) {
        vacios += 1;
        continue;
      }

      mal += 1;
      fallos[hueco.id] = (fallos[hueco.id] ?? 0) + 1;
      const nivel = Math.min(fallos[hueco.id] - 1, hueco.pistas.length - 1);
      const detalle =
        mensajeConfusion(hueco.id, palabra) ?? hueco.pistas[nivel];

      boton.dataset.marca = "revisar";
      const comentarioId = `comentario-${hueco.id}`;
      boton.setAttribute("aria-describedby", comentarioId);

      const item = document.createElement("li");
      item.id = comentarioId;
      const titulo = document.createElement("p");
      titulo.className = "comentario-espacio";
      titulo.textContent = hueco.contexto;
      const texto = document.createElement("p");
      texto.textContent = detalle;
      item.append(titulo, texto);
      notas.push(item);
    }

    pintar();

    if (bien === huecos.length) {
      comentarios.hidden = true;
      anunciar(CIERRE_OK);
      return;
    }

    if (bien === 0 && mal === 0) {
      comentarios.hidden = true;
      anunciar(
        "Todavía no hay palabras en el texto. Colocá las que puedas y volvé a pulsar Revisar.",
      );
      return;
    }

    const partes: string[] = [];
    if (bien === 0) {
      partes.push("Ningún espacio quedó todavía en su lugar.");
    } else if (bien === 1) {
      partes.push("Hay 1 espacio que ya está en su lugar.");
    } else {
      partes.push(`Hay ${bien} espacios que ya están en su lugar.`);
    }

    if (vacios > 0) {
      partes.push(
        vacios === 1
          ? "Quedó 1 espacio vacío."
          : `Quedaron ${vacios} espacios vacíos.`,
      );
    }

    if (notas.length === 0) {
      comentarios.hidden = true;
      partes.push("Completá los que faltan y volvé a pulsar Revisar.");
      anunciar(partes.join(" "));
      return;
    }

    listaComentarios.append(...notas);
    comentarios.hidden = false;
    comentarios.querySelector("h2")?.focus();
    partes.push(
      notas.length === 1
        ? "Abajo hay un comentario para el espacio que conviene revisar. Podés cambiar esa palabra y volver a pulsar Revisar."
        : "Abajo hay un comentario para cada espacio que conviene revisar. Podés cambiar esas palabras y volver a pulsar Revisar.",
    );
    anunciar(partes.join(" "));
  }

  function vaciar(): void {
    for (const id of Object.keys(colocadas)) {
      delete colocadas[id];
    }
    fijos.clear();
    for (const id of Object.keys(fallos)) {
      delete fallos[id];
    }
    palabraElegida = null;
    huecoElegido = null;
    limpiarMarcas();
    listaComentarios.replaceChildren();
    comentarios.hidden = true;
    pintar();
    anunciar("Espacios vacíos. Las palabras volvieron al banco.");
  }

  function onFicha(ficha: HTMLButtonElement): void {
    if (ficha.disabled) return;
    const palabra = ficha.dataset.palabra ?? "";
    if (!palabra) return;

    if (huecoElegido) {
      colocar(huecoElegido, palabra);
      return;
    }

    if (palabraElegida === palabra) {
      palabraElegida = null;
      pintar();
      anunciar(`${palabra} volvió a quedar disponible en el banco.`);
      return;
    }

    palabraElegida = palabra;
    pintar();
    anunciar(`Seleccionaste «${palabra}». Ahora elegí un espacio en el texto.`);
  }

  function onHueco(boton: HTMLButtonElement): void {
    const id = boton.dataset.hueco ?? "";
    if (!id) return;

    if (fijos.has(id)) {
      anunciar("Ese espacio ya quedó en su lugar.");
      return;
    }

    if (palabraElegida) {
      colocar(id, palabraElegida);
      return;
    }

    if (colocadas[id]) {
      recoger(id);
      return;
    }

    huecoElegido = huecoElegido === id ? null : id;
    pintar();
    if (huecoElegido) {
      anunciar(
        `Espacio «${huecoPorId(id).contexto}» seleccionado. Elegí una palabra del banco.`,
      );
    } else {
      anunciar("Selección cancelada.");
    }
  }

  raiz.addEventListener("click", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element)) return;
    const ficha = destino.closest("[data-palabra]");
    if (ficha instanceof HTMLButtonElement && banco.contains(ficha)) {
      onFicha(ficha);
      return;
    }
    const hueco = destino.closest("[data-hueco]");
    if (hueco instanceof HTMLButtonElement) {
      onHueco(hueco);
    }
  });

  raiz.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      if (palabraElegida || huecoElegido) {
        evento.preventDefault();
        limpiarSeleccion();
      }
    }
  });

  raiz.addEventListener("dragstart", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof HTMLElement) || !evento.dataTransfer) return;

    const ficha = destino.closest("[data-palabra]");
    if (ficha instanceof HTMLButtonElement && !ficha.disabled) {
      const palabra = ficha.dataset.palabra ?? "";
      evento.dataTransfer.setData("text/plain", palabra);
      evento.dataTransfer.effectAllowed = "move";
      palabraElegida = palabra;
      huecoElegido = null;
      pintar();
      return;
    }

    const hueco = destino.closest("[data-hueco]");
    if (hueco instanceof HTMLButtonElement) {
      const id = hueco.dataset.hueco ?? "";
      const palabra = colocadas[id];
      if (!palabra || fijos.has(id)) {
        evento.preventDefault();
        return;
      }
      evento.dataTransfer.setData("text/plain", palabra);
      evento.dataTransfer.setData("text/hueco-origen", id);
      evento.dataTransfer.effectAllowed = "move";
    }
  });

  raiz.addEventListener("dragend", () => {
    palabraElegida = null;
    pintar();
  });

  raiz.addEventListener("dragover", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element)) return;
    if (destino.closest("[data-hueco]") || destino.closest("[data-banco]")) {
      evento.preventDefault();
      if (evento.dataTransfer) evento.dataTransfer.dropEffect = "move";
    }
  });

  raiz.addEventListener("drop", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element) || !evento.dataTransfer) return;
    const palabra = evento.dataTransfer.getData("text/plain");
    if (!palabra) return;
    evento.preventDefault();

    const origenId = evento.dataTransfer.getData("text/hueco-origen");
    const hueco = destino.closest("[data-hueco]");
    if (hueco instanceof HTMLButtonElement) {
      const id = hueco.dataset.hueco ?? "";
      if (origenId && origenId !== id && colocadas[origenId] === palabra) {
        delete colocadas[origenId];
        const origen = huecoBotones.find((item) => item.dataset.hueco === origenId);
        delete origen?.dataset.marca;
        origen?.removeAttribute("aria-describedby");
      }
      colocar(id, palabra);
      return;
    }

    if (destino.closest("[data-banco]") && origenId) {
      delete colocadas[origenId];
      const origen = huecoBotones.find((item) => item.dataset.hueco === origenId);
      delete origen?.dataset.marca;
      origen?.removeAttribute("aria-describedby");
      palabraElegida = null;
      huecoElegido = null;
      pintar();
      anunciar(`«${palabra}» volvió al banco.`);
    }
  });

  botonRevisar.addEventListener("click", revisar);
  botonVaciar.addEventListener("click", vaciar);

  for (const boton of huecoBotones) {
    boton.addEventListener("pointerdown", (evento) => {
      const id = boton.dataset.hueco ?? "";
      boton.draggable =
        evento.pointerType === "mouse" && Boolean(colocadas[id]) && !fijos.has(id);
    });
  }

  for (const ficha of fichas) {
    ficha.addEventListener("pointerdown", (evento) => {
      ficha.draggable = evento.pointerType === "mouse" && !ficha.disabled;
    });
  }

  pintar();
}
