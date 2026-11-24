/* Tela Acompanhamento — por serviço/prumada/empreiteira: executado, em execução, liberado, bloqueado e o que falta. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, folgaEl, select } = PA.ui;
  const M = PA.modelo;
  const CHAVE = 'pa.filtrosAcomp';
  function lerFiltros(ctx) {
    let f = null; try { f = JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); } catch (e) { f = null; }
    if (!f) { f = {}; if (ctx.usuario && ctx.usuario.papel === 'empreiteira' && ctx.usuario.empreiteira) f.empreiteira = ctx.usuario.empreiteira; }
    return f;
  }
  function gravar(f) { try { sessionStorage.setItem(CHAVE, JSON.stringify(f)); } catch (e) { /* ignora */ } }

  function chipApto(ctx, it, extra) {
    const s = M.POR_ORDEM[it.ordem];
    return h('button.chip-apto', { title: `${s.nome} · apto ${it.apto} · ${it.detalhe}${it.pendencias ? ' · ' + it.pendencias + ' pendência(s) aberta(s)' : ''}`,
      onclick: () => PA.ui.abrirLancamento(ctx, s.id, [it.apto]) },
      h('b', it.apto), extra ? h('small', extra) : null, it.atrasado ? h('span.neg', ' atrasado') : null, it.pendencias ? h('span.alerta-pend', { 'aria-label': 'pendência aberta' }, ' ⚠') : null);
  }
  function grupoLista(ctx, titulo, cls, itens, mostrarServico, extra, aberto) {
    const conteudo = itens.length ? h('div.chips', itens.map(it => chipApto(ctx, it, (mostrarServico ? M.POR_ORDEM[it.ordem].curto + ' · ' : '') + extra(it)))) : h('p.mudo.peq', 'Nenhum.');
    return h('details.grupo-lista', aberto ? { open: true } : {}, h('summary', h('span.pill.' + cls, titulo + ' (' + itens.length + ')')), conteudo);
  }

  function render(el, ctx) {
    const f = lerFiltros(ctx);
    const set = (k, v) => { const n = Object.assign({}, f); if (v === '' || v === null) delete n[k]; else n[k] = v; gravar(n); PA.ui.desenhar(); };
    const A = PA.motor.acompanhamento(ctx.resultado, f, ctx.estado);
    const { unicas } = PA.motor.empreiteiras(ctx.estado, ctx.resultado.cron);
    const pavs = []; for (let p = 27; p >= 1; p--) pavs.push([p, p + 'º']);
    const campo = (r, e) => h('label.campo', r, e);
    el.appendChild(h('div.cartao', { style: { padding: '12px 16px', marginBottom: '14px' } }, h('div.linha', { style: { alignItems: 'flex-end' } },
      campo('Serviço', select([['', '(Todos)'], ...M.SERVICOS.map(s => [s.nome, s.nome])], f.servico || '', v => set('servico', v))),
      campo('Prumada', select([['', '(Todas)'], 'Final 1', 'Final 2', 'Final 3', 'Final 4', 'Finais 1-2', 'Finais 3-4'], f.prumada || '', v => set('prumada', v))),
      campo('Empreiteira', select([['', '(Todas)'], ['A definir', 'A definir'], ...unicas.map(u => [u, u.trim()])], f.empreiteira || '', v => set('empreiteira', v))),
      campo('Pavimento', select([['', '(Todos)'], ...pavs], f.pavimento || '', v => set('pavimento', v ? Number(v) : null))),
      Object.keys(f).length ? h('button.btn.peq', { onclick: () => { gravar({}); PA.ui.desenhar(); } }, 'Limpar filtros') : null,
      ctx.usuario && ctx.usuario.papel === 'empreiteira' ? h('button.btn.prim', { style: { marginLeft: 'auto' }, onclick: () => { location.hash = '#relatorios'; } }, PA.ui.icone('imprimir'), 'Meu relatório') : null)));
    const n = A.numeros;
    const k = (cls, r, v, s) => h('div.kpi.' + cls, h('div.r', r), h('div.v', v), h('div.s', s || ''));
    el.appendChild(h('div.kpis', k('navy', 'Total', n.total, 'serviço × apto'), k('ok', 'Executado', n.executado, fmt.pct(n.pct) + ' do escopo'),
      k('and', 'Em execução', n.execucao), k('teal', 'Liberado', n.liberado, 'pode executar já'), k('blq', 'Bloqueado', n.bloqueado, 'aguarda serviço anterior'),
      k('blq', 'Fora do escopo', n.fora, 'cancelados'), k('teal', '% executado', fmt.pct(n.pct, 1)), k('late', 'Atrasados', n.atrasados, 'data-limite vencida')));
    if (A.servico) {
      const S = A.servico;
      el.appendChild(h('div.cartao', { style: { marginTop: '14px' } }, h('div.linha', { style: { gap: '28px' } },
        h('div', h('div.mudo.peq', 'Término projetado'), h('b', fmt.dataOu(S.termino, 'concluído'))),
        h('div', h('div.mudo.peq', 'Pior folga'), folgaEl(S.folga)),
        h('div', h('div.mudo.peq', 'Limite Finais 3-4 · obra'), h('b', fmt.data(S.limiteF34) + ' · ' + fmt.data(S.limite))),
        h('div', h('div.mudo.peq', 'Equipe atual → necessária'), h('b', fmt.num(S.equipe) + ' → ' + fmt.num(S.necessaria))))));
    }
    el.appendChild(h('div.cartao', { style: { marginTop: '14px' } }, h('h2', 'Por prumada', h('small', A.servico ? f.servico : 'todos os serviços · datas = término da prumada')),
      h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', ['Prumada', 'Executado', 'Em execução', 'Liberado', 'Bloqueado', '%', A.servico ? 'Limite' : 'Meta', 'Término projetado', 'Folga'].map((t, i) => h('th' + (i >= 1 && i <= 5 || i === 8 ? '.num' : ''), t)))),
        h('tbody', A.porPrumada.map(p => h('tr', h('td', h('b', 'Final ' + p.final)), h('td.num', p.executado), h('td.num', p.execucao), h('td.num', p.liberado), h('td.num', p.bloqueado),
          h('td.num', fmt.pct(p.pct)), h('td', fmt.data(p.limite)), h('td', fmt.dataOu(p.termino, 'concluído')), h('td.num', folgaEl(p.folga)))))))));
    if (A.matriz) {
      const cel = (m, k2, v) => h('td.num', v ? h('button.link-num', { title: 'Ver os aptos', onclick: () => { gravar(Object.assign({}, f, { servico: m.servico })); ctx.ui.grupoAberto = k2; PA.ui.desenhar(); } }, v) : h('span.mudo', '0'));
      el.appendChild(h('div.cartao', { style: { marginTop: '14px' } }, h('h2', 'Serviços × situação', h('small', 'clique num número para ver os aptos')),
        h('div.tabela-wrap', h('table.tab',
          h('thead', h('tr', ['Serviço', 'Executado', 'Em execução', 'Liberado', 'Bloqueado', 'Fora do escopo', '% executado'].map((t, i) => h('th' + (i ? '.num' : ''), t)))),
          h('tbody', A.matriz.map(m => h('tr', h('td', h('b', m.servico)), cel(m, 'executado', m.executado), cel(m, 'execucao', m.execucao), cel(m, 'liberado', m.liberado),
            cel(m, 'bloqueado', m.bloqueado), h('td.num', m.fora), h('td.num', h('div.linha', { style: { gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' } },
              h('span.barra', { style: { width: '70px' } }, h('i', { style: { width: (m.pct * 100).toFixed(1) + '%' } })), fmt.pct(m.pct))))))))));
    }
    const L = A.listas, ms = !A.servico, ab = ctx.ui.grupoAberto;
    const ate = it => typeof it.dataNecessaria === 'number' ? 'até ' + fmt.curta(it.dataNecessaria) : '';
    el.appendChild(h('div.cartao', { style: { marginTop: '14px' } }, h('h2', 'O que falta', h('small', '⚠ = apto com pendência aberta · toque no apto para ver ou lançar')),
      grupoLista(ctx, 'Liberado — pode atacar já', 'lib', L.liberado, ms, ate, !ab || ab === 'liberado'),
      grupoLista(ctx, 'Em execução', 'and', L.execucao, ms, ate, !ab || ab === 'execucao'),
      grupoLista(ctx, 'Bloqueado — aguardando serviço anterior', 'blq', L.bloqueado, ms, it => it.detalhe.replace('Aguardando ', 'aguarda '), !ab || ab === 'bloqueado'),
      grupoLista(ctx, 'Executado', 'ok', L.executado, ms, () => '', ab === 'executado')));
    ctx.ui.grupoAberto = null;
  }
  PA.ui.registrarTela('acompanhamento', { titulo: 'Acompanhamento', menu: 'Acompanhamento', icone: 'macro', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
