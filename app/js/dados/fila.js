/* Fila de envio: guarda as operações no aparelho e envia em ordem; resiste a queda de internet e recarga. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.dados = PA.dados || {};

  function criar(dados, chave, cb) {
    cb = cb || {};
    const K = 'pa.fila.' + chave;
    let fila = [];
    try { fila = JSON.parse(root.localStorage.getItem(K) || '[]'); } catch (e) { fila = []; }
    let processando = false, timer = null, parado = false;
    const salvar = () => { try { root.localStorage.setItem(K, JSON.stringify(fila)); } catch (e) { /* sem espaço: segue em memória */ } };
    function agendar(ms) { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = null; processar(); }, ms); }
    async function processar() {
      if (processando || parado) return;
      processando = true;
      try {
        while (fila.length) {
          const op = fila[0];
          const r = await dados.gravar([op]);
          if (r.ok) { fila.shift(); salvar(); if (cb.sucesso) cb.sucesso(op); if (cb.mudou) cb.mudou(fila.length); continue; }
          const f = r.falhas[0];
          if (f.motivo === 'rede') { if (cb.mudou) cb.mudou(fila.length, 'rede'); agendar(15000); break; }
          if (f.motivo === 'sessao') { parado = true; if (cb.sessao) cb.sessao(); break; }
          // Recusado pelo servidor (permissão/validação): sai da fila e avisa.
          fila.shift(); salvar(); if (cb.recusa) cb.recusa(op, f); if (cb.mudou) cb.mudou(fila.length);
        }
      } finally { processando = false; }
    }
    if (root.addEventListener) root.addEventListener('online', () => processar());
    return {
      enviar(ops) { if (!ops.length) return; fila.push(...ops); salvar(); if (cb.mudou) cb.mudou(fila.length); processar(); },
      pendentes: () => fila.length,
      ops: () => fila.slice(),
      retomar() { parado = false; processar(); },
      processar
    };
  }
  PA.dados.fila = { criar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
