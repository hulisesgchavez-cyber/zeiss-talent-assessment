/* Prueba E2E: fin de tiempo automático y vista móvil: node tests/e2e-timeout-mobile.js [archivo.html] */
'use strict';
const path = require('path');
const { open, answerCurrent, shot, assert, OUT } = require('./helpers');
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim());

(async () => {
  const file = process.argv[2] || 'app/index.html';
  const { browser, page, errors } = await open(file, { clock: true, viewport: { width: 390, height: 844 } });
  try {
    await page.waitForSelector('#screen-landing.is-active');
    await page.waitForTimeout(600);
    await shot(page, 'm-01-landing');
    await page.click('[data-action="start"]');
    const data = { nombre: 'Luis Fernando Castro', correo: 'luis.castro@correo.com', telefono: '+52 664 555 0101', puesto: 'Operador de Producción', area: 'Surfacing', evaluador: 'Candy Páramo' };
    for (const [k, v] of Object.entries(data)) await page.fill(`#f-${k}`, v);
    await page.selectOption('#f-perfil', 'operativo');
    await page.click('#form-registro button[type="submit"]');
    await page.check('#consent-check');
    await page.click('#consent-continue');
    await page.click('[data-action="begin-exam"]');
    await page.waitForSelector('#screen-examen.is-active');
    await page.waitForTimeout(500);
    await shot(page, 'm-02-pregunta-sjt');
    await answerCurrent(page); await page.click('#q-next');
    await page.waitForTimeout(300);
    await shot(page, 'm-03-pregunta-likert');
    const box = await page.$eval('.likert .option', (el) => el.getBoundingClientRect().height);
    assert(box >= 44, `Opciones táctiles de al menos 44 px en móvil (${Math.round(box)} px)`);
    assert(await page.$eval('#timer', (t) => t.getBoundingClientRect().top < 140), 'Cronómetro visible en la parte superior en móvil');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Sin desplazamiento horizontal en móvil');

    console.log('Fin de tiempo');
    await page.clock.fastForward(60 * 60 * 1000 + 2000);
    await page.waitForSelector('.modal');
    assert((await text(page, '#m-title')) === 'El tiempo de evaluación ha finalizado.', 'Mensaje "El tiempo de evaluación ha finalizado."');
    assert((await text(page, '#timer-value')) === '00:00', 'Cronómetro en 00:00');
    await page.waitForTimeout(400);
    await shot(page, 'm-04-tiempo-finalizado');
    await page.clock.fastForward(6500);
    await page.waitForSelector('#screen-procesamiento.is-active');
    assert(true, 'Procesamiento automático sin intervención del candidato');
    await page.clock.fastForward(5000);
    await page.waitForSelector('text=Tu evaluación ha sido registrada correctamente.', { timeout: 20000 });

    await page.click('[data-action="hr-access"]');
    await page.fill('.modal input[name="pin"]', '2026');
    await page.click('.modal button:has-text("Entrar")');
    await page.waitForSelector('#screen-dashboard.is-active');
    const dash = await text(page, '#dash-root');
    assert(dash.includes('REQUIERE VALIDACIÓN ADICIONAL'), 'Clasificación: requiere validación adicional (tiempo agotado)');
    assert(dash.includes('tiempo agotado') && dash.includes('Preguntas respondidas: 1 de 100'), 'Indicadores de tiempo agotado y respuestas incompletas');
    await page.clock.fastForward(1500);
    await page.waitForTimeout(400);
    await shot(page, 'm-05-dashboard');
    const wide = await page.evaluate(() => [...document.querySelectorAll('#screen-dashboard *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest('[style*="overflow-x"]')).slice(0, 6).map((e) => e.tagName + '.' + (typeof e.className === 'string' ? e.className : '') + ' ' + Math.round(e.getBoundingClientRect().width)));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Dashboard sin desplazamiento horizontal en móvil ' + wide.join(', '));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="download-pdf"]')]);
    await dl.saveAs(path.join(OUT, 'reporte-tiempo-agotado.pdf'));
    assert(true, 'PDF generado con resultados parciales');
    assert(errors.length === 0, 'Sin errores de JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
    console.log('\nFin de tiempo y vista móvil: todas las verificaciones pasaron.');
  } catch (e) {
    console.error(e.message, errors);
    await shot(page, 'm-error', true).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); }
})();
