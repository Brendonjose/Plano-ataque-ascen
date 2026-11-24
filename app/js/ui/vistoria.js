/* Ficha de vistoria do cliente (Entrega): histórico, agendar, aprovar ou reprovar com motivos. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, modal, fmt, toast, select } = PA.ui;

  /** Nome de quem acompanhou: usuário cadastrado (modo servidor) ou o texto digitado (modo local). */
  function nomeAcomp(ctx, v) {
    if (!v) return '—';
    const u = (ctx.usuariosLista || []).find(x => x.id === v);
    return u ? (u.nome || u.email) : v;
  }
  async function carregarUsuarios(ctx) {
    if (!PA.ui.servidor() || ctx.usuariosLista) return;
    try { ctx.usuariosLista = (await ctx.dados.usuarios.listar()).filter(u => u.ativo !== false); } catch (e) { ctx.usuariosLista = []; }
  }
  function campoAcomp(ctx, valor) {
    if (PA.ui.servidor()) {
      const lista = (ctx.usuariosLista || []).filter(u => u.papel !== 'empreiteira');
      return select([['', 'Escolha…'], ...lista.map(u => [u.id, u.nome || u.email])], valor || (ctx.usuario && ctx.usuario.id) || '', () => {});
    }
    const nomes = [...new Set((ctx.estado.vistorias || []).map(v => v.acompanhadoPor).filter(Boolean))];
    return h('span', h('input', { value: valor || '', list: 'lista-acomp', placeholder: 'nome de quem acompanhou' }), h('datalist#lista-acomp', nomes.map(n => h('option', { value: n }))));
  }
  const valorDe = el => (el.tagName === 'SELECT' ? el.value : el.querySelector('input').value.trim());

  async function abrirVistoria(ctx, apto) {
    await carregarUsuarios(ctx);
    const it = ctx.resultado.itens.find(i => i.ordem === 12 && i.apto === apto);
    const sit = PA.motor.situacaoEntrega(ctx.estado, it);
    const vs = sit.vistorias;
    const aberta = vs.filter(v => v.resultado === 'agendada').pop();
    const historico = vs.length ? h('div.tabela-wrap', h('table.tab',
      h('thead', h('tr', ['Nº', 'Agendada', 'Realizada', 'Resultado', 'Motivos', 'Acompanhou'].map(t => h('th', t)))),
      h('tbody', vs.map(v => h('tr', h('td', v.numero + 'ª'), h('td', fmt.dataOu(v.agendada)), h('td', fmt.dataOu(v.realizada)),
        h('td', h('span.pill.' + ({ aprovado: 'ok', reprovado: 'late', agendada: 'lib' }[v.resultado]), { aprovado: 'Aprovado', reprovado: 'Reprovado', agendada: 'Agendada' }[v.resultado])),
        h('td.peq', { style: { whiteSpace: 'normal' } }, (v.motivos || []).map(m => m.categoria + (m.descricao ? ': ' + m.descricao : '')).join(' · ')),
        h('td', nomeAcomp(ctx, v.acompanhadoPor))))))) : h('p.mudo.peq', 'Nenhuma vistoria registrada para este apto.');
    const titulo = h('div', h('h3', 'Apto ' + apto + ' · Vistoria de entrega'), h('div.mudo.peq', sit.rotulo + (it.status === 'Bloqueado' ? ' · ' + it.detalhe : '')));
    if (!PA.ui.pode('lancar')) { modal(titulo, [historico], null, { largo: true }); return; }

    const hojeReal = PA.datas.hojeSerial();
    const dIn = v => h('input', { type: 'date', value: typeof v === 'number' ? PA.datas.paraISO(v) : '' });
    const ler = el => (el.value ? PA.datas.deISO(el.value) : null);
    const agendada = dIn(aberta ? aberta.agendada : null);
    const realizada = dIn(hojeReal);
    const acomp = campoAcomp(ctx, aberta && aberta.acompanhadoPor);
    const obs = h('input', { placeholder: 'observação (opcional)' });
    const cats = PA.modelo.categoriasReprova(ctx.estado).map(c => c.nome);
    const motivos = h('div.pilha', { style: { gap: '6px' } });
    const novoMotivo = () => motivos.appendChild(h('div.linha.motivo', { style: { flexWrap: 'nowrap' } },
      select([['', 'Categoria…'], ...cats], '', () => {}), h('input', { placeholder: 'o que o cliente apontou', style: { flex: 1, minWidth: 0 } }),
      h('button.btn.peq', { title: 'Remover', onclick: ev => ev.currentTarget.parentNode.remove() }, '×')));
    novoMotivo();
    const novaData = dIn(null);
    const blocoReprova = h('div.pilha.oculto', { style: { gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '10px' } },
      h('div.secao-titulo', 'Motivos da reprova'), motivos, h('button.btn.peq', { onclick: novoMotivo }, '+ motivo'),
      h('label.campo', 'Nova vistoria', novaData),
      h('p.mudo.peq', { style: { margin: 0 } }, 'Cada motivo vira uma pendência do apto, no nome da empreiteira da categoria, com prazo na nova vistoria.'),
      h('button.btn.prim', { onclick: () => {
        const ms = [...motivos.querySelectorAll('.motivo')].map(r => ({ categoria: r.querySelector('select').value, descricao: r.querySelector('input').value.trim() })).filter(m => m.categoria);
        if (!ms.length) { toast('Informe pelo menos um motivo.'); return; }
        if (!ler(novaData)) { toast('Informe a data da nova vistoria.'); return; }
        m.fechar();
        PA.ui.aplicar(PA.acoes.vistoria.reprovar(ctx.estado, apto, { realizada: ler(realizada), acompanhadoPor: valorDe(acomp), motivos: ms, novaData: ler(novaData), obs: obs.value.trim() }),
          { msg: `Apto ${apto}: reprovado · ${ms.length} pendência(s) criada(s)` });
      } }, 'Confirmar reprova'));
    const blocoAprova = h('div.oculto', { style: { borderTop: '1px solid var(--line)', paddingTop: '10px' } },
      h('button.btn.prim', { onclick: () => {
        m.fechar();
        PA.ui.aplicar(PA.acoes.vistoria.aprovar(ctx.estado, apto, { realizada: ler(realizada), acompanhadoPor: valorDe(acomp), obs: obs.value.trim() }), { msg: `Apto ${apto}: entrega aprovada` });
      } }, 'Confirmar aprovação'));
    const escolha = qual => { blocoReprova.classList.toggle('oculto', qual !== 'r'); blocoAprova.classList.toggle('oculto', qual !== 'a'); };
    const m = modal(titulo, [
      h('div.secao-titulo', 'Histórico'), historico,
      h('div.secao-titulo', { style: { marginTop: '6px' } }, aberta ? `Vistoria ${aberta.numero}ª` : 'Registrar vistoria'),
      h('div.grade-cartoes.g2', { style: { gap: '10px' } }, h('label.campo', 'Agendada para', agendada), h('label.campo', 'Realizada em', realizada),
        h('label.campo', 'Acompanhado por', acomp), h('label.campo', 'Observação', obs)),
      h('div.linha', h('button.btn', { onclick: () => {
        if (!ler(agendada)) { toast('Informe a data.'); return; }
        m.fechar(); PA.ui.aplicar(PA.acoes.vistoria.agendar(ctx.estado, apto, ler(agendada), valorDe(acomp)), { msg: `Apto ${apto}: vistoria agendada para ${fmt.data(ler(agendada))}` });
      } }, 'Só agendar'),
        h('button.btn.opcao-ok', { onclick: () => escolha('a') }, '✓ Aprovado'), h('button.btn.opcao-rep', { onclick: () => escolha('r') }, '✗ Reprovado')),
      blocoAprova, blocoReprova,
      h('button.btn.peq', { style: { alignSelf: 'flex-start' }, onclick: () => { m.fechar(); PA.ui.abrirLancamento(ctx, 'entrega', [apto], { manual: true }); } }, 'Lançamento manual da entrega')],
    null, { largo: true });
  }
  PA.ui.abrirVistoria = abrirVistoria;
  PA.ui.nomeAcomp = nomeAcomp;
  PA.ui.carregarUsuarios = carregarUsuarios;
})(typeof globalThis !== 'undefined' ? globalThis : this);
