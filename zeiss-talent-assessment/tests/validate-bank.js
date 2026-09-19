/* Validación automática del banco de preguntas: node tests/validate-bank.js */
'use strict';
require('../app/js/config.js');
require('../app/js/questions.js');
const assert = require('assert');
const { questions, batteries, consistencyPairs } = globalThis.ZTA.QUESTION_BANK;
const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
const L = 'ABCD';
let errors = 0;
const check = (cond, msg) => { if (!cond) { errors++; console.error('  ✗ ' + msg); } };

console.log('Preguntas:', questions.length);
check(questions.length === 100, 'Se esperaban 100 preguntas');
check(new Set(questions.map((q) => q.id)).size === questions.length, 'IDs duplicados');
check(new Set(questions.map((q) => q.text)).size === questions.length, 'Textos duplicados');

batteries.forEach((b) => {
  const n = questions.filter((q) => q.dim === b.key).length;
  check(n === 10, `Batería ${b.key} tiene ${n} preguntas`);
});
check(batteries.reduce((s, b) => s + b.estMinutes, 0) === 60, 'La suma de minutos estimados debe ser 60');

const dist = { mc: [0, 0, 0, 0], sjt: [0, 0, 0, 0] };
questions.forEach((q) => {
  if (q.type === 'sjt') {
    check(q.options.length === 4, q.id + ' debe tener 4 opciones');
    const scores = q.options.map((o) => o.s);
    check(scores.every((s) => s >= 0 && s <= 3), q.id + ' niveles 0-3');
    check(scores.filter((s) => s === 3).length === 1, q.id + ' debe tener exactamente una opción de nivel 3');
    dist.sjt[scores.indexOf(3)]++;
  }
  if (q.type === 'mc') {
    check(q.options.length === 4 && q.answer >= 0 && q.answer <= 3, q.id + ' respuesta inválida');
    dist.mc[q.answer]++;
  }
  if (q.type === 'grid') check(q.answer.every((i) => i >= 0 && i < q.items.length), q.id + ' índices fuera de rango');
});
console.log('Distribución respuesta correcta (mc):  ', dist.mc.map((n, i) => L[i] + '=' + n).join(' '));
console.log('Distribución mejor opción (sjt):       ', dist.sjt.map((n, i) => L[i] + '=' + n).join(' '));
console.log('Likert invertidas:', questions.filter((q) => q.type === 'likert' && q.reverse).map((q) => q.id).join(', '));

consistencyPairs.forEach((p) => check(byId[p.a] && byId[p.b], 'Par inválido ' + p.a + '/' + p.b));

/* ---- Verificación independiente de respuestas objetivas ---- */
const ans = (id) => { const q = byId[id]; return q.type === 'mc' ? q.options[q.answer] : q.answer; };
const num = (s) => parseFloat(String(s).replace(/[$,%a-zA-Z\s]/g, ''));
const approx = (a, b, tol = 0.051) => Math.abs(a - b) <= tol;
check(num(ans('NUM-01')) === 1200 * 0.94, 'NUM-01');
check(num(ans('NUM-02')) === 1620 / (3 * 45), 'NUM-02');
check(num(ans('NUM-03')) === (2400 - 600) / 180, 'NUM-03');
check(approx(num(ans('NUM-04')), (285 - 250) / 250 * 100), 'NUM-04');
check(num(ans('NUM-05')) === 35 * 2 / 5, 'NUM-05');
check(num(ans('NUM-06')) === 2720 / (400 * 8) * 100, 'NUM-06');
check(num(ans('NUM-07')) === 2000 * 1.2 / 60, 'NUM-07');
check(num(ans('NUM-08')) === 6 * 7.5 * 95 + 3 * 2 * 95 * 2, 'NUM-08');
check(approx(num(ans('NUM-09')), (1500 * 0.02 + 1200 * 0.03 + 800 * 0.05) / 3500 * 100), 'NUM-09');
const rates = { Enero: 92 / 100, Febrero: 85 / 90, Marzo: 110 / 125 };
check(ans('NUM-10') === Object.keys(rates).sort((a, b) => rates[b] - rates[a])[0], 'NUM-10');
check(num(ans('LOG-01')) === 63 * 2 + 1, 'LOG-01');
check(num(ans('LOG-08')) === 72 && [49, 81, 64].every((n) => Number.isInteger(Math.sqrt(n))), 'LOG-08');
check(num(ans('LOG-09')) === 8, 'LOG-09');
// LOG-06 por fuerza bruta
const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
const sols = perms(['P', 'Q', 'R', 'S', 'T']).filter((d) => d.indexOf('Q') > d.indexOf('P') && d[2] === 'S' && d.indexOf('T') + 1 === d.indexOf('R') && d[0] !== 'P');
check(sols.length === 1 && sols[0][0] === ans('LOG-06'), 'LOG-06 (soluciones: ' + sols.map((s) => s.join('')).join(',') + ')');
// Atención
const g = (id) => byId[id].items;
const same = (a, b) => JSON.stringify([...a].sort((x, y) => x - y)) === JSON.stringify([...b].sort((x, y) => x - y));
check(same(ans('ATE-01'), g('ATE-01').map((v, i) => (v === 'ZL-4827-B' ? i : -1)).filter((i) => i >= 0)), 'ATE-01');
check(same(ans('ATE-04'), g('ATE-04').map((v, i) => (+v < 1.8 || +v > 2.2 ? i : -1)).filter((i) => i >= 0)), 'ATE-04');
check(same(ans('ATE-07'), g('ATE-07').map((v, i) => (/^AX-\d{4}-R$/.test(v) ? i : -1)).filter((i) => i >= 0)), 'ATE-07');
check(same(ans('ATE-09'), g('ATE-09').map((v, i) => { const [a, b] = v.split(' | '); return a !== b ? i : -1; }).filter((i) => i >= 0)), 'ATE-09');
const [t1, t2] = byId['ATE-02'].tables;
const diffs = t1.rows.reduce((n, r, i) => n + r.filter((c, j) => c !== t2.rows[i][j]).length, 0);
check(num(ans('ATE-02')) === diffs, 'ATE-02 (diferencias reales: ' + diffs + ')');
const seq = byId['ATE-06'].lines[0].split(' ');
const count38 = seq.reduce((n, v, i) => n + (v === '3' && seq[i + 1] === '8' ? 1 : 0), 0);
check(num(ans('ATE-06')) === count38, 'ATE-06 (conteo real: ' + count38 + ')');
const [r1, r2] = byId['ATE-08'].tables;
const changed = r1.rows.filter((r, i) => r[1] !== r2.rows[i][1]).map((r) => r[0]);
check(changed.length === 1 && changed[0] === ans('ATE-08'), 'ATE-08');
check(ans('ATE-03') === '7730-LX-09281', 'ATE-03');
const t = 82, p = 3.0;
check(ans('ATE-10') === (t > 80 && p < 3 ? 'Detener el equipo' : t > 80 ? 'Reducir la velocidad' : 'Continuar operando'), 'ATE-10');
check(ans('CRI-06').includes('4.0%') && 120 / 3000 === 0.04 && 150 / 5000 === 0.03, 'CRI-06');

console.log(errors ? `\n${errors} error(es) encontrados.` : '\nBanco de preguntas válido: todas las verificaciones pasaron.');
process.exit(errors ? 1 : 0);
