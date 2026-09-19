/* =============================================================================
 * ZEISS Talent Assessment — REPORT (gráficas + PDF corporativo)
 * -----------------------------------------------------------------------------
 *  - Gráficas con Chart.js: radar (10 competencias), barras horizontales
 *    (resultado por batería) y dona tipo medidor (resultado global).
 *    Una sola serie → un solo color; valores directos en la punta de cada barra;
 *    rejilla fina y discreta. Las mismas configuraciones se usan en el
 *    dashboard y en el PDF (renderizadas fuera de pantalla a alta resolución).
 *  - PDF con jsPDF: portada, resumen ejecutivo, perfil, resultados, fortalezas,
 *    áreas de desarrollo, entrevista, conclusión y nota metodológica.
 * ========================================================================== */
(function (global) {
  'use strict';
  const ZTA = (global.ZTA = global.ZTA || {});
  const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

  const hexToRgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(',')},${a})`;
  /** Divide etiquetas largas en varias líneas para los ejes. */
  function wrapLabel(text, max = 16) {
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    return lines;
  }

  /* --------------------------- Configuración de gráficas --------------------------- */
  /** Etiqueta de valor en la punta de cada barra (texto en color de tinta, no de serie). */
  const valueLabels = {
    id: 'ztaValueLabels',
    afterDatasetsDraw(chart, _args, opts) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = `600 ${opts.size || 12}px ${FONT}`;
      ctx.fillStyle = opts.color || '#101C31';
      ctx.textBaseline = 'middle';
      meta.data.forEach((bar, i) => ctx.fillText(String(chart.data.datasets[0].data[i]), bar.x + 6, bar.y));
      ctx.restore();
    }
  };

  function radarConfig(result, theme, pdf) {
    const dims = result.dimensions;
    return {
      type: 'radar',
      data: {
        labels: dims.map((d) => wrapLabel(d.name, pdf ? 18 : 14)),
        datasets: [{
          label: 'Resultado', data: dims.map((d) => d.score),
          borderColor: theme.primary, backgroundColor: rgba(theme.primary, 0.1), borderWidth: 2,
          pointBackgroundColor: theme.primary, pointBorderColor: '#FFFFFF', pointBorderWidth: 2,
          pointRadius: pdf ? 4.5 : 4, pointHoverRadius: 6, pointHitRadius: 14
        }]
      },
      options: {
        responsive: !pdf, maintainAspectRatio: false, animation: pdf ? false : { duration: 700 },
        devicePixelRatio: pdf ? 2.5 : undefined,
        layout: { padding: pdf ? 8 : 4 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: !pdf, backgroundColor: theme.ink, padding: 10, callbacks: { title: (it) => dims[it[0].dataIndex].name, label: (it) => ` ${it.raw}/100 · ${dims[it.dataIndex].level}` } }
        },
        scales: {
          r: {
            min: 0, max: 100, beginAtZero: true,
            ticks: { stepSize: 20, color: theme.muted, showLabelBackdrop: false, font: { size: pdf ? 11 : 10, family: FONT } },
            grid: { color: theme.chartGrid, lineWidth: 1 }, angleLines: { color: theme.chartGrid, lineWidth: 1 },
            pointLabels: { color: theme.ink, font: { size: pdf ? 14 : 11.5, weight: '600', family: FONT }, padding: pdf ? 10 : 6 }
          }
        }
      }
    };
  }

  function barsConfig(result, theme, pdf) {
    const dims = result.dimensions;
    return {
      type: 'bar',
      data: {
        labels: dims.map((d) => (pdf ? d.name : wrapLabel(d.name, 22))),
        datasets: [{
          label: 'Resultado', data: dims.map((d) => d.score), backgroundColor: theme.primary, hoverBackgroundColor: theme.primaryDark,
          borderRadius: 4, borderSkipped: 'start', maxBarThickness: pdf ? 26 : 20, barPercentage: 0.72, categoryPercentage: 0.9
        }]
      },
      options: {
        indexAxis: 'y', responsive: !pdf, maintainAspectRatio: false, animation: pdf ? false : { duration: 700 },
        devicePixelRatio: pdf ? 2.5 : undefined,
        layout: { padding: { right: 34, top: 4 } },
        plugins: {
          legend: { display: false }, ztaValueLabels: { color: theme.ink, size: pdf ? 15 : 12 },
          tooltip: { enabled: !pdf, backgroundColor: theme.ink, padding: 10, callbacks: { title: (it) => dims[it[0].dataIndex].name, label: (it) => ` ${it.raw}/100 · ${dims[it.dataIndex].level}` } }
        },
        scales: {
          x: { min: 0, max: 100, ticks: { stepSize: 20, color: theme.muted, font: { size: pdf ? 13 : 11, family: FONT } }, grid: { color: theme.chartGrid, lineWidth: 1 }, border: { display: false } },
          y: { ticks: { color: theme.ink, font: { size: pdf ? 15 : 11.5, weight: '600', family: FONT } }, grid: { display: false }, border: { color: theme.chartGrid } }
        }
      },
      plugins: [valueLabels]
    };
  }

  /** Dona tipo medidor: el arco lleno es el resultado; la pista es un tono claro de la misma rampa. */
  function donutConfig(score, theme, pdf) {
    return {
      type: 'doughnut',
      data: { datasets: [{ data: [score, Math.max(0, 100 - score)], backgroundColor: [theme.primary, theme.primarySoft], borderWidth: 0, borderRadius: pdf ? 0 : 3 }] },
      options: {
        responsive: !pdf, maintainAspectRatio: false, cutout: '78%', animation: pdf ? false : { duration: 900 },
        devicePixelRatio: pdf ? 3 : undefined, events: [],
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    };
  }

  const themeOf = (config) => Object.assign({}, ZTA.DEFAULT_CONFIG.theme, (config && config.theme) || {});

  function renderDashboardCharts(canvases, result, config) {
    const theme = themeOf(config);
    const charts = [];
    if (canvases.donut) charts.push(new Chart(canvases.donut, donutConfig(result.global.score, theme, false)));
    if (canvases.radar) charts.push(new Chart(canvases.radar, radarConfig(result, theme, false)));
    if (canvases.bars) charts.push(new Chart(canvases.bars, barsConfig(result, theme, false)));
    return charts;
  }

  /** Renderiza una configuración Chart.js fuera de pantalla y devuelve un PNG (data URL). */
  function chartImage(cfg, width, height) {
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-12000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    host.appendChild(canvas);
    document.body.appendChild(host);
    try {
      const chart = new Chart(canvas, cfg);
      chart.update('none');
      const url = canvas.toDataURL('image/png');
      chart.destroy();
      return url;
    } finally { host.remove(); }
  }

  /** Convierte el logotipo (PNG/JPG/SVG/WebP) a PNG con sus proporciones. */
  function rasterizeLogo(dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => {
        const ratio = (img.naturalWidth || 300) / (img.naturalHeight || 100);
        const h = 160, w = Math.round(h * ratio);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve({ url: c.toDataURL('image/png'), ratio });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  /* ================================ PDF ================================ */
  /** Las fuentes estándar del PDF usan WinAnsi: se sustituyen caracteres no soportados. */
  const PDF_MAP = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '✓': '', ' ': ' ' };
  const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const pdfSafe = (s) => String(s == null ? '' : s).replace(/[→←≥≤✓ ]/g, (ch) => PDF_MAP[ch]).replace(/[^\u0000-ÿ]/g, (ch) => (WINANSI_EXTRA.includes(ch) ? ch : ''));
  const STATUS_COLORS = { FAVORABLE: ['#177A4B', '#E7F4EC'], VALIDACION: ['#8A5300', '#FDF3E1'], NO_FAVORABLE: ['#B8322A', '#FBEAE8'] };
  const SEV_COLORS = { alta: ['#B8322A', '#FBEAE8'], media: ['#8A5300', '#FDF3E1'], info: ['#0E3A9C', '#EEF3FD'] };
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const longDate = (ts) => { const d = new Date(ts); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };
  const shortDate = (ts) => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const minSec = (sec) => `${Math.floor(sec / 60)} min ${String(Math.round(sec % 60)).padStart(2, '0')} s`;

  /** Contexto de dibujo: medidas, colores, texto con salto de página, tablas y tarjetas. */
  function createCtx(doc, theme) {
    const P = { doc, theme, W: 210, H: 297, M: 18, TOP: 30, BOTTOM: 276, y: 30 };
    P.CW = P.W - 2 * P.M;
    const PT = 0.3528;
    P.fill = (hex) => doc.setFillColor(...hexToRgb(hex));
    P.draw = (hex) => doc.setDrawColor(...hexToRgb(hex));
    P.color = (hex) => doc.setTextColor(...hexToRgb(hex));
    P.font = (size, style = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(size); };
    P.newPage = () => { doc.addPage(); P.y = P.TOP; };
    P.ensure = (h) => { if (P.y + h > P.BOTTOM) P.newPage(); };
    P.lineH = (size, lh = 1.42) => size * PT * lh;
    /** Texto con ajuste de línea; avanza P.y y cambia de página si es necesario. */
    P.para = (str, { x = P.M, width = P.CW, size = 10, color = theme.ink, style = 'normal', lh = 1.42, gap = 0 } = {}) => {
      P.font(size, style); P.color(color);
      const lines = doc.splitTextToSize(pdfSafe(str), width);
      const h = P.lineH(size, lh);
      lines.forEach((line) => { P.ensure(h); doc.text(line, x, P.y + size * PT * 0.82); P.y += h; });
      P.y += gap;
    };
    P.measure = (str, width, size, lh = 1.42) => { P.font(size); return doc.splitTextToSize(pdfSafe(str), width).length * P.lineH(size, lh); };
    P.section = (num, title, subtitle) => {
      P.font(8, 'bold'); P.color(theme.primary);
      doc.text(`SECCIÓN ${num}`, P.M, P.y + 3, { charSpace: 0.4 });
      P.y += 6;
      P.font(19, 'bold'); P.color(theme.ink);
      doc.text(pdfSafe(title), P.M, P.y + 6.5);
      P.y += 10;
      if (subtitle) { P.font(9.5); P.color(theme.muted); doc.text(pdfSafe(subtitle), P.M, P.y + 3.5); P.y += 6; }
      P.draw(theme.line); doc.setLineWidth(0.3); doc.line(P.M, P.y + 2, P.M + P.CW, P.y + 2);
      P.y += 8;
    };
    P.heading = (text, size = 12) => { P.ensure(14); P.font(size, 'bold'); P.color(theme.ink); doc.text(pdfSafe(text), P.M, P.y + size * PT * 0.82); P.y += P.lineH(size, 1.6); };
    P.bullets = (items, { size = 9.8, color = theme.ink, indent = 5 } = {}) => {
      items.forEach((it) => {
        P.ensure(P.lineH(size));
        P.fill(theme.primary); doc.circle(P.M + 1.4, P.y + size * PT * 0.55, 0.75, 'F');
        P.para(it, { x: P.M + indent, width: P.CW - indent, size, color, gap: 1.2 });
      });
    };
    /** Tabla simple con encabezado, filas alternas y alineación por columna. */
    P.table = (headers, rows, widths, aligns = []) => {
      const rowH = 8;
      const cellText = (txt, i, x, y, bold) => {
        P.font(bold === 'head' ? 7.6 : 9.2, bold ? 'bold' : 'normal');
        P.color(bold === 'head' ? theme.muted : theme.ink);
        const s = bold === 'head' ? pdfSafe(txt).toUpperCase() : pdfSafe(txt);
        if (aligns[i] === 'right') doc.text(s, x + widths[i] - 3, y, { align: 'right' }); else doc.text(s, x + 3, y);
      };
      const total = rowH * (rows.length + 1);
      P.ensure(total <= P.BOTTOM - P.TOP ? total : rowH * 2); // tablas cortas no se dividen entre páginas
      P.fill('#F1F4F9'); doc.rect(P.M, P.y, P.CW, rowH, 'F');
      let x = P.M;
      headers.forEach((h, i) => { cellText(h, i, x, P.y + 5.2, 'head'); x += widths[i]; });
      P.y += rowH;
      rows.forEach((row, ri) => {
        P.ensure(rowH);
        if (ri % 2 === 1) { P.fill('#FAFBFD'); doc.rect(P.M, P.y, P.CW, rowH, 'F'); }
        P.draw(theme.line); doc.setLineWidth(0.2); doc.line(P.M, P.y + rowH, P.M + P.CW, P.y + rowH);
        x = P.M;
        row.cells.forEach((cell, i) => { cellText(cell, i, x, P.y + 5.3, row.bold); x += widths[i]; });
        P.y += rowH;
      });
      P.y += 4;
    };
    /** Caja con fondo suave y barra lateral de color (estado o nota). */
    P.statusBox = (label, text, [fg, bg]) => {
      const h = 12 + P.measure(text, P.CW - 14, 9.6);
      P.ensure(h + 4);
      P.fill(bg); doc.roundedRect(P.M, P.y, P.CW, h, 2.5, 2.5, 'F');
      P.fill(fg); doc.rect(P.M, P.y, 1.8, h, 'F');
      P.font(11.5, 'bold'); P.color(fg); doc.text(pdfSafe(label), P.M + 7, P.y + 7.5);
      const y0 = P.y; P.y += 10.5;
      P.para(text, { x: P.M + 7, width: P.CW - 14, size: 9.6, color: theme.ink });
      P.y = y0 + h + 5;
    };
    /** Tarjetas numeradas para fortalezas y áreas de desarrollo. */
    P.rankCards = (items, label) => {
      items.forEach((it, i) => {
        const textH = P.measure(it.text, P.CW - 26, 9.8);
        const h = 16 + textH;
        P.ensure(h + 5);
        P.fill('#FFFFFF'); P.draw(theme.line); doc.setLineWidth(0.3); doc.roundedRect(P.M, P.y, P.CW, h, 2.5, 2.5, 'FD');
        P.fill(theme.primarySoft); doc.circle(P.M + 9, P.y + 9, 4.2, 'F');
        P.font(10, 'bold'); P.color(theme.primaryDark); doc.text(String(i + 1), P.M + 9, P.y + 10.4, { align: 'center' });
        P.font(12, 'bold'); P.color(theme.ink); doc.text(pdfSafe(it.name), P.M + 18, P.y + 10.2);
        P.font(9.5, 'bold'); P.color(theme.muted); doc.text(pdfSafe(`${it.score}/100 · ${it.level}`), P.M + P.CW - 5, P.y + 10.2, { align: 'right' });
        const y0 = P.y; P.y += 15;
        P.para(it.text, { x: P.M + 18, width: P.CW - 26, size: 9.8, color: theme.ink2 || '#344359' });
        P.y = y0 + h + 5;
      });
      if (label) P.para(label, { size: 8.5, color: theme.muted });
    };
    return P;
  }

  /* -------------------------------- Páginas -------------------------------- */
  function pageCover(P, record, cfg, logo) {
    const { doc, theme, M } = P;
    const c = record.candidate, r = record.result;
    P.fill(theme.navy); doc.rect(0, 0, P.W, 122, 'F');
    doc.setGState(new doc.GState({ opacity: 0.22 }));
    P.draw('#8FB2F5'); doc.setLineWidth(0.3);
    [18, 32, 46, 60, 74, 88].forEach((rad) => doc.circle(186, 30, rad, 'S')); // anillos dentro de la franja
    doc.setGState(new doc.GState({ opacity: 1 }));
    // Espacio para logotipo (configurable)
    if (logo) {
      const h = 13, w = Math.min(46, h * logo.ratio);
      P.fill('#FFFFFF'); doc.roundedRect(M - 2, 16, w + 4, h + 4, 2, 2, 'F');
      doc.addImage(logo.url, 'PNG', M, 18, w, h, undefined, 'FAST');
    } else {
      doc.setLineDashPattern([1.2, 1.2], 0); P.draw('#7F97C2'); doc.setLineWidth(0.35);
      doc.roundedRect(M, 16, 44, 15, 2, 2, 'S'); doc.setLineDashPattern([], 0);
      P.font(7.5, 'bold'); P.color('#AFC0DB'); doc.text(pdfSafe(`LOGO ${cfg.company.name.toUpperCase()}`), M + 22, 25, { align: 'center' });
    }
    if (record.demo) { P.fill('#1B1F27'); doc.roundedRect(P.W - M - 40, 17, 40, 9, 2, 2, 'F'); P.font(8, 'bold'); P.color('#FFD27A'); doc.text('DEMO MODE', P.W - M - 20, 22.8, { align: 'center' }); }
    P.font(27, 'bold'); P.color('#FFFFFF'); doc.text(pdfSafe(cfg.company.platformName), M, 66);
    P.font(15); P.color('#C9D6EE'); doc.text('Reporte de Evaluación Psicométrica', M, 78);
    P.font(10.5); P.color('#93A9D2'); doc.text(pdfSafe(cfg.company.subtitle), M, 87);
    P.fill(theme.primary); doc.rect(M, 97, 26, 1.3, 'F');
    P.font(8, 'bold'); P.color('#93A9D2'); doc.text('CONFIDENCIAL · USO EXCLUSIVO DE RECURSOS HUMANOS', M, 108, { charSpace: 0.3 });
    // Datos del candidato
    P.font(8.5, 'bold'); P.color(theme.muted); doc.text('CANDIDATO', M, 146, { charSpace: 0.4 });
    P.font(22, 'bold'); P.color(theme.ink); doc.text(pdfSafe(c.nombre), M, 157, { maxWidth: P.CW });
    const kv = [
      ['Puesto', c.puesto], ['Área / Departamento', c.area],
      ['Fecha de aplicación', longDate(record.finishedAt)], ['Assessment ID', record.id],
      ['Evaluador', c.evaluador], ['Perfil de referencia', r.profileLabel],
      ['Número de empleado', c.empleado || 'No aplica'], ['Tiempo utilizado', minSec(r.timing.durationSec)]
    ];
    kv.forEach(([k, v], i) => {
      const x = M + (i % 2) * (P.CW / 2), y = 172 + Math.floor(i / 2) * 15;
      P.font(7.6, 'bold'); P.color(theme.muted); doc.text(pdfSafe(k.toUpperCase()), x, y, { charSpace: 0.25 });
      P.font(11, 'bold'); P.color(theme.ink); doc.text(pdfSafe(v), x, y + 6, { maxWidth: P.CW / 2 - 6 });
    });
    P.fill('#F4F6FA'); doc.roundedRect(M, 238, P.CW, 30, 2.5, 2.5, 'F');
    P.y = 243;
    P.para(ZTA.TEXTS.complementary, { x: M + 6, width: P.CW - 12, size: 8.8, color: '#344359' });
    P.para(`Documento generado automáticamente el ${longDate(Date.now())}.`, { x: M + 6, width: P.CW - 12, size: 8, color: theme.muted });
  }

  function pageSummary(P, record, donutUrl) {
    const { doc, theme, M } = P;
    const r = record.result;
    P.newPage();
    P.section('01', 'Resumen Ejecutivo', 'Resultados principales de la evaluación');
    const gap = 5, w = (P.CW - 2 * gap) / 3, h = 36, y0 = P.y;
    const box = (x, label, value, sub, withDonut) => {
      P.fill('#F7F9FC'); P.draw(theme.line); doc.setLineWidth(0.3); doc.roundedRect(x, y0, w, h, 2.5, 2.5, 'FD');
      P.font(7.6, 'bold'); P.color(theme.muted); doc.text(pdfSafe(label.toUpperCase()), x + 5, y0 + 7.5, { charSpace: 0.2 });
      let vx = x + 5;
      if (withDonut && donutUrl) { doc.addImage(donutUrl, 'PNG', x + 4, y0 + 10.5, 22, 22, undefined, 'FAST'); vx = x + 30; }
      P.font(25, 'bold'); P.color(theme.ink); doc.text(String(value), vx, y0 + 24);
      const vw = doc.getTextWidth(String(value));
      P.font(10); P.color(theme.muted); doc.text('/ 100', vx + vw + 1.5, y0 + 24);
      P.font(8.8); doc.text(pdfSafe(sub), vx, y0 + 30.5, { maxWidth: w - (vx - x) - 4 });
    };
    box(M, 'Resultado global', r.global.score, r.global.level, true);
    box(M + w + gap, 'Compatibilidad', r.compatibility.score, `${r.compatibility.level} · ${r.profileLabel}`);
    box(M + 2 * (w + gap), 'Consistencia', r.consistency.score, r.consistency.level);
    P.y = y0 + h + 8;
    P.statusBox(`Resultado psicométrico: ${r.classification.label}`, r.classification.text, STATUS_COLORS[r.classification.code]);
    P.heading('Interpretación');
    P.para(r.profileText, { size: 10.5, lh: 1.5, gap: 5 });
    P.heading('Datos de la aplicación', 11);
    P.table(['Concepto', 'Valor'], [
      { cells: ['Preguntas respondidas', `${r.completion.answered} de ${r.completion.total}`] },
      { cells: ['Tiempo utilizado', `${minSec(r.timing.durationSec)} de ${Math.round(r.timing.limitSec / 60)} min`] },
      { cells: ['Tiempo agotado', r.timing.timedOut ? 'Sí' : 'No'] },
      { cells: ['Perfil de referencia', r.profileLabel] },
      { cells: ['Salidas de la ventana durante la aplicación', String(r.timing.blurCount || 0)] }
    ], [110, P.CW - 110], ['left', 'right']);
  }

  function pageRadar(P, record, cfg, radarUrl) {
    const { doc, theme } = P;
    P.newPage();
    P.section('02', 'Perfil de Competencias', 'Resultado 0–100 en las diez dimensiones evaluadas');
    if (radarUrl) { const w = 150, h = w * (720 / 900); doc.addImage(radarUrl, 'PNG', P.M + (P.CW - w) / 2, P.y, w, h, undefined, 'FAST'); P.y += h + 4; }
    P.heading('Cómo leer esta gráfica', 11);
    P.para('Cada eje representa una dimensión evaluada. Los puntos más alejados del centro indican un resultado más alto. Las etiquetas de nivel son exclusivamente descriptivas del resultado obtenido y no constituyen un diagnóstico.', { size: 9.6, color: '#344359', gap: 4 });
    const lv = cfg.levels.slice().sort((a, b) => b.min - a.min);
    P.table(['Nivel', 'Rango'], lv.map((l, i) => ({ cells: [l.label, `${l.min} – ${i === 0 ? 100 : lv[i - 1].min - 1}`] })), [110, P.CW - 110], ['left', 'right']);
    P.color(theme.muted);
  }

  function pageResults(P, record, barsUrl) {
    const { doc } = P;
    const r = record.result;
    P.newPage();
    P.section('03', 'Resultados por Dimensión', `Puntaje por batería y ponderación del perfil ${r.profileLabel}`);
    if (barsUrl) { const w = P.CW, h = w * (560 / 1000); doc.addImage(barsUrl, 'PNG', P.M, P.y, w, h, undefined, 'FAST'); P.y += h + 6; }
    P.table(['Competencia', 'Resultado', 'Nivel', 'Ponderación'],
      r.dimensions.map((d) => ({ cells: [d.name, String(d.score), d.level + (d.insufficient ? ' *' : ''), `${d.weight}%`] }))
        .concat([{ cells: ['Índice Global de Evaluación', String(r.global.score), r.global.level, '—'], bold: true }]),
      [80, 26, 40, P.CW - 146], ['left', 'right', 'left', 'right']);
    if (r.dimensions.some((d) => d.insufficient)) P.para('* Información insuficiente: menos de la mitad de las preguntas de la dimensión fueron respondidas.', { size: 8.5, color: P.theme.muted });
  }

  function pageStrengths(P, record) {
    P.newPage();
    P.section('04', 'Fortalezas', 'Top 5 dimensiones con mayor resultado');
    P.rankCards(record.result.strengths, 'Las fortalezas se identifican a partir de los resultados más altos del candidato en esta evaluación.');
  }
  function pageDevelopment(P, record) {
    P.newPage();
    P.section('05', 'Áreas de Desarrollo', 'Top 5 dimensiones con menor resultado y recomendación');
    P.rankCards(record.result.development, 'Las recomendaciones son orientativas y deben ajustarse al puesto y al plan de desarrollo de la organización.');
  }

  function pageInterview(P, record) {
    const { doc, theme } = P;
    const r = record.result;
    P.newPage();
    P.section('06', 'Aspectos a Validar Durante Entrevista', 'Temas a profundizar y preguntas conductuales sugeridas');
    r.interview.forEach((it, i) => {
      P.ensure(30);
      P.font(11.5, 'bold'); P.color(theme.ink); doc.text(pdfSafe(`${i + 1}. ${it.focus}`), P.M, P.y + 4);
      P.y += 7;
      P.para(it.reason, { size: 8.8, color: theme.muted, gap: 1.5 });
      P.bullets(it.questions.map((q) => `«${q}»`), { size: 9.8 });
      P.y += 3;
    });
    P.heading('Indicadores de respuesta', 11.5);
    r.indicators.forEach((ind) => {
      const [fg, bg] = SEV_COLORS[ind.severity] || SEV_COLORS.info;
      const h = Math.max(7, P.measure(ind.text, P.CW - 26, 9.2) + 2);
      P.ensure(h + 2);
      P.fill(bg); doc.roundedRect(P.M, P.y, 18, 5.4, 1.2, 1.2, 'F');
      P.font(6.8, 'bold'); P.color(fg); doc.text(ind.severity.toUpperCase(), P.M + 9, P.y + 3.8, { align: 'center' });
      const y0 = P.y; P.y += 0.2;
      P.para(ind.text, { x: P.M + 22, width: P.CW - 26, size: 9.2 });
      P.y = Math.max(P.y, y0 + h) + 1.5;
    });
    P.para('El índice de consistencia señala respuestas potencialmente contradictorias entre preguntas relacionadas. No detecta mentiras ni constituye un juicio sobre la honestidad del candidato.', { size: 8.5, color: theme.muted });
  }

  function pageConclusion(P, record) {
    const { doc, theme } = P;
    const r = record.result;
    P.newPage();
    P.section('07', 'Conclusión para Recursos Humanos', 'Resultado psicométrico, interpretación y recomendaciones');
    P.statusBox(r.classification.label, r.classification.text, STATUS_COLORS[r.classification.code]);
    P.heading('Interpretación', 11.5);
    P.para(r.profileText, { size: 10, lh: 1.5, gap: 4 });
    P.heading('Criterios evaluados', 11.5);
    P.bullets(r.classification.reasons);
    P.y += 2;
    P.heading('Recomendaciones', 11.5);
    P.bullets(r.recommendations);
    P.y += 4;
    const h = 8 + P.measure(ZTA.TEXTS.complementary, P.CW - 12, 9.4);
    P.ensure(h + 2);
    P.fill('#F4F6FA'); doc.roundedRect(P.M, P.y, P.CW, h, 2.5, 2.5, 'F');
    const y0 = P.y; P.y += 4;
    P.para(ZTA.TEXTS.complementary, { x: P.M + 6, width: P.CW - 12, size: 9.4, color: '#344359', style: 'bold' });
    P.y = y0 + h + 4;
  }

  function pageMethodology(P, record, cfg) {
    const { doc, theme } = P;
    P.newPage();
    P.section('08', 'Nota Metodológica', 'Alcance, método de cálculo y limitaciones');
    const h = 10 + P.measure(ZTA.TEXTS.methodology, P.CW - 14, 10);
    P.fill(theme.primarySoft); doc.roundedRect(P.M, P.y, P.CW, h, 2.5, 2.5, 'F');
    P.fill(theme.primary); doc.rect(P.M, P.y, 1.8, h, 'F');
    const y0 = P.y; P.y += 5;
    P.para(ZTA.TEXTS.methodology, { x: P.M + 7, width: P.CW - 14, size: 10, lh: 1.5 });
    P.y = y0 + h + 7;
    P.heading('Advertencia sobre la validez psicométrica', 11.5);
    P.para('El contenido de esta evaluación es un prototipo funcional. Antes de utilizarse como instrumento psicométrico formal para decisiones de selección, debe someterse a procesos apropiados de:', { size: 9.8, gap: 2 });
    P.bullets(ZTA.TEXTS.validationSteps);
    P.y += 2;
    P.heading('Método de cálculo', 11.5);
    P.bullets([
      'Cada dimensión produce un resultado de 0 a 100 a partir de preguntas ponderadas; las preguntas invertidas se recodifican antes del cálculo.',
      'Las preguntas situacionales y de integridad utilizan niveles de respuesta (de conducta de riesgo a conducta más efectiva), no una respuesta única.',
      'En razonamiento, atención y pensamiento crítico las preguntas sin respuesta se consideran incorrectas; en las demás dimensiones solo se promedian las respondidas.',
      'El Índice Global de Evaluación es el promedio ponderado de las diez dimensiones. La compatibilidad utiliza las ponderaciones del perfil de referencia y descuenta puntos cuando una dimensión crítica queda debajo del mínimo configurado.',
      'El índice de consistencia compara pares de preguntas relacionadas y patrones de respuesta. Señala respuestas potencialmente contradictorias; no detecta mentiras.',
      'Las ponderaciones, perfiles y umbrales son configurables y no han sido validados científicamente.'
    ], { size: 9.4 });
    P.y += 4;
    P.para(`${cfg.company.platformName} · Motor de scoring v${record.engineVersion || '1.0.0'} · Banco de preguntas v${record.bankVersion || '1.0.0'} · Reporte generado el ${longDate(Date.now())}.`, { size: 8, color: theme.muted });
  }

  /** Encabezado, pie, numeración y marca de agua DEMO en todas las páginas. */
  function decorate(P, record, cfg, logo) {
    const { doc, theme, M } = P;
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      if (record.demo) {
        doc.setGState(new doc.GState({ opacity: 0.07 }));
        P.font(64, 'bold'); P.color('#000000');
        doc.text('DEMO MODE', P.W / 2, P.H / 2 + 20, { align: 'center', angle: 35 });
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
      if (i > 1) {
        if (logo) { const h = 6, w = Math.min(26, h * logo.ratio); doc.addImage(logo.url, 'PNG', M, 9, w, h, undefined, 'FAST'); }
        else { P.font(8.5, 'bold'); P.color(theme.navy); doc.text(pdfSafe(cfg.company.platformName), M, 13.5); }
        P.font(8); P.color(theme.muted); doc.text('Reporte de Evaluación Psicométrica', P.W - M, 13.5, { align: 'right' });
        P.draw(theme.line); doc.setLineWidth(0.3); doc.line(M, 18, P.W - M, 18);
      }
      P.draw(theme.line); doc.setLineWidth(0.3); doc.line(M, 283, P.W - M, 283);
      P.font(7.4); P.color(theme.muted);
      doc.text(pdfSafe(`${record.id} · ${shortDate(record.finishedAt)} · Confidencial — uso exclusivo de Recursos Humanos${record.demo ? ' · DEMO MODE' : ''}`), M, 288);
      doc.text(`Página ${i} de ${total}`, P.W - M, 288, { align: 'right' });
    }
  }

  /**
   * Genera el reporte PDF completo.
   * @returns {Promise<jsPDF>} documento (usar .save(nombre) o .output('datauristring'))
   */
  async function buildPdf(record, config) {
    if (!global.jspdf || !global.jspdf.jsPDF) throw new Error('jsPDF no está disponible');
    const cfg = config || ZTA.DEFAULT_CONFIG;
    const theme = Object.assign({ ink2: '#344359' }, themeOf(cfg));
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* continuar */ } }
    const hasChart = !!global.Chart;
    const radarUrl = hasChart ? chartImage(radarConfig(record.result, theme, true), 900, 720) : null;
    const barsUrl = hasChart ? chartImage(barsConfig(record.result, theme, true), 1000, 560) : null;
    const donutUrl = hasChart ? chartImage(donutConfig(record.result.global.score, theme, true), 220, 220) : null;
    const logo = await rasterizeLogo(cfg.company.logoDataUrl);
    const doc = new global.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({
      title: pdfSafe(`Reporte de Evaluación Psicométrica — ${record.candidate.nombre}`), subject: 'Evaluación psicométrica',
      author: pdfSafe(cfg.company.platformName), creator: pdfSafe(cfg.company.platformName), keywords: record.id
    });
    const P = createCtx(doc, theme);
    pageCover(P, record, cfg, logo);
    pageSummary(P, record, donutUrl);
    pageRadar(P, record, cfg, radarUrl);
    pageResults(P, record, barsUrl);
    pageStrengths(P, record);
    pageDevelopment(P, record);
    pageInterview(P, record);
    pageConclusion(P, record);
    pageMethodology(P, record, cfg);
    decorate(P, record, cfg, logo);
    return doc;
  }

  ZTA.Report = { buildPdf, renderDashboardCharts, chartImage, radarConfig, barsConfig, donutConfig, pdfSafe };
})(typeof window !== 'undefined' ? window : globalThis);
