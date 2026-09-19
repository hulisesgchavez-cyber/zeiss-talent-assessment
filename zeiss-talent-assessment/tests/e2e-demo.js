/* Prueba E2E del MODO DEMOSTRACIÓN: node tests/e2e-demo.js [archivo.html] */
'use strict';
const path = require('path');
const { open, shot, assert, OUT } = require('./helpers');

(async () => {
  const file = process.argv[2] || 'app/index.html';
  const offline = process.argv.includes('--offline');
  console.log(`Modo demostración · ${file}${offline ? ' (CDN bloqueado → respaldo local)' : ''}`);
  const { browser, page, errors, external } = await open(file, { offline });
  const tag = path.basename(file, '.html') + (offline ? '-offline' : '');
  try {
    await page.waitForSelector('#screen-landing.is-active');
    await page.waitForTimeout(700);
    assert(await page.evaluate(() => !!window.Chart && !!window.jspdf), 'Chart.js y jsPDF cargados');
    await shot(page, `${tag}-01-landing`);
    await page.click('[data-action="demo"]');
    await page.waitForSelector('.modal');
    await page.click('.modal button:has-text("Recorrido automático")');
    await page.waitForSelector('#demo-badge:not([hidden])');
    assert(true, 'Etiqueta DEMO MODE visible');
    await page.waitForSelector('#screen-examen.is-active', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await shot(page, `${tag}-02-demo-exam`);
    await page.waitForSelector('#screen-dashboard.is-active', { timeout: 90000 });
    await page.waitForTimeout(1200);
    const kpi = await page.evaluate(() => ({
      name: document.querySelector('.dash-head h1').textContent,
      global: document.querySelector('.ring-center b').textContent,
      badge: document.querySelector('.kpi .status-badge').textContent.trim(),
      email: document.querySelectorAll('.delivery-row .chip')[0].textContent,
      canvases: [...document.querySelectorAll('#dash-root canvas')].map((c) => c.width > 0)
    }));
    console.log('   ', kpi);
    assert(kpi.canvases.length === 3 && kpi.canvases.every(Boolean), 'Dashboard con 3 gráficas (dona, radar, barras)');
    assert(/DEMO/.test(kpi.email), 'Envío de correo deshabilitado en DEMO');
    await shot(page, `${tag}-03-dashboard`, true);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="download-pdf"]')]);
    const pdfPath = path.join(OUT, `${tag}-reporte-demo.pdf`);
    await dl.saveAs(pdfPath);
    assert(/^Evaluacion_ZA-\d{4}-\d{4}-\d{5}_.+\.pdf$/.test(dl.suggestedFilename()), 'PDF descargado: ' + dl.suggestedFilename());
    assert(external.length === 0, 'Sin solicitudes de red externas en DEMO (' + external.length + ')');
    assert(errors.length === 0, 'Sin errores de JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
    console.log('PDF:', pdfPath);
  } catch (e) {
    console.error(e.message);
    console.error('Errores JS:', errors);
    await shot(page, `${tag}-error`, true).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); }
})();
