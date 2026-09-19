/* Carga en Node.js los mismos módulos de configuración, preguntas y scoring del
 * frontend para recalcular los resultados en el servidor (fuente confiable). */
'use strict';
const path = require('path');
const APP_JS = path.join(__dirname, '..', '..', 'app', 'js');
['config.js', 'questions.js', 'scoring.js'].forEach((f) => require(path.join(APP_JS, f)));
const ZTA = globalThis.ZTA;

/* Configuración de scoring del servidor. Opcional: SCORING_CONFIG_FILE apunta al JSON
 * exportado desde Administración › Seguridad y datos › Exportar configuración, para
 * que el servidor use las mismas ponderaciones, perfiles y umbrales que RH definió. */
function loadScoringConfig() {
  const file = process.env.SCORING_CONFIG_FILE;
  const base = JSON.parse(JSON.stringify(ZTA.DEFAULT_CONFIG));
  if (!file) return base;
  try {
    const over = JSON.parse(require('fs').readFileSync(path.resolve(__dirname, '..', file), 'utf8'));
    ['globalWeights', 'profiles', 'defaultProfile', 'criticalPenaltyFactor', 'classification', 'levels', 'exam'].forEach((k) => { if (over[k] !== undefined) base[k] = over[k]; });
    return base;
  } catch (err) { console.error('[scoring] No se pudo leer SCORING_CONFIG_FILE:', err.message); return base; }
}
const SCORING_CONFIG = loadScoringConfig();

/**
 * Recalcula el resultado con la configuración del servidor y lo compara con el
 * resumen enviado por el navegador para detectar manipulación.
 */
function verify(submission) {
  const cfg = SCORING_CONFIG;
  const profileKey = cfg.profiles[submission.profileKey] ? submission.profileKey : cfg.defaultProfile;
  const result = ZTA.Scoring.evaluate(ZTA.QUESTION_BANK, submission.answers, submission.meta, cfg, profileKey);
  const server = ZTA.Scoring.fingerprint(result);
  const client = submission.clientResult || {};
  const differences = [];
  ['global', 'compatibility', 'consistency', 'classification'].forEach((k) => { if (client[k] !== server[k]) differences.push(`${k}: navegador=${client[k]} servidor=${server[k]}`); });
  Object.keys(server.dims).forEach((k) => { if (!client.dims || client.dims[k] !== server.dims[k]) differences.push(`${k}: navegador=${client.dims && client.dims[k]} servidor=${server.dims[k]}`); });
  return { result, server, match: differences.length === 0, differences };
}

module.exports = { ZTA, verify };
