/* Configuración del backend a partir de variables de entorno (.env). */
'use strict';
const path = require('path');
const crypto = require('crypto');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true }); } catch (e) { /* dotenv opcional */ }

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const bool = (v) => /^(1|true|yes|si|sí)$/i.test(String(v || '').trim());
const env = process.env;

const config = {
  port: +env.PORT || 8080,
  production: env.NODE_ENV === 'production',
  publicBaseUrl: (env.PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
  allowedOrigins: list(env.ALLOWED_ORIGINS),
  sessionSecret: env.SESSION_SECRET || '',
  saveResults: bool(env.SAVE_RESULTS),
  dirs: {
    app: path.join(__dirname, '..', '..', 'app'),
    outbox: path.join(__dirname, '..', 'outbox'),
    data: path.join(__dirname, '..', 'data'),
    tmp: path.join(__dirname, '..', 'tmp')
  },
  email: {
    provider: (env.EMAIL_PROVIDER || 'preview').toLowerCase(),
    from: env.EMAIL_FROM || 'ZEISS Talent Assessment <no-reply@localhost>',
    // Se usan exactamente como se configuran (no se corrigen dominios).
    to: list(env.EMAIL_TO || 'candy.paramo@zeiss.com,hugo.guerrero@zeiss.com'),
    subjectTemplate: env.EMAIL_SUBJECT_TEMPLATE || 'Evaluación Psicométrica | {candidato} | {puesto} | {id}',
    apiKey: env.EMAIL_API_KEY || '',
    smtp: { host: env.SMTP_HOST || '', port: +env.SMTP_PORT || 587, secure: bool(env.SMTP_SECURE), user: env.SMTP_USER || '', pass: env.SMTP_PASS || '' }
  },
  whatsapp: {
    provider: (env.WHATSAPP_PROVIDER || 'preview').toLowerCase(),
    to: list(env.WHATSAPP_TO || '6633732713,6643896885'),
    countryCode: String(env.WHATSAPP_COUNTRY_CODE || '52').replace(/\D/g, ''),
    meta: { token: env.WHATSAPP_TOKEN || '', phoneId: env.WHATSAPP_PHONE_ID || '', version: env.WHATSAPP_API_VERSION || 'v23.0', template: env.WHATSAPP_TEMPLATE_NAME || '', lang: env.WHATSAPP_TEMPLATE_LANG || 'es_MX' },
    twilio: { sid: env.TWILIO_ACCOUNT_SID || '', token: env.TWILIO_AUTH_TOKEN || '', from: env.TWILIO_WHATSAPP_FROM || '', contentSid: env.TWILIO_CONTENT_SID || '' }
  }
};

if (!config.sessionSecret) {
  // Sin secreto configurado se genera uno temporal: los tokens dejan de ser válidos al reiniciar.
  config.sessionSecret = crypto.randomBytes(32).toString('hex');
  config.ephemeralSecret = true;
}

/** Resumen seguro (sin llaves) para registros y /api/health. */
config.describe = () => ({
  email: { provider: config.email.provider, recipients: config.email.to.length, ready: emailReady() },
  whatsapp: { provider: config.whatsapp.provider, recipients: config.whatsapp.to.length, ready: whatsappReady() }
});
function emailReady() {
  const e = config.email;
  if (e.provider === 'smtp') return !!(e.smtp.host && e.smtp.user && e.smtp.pass);
  if (e.provider === 'sendgrid') return !!e.apiKey;
  return e.provider === 'preview';
}
function whatsappReady() {
  const w = config.whatsapp;
  if (w.provider === 'meta') return !!(w.meta.token && w.meta.phoneId);
  if (w.provider === 'twilio') return !!(w.twilio.sid && w.twilio.token && w.twilio.from && config.publicBaseUrl);
  return w.provider === 'preview';
}

module.exports = config;
