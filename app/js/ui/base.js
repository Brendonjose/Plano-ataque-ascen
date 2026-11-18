/* UI — utilitários: criação de elementos, ícones, modal, avisos, downloads e formatos. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};

  /** h('div.classe#id', {atributos}, ...filhos) */
  function h(sel, attrs, ...filhos) {
    const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) m[2].replace(/([.#])([\w-]+)/g, (_, t, n) => { if (t === '.') el.classList.add(n); else el.id = n; });
    if (attrs !== null && attrs !== undefined && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { filhos.unshift(attrs); attrs = null; }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className += ' ' + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    adicionar(el, filhos);
    return el;
  }
  function adicionar(el, filhos) {
    for (const f of filhos.flat(Infinity)) {
      if (f === null || f === undefined || f === false) continue;
      el.appendChild(f instanceof Node ? f : document.createTextNode(String(f)));
    }
  }
  const ICONES = {
    lancar: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    painel: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    macro: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    quadros: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/>',
    cronograma: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h4v4"/>',
    estrategia: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    ranking: '<path d="M8 21V11M12 21V5M16 21v-7"/><path d="M4 21h16"/>',
    pendencias: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    historico: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    desfazer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    baixar: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    subir: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    lua: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    lixo: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    multi: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M15 17l2 2 4-4"/>',
    imprimir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'
  };
  function icone(nome) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = ICONES[nome] || ''; s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function toast(msg, acao) {
    let box = document.querySelector('.toasts');
    if (!box) { box = h('div.toasts'); document.body.appendChild(box); }
    const t = h('div.toast', { role: 'status' }, msg, acao ? h('button', { onclick: () => { acao.fn(); t.remove(); } }, acao.rotulo) : null);
    box.appendChild(t);
    setTimeout(() => t.remove(), acao ? 6000 : 3200);
  }
  function modal(titulo, corpo, rodape, opts) {
    const fundo = h('div.fundo-modal', { onclick: e => { if (e.target === fundo) fechar(); } });
    const fechar = () => { fundo.remove(); document.removeEventListener('keydown', esc); if (opts && opts.aoFechar) opts.aoFechar(); };
    const esc = e => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', esc);
    const m = h('div.modal' + (opts && opts.largo ? '.largo' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': typeof titulo === 'string' ? titulo : '' },
      h('header', h('div', typeof titulo === 'string' ? h('h3', titulo) : titulo), h('button.x', { 'aria-label': 'Fechar', onclick: fechar }, '×')),
      h('div.corpo', corpo), rodape ? h('footer', rodape) : null);
    fundo.appendChild(m);
    document.body.appendChild(fundo);
    const foco = m.querySelector('.opcao, input, select, button.prim');
    if (foco) setTimeout(() => foco.focus(), 30);
    return { fechar, el: m };
  }
  function confirmar(titulo, texto, rotuloOk) {
    return new Promise(res => {
      const m = modal(titulo, h('p', texto), [
        h('button.btn', { onclick: () => { m.fechar(); res(false); } }, 'Cancelar'),
        h('button.btn.prim', { onclick: () => { m.fechar(); res(true); } }, rotuloOk || 'Confirmar')
      ]);
    });
  }
  function baixar(nome, conteudo, tipo) {
    const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function escolherArquivo(aceita) {
    return new Promise(res => {
      const i = h('input', { type: 'file', accept: aceita, style: { display: 'none' } });
      i.addEventListener('change', () => { res(i.files[0] || null); i.remove(); });
      document.body.appendChild(i); i.click();
    });
  }

  const fmt = {
    data: n => PA.datas.fmt(n),
    curta: n => PA.datas.fmtCurto(n),
    pct: (x, d) => (typeof x === 'number' ? (x * 100).toFixed(d === undefined ? 0 : d).replace('.', ',') + '%' : '—'),
    num: x => (typeof x === 'number' ? x.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : (x === null || x === undefined || x === '' ? '—' : String(x))),
    dias: x => (typeof x === 'number' ? (x > 0 ? '+' : '') + x : '—'),
    dataOu: (v, alt) => (typeof v === 'number' ? PA.datas.fmt(v) : (v === null || v === undefined || v === '' ? (alt || '—') : String(v)))
  };
  /** Classe visual do item (status + atraso). */
  function classeItem(it) {
    if (!it) return '';
    if (it.status === 'Concluído') return 'ok';
    if (it.status === 'Cancelado') return 'canc';
    if (it.status === 'Em andamento') return 'and' + (it.atrasado ? ' late' : '');
    if (it.status === 'Bloqueado') return 'blq' + (it.atrasado ? ' late' : '');
    return 'lib' + (it.atrasado ? ' late' : '');
  }
  function rotuloItem(it) {
    if (it.status === 'Não iniciado') return (it.detalhe === 'Liberado para execução' || it.detalhe === 'Piso pronto, sem rejunte') ? 'Liberado' : 'Não iniciado';
    return it.status;
  }
  function pillStatus(it) {
    const c = classeItem(it).split(' ')[0];
    return h('span.pill.' + c, rotuloItem(it) + (it.atrasado ? ' · atrasado' : ''));
  }
  function folgaEl(v) {
    if (typeof v !== 'number') return h('span.mudo', v === null || v === undefined || v === '' ? '—' : String(v));
    return h('span.' + (v < 0 ? 'neg' : 'pos'), (v > 0 ? '+' : '') + v + ' d');
  }
  function select(opcoes, valor, onchange, attrs) {
    return h('select', Object.assign({ onchange: e => onchange(e.target.value) }, attrs || {}),
      opcoes.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(v) === String(valor) }, t); }));
  }

  PA.ui = PA.ui || {};
  Object.assign(PA.ui, { h, icone, toast, modal, confirmar, baixar, escolherArquivo, fmt, classeItem, rotuloItem, pillStatus, folgaEl, select });
})(typeof globalThis !== 'undefined' ? globalThis : this);
