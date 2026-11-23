/* Motor — Acompanhamento: o que foi executado, está em execução e o que falta, por recorte. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  const SIT = { 'Concluído': 'executado', 'Em andamento': 'execucao', 'Não iniciado': 'liberado', 'Bloqueado': 'bloqueado', 'Cancelado': 'fora' };
  const isNum = v => typeof v === 'number' && isFinite(v);
  const low = s => String(s || '').trim().toLowerCase();

  function passa(it, f, estado) {
    const emp = low(f.empreiteira);
    const daEmp = !f.empreiteira || (estado && PA.motor.daEmpreiteira ? PA.motor.daEmpreiteira(estado, it, emp) : low(it.empreiteira) === emp);
    return (!f.servico || it.servico === f.servico) && daEmp &&
      (!f.pavimento || it.pav === Number(f.pavimento)) &&
      (!f.prumada || f.prumada === 'Final ' + it.final || f.prumada === it.grupo);
  }
  function contar(lista) {
    const n = { total: lista.length, executado: 0, execucao: 0, liberado: 0, bloqueado: 0, fora: 0, atrasados: 0 };
    for (const it of lista) { n[SIT[it.status]]++; if (it.atrasado) n.atrasados++; }
    n.pct = n.total - n.fora > 0 ? n.executado / (n.total - n.fora) : 0;
    return n;
  }
  const porNecessaria = (a, b) => (isNum(a.dataNecessaria) ? a.dataNecessaria : Infinity) - (isNum(b.dataNecessaria) ? b.dataNecessaria : Infinity) || a.apto - b.apto;

  /** estado (opcional) faz o filtro de empreiteira incluir os aptos de piso ainda "A definir", como no relatório. */
  function acompanhamento(res, filtros, estado) {
    const f = filtros || {};
    const pend = (res.pendencias && res.pendencias.abertasPorApto) || {};
    const sel = res.itens.filter(it => passa(it, f, estado)).map(it => Object.assign({}, it, { pendencias: pend[it.apto] || 0 }));
    const numeros = contar(sel);
    const serv = f.servico ? PA.modelo.SERVICOS.find(s => s.nome === f.servico) : null;
    const L = serv ? res.cron.porOrdem[serv.ordem] : null;
    const servico = L ? { termino: L.termTodas, folga: L.piorFolga, limite: L.limite.obra, limiteF34: L.limite.f34, equipe: L.equipe, necessaria: L.moTodas } : null;
    const porPrumada = [1, 2, 3, 4].map(final => {
      const n = contar(sel.filter(i => i.final === final));
      const base = L ? { limite: L.limite[final], termino: L.term[final], folga: L.folga[final] }
        : (() => { const p = res.cron.prumadas.find(x => x.final === final); return { limite: p.meta, termino: p.termino, folga: p.folga }; })();
      return Object.assign({ final }, n, base);
    });
    const matriz = f.servico ? null : PA.modelo.SERVICOS.map(s => Object.assign({ servico: s.nome, ordem: s.ordem }, contar(sel.filter(i => i.ordem === s.ordem))));
    const listas = { liberado: [], execucao: [], bloqueado: [], executado: [] };
    for (const it of sel) { const k = SIT[it.status]; if (listas[k]) listas[k].push(it); }
    listas.liberado.sort(porNecessaria);
    listas.execucao.sort(porNecessaria);
    listas.bloqueado.sort(porNecessaria);
    listas.executado.sort((a, b) => a.ordem - b.ordem || a.apto - b.apto);
    return { numeros, servico, porPrumada, matriz, listas };
  }
  PA.motor.acompanhamento = acompanhamento;
})(typeof globalThis !== 'undefined' ? globalThis : this);
