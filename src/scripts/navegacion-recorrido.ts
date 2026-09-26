export type DireccionRecorrido = "prev" | "next";

const UMBRAL_SWIPE = 64;
const PREDOMINIO_HORIZONTAL = 1.5;
const DURACION_MAXIMA_SWIPE = 900;
const BORDE_GESTO_NATIVO = 32;

const SELECTOR_REGION_INTERACTIVA = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[draggable='true']",
  "[role='button']",
  "[role='combobox']",
  "[role='grid']",
  "[role='listbox']",
  "[role='menu']",
  "[role='option']",
  "[role='scrollbar']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='tab']",
  "[role='tree']",
  "[data-navegacion-recorrido-excluir]",
].join(",");

type EventoTeclado = Pick<
  KeyboardEvent,
  | "altKey"
  | "ctrlKey"
  | "defaultPrevented"
  | "key"
  | "metaKey"
  | "repeat"
  | "shiftKey"
>;

export interface MovimientoSwipe {
  inicioX: number;
  inicioY: number;
  finX: number;
  finY: number;
  desplazamientoVerticalMaximo: number;
  inicioMs: number;
  finMs: number;
  anchoViewport: number;
  seleccionActiva?: boolean;
}

export type ResolucionEnlaceRecorrido =
  | { tipo: "dentro"; href: string }
  | { tipo: "fuera" }
  | { tipo: "ignorar" };

interface GestoTactil {
  identificador: number;
  inicioX: number;
  inicioY: number;
  inicioMs: number;
  desplazamientoVerticalMaximo: number;
}

export function direccionPorTecla(
  evento: EventoTeclado,
  estaEnRegionInteractiva = false,
): DireccionRecorrido | null {
  if (
    evento.defaultPrevented ||
    evento.altKey ||
    evento.ctrlKey ||
    evento.metaKey ||
    evento.shiftKey ||
    evento.repeat ||
    estaEnRegionInteractiva
  ) {
    return null;
  }

  if (evento.key === "ArrowLeft") return "prev";
  if (evento.key === "ArrowRight") return "next";
  return null;
}

export function direccionPorSwipe(
  movimiento: MovimientoSwipe,
): DireccionRecorrido | null {
  const duracion = movimiento.finMs - movimiento.inicioMs;
  const cercaDelBorde =
    movimiento.inicioX < BORDE_GESTO_NATIVO ||
    movimiento.inicioX > movimiento.anchoViewport - BORDE_GESTO_NATIVO;

  if (
    movimiento.seleccionActiva ||
    cercaDelBorde ||
    duracion < 0 ||
    duracion > DURACION_MAXIMA_SWIPE
  ) {
    return null;
  }

  const deltaX = movimiento.finX - movimiento.inicioX;
  const deltaY = movimiento.finY - movimiento.inicioY;
  const distanciaHorizontal = Math.abs(deltaX);
  const distanciaVertical = Math.max(
    Math.abs(deltaY),
    movimiento.desplazamientoVerticalMaximo,
  );

  if (
    distanciaHorizontal < UMBRAL_SWIPE ||
    distanciaHorizontal < distanciaVertical * PREDOMINIO_HORIZONTAL
  ) {
    return null;
  }

  return deltaX < 0 ? "next" : "prev";
}

export function mostrarNavegacionActiva(
  raiz: ParentNode,
  recorridoId: string | null,
  esVisible: (navegacion: HTMLElement) => boolean = navegacionEsVisible,
): HTMLElement | null {
  if (!recorridoId) return null;

  const navegaciones = raiz.querySelectorAll<HTMLElement>(
    "nav.recorrido[data-recorrido-id]",
  );
  for (const navegacion of navegaciones) {
    if (navegacion.dataset.recorridoId !== recorridoId) continue;
    navegacion.hidden = false;
    return esVisible(navegacion) ? navegacion : null;
  }

  return null;
}

function normalizarPathname(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function resolverEnlaceRecorrido(
  href: string,
  baseHref: string,
  recorridoId: string,
  materiales: readonly string[],
): ResolucionEnlaceRecorrido {
  let base: URL;
  let destino: URL;

  try {
    base = new URL(baseHref);
    destino = new URL(href, base);
  } catch {
    return { tipo: "ignorar" };
  }

  if (
    (destino.protocol !== "http:" && destino.protocol !== "https:") ||
    destino.origin !== base.origin
  ) {
    return { tipo: "ignorar" };
  }

  const pertenece = materiales.some(
    (material) =>
      normalizarPathname(new URL(material, base).pathname) ===
      normalizarPathname(destino.pathname),
  );
  if (!pertenece) return { tipo: "fuera" };

  destino.searchParams.set("recorrido", recorridoId);
  return {
    tipo: "dentro",
    href: `${destino.pathname}${destino.search}${destino.hash}`,
  };
}

export function prepararEnlacesDelRecorrido(
  raiz: ParentNode,
  navegacion: HTMLElement,
  baseHref: string,
  recorridoId: string,
): void {
  const materialesSerializados = navegacion.dataset.recorridoMateriales;
  if (!materialesSerializados) return;

  let materiales: string[];
  try {
    const valor = JSON.parse(materialesSerializados);
    if (
      !Array.isArray(valor) ||
      !valor.every((item) => typeof item === "string")
    ) {
      return;
    }
    materiales = valor;
  } catch {
    return;
  }

  const enlaces = raiz.querySelectorAll<HTMLAnchorElement>("a[href]");
  for (const enlace of enlaces) {
    if (
      enlace.closest("[data-navegacion-recorrido]") ||
      enlace.hasAttribute("download")
    ) {
      continue;
    }

    const href = enlace.getAttribute("href");
    if (!href) continue;

    const resolucion = resolverEnlaceRecorrido(
      href,
      baseHref,
      recorridoId,
      materiales,
    );
    if (resolucion.tipo === "dentro") {
      enlace.setAttribute("href", resolucion.href);
      continue;
    }
    if (resolucion.tipo !== "fuera") continue;
    if (enlace.hasAttribute("data-recorrido-salida")) continue;

    enlace.setAttribute("data-recorrido-salida", "");
    const nombre = enlace.getAttribute("aria-label") || enlace.textContent?.trim();
    if (nombre) {
      enlace.setAttribute("aria-label", `${nombre} (fuera del recorrido)`);
    }
  }
}

function navegacionEsVisible(navegacion: HTMLElement): boolean {
  if (!navegacion.isConnected || navegacion.hidden || navegacion.closest("[hidden]")) {
    return false;
  }

  const estilo = window.getComputedStyle(navegacion);
  return estilo.display !== "none" && estilo.visibility !== "hidden";
}

function elementoObjetivo(objetivo: EventTarget | null): Element | null {
  return objetivo instanceof Element ? objetivo : null;
}

function estaEnRegionInteractiva(objetivo: EventTarget | null): boolean {
  return Boolean(elementoObjetivo(objetivo)?.closest(SELECTOR_REGION_INTERACTIVA));
}

function haySeleccion(): boolean {
  const seleccion = window.getSelection();
  return Boolean(seleccion && !seleccion.isCollapsed);
}

function toquePorIdentificador(
  toques: TouchList,
  identificador: number,
): Touch | null {
  for (let indice = 0; indice < toques.length; indice += 1) {
    const toque = toques.item(indice);
    if (toque?.identifier === identificador) return toque;
  }
  return null;
}

export function iniciarNavegacionRecorrido(): void {
  const raiz = document.querySelector("[data-navegacion-recorrido]");
  if (!(raiz instanceof HTMLElement)) return;

  const recorridoId = new URLSearchParams(window.location.search).get(
    "recorrido",
  );
  if (!recorridoId) return;
  const navegacion = mostrarNavegacionActiva(raiz, recorridoId);
  if (!navegacion) return;

  const contenido = document.querySelector("main");
  if (contenido) {
    prepararEnlacesDelRecorrido(
      contenido,
      navegacion,
      window.location.href,
      recorridoId,
    );
  }

  const enlaces: Record<DireccionRecorrido, HTMLAnchorElement | null> = {
    prev: navegacion.querySelector<HTMLAnchorElement>("a[rel~='prev']"),
    next: navegacion.querySelector<HTMLAnchorElement>("a[rel~='next']"),
  };
  if (!enlaces.prev && !enlaces.next) return;

  let navegando = false;
  let arrastreActivo = false;
  let gesto: GestoTactil | null = null;

  window.addEventListener("pageshow", (evento) => {
    if (!evento.persisted) return;
    navegando = false;
    gesto = null;
    arrastreActivo = false;
  });

  function navegar(direccion: DireccionRecorrido): boolean {
    const enlace = enlaces[direccion];
    if (!enlace || navegando) return false;
    navegando = true;
    enlace.click();
    return true;
  }

  document.addEventListener("keydown", (evento) => {
    if (arrastreActivo) return;
    const direccion = direccionPorTecla(
      evento,
      estaEnRegionInteractiva(evento.target),
    );
    if (direccion && navegar(direccion)) evento.preventDefault();
  });

  document.addEventListener("dragstart", () => {
    arrastreActivo = true;
    gesto = null;
  });
  document.addEventListener("dragend", () => {
    arrastreActivo = false;
  });
  document.addEventListener("drop", () => {
    arrastreActivo = false;
  });
  document.addEventListener("selectionchange", () => {
    if (haySeleccion()) gesto = null;
  });

  document.addEventListener(
    "touchstart",
    (evento) => {
      gesto = null;
      if (
        navegando ||
        arrastreActivo ||
        evento.touches.length !== 1 ||
        estaEnRegionInteractiva(evento.target) ||
        haySeleccion()
      ) {
        return;
      }

      const toque = evento.touches.item(0);
      if (
        !toque ||
        toque.clientX < BORDE_GESTO_NATIVO ||
        toque.clientX > window.innerWidth - BORDE_GESTO_NATIVO
      ) {
        return;
      }

      gesto = {
        identificador: toque.identifier,
        inicioX: toque.clientX,
        inicioY: toque.clientY,
        inicioMs: evento.timeStamp,
        desplazamientoVerticalMaximo: 0,
      };
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    (evento) => {
      if (!gesto || evento.touches.length !== 1 || haySeleccion()) {
        gesto = null;
        return;
      }

      const toque = toquePorIdentificador(evento.touches, gesto.identificador);
      if (!toque) {
        gesto = null;
        return;
      }

      gesto.desplazamientoVerticalMaximo = Math.max(
        gesto.desplazamientoVerticalMaximo,
        Math.abs(toque.clientY - gesto.inicioY),
      );
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    (evento) => {
      const gestoTerminado = gesto;
      gesto = null;
      if (!gestoTerminado || evento.touches.length > 0 || haySeleccion()) return;

      const toque = toquePorIdentificador(
        evento.changedTouches,
        gestoTerminado.identificador,
      );
      if (!toque) return;

      const direccion = direccionPorSwipe({
        inicioX: gestoTerminado.inicioX,
        inicioY: gestoTerminado.inicioY,
        finX: toque.clientX,
        finY: toque.clientY,
        desplazamientoVerticalMaximo:
          gestoTerminado.desplazamientoVerticalMaximo,
        inicioMs: gestoTerminado.inicioMs,
        finMs: evento.timeStamp,
        anchoViewport: window.innerWidth,
      });
      if (direccion) navegar(direccion);
    },
    { passive: true },
  );

  document.addEventListener(
    "touchcancel",
    () => {
      gesto = null;
    },
    { passive: true },
  );
}
