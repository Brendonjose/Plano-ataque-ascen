/* UI — gráficos (Chart.js) com a paleta validada (claro/escuro). */
(function (root) {
  'use strict';
  const PA = root.PA;
  const ativos = [];
  const PALETA = {
    claro: { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', bom: '#0ca30c', aviso: '#fab219', serio: '#ec835a', critico: '#d03b3b', neutro: '#9aa3b2', texto: '#4B5873', grade: 'rgba(16,24,40,.08)', fundo: '#FFFFFF' },
    escuro: { s1: '#3987e5', s2: '#d95926', s3: '#199e70', bom: '#0ca30c', aviso: '#fab219', serio: '#ec835a', critico: '#d03b3b', neutro: '#6b7790', texto: '#B3BED3', grade: 'rgba(255,255,255,.08)', fundo: '#172033' }
  };
  function cores() { return PALETA[document.documentElement.getAttribute('data-tema') === 'escuro' ? 'escuro' : 'claro']; }
  function limpar() { while (ativos.length) { try { ativos.pop().destroy(); } catch (e) { /* ignora */ } } }
  const pctFmt = v => (v * 100).toFixed(0) + '%';

  function criar(canvas, cfg) {
    if (typeof Chart === 'undefined') return null;
    const c = cores();
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = c.texto;
    const base = {
      responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      interaction: { mode: cfg.modo || 'index', intersect: false },
      plugins: { legend: { display: cfg.legenda !== false, position: 'top', align: 'start', labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } },
        tooltip: { callbacks: cfg.tooltip || {} } },
      scales: cfg.semEixos ? {} : {
        x: Object.assign({ grid: { display: !!cfg.horizontal, color: c.grade }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }, cfg.x || {}),
        y: Object.assign({ grid: { display: !cfg.horizontal, color: c.grade }, border: { display: false }, beginAtZero: true }, cfg.y || {})
      },
      indexAxis: cfg.horizontal ? 'y' : 'x'
    };
    const ch = new Chart(canvas, { type: cfg.tipo, data: cfg.data, options: Object.assign(base, cfg.options || {}) });
    ativos.push(ch);
    return ch;
  }
  const barra = (rotulo, dados, cor) => ({ label: rotulo, data: dados, backgroundColor: cor, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 26, borderColor: cores().fundo, borderWidth: { top: 0, bottom: 0, left: 0, right: 0 } });

  function status(canvas, serie) {
    const c = cores();
    const mapa = { 'Concluído': c.bom, 'Em andamento': c.aviso, 'Não iniciado': c.s1, 'Bloqueado': c.neutro, 'Atrasado': c.critico, 'Cancelado': '#c4cad4' };
    return criar(canvas, { tipo: 'bar', horizontal: true, legenda: false, modo: 'nearest',
      data: { labels: serie.map(s => s.rotulo), datasets: [Object.assign(barra('Itens', serie.map(s => s.qtde)), { backgroundColor: serie.map(s => mapa[s.rotulo]) })] } });
  }
  function pctBarras(canvas, rotulos, valores, titulo, horizontal) {
    const c = cores();
    const eixo = { max: 1, ticks: { callback: pctFmt } };
    return criar(canvas, { tipo: 'bar', horizontal, legenda: false, modo: 'nearest',
      x: horizontal ? eixo : {}, y: horizontal ? {} : eixo,
      tooltip: { label: ctx => ' ' + titulo + ': ' + pctFmt(ctx.parsed[horizontal ? 'x' : 'y']) },
      data: { labels: rotulos, datasets: [barra(titulo, valores, c.s1)] } });
  }
  function duasBarras(canvas, rotulos, a, b, ra, rb, ca, cb, pct, horizontal) {
    const eixo = pct ? { max: 1, ticks: { callback: pctFmt } } : { ticks: { precision: 0 } };
    return criar(canvas, { tipo: 'bar', horizontal,
      x: horizontal ? eixo : {}, y: horizontal ? {} : eixo,
      tooltip: pct ? { label: ctx => ' ' + ctx.dataset.label + ': ' + pctFmt(ctx.parsed[horizontal ? 'x' : 'y']) } : {},
      data: { labels: rotulos, datasets: [barra(ra, a, ca), barra(rb, b, cb)] } });
  }
  function evolucao(canvas, semanas, hoje) {
    const c = cores();
    const lab = semanas.map(s => PA.datas.fmtCurto(s.data));
    return criar(canvas, { tipo: 'line', y: { max: 1, ticks: { callback: pctFmt } },
      tooltip: { label: ctx => ' ' + ctx.dataset.label + ': ' + (ctx.parsed.y === null ? '—' : pctFmt(ctx.parsed.y)) },
      data: { labels: lab, datasets: [
        { label: '% previsto (plano)', data: semanas.map(s => s.previsto), borderColor: c.s1, backgroundColor: c.s1, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: .25 },
        { label: '% realizado (registrado)', data: semanas.map(s => s.realizado), borderColor: c.s2, backgroundColor: c.s2, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, spanGaps: false, tension: .25 }
      ] } });
  }
  PA.ui.graficos = { limpar, status, pctBarras, duasBarras, evolucao, cores };
})(typeof globalThis !== 'undefined' ? globalThis : this);
