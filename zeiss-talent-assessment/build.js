/* =============================================================================
 * build.js — genera index.html autocontenido (un solo archivo) a partir de app/
 * Uso: node build.js
 * - Inserta styles.css y los módulos JS dentro del HTML.
 * - Conserva Chart.js y jsPDF desde CDN, con respaldo local en app/vendor/.
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, 'app');
const read = (p) => fs.readFileSync(path.join(APP, p), 'utf8');
const safeJs = (code) => code.replace(/<\/script/gi, '<\\/script'); // evita cerrar la etiqueta por accidente

let html = read('index.html');

html = html.replace(/<link rel="stylesheet" href="css\/styles\.css">/, () => `<style>\n${read('css/styles.css')}\n</style>`);
html = html.replace(/<script src="js\/loader-fallback\.js" data-vendor="vendor\/"><\/script>/,
  () => `<script data-vendor="app/vendor/">\n${safeJs(read('js/loader-fallback.js'))}\n</script>`);
html = html.replace(/<script src="js\/([\w-]+\.js)"><\/script>/g, (_, file) => `<script>\n/* ---- ${file} ---- */\n${safeJs(read('js/' + file))}\n</script>`);

const banner = `<!--\n  ZEISS Talent Assessment — versión de un solo archivo.\n  Generado automáticamente por build.js a partir de la carpeta app/ (${new Date().toISOString().slice(0, 10)}).\n  Para modificar el sistema edite los archivos en app/ y ejecute: node build.js\n-->\n`;
html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + banner);

if (/src="js\/|href="css\//.test(html)) throw new Error('Quedaron referencias locales sin incrustar.');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(`index.html generado (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB).`);
