/* Fila de envio: guarda as operações no aparelho e envia em ordem; resiste a queda de internet e recarga.
   - Cada fila pertence a um usuário e só envia com a sessão DELE.
   - Várias abas do mesmo usuário compartilham a fila: o armazenamento é relido antes de cada mudança. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.dados = PA.dados || {};

  function criar(dados, dono, cb) {
    cb = cb || {};
    const K = 'pa.fila.' + dono;
    const ls = () => root.localStorage;
    const ler = () => { try { return JSON.parse(ls().getItem(K) || '[]'); } catch (e) { return []; } };
    const salvar = f => { try { ls().setItem(K, JSON.stringify(f)); } catch (e) { /* sem espaço */ } };
    const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    let processando = false, timer = null, parado = false;
    const aoOnline = () => processar();
    if (root.addEventListener) root.addEventListener('online', aoOnline);
    function agendar(ms) { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = null; processar(); }, ms); }
    const meu = () => { const u = dados.usuario && dados.usuario(); return !!u && u.id === dono; };

    async function rodar() {
      while (!parado) {
        const fila = ler();
        if (!fila.length) break;
        if (!meu()) { parado = true; break; } // sessão de outra pessoa: não envia
        const op = fila[0];
        const r = await dados.gravar([op]);
        if (r.ok) {
          // Remove do armazenamento atual (outra aba pode ter acrescentado itens).
          const atual = ler(); const i = atual.findIndex(x => igual(x, op)); if (i >= 0) { atual.splice(i, 1); salvar(atual); }
          if (cb.sucesso) cb.sucesso(op); if (cb.mudou) cb.mudou(ler().length);
          continue;
        }
        const f = r.falhas[0];
        if (f.motivo === 'rede') { if (cb.mudou) cb.mudou(fila.length, 'rede'); agendar(15000); break; }
        if (f.motivo === 'sessao') { parado = true; if (cb.sessao) cb.sessao(); break; }
        const atual = ler(); const i = atual.findIndex(x => igual(x, op)); if (i >= 0) { atual.splice(i, 1); salvar(atual); }
        if (cb.recusa) cb.recusa(op, f); if (cb.mudou) cb.mudou(ler().length);
      }
    }
    async function processar() {
      if (processando || parado) return;
      processando = true;
      try {
        // Entre abas do mesmo navegador, só uma envia por vez.
        if (root.navigator && root.navigator.locks) await root.navigator.locks.request(K, () => rodar());
        else await rodar();
      } finally { processando = false; }
    }
    return {
      dono,
      enviar(ops) { if (!ops.length) return; const f = ler(); f.push(...ops); salvar(f); if (cb.mudou) cb.mudou(f.length); processar(); },
      pendentes: () => ler().length,
      ops: () => ler(),
      retomar() { parado = false; processar(); },
      parar() { parado = true; if (timer) clearTimeout(timer); timer = null; if (root.removeEventListener) root.removeEventListener('online', aoOnline); },
      processar
    };
  }
  PA.dados.fila = { criar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
