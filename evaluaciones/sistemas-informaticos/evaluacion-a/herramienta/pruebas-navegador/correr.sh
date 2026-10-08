#!/bin/bash
# Pruebas en Chrome real de la herramienta de la Evaluación A (datos ficticios).
# Requiere WSL con Chrome y Node.js de Windows, como fuente/generar-pdf.mjs.
# Lanza un Chrome headless con perfil propio, ejecuta un guion por DevTools con
# el node.exe de Windows y cierra sólo esa instancia de Chrome. Perfil,
# descargas y capturas quedan en <repo>/tmp/herramienta-evaluacion-a-navegador/.
#
#   ./correr.sh flujo.mjs
#   ./correr.sh layout.mjs despues 1650,1100,820,700,600,480
# Por defecto abre index.html desde el disco (file://). Para probar la URL local
# de `npm run dev`:
#   URL_HERRAMIENTA=http://localhost:4321/herramientas/evaluacion-a/ ./correr.sh flujo.mjs
set -u
D=$(cd "$(dirname "$0")" && pwd)
REPO=$(git -C "$D" rev-parse --show-toplevel)
SALIDA="$REPO/tmp/herramienta-evaluacion-a-navegador"
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
NODE="/mnt/c/Program Files/nodejs/node.exe"
for x in "$CHROME" "$NODE"; do [ -e "$x" ] || { echo "No se encontró $x" >&2; exit 2; }; done
mkdir -p "$SALIDA/perfil" "$SALIDA/descargas"

PERFIL=$(wslpath -w "$SALIDA/perfil")
URL="${URL_HERRAMIENTA:-file:///$(wslpath -w "$D/../index.html" | sed 's#\\#/#g')}"
("$CHROME" --headless=new --remote-debugging-port=9333 --user-data-dir="$PERFIL" --window-size=1280,1000 --no-first-run "$URL" >/dev/null 2>&1 &)
sleep 3
guion=$1; shift
timeout 180 "$NODE" "$(wslpath -w "$D/$guion")" "$(wslpath -w "$SALIDA")" "$@"
estado=$?
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.Name -eq 'chrome.exe' -and \$_.CommandLine -like '*herramienta-evaluacion-a-navegador*perfil*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null
exit $estado
