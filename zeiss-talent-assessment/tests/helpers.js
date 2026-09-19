/* Utilidades de prueba E2E (Playwright). Requiere playwright-core y Chromium. */
'use strict';
const path = require('path');
const fs = require('fs');
const PW = process.env.PLAYWRIGHT_CORE || 'playwright-core';
const { chromium } = require(PW);

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'app', 'vendor');
const OUT = process.env.TEST_OUT || path.join(ROOT, 'tests', 'output');
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const c = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
  return c || undefined;
}

/**
 * Abre la aplicación. El CDN se sirve desde vendor/ (o se bloquea con offline=true
 * para probar el respaldo local); las fuentes de Google se bloquean.
 */
async function open(file, { viewport = { width: 1440, height: 900 }, offline = false, clock = false, storage = null } = {}) {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ viewport, acceptDownloads: true, deviceScaleFactor: 1 });
  const errors = [];
  const external = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://127.0.0.1')) return route.continue();
    if (url.includes('cdn.jsdelivr.net')) {
      if (offline) return route.abort();
      const file = url.includes('chart.js') ? 'chart.umd.min.js' : 'jspdf.umd.min.js';
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(VENDOR, file)) });
    }
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return route.abort();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  if (clock) await page.clock.install({ time: new Date('2026-09-18T10:00:00-07:00') });
  // Las fuentes de Google se bloquean a propósito en las pruebas: se ignoran esos avisos.
  // En modo sin conexión también se ignora el fallo esperado del CDN (se usa el respaldo local).
  const ignored = offline ? /fonts\.(googleapis|gstatic)|cdn\.jsdelivr\.net/ : /fonts\.(googleapis|gstatic)/;
  page.on('console', (m) => { if (m.type() === 'error' && !ignored.test((m.location() || {}).url || '')) errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  if (storage) await page.addInitScript((s) => { Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v)); }, storage);
  await page.goto(/^https?:/.test(file) ? file : 'file://' + path.join(ROOT, file));
  return { browser, context, page, errors, external };
}

/** Responde la pregunta visible usando la clave del banco (best=true) o una respuesta fija. */
async function answerCurrent(page, mode = 'best') {
  return page.evaluate((mode) => {
    const n = +document.querySelector('.q-number').textContent.match(/Pregunta (\d+)/)[1];
    const q = window.ZTA.QUESTION_BANK.questions[n - 1];
    const click = (sel) => document.querySelector(sel).click();
    if (q.type === 'grid') { (mode === 'best' ? q.answer : [0]).forEach((i) => click(`.grid-item[data-idx="${i}"]`)); }
    else {
      let v;
      if (q.type === 'likert') v = mode === 'best' ? (q.reverse ? 1 : 5) : 3;
      else if (q.type === 'sjt') v = mode === 'best' ? q.options.findIndex((o) => o.s === 3) : 0;
      else v = mode === 'best' ? q.answer : 0;
      click(`#q-root input[name="ans"][value="${v}"]`);
    }
    return { n, id: q.id, type: q.type };
  }, mode);
}

const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full });
const assert = (cond, msg) => { if (!cond) throw new Error('FALLÓ: ' + msg); console.log('  ✓ ' + msg); };

module.exports = { open, answerCurrent, shot, assert, OUT, ROOT };
