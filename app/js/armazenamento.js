/* Armazenamento do estado. v1 = localStorage do navegador. Para vários usuários no futuro,
   troque este adaptador por um que fale com um servidor (mesmos métodos: carregar, salvar). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  const CHAVE = 'pa.estado.v1';

  function criar(backend) {
    let disponivel = false;
    if (backend) {
      try { backend.getItem(CHAVE); disponivel = true; } catch (e) { disponivel = false; }
    }
    const api = {
      disponivel, corrompido: false,
      carregar() {
        if (!disponivel) return null;
        let s = null;
        try { s = backend.getItem(CHAVE); } catch (e) { return null; }
        if (!s) return null;
        try { return JSON.parse(s); } catch (e) {
          // Guarda o conteúdo ilegível antes que um novo salvamento o sobrescreva.
          try { backend.setItem(CHAVE + '.corrompido', s); } catch (e2) { /* ignora */ }
          api.corrompido = true;
          return null;
        }
      },
      salvar(estado) {
        if (!disponivel) return { ok: false, erro: 'indisponivel' };
        try { backend.setItem(CHAVE, JSON.stringify(estado)); return { ok: true }; } catch (e) {
          return { ok: false, erro: (e && (e.name === 'QuotaExceededError' || e.code === 22)) ? 'cota' : 'falha' };
        }
      },
      limpar() { if (disponivel) try { backend.removeItem(CHAVE); } catch (e) { /* ignora */ } }
    };
    return api;
  }
  PA.armazenamento = { criar, CHAVE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
