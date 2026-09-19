/* Prueba E2E del flujo completo del candidato y de RH: node tests/e2e-candidate.js [archivo.html] */
'use strict';
const path = require('path');
const { open, answerCurrent, shot, assert, OUT } = require('./helpers');

const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim());
const active = (page) => page.$eval('.screen.is-active', (el) => el.id.replace('screen-', ''));

async function fillRegistro(page, data) {
  for (const [k, v] of Object.entries(data)) await page.fill(`#f-${k}`, v);
}
async function pin(page, value) {
  await page.waitForSelector('.modal input[name="pin"]');
  await page.fill('.modal input[name="pin"]', value);
  await page.click('.modal button:has-text("Entrar")');
}
/** Avanza respondiendo hasta la pregunta n (1-based) o hasta la confirmación. */
async function answerUntil(page, n, opts = {}) {
  for (let guard = 0; guard < 140; guard++) {
    const scr = await active(page);
    if (scr === 'transicion') { if (opts.shotTransition) { await page.waitForTimeout(700); await shot(page, 'c-06-transicion'); opts.shotTransition = false; } await page.click('[data-action="continue-battery"]'); continue; }
    if (scr !== 'examen') return scr;
    const cur = +(await text(page, '.q-number')).match(/(\d+)/)[1];
    if (cur >= n) return 'examen';
    const q = await answerCurrent(page, opts.risky && opts.risky.includes(cur) ? 'risky' : 'best');
    if (opts.risky && opts.risky.includes(cur)) await page.evaluate(() => { const el = document.querySelector('#q-root input[value="0"]'); el.click(); });
    await page.click('#q-next');
    if (q.n === 100) return active(page);
  }
  return active(page);
}

(async () => {
  const file = process.argv[2] || 'app/index.html';
  const { browser, page, errors, external } = await open(file, { clock: true });
  try {
    console.log('1. Registro, validación y consentimiento');
    await page.waitForSelector('#screen-landing.is-active');
    await page.click('[data-action="start"]');
    await page.waitForSelector('#screen-registro.is-active');
    const id = await text(page, '#reg-id');
    assert(/^ZA-2026-0918-\d{5}$/.test(id), 'Assessment ID generado: ' + id);
    await page.click('#form-registro button[type="submit"]');
    assert((await page.$$('.field.has-error')).length >= 5, 'Campos obligatorios marcados con error');
    await fillRegistro(page, { nombre: 'Ana', correo: 'ana@', telefono: '12345', puesto: 'Analista', area: 'RH', evaluador: 'Hugo Guerrero' });
    await page.click('#form-registro button[type="submit"]');
    const errs = await page.$$eval('.field.has-error', (els) => els.map((e) => e.querySelector('input').id));
    assert(errs.includes('f-nombre') && errs.includes('f-correo') && errs.includes('f-telefono'), 'Valida nombre completo, correo y teléfono');
    await page.waitForTimeout(500);
    await shot(page, 'c-01-registro-errores');
    await fillRegistro(page, { nombre: 'Ana <b>Martínez</b> Ruiz', correo: 'ana.martinez@correo.com', telefono: '(664) 123-4567' });
    await page.click('#form-registro button[type="submit"]');
    assert((await page.$$('.field.has-error')).length === 1, 'Rechaza etiquetas HTML en el nombre');
    await page.fill('#f-nombre', 'Ana Martínez Ruiz');
    await page.selectOption('#f-perfil', 'supervisor');
    await page.click('#form-registro button[type="submit"]');
    await page.waitForSelector('#screen-consentimiento.is-active');
    assert(await page.$eval('#consent-continue', (b) => b.disabled), 'No permite continuar sin consentimiento');
    await page.check('#consent-check');
    assert(!(await page.$eval('#consent-continue', (b) => b.disabled)), 'Consentimiento habilita el botón');
    await shot(page, 'c-02-consentimiento');
    await page.click('#consent-continue');
    await page.waitForSelector('#screen-instrucciones.is-active');
    await page.waitForTimeout(500);
    await shot(page, 'c-03-instrucciones', true);

    console.log('2. Examen, navegación, teclado y progreso');
    await page.click('[data-action="begin-exam"]');
    await page.waitForSelector('#screen-examen.is-active');
    assert((await text(page, '#xp-count')) === 'Pregunta 1 de 100', 'Muestra "Pregunta 1 de 100"');
    assert((await text(page, '#xb-count')) === 'Batería 1 de 10', 'Muestra "Batería 1 de 10"');
    assert(/^(60:00|59:5\d)$/.test(await text(page, '#timer-value')), 'Cronómetro inicia en 60:00');
    assert(await page.$eval('#q-next', (b) => b.disabled), '"Siguiente" deshabilitado sin respuesta');
    assert(await page.$eval('#q-prev', (b) => b.disabled), '"Anterior" deshabilitado al inicio de la batería');
    await page.waitForTimeout(500);
    await shot(page, 'c-04-pregunta-sjt');
    await page.keyboard.press('b');
    assert(await page.$eval('#q-root input[value="1"]', (i) => i.checked), 'Tecla B selecciona la opción B');
    await page.keyboard.press('Enter');
    assert((await text(page, '#xp-count')) === 'Pregunta 2 de 100', 'Enter avanza a la pregunta 2');
    await shot(page, 'c-05-pregunta-likert');
    await page.keyboard.press('4');
    assert(await page.$eval('#q-root input[value="4"]', (i) => i.checked), 'Tecla 4 selecciona "De acuerdo"');
    await page.click('#q-next');
    await page.click('#q-prev');
    assert((await text(page, '#xp-count')) === 'Pregunta 2 de 100' && (await page.$eval('#q-root input[value="4"]', (i) => i.checked)), 'Regresa y conserva la respuesta');
    await page.click('#q-next');
    await answerUntil(page, 6);
    assert((await text(page, '#xp-pct')) === '5% completado', 'Progreso 5% tras 5 respuestas');

    console.log('3. Recuperación de sesión (recarga accidental)');
    page.once('dialog', (d) => d.accept());
    await page.reload();
    await page.waitForSelector('.modal');
    assert((await text(page, '#m-title')) === 'Se recuperó una sesión de evaluación existente.', 'Mensaje de sesión recuperada');
    await page.waitForTimeout(700);
    await shot(page, 'c-07-recuperacion');
    await page.click('.modal button:has-text("Continuar evaluación")');
    await page.waitForSelector('#screen-examen.is-active');
    assert((await text(page, '#xp-count')) === 'Pregunta 6 de 100' && (await text(page, '#xp-pct')) === '5% completado', 'Continúa en la pregunta 6 con las respuestas guardadas');

    console.log('4. Transición de batería y tipos de pregunta');
    await answerUntil(page, 11, { shotTransition: true });
    assert((await text(page, '#xb-count')) === 'Batería 2 de 10', 'Cambio a la batería 2');
    const shots = { 52: 'c-08-figuras', 54: 'c-09-matriz', 70: 'c-10-tabla', 71: 'c-11-seleccion-multiple', 72: 'c-12-comparacion', 76: 'c-13-cadena' };
    for (const [n, name] of Object.entries(shots)) {
      await answerUntil(page, +n, { risky: [42] });
      await page.waitForTimeout(250);
      await shot(page, name);
    }
    assert((await page.$('.q-lines')) !== null, 'Pregunta con cadena de datos renderizada (ATE-06)');

    console.log('5. Cronómetro: advertencias a 10 y 5 minutos');
    await page.clock.fastForward('50:05');
    await page.waitForTimeout(400);
    assert(await page.$eval('#timer', (t) => t.classList.contains('is-warning')), 'Cronómetro cambia a advertencia');
    assert((await text(page, '#toasts')).includes('Quedan 10 minutos'), 'Aviso "Quedan 10 minutos"');
    await shot(page, 'c-14-timer-10min');
    await page.clock.fastForward('05:00');
    await page.waitForTimeout(400);
    assert(await page.$eval('#timer', (t) => t.classList.contains('is-danger')), 'Cronómetro cambia a crítico');
    assert((await text(page, '#toasts')).includes('Quedan 5 minutos'), 'Aviso "Quedan 5 minutos"');

    console.log('6. Finalización y experiencia del candidato');
    const scr = await answerUntil(page, 101);
    assert(scr === 'confirmacion', 'Pantalla de confirmación al terminar la batería 10');
    await page.click('[data-action="finish"]');
    await page.waitForSelector('#screen-procesamiento.is-active');
    assert((await text(page, '#proc-root')).includes('No cierres esta ventana'), 'Mensaje de procesamiento');
    await page.clock.fastForward(5000);
    await page.waitForSelector('text=Tu evaluación ha sido registrada correctamente.', { timeout: 20000 });
    const candidateView = await text(page, '#proc-root');
    assert(!/Resultado global|Compatibilidad|FAVORABLE/.test(candidateView), 'El candidato no ve resultados internos');
    await page.waitForTimeout(1200);
    await shot(page, 'c-15-final-candidato');

    console.log('7. Acceso de RH, dashboard, perfiles y PDF');
    await page.click('[data-action="hr-access"]');
    await pin(page, '0000');
    await page.waitForTimeout(300);
    assert((await text(page, '#toasts')).includes('PIN incorrecto'), 'PIN incorrecto rechazado');
    await page.click('[data-action="hr-access"]');
    await pin(page, '2026');
    await page.waitForSelector('#screen-dashboard.is-active');
    const weights = () => page.$$eval('.results-table tbody tr td:last-child', (v) => v.map((x) => x.textContent).join(','));
    const before = await weights();
    assert((await text(page, '#dash-root')).includes('Integridad y Ética'), 'Dashboard con resultados por dimensión');
    assert((await text(page, '.ind-list')).includes('integridad'), 'Indicador de riesgo en integridad detectado');
    await page.selectOption('#dash-profile', 'operativo');
    await page.waitForTimeout(300);
    const after = await weights();
    assert(before !== after && (await text(page, '#dash-root')).includes('Ponderaciones del perfil Operativo'), 'Compatibilidad recalculada con las ponderaciones del perfil Operativo');
    await page.selectOption('#dash-profile', 'supervisor');
    await page.clock.fastForward(1500);
    await page.waitForTimeout(500);
    await shot(page, 'c-16-dashboard', true);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="download-pdf"]')]);
    await dl.saveAs(path.join(OUT, 'reporte-candidato.pdf'));
    assert(true, 'PDF descargado: ' + dl.suggestedFilename());
    assert((await text(page, '.delivery-row')).includes('Pendiente de configuración'), 'Envío en modo configuración (sin backend)');

    console.log('8. Panel de administración');
    await page.click('[data-action="home"]').catch(() => {});
    await page.click('[data-action="admin"]');
    await pin(page, '2026');
    await page.waitForSelector('#screen-admin.is-active');
    await page.click('[data-tab="profiles"]');
    assert((await page.$$eval('[data-sum] .sum-ok', (e) => e.length)) === 8, 'Todas las ponderaciones suman 100%');
    await page.fill('input[data-profile="supervisor"][data-dim="liderazgo"]', '25');
    await page.click('[data-admin="save"]');
    await page.waitForTimeout(300);
    assert((await text(page, '#toasts')).includes('deben sumar 100%'), 'Bloquea ponderaciones que no suman 100%');
    await page.fill('input[data-profile="supervisor"][data-dim="liderazgo"]', '20');
    await shot(page, 'c-17-admin-perfiles', true);
    await page.click('[data-tab="delivery"]');
    assert((await text(page, '#delivery-warn')).includes('zess.com'), 'Advierte el dominio zess.com sin corregirlo');
    const env = await page.$eval('#env-out', (t) => t.value);
    assert(env.includes('EMAIL_TO=Candy.paramo@zeiss.com,Hugo.guerrero@zess.com') && env.includes('WHATSAPP_TO=6633732713,6643896885'), 'Genera bloque .env con destinatarios');
    await shot(page, 'c-18-admin-entrega', true);
    await page.click('[data-admin="save"]');
    await page.waitForTimeout(300);
    assert((await text(page, '#toasts')).includes('Configuración guardada'), 'Configuración guardada');

    console.log('9. Manipulación de la sesión guardada');
    await page.evaluate(() => localStorage.setItem('zta.session.v1', JSON.stringify({ body: '{"v":1,"stage":"examen"}', sum: 'x' })));
    await page.reload();
    await page.waitForTimeout(600);
    assert((await text(page, '#toasts')).includes('fue modificada'), 'Detecta y descarta una sesión manipulada');

    assert(external.length === 0, 'Sin llamadas de red externas');
    assert(errors.length === 0, 'Sin errores de JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
    console.log('\nFlujo del candidato: todas las verificaciones pasaron.');
  } catch (e) {
    console.error(e.message);
    console.error('Errores JS:', errors);
    await shot(page, 'c-error', true).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); }
})();
