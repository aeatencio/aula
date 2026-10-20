/** Revela trazas ya calculadas al construir la página; no guarda respuestas. */
export function iniciarSeguimiento(documento: Document = document) {
  const comparacion = documento.querySelector<HTMLElement>("[data-comparacion]");
  const ejecuciones = [...documento.querySelectorAll<HTMLElement>("[data-ejecucion]")];
  const terminadas = new Set<HTMLElement>();

  for (const ejecucion of ejecuciones) {
    const tabla = ejecucion.querySelector<HTMLTableElement>("table")!;
    const filas = [...tabla.querySelectorAll<HTMLTableRowElement>("tbody tr")].slice(1);
    // La pantalla aparece recién cuando se ejecutó «Mostrar».
    const pantalla = tabla.querySelector<HTMLTableRowElement>("tfoot tr");
    const siguiente = ejecucion.querySelector<HTMLButtonElement>("[data-siguiente]")!;
    const reiniciar = ejecucion.querySelector<HTMLButtonElement>("[data-reiniciar]")!;
    const estado = ejecucion.querySelector<HTMLElement>("[role=status]")!;
    let paso = 0;

    function marcarPendiente(fila: HTMLTableRowElement, pendiente: boolean) {
      fila.classList.toggle("pendiente", pendiente);
      fila.querySelectorAll("td").forEach((celda) => {
        if (pendiente) celda.setAttribute("aria-label", "Sin ejecutar");
        else celda.removeAttribute("aria-label");
      });
    }

    function actualizar() {
      filas.forEach((fila, indice) => {
        marcarPendiente(fila, indice >= paso);
        fila.classList.toggle("actual", indice === paso - 1);
        if (indice === paso - 1) fila.setAttribute("aria-current", "step");
        else fila.removeAttribute("aria-current");
      });
      if (pantalla) {
        marcarPendiente(pantalla, !filas.slice(0, paso).some((fila) => fila.hasAttribute("data-muestra")));
      }

      const termino = paso === filas.length;
      if (termino) terminadas.add(ejecucion);
      else terminadas.delete(ejecucion);
      siguiente.disabled = termino;
      siguiente.textContent = termino
        ? "Programa terminado"
        : `Ejecutar instrucción ${filas[paso].dataset.instruccion}`;
      reiniciar.disabled = paso === 0;
      estado.textContent = paso === 0
        ? `Paso 0 de ${filas.length}. Antes de ejecutar, predecí qué va a mostrar.`
        : `Paso ${paso} de ${filas.length}. Se ejecutó la instrucción ${filas[paso - 1].dataset.instruccion}.`;
      if (comparacion) comparacion.hidden = terminadas.size !== ejecuciones.length;
    }

    siguiente.addEventListener("click", () => {
      if (paso < filas.length) { paso++; actualizar(); }
    });
    reiniciar.addEventListener("click", () => { paso = 0; actualizar(); });
    actualizar();
    ejecucion.querySelector<HTMLElement>(".controles")!.hidden = false;
    ejecucion.dataset.iniciada = "";
  }
  documento.querySelector<HTMLElement>(".leyenda")?.removeAttribute("hidden");
}
