/* Tela Entregas — vistorias do cliente: aprovados de primeira, reprovas e próximas vistorias. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, select } = PA.ui;
  function render(el, ctx) {
    const f = ctx.ui.filtroEnt || {};
    const P = PA.motor.entregas(ctx.estado, ctx.resultado, f);
    PA.ui.carregarUsuarios(ctx).then(() => {});
    const k = (cls, r, v, s) => h('div.kpi.' + cls, h('div.r', r), h('div.v', v), h('div.s', s || ''));
    el.appendChild(h('div.linha', { style: { marginBottom: '14px' } }, h('label.campo', 'Prumada', select([['', '(Todas)'], 'Final 1', 'Final 2', 'Final 3', 'Final 4', 'Finais 1-2', 'Finais 3-4'], f.prumada || '', v => { ctx.ui.filtroEnt = { prumada: v || null }; PA.ui.desenhar(); }))));
    el.appendChild(h('div.kpis',
      k('ok', 'Entregues', P.entregues, 'de ' + P.noEscopo + ' no escopo'), k('ok', 'Aprovados de primeira', P.dePrimeira, P.pctPrimeira === null ? '—' : fmt.pct(P.pctPrimeira) + ' das aprovações'),
      k('and', 'Aprovados após reprova', P.aposReprova), k('late', 'Reprovados aguardando', P.reprovadosAguardando, 'nova vistoria marcada'),
      k('teal', 'Vistorias agendadas', P.agendadas), k('late', 'Vistorias atrasadas', P.atrasadas.length, 'data já passou'),
      k('navy', 'Média de vistorias', P.mediaVistorias === null ? '—' : P.mediaVistorias.toFixed(1).replace('.', ','), 'por apto aprovado'), k('blq', 'Entregues sem registro', P.semRegistro, 'antes da v3')));
    const lista = (titulo, itens, vazio) => h('div.cartao', h('h2', titulo), itens.length ? h('div.tabela-wrap', h('table.tab',
      h('thead', h('tr', ['Data', 'Apto', 'Vistoria', 'Situação', 'Acompanha'].map(t => h('th', t)))),
      h('tbody', itens.map(x => h('tr', { style: { cursor: 'pointer' }, onclick: () => PA.ui.abrirVistoria(ctx, x.apto) }, h('td', h('b', fmt.data(x.data))), h('td', x.apto), h('td', x.numero + 'ª'),
        h('td', h('span.pill.' + (x.reprovado ? 'late' : 'lib'), x.reprovado ? 'Reapresentação após reprova' : 'Agendada')), h('td', PA.ui.nomeAcomp(ctx, x.acompanhadoPor)))))))
      : h('p.mudo', vazio));
    const pp = [1, 2, 3, 4].map(n => Object.assign({ final: n }, P.porPrumada[n] || {}));
    el.appendChild(h('div.grade-cartoes.g2', { style: { marginTop: '14px' } },
      h('div.pilha', lista('Atrasadas (data já passou)', P.atrasadas, 'Nenhuma vistoria atrasada.'), lista('Próximos 7 dias', P.proximas, 'Nenhuma vistoria nos próximos 7 dias.'), P.futuras.length ? lista('Mais adiante', P.futuras, '') : null),
      h('div.cartao', h('h2', 'Por prumada'), h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', ['Prumada', 'No escopo', 'Entregues', 'De primeira', 'Após reprova', 'Reprovados', 'Agendadas'].map((t, i) => h('th' + (i ? '.num' : ''), t)))),
        h('tbody', pp.map(x => h('tr', h('td', h('b', 'Final ' + x.final)), ['noEscopo', 'entregues', 'dePrimeira', 'aposReprova', 'reprovadosAguardando', 'agendadas'].map(c => h('td.num', x[c] || 0)))))))),
        h('p.mudo.peq', { style: { marginTop: '10px' } }, 'Para registrar uma vistoria, abra a Torre no modo Entrega ou o serviço Entrega na tela Lançar e toque no apto.')));
  }
  PA.ui.registrarTela('entregas', { titulo: 'Entregas · vistoria do cliente', menu: 'Entregas', icone: 'check', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
