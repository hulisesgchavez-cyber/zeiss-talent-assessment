/* Almacenamiento temporal de PDF con URL firmada (necesario para Twilio, que
 * descarga el archivo desde una URL pública). En memoria, con expiración.
 * Para varias instancias del servidor use un bucket (S3 / Azure Blob) con URL firmada. */
'use strict';
const crypto = require('crypto');

const store = new Map();
const TTL_MS = 60 * 60 * 1000;

function put(buffer, filename) {
  const token = crypto.randomBytes(24).toString('base64url');
  store.set(token, { buffer, filename, expires: Date.now() + TTL_MS });
  return token;
}
function get(token) {
  const f = store.get(String(token));
  if (!f) return null;
  if (Date.now() > f.expires) { store.delete(token); return null; }
  return f;
}
setInterval(() => { const now = Date.now(); store.forEach((f, k) => { if (now > f.expires) store.delete(k); }); }, 10 * 60 * 1000).unref();

module.exports = { put, get };
