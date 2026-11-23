/* Tela Painel — equivalente ao DASHBOARD EXECUTIVO (8 filtros, 8 KPIs, prazos, risco, 7 gráficos, críticos). */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, folgaEl, select } = PA.ui;
  const M = PA.modelo;
  const STATUS = ['Concluído', 'Em andamento', 'Não iniciado', 'Bloqueado', 'Cancelado', 'Atrasado', 'Vencimento próximo'];

  function lerFiltros() { try { return JSON.parse(sessionStorage.getItem('pa.filtros') || '{}'); } catch (e) { return {}; } }
  function gravarFiltros(f) { try { sessionStorage.setItem('pa.filtros', JSON.stringify(f)); } catch (e) { /* ignora */ } }

  function filtros(ctx, f) {
    const set = (k, v) => { const n = Object.assign({}, f); if (v === '' || v === null) delete n[k]; else n[k] = v; gravarFiltros(n); PA.ui.desenhar(); };
    const { unicas } = PA.motor.empreiteiras(ctx.estado, ctx.resultado.cron);
    const campo = (rot, el) => h('label.campo', rot, el);
    const pavs = []; for (let p = 27; p >= 1; p--) pavs.push([p, p + 'º']);
    const data = k => h('input', { type: 'date', value: typeof f[k] === 'number' ? PA.datas.paraISO(f[k]) : '', onchange: e => set(k, e.target.value ? PA.datas.deISO(e.target.value) : null) });
    const ativos = Object.keys(f).length;
    return h('div.cartao', { style: { padding: '12px 16px' } },
      h('div.linha', { style: { alignItems: 'flex-end', gap: '12px' } },
        campo('Empreiteira', select([['', '(Todas)'], ['A definir', 'A definir'], ...unicas.map(u => [u, u])], f.empreiteira || '', v => set('empreiteira', v))),
        campo('Torre', select([['', '(Todas)'], [ctx.estado.config.torre, ctx.estado.config.torre]], f.torre || '', v => set('torre', v))),
        campo('Pavimento', select([['', '(Todos)'], ...pavs], f.pavimento || '', v => set('pavimento', v ? Number(v) : null))),
        campo('Serviço', select([['', '(Todos)'], ...M.SERVICOS.map(s => [s.nome, s.nome])], f.servico || '', v => set('servico', v))),
        campo('Status', select([['', '(Todos)'], ...STATUS.map(s => [s, s])], f.status || '', v => set('status', v))),
        campo('Data-limite de', data('de')), campo('até', data('ate')),
        campo('Prumada', select([['', '(Todas)'], 'Final 1', 'Final 2', 'Final 3', 'Final 4', 'Finais 1-2', 'Finais 3-4'], f.prumada || '', v => set('prumada', v))),
        ativos ? h('button.btn.peq', { onclick: () => { gravarFiltros({}); PA.ui.desenhar(); } }, 'Limpar filtros (' + ativos + ')') : null));
  }

  function kpis(p) {
    const k = p.kpis, t = k.total || 1;
    const c = (cls, r, v, s) => h('div.kpi.' + cls, h('div.r', r), h('div.v', v), h('div.s', s));
    return h('div.kpis',
      c('navy', 'Total de itens', k.total, 'serviço × apto'), c('ok', 'Concluídos', k.concluidos, fmt.pct(k.concluidos / t) + ' do total'),
      c('and', 'Em andamento', k.andamento, fmt.pct(k.andamento / t) + ' do total'), c('navy', 'Não iniciados', k.naoIniciados, fmt.pct(k.naoIniciados / t) + ' do total'),
      c('late', 'Atrasados', k.atrasados, 'data-limite vencida'), c('blq', 'Bloqueados', k.bloqueados, 'aguardando serviço anterior'),
      c('teal', '% conclusão', fmt.pct(k.pct, 1), 'excluídos cancelados'), c('and', 'Vencimento próximo', k.vencendo, 'em até ' + PA.ui.ctx.estado.config.janela + ' dias'));
  }
  function situacaoPill(s) {
    const cls = { 'Atrasada': 'late', 'Risco de atraso': 'late', 'No prazo': 'ok', 'Concluída': 'ok', 'Concluído': 'ok', 'Atenção': 'and', 'Sem projeção': 'blq' }[s] || 'blq';
    return h('span.pill.' + cls, s);
  }
  function tabelaPrumadas(p) {
    return h('div.cartao', h('h2', 'Prazos por prumada e data macro', h('small', 'término projetado com as equipes de hoje · não responde aos filtros')),
      h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', ['Prumada', 'Prioridade', 'Meta', 'Término projetado', 'Folga', 'Situação', 'Maior gerador de atraso', 'Aptos', 'Entregues', '% concluído'].map((t, i) => h('th' + (i >= 7 || i === 4 ? '.num' : ''), t)))),
        h('tbody', p.prumadas.map(x => h('tr' + (x.final === null ? '.destaque' : ''),
          h('td', x.final === null ? 'Obra completa (macro)' : 'Final ' + x.final), h('td', x.prioridade || '—'), h('td', fmt.data(x.meta)),
          h('td', fmt.dataOu(x.termino, 'concluída')), h('td.num', folgaEl(x.folga)), h('td', situacaoPill(x.situacao)), h('td', x.gerador),
          h('td.num', x.aptosEscopo), h('td.num', x.entregues), h('td.num', fmt.pct(x.pct, 1))))))));
  }
  function tabelaRisco(p) {
    return h('div.cartao', h('h2', 'Risco de prazo e mão de obra por serviço', h('small', 'pendentes e % respondem aos filtros')),
      h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', ['Serviço', 'Empreiteira', 'Limite F3-4', 'Limite obra', 'Término proj.', 'Pior folga', 'Situação', 'Equipe atual', 'Necessária', 'Pendentes', '% concl.', 'Leitura'].map((t, i) => h('th' + ([5, 7, 8, 9, 10].includes(i) ? '.num' : ''), t)))),
        h('tbody', p.risco.map(x => h('tr',
          h('td', h('b', x.servico)), h('td', x.empreiteira), h('td', fmt.data(x.limiteF34)), h('td', fmt.data(x.limiteObra)), h('td', fmt.dataOu(x.termino)),
          h('td.num', folgaEl(x.piorFolga)), h('td', situacaoPill(x.situacao)), h('td.num', fmt.num(x.equipe)),
          h('td.num', typeof x.necessaria === 'number' && x.necessaria > x.equipe ? h('b.neg', x.necessaria) : fmt.num(x.necessaria)),
          h('td.num', x.pendentes), h('td.num', fmt.pct(x.pct)), h('td.peq', x.leitura)))))));
  }
  function tabelaCriticos(p) {
    if (!p.criticos.length) return h('div.cartao', h('h2', 'Serviços críticos'), h('p.mudo', 'Nenhum item atrasado ou com vencimento próximo para os filtros escolhidos.'));
    return h('div.cartao', h('h2', 'Serviços críticos', h('small', `mostrando ${p.criticos.length} de ${p.totalCriticos} · atrasados primeiro, depois os que vencem antes`)),
      h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', ['#', 'Serviço', 'Empreiteira', 'Local', 'Data-limite', 'Situação', 'Dias atraso', 'Dias p/ vencer', 'Observação / motivo'].map((t, i) => h('th' + ([6, 7].includes(i) ? '.num' : ''), t)))),
        h('tbody', p.criticos.map(x => h('tr', { style: { cursor: 'pointer' }, title: 'Abrir lançamento', onclick: () => PA.ui.abrirLancamento(PA.ui.ctx, M.SERVICOS.find(s => s.nome === x.servico).id, [x.apto]) },
          h('td', x.prioridade), h('td', h('b', x.servico)), h('td', x.empreiteira), h('td', x.local), h('td', fmt.data(x.limite)),
          h('td', h('span.pill.' + (x.situacao.startsWith('ATRASADO') ? 'late' : 'and'), x.situacao)), h('td.num', x.diasAtraso), h('td.num', fmt.num(x.diasVencer)), h('td.peq', x.obs)))))));
  }
  function blocoPendencias(ctx, f) {
    const p = PA.motor.pendenciasPainel(ctx.resultado, { prumada: f.prumada, pavimento: f.pavimento });
    const k = (cls, r, v) => h('div.kpi.' + cls, h('div.r', r), h('div.v', v));
    return h('div.cartao.bloco-pendencias', h('h2', 'Pendências por apartamento', h('small', 'responde aos filtros de prumada e pavimento · ', h('a', { href: '#pendencias' }, 'ver todas'))),
      h('div.grade-cartoes', { style: { gridTemplateColumns: 'repeat(3, minmax(0, 160px)) minmax(0, 1fr)', alignItems: 'start' } },
        k('and', 'Abertas', p.abertas), k('late', 'Atrasadas', p.atrasadas), k('ok', 'Resolvidas', p.resolvidas),
        h('div.peq', h('b', 'Abertas por prumada: '), [1, 2, 3, 4].map(n => 'F' + n + ' ' + (p.porPrumada[n] || 0)).join(' · '), h('br'),
          h('b', 'Por responsável: '), p.porResponsavel.map(r => r.responsavel + ' ' + r.abertas + (r.atrasadas ? ' (' + r.atrasadas + ' atras.)' : '')).join(' · ') || '—')),
      p.aptos.length ? h('div.tabela-wrap', { style: { marginTop: '12px', maxHeight: '320px' } }, h('table.tab',
        h('thead', h('tr', ['Apto', 'Pendências', 'Etapas', 'Prazo mais próximo'].map(t => h('th', t)))),
        h('tbody', p.aptos.map(a => h('tr', h('td', h('b', a.apto)), h('td', a.qtd + (a.atrasadas ? ' · ' : ''), a.atrasadas ? h('span.neg', a.atrasadas + ' atrasada(s)') : null),
          h('td', a.etapas.join(', ')), h('td', fmt.dataOu(a.prazoMaisProximo)))))))
        : h('p.mudo', { style: { marginTop: '10px' } }, 'Nenhuma pendência aberta neste recorte.'));
  }
  function cartaoGrafico(titulo, sub, alto) {
    const cv = h('canvas', { role: 'img', 'aria-label': titulo });
    return { el: h('div.cartao', h('h2', titulo, sub ? h('small', sub) : null), h('div.graf' + (alto ? '.alto' : ''), cv)), cv };
  }

  function render(el, ctx) {
    const f = lerFiltros();
    const p = PA.motor.painel(ctx.estado, ctx.resultado, f);
    PA.ui.graficos.limpar();
    const esc = ctx.resultado.estrategia;
    el.appendChild(h('p.mudo.peq', { style: { margin: '0 0 12px' } },
      `Itens = serviço × apartamento (94 aptos × 12 serviços) · Meta da obra ${fmt.data(ctx.estado.cronograma.metaMacro)} · Meta Finais 3 e 4 ${fmt.data(PA.motor.metaDe(ctx.estado, 3))} · Escopo: ` +
      (esc.servicosComVendidos ? `só vendidos em ${esc.servicosComVendidos} de 12 serviços (${esc.vendidos} vendidos)` : 'todos os aptos')));
    el.appendChild(filtros(ctx, f));
    el.appendChild(h('div', { style: { height: '14px' } }));
    el.appendChild(kpis(p));
    el.appendChild(h('p.peq', { style: { margin: '10px 0 16px', color: p.alertas ? 'var(--and)' : 'var(--ok)' } },
      p.alertas ? `⚠ ${p.alertas} item(ns) com alerta de dados (empreiteira a definir, código não reconhecido, atraso sem justificativa…).` : '✔ Sem alertas de dados nos itens filtrados.'));
    const g = p.graficos, cores = PA.ui.graficos.cores();
    const gStatus = cartaoGrafico('Status dos itens', 'atrasado sobrepõe os demais');
    const gEmp = cartaoGrafico('% conclusão por empreiteira');
    const gAV = cartaoGrafico('Atrasados × vencendo por empreiteira');
    const gEvo = cartaoGrafico('Evolução semanal: previsto × realizado', 'curva global; realizado = semanas registradas no Histórico', true);
    const gServ = cartaoGrafico('Previsto hoje × realizado por serviço', null, true);
    const gLoc = cartaoGrafico('Torre e prumadas', '% concluído');
    const gPav = cartaoGrafico('% conclusão por pavimento');
    el.appendChild(h('div.pilha',
      h('div.grade-cartoes.g2', { style: { gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)' } }, tabelaPrumadas(p), h('div.grade-cartoes', gStatus.el)),
      tabelaRisco(p),
      blocoPendencias(ctx, f),
      h('div.grade-cartoes.g2', gEvo.el, gServ.el),
      h('div.grade-cartoes.g3', gEmp.el, gAV.el, gLoc.el),
      gPav.el,
      tabelaCriticos(p)));
    const empComItens = g.empreiteiras.filter(e => e.total > 0);
    requestAnimationFrame(() => {
      const G = PA.ui.graficos;
      G.status(gStatus.cv, g.status);
      G.pctBarras(gEmp.cv, empComItens.map(e => e.empreiteira.trim()), empComItens.map(e => e.pct), '% conclusão', true);
      G.duasBarras(gAV.cv, empComItens.map(e => e.empreiteira.trim()), empComItens.map(e => e.atrasados), empComItens.map(e => e.vencendo), 'Atrasados', 'Vencendo', cores.critico, cores.aviso, false, true);
      G.evolucao(gEvo.cv, g.evolucao, ctx.hoje);
      G.duasBarras(gServ.cv, g.servicos.map(s => M.SERVICOS.find(x => x.nome === s.servico).curto), g.servicos.map(s => s.pctPrevisto), g.servicos.map(s => s.pctRealizado), 'Previsto hoje', 'Realizado', cores.s1, cores.s2, true, false);
      G.pctBarras(gLoc.cv, g.locais.map(l => l.local), g.locais.map(l => l.pct), '% concluído', true);
      G.pctBarras(gPav.cv, g.pavimentos.map(x => x.pav + 'º'), g.pavimentos.map(x => x.pct), '% concluído', false);
    });
  }
  PA.ui.registrarTela('painel', { titulo: 'Painel executivo', menu: 'Painel', icone: 'painel', render });
  PA.ui.lerFiltrosPainel = lerFiltros;
})(typeof globalThis !== 'undefined' ? globalThis : this);
