/* Tela Usuários (só administrador, modo servidor): criar, ativar/desativar, perfil, empresa e senha. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, modal, select, icone, toast } = PA.ui;
  const PAPEIS = [['admin', 'Administrador'], ['obra', 'Obra (lança)'], ['diretoria', 'Diretoria (consulta)'], ['empreiteira', 'Empreiteira (consulta)']];
  const nomePapel = p => (PAPEIS.find(x => x[0] === p) || [p, p])[1];

  function formulario(ctx, u, aoSalvar) {
    const novo = !u;
    const nome = h('input', { value: u ? u.nome : '' });
    const email = h('input', { type: 'email', value: u ? u.email : '', disabled: !novo });
    const senha = h('input', { type: 'text', autocomplete: 'off', placeholder: novo ? 'mínimo 8 caracteres' : 'deixe vazio para não trocar' });
    const papel = select(PAPEIS, u ? u.papel : 'obra', () => {});
    const { unicas } = PA.motor.empreiteiras(ctx.estado, ctx.resultado.cron);
    const emp = h('input', { value: u ? u.empreiteira || '' : '', list: 'lista-emp', placeholder: 'igual ao nome usado na planilha' });
    const dl = h('datalist#lista-emp', unicas.map(n => h('option', { value: n.trim() })));
    const ativo = h('input', { type: 'checkbox', checked: u ? !!u.ativo : true });
    const erro = h('p.peq', { style: { color: 'var(--late)', margin: 0 } });
    const salvar = async () => {
      erro.textContent = '';
      const d = { nome: nome.value.trim(), papel: papel.value, empreiteira: papel.value === 'empreiteira' ? emp.value.trim() : '', ativo: ativo.checked };
      if (!d.nome) { erro.textContent = 'Informe o nome.'; return; }
      if (d.papel === 'empreiteira' && !d.empreiteira) { erro.textContent = 'Informe a empresa da empreiteira.'; return; }
      if (novo) { d.email = email.value.trim(); d.password = senha.value; }
      else if (senha.value) d.password = senha.value;
      if ((novo || senha.value) && senha.value.length < 8) { erro.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
      try {
        if (novo) await ctx.dados.usuarios.criar(d); else await ctx.dados.usuarios.alterar(u.id, d);
        m.fechar(); toast(novo ? 'Usuário criado.' : 'Usuário atualizado.'); aoSalvar();
      } catch (e) {
        const det = e && e.response && e.response.data ? Object.entries(e.response.data).map(([k, v]) => k + ': ' + (v.message || v.code)).join('; ') : '';
        erro.textContent = 'Não foi possível salvar. ' + (det || e.message || '');
      }
    };
    const m = modal(novo ? 'Novo usuário' : 'Editar usuário', [
      h('label.campo', 'Nome', nome), h('label.campo', 'E-mail', email),
      h('label.campo', novo ? 'Senha inicial' : 'Nova senha', senha),
      h('label.campo', 'Perfil', papel), h('label.campo', 'Empresa (para empreiteira)', emp, dl),
      h('label.linha.peq', ativo, ' Ativo (pode entrar no sistema)'), erro],
      [h('button.btn', { onclick: () => m.fechar() }, 'Cancelar'), h('button.btn.prim', { onclick: salvar }, 'Salvar')]);
  }

  function render(el, ctx) {
    const corpo = h('div.cartao', h('p.mudo', 'Carregando…'));
    el.appendChild(h('div.pilha',
      h('div.linha', { style: { justifyContent: 'space-between' } },
        h('p.mudo.peq', { style: { margin: 0 } }, 'Cada pessoa tem o seu login. Para tirar o acesso de alguém, desmarque "Ativo". Senha esquecida: edite o usuário e defina uma nova.'),
        h('button.btn.prim', { onclick: () => formulario(ctx, null, recarregar) }, icone('mais'), 'Novo usuário')),
      corpo));
    async function recarregar() {
      try {
        const lista = await ctx.dados.usuarios.listar();
        corpo.innerHTML = '';
        corpo.appendChild(h('div.tabela-wrap', h('table.tab',
          h('thead', h('tr', ['Nome', 'E-mail', 'Perfil', 'Empresa', 'Situação', ''].map(t => h('th', t)))),
          h('tbody', lista.map(u => h('tr', h('td', h('b', u.nome || '—')), h('td', u.email || '—'), h('td', nomePapel(u.papel)), h('td', u.empreiteira || ''),
            h('td', h('span.pill.' + (u.ativo ? 'ok' : 'blq'), u.ativo ? 'Ativo' : 'Desativado')),
            h('td', h('button.btn.peq', { onclick: () => formulario(ctx, u, recarregar) }, 'Editar'))))))));
      } catch (e) { corpo.innerHTML = ''; corpo.appendChild(h('p', { style: { color: 'var(--late)' } }, 'Não foi possível carregar os usuários: ' + e.message)); }
    }
    recarregar();
  }
  PA.ui.registrarTela('usuarios', { titulo: 'Usuários e acessos', menu: 'Usuários', icone: 'config', perfis: ['admin'], servidor: true, render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
