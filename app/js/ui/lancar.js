/* Tela Lançar — avanço diário por serviço (grade Pav × Final) ou por apartamento. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, icone, modal, fmt, classeItem, rotuloItem, pillStatus, folgaEl } = PA.ui;
  const M = PA.modelo;

  function opcoesDe(servicoId, estado) {
    const P = estado.piso.empreiteiras;
    if (servicoId === 'piso') return [
      { codigo: '1', rotulo: 'Concluído — ' + P.ds, cor: 'var(--ok)' }, { codigo: '2', rotulo: 'Concluído — ' + P.jun, cor: 'var(--ok)' },
      { codigo: 'and', rotulo: 'Em andamento', cor: 'var(--warn)' }, { codigo: 'canc', rotulo: 'Cancelado / não se aplica', cor: 'var(--canc)' }];
    if (servicoId === 'rejunte') return [
      { codigo: '1', rotulo: 'Rejuntado — ' + P.ds, cor: 'var(--ok)' }, { codigo: '4', rotulo: 'Rejuntado — ' + P.jun, cor: 'var(--ok)' },
      { codigo: '2', rotulo: 'Rejuntando — ' + P.ds, cor: 'var(--warn)' }, { codigo: '5', rotulo: 'Rejuntando — ' + P.jun, cor: 'var(--warn)' },
      { codigo: '3', rotulo: 'Sem rejunte — ' + P.ds, cor: 'var(--navy-2)' }, { codigo: '6', rotulo: 'Sem rejunte — ' + P.jun, cor: 'var(--navy-2)' },
      { codigo: 'canc', rotulo: 'Cancelado / não se aplica', cor: 'var(--canc)' }];
    return [{ codigo: '1', rotulo: 'Concluído', cor: 'var(--ok)' }, { codigo: 'and', rotulo: 'Em andamento', cor: 'var(--warn)' },
      { codigo: 'canc', rotulo: 'Cancelado / não se aplica', cor: 'var(--canc)' }];
  }
  function itemDe(res, ordem, apto) { return res.itens[94 * (ordem - 1) + M.APTO_POR_NUM[apto].idx]; }
  function pctServico(res, ordem) {
    const d = res.itens.filter(i => i.ordem === ordem); const den = d.filter(i => i.status !== 'Cancelado').length;
    return den ? d.filter(i => i.status === 'Concluído').length / den : 0;
  }
  function lerPref(k, padrao) { try { return localStorage.getItem(k) || padrao; } catch (e) { return padrao; } }
  function gravarPref(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } }

  /** Folha de lançamento de um apto (ou de vários, no modo seleção). */
  function abrirLancamento(ctx, servicoId, aptos) {
    const s = M.POR_ID[servicoId];
    if (!PA.ui.pode('lancar')) {
      // Perfil só de consulta: mostra a situação, sem opções de lançamento.
      const it = itemDe(ctx.resultado, s.ordem, aptos[0]);
      const m0 = modal(`Apto ${aptos[0]} · ${s.nome}`, h('div.info-grade',
        h('div', h('b', 'Situação'), pillStatus(it)), h('div', h('b', 'Detalhe'), it.detalhe),
        h('div', h('b', 'Data-limite'), fmt.data(it.limite)), h('div', h('b', 'Previsto'), fmt.dataOu(it.terminoPrevisto, it.status === 'Concluído' ? 'concluído' : '—')),
        h('div', h('b', 'Data necessária'), fmt.dataOu(it.dataNecessaria)), h('div', h('b', 'Empreiteira'), it.empreiteira)));
      return m0;
    }
    const res = ctx.resultado;
    const unico = aptos.length === 1;
    const it = unico ? itemDe(res, s.ordem, aptos[0]) : null;
    const lanc = unico ? (ctx.estado.lancamentos[servicoId][aptos[0]] || {}) : {};
    const dataIn = h('input', { type: 'date', value: typeof lanc.dataReal === 'number' ? PA.datas.paraISO(lanc.dataReal) : '' });
    const obsIn = h('textarea', { placeholder: 'Ex.: trava de frente, falta de mão de obra…' }, lanc.obs || '');
    const extras = () => ({ dataReal: dataIn.value ? PA.datas.deISO(dataIn.value) : undefined, obs: obsIn.value.trim() || undefined });
    let m;
    const aplicarCodigo = codigo => {
      let e = ctx.estado;
      const ex = extras();
      if (codigo === null) e = PA.acoes.limpar(e, servicoId, aptos);
      else if (unico) e = PA.acoes.lancar(e, servicoId, aptos[0], { codigo, ...ex });
      else {
        e = PA.acoes.alterar(e, `${s.nome} · ${aptos.length} aptos`, novo => {
          for (const a of aptos) {
            novo.lancamentos[servicoId][a] = Object.assign({}, novo.lancamentos[servicoId][a], { codigo }, ex.dataReal ? { dataReal: ex.dataReal } : {}, ex.obs ? { obs: ex.obs } : {});
          }
        });
        ctx.ui.selecao = new Set();
        ctx.ui.modoSelecao = false;
      }
      m.fechar();
      PA.ui.aplicar(e, { msg: unico ? `Apto ${aptos[0]} · ${s.nome}: ${codigo === null ? 'automático' : (opcoesDe(servicoId, ctx.estado).find(o => o.codigo === codigo) || {}).rotulo}` : `${aptos.length} aptos atualizados em ${s.nome}` });
    };
    const atual = unico ? PA.modelo.norm(lanc.codigo) : null;
    const opcoes = h('div.opcoes', opcoesDe(servicoId, ctx.estado).map(o =>
      h('button.opcao' + (atual === o.codigo ? '.atual' : ''), { onclick: () => aplicarCodigo(o.codigo) }, h('i', { style: { background: o.cor } }), o.rotulo)),
      h('button.opcao' + (unico && !lanc.codigo ? '.atual' : ''), { onclick: () => aplicarCodigo(null), title: 'Volta ao cálculo automático (ok / bloqueado)' }, h('i', { style: { background: 'transparent', border: '2px solid var(--line-2)' } }), servicoId === 'piso' || servicoId === 'pintura1' ? 'Limpar (não iniciado)' : 'Automático (liberado/bloqueado)'));
    const info = unico ? h('div.info-grade',
      h('div', h('b', 'Situação'), pillStatus(it)), h('div', h('b', 'Detalhe'), it.detalhe),
      h('div', h('b', 'Data-limite'), fmt.data(it.limite)), h('div', h('b', 'Previsto'), fmt.dataOu(it.terminoPrevisto, it.status === 'Concluído' ? 'concluído' : '—')),
      h('div', h('b', 'Data necessária'), fmt.dataOu(it.dataNecessaria)), h('div', h('b', 'Empreiteira'), it.empreiteira)) : h('p.mudo', 'A opção escolhida vale para os ' + aptos.length + ' aptos selecionados: ' + aptos.join(', ') + '.');
    m = modal(h('div', h('h3', unico ? `Apto ${aptos[0]} · ${s.nome}` : `${aptos.length} aptos · ${s.nome}`), h('div.mudo.peq', unico ? `Pavimento ${M.APTO_POR_NUM[aptos[0]].pav} · Final ${M.APTO_POR_NUM[aptos[0]].final}` : 'Lançamento em lote')),
      [info, h('div.mudo.peq', 'Toque na opção para lançar:'), opcoes,
        h('details', unico && (lanc.obs || lanc.dataReal) ? { open: true } : {}, h('summary.peq', 'Data de conclusão e observação (opcional)'),
          h('div.pilha', { style: { marginTop: '10px', gap: '10px' } },
            h('label.campo', 'Data real de conclusão', h('div.linha', dataIn, h('button.btn.peq', { type: 'button', onclick: () => { dataIn.value = PA.datas.paraISO(PA.datas.hojeSerial()); } }, 'Hoje'))),
            h('label.campo', 'Observação / justificativa', obsIn),
            unico ? h('button.btn.peq', { onclick: () => {
              const ex = extras(); m.fechar();
              PA.ui.aplicar(PA.acoes.lancar(ctx.estado, servicoId, aptos[0], (lanc.codigo || ex.obs || ex.dataReal) ? { codigo: lanc.codigo || '', ...ex } : null), { msg: 'Data e observação salvas' });
            } }, 'Salvar só data e observação') : null))]);
  }

  function grade(ctx, servicoId) {
    const s = M.POR_ID[servicoId], res = ctx.resultado;
    const sel = ctx.ui.selecao || new Set();
    const g = h('div.grade-aptos', { role: 'grid', 'aria-label': 'Apartamentos de ' + s.nome },
      h('div.cab', 'Pav.'), [1, 2, 3, 4].map(f => h('div.cab', 'Final ' + f)));
    for (let pav = 27; pav >= 1; pav--) {
      g.appendChild(h('div.pav', pav + 'º'));
      for (let f = 1; f <= 4; f++) {
        if (pav > 20 && f > 2) { g.appendChild(h('div.vazio-celula')); continue; }
        const apto = pav * 10 + f;
        const it = itemDe(res, s.ordem, apto);
        const cls = classeItem(it);
        const vendido = ctx.estado.estrategia.vendido[apto] === 'V';
        const nPend = (res.pendencias.abertasPorApto || {})[apto] || 0;
        const tag = (nPend ? '⚠ ' : '') + (servicoId === 'piso' && it.status === 'Concluído' ? (PA.modelo.norm(it.codigo) === '1' ? 'DS' : 'JN') : (it.obs ? '✎' : ''));
        g.appendChild(h('button.celula.' + cls.split(' ').join('.') + (sel.has(apto) ? '.sel' : ''), {
          title: `Apto ${apto} · ${rotuloItem(it)}${it.atrasado ? ' · atrasado' : ''} · ${it.detalhe}${vendido ? '' : ' · não vendido'}${nPend ? ' · ' + nPend + ' pendência(s) aberta(s)' : ''}`,
          'data-apto': apto,
          onclick: () => {
            if (ctx.ui.modoSelecao) { if (sel.has(apto)) sel.delete(apto); else sel.add(apto); ctx.ui.selecao = sel; PA.ui.desenhar(); return; }
            abrirLancamento(ctx, servicoId, [apto]);
          }
        }, String(apto), h('small', rotuloCurto(it)), tag ? h('span.tag', tag) : null));
      }
    }
    return g;
  }
  function rotuloCurto(it) {
    const r = rotuloItem(it);
    if (r === 'Concluído') return '✓';
    if (r === 'Em andamento') return 'andam.';
    if (r === 'Bloqueado') return 'bloq.';
    if (r === 'Cancelado') return 'canc.';
    if (r === 'Liberado') return 'liberado';
    return '—';
  }
  function legenda() {
    const l = (cls, t, extra) => h('span', h('i', { class: 'celula ' + cls, style: Object.assign({ minHeight: '14px', display: 'inline-block', padding: 0 }, extra || {}) }), t);
    return h('div.legenda', l('ok', 'Concluído'), l('and', 'Em andamento'), l('lib', 'Liberado / não iniciado'), l('blq', 'Bloqueado (aguarda serviço anterior)'), l('canc', 'Cancelado'), l('lib late', 'Atrasado (borda vermelha)'));
  }

  function resumoServico(ctx, servicoId) {
    const s = M.POR_ID[servicoId], res = ctx.resultado, L = res.cron.porOrdem[s.ordem];
    const d = res.itens.filter(i => i.ordem === s.ordem);
    const c = st => d.filter(i => i.status === st).length;
    const linha = (r, v) => h('div.item', h('span.mudo', r), h('b', v));
    return h('div.cartao.resumo-servico',
      h('h2', s.nome, h('small', PA.motor.empreiteiraServico(ctx.estado, servicoId))),
      h('div.barra', { style: { marginBottom: '10px' } }, h('i', { style: { width: (pctServico(res, s.ordem) * 100).toFixed(1) + '%' } })),
      linha('Concluídos', c('Concluído') + ' de ' + (94 - c('Cancelado')) + ' (' + fmt.pct(pctServico(res, s.ordem)) + ')'),
      linha('Em andamento', c('Em andamento')), linha('Liberados (não iniciados)', c('Não iniciado')), linha('Bloqueados', c('Bloqueado')),
      linha('Atrasados', d.filter(i => i.atrasado).length),
      linha('Término projetado', fmt.dataOu(L.termTodas, 'concluído')),
      linha('Limite Finais 3-4 · obra', fmt.data(L.limite.f34) + ' · ' + fmt.data(L.limite.obra)),
      h('div.item', h('span.mudo', 'Pior folga'), folgaEl(L.piorFolga)),
      linha('Equipe atual → necessária', fmt.num(L.equipe) + ' → ' + fmt.num(L.moTodas)),
      h('p.mudo.peq', { style: { marginTop: '10px' } }, 'Toque num apartamento para lançar. "ok" e "bloqueado" são calculados sozinhos a partir dos serviços anteriores.'));
  }

  function porApartamento(ctx) {
    const res = ctx.resultado;
    const apto = Number(ctx.ui.apto || lerPref('pa.apto', '11'));
    const escolha = h('div.cartao', h('h2', 'Escolha o apartamento'),
      h('div.aptos-mini', (() => {
        const out = [];
        for (let pav = 27; pav >= 1; pav--) for (let f = 1; f <= 4; f++) {
          if (pav > 20 && f > 2) { out.push(h('span')); continue; }
          const a = pav * 10 + f;
          out.push(h('button' + (a === apto ? '.ativo' : ''), { onclick: () => { ctx.ui.apto = a; gravarPref('pa.apto', String(a)); PA.ui.desenhar(); } }, a));
        }
        return out;
      })()));
    const A = M.APTO_POR_NUM[apto];
    const lista = h('div.lista-servicos-apto', M.SERVICOS.map(s => {
      const it = itemDe(res, s.ordem, apto);
      return h('button.servico-linha', { onclick: () => abrirLancamento(ctx, s.id, [apto]) },
        h('span.ord', s.ordem), h('div', h('div', h('b', s.nome)), h('div.det', it.detalhe + (typeof it.terminoPrevisto === 'number' ? ' · previsto ' + fmt.data(it.terminoPrevisto) : '') + ' · limite ' + fmt.data(it.limite))),
        pillStatus(it));
    }));
    const pend = res.pendencias.lista.filter(p => p.apto === apto && p.status === 'Aberta');
    return h('div.lancar-layout',
      h('div.cartao', h('h2', 'Apto ' + apto, h('small', `Pavimento ${A.pav} · Final ${A.final} · ${ctx.estado.estrategia.vendido[apto] === 'V' ? 'vendido' : 'não vendido'}`)), lista,
        pend.length ? h('div', { style: { marginTop: '14px' } }, h('div.secao-titulo', 'Pendências abertas'), pend.map(p => h('div.peq', '• ' + p.etapa + ': ' + p.descricao + (p.responsavel ? ' (' + p.responsavel + ')' : '')))) : null),
      escolha);
  }

  function render(el, ctx) {
    const res = ctx.resultado;
    const modo = ctx.ui.modoLancar || lerPref('pa.modoLancar', 'servico');
    let servicoId = ctx.ui.servico || lerPref('pa.servico', 'portas');
    if (!M.POR_ID[servicoId]) servicoId = 'portas';
    const trocaModo = h('div.seg', { role: 'tablist' },
      h('button' + (modo === 'servico' ? '.ativo' : ''), { onclick: () => { ctx.ui.modoLancar = 'servico'; gravarPref('pa.modoLancar', 'servico'); PA.ui.desenhar(); } }, 'Por serviço'),
      h('button' + (modo === 'apto' ? '.ativo' : ''), { onclick: () => { ctx.ui.modoLancar = 'apto'; gravarPref('pa.modoLancar', 'apto'); PA.ui.desenhar(); } }, 'Por apartamento'));
    const k = res.cron;
    el.appendChild(h('div.linha', { style: { marginBottom: '14px', justifyContent: 'space-between' } }, trocaModo,
      h('div.linha.peq.mudo', 'Obra: término projetado ', h('b', fmt.dataOu(k.obra.termino, 'concluída')), ' · meta ', fmt.data(k.obra.meta), ' · folga ', folgaEl(k.obra.folga))));
    if (modo === 'apto') { el.appendChild(porApartamento(ctx)); return; }
    const fita = h('div.servicos-fita', { role: 'tablist', 'aria-label': 'Serviços' }, M.SERVICOS.map(s => {
      const p = pctServico(res, s.ordem);
      return h('button.servico-chip' + (s.id === servicoId ? '.ativo' : ''), { role: 'tab', 'aria-selected': s.id === servicoId ? 'true' : 'false', onclick: () => { ctx.ui.servico = s.id; ctx.ui.selecao = new Set(); gravarPref('pa.servico', s.id); PA.ui.desenhar(); } },
        h('span.n', s.ordem + ' · ' + fmt.pct(p)), h('span.t', s.curto), h('span.barra', h('i', { style: { width: (p * 100).toFixed(1) + '%' } })));
    }));
    el.appendChild(fita);
    const sel = ctx.ui.selecao || new Set();
    const barraSel = h('div.linha', { style: { margin: '14px 0 10px' } },
      h('button.btn.peq' + (ctx.ui.modoSelecao ? '.teal' : ''), { onclick: () => { ctx.ui.modoSelecao = !ctx.ui.modoSelecao; ctx.ui.selecao = new Set(); PA.ui.desenhar(); } }, icone('multi'), ctx.ui.modoSelecao ? 'Sair da seleção' : 'Marcar vários'),
      ctx.ui.modoSelecao ? h('span.mudo.peq', sel.size ? sel.size + ' selecionado(s)' : 'Toque nos aptos para selecionar') : null,
      ctx.ui.modoSelecao && sel.size ? h('button.btn.peq.prim', { onclick: () => abrirLancamento(ctx, servicoId, [...sel].sort((a, b) => a - b)) }, 'Lançar nos selecionados') : null);
    el.appendChild(h('div.lancar-layout', h('div.cartao', barraSel, grade(ctx, servicoId), h('div', { style: { marginTop: '14px' } }, legenda())), resumoServico(ctx, servicoId)));
  }

  PA.ui.registrarTela('lancar', { titulo: 'Lançar avanço', menu: 'Lançar', icone: 'lancar', perfis: ['admin', 'obra'], render });
  PA.ui.abrirLancamento = abrirLancamento;
})(typeof globalThis !== 'undefined' ? globalThis : this);
