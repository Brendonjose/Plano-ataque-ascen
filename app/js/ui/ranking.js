/* Tela Ranking — desempenho das empreiteiras com critérios e pesos explícitos. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt } = PA.ui;
  function nota(v) {
    if (v === 'n/a') return h('span.mudo', 'n/a');
    const cls = v >= 0.8 ? 'ok' : (v >= 0.5 ? 'and' : 'late');
    return h('span.pill.' + cls, fmt.pct(v));
  }
  function render(el, ctx) {
    const R = ctx.resultado.ranking, P = ctx.estado.config.pesos;
    const cv = h('canvas', { role: 'img', 'aria-label': 'Pontuação por empreiteira' });
    el.appendChild(h('div.pilha',
      h('div.cartao', h('h2', 'Critérios e pesos', h('small', 'pesos editáveis em Configurações')),
        h('div.tabela-wrap', h('table.tab', h('tbody',
          h('tr', h('td', h('b', 'C1 — Conclusão das frentes liberadas')), h('td', 'Concluídos ÷ (Total − Cancelados − Bloqueados)'), h('td.num', fmt.pct(P.c1))),
          h('tr', h('td', h('b', 'C2 — Cumprimento de prazo atual')), h('td', '1 − (vencidos não concluídos + concluídos fora do prazo) ÷ (Total − Cancelados)'), h('td.num', fmt.pct(P.c2))),
          h('tr', h('td', h('b', 'C3 — Prazo projetado')), h('td', `pior folga projetada: folga ≥ 0 → 100%; atraso ≥ ${ctx.estado.config.notaZeroDias} dias → 0%`), h('td.num', fmt.pct(P.c3))))))),
      h('div.grade-cartoes.g2',
        h('div.cartao', h('h2', 'Ranking (melhor → pior)'), h('div.tabela-wrap', h('table.tab',
          h('thead', h('tr', ['#', 'Empreiteira', 'Serviços', 'Itens', 'Concl.', 'Bloq.', 'Vencidos', 'Folga proj.', 'C1', 'C2', 'C3', 'Pontuação'].map(t => h('th', t)))),
          h('tbody', R.ordenado.map(t => h('tr', h('td', h('b', t.posicao + 'º')), h('td', h('b', t.empreiteira)), h('td', t.servicos), h('td', t.total), h('td', t.concluidos), h('td', t.bloqueados), h('td', t.vencidos),
            h('td', PA.ui.folgaEl(t.folga)), h('td', nota(t.c1)), h('td', nota(t.c2)), h('td', nota(t.c3)), h('td', nota(t.pontuacao)))))))),
        h('div.cartao', h('h2', 'Pontuação de desempenho'), h('div.graf.alto', cv))),
      h('p.mudo.peq', 'Verde ≥ 80% · Amarelo 50–79% · Vermelho < 50%. Produtividade real não entra na nota (ainda não há medição em campo).')));
    PA.ui.graficos.limpar();
    requestAnimationFrame(() => PA.ui.graficos.pctBarras(cv, R.ordenado.map(t => t.empreiteira.trim()), R.ordenado.map(t => t.pontuacao), 'Pontuação', true));
  }
  PA.ui.registrarTela('ranking', { titulo: 'Ranking das empreiteiras', menu: 'Ranking', icone: 'ranking', perfis: ['admin', 'obra', 'diretoria'], render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
