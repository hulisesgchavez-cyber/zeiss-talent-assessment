/* =============================================================================
 * ZEISS Talent Assessment — APP (UI · TIMER · STORAGE · VALIDATION · DEMO)
 * -----------------------------------------------------------------------------
 * Single Page Application sin dependencias de framework. Secciones:
 *   1. UTILS       utilidades, escape de HTML, SHA-256
 *   2. STORAGE     localStorage con suma de verificación (anti-manipulación básica)
 *   3. CONFIG      configuración activa, marca y banco de preguntas
 *   4. VALIDATION  validación y sanitización de datos del candidato
 *   5. UI          pantallas, avisos, modales, pasos
 *   6. FLOW        landing → registro → consentimiento → instrucciones
 *   7. EXAM        preguntas, navegación, teclado, progreso
 *   8. TIMER       cronómetro general con advertencias
 *   9. PROCESS     confirmación, scoring, PDF, envío
 *  10. DASHBOARD   resultados para Recursos Humanos
 *  11. ADMIN       panel de configuración
 *  12. DEMO        modo demostración (nunca envía correos ni WhatsApp)
 *  13. INIT        arranque y recuperación de sesión
 * ========================================================================== */
(function () {
  'use strict';
  const ZTA = window.ZTA;

  /* ================================ 1. UTILS ================================ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  /** Escapa texto para insertarlo en HTML (toda entrada del usuario pasa por aquí). */
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"'`]/g, (c) => ESC_MAP[c]);
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fmtDate = (ts) => { const d = new Date(ts); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };
  const fmtDateTime = (ts) => { const d = new Date(ts); return `${fmtDate(ts)}, ${pad(d.getHours())}:${pad(d.getMinutes())} h`; };
  /** mm:ss (60:00, 47:32…); h:mm:ss solo para duraciones de 100 minutos o más. */
  const fmtClock = (ms) => {
    const t = Math.ceil(ms / 1000), m = Math.floor(t / 60), s = t % 60;
    return m < 100 ? `${pad(m)}:${pad(s)}` : `${Math.floor(m / 60)}:${pad(m % 60)}:${pad(s)}`;
  };
  const fmtDuration = (sec) => { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return `${m} min ${pad(s)} s`; };
  const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

  function deepMerge(base, over) {
    if (Array.isArray(base) || Array.isArray(over)) return over !== undefined ? clone(over) : clone(base);
    const out = clone(base || {});
    Object.keys(over || {}).forEach((k) => {
      const v = over[k];
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && !Array.isArray(base[k]) ? deepMerge(base[k], v) : clone(v);
    });
    return out;
  }
  function deepFreeze(o) { Object.values(o).forEach((v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); }); return Object.freeze(o); }

  /** Número aleatorio criptográfico (con respaldo). */
  function randInt(max) {
    if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % max; }
    return Math.floor(Math.random() * max);
  }
  /** Assessment ID: ZA-2026-0918-00482 */
  function newAssessmentId(prefix) {
    const d = new Date();
    return `${prefix || 'ZA'}-${d.getFullYear()}-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(randInt(100000), 5)}`;
  }

  /** SHA-256 síncrono (hex). Se usa para PIN y sumas de verificación locales. */
  const sha256 = (() => {
    const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    return (str) => {
      const msg = new TextEncoder().encode(String(str));
      const len = msg.length;
      const buf = new Uint8Array(((len + 9 + 63) >> 6) << 6);
      buf.set(msg); buf[len] = 0x80;
      const dv = new DataView(buf.buffer);
      dv.setUint32(buf.length - 8, Math.floor(len / 0x20000000));
      dv.setUint32(buf.length - 4, (len * 8) >>> 0);
      const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
      const W = new Uint32Array(64);
      for (let off = 0; off < buf.length; off += 64) {
        for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
        for (let i = 16; i < 64; i++) {
          const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
          const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
          W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
        }
        let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (let i = 0; i < 64; i++) {
          const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
          const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
          h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
      }
      return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
    };
  })();
  const pinHash = (pin) => sha256('zta-admin:' + String(pin));

  /* =============================== 2. STORAGE =============================== */
  const KEYS = { session: 'zta.session.v1', config: 'zta.config.v1', bank: 'zta.bank.v1', record: 'zta.record.v1' };
  const SEAL = 'zta-local-seal-v1'; // sello local: detecta ediciones casuales, NO es seguridad real
  const Store = {
    get(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* sin almacenamiento */ } },
    /** Guarda con suma de verificación para detectar manipulación del contenido. */
    seal(key, data) { const body = JSON.stringify(data); return Store.set(key, { body, sum: sha256(SEAL + body) }); },
    unseal(key) {
      const box = Store.get(key);
      if (!box || typeof box.body !== 'string') return { status: 'empty' };
      if (sha256(SEAL + box.body) !== box.sum) return { status: 'tampered' };
      try { return { status: 'ok', data: JSON.parse(box.body) }; } catch (e) { return { status: 'tampered' }; }
    }
  };

  /* =============================== 3. CONFIG ================================ */
  const App = { config: null, bank: null, flat: [], batteries: [], session: null, record: null, timerId: null, charts: [], shownAt: 0, demoRun: null };

  function loadConfig() {
    const saved = Store.get(KEYS.config);
    const cfg = deepMerge(ZTA.DEFAULT_CONFIG, saved && saved.schemaVersion === ZTA.DEFAULT_CONFIG.schemaVersion ? saved : {});
    if (saved && saved.profiles) cfg.profiles = clone(saved.profiles); // perfiles: reemplazo completo (permite eliminar)
    App.config = cfg;
    // Nombres de baterías personalizados (se conservan los originales para restaurar)
    const over = cfg.batteryNames || {};
    ZTA.DIMENSIONS.forEach((d) => { d.originalName = d.originalName || d.name; d.name = over[d.key] ? String(over[d.key]).slice(0, 60) : d.originalName; });
  }
  function saveConfig(cfg) { App.config = cfg; return Store.set(KEYS.config, cfg); }

  /** Banco activo: personalizado (panel de administración) o el incluido en questions.js. */
  function loadBank() {
    const custom = Store.get(KEYS.bank);
    const bank = custom && validateBank(custom).ok ? custom : ZTA.QUESTION_BANK;
    App.bank = deepFreeze(clone(bank));
    const order = App.bank.batteries.map((b) => b.key);
    App.batteries = order.map((key, i) => {
      const dim = ZTA.DIMENSIONS.find((d) => d.key === key) || { name: key };
      const meta = App.bank.batteries[i];
      return { key, index: i, name: dim.name, description: dim.description, meta, questions: App.bank.questions.filter((q) => q.dim === key) };
    }).filter((b) => b.questions.length);
    App.flat = [];
    App.batteries.forEach((b) => { b.start = App.flat.length; App.flat.push(...b.questions); b.end = App.flat.length - 1; });
  }

  /** Valida la estructura de un banco de preguntas (importado o editado). */
  function validateBank(bank) {
    const errs = [];
    const dims = ZTA.DIMENSIONS.map((d) => d.key);
    if (!bank || !Array.isArray(bank.questions) || !Array.isArray(bank.batteries)) return { ok: false, errs: ['Estructura inválida: se requieren "batteries" y "questions".'] };
    const ids = new Set();
    bank.batteries.forEach((b) => { if (!dims.includes(b.key)) errs.push(`Batería desconocida: ${b.key}`); });
    bank.questions.forEach((q, i) => {
      const where = `Pregunta ${i + 1} (${q && q.id})`;
      if (!q || typeof q.id !== 'string' || ids.has(q.id)) { errs.push(`${where}: ID faltante o duplicado.`); return; }
      ids.add(q.id);
      if (!dims.includes(q.dim)) errs.push(`${where}: dimensión inválida.`);
      if (typeof q.text !== 'string' || q.text.length < 5) errs.push(`${where}: texto inválido.`);
      if (q.type === 'sjt' && !(Array.isArray(q.options) && q.options.length >= 2 && q.options.every((o) => typeof o.t === 'string' && Number.isFinite(o.s)))) errs.push(`${where}: opciones situacionales inválidas.`);
      if (q.type === 'mc' && !(Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)) errs.push(`${where}: opciones o respuesta correcta inválidas.`);
      if (q.type === 'grid' && !(Array.isArray(q.items) && Array.isArray(q.answer) && q.answer.length && q.answer.every((x) => Number.isInteger(x) && x >= 0 && x < q.items.length))) errs.push(`${where}: selección múltiple inválida.`);
      if (!['likert', 'sjt', 'mc', 'grid'].includes(q.type)) errs.push(`${where}: tipo desconocido.`);
    });
    return { ok: !errs.length, errs };
  }

  /** Aplica nombre, textos y logo configurables en toda la interfaz. */
  function applyBranding() {
    const c = App.config.company;
    const texts = { platformName: c.platformName, subtitle: c.subtitle, tagline: `“${c.tagline}”` };
    $$('[data-cfg]').forEach((el) => { const v = texts[el.dataset.cfg]; if (v) el.textContent = v; });
    document.title = c.platformName;
    const fills = { minutes: App.config.exam.durationMinutes, batteries: App.batteries.length, questions: App.flat.length };
    $$('[data-fill]').forEach((el) => { el.textContent = fills[el.dataset.fill]; });
    $('#landing-minutes').textContent = App.config.exam.durationMinutes;
    $$('[data-logo]').forEach((el) => {
      if (c.logoDataUrl && /^data:image\/(png|jpe?g|svg\+xml|webp);base64,/.test(c.logoDataUrl)) {
        el.classList.add('has-logo'); el.innerHTML = `<img src="${esc(c.logoDataUrl)}" alt="${esc(c.name)}">`;
      } else { el.classList.remove('has-logo'); el.textContent = 'LOGO ' + c.name.toUpperCase(); }
    });
    $('#footer-note').textContent = `${c.platformName} · Prototipo funcional de evaluación. No constituye un instrumento psicométrico validado.`;
  }

  /* ============================= 4. VALIDATION ============================== */
  /** Limpia texto: sin caracteres de control ni < >, espacios normalizados, longitud máxima. */
  const cleanText = (v, max = 120) => String(v || '').replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const RX = {
    name: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.\- ]{3,120}$/,
    email: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/,
    employee: /^[A-Za-z0-9\-]{1,20}$/
  };
  /** Teléfono MX: 10 dígitos (acepta espacios, guiones, paréntesis y prefijo +52). */
  function normalizePhone(v) { let d = String(v || '').replace(/[\s\-().]/g, ''); if (/^\+?52\d{10}$/.test(d)) d = d.slice(-10); return /^\d{10}$/.test(d) ? d : null; }
  function validateCandidate(raw) {
    const c = {
      nombre: cleanText(raw.nombre), correo: cleanText(raw.correo).toLowerCase(), telefono: cleanText(raw.telefono, 20),
      puesto: cleanText(raw.puesto, 100), area: cleanText(raw.area, 100), empleado: cleanText(raw.empleado, 20), evaluador: cleanText(raw.evaluador, 100)
    };
    const e = {};
    if (!RX.name.test(c.nombre) || c.nombre.split(' ').length < 2) e.nombre = 'Escribe tu nombre y al menos un apellido (solo letras).';
    if (!RX.email.test(c.correo) || c.correo.length > 120) e.correo = 'Escribe un correo electrónico válido (ejemplo: nombre@dominio.com).';
    const tel = normalizePhone(c.telefono);
    if (!tel) e.telefono = 'Escribe un teléfono de 10 dígitos.'; else c.telefono = tel;
    if (c.puesto.length < 2) e.puesto = 'Indica el puesto.';
    if (c.area.length < 2) e.area = 'Indica el área o departamento.';
    if (c.empleado && !RX.employee.test(c.empleado)) e.empleado = 'Solo letras, números y guiones (máximo 20).';
    if (c.evaluador.length < 3) e.evaluador = 'Indica el nombre del evaluador.';
    return { data: c, errors: e, ok: !Object.keys(e).length };
  }

  /* ================================= 5. UI ================================== */
  const EXAM_SCREENS = ['examen', 'transicion', 'confirmacion'];
  function show(name) {
    $$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === 'screen-' + name));
    $('#exambar').hidden = !EXAM_SCREENS.includes(name);
    $('#site-footer').hidden = EXAM_SCREENS.includes(name) || name === 'procesamiento';
    App.current = name;
    window.scrollTo(0, 0);
    const h = $(`#screen-${name} h1, #screen-${name} h2`);
    if (h && name !== 'examen') { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function announce(msg) { const el = $('#sr-live'); el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 50); }
  function toast(msg, type = 'info', ms = 4500) {
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'warn' ? ' warn' : type === 'danger' ? ' danger' : '');
    el.setAttribute('role', type === 'info' ? 'status' : 'alert');
    el.innerHTML = icon(type === 'info' ? 'info' : 'alert') + `<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, ms);
  }
  /**
   * Modal accesible basado en promesas. body es HTML ya escapado por quien llama.
   * Resuelve { action, data } donde data contiene los inputs con atributo name.
   */
  function modal({ title, body = '', actions = [{ label: 'Aceptar', value: 'ok', cls: 'btn-primary' }], dismissable = true, iconName = null }) {
    return new Promise((resolve) => {
      const root = $('#modal-root');
      const prevFocus = document.activeElement;
      root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
        ${iconName ? `<div class="icon-badge" style="margin-bottom:14px">${icon(iconName)}</div>` : ''}
        <h2 id="m-title">${esc(title)}</h2><div class="modal-body">${body}</div>
        <div class="modal-actions">${actions.map((a, i) => `<button type="button" class="btn ${a.cls || ''}" data-i="${i}">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</button>`).join('')}</div>
      </div></div>`;
      const box = $('.modal', root);
      const close = (action) => {
        const data = {};
        $$('[name]', box).forEach((el) => { data[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
        root.innerHTML = ''; document.removeEventListener('keydown', onKey, true);
        if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
        resolve({ action, data });
      };
      const onKey = (e) => {
        if (e.key === 'Escape' && dismissable) { e.preventDefault(); close(null); }
        if (e.key === 'Tab') { // trampa de foco
          const f = $$('button, input, select, textarea, [tabindex]:not([tabindex="-1"])', box);
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); close(actions[actions.length - 1].value); }
        e.stopPropagation();
      };
      document.addEventListener('keydown', onKey, true);
      $$('[data-i]', box).forEach((b) => b.addEventListener('click', () => close(actions[+b.dataset.i].value)));
      if (dismissable) $('.modal-backdrop', root).addEventListener('click', (e) => { if (e.target === e.currentTarget) close(null); });
      (box.querySelector('input, select, textarea') || box.querySelector('.btn-primary') || box.querySelector('button')).focus();
    });
  }
  function renderSteppers() {
    const labels = ['Datos', 'Privacidad', 'Instrucciones', 'Evaluación'];
    $$('.stepper').forEach((ol) => {
      const cur = +ol.dataset.step;
      ol.innerHTML = labels.map((l, i) => {
        const n = i + 1, st = n < cur ? 'is-done' : n === cur ? 'is-current' : '';
        return `<li class="${st}" ${n === cur ? 'aria-current="step"' : ''}><span class="dot">${n < cur ? icon('check', 'icon-sm') : n}</span><span class="label-text">${l}</span></li>`;
      }).join('');
    });
  }
  const setDemoBadge = (on) => { $('#demo-badge').hidden = !on; };

  /* ================================ 6. FLOW ================================= */
  const presets = {}; // parámetros de URL (?perfil=&puesto=&area=&evaluador=)
  function readPresets() {
    const p = new URLSearchParams(location.search);
    if (p.get('perfil') && App.config.profiles[p.get('perfil')]) presets.perfil = p.get('perfil');
    ['puesto', 'area', 'evaluador'].forEach((k) => { if (p.get(k)) presets[k] = cleanText(p.get(k), 100); });
    if (p.get('demo') === '1') presets.demo = true;
  }
  function persist() { if (App.session && !App.session.demo) Store.seal(KEYS.session, App.session); }

  function renderLanding() {
    $('#landing-batteries').innerHTML = App.batteries.map((b) =>
      `<div class="battery-chip"><span class="n">${pad(b.index + 1)}</span><span class="t">${esc(b.name)}</span><span class="small muted">${b.questions.length} preguntas · ~${b.meta.estMinutes} min</span></div>`).join('');
    $('#plan-table').innerHTML = `<thead><tr><th>No.</th><th>Batería</th><th>Formato</th><th>Preguntas</th><th>Tiempo estimado</th></tr></thead><tbody>${App.batteries.map((b) =>
      `<tr><td class="num">${pad(b.index + 1)}</td><td><b>${esc(b.name)}</b></td><td class="muted">${esc(b.meta.format)}</td><td class="num">${b.questions.length}</td><td class="num">~${b.meta.estMinutes} min</td></tr>`).join('')}</tbody>`;
  }

  function newSession(demo = false) {
    return {
      v: 1, id: newAssessmentId(App.config.exam.idPrefix), createdAt: Date.now(), demo, stage: 'registro',
      candidate: {}, profileKey: presets.perfil || App.config.defaultProfile, consent: null,
      answers: {}, times: {}, qi: 0, unlocked: 0, warned: {}, blurCount: 0,
      bankVersion: App.bank.version, limitSec: Math.round(App.config.exam.durationMinutes * 60)
    };
  }

  function openRegistro(session) {
    App.session = session || newSession(false);
    const s = App.session;
    setDemoBadge(s.demo);
    const f = $('#form-registro');
    const cand = Object.assign({ puesto: presets.puesto || '', area: presets.area || '', evaluador: presets.evaluador || '' }, s.candidate);
    ['nombre', 'correo', 'telefono', 'puesto', 'area', 'empleado', 'evaluador'].forEach((k) => { f.elements[k].value = cand[k] || ''; });
    const sel = $('#f-perfil');
    sel.innerHTML = Object.entries(App.config.profiles).map(([k, p]) => `<option value="${esc(k)}">${esc(p.label)}</option>`).join('');
    sel.value = App.config.profiles[s.profileKey] ? s.profileKey : Object.keys(App.config.profiles)[0];
    sel.disabled = !!presets.perfil;
    $$('.field', f).forEach((el) => el.classList.remove('has-error'));
    $('#reg-id').textContent = s.id;
    $('#reg-date').textContent = fmtDate(s.createdAt);
    show('registro');
  }

  function submitRegistro(e) {
    e.preventDefault();
    const f = e.target;
    const raw = {};
    ['nombre', 'correo', 'telefono', 'puesto', 'area', 'empleado', 'evaluador'].forEach((k) => { raw[k] = f.elements[k].value; });
    const v = validateCandidate(raw);
    Object.keys(raw).forEach((k) => {
      const field = f.elements[k].closest('.field');
      const msg = v.errors[k];
      field.classList.toggle('has-error', !!msg);
      f.elements[k].setAttribute('aria-invalid', msg ? 'true' : 'false');
      f.elements[k].setAttribute('aria-describedby', 'e-' + k);
      $('#e-' + k).innerHTML = msg ? icon('alert', 'icon-sm') + esc(msg) : '';
    });
    if (!v.ok) { const first = Object.keys(v.errors)[0]; f.elements[first].focus(); announce('Revisa los campos marcados.'); return; }
    const s = App.session;
    s.candidate = v.data;
    s.profileKey = $('#f-perfil').value;
    s.stage = 'consentimiento';
    persist();
    openConsent();
  }

  function openConsent() {
    const c = esc(App.config.company.name);
    $('#privacy-text').innerHTML = `
      <h3>Responsable</h3><p>${c}, a través del área de Recursos Humanos, es responsable del tratamiento de los datos personales que proporciones en esta evaluación.</p>
      <h3>Finalidad</h3><p>Tus datos y respuestas se utilizarán exclusivamente para fines relacionados con el proceso de selección: evaluar competencias relacionadas con el puesto, integrar tu expediente como candidato y comunicarnos contigo sobre el proceso.</p>
      <h3>Datos que se recaban</h3><p>Nombre, correo electrónico, teléfono, puesto, área, número de empleado (si aplica), respuestas a la evaluación y datos técnicos de la aplicación (fecha, hora y duración).</p>
      <h3>Confidencialidad</h3><p>Los resultados son de uso confidencial del personal autorizado de Recursos Humanos, no representan un diagnóstico clínico y se conservarán solo durante el tiempo necesario, conforme a las políticas internas.</p>
      <h3>Tus derechos</h3><p>Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, así como revocar tu consentimiento, solicitándolo al área de Recursos Humanos, conforme a la legislación mexicana aplicable en materia de protección de datos personales.</p>
      <p class="small muted">Aviso simplificado de un prototipo. El aviso de privacidad integral debe ser proporcionado y validado por el área legal de la empresa.</p>`;
    $('#consent-label').textContent = ZTA.TEXTS.consent;
    const chk = $('#consent-check');
    chk.checked = !!(App.session.consent && App.session.consent.accepted);
    $('#consent-continue').disabled = !chk.checked;
    show('consentimiento');
  }
  function acceptConsent() {
    if (!$('#consent-check').checked) return;
    const s = App.session;
    s.consent = { accepted: true, at: new Date().toISOString(), text: ZTA.TEXTS.consent };
    s.stage = 'instrucciones';
    persist();
    show('instrucciones');
  }

  /* ================================= 7. EXAM ================================= */
  const batteryIndexOf = (qi) => Math.max(0, App.batteries.findIndex((b) => qi >= b.start && qi <= b.end));
  const TYPE_LABEL = { likert: 'Escala de acuerdo', sjt: 'Caso situacional', grid: 'Selección múltiple' };
  const MC_LABEL = { logico: 'Razonamiento lógico', numerico: 'Razonamiento numérico', atencion: 'Atención al detalle', critico: 'Pensamiento crítico' };
  const HINTS = {
    likert: 'Indica qué tan de acuerdo estás con la afirmación.',
    sjt: 'Elige la opción que mejor describe lo que harías.',
    mc: 'Elige una respuesta.',
    grid: 'Selecciona todos los elementos que cumplan la condición y después presiona «Siguiente».'
  };
  const answeredCount = () => App.flat.filter((q) => App.session.answers[q.id]).length;

  function startExam() {
    const s = App.session;
    if (!s.startedAt) { s.startedAt = Date.now(); s.deadline = s.startedAt + s.limitSec * 1000; }
    s.stage = 'examen';
    persist();
    requestSessionToken();
    startTimer();
    renderQuestion();
    show('examen');
  }

  /** Figuras SVG generadas (secuencias, matrices y opciones visuales). */
  function figureSVG(sp) {
    let inner = '';
    if (sp.shape === 'poly') {
      const pts = [];
      for (let i = 0; i < sp.sides; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / sp.sides; pts.push(`${(50 + 36 * Math.cos(a)).toFixed(1)},${(50 + 36 * Math.sin(a)).toFixed(1)}`); }
      inner = `<polygon points="${pts.join(' ')}" class="${sp.fill ? 'f' : 'e'}" stroke-width="3.5" stroke-linejoin="round"/>`;
    } else if (sp.shape === 'arrow') {
      inner = `<g transform="rotate(${+sp.angle || 0} 50 50)"><path d="M50 82V34" stroke-width="7" stroke-linecap="round" style="stroke:var(--primary)"/><path d="M50 12 L32 38 H68 Z" class="f"/></g>`;
    } else {
      const n = Math.min(4, +sp.count || 1), size = 20, gap = 8, x0 = 50 - (n * size + (n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (size + gap), cx = x + size / 2;
        if (sp.shape === 'circle') inner += `<circle cx="${cx}" cy="50" r="${size / 2}" class="f"/>`;
        else if (sp.shape === 'square') inner += `<rect x="${x}" y="40" width="${size}" height="${size}" rx="2" class="f"/>`;
        else inner += `<polygon points="${cx},39 ${x + size},60 ${x},60" class="f" stroke-linejoin="round"/>`;
      }
    }
    return `<svg class="fig-svg" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  }
  const tableHTML = (t) => `<table class="data-table">${t.title ? `<caption>${esc(t.title)}</caption>` : ''}<thead><tr>${t.headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  function extrasHTML(q) {
    let h = '';
    if (q.figure && q.figure.kind === 'sequence') h += `<div class="q-figure" role="img" aria-label="Secuencia de ${q.figure.items.length} figuras seguida de una posición faltante">${q.figure.items.map((it) => `<div class="cell">${figureSVG(it)}</div>`).join('')}<div class="cell missing" aria-hidden="true">?</div></div>`;
    if (q.figure && q.figure.kind === 'matrix') h += `<div class="q-figure matrix" role="img" aria-label="Matriz de figuras de 3 por 3 con una celda faltante">${q.figure.cells.map((c) => (c ? `<div class="cell">${figureSVG(c)}</div>` : '<div class="cell missing" aria-hidden="true">?</div>')).join('')}</div>`;
    if (q.target) h += `<p style="margin:-6px 0 18px">Modelo: <span class="q-target">${esc(q.target)}</span></p>`;
    if (q.table) h += `<div class="q-tables">${tableHTML(q.table)}</div>`;
    if (q.tables) h += `<div class="q-tables">${q.tables.map(tableHTML).join('')}</div>`;
    if (q.lines) h += `<pre class="q-lines">${q.lines.map(esc).join('\n')}</pre>`;
    return h;
  }

  function optionHTML(value, badge, content, selected) {
    return `<label class="option${selected ? ' is-selected' : ''}"><input type="radio" name="ans" value="${value}"${selected ? ' checked' : ''}><span class="letter" aria-hidden="true">${badge}</span>${content}</label>`;
  }
  function optionsHTML(q, ans) {
    const v = ans ? ans.v : null;
    if (q.type === 'likert') {
      return `<fieldset class="options likert"><legend class="sr-only">Escala de acuerdo del 1 al 5</legend>${ZTA.LIKERT_OPTIONS.map((t, i) => optionHTML(i + 1, i + 1, `<span class="otext">${esc(t)}</span>`, v === i + 1)).join('')}</fieldset>`;
    }
    if (q.type === 'grid') {
      return `<div class="grid-select" role="group" aria-label="Elementos seleccionables" style="--cols:${+q.columns || 4}">${q.items.map((t, i) =>
        `<button type="button" class="grid-item" data-idx="${i}" aria-pressed="${v && v.includes(i) ? 'true' : 'false'}">${esc(t)}</button>`).join('')}</div><p class="grid-count" id="grid-count" aria-live="polite"></p>`;
    }
    const isFig = q.options.some((o) => o && typeof o === 'object' && o.fig);
    return `<fieldset class="options${isFig ? ' figure-options' : ''}"><legend class="sr-only">Opciones de respuesta</legend>${q.options.map((o, i) => {
      const content = isFig ? `${figureSVG(o.fig)}<span class="sr-only">${esc(o.alt || '')}</span>` : `<span class="otext${q.mono ? ' mono' : ''}">${esc(q.type === 'sjt' ? o.t : o)}</span>`;
      return optionHTML(i, LETTERS[i], content, v === i);
    }).join('')}</fieldset>`;
  }

  function renderQuestion() {
    const s = App.session;
    const q = App.flat[s.qi];
    const b = App.batteries[batteryIndexOf(s.qi)];
    // En preguntas objetivas se muestra el tipo de ejercicio (faceta); en las de comportamiento solo el formato.
    const typeLabel = q.type === 'mc' ? q.facet || MC_LABEL[q.dim] || 'Opción múltiple' : TYPE_LABEL[q.type];
    $('#q-root').innerHTML = `<article class="card q-card" aria-labelledby="q-text">
      <div class="q-meta"><span class="tag">${esc(b.name)}</span><span class="tag tag-neutral">${esc(typeLabel)}</span></div>
      ${s.qi === b.start ? `<div class="callout" style="margin-bottom:18px">${icon('info')}<span>${esc(b.meta.instructions)}</span></div>` : ''}
      <div class="q-number">Pregunta ${s.qi + 1} de ${App.flat.length}</div>
      <h2 class="q-text" id="q-text" tabindex="-1">${esc(q.text)}</h2>
      <p class="q-hint">${HINTS[q.type]}</p>
      ${extrasHTML(q)}
      ${optionsHTML(q, s.answers[q.id])}
    </article>`;
    bindQuestion(q);
    updateExamBar();
    updateNav();
    App.shownAt = performance.now();
    window.scrollTo(0, 0); // cada pregunta inicia visible desde arriba (móvil)
    $('#q-text').focus({ preventScroll: true });
  }

  function bindQuestion(q) {
    const root = $('#q-root');
    if (q.type === 'grid') {
      const update = () => {
        const sel = $$('.grid-item[aria-pressed="true"]', root).map((b) => +b.dataset.idx);
        $('#grid-count').textContent = sel.length ? `${sel.length} seleccionado(s)` : 'Ningún elemento seleccionado';
        return sel;
      };
      $$('.grid-item', root).forEach((btn) => btn.addEventListener('click', () => {
        btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        const sel = update();
        setAnswer(q, sel.length ? sel : null);
      }));
      update();
      return;
    }
    $$('input[name="ans"]', root).forEach((inp) => inp.addEventListener('change', () => {
      $$('.option', root).forEach((o) => o.classList.toggle('is-selected', o.contains(inp)));
      setAnswer(q, +inp.value);
    }));
  }

  let persistTimer = null;
  const persistSoon = () => { clearTimeout(persistTimer); persistTimer = setTimeout(persist, 250); };
  function setAnswer(q, v) {
    const s = App.session;
    if (v === null) delete s.answers[q.id]; else s.answers[q.id] = { v };
    persistSoon();
    updateNav();
    updateExamBar();
  }
  /** Acumula el tiempo que la pregunta actual estuvo en pantalla. */
  function leaveQuestion() {
    const s = App.session;
    const q = App.flat[s.qi];
    if (!q || !App.shownAt) return;
    s.times[q.id] = Math.round((s.times[q.id] || 0) + (performance.now() - App.shownAt));
    App.shownAt = performance.now();
  }

  function updateNav() {
    const s = App.session;
    const b = App.batteries[batteryIndexOf(s.qi)];
    const q = App.flat[s.qi];
    $('#q-prev').disabled = s.qi <= b.start;
    $('#q-next').disabled = !s.answers[q.id];
    $('#q-demo-fill').hidden = !s.demo || !!App.demoRun;
    const last = s.qi === App.flat.length - 1;
    $('#q-next').innerHTML = (last ? 'Finalizar' : s.qi === b.end ? 'Finalizar batería' : 'Siguiente') + ' ' + icon('arrow-right');
    $('#q-hint').innerHTML = q.type === 'likert' ? 'Teclas <span class="kbd">1</span>–<span class="kbd">5</span> para responder · <span class="kbd">Enter</span> para continuar'
      : q.type === 'grid' ? '<span class="kbd">Enter</span> para continuar' : 'Teclas <span class="kbd">A</span>–<span class="kbd">D</span> para responder · <span class="kbd">Enter</span> para continuar';
  }

  function updateExamBar() {
    const s = App.session;
    const bi = batteryIndexOf(s.qi);
    const total = App.flat.length;
    const pct = Math.round((answeredCount() / total) * 100);
    $('#xb-count').textContent = `Batería ${bi + 1} de ${App.batteries.length}`;
    $('#xb-name').textContent = App.batteries[bi].name;
    $('#xb-track').innerHTML = App.batteries.map((x, i) => `<i class="${i < bi ? 'done' : i === bi ? 'current' : ''}"></i>`).join('');
    $('#xp-count').innerHTML = `Pregunta <b>${s.qi + 1}</b> de ${total}`;
    $('#xp-pct').innerHTML = `<b>${pct}%</b> completado`;
    const full = Math.floor(pct / 5), part = pct % 5;
    const bar = $('#xp-bar');
    bar.innerHTML = Array.from({ length: 20 }, (_, i) => (i < full ? '<i class="on"></i>' : i === full && part ? `<i class="part" style="--p:${part * 20}%"></i>` : '<i></i>')).join('');
    bar.setAttribute('aria-valuenow', pct);
    bar.setAttribute('aria-valuetext', `${pct}% completado`);
  }

  function goNext() {
    const s = App.session;
    const q = App.flat[s.qi];
    if (!s.answers[q.id]) { toast('Selecciona una respuesta para continuar.', 'warn', 3000); return; }
    leaveQuestion();
    const b = App.batteries[batteryIndexOf(s.qi)];
    if (s.qi < b.end) { s.qi++; persist(); renderQuestion(); return; }
    if (b.index < App.batteries.length - 1) { s.stage = 'transicion'; persist(); renderTransition(b.index); }
    else { s.stage = 'confirmacion'; persist(); renderConfirm(); }
  }
  function goPrev() {
    const s = App.session;
    const b = App.batteries[batteryIndexOf(s.qi)];
    if (s.qi <= b.start) return;
    leaveQuestion();
    s.qi--;
    persist();
    renderQuestion();
  }

  /** Atajos de teclado: 1–5 (escala), A–D (opciones), Enter (siguiente). */
  function onExamKey(e) {
    if (App.current !== 'examen' || $('#modal-root').children.length || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && e.target.type !== 'radio') return;
    const q = App.flat[App.session.qi];
    if (e.key === 'Enter') { if (e.target.tagName === 'BUTTON') return; e.preventDefault(); goNext(); return; }
    let val = null;
    if (q.type === 'likert' && /^[1-5]$/.test(e.key)) val = e.key;
    if ((q.type === 'sjt' || q.type === 'mc') && /^[a-dA-D1-4]$/.test(e.key)) val = /\d/.test(e.key) ? +e.key - 1 : 'abcd'.indexOf(e.key.toLowerCase());
    if (val === null) return;
    const inp = $(`#q-root input[name="ans"][value="${val}"]`);
    if (inp) { e.preventDefault(); inp.checked = true; inp.dispatchEvent(new Event('change')); }
  }

  /* ================================ 8. TIMER ================================= */
  function startTimer() { stopTimer(); tickTimer(); App.timerId = setInterval(tickTimer, 500); }
  function stopTimer() { if (App.timerId) clearInterval(App.timerId); App.timerId = null; }
  function tickTimer() {
    const s = App.session;
    if (!s || !s.deadline) return;
    const left = s.deadline - Date.now();
    $('#timer-value').textContent = fmtClock(Math.max(0, left));
    const warns = App.config.exam.warningMinutes.map(Number).filter((m) => m > 0).sort((a, b) => b - a);
    const hi = warns[0] || 0, lo = warns[warns.length - 1] || 0;
    $('#timer').classList.toggle('is-warning', left <= hi * 60000 && left > lo * 60000);
    $('#timer').classList.toggle('is-danger', left <= lo * 60000);
    const due = warns.filter((m) => left <= m * 60000 && left > 0 && !s.warned[m]);
    if (due.length) {
      due.forEach((m) => { s.warned[m] = true; });
      const m = Math.min(...due);
      const msg = `Quedan ${m} minutos para finalizar la evaluación.`;
      toast(msg, m === lo ? 'danger' : 'warn', 7000);
      announce(msg);
      persist();
    }
    if (left <= 0) timeUp();
  }
  async function timeUp() {
    const s = App.session;
    stopTimer();
    if (!s || s.finishing) return;
    s.finishing = true;
    if (App.current === 'examen') leaveQuestion();
    s.timedOut = true;
    persist();
    const auto = setTimeout(() => { const b = $('#modal-root [data-i="0"]'); if (b) b.click(); }, 6000);
    await modal({
      title: 'El tiempo de evaluación ha finalizado.', iconName: 'clock', dismissable: false,
      body: `<p>Procesaremos automáticamente las respuestas registradas: <b>${answeredCount()} de ${App.flat.length}</b>.</p>`,
      actions: [{ label: 'Continuar', value: 'ok', cls: 'btn-primary' }]
    });
    clearTimeout(auto);
    finish();
  }

  /* ================================ 9. PROCESS =============================== */
  function renderTransition(bi) {
    const b = App.batteries[bi], n = App.batteries[bi + 1];
    $('#transition-root').innerHTML = `
      <svg class="check-anim" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="32"/><path d="M23 37l9 9 18-19"/></svg>
      <span class="eyebrow">Batería completada</span>
      <h2>Has completado ${esc(b.name)}.</h2>
      <p class="muted">Ahora continuaremos con ${esc(n.name)}.</p>
      <div class="next-preview"><span class="n">${pad(n.index + 1)}</span><div><strong>${esc(n.name)}</strong>
        <div class="small muted">${n.questions.length} preguntas · ${esc(n.meta.format)} · ~${n.meta.estMinutes} min</div>
        <p class="small" style="margin:6px 0 0">${esc(n.meta.instructions)}</p></div></div>
      <button class="btn btn-primary btn-lg btn-caps" data-action="continue-battery">Continuar ${icon('arrow-right')}</button>
      <p class="small muted" style="margin:14px 0 0">El cronómetro continúa corriendo.</p>`;
    updateExamBar();
    show('transicion');
  }
  function continueBattery() {
    const s = App.session;
    const n = App.batteries[batteryIndexOf(s.qi) + 1];
    if (!n) return;
    s.qi = n.start; s.unlocked = n.index; s.stage = 'examen';
    persist();
    renderQuestion();
    show('examen');
  }
  function renderConfirm() {
    const total = App.flat.length;
    $('#confirm-root').innerHTML = `<div class="icon-badge" style="margin:0 auto 16px">${icon('flag')}</div>
      <span class="eyebrow">Confirmación</span>
      <h2>Llegaste al final de la evaluación</h2>
      <p class="muted">Respondiste <b>${answeredCount()} de ${total}</b> preguntas. Al finalizar, tus respuestas se registrarán y ya no podrás modificarlas.</p>
      <div class="row" style="justify-content:center;margin-top:24px">
        <button class="btn" data-action="review-last">${icon('arrow-left')} Revisar última batería</button>
        <button class="btn btn-primary btn-caps" data-action="finish">Finalizar y enviar ${icon('send')}</button>
      </div>`;
    updateExamBar();
    show('confirmacion');
  }

  /** Respuestas con tiempo por pregunta (formato del motor de scoring). */
  function buildAnswers(s) {
    const out = {};
    Object.keys(s.answers).forEach((id) => { out[id] = { v: s.answers[id].v, t: s.times[id] || 0 }; });
    return out;
  }

  const PROC_STEPS = (demo) => ['Validando respuestas', 'Calculando resultados', 'Generando reporte PDF', demo ? 'Envío omitido (modo demostración)' : 'Enviando a Recursos Humanos'];
  function setProcStep(i) { $$('#proc-steps li').forEach((li, k) => { li.className = k < i ? 'done' : k === i ? 'active' : ''; li.querySelector('.st').innerHTML = k < i ? icon('check', 'icon-sm') : ''; }); }

  async function finish() {
    const s = App.session;
    if (!s || s.stage === 'procesando' || s.stage === 'done') return;
    s.finishing = true;
    stopTimer();
    if (App.current === 'examen') leaveQuestion();
    s.stage = 'procesando';
    s.finishedAt = s.finishedAt || Date.now();
    persist();
    $('#proc-root').innerHTML = `<span class="eyebrow">Evaluación completada</span>
      <h2>Gracias por completar la evaluación.</h2>
      <p class="muted">No cierres esta ventana mientras procesamos tu información.</p>
      <div class="spinner" role="progressbar" aria-label="Generando resultados"></div>
      <p><b>Generando resultados…</b></p>
      <ol class="proc-steps" id="proc-steps">${PROC_STEPS(s.demo).map((t) => `<li><span class="st"></span>${esc(t)}</li>`).join('')}</ol>`;
    show('procesamiento');
    const pace = s.demo && App.demoRun ? 350 : 700;
    setProcStep(0);
    const answers = buildAnswers(s);
    await sleep(pace);
    setProcStep(1);
    const end = Math.min(s.finishedAt, s.deadline || s.finishedAt);
    const meta = { durationSec: Math.max(0, (end - s.startedAt) / 1000), limitSec: s.limitSec, timedOut: !!s.timedOut, blurCount: s.blurCount || 0 };
    const result = ZTA.Scoring.evaluate(App.bank, answers, meta, App.config, s.profileKey);
    const record = {
      id: s.id, demo: !!s.demo, candidate: s.candidate, profileKey: s.profileKey, createdAt: s.createdAt, startedAt: s.startedAt,
      finishedAt: s.finishedAt, consent: s.consent, answers, meta, result, sessionToken: s.sessionToken || null,
      bankVersion: App.bank.version, engineVersion: ZTA.Scoring.ENGINE_VERSION
    };
    await sleep(pace);
    setProcStep(2);
    let doc = null;
    try { doc = await ZTA.Report.buildPdf(record, App.config); } catch (e) { console.error('PDF:', e); }
    record.pdfAvailable = !!doc;
    await sleep(pace);
    setProcStep(3);
    record.delivery = await deliver(record, doc);
    await sleep(pace);
    setProcStep(4);
    delete record.sessionToken;
    App.record = record;
    Store.seal(KEYS.record, record);
    Store.del(KEYS.session);
    s.stage = 'done';
    renderDone(record);
  }

  function renderDone(record) {
    const failed = record.delivery && record.delivery.mode === 'api' && record.delivery.error;
    $('#proc-root').innerHTML = `
      <svg class="check-anim" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="32"/><path d="M23 37l9 9 18-19"/></svg>
      <span class="eyebrow">Evaluación procesada correctamente.</span>
      <h2>Tu evaluación ha sido registrada correctamente.</h2>
      <p class="muted">Gracias por tu tiempo. El área de Recursos Humanos dará seguimiento a tu proceso.</p>
      ${failed ? `<div class="callout callout-warn" style="text-align:left;margin:16px 0">${icon('alert')}<span>Tu evaluación quedó guardada en este equipo, pero no fue posible enviarla en este momento. Avisa a la persona que te aplicó la evaluación.</span></div>` : ''}
      <p class="small muted mono">Assessment ID: ${esc(record.id)}</p>
      <div class="row" style="justify-content:center;margin-top:18px">
        ${record.demo ? `<button class="btn btn-primary" data-action="open-dashboard">${icon('eye')} Ver dashboard de RH (demo)</button>` : ''}
        <button class="btn${record.demo ? '' : ' btn-primary'}" data-action="home">Finalizar</button>
      </div>`;
    $('#site-footer').hidden = false;
    announce('Tu evaluación ha sido registrada correctamente.');
    if (record.demo && App.demoRun) { App.demoRun = null; setTimeout(() => openDashboard(record), 1300); }
  }

  /* ------------------------ Envío (backend: correo + WhatsApp) ------------------------ */
  async function requestSessionToken() {
    const ep = (App.config.delivery.apiEndpoint || '').trim();
    const s = App.session;
    if (!ep || s.demo || s.sessionToken) return;
    try {
      const r = await fetch(ep.replace(/\/assessments\/?$/, '/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessmentId: s.id }) });
      if (r.ok) { const j = await r.json(); s.sessionToken = String(j.token || '').slice(0, 800); persist(); }
    } catch (e) { /* el backend recalcula igualmente; se marcará como "sin token" */ }
  }
  const pdfName = (record) => `Evaluacion_${record.id}_${slug(record.candidate.nombre || 'candidato')}.pdf`;

  /**
   * Envía la evaluación al backend. El frontend NUNCA contiene credenciales:
   * el backend define destinatarios y llaves mediante variables de entorno.
   * En modo DEMO no se realiza ninguna llamada de red.
   */
  async function deliver(record, doc) {
    const at = new Date().toISOString();
    const both = (status, detail) => ({ email: { status, detail }, whatsapp: { status, detail } });
    if (record.demo) return Object.assign({ mode: 'demo', at }, both('demo', 'Modo demostración: el envío de correo y WhatsApp está deshabilitado.'));
    const ep = (App.config.delivery.apiEndpoint || '').trim();
    if (!ep) return Object.assign({ mode: 'config', at }, both('not_configured', 'Integración pendiente: configure la URL del backend en Administración › Entrega.'));
    const relative = !/^[a-z][a-z0-9+.-]*:/i.test(ep); // mismo origen (frontend servido por el backend)
    if (!relative && !/^https:\/\//i.test(ep) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(ep)) return Object.assign({ mode: 'api', at, error: 'insecure' }, both('error', 'El endpoint debe utilizar HTTPS.'));
    try {
      const payload = {
        assessmentId: record.id, submittedAt: at, bankVersion: record.bankVersion, engineVersion: record.engineVersion,
        candidate: record.candidate, profileKey: record.profileKey, consent: record.consent, answers: record.answers,
        meta: Object.assign({ startedAt: record.startedAt, finishedAt: record.finishedAt }, record.meta),
        sessionToken: record.sessionToken, clientResult: ZTA.Scoring.fingerprint(record.result),
        pdf: doc ? { filename: pdfName(record), base64: doc.output('datauristring').split(',')[1] } : null
      };
      const ctrl = new AbortController();
const to = setTimeout(() => ctrl.abort(), 120000);
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
     clearTimeout(to);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      return { mode: 'api', at, email: j.email || { status: 'unknown' }, whatsapp: j.whatsapp || { status: 'unknown' }, verification: j.verification || null };
    } catch (e) {
      return Object.assign({ mode: 'api', at, error: String(e.message || e) }, both('error', `No fue posible contactar al backend: ${String(e.message || e)}`));
    }
  }

  /* ------------------------------ Acceso de RH ------------------------------ */
  let pinFails = 0, pinLockUntil = 0;
  async function requirePin(title) {
    if (Date.now() < pinLockUntil) { toast('Demasiados intentos. Espera un minuto.', 'danger'); return false; }
    const r = await modal({
      title, iconName: 'lock',
      body: `<p class="muted">Ingresa el PIN de administración para continuar.</p>
        <div class="field"><label for="m-pin">PIN</label><input class="input" id="m-pin" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="32"></div>
        <p class="small muted" style="margin:10px 0 0">Protección básica del prototipo. En producción el acceso debe validarse en el servidor.</p>`,
      actions: [{ label: 'Cancelar', value: null, cls: 'btn-ghost' }, { label: 'Entrar', value: 'ok', cls: 'btn-primary' }]
    });
    if (r.action !== 'ok') return false;
    if (pinHash(r.data.pin) === App.config.security.adminPinHash) { pinFails = 0; return true; }
    if (++pinFails >= 5) { pinLockUntil = Date.now() + 60000; pinFails = 0; }
    toast('PIN incorrecto.', 'danger');
    return false;
  }
  async function openHR() {
    const rec = Store.unseal(KEYS.record);
    if (rec.status === 'tampered') { toast('El resultado guardado en este equipo fue modificado o está dañado.', 'danger'); return; }
    if (rec.status !== 'ok') { toast('No hay evaluaciones registradas en este equipo.', 'warn'); return; }
    if (!(await requirePin('Acceso de Recursos Humanos'))) return;
    openDashboard(rec.data);
  }

  /* =============================== 10. DASHBOARD ============================== */
  const STATUS_CHIP = {
    sent: ['chip-ok', 'Enviado'], demo: ['chip-muted', 'Deshabilitado (DEMO)'], not_configured: ['chip-warn', 'Pendiente de configuración'], preview: ['chip-muted', 'Vista previa (sin envío)'],
    skipped: ['chip-muted', 'Omitido'], partial: ['chip-warn', 'Envío parcial'], error: ['chip-err', 'Error'], unknown: ['chip-muted', 'Sin confirmar']
  };
  const chip = (st) => { const [c, l] = STATUS_CHIP[st] || STATUS_CHIP.unknown; return `<span class="chip ${c}">${esc(l)}</span>`; };
  const CLS_ICON = { FAVORABLE: 'check', VALIDACION: 'alert', NO_FAVORABLE: 'x' };

  function destroyCharts() { App.charts.forEach((c) => { try { c.destroy(); } catch (e) { /* ya destruido */ } }); App.charts = []; }

  function openDashboard(record) {
    App.record = record;
    setDemoBadge(!!record.demo);
    renderDashboard(record);
    show('dashboard');
    drawDashboardCharts(record);
  }

  function renderDashboard(record) {
    const r = record.result, c = record.candidate, cls = r.classification;
    const cfg = App.config;
    const profOpts = Object.entries(cfg.profiles).map(([k, p]) => `<option value="${esc(k)}"${k === r.profileKey ? ' selected' : ''}>${esc(p.label)}</option>`).join('');
    const card = (iconName, title, sub, body, extra = '') => `<div class="card"${extra}><div class="card-head"><div class="icon-badge">${icon(iconName)}</div><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div></div>${body}</div>`;
    const d = record.delivery || {};
    $('#dash-root').innerHTML = `
      <div class="dash-head">
        <div>
          <span class="eyebrow">Dashboard de Recursos Humanos · Confidencial</span>
          <h1>${esc(c.nombre)}</h1>
          
        </div>
        <div class="dash-actions">
          <button class="btn btn-primary" data-action="download-pdf">${icon('download')} Descargar PDF</button>
          <button class="btn" data-action="export-json">${icon('file')} Exportar JSON</button>
          ${record.demo ? '' : `<button class="btn" data-action="resend">${icon('send')} Reenviar</button>`}
          <button class="btn btn-ghost" data-action="new-eval">${icon('refresh')} Nueva evaluación</button>
        </div>
        <dl class="meta-grid">
            <div><dt>Puesto</dt><dd>${esc(c.puesto)}</dd></div><div><dt>Área / Departamento</dt><dd>${esc(c.area)}</dd></div>
            <div><dt>Assessment ID</dt><dd class="mono">${esc(record.id)}</dd></div><div><dt>Fecha</dt><dd>${fmtDateTime(record.finishedAt)}</dd></div>
            <div><dt>Evaluador</dt><dd>${esc(c.evaluador)}</dd></div><div><dt>Respondidas</dt><dd>${r.completion.answered} de ${r.completion.total}</dd></div>
            <div><dt>Tiempo utilizado</dt><dd>${fmtDuration(r.timing.durationSec)}${r.timing.timedOut ? ' · tiempo agotado' : ''}</dd></div></dl>
      </div>
      ${record.demo ? `<div class="callout callout-warn" style="margin-bottom:20px">${icon('alert')}<span><b>DEMO MODE.</b> Candidato y respuestas ficticios generados automáticamente. No se enviaron correos ni mensajes de WhatsApp.</span></div>` : ''}
      <div class="kpis">
        <div class="card card-tight kpi kpi-hero">
          <div class="ring-box"><canvas id="ch-donut" role="img" aria-label="Resultado global: ${r.global.score} de 100"></canvas><div class="ring-center"><div><b>${r.global.score}</b><span>de 100</span></div></div></div>
          <div><div class="label">Resultado global</div><div class="sub">Índice Global de Evaluación</div><div class="sub"><b>${esc(r.global.level)}</b></div></div>
        </div>
        <div class="card card-tight kpi"><div class="label">Consistencia de respuestas</div><div class="value">${r.consistency.score}<small> / 100</small></div>
          <div class="meter" aria-hidden="true"><i style="width:${r.consistency.score}%"></i></div><div class="sub">${esc(r.consistency.level)} · ${r.consistency.pairsEvaluated} pares evaluados</div></div>
        <div class="card card-tight kpi"><div class="label">Compatibilidad con el perfil</div><div class="value">${r.compatibility.score}<small> / 100</small></div>
          <div class="meter" aria-hidden="true"><i style="width:${r.compatibility.score}%"></i></div>
          <label class="sub" for="dash-profile">Perfil de referencia</label><select class="select select-inline" id="dash-profile">${profOpts}</select></div>
        <div class="card card-tight kpi"><div class="label">Resultado psicométrico</div>
          <div><span class="status-badge st-${cls.code}">${icon(CLS_ICON[cls.code], 'icon-sm')}<span>${esc(cls.label)}</span></span></div><div class="sub">${esc(cls.text)}</div></div>
      </div>
      <div class="dash-grid">
        ${card('target', 'Perfil de competencias', 'Resultado 0–100 en las 10 dimensiones evaluadas.', '<div class="chart-box"><canvas id="ch-radar" role="img" aria-label="Gráfica de radar con el resultado de las 10 competencias"></canvas></div>')}
        ${card('grid', 'Resultado por batería', 'Los mismos datos se muestran en la tabla de resultados.', '<div class="chart-box"><canvas id="ch-bars" role="img" aria-label="Gráfica de barras horizontales con el resultado de cada batería"></canvas></div>')}
      </div>
      ${card('user', 'Perfil observado', 'Interpretación generada exclusivamente a partir de las respuestas.', `<p class="lead">${esc(r.profileText)}</p>`, ' style="margin-bottom:20px"')}
      <div class="dash-grid">
        ${card('star', 'Top 5 fortalezas', 'Dimensiones con mayor resultado.', `<ol class="rank-list">${r.strengths.map((x, i) => `<li><span class="rank-n">${i + 1}</span><div><div class="rank-title"><span>${esc(x.name)}</span><span class="score">${x.score}/100 · ${esc(x.level)}</span></div><p class="rank-text">${esc(x.text)}</p></div></li>`).join('')}</ol>`)}
        ${card('trend', 'Top 5 áreas de desarrollo', 'Dimensiones con menor resultado y recomendación.', `<ol class="rank-list">${r.development.map((x, i) => `<li><span class="rank-n">${i + 1}</span><div><div class="rank-title"><span>${esc(x.name)}</span><span class="score">${x.score}/100 · ${esc(x.level)}</span></div><p class="rank-text">${esc(x.text)}</p></div></li>`).join('')}</ol>`)}
      </div>
      <div class="dash-grid">
        ${card('question', 'Aspectos a profundizar en entrevista', 'Preguntas conductuales sugeridas.', `<div class="interview-list">${r.interview.map((x) => `<div class="interview-item"><h4>${esc(x.focus)}</h4><p class="reason">${esc(x.reason)}</p><ul>${x.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>`).join('')}</div>`)}
        ${card('alert', 'Indicadores de respuesta', 'Consistencia, riesgos y patrones de respuesta.', `<ul class="ind-list">${r.indicators.map((x) => `<li><span class="sev sev-${x.severity}">${esc(x.severity)}</span><span>${esc(x.text)}</span></li>`).join('')}</ul>
          <p class="small muted" style="margin:16px 0 0">El índice de consistencia señala respuestas potencialmente contradictorias entre preguntas relacionadas. No detecta mentiras ni constituye un juicio sobre la honestidad del candidato.</p>`)}
      </div>
      <div class="dash-grid">
        ${card('list', 'Resultados por dimensión', `Ponderaciones del perfil ${esc(r.profileLabel)}.`, `<div style="overflow-x:auto"><table class="data-table results-table"><thead><tr><th>Competencia</th><th class="num">Resultado</th><th>Nivel</th><th class="num">Ponderación</th></tr></thead><tbody>${r.dimensions.map((x) => `<tr><td>${esc(x.name)}</td><td class="num"><b>${x.score}</b></td><td class="nowrap">${esc(x.level)}${x.insufficient ? ' · datos insuficientes' : ''}</td><td class="num">${x.weight}%</td></tr>`).join('')}
          <tr><td><b>Índice global</b></td><td class="num"><b>${r.global.score}</b></td><td>${esc(r.global.level)}</td><td class="num">—</td></tr></tbody></table></div>`)}
        ${card('flag', 'Conclusión para Recursos Humanos', '', `<p><span class="status-badge st-${cls.code}">${icon(CLS_ICON[cls.code], 'icon-sm')}<span>${esc(cls.label)}</span></span></p>
          <p class="small" style="margin:0 0 6px"><b>Criterios:</b></p><ul class="small" style="margin:0 0 14px;padding-left:18px">${cls.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="small" style="margin:0 0 6px"><b>Recomendaciones:</b></p><ul class="small" style="margin:0 0 14px;padding-left:18px">${r.recommendations.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="disclaimer">${esc(ZTA.TEXTS.complementary)}</p>`)}
      </div>
      ${card('send', 'Envío del reporte', 'Estado de la integración con el backend.', `
        <div class="delivery-row">${icon('mail')}<div class="spacer"><b>Correo electrónico</b><div class="who">${esc(cfg.delivery.emailRecipients.join(', '))}</div><div class="who">${esc((d.email && d.email.detail) || '')}</div></div>${chip(d.email && d.email.status)}</div>
        <div class="delivery-row">${icon('message')}<div class="spacer"><b>WhatsApp</b><div class="who">${esc(cfg.delivery.whatsappRecipients.join(', '))}</div><div class="who">${esc((d.whatsapp && d.whatsapp.detail) || '')}</div></div>${chip(d.whatsapp && d.whatsapp.status)}</div>
        ${d.verification ? `<p class="small muted" style="margin:10px 0 0">Verificación del servidor: ${d.verification.match ? 'el scoring recalculado coincide con el del navegador.' : 'se detectaron diferencias en el scoring (revisar).'}</p>` : ''}`, ' style="margin-bottom:20px"')}
      <p class="disclaimer">${esc(ZTA.TEXTS.prototype)}</p>`;
    $('#dash-profile').addEventListener('change', (e) => changeProfile(e.target.value));
  }

  function drawDashboardCharts(record) {
    destroyCharts();
    if (!window.Chart) {
      ['ch-radar', 'ch-bars'].forEach((id) => { const cv = $('#' + id); if (cv) cv.parentElement.innerHTML = '<div class="chart-fallback">Las gráficas requieren la biblioteca Chart.js (sin conexión al CDN). Los resultados completos se muestran en la tabla.</div>'; });
      return;
    }
    App.charts = ZTA.Report.renderDashboardCharts({ donut: $('#ch-donut'), radar: $('#ch-radar'), bars: $('#ch-bars') }, record.result, App.config);
  }

  function changeProfile(key) {
    const rec = App.record;
    if (!App.config.profiles[key]) return;
    rec.profileKey = key;
    rec.result = ZTA.Scoring.evaluate(App.bank, rec.answers, rec.meta, App.config, key);
    Store.seal(KEYS.record, rec);
    renderDashboard(rec);
    drawDashboardCharts(rec);
    toast(`Compatibilidad recalculada con el perfil ${App.config.profiles[key].label}.`);
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function downloadPdf() {
    if (!window.jspdf) { toast('La biblioteca de PDF no está disponible (sin conexión al CDN).', 'danger'); return; }
    try { const doc = await ZTA.Report.buildPdf(App.record, App.config); doc.save(pdfName(App.record)); toast('Reporte PDF generado.'); }
    catch (e) { console.error(e); toast('No fue posible generar el PDF.', 'danger'); }
  }
  function exportJson() {
    const data = Object.assign({ exportedAt: new Date().toISOString(), platform: App.config.company.platformName }, App.record);
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `Evaluacion_${App.record.id}.json`);
  }
  async function resend() {
    const rec = App.record;
    if (rec.demo) return;
    let doc = null;
    try { doc = await ZTA.Report.buildPdf(rec, App.config); } catch (e) { /* se envía sin PDF */ }
    rec.delivery = await deliver(rec, doc);
    Store.seal(KEYS.record, rec);
    renderDashboard(rec);
    drawDashboardCharts(rec);
    toast(rec.delivery.error ? 'No fue posible reenviar el reporte.' : 'Solicitud de envío procesada.', rec.delivery.error ? 'danger' : 'info');
  }

  /* ================================= 11. ADMIN ================================ */
  const ADMIN_TABS = [
    ['general', 'General', 'sliders'], ['exam', 'Evaluación', 'clock'], ['batteries', 'Baterías', 'layers'],
    ['profiles', 'Perfiles y ponderaciones', 'target'], ['thresholds', 'Umbrales', 'flag'], ['delivery', 'Correo y WhatsApp', 'send'],
    ['questions', 'Preguntas', 'list'], ['security', 'Seguridad y datos', 'lock']
  ];
  const Admin = { draft: null, tab: 'general' };
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => (a[k] = a[k] || {}), o)[last] = v; };
  const num = (v, def = 0) => (Number.isFinite(+v) && String(v).trim() !== '' ? +v : def);

  async function openAdmin() {
    if (!(await requirePin('Administración'))) return;
    Admin.draft = clone(App.config);
    Admin.tab = 'general';
    renderAdmin();
    show('admin');
  }

  function field(label, path, { type = 'text', hint = '', full = false, attrs = '' } = {}) {
    let v = getPath(Admin.draft, path);
    if (type === 'lines') v = (v || []).join('\n');
    if (type === 'list') v = (v || []).join(', ');
    const input = type === 'lines' ? `<textarea class="textarea" data-path="${path}" data-type="lines" ${attrs}>${esc(v)}</textarea>`
      : `<input class="input" data-path="${path}" data-type="${type}" value="${esc(v)}" ${type === 'number' ? 'type="number" step="any"' : ''} ${attrs}>`;
    return `<div class="field${full ? ' field-full' : ''}"><label>${esc(label)}</label>${input}${hint ? `<span class="field-hint">${hint}</span>` : ''}</div>`;
  }

  function adminPanel(tab) {
    const d = Admin.draft;
    const dims = ZTA.DIMENSIONS;
    switch (tab) {
      case 'general': return `<h2>General</h2><div class="form-grid">
          ${field('Nombre de la empresa', 'company.name')}${field('Dominio corporativo (solo advertencias)', 'company.primaryDomain')}
          ${field('Nombre de la plataforma', 'company.platformName')}${field('Subtítulo', 'company.subtitle')}
          ${field('Mensaje de bienvenida', 'company.tagline', { full: true })}
          <div class="field field-full"><label for="logo-file">Logotipo (PNG, JPG, SVG o WebP · máximo 300 KB)</label><input class="input" id="logo-file" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp">
          <span class="field-hint">Reemplaza el espacio «LOGO» en la interfaz y en el PDF (PNG/JPG). Use únicamente el archivo oficial proporcionado por la empresa.</span>
          <div class="row" style="margin-top:8px"><div class="logo-slot${d.company.logoDataUrl ? ' has-logo' : ''}">${d.company.logoDataUrl ? `<img src="${esc(d.company.logoDataUrl)}" alt="Logotipo">` : 'SIN LOGO'}</div><button class="btn btn-sm" data-admin="remove-logo">Quitar logotipo</button></div></div></div>`;
      case 'exam': return `<h2>Evaluación</h2><div class="form-grid">
          ${field('Duración (minutos)', 'exam.durationMinutes', { type: 'number', attrs: 'min="5" max="240"' })}
          ${field('Advertencias (minutos restantes)', 'exam.warningMinutes', { type: 'list', hint: 'Separadas por coma. Ejemplo: 10, 5' })}
          ${field('Prefijo del Assessment ID', 'exam.idPrefix', { attrs: 'maxlength="6"' })}
          ${field('Respuesta «muy rápida» (segundos)', 'exam.rapidResponseSeconds', { type: 'number' })}</div>
          <div class="callout" style="margin-top:18px">${icon('info')}<span>Los cambios aplican a evaluaciones nuevas. Una evaluación en curso conserva su duración original.</span></div>`;
      case 'batteries': return `<h2>Baterías</h2><p class="muted">Nombres visibles de cada batería. Los tiempos estimados, instrucciones y preguntas se editan en la pestaña «Preguntas».</p>
          <table class="data-table"><thead><tr><th>No.</th><th>Nombre</th><th>Preguntas</th><th>Tiempo</th></tr></thead><tbody>${App.batteries.map((b) =>
            `<tr><td class="mono">${pad(b.index + 1)}</td><td><input class="input" data-path="batteryNames.${b.key}" data-type="text" value="${esc((d.batteryNames || {})[b.key] || b.name)}" maxlength="60"></td><td>${b.questions.length}</td><td>~${b.meta.estMinutes} min</td></tr>`).join('')}</tbody></table>`;
      case 'profiles': return `<h2>Perfiles y ponderaciones</h2>
          <div class="callout callout-warn" style="margin-bottom:16px">${icon('alert')}<span>Las ponderaciones son valores de referencia configurables y no están validadas científicamente. Cada perfil debe sumar 100%.</span></div>
          <div class="weights-wrap"><table class="weights-table"><thead><tr><th>Perfil</th>${dims.map((x) => `<th title="${esc(x.name)}">${esc(x.short)}</th>`).join('')}<th>Suma</th><th>Mínimos críticos</th><th></th></tr></thead><tbody>
          ${Object.entries(d.profiles).map(([k, p]) => `<tr><td><b>${esc(p.label)}</b><div class="small muted mono">${esc(k)}</div></td>${dims.map((x) => `<td><input data-profile="${esc(k)}" data-dim="${x.key}" type="number" min="0" max="100" value="${num(p.weights[x.key])}" aria-label="${esc(p.label)} — ${esc(x.name)}"></td>`).join('')}
            <td data-sum="${esc(k)}"></td><td><input class="input" style="width:190px;min-height:36px" data-critical="${esc(k)}" value="${esc(Object.entries(p.critical || {}).map(([a, b]) => `${a}:${b}`).join(', '))}" aria-label="Mínimos críticos ${esc(p.label)}"></td>
            <td><button class="btn btn-ghost btn-sm" data-admin="del-profile" data-key="${esc(k)}" aria-label="Eliminar perfil ${esc(p.label)}">${icon('x', 'icon-sm')}</button></td></tr>`).join('')}
          <tr><td><b>Índice global</b></td>${dims.map((x) => `<td><input data-global="${x.key}" type="number" min="0" max="100" value="${num(d.globalWeights[x.key])}" aria-label="Índice global — ${esc(x.name)}"></td>`).join('')}<td data-sum="__global"></td><td></td><td></td></tr>
          </tbody></table></div>
          <p class="small muted">Mínimos críticos: formato <span class="mono">dimension:valor</span> separados por coma (claves: ${dims.map((x) => x.key).join(', ')}).</p>
          <div class="row"><button class="btn btn-sm" data-admin="add-profile">${icon('user', 'icon-sm')} Agregar perfil</button><span class="spacer"></span>
          <label class="small" for="def-profile">Perfil predeterminado</label><select class="select select-inline" id="def-profile" data-path="defaultProfile" data-type="text">${Object.entries(d.profiles).map(([k, p]) => `<option value="${esc(k)}"${k === d.defaultProfile ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>`;
      case 'thresholds': return `<h2>Umbrales de clasificación</h2><p class="muted">Criterios para el resultado psicométrico (herramienta complementaria, no decisión automática).</p>
          <h3>Favorable (todos se deben cumplir)</h3><div class="form-grid">${field('Índice global mínimo', 'classification.favorable.global', { type: 'number' })}${field('Compatibilidad mínima', 'classification.favorable.compatibility', { type: 'number' })}${field('Consistencia mínima', 'classification.favorable.consistency', { type: 'number' })}${field('Integridad mínima', 'classification.favorable.integrity', { type: 'number' })}</div>
          <h3 style="margin-top:22px">No favorable (cualquiera)</h3><div class="form-grid">${field('Índice global menor a', 'classification.unfavorable.global', { type: 'number' })}${field('Compatibilidad menor a', 'classification.unfavorable.compatibility', { type: 'number' })}${field('Integridad menor a', 'classification.unfavorable.integrity', { type: 'number' })}${field('Penalización por punto bajo mínimo crítico', 'criticalPenaltyFactor', { type: 'number' })}</div>
          <h3 style="margin-top:22px">Requiere validación adicional</h3><div class="form-grid">${field('Consistencia mínima para concluir', 'classification.minConsistencyForConclusion', { type: 'number' })}${field('Proporción mínima respondida (0–1)', 'classification.minCompletion', { type: 'number' })}</div>
          <h3 style="margin-top:22px">Niveles descriptivos</h3><div class="form-grid">${d.levels.map((l, i) => field(`${l.label} — desde`, `levels.${i}.min`, { type: 'number' })).join('')}</div>`;
      case 'delivery': return `<h2>Correo y WhatsApp</h2>
          <div class="callout" style="margin-bottom:18px">${icon('shield')}<span>Por seguridad, el navegador nunca contiene llaves ni tokens. El backend envía el correo y el WhatsApp con credenciales en variables de entorno (.env) y es la fuente oficial de destinatarios. Use el bloque generado abajo para configurarlo.</span></div>
          <div class="form-grid">${field('URL del backend (endpoint de envío)', 'delivery.apiEndpoint', { full: true, hint: 'Ejemplo: https://zeiss-talent-assessment.onrender.com · Vacío = modo configuración (no se envía nada).' })}
          ${field('Correos destinatarios (uno por línea)', 'delivery.emailRecipients', { type: 'lines' })}${field('WhatsApp destinatarios (10 dígitos, uno por línea)', 'delivery.whatsappRecipients', { type: 'lines' })}
          ${field('Código de país WhatsApp', 'delivery.whatsappCountryCode')}${field('Asunto del correo', 'delivery.emailSubjectTemplate', { hint: 'Variables: {candidato} {puesto} {id}' })}</div>
          <div id="delivery-warn" style="margin-top:14px"></div>
          <div class="field" style="margin-top:18px"><label for="env-out">Bloque para backend/.env</label><textarea class="textarea code" id="env-out" readonly style="min-height:120px"></textarea></div>`;
      case 'questions': return `<h2>Banco de preguntas</h2><p class="muted">Edite el JSON del banco (baterías, preguntas y pares de consistencia). Tipos: likert, sjt, mc, grid. Se valida antes de guardar.</p>
          <textarea class="textarea code" id="bank-json" spellcheck="false" aria-label="JSON del banco de preguntas">${esc(JSON.stringify(App.bank, null, 2))}</textarea>
          <div id="bank-msg" style="margin-top:10px"></div>
          <div class="row" style="margin-top:12px"><button class="btn btn-sm" data-admin="validate-bank">${icon('check', 'icon-sm')} Validar</button><button class="btn btn-sm btn-primary" data-admin="save-bank">${icon('save', 'icon-sm')} Guardar banco</button>
          <button class="btn btn-sm" data-admin="export-bank">${icon('download', 'icon-sm')} Exportar</button><label class="btn btn-sm">${icon('upload', 'icon-sm')} Importar<input type="file" id="bank-file" accept="application/json" hidden></label>
          <button class="btn btn-sm btn-ghost" data-admin="reset-bank">Restaurar banco original</button></div>`;
      case 'security': return `<h2>Seguridad y datos</h2><div class="form-grid">
          <div class="field"><label for="pin1">Nuevo PIN (mínimo 4 caracteres)</label><input class="input" id="pin1" type="password" autocomplete="new-password" maxlength="32"></div>
          <div class="field"><label for="pin2">Confirmar PIN</label><input class="input" id="pin2" type="password" autocomplete="new-password" maxlength="32"></div></div>
          <div class="row" style="margin-top:12px"><button class="btn btn-sm" data-admin="change-pin">${icon('lock', 'icon-sm')} Cambiar PIN</button></div>
          <h3 style="margin-top:26px">Configuración</h3><div class="row"><button class="btn btn-sm" data-admin="export-config">${icon('download', 'icon-sm')} Exportar configuración</button>
          <label class="btn btn-sm">${icon('upload', 'icon-sm')} Importar configuración<input type="file" id="config-file" accept="application/json" hidden></label>
          <button class="btn btn-sm btn-ghost" data-admin="reset-config">Restaurar valores predeterminados</button></div>
          <h3 style="margin-top:26px">Datos locales de este equipo</h3><p class="small muted">Elimina la sesión en curso y el último resultado guardado en este navegador.</p>
          <button class="btn btn-sm" data-admin="clear-data">${icon('x', 'icon-sm')} Borrar datos locales</button>`;
      default: return '';
    }
  }

  function renderAdmin() {
    $('#admin-root').innerHTML = `<div class="page-head row"><div><span class="eyebrow">Administración</span><h2 style="margin:4px 0 0">Panel de configuración</h2></div><span class="spacer"></span>
      <button class="btn btn-ghost" data-action="home">${icon('arrow-left')} Salir</button><button class="btn btn-primary" data-admin="save">${icon('save')} Guardar cambios</button></div>
      <div class="admin-layout"><nav class="tabs" role="tablist" aria-label="Secciones">${ADMIN_TABS.map(([k, l, ic]) => `<button class="tab-btn" role="tab" aria-selected="${k === Admin.tab}" data-tab="${k}">${icon(ic, 'icon-sm')}${esc(l)}</button>`).join('')}</nav>
      <div class="card tab-panel" role="tabpanel">${adminPanel(Admin.tab)}</div></div>`;
    bindAdmin();
  }

  function updateAdminDerived() {
    const d = Admin.draft;
    $$('[data-sum]').forEach((td) => {
      const k = td.dataset.sum;
      const w = k === '__global' ? d.globalWeights : d.profiles[k].weights;
      const sum = Math.round(ZTA.DIMENSIONS.reduce((s, x) => s + num(w[x.key]), 0) * 100) / 100;
      td.innerHTML = `<span class="${Math.abs(sum - 100) < 0.01 ? 'sum-ok' : 'sum-bad'}">${sum}%</span>`;
    });
    const warn = $('#delivery-warn');
    if (warn) {
      const msgs = [];
      d.delivery.emailRecipients.forEach((m) => {
        if (!RX.email.test(m)) msgs.push(`Correo con formato inválido: ${m}`);
        else if (d.company.primaryDomain && m.split('@')[1].toLowerCase() !== d.company.primaryDomain.toLowerCase()) msgs.push(`«${m}» usa un dominio distinto al corporativo (${d.company.primaryDomain}). Verifique que sea correcto; el sistema no lo corrige automáticamente.`);
      });
      d.delivery.whatsappRecipients.forEach((n) => { if (!/^\d{10}$/.test(n)) msgs.push(`Número de WhatsApp inválido (se esperan 10 dígitos): ${n}`); });
      warn.innerHTML = msgs.map((m) => `<p class="field-warn">${icon('alert', 'icon-sm')}<span>${esc(m)}</span></p>`).join('');
      $('#env-out').value = [`EMAIL_TO=${d.delivery.emailRecipients.join(',')}`, `WHATSAPP_TO=${d.delivery.whatsappRecipients.join(',')}`,
        `WHATSAPP_COUNTRY_CODE=${d.delivery.whatsappCountryCode}`, `EMAIL_SUBJECT_TEMPLATE=${d.delivery.emailSubjectTemplate}`].join('\n');
    }
  }

  function readFileAs(file, as) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; as === 'url' ? fr.readAsDataURL(file) : fr.readAsText(file); });
  }

  function bindAdmin() {
    const d = Admin.draft;
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { Admin.tab = b.dataset.tab; renderAdmin(); }));
    $$('[data-path]').forEach((el) => el.addEventListener('input', () => {
      const t = el.dataset.type;
      const v = t === 'number' ? num(el.value) : t === 'lines' ? el.value.split('\n').map((x) => cleanText(x)).filter(Boolean)
        : t === 'list' ? el.value.split(',').map((x) => num(x, NaN)).filter(Number.isFinite) : cleanText(el.value, 300);
      setPath(d, el.dataset.path, v);
      updateAdminDerived();
    }));
    $$('[data-profile]').forEach((el) => el.addEventListener('input', () => { d.profiles[el.dataset.profile].weights[el.dataset.dim] = num(el.value); updateAdminDerived(); }));
    $$('[data-global]').forEach((el) => el.addEventListener('input', () => { d.globalWeights[el.dataset.global] = num(el.value); updateAdminDerived(); }));
    $$('[data-critical]').forEach((el) => el.addEventListener('input', () => {
      const out = {};
      el.value.split(',').forEach((pair) => { const [k, v] = pair.split(':').map((x) => x && x.trim()); if (ZTA.DIMENSIONS.some((x) => x.key === k) && Number.isFinite(+v)) out[k] = +v; });
      d.profiles[el.dataset.critical].critical = out;
    }));
    const logo = $('#logo-file');
    if (logo) logo.addEventListener('change', async () => {
      const f = logo.files[0];
      if (!f) return;
      if (f.size > 300 * 1024 || !/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) { toast('El archivo debe ser PNG, JPG, SVG o WebP de máximo 300 KB.', 'danger'); return; }
      d.company.logoDataUrl = await readFileAs(f, 'url');
      renderAdmin();
    });
    const bankFile = $('#bank-file');
    if (bankFile) bankFile.addEventListener('change', async () => { if (bankFile.files[0]) { $('#bank-json').value = await readFileAs(bankFile.files[0], 'text'); adminAction('validate-bank'); } });
    const cfgFile = $('#config-file');
    if (cfgFile) cfgFile.addEventListener('change', async () => {
      try { const obj = JSON.parse(await readFileAs(cfgFile.files[0], 'text')); Admin.draft = deepMerge(ZTA.DEFAULT_CONFIG, obj); if (obj.profiles) Admin.draft.profiles = obj.profiles; renderAdmin(); toast('Configuración importada. Revise y guarde los cambios.'); }
      catch (e) { toast('El archivo no es un JSON válido.', 'danger'); }
    });
    $$('[data-admin]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); adminAction(b.dataset.admin, b.dataset.key); }));
    updateAdminDerived();
  }

  async function adminAction(action, key) {
    const d = Admin.draft;
    const bankMsg = (ok, lines) => { $('#bank-msg').innerHTML = `<div class="callout${ok ? '' : ' callout-warn'}">${icon(ok ? 'check' : 'alert')}<span>${lines.map(esc).join('<br>')}</span></div>`; };
    switch (action) {
      case 'save': {
        const bad = Object.values(d.profiles).concat([{ label: 'Índice global', weights: d.globalWeights }]).filter((p) => Math.abs(ZTA.DIMENSIONS.reduce((s, x) => s + num(p.weights[x.key]), 0) - 100) > 0.01);
        if (bad.length) { toast(`Las ponderaciones deben sumar 100%: ${bad.map((p) => p.label).join(', ')}.`, 'danger', 6000); return; }
        if (!d.profiles[d.defaultProfile]) d.defaultProfile = Object.keys(d.profiles)[0];
        d.exam.durationMinutes = Math.min(240, Math.max(5, num(d.exam.durationMinutes, 60)));
        d.exam.idPrefix = cleanText(d.exam.idPrefix, 6).replace(/[^A-Za-z0-9]/g, '') || 'ZA';
        d.levels.sort((a, b) => b.min - a.min);
        saveConfig(d); loadConfig(); loadBank(); applyBranding(); renderLanding();
        Admin.draft = clone(App.config); renderAdmin();
        toast('Configuración guardada.');
        return;
      }
      case 'remove-logo': d.company.logoDataUrl = ''; renderAdmin(); return;
      case 'add-profile': {
        const r = await modal({ title: 'Agregar perfil', body: '<div class="field"><label for="np">Nombre del perfil</label><input class="input" id="np" name="label" maxlength="40"></div>', actions: [{ label: 'Cancelar', value: null, cls: 'btn-ghost' }, { label: 'Agregar', value: 'ok', cls: 'btn-primary' }] });
        const label = r.action === 'ok' ? cleanText(r.data.label, 40) : '';
        if (!label) return;
        const k = slug(label).toLowerCase() || 'perfil';
        if (d.profiles[k]) { toast('Ya existe un perfil con ese nombre.', 'warn'); return; }
        d.profiles[k] = { label, weights: Object.fromEntries(ZTA.DIMENSIONS.map((x) => [x.key, 10])), critical: { integridad: 50 } };
        renderAdmin();
        return;
      }
      case 'del-profile':
        if (Object.keys(d.profiles).length <= 1) { toast('Debe existir al menos un perfil.', 'warn'); return; }
        delete d.profiles[key];
        if (d.defaultProfile === key) d.defaultProfile = Object.keys(d.profiles)[0];
        renderAdmin();
        return;
      case 'validate-bank': case 'save-bank': {
        let bank;
        try { bank = JSON.parse($('#bank-json').value); } catch (e) { bankMsg(false, ['JSON inválido: ' + e.message]); return; }
        const v = validateBank(bank);
        if (!v.ok) { bankMsg(false, v.errs.slice(0, 12)); return; }
        if (action === 'validate-bank') { bankMsg(true, [`Banco válido: ${bank.questions.length} preguntas en ${bank.batteries.length} baterías.`]); return; }
        Store.set(KEYS.bank, bank); loadBank(); applyBranding(); renderLanding();
        bankMsg(true, ['Banco guardado. Se aplicará a las evaluaciones nuevas.']);
        return;
      }
      case 'export-bank': downloadBlob(new Blob([JSON.stringify(App.bank, null, 2)], { type: 'application/json' }), 'banco_preguntas.json'); return;
      case 'reset-bank': Store.del(KEYS.bank); loadBank(); applyBranding(); renderLanding(); renderAdmin(); toast('Banco original restaurado.'); return;
      case 'change-pin': {
        const p1 = $('#pin1').value, p2 = $('#pin2').value;
        if (p1.length < 4 || p1 !== p2) { toast('El PIN debe tener al menos 4 caracteres y coincidir.', 'danger'); return; }
        d.security.adminPinHash = pinHash(p1);
        saveConfig(clone(Object.assign(clone(App.config), { security: d.security })));
        loadConfig();
        toast('PIN actualizado.');
        return;
      }
      case 'export-config': { const out = clone(d); downloadBlob(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }), 'configuracion_zta.json'); return; }
      case 'reset-config': Store.del(KEYS.config); loadConfig(); Admin.draft = clone(App.config); applyBranding(); renderLanding(); renderAdmin(); toast('Valores predeterminados restaurados.'); return;
      case 'clear-data': Store.del(KEYS.session); Store.del(KEYS.record); App.record = null; toast('Datos locales eliminados.'); return;
      default:
    }
  }

  /* ================================= 12. DEMO ================================= */
  const DEMO_CANDIDATES = [
    { nombre: 'Mariana López Herrera', correo: 'mariana.lopez@ejemplo.com', telefono: '6641234567', puesto: 'Supervisora de Producción', area: 'Manufactura · Recubrimientos', empleado: '', evaluador: 'Recursos Humanos (Demo)', perfil: 'supervisor',
      persona: { personalidad: .78, liderazgo: .86, decisiones: .8, blandas: .82, integridad: .92, logico: .62, numerico: .52, atencion: .5, critico: .72, adaptabilidad: .8 } },
    { nombre: 'Jorge Ramírez Soto', correo: 'jorge.ramirez@ejemplo.com', telefono: '6649876543', puesto: 'Técnico de Mantenimiento', area: 'Mantenimiento · Facilities', empleado: 'D-10482', evaluador: 'Recursos Humanos (Demo)', perfil: 'tecnico',
      persona: { personalidad: .72, liderazgo: .5, decisiones: .7, blandas: .6, integridad: .86, logico: .86, numerico: .82, atencion: .78, critico: .68, adaptabilidad: .64 } },
    { nombre: 'Daniela Torres Méndez', correo: 'daniela.torres@ejemplo.com', telefono: '6645550199', puesto: 'Coordinadora de Calidad', area: 'Calidad', empleado: '', evaluador: 'Recursos Humanos (Demo)', perfil: 'coordinador',
      persona: { personalidad: .76, liderazgo: .7, decisiones: .74, blandas: .88, integridad: .9, logico: .6, numerico: .64, atencion: .62, critico: .76, adaptabilidad: .84 } }
  ];
  /** Generador pseudoaleatorio reproducible (mulberry32). */
  const rngFrom = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /** Respuesta simulada coherente con el perfil del candidato ficticio. */
  function demoAnswer(q, ability, rnd) {
    const a = Math.min(0.97, Math.max(0.2, ability + (rnd() - 0.5) * 0.12));
    const objective = q.type === 'mc' || q.type === 'grid';
    const t = Math.round((objective ? 20000 + rnd() * 45000 : 7000 + rnd() * 18000));
    if (q.type === 'likert') {
      const keyed = Math.min(5, Math.max(1, Math.round(1 + 4 * a + (rnd() - 0.5) * 1.4)));
      return { v: q.reverse ? 6 - keyed : keyed, t };
    }
    if (q.type === 'sjt') {
      const by = (s) => q.options.findIndex((o) => o.s === s);
      const r = rnd();
      const pick = r < a ? by(3) : r < a + (1 - a) * 0.65 ? (by(2) >= 0 ? by(2) : by(1)) : r < a + (1 - a) * 0.9 ? by(1) : by(0);
      return { v: pick >= 0 ? pick : by(3), t };
    }
    if (q.type === 'mc') {
      if (rnd() < a) return { v: q.answer, t };
      const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer);
      return { v: wrong[Math.floor(rnd() * wrong.length)], t };
    }
    const sel = q.items.map((_, i) => i).filter((i) => (q.answer.includes(i) ? rnd() < a + 0.1 : rnd() < (1 - a) * 0.12));
    return { v: sel.length ? sel : [q.answer[0]], t };
  }

  async function chooseDemo() {
    const r = await modal({
      title: 'Modo demostración', iconName: 'play',
      body: '<p>Se cargará un candidato ficticio con respuestas simuladas para mostrar el flujo completo: registro, evaluación, scoring, reporte PDF y dashboard de Recursos Humanos.</p><div class="callout callout-warn">' + icon('shield') + '<span>El modo demostración <b>nunca</b> envía correos ni mensajes de WhatsApp.</span></div>',
      actions: [{ label: 'Explorar manualmente', value: 'manual', cls: '' }, { label: 'Recorrido automático', value: 'auto', cls: 'btn-primary', icon: 'play' }]
    });
    if (r.action) runDemo(r.action);
  }

  async function runDemo(mode) {
    stopTimer();
    const cand = DEMO_CANDIDATES[randInt(DEMO_CANDIDATES.length)];
    const s = newSession(true);
    s.profileKey = App.config.profiles[cand.perfil] ? cand.perfil : App.config.defaultProfile;
    s.candidate = { nombre: cand.nombre, correo: cand.correo, telefono: cand.telefono, puesto: cand.puesto, area: cand.area, empleado: cand.empleado, evaluador: cand.evaluador };
    s.demoPersona = cand.persona;
    s.demoSeed = randInt(1e9);
    App.demoRun = mode === 'auto' ? { active: true } : null;
    openRegistro(s);
    if (mode !== 'auto') { toast('Modo demostración: datos ficticios cargados. No se enviará nada.'); return; }
    const run = App.demoRun;
    const alive = () => App.demoRun === run && App.session === s;
    await sleep(900); if (!alive()) return;
    $('#form-registro').requestSubmit();
    await sleep(900); if (!alive()) return;
    $('#consent-check').checked = true; $('#consent-check').dispatchEvent(new Event('change'));
    await sleep(600); if (!alive()) return;
    acceptConsent();
    await sleep(900); if (!alive()) return;
    startExam();
    const rnd = rngFrom(s.demoSeed);
    let total = 0;
    while (alive() && ['examen', 'transicion'].includes(s.stage)) {
      if (s.stage === 'transicion') { await sleep(420); if (!alive()) return; continueBattery(); continue; }
      const q = App.flat[s.qi];
      const ans = demoAnswer(q, (s.demoPersona || {})[q.dim] || 0.7, rnd);
      if (q.type === 'grid') { ans.v.forEach((i) => { const b = $(`#q-root .grid-item[data-idx="${i}"]`); if (b) b.click(); }); }
      else { const inp = $(`#q-root input[name="ans"][value="${ans.v}"]`); if (inp) { inp.checked = true; inp.dispatchEvent(new Event('change')); } }
      await sleep(55); if (!alive()) return;
      goNext();
      s.times[q.id] = ans.t; total += ans.t;
    }
    if (!alive() || s.stage !== 'confirmacion') return;
    await sleep(800); if (!alive()) return;
    s.startedAt = Date.now() - total; s.deadline = s.startedAt + s.limitSec * 1000;
    finish();
  }

  /** Botón "Autocompletar (demo)": responde lo pendiente y va a la confirmación. */
  function demoAutofill() {
    const s = App.session;
    if (!s || !s.demo) return;
    const rnd = rngFrom(s.demoSeed || 7);
    let total = 0;
    App.flat.forEach((q) => {
      if (!s.answers[q.id]) { const a = demoAnswer(q, (s.demoPersona || {})[q.dim] || 0.7, rnd); s.answers[q.id] = { v: a.v }; s.times[q.id] = a.t; }
      total += s.times[q.id] || 0;
    });
    s.startedAt = Date.now() - total; s.deadline = s.startedAt + s.limitSec * 1000;
    s.qi = App.flat.length - 1; s.stage = 'confirmacion';
    renderConfirm();
  }

  /* ================================= 13. INIT ================================= */
  const STAGE_LABEL = { registro: 'Registro de datos', consentimiento: 'Aviso de privacidad', instrucciones: 'Instrucciones', examen: 'Evaluación en curso', transicion: 'Evaluación en curso', confirmacion: 'Confirmación final', procesando: 'Procesamiento' };

  function resume(s) {
    App.session = s;
    s.finishing = false;
    setDemoBadge(false);
    if (['examen', 'transicion', 'confirmacion', 'procesando'].includes(s.stage)) {
      if (s.stage === 'procesando') { s.stage = 'confirmacion'; finish(); return; }
      if (s.deadline && Date.now() >= s.deadline) { renderQuestion(); show('examen'); timeUp(); return; }
      startTimer();
      if (s.stage === 'examen') { renderQuestion(); show('examen'); }
      else if (s.stage === 'transicion') renderTransition(batteryIndexOf(s.qi));
      else renderConfirm();
      toast('Continuaste tu evaluación. El tiempo siguió corriendo mientras estuvo cerrada.');
      return;
    }
    if (s.stage === 'consentimiento') openConsent();
    else if (s.stage === 'instrucciones') show('instrucciones');
    else openRegistro(s);
  }

  /** Detecta una sesión guardada y ofrece continuarla o iniciar una nueva. */
  async function checkRecovery() {
    const r = Store.unseal(KEYS.session);
    if (r.status === 'tampered') { Store.del(KEYS.session); toast('Se descartó una sesión guardada porque fue modificada o está dañada.', 'danger', 8000); return false; }
    if (r.status !== 'ok') return false;
    const s = r.data;
    if (!s || s.v !== 1 || s.bankVersion !== App.bank.version || s.stage === 'done') { Store.del(KEYS.session); return false; }
    while (true) {
      const left = s.deadline ? Math.max(0, s.deadline - Date.now()) : null;
      const m = await modal({
        title: 'Se recuperó una sesión de evaluación existente.', iconName: 'refresh', dismissable: false,
        body: `<dl class="kv"><div><dt>Candidato</dt><dd>${esc(s.candidate.nombre || 'Sin nombre')}</dd></div><div><dt>Assessment ID</dt><dd class="mono">${esc(s.id)}</dd></div>
          <div><dt>Etapa</dt><dd>${esc(STAGE_LABEL[s.stage] || s.stage)}${s.stage === 'examen' ? ` · ${Object.keys(s.answers).length} de ${App.flat.length} respondidas` : ''}</dd></div>
          ${left !== null ? `<div><dt>Tiempo restante</dt><dd>${fmtClock(left)}</dd></div>` : ''}</dl>`,
        actions: [{ label: 'Iniciar nueva evaluación', value: 'new' }, { label: 'Continuar evaluación', value: 'resume', cls: 'btn-primary' }]
      });
      if (m.action === 'resume') { resume(s); return true; }
      const c = await modal({ title: '¿Descartar la evaluación guardada?', iconName: 'alert', body: '<p>Las respuestas registradas en este equipo se eliminarán y no podrán recuperarse.</p>', dismissable: false,
        actions: [{ label: 'Regresar', value: 'back' }, { label: 'Descartar e iniciar nueva', value: 'discard', cls: 'btn-primary' }] });
      if (c.action === 'discard') { Store.del(KEYS.session); App.session = null; return false; }
    }
  }

  function goHome() {
    stopTimer();
    App.demoRun = null;
    if (App.session && (App.session.stage === 'done' || App.session.demo)) App.session = null;
    setDemoBadge(false);
    show('landing');
  }
  async function startNew() {
    App.demoRun = null;
    if (Store.get(KEYS.session) && (await checkRecovery())) return;
    openRegistro(newSession(false));
  }
  async function newEval() {
    const m = await modal({ title: 'Nueva evaluación', body: '<p>Se cerrará este dashboard. El último resultado permanece guardado en este equipo hasta que se complete otra evaluación.</p>',
      actions: [{ label: 'Cancelar', value: null, cls: 'btn-ghost' }, { label: 'Continuar', value: 'ok', cls: 'btn-primary' }] });
    if (m.action === 'ok') { destroyCharts(); goHome(); }
  }
  function reviewLast() {
    const s = App.session;
    s.stage = 'examen';
    s.qi = App.batteries[App.batteries.length - 1].end;
    persist();
    renderQuestion();
    show('examen');
  }

  const ACTIONS = {
    start: startNew, demo: chooseDemo, home: goHome, admin: openAdmin, 'hr-access': openHR,
    'to-registro': () => openRegistro(App.session), 'to-consentimiento': openConsent, 'begin-exam': startExam,
    'continue-battery': continueBattery, 'review-last': reviewLast, finish: () => finish(), 'demo-fill': demoAutofill,
    'open-dashboard': () => App.record && openDashboard(App.record), 'download-pdf': downloadPdf, 'export-json': exportJson, resend, 'new-eval': newEval
  };

  function bindGlobal() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && ACTIONS[el.dataset.action]) { e.preventDefault(); ACTIONS[el.dataset.action](); }
    });
    document.addEventListener('keydown', onExamKey);
    $('#form-registro').addEventListener('submit', submitRegistro);
    $('#consent-check').addEventListener('change', (e) => { $('#consent-continue').disabled = !e.target.checked; });
    $('#consent-continue').addEventListener('click', acceptConsent);
    $('#q-next').addEventListener('click', goNext);
    $('#q-prev').addEventListener('click', goPrev);
    const fill = document.createElement('button');
    fill.type = 'button'; fill.className = 'btn btn-sm'; fill.id = 'q-demo-fill'; fill.dataset.action = 'demo-fill'; fill.hidden = true;
    fill.innerHTML = icon('play', 'icon-sm') + ' Autocompletar (demo)';
    $('#q-next').before(fill);
    // Salidas de la ventana durante la evaluación (indicador informativo para RH)
    document.addEventListener('visibilitychange', () => {
      const s = App.session;
      if (!s || s.demo || !EXAM_SCREENS.includes(App.current)) return;
      if (document.hidden) { s.blurCount = (s.blurCount || 0) + 1; if (App.current === 'examen') leaveQuestion(); persist(); }
      else { App.shownAt = performance.now(); tickTimer(); }
    });
    window.addEventListener('pagehide', () => { if (App.session && App.current === 'examen') { leaveQuestion(); persist(); } });
    window.addEventListener('beforeunload', (e) => { if (App.session && !App.session.demo && EXAM_SCREENS.includes(App.current)) { e.preventDefault(); e.returnValue = ''; } });
  }

  /** Si el frontend lo sirve el backend, detecta el endpoint de envío automáticamente. */
  async function autodetectBackend() {
    if (!/^https?:$/.test(location.protocol) || App.config.delivery.apiEndpoint) return;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 2500);
    try {
      const r = await fetch('api/public-config', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      const j = r.ok ? await r.json() : null;
      if (j && typeof j.apiEndpoint === 'string' && /^[\w\/.-]{1,200}$/.test(j.apiEndpoint)) App.config.delivery.apiEndpoint = j.apiEndpoint;
    } catch (e) { /* sin backend: modo configuración */ } finally { clearTimeout(to); }
  }

  async function init() {
    loadConfig();
    loadBank();
    readPresets();
    applyBranding();
    renderLanding();
    renderSteppers();
    bindGlobal();
    show('landing');
    autodetectBackend();
    const recovered = await checkRecovery();
    if (!recovered && presets.demo) chooseDemo();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
