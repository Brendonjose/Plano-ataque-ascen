/* Tela Cronograma — metas, prioridades, prazos, produtividade e equipes (simulação na hora). */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, folgaEl } = PA.ui;
  const M = PA.modelo;
  const FIN = [3, 4, 2, 1];

  function mudar(ctx, rotulo, fn) { PA.ui.aplicar(PA.acoes.alterar(ctx.estado, rotulo, fn), { msg: rotulo }); }
  function numIn(valor, aoMudar, attrs) {
    return h('input', Object.assign({ type: 'number', step: 'any', value: valor === null || valor === undefined ? '' : valor, style: { width: '84px' },
      onchange: e => { const v = e.target.value === '' ? null : Number(e.target.value); if (v === null || isFinite(v)) aoMudar(v); } }, attrs || {}));
  }
  function dataIn(valor, aoMudar, placeholder) {
    return h('input', { type: 'date', value: typeof valor === 'number' ? PA.datas.paraISO(valor) : '', title: placeholder || '', onchange: e => aoMudar(e.target.value ? PA.datas.deISO(e.target.value) : null) });
  }

  function metas(ctx) {
    const c = ctx.estado.cronograma;
    return h('div.cartao', h('h2', 'Metas e prioridades', h('small', 'prioridade 1 = prumada atacada primeiro por cada equipe')),
      h('div.linha', { style: { gap: '18px', alignItems: 'flex-end' } },
        h('label.campo', 'Data-alvo da obra completa (macro)', dataIn(c.metaMacro, v => v && mudar(ctx, 'Meta da obra', e => { e.cronograma.metaMacro = v; })))),
      h('div.tabela-wrap', { style: { marginTop: '12px' } }, h('table.tab',
        h('thead', h('tr', h('th', 'Prumada'), h('th', 'Data-alvo'), h('th', 'Prioridade'), h('th.num', 'Aptos'), h('th', ''))),
        h('tbody', FIN.map(f => h('tr', h('td', h('b', 'Final ' + f)),
          h('td', dataIn(c.prumadas[f].meta, v => mudar(ctx, 'Meta Final ' + f, e => { e.cronograma.prumadas[f].meta = v; }), 'vazio = meta da obra'),
            c.prumadas[f].meta === null ? h('span.mudo.peq', ' = meta da obra (' + fmt.data(c.metaMacro) + ')') : null),
          h('td', numIn(c.prumadas[f].prioridade, v => v && mudar(ctx, 'Prioridade Final ' + f, e => { e.cronograma.prumadas[f].prioridade = v; }), { min: 1, max: 4, step: 1, style: { width: '64px' } })),
          h('td.num', M.APTOS.filter(a => a.final === f).length), h('td'))))) ));
  }

  function piso(ctx) {
    const P = ctx.estado.piso, k = ctx.resultado.cron.piso;
    const set = (rot, fn) => mudar(ctx, rot, e => fn(e.piso));
    return h('div.cartao', h('h2', 'Piso — duas empreiteiras', h('small', 'cada uma executa a sua cota; o piso termina na maior das duas datas')),
      h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', ['Empreiteira', 'Equipe', 'Produtiv. piso (m²/func/dia)', 'Produtiv. azulejo', 'Aptos a executar', 'Dias previstos', 'Término'].map(t => h('th', t)))),
        h('tbody',
          h('tr', h('td', h('b', P.empreiteiras.ds)), h('td', numIn(P.equipeDS, v => set('Equipe ' + P.empreiteiras.ds, p => { p.equipeDS = v || 0; }))),
            h('td', numIn(P.prodDS.piso, v => set('Produtividade piso DS', p => { p.prodDS.piso = v; }))), h('td', numIn(P.prodDS.azulejo, v => set('Produtividade azulejo DS', p => { p.prodDS.azulejo = v; }))),
            h('td', k.faltaDS), h('td', fmt.num(k.diasDS)), h('td', fmt.dataOu(k.finalDS))),
          h('tr', h('td', h('b', P.empreiteiras.jun)), h('td', numIn(P.equipeJun, v => set('Equipe ' + P.empreiteiras.jun, p => { p.equipeJun = v || 0; }))),
            h('td', numIn(P.prodJun.piso, v => set('Produtividade piso Juninho', p => { p.prodJun.piso = v; }))), h('td', numIn(P.prodJun.azulejo, v => set('Produtividade azulejo Juninho', p => { p.prodJun.azulejo = v; }))),
            h('td', k.faltaJun), h('td', fmt.num(k.diasJun)), h('td', fmt.dataOu(k.finalJun)))))),
      h('div.linha', { style: { marginTop: '10px', gap: '18px' } },
        h('label.campo', 'Aptos repassados ao ' + P.empreiteiras.jun, numIn(P.repassadosJun, v => set('Aptos repassados', p => { p.repassadosJun = v || 0; }))),
        h('label.campo', 'Dias por apto (ciclo)', numIn(P.diasPorApto, v => set('Ciclo do piso', p => { p.diasPorApto = v; }))),
        h('label.campo', 'm² piso por apto', numIn(P.m2.piso, v => set('m² piso', p => { p.m2.piso = v; }))),
        h('label.campo', 'm² azulejo por apto', numIn(P.m2.azulejo, v => set('m² azulejo', p => { p.m2.azulejo = v; })))));
  }

  function tabelaServicos(ctx) {
    const res = ctx.resultado;
    const sv = id => ctx.estado.cronograma.servicos[id];
    const set = (id, campo, rot) => v => v !== null && mudar(ctx, rot, e => { e.cronograma.servicos[id][campo] = v; });
    return h('div.cartao', h('h2', 'Serviços — entradas e projeção encadeada', h('small', 'mude a equipe ou a produtividade para simular; tudo recalcula na hora')),
      h('div.tabela-wrap', h('table.tab',
        h('thead',
          h('tr', h('th', 'Serviço'), h('th', 'Prazo (d.ú.)'), h('th', 'Unid./apto'), h('th', 'Produtiv.'), h('th', 'Equipe'), h('th.num', 'Ritmo (aptos/dia)'),
            FIN.map(f => h('th', 'Limite F' + f)), h('th.num', 'Pendentes'), h('th', 'Término proj.'), h('th.num', 'Pior folga'), h('th.num', 'Necessária'), h('th.num', 'Acréscimo'), h('th.num', 'Atraso gerado'))),
        h('tbody', res.cron.servicos.map(L => {
          const s = M.POR_ORDEM[L.ordem];
          const piso = s.id === 'piso';
          const pend = L.saldo[1] + L.saldo[2] + L.saldo[3] + L.saldo[4];
          return h('tr',
            h('td', h('b', L.servico), h('div.mudo.peq', PA.motor.empreiteiraServico(ctx.estado, s.id))),
            h('td', numIn(L.prazo, set(s.id, 'prazo', 'Prazo ' + L.servico), { style: { width: '60px' } })),
            h('td', piso ? fmt.num(L.unid) : numIn(sv(s.id).unid, set(s.id, 'unid', 'Unidades ' + L.servico))),
            h('td', piso ? fmt.num(L.prod) : numIn(sv(s.id).produtividade, set(s.id, 'produtividade', 'Produtividade ' + L.servico))),
            h('td', piso ? h('span', fmt.num(L.equipe), h('div.mudo.peq', 'ver bloco do piso')) : numIn(sv(s.id).equipe, set(s.id, 'equipe', 'Equipe ' + L.servico), { style: { width: '60px' } })),
            h('td.num', fmt.num(Math.round(L.ritmo * 100) / 100)),
            FIN.map(f => h('td', fmt.curta(L.limite[f]))),
            h('td.num', pend), h('td', fmt.dataOu(L.termTodas, 'concluído')), h('td.num', folgaEl(L.piorFolga)),
            h('td.num', typeof L.moTodas === 'number' && L.moTodas > L.equipe ? h('b.neg', L.moTodas) : fmt.num(L.moTodas)),
            h('td.num', typeof L.acrescimo === 'number' ? (L.acrescimo > 0 ? '+' + L.acrescimo : '0') : fmt.num(L.acrescimo)),
            h('td.num', L.atrasoGerado.obra ? h('span.neg', '+' + L.atrasoGerado.obra + ' d') : '—'));
        })))),
      h('p.mudo.peq', { style: { marginTop: '10px' } }, 'Ritmo = equipe ÷ funcionário-dia por apto. Término encadeado: nenhum serviço termina uma prumada antes do anterior + ciclo. Mão de obra necessária supõe frente liberada a tempo. Atraso gerado = quanto o serviço acrescenta ao atraso do anterior.'));
  }

  function porPrumada(ctx) {
    const res = ctx.resultado;
    return h('div.cartao', h('h2', 'Término e folga por prumada'),
      h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', h('th', 'Serviço'), FIN.map(f => [h('th', 'Término F' + f), h('th.num', 'Folga F' + f), h('th.num', 'Equipe nec. F' + f)]))),
        h('tbody', res.cron.servicos.map(L => h('tr', h('td', h('b', L.servico)),
          FIN.map(f => [h('td', fmt.dataOu(L.term[f], 'ok')), h('td.num', folgaEl(L.folga[f])), h('td.num', fmt.num(L.mo[f]))])))))));
  }

  function render(el, ctx) {
    el.appendChild(h('div.pilha', h('div.grade-cartoes', { style: { gridTemplateColumns: 'minmax(0, 520px) minmax(0, 1fr)' } }, metas(ctx), piso(ctx)), tabelaServicos(ctx), porPrumada(ctx)));
  }
  PA.ui.registrarTela('cronograma', { titulo: 'Cronograma e simulação', menu: 'Cronograma', icone: 'cronograma', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
