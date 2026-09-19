/* Envío por WhatsApp: meta (WhatsApp Business Cloud API) | twilio | preview | none
 *
 * IMPORTANTE (política de WhatsApp): los mensajes iniciados por la empresa fuera de
 * la ventana de 24 horas requieren una PLANTILLA APROBADA. Configure
 * WHATSAPP_TEMPLATE_NAME (Meta) o TWILIO_CONTENT_SID (Twilio). Sin plantilla se
 * envía un documento como mensaje libre, que solo se entrega si el destinatario
 * escribió al número de la empresa en las últimas 24 horas. */
'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../lib/config');
const files = require('../lib/files');
const { cleanText } = require('../lib/security');

/** 10 dígitos → código de país + número (E.164 sin "+"). */
function normalize(num) {
  const d = String(num).replace(/\D/g, '');
  const cc = config.whatsapp.countryCode;
  if (d.length === 10) return cc + d;
  return d;
}
const caption = (s, r) => cleanText([
  'Nueva evaluación psicométrica', `Candidato: ${s.candidate.nombre}`, `Puesto: ${s.candidate.puesto}`,
  `ID: ${s.assessmentId}`, `Resultado: ${r.classification.label} (global ${r.global.score}/100)`
].join(' · '), 900);
const summary = (results) => {
  const ok = results.filter((x) => x.ok).length;
  return ok === results.length ? 'sent' : ok ? 'partial' : 'error';
};

async function graph(url, init) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json.error && json.error.message) || `HTTP ${res.status}`);
  return json;
}

async function sendMeta(s, r) {
  const m = config.whatsapp.meta;
  if (!m.token || !m.phoneId) return { status: 'not_configured', detail: 'Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID.' };
  const base = `https://graph.facebook.com/${m.version}/${m.phoneId}`;
  const auth = { Authorization: `Bearer ${m.token}` };
  let mediaId = null;
  if (s.pdf) {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'application/pdf');
    form.append('file', new Blob([s.pdf.buffer], { type: 'application/pdf' }), s.pdf.filename);
    mediaId = (await graph(`${base}/media`, { method: 'POST', headers: auth, body: form })).id;
  }
  const results = [];
  for (const raw of config.whatsapp.to) {
    const to = normalize(raw);
    const body = m.template
      ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: m.template, language: { code: m.lang }, components: [
          ...(mediaId ? [{ type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename: s.pdf.filename } }] }] : []),
          { type: 'body', parameters: [s.candidate.nombre, s.candidate.puesto, s.assessmentId, `${r.classification.label} (${r.global.score}/100)`].map((text) => ({ type: 'text', text: cleanText(text, 200) })) }
        ] } }
      : mediaId
        ? { messaging_product: 'whatsapp', to, type: 'document', document: { id: mediaId, filename: s.pdf.filename, caption: caption(s, r) } }
        : { messaging_product: 'whatsapp', to, type: 'text', text: { body: caption(s, r) } };
    try {
      const json = await graph(`${base}/messages`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      results.push({ to: raw, ok: true, id: json.messages && json.messages[0] && json.messages[0].id });
    } catch (err) { results.push({ to: raw, ok: false, error: err.message }); }
  }
  return { status: summary(results), detail: results.map((x) => `${x.to}: ${x.ok ? 'enviado' : x.error}`).join(' | '), results };
}

async function sendTwilio(s, r) {
  const t = config.whatsapp.twilio;
  if (!t.sid || !t.token || !t.from) return { status: 'not_configured', detail: 'Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM.' };
  if (s.pdf && !config.publicBaseUrl) return { status: 'not_configured', detail: 'Twilio requiere PUBLIC_BASE_URL para compartir el PDF.' };
  const mediaUrl = s.pdf ? `${config.publicBaseUrl}/files/${files.put(s.pdf.buffer, s.pdf.filename)}/${encodeURIComponent(s.pdf.filename)}` : null;
  const results = [];
  for (const raw of config.whatsapp.to) {
    const params = new URLSearchParams({ From: t.from, To: `whatsapp:+${normalize(raw)}` });
    if (t.contentSid) {
      params.set('ContentSid', t.contentSid);
      params.set('ContentVariables', JSON.stringify({ 1: s.candidate.nombre, 2: s.candidate.puesto, 3: s.assessmentId, 4: `${r.classification.label} (${r.global.score}/100)`, 5: mediaUrl ? mediaUrl.replace(config.publicBaseUrl + '/', '') : '' }));
    } else {
      params.set('Body', caption(s, r));
      if (mediaUrl) params.set('MediaUrl', mediaUrl);
    }
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(t.sid)}/Messages.json`, {
        method: 'POST', body: params,
        headers: { Authorization: 'Basic ' + Buffer.from(`${t.sid}:${t.token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
      results.push({ to: raw, ok: true, id: json.sid });
    } catch (err) { results.push({ to: raw, ok: false, error: err.message }); }
  }
  return { status: summary(results), detail: results.map((x) => `${x.to}: ${x.ok ? 'enviado' : x.error}`).join(' | '), results };
}

async function sendWhatsApp(s, r) {
  try {
    switch (config.whatsapp.provider) {
      case 'none': return { status: 'skipped', detail: 'Envío por WhatsApp deshabilitado (WHATSAPP_PROVIDER=none).' };
      case 'meta': return await sendMeta(s, r);
      case 'twilio': return await sendTwilio(s, r);
      case 'preview': {
        fs.mkdirSync(config.dirs.outbox, { recursive: true });
        const file = path.join(config.dirs.outbox, `${s.assessmentId}-${Date.now()}-whatsapp.json`);
        fs.writeFileSync(file, JSON.stringify({ provider: 'preview', recipients: config.whatsapp.to.map(normalize), caption: caption(s, r), document: s.pdf ? s.pdf.filename : null }, null, 2));
        return { status: 'preview', detail: `Vista previa guardada en backend/outbox/${path.basename(file)} (no se envió).` };
      }
      default: return { status: 'not_configured', detail: `Proveedor de WhatsApp desconocido: ${config.whatsapp.provider}` };
    }
  } catch (err) {
    return { status: 'error', detail: `Error al enviar por WhatsApp: ${err.message}` };
  }
}

module.exports = { sendWhatsApp, normalize };
