/* Tela Torre — visão visual da obra: por serviço, por apartamento e entrega. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, select, modal, pillStatus } = PA.ui;
  const M = PA.modelo;
  const CH = 'pa.torre';
  const ler = () => { try { return JSON.parse(sessionStorage.getItem(CH) || '{}'); } catch (e) { return {}; } };
  const gravar = f => { try { sessionStorage.setItem(CH, JSON.stringify(f)); } catch (e) { /* ignora */ } };
  const LEGENDAS = {
    servico: [['ok', 'Executado'], ['and', 'Em execução'], ['lib', 'Liberado'], ['blq', 'Bloqueado (aguarda anterior)'], ['canc', 'Fora do escopo'], ['lib late', 'Atrasado (borda vermelha)']],
    apto: [['p0', '0–19%'], ['p1', '20–39%'], ['p2', '40–59%'], ['p3', '60–79%'], ['p4', '80–99%'], ['ok', 'Todos os serviços']],
    entrega: [['ent-primeira', 'Aprovado de primeira'], ['ent-apos', 'Aprovado após reprova'], ['ent-reprovado', 'Reprovado · aguarda nova vistoria'], ['ent-agendada', 'Vistoria agendada'], ['ent-sem', 'Entregue (sem vistoria registrada)'], ['lib', 'Liberado para vistoria'], ['blq', 'Ainda não liberado']]
  };

  function linhaDoTempo(ctx, apto) {
    const itens = ctx.resultado.itens.filter(i => i.apto === apto);
    modal('Apto ' + apto + ' · todos os serviços', h('div.lista-servicos-apto', itens.map(it => h('div.servico-linha',
      h('span.ord', it.ordem), h('div', h('b', it.servico), h('div.det', it.detalhe + (typeof it.terminoPrevisto === 'number' ? ' · previsto ' + fmt.data(it.terminoPrevisto) : '') + (typeof it.dataNecessaria === 'number' ? ' · necessário ' + fmt.data(it.dataNecessaria) : ''))),
      pillStatus(it)))), null, { largo: true });
  }

  function render(el, ctx) {
    const f = Object.assign({ modo: 'servico', servico: 'Louças e metais' }, ler());
    const set = (k, v) => { gravar(Object.assign({}, f, { [k]: v })); PA.ui.desenhar(); };
    const T = PA.motor.torre(ctx.resultado, f, ctx.estado);
    const lim = PA.motor.limitacao(ctx.resultado);
    const g = lim.gargalo, obra = ctx.resultado.cron.obra;
    el.appendChild(h('div.cartao.gargalo', { style: { marginBottom: '14px', borderLeft: '4px solid ' + (obra.folga < 0 ? 'var(--late)' : 'var(--ok)') } }, h('div.linha', { style: { gap: '24px' } },
      h('div', h('div.mudo.peq', 'Entrega da obra'), h('b', fmt.dataOu(obra.termino, 'concluída')), ' ', PA.ui.folgaEl(obra.folga), h('span.mudo.peq', ' · meta ' + fmt.data(obra.meta))),
      g ? h('div', h('div.mudo.peq', 'Gargalo atual'), h('b', g.servico), h('span.peq', ` · equipe ${fmt.num(g.equipe)} → necessária ${fmt.num(g.necessaria)}`), h('div.mudo.peq', 'Reforçar este serviço é o que antecipa a entrega.')) : null,
      h('div', h('div.mudo.peq', 'Concluído no recorte'), h('b', fmt.pct(T.total, 0))))));
    el.appendChild(h('div.linha', { style: { marginBottom: '14px' } },
      h('div.seg', [['servico', 'Por serviço'], ['apto', 'Por apartamento'], ['entrega', 'Entrega']].map(([k, t]) => h('button' + (f.modo === k ? '.ativo' : ''), { onclick: () => set('modo', k) }, t))),
      f.modo === 'servico' ? h('label.campo', 'Serviço', select(M.SERVICOS.map(s => [s.nome, s.nome]), f.servico, v => set('servico', v))) : null,
      h('label.campo', 'Prumada', select([['', '(Todas)'], 'Final 1', 'Final 2', 'Final 3', 'Final 4', 'Finais 1-2', 'Finais 3-4'], f.prumada || '', v => set('prumada', v || null)))));
    const grade = h('div.grade-aptos.torre', { style: { maxWidth: '680px' } }, h('div.cab', 'Pav.'), [1, 2, 3, 4].map(n => h('div.cab', 'Final ' + n)));
    for (let pav = 27; pav >= 1; pav--) {
      grade.appendChild(h('div.pav', pav + 'º'));
      for (let fi = 1; fi <= 4; fi++) {
        if (pav > 20 && fi > 2) { grade.appendChild(h('div.vazio-celula')); continue; }
        const apto = pav * 10 + fi, c = T.celulas[apto];
        const pend = (ctx.resultado.pendencias.abertasPorApto || {})[apto];
        grade.appendChild(h('button.celula.' + c.classe.split(' ').join('.') + (c.visivel ? '' : '.apagada'), {
          'data-apto': apto, title: `Apto ${apto} · ${c.sub}${c.proximo ? ' · próximo: ' + c.proximo : ''}${pend ? ' · ' + pend + ' pendência(s)' : ''}`,
          onclick: () => {
            if (f.modo === 'apto') linhaDoTempo(ctx, apto);
            else if (f.modo === 'entrega') PA.ui.abrirVistoria(ctx, apto);
            else PA.ui.abrirLancamento(ctx, M.SERVICOS.find(s => s.nome === f.servico).id, [apto]);
          } }, String(apto), h('small', f.modo === 'apto' ? c.sub + (c.proximo ? ' · ' + c.proximo : '') : c.sub), pend ? h('span.tag', '⚠') : null));
      }
    }
    const barras = (titulo, lista, rot) => h('div.cartao', h('h2', titulo), h('div.pilha', { style: { gap: '4px' } }, lista.map(x => h('div.linha.peq', { style: { flexWrap: 'nowrap', gap: '8px' } },
      h('span', { style: { width: '62px', flex: 'none' } }, rot(x)), h('span.barra', { style: { flex: 1 } }, h('i', { style: { width: (x.pct * 100).toFixed(1) + '%' } })), h('span', { style: { width: '40px', textAlign: 'right' } }, fmt.pct(x.pct))))));
    const legenda = h('div.legenda', { style: { marginTop: '12px', fontSize: '13px' } }, LEGENDAS[f.modo].map(([cls, t]) => h('span', h('i', { class: 'celula ' + cls, style: { minHeight: '16px', width: '16px', display: 'inline-block', padding: 0 } }), t)));
    el.appendChild(h('div.lancar-layout', { style: { gridTemplateColumns: 'minmax(0, 1fr) 300px' } },
      h('div.cartao', h('h2', f.modo === 'servico' ? f.servico : (f.modo === 'apto' ? 'Avanço de cada apartamento (12 serviços)' : 'Entrega ao cliente'), h('small', 'toque num apto para ver detalhes')), grade, legenda),
      h('div.pilha', barras('Por prumada', T.porPrumada, x => 'Final ' + x.final), barras('Por pavimento', T.porPav, x => x.pav + 'º'))));
  }
  PA.ui.registrarTela('torre', { titulo: 'Torre', menu: 'Torre', icone: 'quadros', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
