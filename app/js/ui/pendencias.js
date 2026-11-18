/* Tela Pendências — lista por apartamento com cadastro rápido. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, modal, select, icone, confirmar } = PA.ui;
  const M = PA.modelo;
  const ETAPAS = ['Geral', ...M.ETAPAS_QUADRO.map(e => e.col)];

  function formulario(ctx, p) {
    const novo = !p;
    p = p || { apto: '', etapa: 'Geral', descricao: '', responsavel: '', abertura: PA.datas.hojeSerial(), prazo: null, status: 'Aberta', resolvidaEm: null, obs: '' };
    const aptoSel = select([['', 'Escolha…'], ...M.APTOS.slice().sort((a, b) => a.apto - b.apto).map(a => [a.apto, a.apto])], p.apto, () => {});
    const etapaSel = select(ETAPAS, p.etapa, () => {});
    const desc = h('textarea', {}, p.descricao);
    const resp = h('input', { value: p.responsavel, list: 'lista-resp' });
    const dIn = v => h('input', { type: 'date', value: typeof v === 'number' ? PA.datas.paraISO(v) : '' });
    const ab = dIn(p.abertura), pr = dIn(p.prazo), rs = dIn(p.resolvidaEm);
    const st = select(['Aberta', 'Resolvida'], p.status, () => {});
    const obs = h('input', { value: p.obs });
    const nomes = [...new Set(ctx.estado.pendencias.map(x => x.responsavel).filter(Boolean))];
    const dl = h('datalist#lista-resp', nomes.map(n => h('option', { value: n })));
    const ler = el => (el.value ? PA.datas.deISO(el.value) : null);
    const salvar = () => {
      if (!aptoSel.value || !desc.value.trim()) { PA.ui.toast('Informe o apto e a descrição.'); return; }
      const campos = { apto: Number(aptoSel.value), etapa: etapaSel.value, descricao: desc.value.trim(), responsavel: resp.value.trim(), abertura: ler(ab), prazo: ler(pr), status: st.value,
        resolvidaEm: st.value === 'Resolvida' ? (ler(rs) || PA.datas.hojeSerial()) : null, obs: obs.value.trim() };
      m.fechar();
      PA.ui.aplicar(novo ? PA.acoes.pendencia.criar(ctx.estado, campos) : PA.acoes.pendencia.editar(ctx.estado, p.id, campos), { msg: novo ? 'Pendência criada' : 'Pendência atualizada' });
    };
    const m = modal(novo ? 'Nova pendência' : 'Pendência nº ' + p.n, [
      h('div.grade-cartoes.g2', { style: { gap: '10px' } }, h('label.campo', 'Apto', aptoSel), h('label.campo', 'Etapa', etapaSel)),
      h('label.campo', 'Descrição da pendência', desc), h('label.campo', 'Responsável', resp, dl),
      h('div.grade-cartoes.g2', { style: { gap: '10px' } }, h('label.campo', 'Abertura', ab), h('label.campo', 'Prazo', pr), h('label.campo', 'Status', st), h('label.campo', 'Resolvida em', rs)),
      h('label.campo', 'Observação', obs)], [h('button.btn', { onclick: () => m.fechar() }, 'Cancelar'), h('button.btn.prim', { onclick: salvar }, 'Salvar')]);
  }

  function render(el, ctx) {
    const P = ctx.resultado.pendencias;
    const f = ctx.ui.filtroPend || { status: 'Aberta', final: '', texto: '' };
    const set = (k, v) => { ctx.ui.filtroPend = Object.assign({}, f, { [k]: v }); PA.ui.desenhar(); };
    const lista = P.lista.filter(p => (!f.status || p.status === f.status) && (!f.final || String(p.final) === String(f.final)) &&
      (!f.texto || (p.apto + ' ' + p.etapa + ' ' + p.descricao + ' ' + p.responsavel).toLowerCase().includes(f.texto.toLowerCase())));
    const k = (cls, r, v) => h('div.kpi.' + cls, h('div.r', r), h('div.v', v));
    el.appendChild(h('div.pilha',
      h('div.kpis', { style: { gridTemplateColumns: 'repeat(3, minmax(0, 220px))' } }, k('and', 'Abertas', P.abertas), k('ok', 'Resolvidas', P.resolvidas), k('late', 'Atrasadas', P.atrasadas)),
      h('div.cartao',
        h('div.linha', { style: { marginBottom: '12px', justifyContent: 'space-between' } },
          h('div.linha', h('label.campo', 'Status', select([['', '(Todas)'], 'Aberta', 'Resolvida'], f.status, v => set('status', v))),
            h('label.campo', 'Prumada', select([['', '(Todas)'], ['1', 'Final 1'], ['2', 'Final 2'], ['3', 'Final 3'], ['4', 'Final 4']], f.final, v => set('final', v))),
            h('label.campo', 'Buscar', h('input', { value: f.texto, placeholder: 'apto, etapa, texto…', onchange: e => set('texto', e.target.value) }))),
          h('button.btn.prim', { onclick: () => formulario(ctx) }, icone('mais'), 'Nova pendência')),
        lista.length ? h('div.tabela-wrap', h('table.tab',
          h('thead', h('tr', ['Nº', 'Apto', 'Final', 'Etapa', 'Descrição', 'Responsável', 'Abertura', 'Prazo', 'Status', ''].map(t => h('th', t)))),
          h('tbody', lista.map(p => h('tr',
            h('td', p.n), h('td', h('b', p.apto)), h('td', p.final), h('td', p.etapa), h('td', { style: { whiteSpace: 'normal', minWidth: '260px' } }, p.descricao), h('td', p.responsavel),
            h('td', fmt.data(p.abertura)), h('td', p.atrasada ? h('b.neg', fmt.data(p.prazo)) : fmt.data(p.prazo)),
            h('td', h('span.pill.' + (p.status === 'Resolvida' ? 'ok' : (p.atrasada ? 'late' : 'and')), p.status + (p.atrasada ? ' · atrasada' : ''))),
            h('td', h('div.linha', { style: { gap: '4px', flexWrap: 'nowrap' } },
              p.status === 'Aberta' ? h('button.btn.peq', { title: 'Marcar como resolvida', onclick: () => PA.ui.aplicar(PA.acoes.pendencia.editar(ctx.estado, p.id, { status: 'Resolvida', resolvidaEm: PA.datas.hojeSerial() }), { msg: 'Pendência ' + p.n + ' resolvida' }) }, icone('check')) : null,
              h('button.btn.peq', { onclick: () => formulario(ctx, p) }, 'Editar'),
              h('button.btn.peq', { title: 'Excluir', onclick: async () => { if (await confirmar('Excluir pendência?', p.descricao, 'Excluir')) PA.ui.aplicar(PA.acoes.pendencia.remover(ctx.estado, p.id), { msg: 'Pendência excluída' }); } }, icone('lixo')))))))))
          : h('p.mudo', 'Nenhuma pendência com estes filtros.'))));
  }
  PA.ui.registrarTela('pendencias', { titulo: 'Pendências por apartamento', menu: 'Pendências', icone: 'pendencias', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
