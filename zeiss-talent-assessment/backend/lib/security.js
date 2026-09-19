/* Validación de entradas, sanitización, escape de HTML y tokens de sesión firmados. */
'use strict';
const crypto = require('crypto');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
const escapeHtml = (v) => String(v == null ? '' : v).replace(/[&<>"'`]/g, (c) => ESC[c]);
const cleanText = (v, max = 120) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

const RX = {
  id: /^[A-Z0-9]{1,6}-\d{4}-\d{4}-\d{5}$/,
  name: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.\- ]{3,120}$/,
  email: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/,
  phone: /^\d{10}$/,
  employee: /^[A-Za-z0-9\-]{0,20}$/,
  profile: /^[a-z0-9_]{1,40}$/
};

class ValidationError extends Error { constructor(msg) { super(msg); this.status = 400; } }

/** Valida y normaliza el cuerpo recibido de /api/assessments. */
function validateSubmission(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Cuerpo inválido.');
  if (body.demo === true) throw new ValidationError('Las evaluaciones en modo demostración no se envían.');
  const id = String(body.assessmentId || '');
  if (!RX.id.test(id)) throw new ValidationError('Assessment ID inválido.');
  const c = body.candidate || {};
  const candidate = {
    nombre: cleanText(c.nombre), correo: cleanText(c.correo).toLowerCase(), telefono: cleanText(c.telefono, 20),
    puesto: cleanText(c.puesto, 100), area: cleanText(c.area, 100), empleado: cleanText(c.empleado, 20), evaluador: cleanText(c.evaluador, 100)
  };
  if (!RX.name.test(candidate.nombre)) throw new ValidationError('Nombre inválido.');
  if (!RX.email.test(candidate.correo)) throw new ValidationError('Correo inválido.');
  if (!RX.phone.test(candidate.telefono)) throw new ValidationError('Teléfono inválido.');
  if (candidate.puesto.length < 2 || candidate.area.length < 2 || candidate.evaluador.length < 3) throw new ValidationError('Datos del puesto incompletos.');
  if (!RX.employee.test(candidate.empleado)) throw new ValidationError('Número de empleado inválido.');
  if (!body.consent || body.consent.accepted !== true) throw new ValidationError('Falta el consentimiento del candidato.');
  const profileKey = String(body.profileKey || '');
  if (!RX.profile.test(profileKey)) throw new ValidationError('Perfil inválido.');
  if (!body.answers || typeof body.answers !== 'object' || Object.keys(body.answers).length > 300) throw new ValidationError('Respuestas inválidas.');
  const m = body.meta || {};
  const meta = {
    startedAt: +m.startedAt || 0, finishedAt: +m.finishedAt || 0, durationSec: Math.max(0, Math.min(+m.durationSec || 0, 86400)),
    limitSec: Math.max(0, Math.min(+m.limitSec || 3600, 86400)), timedOut: !!m.timedOut, blurCount: Math.max(0, Math.min(+m.blurCount || 0, 10000))
  };
  let pdf = null;
  if (body.pdf && body.pdf.base64) {
    const b64 = String(body.pdf.base64);
    if (b64.length > 12 * 1024 * 1024 || !/^[A-Za-z0-9+/=\s]+$/.test(b64)) throw new ValidationError('PDF inválido.');
    const buffer = Buffer.from(b64, 'base64');
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new ValidationError('El adjunto no es un PDF.');
    pdf = { buffer, filename: `Evaluacion_${id}.pdf` };
  }
  return { assessmentId: id, candidate, profileKey, consent: { accepted: true, at: cleanText(body.consent.at, 40) }, answers: body.answers, meta, pdf, sessionToken: body.sessionToken ? String(body.sessionToken).slice(0, 800) : null, clientResult: body.clientResult || null };
}

/* -------- Tokens de sesión: firma HMAC del Assessment ID y la hora de inicio -------- */
function issueToken(secret, assessmentId) {
  const issuedAt = Date.now();
  const sig = crypto.createHmac('sha256', secret).update(`${assessmentId}.${issuedAt}`).digest('base64url');
  return `${assessmentId}.${issuedAt}.${sig}`;
}
function verifyToken(secret, token, assessmentId, limitSec) {
  if (!token) return { valid: false, reason: 'sin token de sesión' };
  const parts = String(token).split('.');
  if (parts.length !== 3) return { valid: false, reason: 'token con formato inválido' };
  const [id, issuedAt, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${id}.${issuedAt}`).digest('base64url');
  const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return { valid: false, reason: 'firma inválida' };
  if (id !== assessmentId) return { valid: false, reason: 'el token pertenece a otra evaluación' };
  const elapsedMin = (Date.now() - +issuedAt) / 60000;
  const maxMin = (limitSec || 3600) / 60 + 20; // margen para procesamiento y red
  return { valid: elapsedMin <= maxMin, elapsedMin: Math.round(elapsedMin * 10) / 10, reason: elapsedMin <= maxMin ? '' : 'tiempo transcurrido mayor al permitido' };
}

module.exports = { escapeHtml, cleanText, validateSubmission, ValidationError, issueToken, verifyToken, RX };
