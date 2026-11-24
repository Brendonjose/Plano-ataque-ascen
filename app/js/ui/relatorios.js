/* Tela Relatórios — prazos por empreiteira e prumada, para imprimir (PDF) ou baixar em Excel. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, folgaEl, select, icone, toast } = PA.ui;
  const CH = 'pa.filtrosRel';
  const ler = () => { try { return JSON.parse(sessionStorage.getItem(CH) || '{}'); } catch (e) { return {}; } };
  const gravar = f => { try { sessionStorage.setItem(CH, JSON.stringify(f)); } catch (e) { /* ignora */ } };

  function render(el, ctx) {
    const u = ctx.usuario;
    const propria = u && u.papel === 'empreiteira';
    const f = Object.assign({ prumadas: [1, 2, 3, 4], incluirExecutados: false }, ler());
    if (propria) f.empreiteira = u.empreiteira;
    const set = (k, v) => { const n = Object.assign({}, f, { [k]: v }); if (k === 'empreiteira') delete n.servicos; gravar(n); PA.ui.desenhar(); };
    const { unicas } = PA.motor.empreiteiras(ctx.estado, ctx.resultado.cron);
    const filtros = h('div.cartao.filtros-rel', { style: { padding: '12px 16px', marginBottom: '14px' } }, h('div.linha', { style: { alignItems: 'flex-end', gap: '16px' } },
      h('label.campo', 'Empreiteira', propria ? h('input', { value: f.empreiteira || '', disabled: true })
        : select([['', 'Escolha…'], ...unicas.map(x => [x, x.trim()])], f.empreiteira || '', v => set('empreiteira', v))),
      h('div.campo', 'Prumadas', h('div.linha', { style: { gap: '10px' } }, [1, 2, 3, 4].map(n => h('label.linha.peq', { style: { gap: '4px' } },
        h('input', { type: 'checkbox', checked: f.prumadas.includes(n), onchange: e => set('prumadas', e.target.checked ? [...f.prumadas, n].sort() : f.prumadas.filter(x => x !== n)) }), 'Final ' + n)))),
      f.empreiteira ? (() => {
        const todos = PA.motor.relatorio(ctx.estado, ctx.resultado, { empreiteira: f.empreiteira, prumadas: [1, 2, 3, 4], incluirExecutados: true }).cabecalho.servicos;
        if (todos.length < 2) return null;
        const marcados = f.servicos && f.servicos.length ? f.servicos : todos.map(s => PA.modelo.POR_ORDEM[s.ordem].id);
        return h('div.campo', 'Serviços', h('div.linha', { style: { gap: '10px' } }, todos.map(s => { const id = PA.modelo.POR_ORDEM[s.ordem].id; return h('label.linha.peq', { style: { gap: '4px' } },
          h('input', { type: 'checkbox', checked: marcados.includes(id), onchange: e => { const n = e.target.checked ? [...marcados, id] : marcados.filter(x => x !== id); set('servicos', n.length ? n : null); } }), s.nome); })));
      })() : null,
      h('label.linha.peq', { style: { gap: '6px' } }, h('input', { type: 'checkbox', checked: !!f.incluirExecutados, onchange: e => set('incluirExecutados', e.target.checked) }), 'Incluir aptos já executados'),
      h('div.espaco', { style: { flex: 1 } }),
      f.empreiteira ? h('button.btn', { onclick: () => window.print() }, icone('imprimir'), 'Imprimir / PDF') : null,
      f.empreiteira ? h('button.btn', { onclick: () => {
        const r = PA.motor.relatorio(ctx.estado, ctx.resultado, f);
        XLSX.writeFile(PA.exportar.relatorio(r), 'Relatorio_' + r.cabecalho.empreiteira.replace(/[^\w]+/g, '_') + '_' + PA.datas.paraISO(PA.datas.hojeSerial()) + '.xlsx');
        toast('Relatório em Excel baixado.');
      } }, icone('baixar'), 'Excel') : null));
    el.appendChild(filtros);
    if (!f.empreiteira) { el.appendChild(h('div.cartao', h('p.mudo', 'Escolha a empreiteira para montar o relatório.'))); return; }
    if (!f.prumadas.length) { el.appendChild(h('div.cartao', h('p.mudo', 'Marque pelo menos uma prumada.'))); return; }
    const r = PA.motor.relatorio(ctx.estado, ctx.resultado, f);
    const c = r.cabecalho;
    const variosServ = c.servicos.length > 1;
    const folha = h('div.cartao.relatorio-folha',
      h('div.rel-cab', h('img', { src: 'img/logo_ASCEN.png', alt: 'ASCEN' }),
        h('div', h('h2', { style: { margin: 0 } }, c.empreiteira), h('div.mudo.peq', 'Edifício Ventisette · ' + c.prumadas.map(n => 'Final ' + n).join(', ') + ' · emitido em ' + fmt.data(c.emitidoEm)))),
      c.servicos.length ? h('div.tabela-wrap', { style: { margin: '14px 0' } }, h('table.tab',
        h('thead', h('tr', ['Serviço', 'Executado', '% ', 'Data-limite', 'Término no ritmo atual', 'Folga', 'Equipe atual → necessária'].map(t => h('th', t)))),
        h('tbody', c.servicos.map(s => h('tr', h('td', h('b', s.nome)), h('td', s.executado + ' de ' + s.total), h('td', fmt.pct(s.pct)), h('td', fmt.data(s.limite)),
          h('td', fmt.dataOu(s.termino, 'concluído')), h('td', folgaEl(s.folga)), h('td', fmt.num(s.equipe) + ' → ' + fmt.num(s.necessaria)))))))
        : h('p.mudo', 'Nenhum serviço desta empreiteira nas prumadas escolhidas.'),
      r.linhas.length ? h('div.tabela-wrap', h('table.tab.rel-linhas',
        h('thead', h('tr', ['Apto', 'Pav', 'Final', variosServ ? 'Serviço' : null, 'Situação', 'Precisa estar pronto', 'Previsto no ritmo atual', 'Data-limite', 'Pend.'].filter(Boolean).map(t => h('th', t)))),
        h('tbody', r.linhas.map(l => h('tr', h('td', h('b', l.apto)), h('td', l.pav), h('td', l.final), variosServ ? h('td', l.servico) : null,
          h('td', h('span.pill.' + ({ 'Executado': 'ok', 'Em execução': 'and', 'Liberado': 'lib', 'Bloqueado': 'blq' }[l.situacao] || 'blq'), l.situacao), l.atrasado ? h('span.neg.peq', ' atrasado') : null),
          h('td', h('b', fmt.dataOu(l.dataNecessaria))), h('td', typeof l.previsto === 'number' && typeof l.dataNecessaria === 'number' && l.previsto > l.dataNecessaria ? h('span.neg', fmt.data(l.previsto)) : fmt.dataOu(l.previsto)),
          h('td', fmt.data(l.limite)), h('td', l.pendencias ? '⚠ ' + l.pendencias : ''))))))
        : h('p.mudo', 'Nenhum apto pendente.'),
      h('p.mudo.peq', { style: { marginTop: '12px' } }, '"Precisa estar pronto" é a data máxima para o apto terminar o serviço sem atrasar a entrega. "Previsto" é a data no ritmo atual; em vermelho quando passa do necessário. Bloqueado = aguarda o serviço anterior.'));
    el.appendChild(folha);
  }
  PA.ui.registrarTela('relatorios', { titulo: 'Relatórios por empreiteira', menu: 'Relatórios', icone: 'imprimir', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
