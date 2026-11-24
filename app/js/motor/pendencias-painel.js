/* Motor — bloco de pendências do Painel (por prumada, responsável e apto). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  function pendenciasPainel(res, f) {
    f = f || {};
    const grupoDe = final => (final <= 2 ? 'Finais 1-2' : 'Finais 3-4');
    const lista = res.pendencias.lista.filter(p => {
      const final = typeof p.apto === 'number' ? p.apto % 10 : null, pav = typeof p.apto === 'number' ? Math.floor(p.apto / 10) : null;
      return (!f.prumada || f.prumada === 'Final ' + final || f.prumada === grupoDe(final)) && (!f.pavimento || pav === Number(f.pavimento));
    });
    const abertas = lista.filter(p => p.status === 'Aberta');
    const porPrumada = {};
    abertas.forEach(p => { porPrumada[p.final] = (porPrumada[p.final] || 0) + 1; });
    const resp = {};
    abertas.forEach(p => { const k = p.responsavel || '(sem responsável)'; const r = resp[k] = resp[k] || { responsavel: k, abertas: 0, atrasadas: 0 }; r.abertas++; if (p.atrasada) r.atrasadas++; });
    const aptos = {};
    abertas.forEach(p => {
      const a = aptos[p.apto] = aptos[p.apto] || { apto: p.apto, qtd: 0, etapas: [], prazoMaisProximo: null, atrasadas: 0 };
      a.qtd++; if (!a.etapas.includes(p.etapa)) a.etapas.push(p.etapa);
      if (typeof p.prazo === 'number' && (a.prazoMaisProximo === null || p.prazo < a.prazoMaisProximo)) a.prazoMaisProximo = p.prazo;
      if (p.atrasada) a.atrasadas++;
    });
    return {
      abertas: abertas.length, atrasadas: lista.filter(p => p.atrasada === 'Sim').length, resolvidas: lista.filter(p => p.status === 'Resolvida').length,
      porPrumada, porResponsavel: Object.values(resp).sort((a, b) => b.abertas - a.abertas),
      aptos: Object.values(aptos).sort((a, b) => b.atrasadas - a.atrasadas || (a.prazoMaisProximo || Infinity) - (b.prazoMaisProximo || Infinity) || a.apto - b.apto)
    };
  }
  PA.motor.pendenciasPainel = pendenciasPainel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
