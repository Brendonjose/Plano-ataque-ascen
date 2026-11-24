/* Prévia: força o modo local e, sem dados salvos neste navegador, começa pelos dados embutidos (PA_PREVIA). */
(function (root) {
  'use strict';
  const PA = root.PA;
  root.PA_CONFIG = Object.assign(root.PA_CONFIG || {}, { modo: 'local' });
  const CHAVE = 'pa.estado.previa.v3';
  const criarOriginal = PA.armazenamento.criar;
  PA.armazenamento.criar = function (backend) {
    // Guarda numa chave própria, para não misturar com o modo local da v1.
    const b = backend && {
      getItem: k => backend.getItem(k === PA.armazenamento.CHAVE ? CHAVE : k),
      setItem: (k, v) => backend.setItem(k === PA.armazenamento.CHAVE ? CHAVE : k, v),
      removeItem: k => backend.removeItem(k === PA.armazenamento.CHAVE ? CHAVE : k)
    };
    const a = criarOriginal(b);
    const carregar = a.carregar;
    a.carregar = function () { return carregar.call(a) || JSON.parse(JSON.stringify(root.PA_PREVIA)); };
    return a;
  };
  if (!location.hash) location.hash = '#torre';
})(typeof globalThis !== 'undefined' ? globalThis : this);
