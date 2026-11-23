/* Tela Estratégia — vendidos (V/N), escopo por serviço e resultado do cenário. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, folgaEl, select } = PA.ui;
  const M = PA.modelo;
  function mudar(ctx, rotulo, fn) { PA.ui.aplicar(PA.acoes.alterar(ctx.estado, rotulo, fn), { msg: rotulo }); }

  let render = function (el, ctx) {
    const E = ctx.estado.estrategia, R = ctx.resultado.estrategia;
    const g = h('div.grade-aptos', { style: { maxWidth: '520px' } }, h('div.cab', 'Pav.'), [1, 2, 3, 4].map(f => h('div.cab', 'Final ' + f)));
    for (let pav = 27; pav >= 1; pav--) {
      g.appendChild(h('div.pav', pav + 'º'));
      for (let f = 1; f <= 4; f++) {
        if (pav > 20 && f > 2) { g.appendChild(h('div.vazio-celula')); continue; }
        const a = pav * 10 + f, v = E.vendido[a] === 'V';
        g.appendChild(h('button.celula.' + (v ? 'ok' : 'blq'), { 'data-apto': a, title: v ? 'Vendido — clique para marcar como não vendido' : 'Não vendido — clique para marcar como vendido',
          disabled: !PA.ui.pode('parametros'),
          onclick: () => mudar(ctx, `Apto ${a}: ${v ? 'não vendido' : 'vendido'}`, e => { e.estrategia.vendido[a] = v ? 'N' : 'V'; }) },
          String(a), h('small', v ? 'V' : ((E.rotulo || {})[a] || 'N'))));
      }
    }
    const tabela = h('div.tabela-wrap', h('table.tab',
      h('thead', h('tr', ['Serviço', 'Escopo', 'Segue prioridade de prumada?', 'Escopo aplicado', 'Aptos no escopo', 'Pendentes', 'Término projetado', 'Pior folga'].map((t, i) => h('th' + (i >= 4 && i !== 6 ? '.num' : ''), t)))),
      h('tbody', R.servicos.map(s => {
        const id = M.POR_ORDEM[s.ordem].id;
        return h('tr', h('td', h('b', s.servico)),
          h('td', select(['Todos', 'Vendidos'], s.escopo, v => mudar(ctx, `${s.servico}: escopo ${v}`, e => { e.estrategia.escopo[id] = v; }))),
          h('td', select(['Sim', 'Não'], s.segue, v => mudar(ctx, `${s.servico}: segue prioridade = ${v}`, e => { e.estrategia.segueprioridade[id] = v; }))),
          h('td', h('span.pill.' + (s.aplicado === 'Vendidos' ? 'and' : 'lib'), s.aplicado)), h('td.num', s.aptosEscopo), h('td.num', s.pendentes), h('td', fmt.dataOu(s.termino)), h('td.num', folgaEl(s.piorFolga)));
      }))));
    const cenario = h('div.tabela-wrap', h('table.tab',
      h('thead', h('tr', ['Prumada', 'Meta', 'Término projetado', 'Folga', 'Situação', 'Aptos no escopo', 'Maior gerador'].map(t => h('th', t)))),
      h('tbody', R.cenario.map(p => h('tr' + (p.final ? '' : '.destaque'), h('td', p.final ? 'Final ' + p.final : 'Obra completa (macro)'), h('td', fmt.data(p.meta)),
        h('td', fmt.dataOu(p.termino, 'concluída')), h('td', folgaEl(p.folga)), h('td', h('span.pill.' + (p.situacao === 'Atrasada' ? 'late' : 'ok'), p.situacao)), h('td', p.aptosEscopo), h('td', p.gerador))))));
    el.appendChild(h('div.lancar-layout', { style: { gridTemplateColumns: 'minmax(0,1fr) minmax(0,560px)' } },
      h('div.pilha',
        h('div.cartao', h('h2', 'Estratégia por serviço', h('small', '"Vendidos" vale também para todos os serviços seguintes')), tabela),
        h('div.cartao', h('h2', 'Resultado do cenário'), cenario),
        h('div.cartao', h('h2', 'Como simular'), h('ol.peq', { style: { margin: 0, paddingLeft: '18px', lineHeight: 1.7 } },
          h('li', 'Marque N nos apartamentos não vendidos (clique no apto ao lado).'),
          h('li', 'Na coluna Escopo, escolha "Vendidos" no primeiro serviço que deve atender só os vendidos.'),
          h('li', 'Para ver a obra inteira de novo, volte para "Todos".'),
          h('li', 'O apto fora do escopo vira "cancelado" automaticamente; um valor lançado (concluído/andamento) sempre vale mais.')))),
      h('div.cartao', h('h2', 'Apartamentos vendidos', h('small', `${R.vendidos} vendidos · ${R.naoVendidos} não vendidos · ${R.total} aptos`)), g,
        h('div.legenda', { style: { marginTop: '12px' } }, h('span', h('i', { style: { background: 'var(--ok)' } }), 'Vendido (V)'), h('span', h('i', { style: { background: 'var(--blq-bg)' } }), 'Não vendido (N)')))));
  }
  const renderOriginal = render;
  render = function (el, ctx) { renderOriginal(el, ctx); if (!PA.ui.pode('parametros')) el.querySelectorAll('select').forEach(s => { s.disabled = true; }); };
  PA.ui.registrarTela('estrategia', { titulo: 'Estratégia de ataque', menu: 'Estratégia', icone: 'estrategia', perfis: ['admin', 'obra', 'diretoria'], render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
