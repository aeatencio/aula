/*
  Probador de órdenes de «Cuándo importa el orden», en pantalla: predecir qué
  muestra un programa, ejecutarlo paso a paso, cambiar el orden y comparar.
  Ejecuta con `seguir`, la misma función que calcula la hoja y la clave. No
  guarda nada: al recargar la página, todo vuelve al comienzo.
*/
import {
  formatear,
  probadores,
  seguir,
  type Fila,
  type Instruccion,
  type Probador,
} from "../data/actividad-cuando-importa-el-orden.ts";

const sinPunto = (texto: string) => texto.replace(/\.$/, "");

export function iniciarProbadores(documento: Document = document) {
  for (const raiz of documento.querySelectorAll<HTMLElement>("[data-probador]")) {
    const probador = probadores.find((p) => p.id === raiz.dataset.probador);
    if (probador) iniciarProbador(raiz, probador);
  }
}

function iniciarProbador(raiz: HTMLElement, probador: Probador) {
  const { programa } = probador;
  const lista = raiz.querySelector<HTMLOListElement>("[data-orden]")!;
  const items = [...lista.querySelectorAll<HTMLLIElement>("li[data-instruccion]")];
  const prediccion = raiz.querySelector<HTMLInputElement>("[data-prediccion]")!;
  const siguiente = raiz.querySelector<HTMLButtonElement>("[data-siguiente]")!;
  const reiniciar = raiz.querySelector<HTMLButtonElement>("[data-reiniciar]")!;
  const estado = raiz.querySelector<HTMLElement>("[role=status]")!;
  const devolucion = raiz.querySelector<HTMLElement>("[data-devolucion]")!;
  const historial = raiz.querySelector<HTMLOListElement>("[data-historial]")!;
  const filasTabla = [...raiz.querySelectorAll<HTMLTableRowElement>("table tbody tr")].slice(1);
  const pantalla = raiz.querySelector<HTMLTableRowElement>("table tfoot tr")!;
  const desafios = [...raiz.querySelectorAll<HTMLLIElement>("[data-desafio]")];
  const moviles = programa.instrucciones.length - probador.fijasAlFinal;

  // El orden actual: índices de las instrucciones del programa inicial.
  let orden = programa.instrucciones.map((_, i) => i);
  let paso = 0;
  let filas: Fila[] = [];
  const probados = new Map<string, { texto: string; muestra?: number }>();

  const instrucciones = (): Instruccion[] => orden.map((i) => programa.instrucciones[i]);

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= moviles) return;
    [orden[desde], orden[hasta]] = [orden[hasta], orden[desde]];
    paso = 0;
    prediccion.value = "";
    devolucion.textContent = "";
    actualizar();
    // El foco sigue a la instrucción que se movió.
    lista.children[hasta]?.querySelector<HTMLButtonElement>(desde > hasta ? "[data-subir]" : "[data-bajar]")?.focus();
  }

  function actualizar() {
    filas = seguir({ ...programa, instrucciones: instrucciones() });
    orden.forEach((indice, posicion) => {
      const item = items[indice];
      lista.append(item);
      item.querySelector<HTMLElement>("[data-numero]")!.textContent = `${posicion + 1}.`;
      item.querySelector<HTMLButtonElement>("[data-subir]")?.toggleAttribute("disabled", posicion === 0);
      item.querySelector<HTMLButtonElement>("[data-bajar]")?.toggleAttribute("disabled", posicion >= moviles - 1);
    });
    filasTabla.forEach((tr, i) => {
      const fila = filas[i];
      const ejecutada = i < paso;
      tr.querySelector("th span:last-child")!.textContent = fila.texto;
      tr.classList.toggle("pendiente", !ejecutada);
      tr.classList.toggle("actual", i === paso - 1);
      tr.querySelectorAll<HTMLElement>("td .valor").forEach((valor, c) => {
        valor.textContent = ejecutada ? formatear(fila.memoria[programa.casilleros[c]]) : "";
      });
    });
    const mostrado = filas.slice(0, paso).findLast((f) => f.muestra !== undefined)?.muestra;
    pantalla.querySelector<HTMLElement>(".valor")!.textContent = mostrado === undefined ? "" : formatear(mostrado);

    const termino = paso === filas.length;
    const hayPrediccion = prediccion.value.trim() !== "";
    prediccion.readOnly = paso > 0;
    siguiente.disabled = termino || !hayPrediccion;
    siguiente.textContent = termino ? "Programa terminado" : `Ejecutar instrucción ${paso + 1}`;
    reiniciar.disabled = paso === 0;
    estado.textContent = !hayPrediccion && paso === 0
      ? "Escribí tu predicción para poder ejecutar."
      : paso === 0
        ? `Paso 0 de ${filas.length}.`
        : `Paso ${paso} de ${filas.length}. Se ejecutó la instrucción ${paso}.`;
  }

  function terminar() {
    const final = filas[filas.length - 1].memoria;
    const muestra = filas.findLast((f) => f.muestra !== undefined)?.muestra;
    const predicho = Number(prediccion.value.replace(",", "."));
    const lineas: string[] = [];
    lineas.push(muestra === predicho
      ? `La pantalla mostró ${formatear(muestra)}: coincide con tu predicción.`
      : `La pantalla mostró ${muestra === undefined ? "nada" : formatear(muestra)}; tu predicción era ${prediccion.value}. ` +
        "Buscá en la tabla la primera fila que no es como esperabas.");
    for (const uso of probador.usos) {
      const i = filas.findIndex((f) => f.texto === uso.instruccion);
      const antes = i === 0 ? programa.inicial : filas[i - 1].memoria;
      lineas.push(`Cuando se ejecutó «${sinPunto(uso.instruccion)}», ${uso.casillero} valía ${formatear(antes[uso.casillero])}.`);
    }

    const texto = filas.map((f) => sinPunto(f.texto)).join(" · ");
    if (!probados.has(texto)) {
      probados.set(texto, { texto, muestra });
      const item = raiz.ownerDocument.createElement("li");
      item.textContent = `${texto} → mostró ${muestra === undefined ? "nada" : formatear(muestra)}` +
        (programa.casilleros.length > 1 ? ` (al final, ${programa.casilleros.map((c) => `${c} = ${formatear(final[c])}`).join(", ")})` : "");
      historial.append(item);
    }
    if (probados.size > 1) {
      const muestras = new Set([...probados.values()].map((p) => p.muestra));
      lineas.push(muestras.size === 1
        ? `Los ${probados.size} órdenes que probaste mostraron lo mismo.`
        : `Los ${probados.size} órdenes que probaste no mostraron lo mismo.`);
    }
    probador.desafios.forEach((desafio, i) => {
      if (desafio.cumple({ muestra, memoria: final })) {
        desafios[i].classList.add("cumplido");
        desafios[i].querySelector("[data-marca]")!.textContent = "Logrado";
        lineas.push(`Desafío logrado: ${desafio.texto}`);
      }
    });
    devolucion.replaceChildren(...lineas.map((linea) => {
      const p = raiz.ownerDocument.createElement("p");
      p.textContent = linea;
      return p;
    }));
  }

  items.forEach((item) => {
    const posicion = () => orden.indexOf(Number(item.dataset.instruccion));
    item.querySelector("[data-subir]")?.addEventListener("click", () => mover(posicion(), posicion() - 1));
    item.querySelector("[data-bajar]")?.addEventListener("click", () => mover(posicion(), posicion() + 1));
  });
  prediccion.addEventListener("input", actualizar);
  siguiente.addEventListener("click", () => {
    if (paso >= filas.length || prediccion.value.trim() === "") return;
    paso++;
    actualizar();
    if (paso === filas.length) terminar();
  });
  reiniciar.addEventListener("click", () => {
    paso = 0;
    prediccion.value = "";
    devolucion.textContent = "";
    actualizar();
    prediccion.focus();
  });

  actualizar();
  raiz.querySelectorAll<HTMLElement>("[data-con-js]").forEach((el) => (el.hidden = false));
  raiz.querySelectorAll<HTMLElement>("[data-sin-js]").forEach((el) => (el.hidden = true));
  raiz.dataset.iniciado = "";
}
