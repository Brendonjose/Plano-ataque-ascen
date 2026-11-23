/* Tela Alterações — histórico de quem mudou o quê e quando (admin e obra, modo servidor). */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, select } = PA.ui;
  const ROT = { lancamentos: 'Lançamento', equipes: 'Equipe', pendencias: 'Pendência', manuais: 'Coluna manual', semanas: 'Histórico semanal', parametros: 'Parâmetro', importacao: 'Importação' };
  const ACAO = { criar: 'criou', alterar: 'alterou', apagar: 'apagou', importar: 'importou' };

  function descreve(a) {
    const d = a.depois || a.antes || {};
    if (a.tabela === 'lancamentos') {
      const s = PA.modelo.POR_ID[d.servico];
      const cod = x => (x ? (x.codigo || 'automático') + (x.obs ? ' · "' + x.obs + '"' : '') : '—');
      return { alvo: (s ? s.nome : d.servico) + ' · apto ' + d.apto, apto: d.apto, servico: d.servico, de: cod(a.antes), para: cod(a.depois) };
    }
    if (a.tabela === 'equipes') return { alvo: 'Equipe ' + d.chave, de: a.antes ? a.antes.equipe : '—', para: a.depois ? a.depois.equipe : '—' };
    if (a.tabela === 'pendencias') return { alvo: 'Pendência apto ' + d.apto, apto: d.apto, de: a.antes ? a.antes.status : '—', para: a.depois ? a.depois.status + ' · ' + (a.depois.descricao || '') : 'apagada' };
    if (a.tabela === 'manuais') return { alvo: d.etapa + ' · apto ' + d.apto, apto: d.apto, de: a.antes ? a.antes.valor : '—', para: a.depois ? a.depois.valor : '—' };
    if (a.tabela === 'semanas') return { alvo: 'Semana ' + d.semana, de: '', para: '' };
    if (a.tabela === 'parametros') return { alvo: 'Parâmetro ' + d.chave, de: '', para: '' };
    return { alvo: (a.depois && a.depois.registros ? a.depois.registros + ' registros' : ''), de: '', para: '' };
  }
  const quando = iso => { const d = new Date(String(iso).replace(' ', 'T')); return isNaN(d) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };

  function render(el, ctx) {
    const f = ctx.ui.filtroAlt || { pessoa: '', apto: '', servico: '', pagina: 1 };
    const set = (k, v) => { ctx.ui.filtroAlt = Object.assign({}, f, { [k]: v, pagina: k === 'pagina' ? v : 1 }); PA.ui.desenhar(); };
    const corpo = h('div', h('p.mudo', 'Carregando…'));
    const pessoas = h('select', { onchange: e => set('pessoa', e.target.value) }, h('option', { value: '' }, '(Todas)'));
    el.appendChild(h('div.cartao',
      h('div.linha', { style: { marginBottom: '12px' } },
        h('label.campo', 'Pessoa', pessoas),
        h('label.campo', 'Apto', h('input', { type: 'number', value: f.apto, style: { width: '90px' }, onchange: e => set('apto', e.target.value) })),
        h('label.campo', 'Serviço', select([['', '(Todos)'], ...PA.modelo.SERVICOS.map(s => [s.id, s.nome])], f.servico, v => set('servico', v)))),
      corpo));
    (async () => {
      try {
        const pb = ctx.dados.pb;
        const users = await pb.collection('users').getFullList({ fields: 'id,nome,email' });
        const nomes = {}; users.forEach(u => { nomes[u.id] = u.nome || u.email || u.id; pessoas.appendChild(h('option', { value: u.id, selected: f.pessoa === u.id }, nomes[u.id])); });
        const filtro = f.pessoa ? pb.filter('por = {:p}', { p: f.pessoa }) : '';
        const pag = await ctx.dados.alteracoes.listar(f.pagina, filtro);
        let itens = pag.items.map(a => Object.assign({ a }, descreve(a)));
        if (f.apto) itens = itens.filter(x => String(x.apto) === String(f.apto));
        if (f.servico) itens = itens.filter(x => x.servico === f.servico);
        corpo.innerHTML = '';
        corpo.appendChild(itens.length ? h('div.tabela-wrap', h('table.tab',
          h('thead', h('tr', ['Quando', 'Quem', 'O quê', 'Onde', 'Antes', 'Depois'].map(t => h('th', t)))),
          h('tbody', itens.map(x => h('tr', h('td', quando(x.a.em)), h('td', nomes[x.a.por] || '—'), h('td', (ROT[x.a.tabela] || x.a.tabela) + ' · ' + (ACAO[x.a.acao] || x.a.acao)),
            h('td', x.alvo), h('td.peq', String(x.de)), h('td.peq', String(x.para)))))))
          : h('p.mudo', 'Nenhuma alteração com estes filtros nesta página.'));
        corpo.appendChild(h('div.linha', { style: { marginTop: '10px' } },
          h('button.btn.peq', { disabled: f.pagina <= 1, onclick: () => set('pagina', f.pagina - 1) }, '← Mais recentes'),
          h('span.mudo.peq', `Página ${pag.page} de ${Math.max(1, pag.totalPages)}`),
          h('button.btn.peq', { disabled: pag.page >= pag.totalPages, onclick: () => set('pagina', f.pagina + 1) }, 'Mais antigas →')));
      } catch (e) { corpo.innerHTML = ''; corpo.appendChild(h('p', { style: { color: 'var(--late)' } }, 'Não foi possível carregar: ' + e.message)); }
    })();
  }
  PA.ui.registrarTela('alteracoes', { titulo: 'Histórico de alterações', menu: 'Alterações', icone: 'historico', perfis: ['admin', 'obra'], servidor: true, render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
