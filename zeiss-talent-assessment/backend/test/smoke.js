/* Prueba del backend sin credenciales reales (modo preview): npm test */
'use strict';
process.env.EMAIL_PROVIDER = 'preview';
process.env.WHATSAPP_PROVIDER = 'preview';
process.env.SESSION_SECRET = 'test-secret-para-pruebas-0123456789';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const app = require('../server');
const config = require('../lib/config');
const { ZTA } = require('../lib/engine');

const ok = (msg) => console.log('  ✓ ' + msg);
const MIN_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');

function bestAnswers() {
  const a = {};
  ZTA.QUESTION_BANK.questions.forEach((q) => {
    const v = q.type === 'likert' ? (q.reverse ? 2 : 4) : q.type === 'sjt' ? q.options.findIndex((o) => o.s === 3) : q.answer;
    a[q.id] = { v, t: 12000 };
  });
  return a;
}

(async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  fs.rmSync(config.dirs.outbox, { recursive: true, force: true });
  try {
    const health = await (await fetch(base + '/api/health')).json();
    assert(health.ok && health.delivery.email.provider === 'preview');
    ok('GET /api/health');

    const home = await fetch(base + '/');
    assert(home.status === 200 && (await home.text()).includes('ZEISS Talent Assessment'));
    assert(/script-src 'self' https:\/\/cdn\.jsdelivr\.net/.test(home.headers.get('content-security-policy')));
    ok('Sirve el frontend con Content-Security-Policy');

    const id = 'ZA-2026-0918-00482';
    const { token } = await (await post('/api/sessions', { assessmentId: id })).json();
    assert(token && token.startsWith(id + '.'));
    ok('POST /api/sessions emite token firmado');

    const answers = bestAnswers();
    const meta = { startedAt: Date.now() - 2700e3, finishedAt: Date.now(), durationSec: 2700, limitSec: 3600, timedOut: false, blurCount: 0 };
    const clientResult = ZTA.Scoring.fingerprint(ZTA.Scoring.evaluate(ZTA.QUESTION_BANK, answers, meta, ZTA.DEFAULT_CONFIG, 'supervisor'));
    const submission = {
      assessmentId: id, candidate: { nombre: 'Ana Martínez Ruiz', correo: 'ana@correo.com', telefono: '6641234567', puesto: 'Supervisora de Producción', area: 'Manufactura', empleado: '', evaluador: 'Hugo Guerrero' },
      profileKey: 'supervisor', consent: { accepted: true, at: new Date().toISOString() }, answers, meta, sessionToken: token, clientResult,
      pdf: { filename: 'x.pdf', base64: MIN_PDF.toString('base64') }
    };
    const r1 = await (await post('/api/assessments', submission)).json();
    assert(r1.ok && r1.email.status === 'preview' && r1.whatsapp.status === 'preview', JSON.stringify(r1));
    assert(r1.verification.match === true && r1.verification.tokenValid === true);
    ok('POST /api/assessments: scoring verificado, token válido, correo y WhatsApp en vista previa');

    const out = fs.readdirSync(config.dirs.outbox);
    const eml = fs.readFileSync(path.join(config.dirs.outbox, out.find((f) => f.endsWith('.eml'))), 'utf8');
    assert(/To: Candy\.paramo@zeiss\.com, Hugo\.guerrero@zess\.com/.test(eml), 'destinatarios');
    assert(/Subject: =\?UTF-8\?/i.test(eml) || /Subject: Evaluaci/.test(eml));
    assert(/filename=.?Evaluacion_ZA-2026-0918-00482\.pdf/.test(eml) && /application\/pdf/.test(eml));
    ok('Correo con destinatarios configurados (zess.com sin corregir) y PDF adjunto');
    const wa = JSON.parse(fs.readFileSync(path.join(config.dirs.outbox, out.find((f) => f.endsWith('whatsapp.json'))), 'utf8'));
    assert.deepStrictEqual(wa.recipients, ['526633732713', '526643896885']);
    ok('WhatsApp: números normalizados a 52 + 10 dígitos');

    const tampered = JSON.parse(JSON.stringify(submission));
    tampered.clientResult.global = 100; tampered.clientResult.dims.integridad = 100;
    const r2 = await (await post('/api/assessments', tampered)).json();
    assert(r2.ok && r2.verification.match === false);
    ok('Detecta resultados manipulados en el navegador');

    const noToken = Object.assign({}, submission, { sessionToken: null });
    assert((await (await post('/api/assessments', noToken)).json()).verification.tokenValid === false);
    ok('Marca envíos sin token de sesión');

    const bad = async (patch, msg) => {
      const res = await post('/api/assessments', Object.assign(JSON.parse(JSON.stringify(submission)), patch));
      assert.strictEqual(res.status, 400, msg);
    };
    await bad({ demo: true }, 'demo');
    await bad({ candidate: Object.assign({}, submission.candidate, { correo: 'no-es-correo' }) }, 'correo');
    await bad({ candidate: Object.assign({}, submission.candidate, { nombre: '<script>alert(1)</script>' }) }, 'xss');
    await bad({ assessmentId: '../../etc/passwd' }, 'id');
    await bad({ consent: { accepted: false } }, 'consentimiento');
    await bad({ pdf: { base64: Buffer.from('no es pdf').toString('base64') } }, 'pdf');
    ok('Rechaza DEMO, correo inválido, HTML en nombre, ID inválido, sin consentimiento y adjuntos no PDF');

    const pre = await fetch(base + '/api/assessments', { method: 'OPTIONS', headers: { Origin: 'https://sitio-no-autorizado.com' } });
    assert.strictEqual(pre.status, 403);
    ok('CORS bloquea orígenes no autorizados');
    console.log('\nBackend: todas las pruebas pasaron.');
  } catch (e) {
    console.error('FALLÓ:', e.message);
    process.exitCode = 1;
  } finally {
    server.close();
    fs.rmSync(config.dirs.outbox, { recursive: true, force: true });
  }
})();
