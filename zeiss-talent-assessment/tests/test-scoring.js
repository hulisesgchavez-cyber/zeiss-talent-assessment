/* Pruebas del motor de scoring: node tests/test-scoring.js */
'use strict';
require('../app/js/config.js');
require('../app/js/questions.js');
require('../app/js/scoring.js');
const assert = require('assert');
const { ZTA } = globalThis;
const bank = ZTA.QUESTION_BANK;
const cfg = JSON.parse(JSON.stringify(ZTA.DEFAULT_CONFIG));
const meta = { durationSec: 2700, limitSec: 3600, timedOut: false, blurCount: 0 };
const T = 9000; // 9 s por respuesta

/** Respuesta ideal para cada pregunta (keyed = 5 en Likert). */
function best(q) {
  if (q.type === 'likert') return q.reverse ? 1 : 5;
  if (q.type === 'sjt') return q.options.findIndex((o) => o.s === 3);
  if (q.type === 'mc') return q.answer;
  return q.answer.slice();
}
function build(fn) { const a = {}; bank.questions.forEach((q, i) => { const v = fn(q, i); if (v !== undefined) a[q.id] = { v, t: T }; }); return a; }
const run = (answers, m = meta, p = 'supervisor') => ZTA.Scoring.evaluate(bank, answers, m, cfg, p);
const dim = (r, k) => r.dimensions.find((d) => d.key === k).score;

// 1) Candidato ideal (con algo de variación realista en Likert: 4 en lugar de 5)
const ideal = run(build((q, i) => (q.type === 'likert' && i % 3 === 0 ? (q.reverse ? 2 : 4) : best(q))));
assert(ideal.global.score >= 90, 'ideal global ' + ideal.global.score);
assert(ideal.consistency.score >= 90, 'ideal consistencia ' + ideal.consistency.score);
assert.strictEqual(ideal.classification.code, 'FAVORABLE');
assert.strictEqual(ideal.strengths.length, 5);
console.log('✓ Candidato ideal:', ideal.global.score, '| consistencia', ideal.consistency.score, '|', ideal.classification.label);

// 2) Pregunta invertida: responder 1 en PER-09 (invertida) equivale a 5 en PER-02
const q09 = bank.questions.find((q) => q.id === 'PER-09');
assert.strictEqual(ZTA.Scoring.itemScore(q09, { v: 1 }), 1);
assert.strictEqual(ZTA.Scoring.itemScore(q09, { v: 5 }), 0);
console.log('✓ Preguntas invertidas: PER-09 v=1 → 1.0, v=5 → 0.0');

// 3) Todo "Totalmente de acuerdo" (5) en Likert → contradicciones + patrón repetido
const allFive = run(build((q) => (q.type === 'likert' ? 5 : best(q))));
assert(allFive.consistency.contradictions.length >= 4, 'contradicciones ' + allFive.consistency.contradictions.length);
assert(allFive.consistency.straightLining.flag, 'straight-lining');
assert(allFive.consistency.score < ideal.consistency.score - 30, 'consistencia debe bajar: ' + allFive.consistency.score);
console.log('✓ Respuestas idénticas: consistencia', allFive.consistency.score, '| contradicciones', allFive.consistency.contradictions.length, '|', allFive.classification.label);

// 4) Riesgos de integridad
const risky = run(build((q) => (q.dim === 'integridad' && q.type === 'sjt' ? q.options.findIndex((o) => o.s === 0) : best(q))));
assert(risky.integrityRisks.length >= 5 && dim(risky, 'integridad') < 40);
assert.notStrictEqual(risky.classification.code, 'FAVORABLE');
console.log('✓ Riesgos de integridad:', risky.integrityRisks.length, '| integridad', dim(risky, 'integridad'), '|', risky.classification.label);

// 5) Tiempo agotado a la mitad → requiere validación, objetivas no respondidas = 0
const half = run(build((q, i) => (i < 50 ? best(q) : undefined)), { ...meta, timedOut: true, durationSec: 3600 });
assert.strictEqual(half.classification.code, 'VALIDACION');
assert.strictEqual(dim(half, 'numerico'), 0);
assert(half.dimensions.find((d) => d.key === 'adaptabilidad').insufficient);
console.log('✓ Tiempo agotado (50/100):', half.classification.label, '| numérico', dim(half, 'numerico'));

// 6) Respuestas muy rápidas → penaliza consistencia
const fastAns = build(best); Object.values(fastAns).forEach((a) => { a.t = 900; });
const fast = run(fastAns);
assert(fast.consistency.rapid.flag && fast.consistency.score < ideal.consistency.score);
console.log('✓ Respuestas rápidas: consistencia', fast.consistency.score);

// 7) Manipulación: IDs desconocidos y valores inválidos se descartan
const tampered = build(best); tampered['HACK-01'] = { v: 5, t: 1 }; tampered['PER-02'] = { v: 99, t: 1 }; tampered['ATE-01'] = { v: [0, 1, 2, 999], t: 1 };
const clean = ZTA.Scoring.sanitizeAnswers(bank, tampered);
assert(!clean['HACK-01'] && !clean['PER-02'] && clean['ATE-01'].v.length === 3);
console.log('✓ Sanitización: descarta IDs desconocidos y valores fuera de rango');

// 8) Grid: aciertos menos falsas alarmas
const grid = bank.questions.find((q) => q.id === 'ATE-01');
assert.strictEqual(ZTA.Scoring.itemScore(grid, { v: [1, 4, 6, 11, 14] }), 1);
assert.strictEqual(ZTA.Scoring.itemScore(grid, { v: [1, 4, 6, 0] }), 0.4);
assert.strictEqual(ZTA.Scoring.itemScore(grid, { v: [0, 2, 3] }), 0);
console.log('✓ Selección múltiple: aciertos − falsas alarmas');

// 9) Compatibilidad cambia con el perfil y penaliza mínimos críticos
const lowLead = run(build((q) => (q.dim === 'liderazgo' ? (q.type === 'likert' ? 3 : q.options.findIndex((o) => o.s === 0)) : best(q))));
const opLowLead = run(build((q) => (q.dim === 'liderazgo' ? (q.type === 'likert' ? 3 : q.options.findIndex((o) => o.s === 0)) : best(q))), meta, 'operativo');
assert(lowLead.compatibility.gaps.some((g) => g.key === 'liderazgo'));
assert(opLowLead.compatibility.score > lowLead.compatibility.score + 15);
console.log('✓ Compatibilidad por perfil: supervisor', lowLead.compatibility.score, 'vs operativo', opLowLead.compatibility.score);

// 10) Candidato aleatorio (semilla fija)
let s = 42; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const random = run(build((q) => (q.type === 'likert' ? 1 + Math.floor(rnd() * 5) : q.type === 'grid' ? [Math.floor(rnd() * q.items.length)] : Math.floor(rnd() * 4))));
assert(random.global.score < 70);
console.log('✓ Candidato aleatorio:', random.global.score, '| consistencia', random.consistency.score, '|', random.classification.label);
console.log('\nPerfil observado (ideal):\n ', ideal.profileText);
console.log('\nPerfil observado (aleatorio):\n ', random.profileText);
console.log('\nTodas las pruebas de scoring pasaron.');
