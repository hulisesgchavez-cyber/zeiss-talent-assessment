/* =============================================================================
 * ZEISS Talent Assessment — SCORING ENGINE
 * -----------------------------------------------------------------------------
 * Motor independiente de la interfaz. Funciona en navegador y en Node.js
 * (el backend lo reutiliza para recalcular y detectar manipulación).
 *
 *  - Cada dimensión produce 0–100 con pesos por pregunta y preguntas invertidas.
 *  - Objetivas (mc / grid): las no respondidas cuentan como incorrectas.
 *  - Likert / situacionales: solo se promedian las respondidas.
 *  - Índice global y compatibilidad: promedios ponderados configurables.
 *  - Índice de consistencia: pares de preguntas relacionadas + patrones de
 *    respuesta (respuestas idénticas repetidas, respuestas demasiado rápidas).
 *    NO detecta mentiras: señala respuestas potencialmente contradictorias.
 * ========================================================================== */
(function (global) {
  'use strict';
  const ZTA = (global.ZTA = global.ZTA || {});
  const ENGINE_VERSION = '1.0.0';

  const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
  const round = (v) => Math.round(v);
  const dimByKey = (key) => ZTA.DIMENSIONS.find((d) => d.key === key);

  /** Une frases en español: "a", "a y b", "a, b, así como c" (evita dobles "y"). */
  function joinEs(list) {
    if (list.length <= 1) return list.join('');
    if (list.length === 2 && !/ y /.test(list[0])) return list[0] + ' y ' + list[1];
    return list.slice(0, -1).join(', ') + ', así como ' + list[list.length - 1];
  }

  /** Etiqueta descriptiva del nivel según config.levels. */
  function level(score, levels) {
    const l = (levels || ZTA.DEFAULT_CONFIG.levels).find((x) => score >= x.min);
    return l ? l.label : '';
  }

  /* ----------------------- Validación de respuestas ----------------------- */
  /** Devuelve solo respuestas válidas para preguntas conocidas (anti-manipulación básica). */
  function sanitizeAnswers(bank, answers) {
    const clean = {};
    const src = answers && typeof answers === 'object' ? answers : {};
    bank.questions.forEach((q) => {
      const a = src[q.id];
      if (!a || typeof a !== 'object') return;
      const t = Number.isFinite(+a.t) ? clamp(+a.t, 0, 3600000) : 0;
      let v = a.v;
      if (q.type === 'likert') { if (!Number.isInteger(v) || v < 1 || v > 5) return; }
      else if (q.type === 'sjt' || q.type === 'mc') { if (!Number.isInteger(v) || v < 0 || v >= q.options.length) return; }
      else if (q.type === 'grid') {
        if (!Array.isArray(v)) return;
        v = [...new Set(v.filter((i) => Number.isInteger(i) && i >= 0 && i < q.items.length))];
        if (!v.length) return;
      } else return;
      clean[q.id] = { v, t };
    });
    return clean;
  }

  /* ---------------------------- Scoring por ítem --------------------------- */
  /** Puntaje 0–1 de una respuesta (null si no hay respuesta). */
  function itemScore(q, a) {
    if (!a) return null;
    switch (q.type) {
      case 'likert': return ((q.reverse ? 6 - a.v : a.v) - 1) / 4;
      case 'sjt': {
        const max = Math.max(...q.options.map((o) => o.s)) || 1;
        return q.options[a.v].s / max;
      }
      case 'mc': return a.v === q.answer ? 1 : 0;
      case 'grid': {
        const hits = a.v.filter((i) => q.answer.includes(i)).length;
        const falseAlarms = a.v.length - hits;
        return clamp((hits - falseAlarms) / q.answer.length, 0, 1);
      }
      default: return null;
    }
  }

  /** Valor "orientado" 1–5 para comparar pares de consistencia. */
  const keyedValue = (q, a) => (a ? 1 + 4 * itemScore(q, a) : null);
  const isObjective = (q) => q.type === 'mc' || q.type === 'grid';

  /* ---------------------------- Dimensiones ---------------------------- */
  function computeDimensions(bank, answers, levels) {
    return ZTA.DIMENSIONS.map((d) => {
      const items = bank.questions.filter((q) => q.dim === d.key);
      let wSum = 0, sSum = 0, answered = 0;
      items.forEach((q) => {
        const s = itemScore(q, answers[q.id]);
        const w = q.weight || 1;
        if (s !== null) answered++;
        if (s === null && !isObjective(q)) return; // sin evidencia: no se promedia
        wSum += w; sSum += w * (s || 0);
      });
      const score = wSum ? round((sSum / wSum) * 100) : 0;
      return {
        key: d.key, name: d.name, short: d.short, score, level: level(score, levels),
        answered, total: items.length, insufficient: answered < Math.ceil(items.length / 2)
      };
    });
  }

  function weightedIndex(dims, weights) {
    let w = 0, s = 0;
    dims.forEach((d) => { const wi = +weights[d.key] || 0; w += wi; s += wi * d.score; });
    return w ? round(s / w) : 0;
  }

  function compatibility(dims, profile, config) {
    const base = weightedIndex(dims, profile.weights);
    const gaps = [];
    let penalty = 0;
    Object.entries(profile.critical || {}).forEach(([key, min]) => {
      const d = dims.find((x) => x.key === key);
      if (d && d.score < min) { gaps.push({ key, name: d.name, min, score: d.score }); penalty += (min - d.score) * (config.criticalPenaltyFactor || 0); }
    });
    const score = round(clamp(base - penalty));
    return { score, base, penalty: round(penalty), gaps, level: level(score, config.levels) };
  }

  /* ---------------------------- Consistencia ---------------------------- */
  function computeConsistency(bank, answers, config) {
    const byId = Object.fromEntries(bank.questions.map((q) => [q.id, q]));
    const pairs = [];
    (bank.consistencyPairs || []).forEach((p) => {
      const qa = byId[p.a], qb = byId[p.b];
      if (!qa || !qb || !answers[p.a] || !answers[p.b]) return;
      const ka = keyedValue(qa, answers[p.a]), kb = keyedValue(qb, answers[p.b]);
      const diff = Math.abs(ka - kb);
      pairs.push({
        topic: p.topic, a: p.a, b: p.b, textA: qa.text, textB: qb.text, diff: +diff.toFixed(2),
        agreement: diff <= 1 ? 1 : Math.max(0, 1 - (diff - 1) / 3)
      });
    });
    const pairAgreement = pairs.length ? pairs.reduce((s, p) => s + p.agreement, 0) / pairs.length : 1;
    const contradictions = pairs.filter((p) => p.diff >= 2.5);

    // Patrón de respuestas idénticas en la escala Likert
    const likert = bank.questions.filter((q) => q.type === 'likert' && answers[q.id]);
    const freq = [0, 0, 0, 0, 0, 0];
    likert.forEach((q) => freq[answers[q.id].v]++);
    const modeRatio = likert.length ? Math.max(...freq) / likert.length : 0;
    const straightFlag = likert.length >= 10 && modeRatio >= 0.8;
    const favorableRatio = likert.length ? likert.filter((q) => keyedValue(q, answers[q.id]) === 5).length / likert.length : 0;
    const favorableFlag = likert.length >= 12 && favorableRatio >= 0.85;

    // Respuestas muy rápidas en preguntas con lectura sustancial
    const minMs = (config.exam.rapidResponseSeconds || 2.5) * 1000;
    const answeredIds = Object.keys(answers).filter((id) => byId[id]);
    const rapid = answeredIds.filter((id) => byId[id].text.length >= 60 && answers[id].t > 0 && answers[id].t < minMs).length;
    const rapidRatio = answeredIds.length ? rapid / answeredIds.length : 0;
    const rapidFlag = rapidRatio >= 0.15;

    const straightPenalty = Math.max(0, modeRatio - 0.6) * 50;
    const rapidPenalty = Math.min(20, rapidRatio * 60);
    const score = round(clamp(pairAgreement * 100 - straightPenalty - rapidPenalty));
    return {
      score, level: level(score, config.levels), pairsEvaluated: pairs.length,
      pairAgreement: round(pairAgreement * 100), contradictions,
      straightLining: { ratio: +modeRatio.toFixed(2), flag: straightFlag },
      favorablePattern: { ratio: +favorableRatio.toFixed(2), flag: favorableFlag },
      rapid: { count: rapid, ratio: +rapidRatio.toFixed(2), flag: rapidFlag }
    };
  }

  /* --------------------------- Interpretación --------------------------- */
  function buildProfileText(dims, compat, consistency, completion, profileLabel) {
    const valid = dims.filter((d) => !d.insufficient);
    const desc = [...valid].sort((a, b) => b.score - a.score);
    const asc = [...valid].sort((a, b) => a.score - b.score);
    const hi = desc.filter((d) => d.score >= 60).slice(0, 3);
    const lo = asc.filter((d) => d.score < 60).slice(0, 2);
    const parts = [];
    parts.push(hi.length
      ? `El resultado muestra una orientación favorable hacia ${joinEs(hi.map((d) => dimByKey(d.key).phraseHigh))}.`
      : `El resultado no muestra dimensiones en nivel medio alto o superior; los resultados relativos más altos corresponden a ${joinEs(desc.slice(0, 3).map((d) => d.name))}.`);
    parts.push(lo.length
      ? `Se observan oportunidades de desarrollo relacionadas con ${joinEs(lo.map((d) => dimByKey(d.key).phraseLow))}.`
      : `No se observan dimensiones por debajo del nivel medio alto; los resultados relativos menos altos corresponden a ${joinEs(asc.slice(0, 2).map((d) => d.name))}.`);
    parts.push(`Respecto al perfil de referencia ${profileLabel}, la compatibilidad calculada es de ${compat.score}/100 (${compat.level}).`);
    parts.push(consistency.score < 70
      ? `El índice de consistencia de respuestas (${consistency.score}/100) sugiere interpretar estos resultados con cautela y validarlos en entrevista.`
      : `El índice de consistencia de respuestas es de ${consistency.score}/100.`);
    if (completion.ratio < 1) parts.push(`La evaluación se procesó con ${completion.answered} de ${completion.total} preguntas respondidas.`);
    return parts.join(' ');
  }

  function buildStrengths(dims) {
    return dims.filter((d) => !d.insufficient).sort((a, b) => b.score - a.score).slice(0, 5).map((d) => ({
      key: d.key, name: d.name, score: d.score, level: d.level,
      text: d.score >= 60 ? dimByKey(d.key).strength
        : `Es una de las dimensiones con mejor resultado relativo del candidato, aunque se ubica en nivel ${d.level.toLowerCase()}.`
    }));
  }

  function buildDevelopment(dims) {
    return [...dims].sort((a, b) => a.score - b.score).slice(0, 5).map((d) => ({
      key: d.key, name: d.name, score: d.score, level: d.level,
      text: d.insufficient ? 'No se obtuvo información suficiente en esta dimensión (preguntas sin responder). Se recomienda evaluarla en entrevista o mediante una prueba complementaria.'
        : d.score < 75 ? dimByKey(d.key).development
          : `Resultado en nivel ${d.level.toLowerCase()}; se ubica entre los menos altos del candidato, pero no representa un área de riesgo. Se sugiere mantener y consolidar esta competencia.`
    }));
  }

  function buildInterview(dims, profile, consistency, integrityRisks) {
    const w = profile.weights;
    const crit = profile.critical || {};
    const picked = dims
      .filter((d) => d.score < 60 || (crit[d.key] !== undefined && d.score < 70))
      .sort((a, b) => (w[b.key] - w[a.key]) || (a.score - b.score)).slice(0, 4);
    [...dims].sort((a, b) => a.score - b.score).forEach((d) => { if (picked.length < 3 && !picked.includes(d)) picked.push(d); });
    const items = picked.map((d) => {
      const meta = dimByKey(d.key);
      return {
        focus: meta.interviewFocus, dimension: d.name,
        reason: `${d.name}: ${d.score}/100 (${d.level})${w[d.key] ? ` · ponderación en el perfil ${w[d.key]}%` : ''}`,
        questions: meta.interviewQuestions.slice()
      };
    });
    if (integrityRisks.length && !picked.some((d) => d.key === 'integridad')) {
      const meta = dimByKey('integridad');
      items.unshift({ focus: meta.interviewFocus, dimension: meta.name, reason: `Se registraron ${integrityRisks.length} respuesta(s) de riesgo en escenarios de integridad.`, questions: meta.interviewQuestions.slice() });
    }
    if (consistency.contradictions.length) {
      items.push({
        focus: 'Respuestas potencialmente contradictorias', dimension: 'Consistencia de respuestas',
        reason: `Temas con respuestas contradictorias: ${consistency.contradictions.map((c) => c.topic.toLowerCase()).join('; ')}.`,
        questions: consistency.contradictions.slice(0, 2).map((c) => `Solicita un ejemplo concreto y reciente relacionado con: ${c.topic.toLowerCase()}. ¿Qué hiciste exactamente y cuál fue el resultado?`)
      });
    }
    return items.slice(0, 5);
  }

  function classify(r, config) {
    const c = config.classification;
    const integ = r.dimensions.find((d) => d.key === 'integridad').score;
    const reasons = [];
    let code;
    if (r.completion.ratio < c.minCompletion) reasons.push(`Se respondió el ${round(r.completion.ratio * 100)}% de la evaluación (mínimo configurado: ${round(c.minCompletion * 100)}%).`);
    if (r.consistency.score < c.minConsistencyForConclusion) reasons.push(`Índice de consistencia (${r.consistency.score}) por debajo del mínimo para emitir una conclusión (${c.minConsistencyForConclusion}).`);
    if (reasons.length) code = 'VALIDACION';
    else if (r.global.score < c.unfavorable.global || r.compatibility.score < c.unfavorable.compatibility || integ < c.unfavorable.integrity) {
      code = 'NO_FAVORABLE';
      if (r.global.score < c.unfavorable.global) reasons.push(`Índice global (${r.global.score}) por debajo de ${c.unfavorable.global}.`);
      if (r.compatibility.score < c.unfavorable.compatibility) reasons.push(`Compatibilidad con el perfil (${r.compatibility.score}) por debajo de ${c.unfavorable.compatibility}.`);
      if (integ < c.unfavorable.integrity) reasons.push(`Integridad y Ética (${integ}) por debajo de ${c.unfavorable.integrity}.`);
    } else {
      const f = c.favorable;
      const checks = [
        [r.global.score >= f.global, `Índice global (${r.global.score}) por debajo de ${f.global}.`],
        [r.compatibility.score >= f.compatibility, `Compatibilidad (${r.compatibility.score}) por debajo de ${f.compatibility}.`],
        [r.consistency.score >= f.consistency, `Consistencia (${r.consistency.score}) por debajo de ${f.consistency}.`],
        [integ >= f.integrity, `Integridad y Ética (${integ}) por debajo de ${f.integrity}.`],
        [!r.compatibility.gaps.length, `Dimensiones críticas del perfil por debajo del mínimo: ${r.compatibility.gaps.map((g) => `${g.name} (${g.score}/${g.min})`).join(', ')}.`],
        [!r.integrityRisks.length, `Respuestas de riesgo en escenarios de integridad: ${r.integrityRisks.length}.`]
      ];
      checks.forEach(([ok, msg]) => { if (!ok) reasons.push(msg); });
      code = reasons.length ? 'VALIDACION' : 'FAVORABLE';
      if (code === 'FAVORABLE') reasons.push('Todos los criterios configurados para el perfil se cumplen.');
    }
    const t = ZTA.TEXTS.classification[code];
    return { code, label: t.label, text: t.text, reasons };
  }

  function buildRecommendations(r) {
    const code = r.classification.code;
    const rec = code === 'FAVORABLE'
      ? ['Continuar con la entrevista por competencias, profundizando en los aspectos señalados.', 'Validar referencias laborales y experiencia en funciones similares.', 'Considerar las áreas de desarrollo en el plan de incorporación del colaborador.']
      : code === 'VALIDACION'
        ? ['Profundizar en entrevista los aspectos señalados antes de emitir una conclusión.', 'Solicitar evidencia concreta (ejemplos, resultados, referencias) en las dimensiones con menor resultado.']
        : ['Revisar estos resultados junto con la experiencia, la entrevista y las referencias antes de tomar una decisión.', 'Si el proceso continúa, profundizar en las dimensiones críticas del perfil.', 'Valorar si otro perfil de puesto se ajusta mejor a los resultados observados.'];
    if (r.consistency.score < 70) rec.push('Considerar una reaplicación supervisada o una evaluación complementaria, dado el índice de consistencia.');
    if (r.timing.timedOut) rec.push('Considerar que el tiempo finalizó antes de completar la evaluación al interpretar las dimensiones incompletas.');
    if (r.integrityRisks.length) rec.push('Validar en entrevista el criterio ético del candidato ante las situaciones señaladas.');
    return rec;
  }

  function buildIndicators(r, meta) {
    const out = [];
    const add = (severity, text) => out.push({ severity, text });
    if (r.completion.ratio < 1) add(r.completion.ratio < 0.8 ? 'alta' : 'media', `Preguntas respondidas: ${r.completion.answered} de ${r.completion.total}${r.timing.timedOut ? ' (el tiempo finalizó)' : ''}.`);
    r.compatibility.gaps.forEach((g) => add('alta', `Dimensión crítica para el perfil por debajo del mínimo configurado: ${g.name} (${g.score} de ${g.min} requeridos).`));
    r.integrityRisks.forEach((x) => add('alta', `Respuesta de riesgo en escenario de integridad (${x.facet}): «${x.answer}»`));
    if (r.consistency.score < 60) add('alta', `Índice de consistencia bajo (${r.consistency.score}/100).`);
    else if (r.consistency.score < 75) add('media', `Índice de consistencia moderado (${r.consistency.score}/100).`);
    r.consistency.contradictions.forEach((c) => add('media', `Respuestas potencialmente contradictorias sobre «${c.topic}» (preguntas ${c.a} y ${c.b}).`));
    if (r.consistency.rapid.flag) add('media', `Respuestas muy rápidas en ${r.consistency.rapid.count} preguntas con lectura sustancial.`);
    if (r.consistency.straightLining.flag) add('media', `Uso repetido de la misma opción en la escala de acuerdo (${round(r.consistency.straightLining.ratio * 100)}% de las respuestas).`);
    if (r.consistency.favorablePattern.flag) add('info', 'Patrón de respuestas consistentemente en el extremo favorable; se sugiere validar con ejemplos concretos en entrevista.');
    if ((meta.blurCount || 0) >= 3) add('info', `La ventana de la evaluación perdió el foco ${meta.blurCount} veces durante la aplicación.`);
    if (!out.length) add('info', 'No se identificaron indicadores de atención en los patrones de respuesta.');
    return out;
  }

  /* ------------------------------ Evaluación ------------------------------ */
  /**
   * @param bank     ZTA.QUESTION_BANK (o banco personalizado)
   * @param answers  { [id]: { v, t } }
   * @param meta     { durationSec, limitSec, timedOut, blurCount }
   * @param config   configuración activa
   * @param profileKey perfil de referencia
   */
  function evaluate(bank, rawAnswers, meta, config, profileKey) {
    const answers = sanitizeAnswers(bank, rawAnswers);
    const profiles = config.profiles;
    const pKey = profiles[profileKey] ? profileKey : (profiles[config.defaultProfile] ? config.defaultProfile : Object.keys(profiles)[0]);
    const profile = profiles[pKey];
    const dims = computeDimensions(bank, answers, config.levels);
    dims.forEach((d) => { d.weight = +profile.weights[d.key] || 0; });
    const globalScore = weightedIndex(dims, config.globalWeights);
    const answered = Object.keys(answers).length;
    const r = {
      engineVersion: ENGINE_VERSION, bankVersion: bank.version, computedAt: new Date().toISOString(),
      profileKey: pKey, profileLabel: profile.label, dimensions: dims,
      global: { score: globalScore, level: level(globalScore, config.levels) },
      compatibility: compatibility(dims, profile, config),
      consistency: computeConsistency(bank, answers, config),
      completion: { answered, total: bank.questions.length, ratio: bank.questions.length ? answered / bank.questions.length : 0 },
      timing: { durationSec: round(meta.durationSec || 0), limitSec: round(meta.limitSec || 0), timedOut: !!meta.timedOut, blurCount: meta.blurCount || 0 },
      integrityRisks: bank.questions
        .filter((q) => q.dim === 'integridad' && q.type === 'sjt' && answers[q.id] && q.options[answers[q.id].v].s === 0)
        .map((q) => ({ id: q.id, facet: q.facet, answer: q.options[answers[q.id].v].t }))
    };
    r.classification = classify(r, config);
    r.strengths = buildStrengths(dims);
    r.development = buildDevelopment(dims);
    r.interview = buildInterview(dims, profile, r.consistency, r.integrityRisks);
    r.indicators = buildIndicators(r, meta);
    r.recommendations = buildRecommendations(r);
    r.profileText = buildProfileText(dims, r.compatibility, r.consistency, r.completion, profile.label);
    return r;
  }

  /** Resumen compacto usado por el backend para comparar resultados. */
  const fingerprint = (r) => ({
    global: r.global.score, compatibility: r.compatibility.score, consistency: r.consistency.score,
    classification: r.classification.code, dims: Object.fromEntries(r.dimensions.map((d) => [d.key, d.score]))
  });

  ZTA.Scoring = { ENGINE_VERSION, evaluate, sanitizeAnswers, itemScore, keyedValue, level, weightedIndex, fingerprint, joinEs };
})(typeof window !== 'undefined' ? window : globalThis);
