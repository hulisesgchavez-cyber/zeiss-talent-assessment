/* Prueba E2E con el backend: frontend servido por Express (CSP activa) y envío en modo preview.
 * node tests/e2e-backend.js   (requiere: cd backend && npm install) */
'use strict';
process.env.EMAIL_PROVIDER = 'preview';
process.env.WHATSAPP_PROVIDER = 'preview';
process.env.SESSION_SECRET = 'e2e-secret-0123456789abcdef';
const fs = require('fs');
const path = require('path');
const app = require('../backend/server');
const config = require('../backend/lib/config');
const { open, answerCurrent, shot, assert } = require('./helpers');
const text = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim());

(async () => {
  fs.rmSync(config.dirs.outbox, { recursive: true, force: true });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const { browser, page, errors } = await open(url);
  try {
    await page.waitForSelector('#screen-landing.is-active');
    await page.waitForTimeout(800);
    assert(await page.evaluate(() => !!window.Chart && !!window.jspdf), 'Bibliotecas cargadas bajo la política CSP');
    await page.click('[data-action="start"]');
    const data = { nombre: 'Roberto Salas Núñez', correo: 'roberto.salas@correo.com', telefono: '6647778899', puesto: 'Coordinador de Calidad', area: 'Calidad', evaluador: 'Hugo Guerrero' };
    for (const [k, v] of Object.entries(data)) await page.fill(`#f-${k}`, v);
    await page.selectOption('#f-perfil', 'coordinador');
    await page.click('#form-registro button[type="submit"]');
    await page.check('#consent-check');
    await page.click('#consent-continue');
    await page.click('[data-action="begin-exam"]');
    for (let i = 0; i < 130; i++) {
      const scr = await page.$eval('.screen.is-active', (el) => el.id);
      if (scr === 'screen-transicion') { await page.click('[data-action="continue-battery"]'); continue; }
      if (scr !== 'screen-examen') break;
      await answerCurrent(page, i % 7 === 0 ? 'other' : 'best');
      await page.click('#q-next');
    }
    await page.click('[data-action="finish"]');
    await page.waitForSelector('text=Tu evaluación ha sido registrada correctamente.', { timeout: 30000 });
    assert(!(await text(page, '#proc-root')).includes('no fue posible enviarla'), 'Evaluación enviada al backend sin errores');
    await page.click('[data-action="hr-access"]');
    await page.fill('.modal input[name="pin"]', '2026');
    await page.click('.modal button:has-text("Entrar")');
    await page.waitForSelector('#screen-dashboard.is-active');
    const delivery = await page.$$eval('.delivery-row', (rows) => rows[0].textContent);
    const all = await text(page, '#dash-root');
    assert(/Vista previa/.test(delivery), 'Estado del correo: vista previa generada por el backend');
    assert(all.includes('el scoring recalculado coincide con el del navegador'), 'El servidor recalculó el scoring y coincide');
    const out = fs.readdirSync(config.dirs.outbox);
    assert(out.some((f) => f.endsWith('.eml')) && out.some((f) => f.endsWith('whatsapp.json')), 'Correo (.eml con PDF) y WhatsApp generados en backend/outbox');
    const eml = fs.readFileSync(path.join(config.dirs.outbox, out.find((f) => f.endsWith('.eml'))), 'utf8');
    assert(/application\/pdf/.test(eml) && eml.length > 50000, 'El correo incluye el reporte PDF completo');
    await shot(page, 'b-01-dashboard-backend', true);
    assert(errors.length === 0, 'Sin errores de JavaScript ni violaciones CSP' + (errors.length ? ': ' + errors.join(' | ') : ''));
    console.log('\nIntegración con backend: todas las verificaciones pasaron.');
  } catch (e) {
    console.error(e.message, errors);
    await shot(page, 'b-error', true).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); server.close(); }
})();
