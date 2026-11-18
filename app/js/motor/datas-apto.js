/* Motor — término previsto por apartamento (BASE!AE) e data necessária (BASE!AF). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  const isNum = v => typeof v === 'number' && isFinite(v);

  function datasApto(estado, hoje, itens, cron) {
    const M = PA.modelo, D = PA.datas, ru = PA.motor._roundup;
    const fer = new Set(estado.feriados);
    const chave = {};
    itens.forEach(it => { chave[it.ordem + '|' + it.apto] = it; });
    // Término previsto (sobe a prumada de baixo para cima; nunca antes do anterior + ciclo).
    for (const s of M.SERVICOS) {
      const L = cron.porOrdem[s.ordem];
      for (const it of itens) {
        if (it.ordem !== s.ordem) continue;
        if (!it.pendente) { it.terminoPrevisto = null; continue; }
        const f = it.final;
        const ini = L.inicioPrumada[f], fim = L.term[f];
        const denom = it.prioridadeFila === 0 ? L.saldoAcum[f] : it.tamanhoGrupo;
        if (!isNum(ini) || !isNum(fim) || !denom) { it.terminoPrevisto = null; continue; }
        let t = D.workday(ini - 1, ru(D.networkdays(ini, fim, fer) * it.posicaoFila / denom, 0), fer);
        for (const p of s.predsCron) {
          const pa = chave[p + '|' + it.apto];
          if (pa && isNum(pa.terminoPrevisto)) t = Math.max(t, D.workday(pa.terminoPrevisto, ru(L.ciclo, 0), fer));
        }
        it.terminoPrevisto = t;
      }
    }
    // Data necessária: comprime pelo fator e respeita o sucessor (de trás para frente).
    for (let o = 12; o >= 1; o--) {
      const s = M.POR_ORDEM[o];
      const L = cron.porOrdem[o];
      for (const it of itens) {
        if (it.ordem !== o) continue;
        const ae = it.terminoPrevisto;
        if (!isNum(ae)) { it.dataNecessaria = null; continue; }
        const comprimida = ae <= hoje ? ae
          : D.workday(hoje - 1, Math.max(1, ru(Math.round(L.fator[it.final] * D.networkdays(hoje, ae, fer) * 1e6) / 1e6, 0)), fer);
        let lim = 2958465;
        if (s.suc) {
          const su = chave[s.suc + '|' + it.apto];
          if (su && isNum(su.dataNecessaria)) lim = D.workday(su.dataNecessaria, -ru(cron.porOrdem[s.suc].ciclo, 0), fer);
        }
        it.dataNecessaria = Math.max(Math.min(hoje, ae), Math.min(comprimida, lim));
      }
    }
    return itens;
  }
  PA.motor.datasApto = datasApto;
})(typeof globalThis !== 'undefined' ? globalThis : this);
