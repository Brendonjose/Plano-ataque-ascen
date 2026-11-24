/* Tela de login (modo servidor). */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h } = PA.ui;
  /** Formulário de login. aoEntrar(usuario) é chamado depois do sucesso. */
  function formulario(dados, aoEntrar, aviso) {
    const email = h('input', { type: 'email', autocomplete: 'username', required: true, placeholder: 'seu@email.com' });
    const senha = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    const erro = h('p.peq', { style: { color: 'var(--late)', minHeight: '18px', margin: 0 } }, '');
    const btn = h('button.btn.prim', { type: 'submit', style: { width: '100%', justifyContent: 'center' } }, 'Entrar');
    const form = h('form.pilha', { style: { gap: '12px', textAlign: 'left' }, onsubmit: async ev => {
      ev.preventDefault(); erro.textContent = ''; btn.disabled = true; btn.textContent = 'Entrando…';
      try { const u = await dados.entrar(email.value.trim(), senha.value); await aoEntrar(u); }
      catch (e) { erro.textContent = e.message; btn.disabled = false; btn.textContent = 'Entrar'; }
    } }, aviso ? h('p.peq', { style: { color: 'var(--and)', margin: 0 } }, aviso) : null,
    h('label.campo', 'E-mail', email), h('label.campo', 'Senha', senha), erro, btn,
    h('p.mudo.peq', { style: { margin: 0 } }, 'Esqueceu a senha? Peça ao administrador para redefinir.'));
    // Só põe o cursor no e-mail se a pessoa ainda não começou a digitar em outro campo.
    setTimeout(() => { if (!form.contains(document.activeElement)) email.focus(); }, 30);
    return form;
  }
  function tela(dados, aoEntrar, aviso) {
    return h('div.boas-vindas', { style: { maxWidth: '380px' } },
      h('img', { src: 'img/logo_Ventisette.png', alt: 'Ventisette' }),
      h('h2', 'Plano de Ataque'), h('p.mudo', 'Entre com o seu e-mail e senha.'),
      h('div.cartao', { style: { marginTop: '16px' } }, formulario(dados, aoEntrar, aviso)));
  }
  PA.ui.login = { tela, formulario };
})(typeof globalThis !== 'undefined' ? globalThis : this);
