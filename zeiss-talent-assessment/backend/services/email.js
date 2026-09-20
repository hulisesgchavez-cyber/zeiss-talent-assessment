/* Envío del reporte por correo: smtp (nodemailer) | sendgrid (API HTTP) | preview (.eml) | none */
'use strict';
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../lib/config');
const { escapeHtml: e, cleanText } = require('../lib/security');

const fill = (tpl, s) => cleanText(tpl.replace(/\{candidato\}/g, s.candidate.nombre).replace(/\{puesto\}/g, s.candidate.puesto).replace(/\{id\}/g, s.assessmentId), 200);

/** Construye asunto, HTML y texto del correo (todos los valores escapados). */
function buildMessage(s, result, verification, { resend = false } = {}) {
  const subject = fill(config.email.subjectTemplate, s) + (resend ? ' (reenvío)' : '');
  const c = s.candidate, r = result;
  const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;color:#5A6A82;font-size:13px;white-space:nowrap">${e(k)}</td><td style="padding:6px 0;color:#101C31;font-size:14px;font-weight:600">${e(v)}</td></tr>`;
  const kpi = (k, v, sub) => `<td style="padding:14px;border:1px solid #DFE5EE;border-radius:10px;background:#F7F9FC;width:33%"><div style="font-size:11px;color:#5A6A82;text-transform:uppercase;letter-spacing:.06em;font-weight:700">${e(k)}</div><div style="font-size:26px;font-weight:700;color:#101C31">${e(v)}<span style="font-size:13px;color:#5A6A82"> / 100</span></div><div style="font-size:12px;color:#5A6A82">${e(sub)}</div></td>`;
  const colors = { FAVORABLE: ['#177A4B', '#E7F4EC'], VALIDACION: ['#8A5300', '#FDF3E1'], NO_FAVORABLE: ['#B8322A', '#FBEAE8'] }[r.classification.code];
  const verif = verification.match ? 'El scoring recalculado en el servidor coincide con el del navegador.' : `Se detectaron diferencias entre el scoring del navegador y el del servidor: ${verification.differences.slice(0, 5).join('; ')}.`;
  const token = verification.token.valid ? `Token de sesión válido (${verification.token.elapsedMin} min desde el inicio).` : `Token de sesión: ${verification.token.reason}.`;
  const html = `<!doctype html><html><body style="margin:0;background:#F3F5F9;font-family:Segoe UI,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5F9;padding:24px 0"><tr><td align="center">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFFFF;border:1px solid #DFE5EE;border-radius:14px;overflow:hidden">
    <tr><td style="background:#0B1F3F;padding:22px 28px;color:#FFFFFF"><div style="font-size:12px;letter-spacing:.1em;color:#93A9D2;font-weight:700">ZEISS TALENT ASSESSMENT</div><div style="font-size:20px;font-weight:700;margin-top:4px">Nueva evaluación psicométrica${resend ? ' (reenvío)' : ''}</div></td></tr>
    <tr><td style="padding:24px 28px">
      <table role="presentation" cellpadding="0" cellspacing="0">${row('Candidato', c.nombre)}${row('Puesto', c.puesto)}${row('Área / Departamento', c.area)}${row('Assessment ID', s.assessmentId)}${row('Evaluador', c.evaluador)}${row('Perfil de referencia', r.profileLabel)}${row('Respondidas', `${r.completion.answered} de ${r.completion.total}${r.timing.timedOut ? ' (tiempo agotado)' : ''}`)}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:18px 0 6px"><tr>${kpi('Resultado global', r.global.score, r.global.level)}${kpi('Compatibilidad', r.compatibility.score, r.compatibility.level)}${kpi('Consistencia', r.consistency.score, r.consistency.level)}</tr></table>
      <div style="margin:12px 0;padding:12px 16px;border-left:4px solid ${colors[0]};background:${colors[1]};border-radius:6px"><div style="font-weight:700;color:${colors[0]};font-size:14px">Resultado psicométrico: ${e(r.classification.label)}</div><div style="font-size:13px;color:#101C31;margin-top:4px">${e(r.classification.text)}</div></div>
      <p style="font-size:13px;color:#344359;margin:14px 0 4px"><b>Fortalezas:</b> ${e(r.strengths.slice(0, 3).map((x) => x.name).join(', '))}</p>
      <p style="font-size:13px;color:#344359;margin:0 0 14px"><b>Áreas de desarrollo:</b> ${e(r.development.slice(0, 3).map((x) => x.name).join(', '))}</p>
      <p style="font-size:13px;color:#101C31">El reporte completo (resumen ejecutivo, gráficas, fortalezas, áreas de desarrollo y preguntas sugeridas para entrevista) se adjunta en PDF.</p>
      <p style="font-size:12px;color:#5A6A82;border-top:1px solid #EBEFF5;padding-top:12px">Verificación del servidor: ${e(verif)} ${e(token)}</p>
      <p style="font-size:12px;color:#5A6A82">Este resultado constituye una herramienta complementaria para el proceso de selección y debe interpretarse junto con experiencia, entrevista, referencias y demás evaluaciones aplicables. Información confidencial para uso exclusivo de Recursos Humanos.</p>
    </td></tr></table></td></tr></table></body></html>`;
  const text = [
    `Nueva evaluación psicométrica${resend ? ' (reenvío)' : ''}`, '', `Candidato: ${c.nombre}`, `Puesto: ${c.puesto}`, `Área: ${c.area}`, `Assessment ID: ${s.assessmentId}`,
    `Evaluador: ${c.evaluador}`, `Perfil de referencia: ${r.profileLabel}`, '',
    `Resultado global: ${r.global.score}/100 (${r.global.level})`, `Compatibilidad: ${r.compatibility.score}/100`, `Consistencia: ${r.consistency.score}/100`,
    `Resultado psicométrico: ${r.classification.label}`, '', 'El reporte completo se adjunta en PDF.', '', `Verificación del servidor: ${verif} ${token}`,
    '', 'Herramienta complementaria para el proceso de selección. Información confidencial.'
  ].join('\n');
  return { subject, html, text };
}

async function sendEmail(s, message) {
  const cfg = config.email;
const attachments = s.pdf && s.pdf.base64 ? [{ filename: s.pdf.filename, content: Buffer.from(s.pdf.base64, 'base64'), contentType: 'application/pdf' }] : [];
  try {
    switch (cfg.provider) {
      case 'none': return { status: 'skipped', detail: 'Envío de correo deshabilitado (EMAIL_PROVIDER=none).' };
      case 'preview': {
        const t = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
        const info = await t.sendMail(mail);
        fs.mkdirSync(config.dirs.outbox, { recursive: true });
        const file = path.join(config.dirs.outbox, `${s.assessmentId}-${Date.now()}.eml`);
        fs.writeFileSync(file, info.message);
        return { status: 'preview', detail: `Vista previa guardada en backend/outbox/${path.basename(file)} (no se envió).` };
      }
      case 'smtp': {
        if (!cfg.smtp.host || !cfg.smtp.user || !cfg.smtp.pass) return { status: 'not_configured', detail: 'Faltan SMTP_HOST, SMTP_USER o SMTP_PASS.' };
        const t = nodemailer.createTransport({
  host: cfg.smtp.host,
  port: cfg.smtp.port,
  secure: cfg.smtp.secure,
  requireTLS: !cfg.smtp.secure,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  auth: {
    user: cfg.smtp.user,
    pass: cfg.smtp.pass
  }
});

const info = await t.sendMail(mail);
        return { status: 'sent', detail: `Enviado a ${cfg.to.length} destinatario(s).`, messageId: info.messageId };
      }
      case 'sendgrid': {
        if (!cfg.apiKey) return { status: 'not_configured', detail: 'Falta EMAIL_API_KEY.' };
        const from = /<([^>]+)>/.exec(cfg.from);
        const fromName = cfg.from.replace(/<[^>]+>/, '').replace(/"/g, '').trim();
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST', headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: cfg.to.map((email) => ({ email })) }],
            from: { email: from ? from[1] : cfg.from, name: fromName || undefined }, subject: message.subject,
            content: [{ type: 'text/plain', value: message.text }, { type: 'text/html', value: message.html }],
            attachments: attachments.map((a) => ({ content: a.content.toString('base64'), filename: a.filename, type: 'application/pdf', disposition: 'attachment' }))
          })
        });
        if (!res.ok) return { status: 'error', detail: `SendGrid respondió ${res.status}: ${(await res.text()).slice(0, 200)}` };
        return { status: 'sent', detail: `Enviado a ${cfg.to.length} destinatario(s).` };
      }
      default: return { status: 'not_configured', detail: `Proveedor de correo desconocido: ${cfg.provider}` };
    }
   } catch (err) {
    console.error('ERROR SMTP:', err);
    return { status: 'error', detail: `Error al enviar el correo: ${err.message}` };
  }
}
module.exports = { buildMessage, sendEmail };
