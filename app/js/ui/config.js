/* Tela Configurações e Dados — parâmetros, empreiteiras, feriados, importação/exportação e backup. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, icone, confirmar } = PA.ui;
  const M = PA.modelo;
  function mudar(ctx, rotulo, fn) { PA.ui.aplicar(PA.acoes.alterar(ctx.estado, rotulo, fn), { msg: rotulo }); }
  const txt = (v, fn, attrs) => h('input', Object.assign({ value: v === null || v === undefined ? '' : v, onchange: e => fn(e.target.value) }, attrs || {}));
  const num = (v, fn, attrs) => txt(v, s => { const n = Number(String(s).replace(',', '.')); if (s !== '' && isFinite(n)) fn(n); }, Object.assign({ type: 'number', step: 'any', style: { width: '100px' } }, attrs || {}));
  const data = (v, fn) => h('input', { type: 'date', value: typeof v === 'number' ? PA.datas.paraISO(v) : '', onchange: e => e.target.value && fn(PA.datas.deISO(e.target.value)) });

  function parametros(ctx) {
    const c = ctx.estado.config, P = c.pesos;
    const soma = Math.round((P.c1 + P.c2 + P.c3) * 1000) / 1000;
    return h('div.cartao', h('h2', 'Parâmetros'),
      h('div.grade-cartoes.g2', { style: { gap: '12px' } },
        h('label.campo', 'Torre', txt(c.torre, v => v.trim() && mudar(ctx, 'Nome da torre', e => { e.config.torre = v.trim(); }))),
        h('label.campo', 'Data-base do plano (início da linha de previsto)', data(c.dataBase, v => mudar(ctx, 'Data-base', e => { e.config.dataBase = v; }))),
        h('label.campo', 'Janela de alerta de vencimento (dias corridos)', num(c.janela, v => mudar(ctx, 'Janela de alerta', e => { e.config.janela = v; }))),
        h('label.campo', 'Atraso projetado que zera a nota de prazo (dias)', num(c.notaZeroDias, v => v > 0 && mudar(ctx, 'Nota zero do ranking', e => { e.config.notaZeroDias = v; })))),
      h('div.secao-titulo', { style: { marginTop: '16px' } }, 'Pesos do ranking', h('small', soma === 1 ? 'soma = 100% ✔' : h('span.neg', 'soma = ' + fmt.pct(soma) + ' — deve ser 100%'))),
      h('div.linha', ['c1', 'c2', 'c3'].map((k, i) => h('label.campo', ['C1 conclusão', 'C2 prazo atual', 'C3 prazo projetado'][i] + ' (%)',
        num(Math.round(P[k] * 1000) / 10, v => mudar(ctx, 'Peso ' + k.toUpperCase(), e => { e.config.pesos[k] = v / 100; }))))));
  }
  function empreiteiras(ctx) {
    const P = ctx.estado.piso.empreiteiras;
    return h('div.cartao', h('h2', 'Empreiteiras por serviço', h('small', 'maiúsculas/minúsculas não diferenciam (como no Excel)')),
      h('div.tabela-wrap', h('table.tab', h('tbody',
        h('tr', h('td', h('b', 'Piso e rejunte — código 1')), h('td', txt(P.ds, v => v.trim() && mudar(ctx, 'Empreiteira do piso (1)', e => { e.piso.empreiteiras.ds = v.trim(); })))),
        h('tr', h('td', h('b', 'Piso e rejunte — código 2')), h('td', txt(P.jun, v => v.trim() && mudar(ctx, 'Empreiteira do piso (2)', e => { e.piso.empreiteiras.jun = v.trim(); })))),
        M.SERVICOS.filter(s => s.ordem >= 3).map(s => h('tr', h('td', h('b', s.nome)),
          h('td', txt(ctx.estado.cronograma.servicos[s.id].empreiteira, v => mudar(ctx, 'Empreiteira de ' + s.nome, e => { e.cronograma.servicos[s.id].empreiteira = v.trim(); })))))))));
  }
  function feriados(ctx) {
    const lista = ctx.estado.feriados.slice().sort((a, b) => a - b);
    const novo = h('input', { type: 'date' });
    return h('div.cartao', h('h2', 'Feriados', h('small', 'não contam como dia útil nas projeções')),
      h('div.linha', { style: { marginBottom: '10px' } }, novo, h('button.btn.peq', { onclick: () => {
        if (!novo.value) return; const d = PA.datas.deISO(novo.value);
        if (!lista.includes(d)) mudar(ctx, 'Feriado ' + fmt.data(d) + ' incluído', e => { e.feriados.push(d); });
      } }, icone('mais'), 'Incluir')),
      h('div.linha', { style: { gap: '6px' } }, lista.map(d => h('span.pill.lib', fmt.data(d), h('button', { style: { border: 0, background: 'transparent', padding: '0 0 0 4px', cursor: 'pointer' }, title: 'Remover', 'aria-label': 'Remover ' + fmt.data(d),
        onclick: () => mudar(ctx, 'Feriado ' + fmt.data(d) + ' removido', e => { e.feriados = e.feriados.filter(x => x !== d); }) }, '×')))),
      h('p.mudo.peq', { style: { marginTop: '10px' } }, 'Dica: inclua aqui o recesso de fim de ano, se a obra parar.'));
  }
  function dados(ctx) {
    const m = ctx.estado.meta;
    const conf = h('input', { type: 'date', value: ctx.conferencia ? PA.datas.paraISO(ctx.conferencia) : '' });
    return h('div.cartao', h('h2', 'Dados'),
      h('p.mudo.peq', `Os dados ficam guardados neste navegador, neste computador. Último backup: ${m.ultimoBackup ? fmt.data(m.ultimoBackup) : 'nunca'}. Origem: ${m.origem || '—'}.`),
      h('div.linha', { style: { gap: '8px' } },
        h('button.btn.prim', { onclick: PA.ui.salvarBackup }, icone('baixar'), 'Salvar backup (.json)'),
        h('button.btn', { onclick: PA.ui.exportarExcel }, icone('baixar'), 'Exportar para Excel (.xlsx)'),
        h('button.btn', { onclick: PA.ui.restaurarBackup }, icone('subir'), 'Restaurar backup'),
        h('button.btn', { onclick: PA.ui.importarPlanilha }, icone('subir'), 'Importar planilha')),
      h('div.secao-titulo', { style: { marginTop: '18px' } }, 'Data de conferência', h('small', 'calcula como se hoje fosse outra data; vale só nesta aba do navegador')),
      h('div.linha', conf, h('button.btn.peq', { onclick: () => conf.value && PA.ui.definirConferencia(PA.datas.deISO(conf.value)) }, 'Usar esta data'),
        ctx.conferencia ? h('button.btn.peq', { onclick: () => PA.ui.definirConferencia(null) }, 'Voltar para hoje') : null),
      h('div.secao-titulo', { style: { marginTop: '18px' } }, 'Apagar dados'),
      h('button.btn.peq', { style: { color: 'var(--late)', borderColor: 'var(--late)' }, onclick: async () => {
        if (!(await confirmar('Apagar todos os dados deste navegador?', 'Baixe um backup antes. Esta ação não pode ser desfeita.', 'Apagar'))) return;
        ctx.armazenamento.limpar(); ctx.estado = null; PA.ui.desenhar();
      } }, icone('lixo'), 'Apagar dados deste navegador'),
      h('p.mudo.peq', { style: { marginTop: '14px' } }, `Cálculo completo em ${Math.round(ctx.ultimoCalculoMs || 0)} ms. Para vários usuários no futuro, o armazenamento (js/armazenamento.js) pode ser trocado por um servidor sem mudar as telas.`));
  }
  function render(el, ctx) {
    el.appendChild(h('div.pilha', h('div.grade-cartoes.g2', dados(ctx), parametros(ctx)), h('div.grade-cartoes.g2', empreiteiras(ctx), feriados(ctx))));
  }
  PA.ui.registrarTela('config', { titulo: 'Configurações e dados', menu: 'Config.', icone: 'config', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
