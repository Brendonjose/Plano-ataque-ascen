/* Adaptador de dados — modo local (um computador, dados no navegador), como na v1. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.dados = PA.dados || {};
  function criar(armazenamento) {
    let ultimo = null;
    return {
      modo: 'local',
      armazenamento,
      usuario: () => ({ id: 'local', nome: 'Este computador', papel: 'admin', empreiteira: '' }),
      entrar: async () => ({ id: 'local', papel: 'admin' }),
      sair: () => {},
      renovar: async () => ({ id: 'local', papel: 'admin' }),
      carregar: async () => armazenamento.carregar(),
      /** No modo local grava o estado inteiro (as operações servem só para o desfazer conferido). */
      gravar: async (ops, estadoNovo) => {
        const r = armazenamento.salvar(estadoNovo);
        ultimo = r;
        return r.ok ? { ok: true, falhas: [] } : { ok: false, falhas: ops.map(op => ({ op, motivo: r.erro === 'cota' ? 'cota' : 'armazenamento' })) };
      },
      importarTudo: async estado => { armazenamento.salvar(estado); },
      aoMudar: async () => {},
      pararTempoReal: () => {},
      versaoLocal: () => null,
      versoesServidor: async () => ({}),
      ultimoResultado: () => ultimo
    };
  }
  PA.dados.local = { criar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
