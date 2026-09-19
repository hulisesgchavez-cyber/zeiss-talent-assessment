/* =============================================================================
 * ZEISS Talent Assessment — BACKEND (Node.js + Express)
 * -----------------------------------------------------------------------------
 *  - Sirve el frontend (carpeta ../app) con cabeceras de seguridad.
 *  - POST /api/sessions     → token firmado al iniciar la evaluación.
 *  - POST /api/assessments  → valida, RECALCULA el scoring en el servidor,
 *                             envía el PDF por correo y WhatsApp.
 *  - Las llaves viven solo en variables de entorno (.env); nunca en el frontend.
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('./lib/config');
const { validateSubmission, issueToken, verifyToken, RX } = require('./lib/security');
const engine = require('./lib/engine');
const files = require('./lib/files');
const { buildMessage, sendEmail } = require('./services/email');
const { sendWhatsApp } = require('./services/whatsapp');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // detrás de nginx / IIS / Azure App Service

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

/* CORS restringido: solo orígenes listados en ALLOWED_ORIGINS. */
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const allowed = origin && config.allowedOrigins.includes(origin);
  if (allowed) res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
  if (req.method === 'OPTIONS') return res.sendStatus(allowed ? 204 : 403);
  return next();
});
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas solicitudes. Intente más tarde.' } });

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'zeiss-talent-assessment', delivery: config.describe(), ephemeralSecret: !!config.ephemeralSecret }));
/* El frontend servido desde este backend detecta automáticamente el endpoint de envío. */
app.get('/api/public-config', (req, res) => res.json({ apiEndpoint: 'api/assessments' }));

app.post('/api/sessions', express.json({ limit: '2kb' }), (req, res) => {
  const id = String((req.body && req.body.assessmentId) || '');
  if (!RX.id.test(id)) return res.status(400).json({ error: 'Assessment ID inválido.' });
  return res.json({ token: issueToken(config.sessionSecret, id) });
});

const deliveries = new Map(); // Assessment ID → número de envíos (detecta reenvíos)
const pick = (x) => ({ status: x.status, detail: x.detail });

app.post('/api/assessments', submitLimiter, express.json({ limit: '15mb' }), async (req, res) => {
  const s = validateSubmission(req.body);
  const resend = deliveries.has(s.assessmentId);
  deliveries.set(s.assessmentId, (deliveries.get(s.assessmentId) || 0) + 1);
  const v = engine.verify(s); // scoring confiable calculado en el servidor
  const token = verifyToken(config.sessionSecret, s.sessionToken, s.assessmentId, s.meta.limitSec);
  const verification = { match: v.match, differences: v.differences, token };
  const message = buildMessage(s, v.result, verification, { resend });
  const [email, whatsapp] = await Promise.all([sendEmail(s, message), sendWhatsApp(s, v.result)]);
  if (config.saveResults) {
    fs.mkdirSync(config.dirs.data, { recursive: true });
    const record = { receivedAt: new Date().toISOString(), assessmentId: s.assessmentId, candidate: s.candidate, profileKey: s.profileKey, consent: s.consent, answers: s.answers, meta: s.meta, serverResult: v.result, verification, delivery: { email: pick(email), whatsapp: pick(whatsapp) } };
    fs.writeFileSync(path.join(config.dirs.data, `${s.assessmentId}${resend ? '-' + Date.now() : ''}.json`), JSON.stringify(record, null, 2));
  }
  // Registro sin datos personales
  console.log(`[${new Date().toISOString()}] ${s.assessmentId} correo=${email.status} whatsapp=${whatsapp.status} scoring=${v.match ? 'ok' : 'DIFERENCIAS'} token=${token.valid ? 'ok' : token.reason}${resend ? ' (reenvío)' : ''}`);
  res.json({ ok: true, assessmentId: s.assessmentId, email: pick(email), whatsapp: pick(whatsapp), verification: { match: v.match, tokenValid: token.valid } });
});

/* PDF temporal para proveedores que descargan por URL (Twilio). */
app.get('/files/:token/:name', (req, res) => {
  const f = files.get(req.params.token);
  if (!f) return res.status(404).send('No encontrado o expirado.');
  res.set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'Content-Disposition': `inline; filename="${f.filename.replace(/[^\w.\-]/g, '_')}"` });
  return res.send(f.buffer);
});

/* Frontend */
/* Frontend: archivos estáticos de app/ + index.html generado en la raíz */
app.use(express.static(config.dirs.app, {
  index: false,
  maxAge: config.production ? '1h' : 0
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/* Manejo de errores: mensajes claros para validación; genéricos para errores internos. */
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error('[error]', err.message);
  res.status(status).json({ error: status === 413 ? 'La solicitud excede el tamaño permitido.' : status < 500 ? err.message : 'Error interno del servidor.' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    const d = config.describe();
    console.log(`ZEISS Talent Assessment — http://localhost:${config.port}`);
    console.log(`Correo: ${d.email.provider} (${d.email.ready ? 'listo' : 'pendiente de configurar'}) · WhatsApp: ${d.whatsapp.provider} (${d.whatsapp.ready ? 'listo' : 'pendiente de configurar'})`);
    if (config.ephemeralSecret) console.warn('Aviso: SESSION_SECRET no está configurado; se generó uno temporal.');
  });
}

module.exports = app;
