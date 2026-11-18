/* Tela Histórico — curva semanal previsto × realizado, com registro em um clique. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, icone } = PA.ui;
  function render(el, ctx) {
    const H = ctx.resultado.historico;
    const atual = H.semanas.filter(s => s.data <= ctx.hoje).pop();
    const cv = h('canvas', { role: 'img', 'aria-label': 'Evolução semanal previsto × realizado' });
    const mudar = (sem, campo, v) => PA.ui.aplicar(PA.acoes.alterar(ctx.estado, 'Histórico semana ' + sem, e => {
      let r = e.historico.find(x => x.semana === sem);
      if (!r) { r = { semana: sem, data: H.semanas[sem - 1].data }; e.historico.push(r); }
      if (v === null || v === '') delete r[campo]; else r[campo] = v;
    }), { msg: 'Semana ' + sem + ' atualizada' });
    el.appendChild(h('div.pilha',
      h('div.linha', { style: { gap: '16px' } },
        h('div.kpi.teal', { style: { minWidth: '200px' } }, h('div.r', '% realizado hoje'), h('div.v', fmt.pct(H.pctHoje, 1)), h('div.s', H.concluidosHoje + ' de ' + H.itensValidos + ' itens válidos')),
        h('div.kpi', { style: { minWidth: '200px' } }, h('div.r', '% previsto na semana'), h('div.v', atual ? fmt.pct(atual.previsto, 1) : '—'), h('div.s', atual ? 'semana ' + atual.semana + ' · ' + fmt.data(atual.data) : 'antes da data-base')),
        h('div', h('button.btn.teal', { onclick: () => PA.ui.aplicar(PA.acoes.registrarSemana(ctx.estado, ctx.resultado), { msg: 'Semana registrada' }), disabled: !atual }, icone('check'), 'Registrar semana ' + (atual ? atual.semana : '')),
          h('div.mudo.peq', { style: { marginTop: '6px' } }, 'Grava o % de hoje na semana atual. Faça uma vez por semana (ex.: toda segunda).'))),
      h('div.grade-cartoes.g2',
        h('div.cartao', h('h2', 'Evolução semanal: previsto × realizado'), h('div.graf.alto', cv)),
        h('div.cartao', h('h2', 'Semanas', h('small', 'realizado e observação são editáveis')), h('div.tabela-wrap', { style: { maxHeight: '420px' } }, h('table.tab',
          h('thead', h('tr', ['Semana', 'Data', '% previsto', '% realizado', 'Concluídos', 'Observação'].map(t => h('th', t)))),
          h('tbody', H.semanas.map(s => h('tr' + (atual && s.semana === atual.semana ? '.destaque' : ''),
            h('td', s.semana), h('td', fmt.data(s.data)), h('td.num', fmt.pct(s.previsto, 1)),
            h('td', h('input', { type: 'number', step: '0.1', style: { width: '80px' }, value: typeof s.realizado === 'number' ? (s.realizado * 100).toFixed(1) : '', placeholder: '—',
              onchange: e => mudar(s.semana, 'realizado', e.target.value === '' ? null : Number(e.target.value) / 100) }), ' %'),
            h('td.num', fmt.num(s.concluidos)),
            h('td', h('input', { value: s.obs, style: { width: '220px' }, onchange: e => mudar(s.semana, 'obs', e.target.value.trim()) })))))))))));
    PA.ui.graficos.limpar();
    requestAnimationFrame(() => PA.ui.graficos.evolucao(cv, H.semanas, ctx.hoje));
  }
  PA.ui.registrarTela('historico', { titulo: 'Histórico semanal', menu: 'Histórico', icone: 'historico', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
