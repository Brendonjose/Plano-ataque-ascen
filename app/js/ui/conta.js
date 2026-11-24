/* Tela Minha conta — dados do usuário e troca da própria senha (modo servidor). */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, toast } = PA.ui;
  const PAPEL = { admin: 'Administrador', obra: 'Obra', diretoria: 'Diretoria', empreiteira: 'Empreiteira' };
  function render(el, ctx) {
    const u = ctx.usuario;
    const atual = h('input', { type: 'password', autocomplete: 'current-password' });
    const nova = h('input', { type: 'password', autocomplete: 'new-password' });
    const rep = h('input', { type: 'password', autocomplete: 'new-password' });
    const erro = h('p.peq', { style: { color: 'var(--late)', margin: 0 } });
    el.appendChild(h('div.grade-cartoes.g2',
      h('div.cartao', h('h2', 'Meus dados'), h('div.info-grade',
        h('div', h('b', 'Nome'), u.nome), h('div', h('b', 'E-mail'), u.email || '—'),
        h('div', h('b', 'Perfil'), PAPEL[u.papel] || u.papel), h('div', h('b', 'Empresa'), u.empreiteira || '—'))),
      h('div.cartao', h('h2', 'Trocar senha'), h('div.pilha', { style: { gap: '10px' } },
        h('label.campo', 'Senha atual', atual), h('label.campo', 'Nova senha (mínimo 8 caracteres)', nova), h('label.campo', 'Repita a nova senha', rep), erro,
        h('button.btn.prim', { onclick: async () => {
          erro.textContent = '';
          if (nova.value.length < 8) { erro.textContent = 'A nova senha precisa ter pelo menos 8 caracteres.'; return; }
          if (nova.value !== rep.value) { erro.textContent = 'As duas senhas novas não são iguais.'; return; }
          try {
            await ctx.dados.usuarios.trocarMinhaSenha(atual.value, nova.value);
            // A troca encerra a sessão: entra de novo com a nova senha.
            ctx.usuario = await ctx.dados.entrar(u.email, nova.value);
            toast('Senha alterada.');
            atual.value = nova.value = rep.value = '';
          } catch (e) { erro.textContent = 'Não foi possível trocar: confira a senha atual.'; }
        } }, 'Trocar senha')))));
  }
  PA.ui.registrarTela('conta', { titulo: 'Minha conta', menu: 'Minha conta', icone: 'config', servidor: true, render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
