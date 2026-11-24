/* Motor — Painel de Entregas (vistoria do cliente) e ranking de Reprovas. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  const isNum = v => typeof v === 'number' && isFinite(v);
  const naPrumada = (f, apto) => { const a = PA.modelo.APTO_POR_NUM[apto]; return !f.prumada || f.prumada === 'Final ' + a.final || f.prumada === a.grupo; };

  function entregas(estado, res, f) {
    f = f || {};
    const hoje = res.hoje;
    const itens = res.itens.filter(i => i.ordem === 12 && naPrumada(f, i.apto));
    const conta = { noEscopo: 0, entregues: 0, dePrimeira: 0, aposReprova: 0, semRegistro: 0, reprovadosAguardando: 0, agendadas: 0 };
    const porPrumada = {};
    let somaVist = 0, nAprov = 0;
    const abertas = [];
    for (const it of itens) {
      const pp = porPrumada[it.final] = porPrumada[it.final] || { noEscopo: 0, entregues: 0, dePrimeira: 0, aposReprova: 0, reprovadosAguardando: 0, agendadas: 0 };
      if (it.status !== 'Cancelado') { conta.noEscopo++; pp.noEscopo++; }
      if (it.status === 'Concluído') { conta.entregues++; pp.entregues++; }
      const s = PA.motor.situacaoEntrega(estado, it);
      const k = { 'ent-primeira': 'dePrimeira', 'ent-apos': 'aposReprova', 'ent-reprovado': 'reprovadosAguardando', 'ent-agendada': 'agendadas', 'ent-sem': 'semRegistro' }[s.classe];
      if (k) { conta[k]++; if (pp[k] !== undefined) pp[k]++; }
      if (k === 'dePrimeira' || k === 'aposReprova') { somaVist += s.vistorias.filter(v => v.resultado !== 'agendada').length; nAprov++; }
      const ab = s.vistorias.filter(v => v.resultado === 'agendada' && isNum(v.agendada)).pop();
      if (ab) abertas.push({ apto: it.apto, final: it.final, data: ab.agendada, numero: ab.numero, reprovado: k === 'reprovadosAguardando', acompanhadoPor: ab.acompanhadoPor });
    }
    abertas.sort((a, b) => a.data - b.data || a.apto - b.apto);
    return Object.assign(conta, {
      pctPrimeira: conta.dePrimeira + conta.aposReprova ? conta.dePrimeira / (conta.dePrimeira + conta.aposReprova) : null,
      mediaVistorias: nAprov ? somaVist / nAprov : null,
      proximas: abertas.filter(a => a.data >= hoje && a.data <= hoje + 7),
      atrasadas: abertas.filter(a => a.data < hoje),
      futuras: abertas.filter(a => a.data > hoje + 7),
      porPrumada
    });
  }

  function reprovas(estado, res, f) {
    f = f || {};
    const cats = PA.modelo.categoriasReprova(estado);
    const lista = [];
    for (const v of (estado.vistorias || [])) {
      if (v.resultado !== 'reprovado' || !naPrumada(f, v.apto)) continue;
      if (isNum(f.de) && !(v.realizada >= f.de)) continue;
      if (isNum(f.ate) && !(v.realizada <= f.ate)) continue;
      for (const m of (v.motivos || [])) {
        if (f.categoria && m.categoria !== f.categoria) continue;
        const c = cats.find(x => x.nome === m.categoria);
        lista.push({ apto: v.apto, final: PA.modelo.APTO_POR_NUM[v.apto].final, data: v.realizada, numero: v.numero, categoria: m.categoria, descricao: m.descricao, acompanhadoPor: v.acompanhadoPor, empreiteira: (c && c.empreiteira) || '' });
      }
    }
    lista.sort((a, b) => (b.data || 0) - (a.data || 0) || a.apto - b.apto);
    const agrupar = chave => {
      const g = {};
      for (const x of lista) { const k = chave(x); const o = g[k] = g[k] || { ocorrencias: 0, aptos: new Set() }; o.ocorrencias++; o.aptos.add(x.apto); }
      return Object.entries(g).map(([k, o]) => ({ k, ocorrencias: o.ocorrencias, aptos: o.aptos.size })).sort((a, b) => b.ocorrencias - a.ocorrencias || a.k.localeCompare(b.k));
    };
    return {
      porCategoria: agrupar(x => x.categoria).map(o => ({ categoria: o.k, ocorrencias: o.ocorrencias, aptos: o.aptos })),
      porEmpreiteira: agrupar(x => x.empreiteira || '(sem responsável)').map(o => ({ empreiteira: o.k, ocorrencias: o.ocorrencias, aptos: o.aptos })),
      lista
    };
  }
  Object.assign(PA.motor, { entregas, reprovas });
})(typeof globalThis !== 'undefined' ? globalThis : this);
