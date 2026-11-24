/* Tela Reprovas — ranking do que mais reprova nas vistorias, para corrigir antes das próximas entregas. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, select } = PA.ui;
  function render(el, ctx) {
    const f = ctx.ui.filtroRep || {};
    const set = (k, v) => { ctx.ui.filtroRep = Object.assign({}, f, { [k]: v || null }); PA.ui.desenhar(); };
    const R = PA.motor.reprovas(ctx.estado, ctx.resultado, f);
    if (!ctx.usuariosLista) PA.ui.carregarUsuarios(ctx).then(() => { if (ctx.usuariosLista && ctx.usuariosLista.length) PA.ui.desenhar(); });
    const cats = [...new Set(PA.modelo.categoriasReprova(ctx.estado).map(c => c.nome).concat(R.porCategoria.map(c => c.categoria)))];
    const data = k => h('input', { type: 'date', value: typeof f[k] === 'number' ? PA.datas.paraISO(f[k]) : '', onchange: e => set(k, e.target.value ? PA.datas.deISO(e.target.value) : null) });
    el.appendChild(h('div.cartao', { style: { padding: '12px 16px', marginBottom: '14px' } }, h('div.linha', { style: { alignItems: 'flex-end' } },
      h('label.campo', 'Prumada', select([['', '(Todas)'], 'Final 1', 'Final 2', 'Final 3', 'Final 4', 'Finais 1-2', 'Finais 3-4'], f.prumada || '', v => set('prumada', v))),
      h('label.campo', 'Categoria', select([['', '(Todas)'], ...cats], f.categoria || '', v => set('categoria', v))),
      h('label.campo', 'De', data('de')), h('label.campo', 'Até', data('ate')))));
    const maxC = Math.max(1, ...R.porCategoria.map(x => x.ocorrencias));
    const barras = (lista, nome) => h('div.ranking-barras.pilha', { style: { gap: '8px' } }, lista.length ? lista.map((x, i) => h('div', { style: { display: 'grid', gridTemplateColumns: '24px minmax(0, 160px) minmax(0, 1fr) 90px', gap: '8px', alignItems: 'center' } },
      h('b.mudo', (i + 1) + 'º'), h('b', x[nome]), h('span.barra', { style: { height: '10px' } }, h('i', { style: { width: (x.ocorrencias / maxC * 100).toFixed(1) + '%', background: 'var(--late)' } })),
      h('span.peq', x.ocorrencias + ' · ' + x.aptos + ' apto' + (x.aptos > 1 ? 's' : ''))))
      : h('p.mudo', 'Nenhuma reprova registrada neste recorte.'));
    el.appendChild(h('div.grade-cartoes.g2',
      h('div.cartao', h('h2', 'O que mais reprova', h('small', 'ocorrências · aptos afetados')), barras(R.porCategoria, 'categoria')),
      h('div.cartao', h('h2', 'Por empreiteira responsável'), barras(R.porEmpreiteira, 'empreiteira'))));
    el.appendChild(h('div.cartao', { style: { marginTop: '14px' } }, h('h2', 'Reprovas registradas', h('small', R.lista.length + ' motivo(s)')),
      R.lista.length ? h('div.tabela-wrap', h('table.tab',
        h('thead', h('tr', ['Data', 'Apto', 'Vistoria', 'Categoria', 'O que o cliente apontou', 'Responsável', 'Acompanhou'].map(t => h('th', t)))),
        h('tbody', R.lista.map(x => h('tr', { style: { cursor: 'pointer' }, onclick: () => PA.ui.abrirVistoria(ctx, x.apto) }, h('td', fmt.dataOu(x.data)), h('td', h('b', x.apto)), h('td', x.numero + 'ª'),
          h('td', x.categoria), h('td', { style: { whiteSpace: 'normal' } }, x.descricao), h('td', x.empreiteira || '—'), h('td', PA.ui.nomeAcomp(ctx, x.acompanhadoPor)))))))
        : h('p.mudo', 'Nenhuma reprova registrada.')));
  }
  PA.ui.registrarTela('reprovas', { titulo: 'Reprovas · o que mais reprova', menu: 'Reprovas', icone: 'pendencias', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
