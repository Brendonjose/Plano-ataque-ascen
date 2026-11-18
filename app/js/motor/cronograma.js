/* Motor — Piso (cotas DS × Juninho) e CRONOGRAMA (projeção encadeada, folga, mão de obra). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  const FINAIS = [3, 4, 2, 1]; // ordem das colunas da v6 (R:U, X:AA, AB:AE …)
  const isNum = v => typeof v === 'number' && isFinite(v);
  const roundup = (x, d) => { const f = Math.pow(10, d || 0); const y = Math.abs(x) * f; const r = Math.ceil(y - 1e-9); return Math.sign(x) * r / f; };
  const round = (x, d) => { const f = Math.pow(10, d); return Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9) / f; };

  function metaDe(estado, final) {
    const p = estado.cronograma.prumadas[final];
    return p && isNum(p.meta) ? p.meta : estado.cronograma.metaMacro;
  }
  function prazoAcum(estado, ordem) {
    let s = 0;
    for (const sv of PA.modelo.SERVICOS) if (sv.ordem >= ordem) s += Number(estado.cronograma.servicos[sv.id].prazo) || 0;
    return s;
  }
  /** Datas-limite (CRONOGRAMA L:Q). WORKDAY sem feriados, como na v6; a Entrega usa a própria meta. */
  function limites(estado) {
    const D = PA.datas, out = {};
    for (const s of PA.modelo.SERVICOS) {
      const l = {};
      // Entrega = meta; Rejunte = limite do Piso (CRONOGRAMA!L17 = L16).
      for (const f of [1, 2, 3, 4]) l[f] = s.ordem === 12 ? metaDe(estado, f) : (s.ordem === 2 ? out[1][f] : D.workday(metaDe(estado, f), -prazoAcum(estado, s.ordem)));
      l.f34 = Math.max(l[3], l[4]);
      l.obra = Math.max(l[1], l[2], l[3], l[4]);
      out[s.ordem] = l;
    }
    return out;
  }

  /** Posição na fila de baixo para cima (BASE!AB:AD). Altera os itens. */
  function fila(estado, itens) {
    const grupos = {};
    for (const it of itens) {
      const s = PA.modelo.POR_ORDEM[it.ordem];
      it.prioridadeFila = estado.estrategia.segueprioridade[s.id] === 'Não' ? 0 : estado.cronograma.prumadas[it.final].prioridade;
      it.pendente = (it.status === 'Concluído' || it.status === 'Cancelado') ? 0 : 1;
      it.posicaoFila = 0;
      if (it.pendente) (grupos[it.ordem + '|' + it.prioridadeFila] = grupos[it.ordem + '|' + it.prioridadeFila] || []).push(it);
    }
    for (const lista of Object.values(grupos)) {
      lista.sort((a, b) => a.pav - b.pav || a.final - b.final);
      lista.forEach((it, i) => { it.posicaoFila = i + 1; });
      lista.forEach(it => { it.tamanhoGrupo = lista.length; });
    }
    return itens;
  }

  /** Bloco de produtividade da aba Piso. */
  function piso(estado, hoje, itens, fer) {
    const P = estado.piso, D = PA.datas, n = PA.modelo.norm;
    let c1 = 0, c2 = 0;
    for (const a of PA.modelo.APTOS) { const l = estado.lancamentos.piso[a.apto]; const c = l ? n(l.codigo) : ''; if (c === '1') c1++; if (c === '2') c2++; }
    const faltaDS = (94 - P.repassadosJun) - c1;
    const faltaJun = P.repassadosJun - c2;
    const diasDS = (P.equipeDS > 0) ? (faltaDS * P.m2.piso / P.prodDS.piso / P.equipeDS) + (faltaDS * P.m2.azulejo / P.prodDS.azulejo / P.equipeDS) : null;
    const diasJun = (P.equipeJun > 0) ? (faltaJun * P.m2.piso / P.prodJun.piso / P.equipeJun) + (faltaJun * P.m2.azulejo / P.prodJun.azulejo / P.equipeJun) : null;
    return {
      faltaDS, faltaJun, diasDS, diasJun, concluidosDS: c1, concluidosJun: c2,
      finalDS: diasDS === null ? null : D.workday(hoje, diasDS, fer),
      finalJun: diasJun === null ? null : D.workday(hoje, diasJun, fer)
    };
  }

  function cronograma(estado, hoje, itens, lim) {
    const M = PA.modelo, D = PA.datas;
    const fer = new Set(estado.feriados);
    lim = lim || limites(estado);
    const pisoCalc = piso(estado, hoje, itens, fer);
    const prio = {}; for (const f of [1, 2, 3, 4]) prio[f] = estado.cronograma.prumadas[f].prioridade;
    const porOrdem = {};
    const linhas = [];
    for (const s of M.SERVICOS) {
      const sv = estado.cronograma.servicos[s.id];
      const L = { ordem: s.ordem, id: s.id, servico: s.nome, prazo: Number(sv.prazo) || 0 };
      const nao = estado.estrategia.segueprioridade[s.id] === 'Não';
      L.segue = !nao;
      if (s.id === 'piso') {
        const P = estado.piso;
        L.unid = P.m2.piso + P.m2.azulejo;
        L.funcDia = ((P.m2.piso / P.prodDS.piso + P.m2.azulejo / P.prodDS.azulejo) + (P.m2.piso / P.prodJun.piso + P.m2.azulejo / P.prodJun.azulejo)) / 2;
        L.prod = L.unid / L.funcDia;
        L.equipe = P.equipeDS + P.equipeJun;
        const m = Math.max(isNum(pisoCalc.diasDS) ? pisoCalc.diasDS : 0, isNum(pisoCalc.diasJun) ? pisoCalc.diasJun : 0);
        L.ritmo = m ? (pisoCalc.faltaDS + pisoCalc.faltaJun) / m : 0;
        L.ciclo = P.diasPorApto;
      } else {
        L.unid = Number(sv.unid); L.prod = Number(sv.produtividade);
        L.funcDia = L.prod ? L.unid / L.prod : 0;
        L.equipe = Number(sv.equipe);
        L.ritmo = L.funcDia ? L.equipe / L.funcDia : 0;
        L.ciclo = s.id === 'rejunte' ? Number(estado.cronograma.cicloRejunte) : (L.prod ? L.unid / L.prod : 0);
      }
      L.limite = lim[s.ordem];
      // Saldo pendente por prumada e liberados.
      L.saldo = { 1: 0, 2: 0, 3: 0, 4: 0 }; L.liberados = 0;
      for (const it of itens) {
        if (it.ordem !== s.ordem) continue;
        if (it.status !== 'Concluído' && it.status !== 'Cancelado') L.saldo[it.final]++;
        if (it.status === 'Não iniciado' || it.status === 'Em andamento') L.liberados++;
      }
      const somaSaldo = L.saldo[1] + L.saldo[2] + L.saldo[3] + L.saldo[4];
      // Início projetado (W).
      const preds = s.predsCron.map(o => porOrdem[o]);
      if (somaSaldo === 0) L.inicio = null;
      else if (!preds.length) L.inicio = hoje;
      else {
        const ws = preds.map(p => p.inicio).filter(isNum);
        if (L.liberados > 0 || !ws.length) L.inicio = hoje;
        else L.inicio = D.workday(Math.max(...ws), roundup(Math.max(...preds.map(p => p.ciclo)), 0), fer);
      }
      // Saldo acumulado pela prioridade (X:AA).
      L.saldoAcum = {};
      for (const f of [1, 2, 3, 4]) {
        if (nao) {
          let mx = 0;
          for (const it of itens) if (it.ordem === s.ordem && it.final === f && it.posicaoFila > mx) mx = it.posicaoFila;
          L.saldoAcum[f] = mx;
        } else {
          let soma = 0;
          for (const g of [1, 2, 3, 4]) if (prio[g] <= prio[f]) soma += L.saldo[g];
          L.saldoAcum[f] = soma;
        }
      }
      // Término por capacidade (AB:AE) e encadeado (AF:AI).
      L.termCap = {}; L.term = {};
      for (const f of [1, 2, 3, 4]) {
        if (L.saldo[f] === 0 || !(L.ritmo > 0)) { L.termCap[f] = null; }
        else {
          const dias = s.id === 'piso' ? round(L.saldoAcum[f] / L.ritmo, 4) : roundup(L.saldoAcum[f] / L.ritmo, 0);
          L.termCap[f] = D.workday(L.inicio, dias, fer);
        }
        if (!preds.length) L.term[f] = L.termCap[f];
        else if (L.saldo[f] === 0) L.term[f] = null;
        else {
          const ps = preds.map(p => p.term[f]).filter(isNum);
          const enc = ps.length ? D.workday(Math.max(...ps), roundup(L.ciclo, 0), fer) : 0;
          L.term[f] = Math.max(isNum(L.termCap[f]) ? L.termCap[f] : 0, enc);
        }
      }
      const tf = [1, 2, 3, 4].map(f => L.term[f]).filter(isNum);
      const t34 = [3, 4].map(f => L.term[f]).filter(isNum);
      L.termF34 = t34.length ? Math.max(...t34) : null;
      L.termTodas = tf.length ? Math.max(...tf) : null;
      // Folga (AL:AP).
      L.folga = {};
      for (const f of [1, 2, 3, 4]) L.folga[f] = isNum(L.term[f]) ? L.limite[f] - L.term[f] : null;
      const fs = [1, 2, 3, 4].map(f => L.folga[f]).filter(isNum);
      L.piorFolga = fs.length ? Math.min(...fs) : null;
      // Mão de obra necessária (AQ:AW).
      L.mo = {};
      for (const f of [1, 2, 3, 4]) {
        if (L.saldo[f] === 0) { L.mo[f] = null; continue; }
        const alvo = nao ? L.limite.obra : L.limite[f];
        const nd = D.networkdays(Math.max(hoje, isNum(L.inicio) ? L.inicio : 0), alvo, fer);
        L.mo[f] = nd <= 0 ? 'Sem prazo' : roundup(L.saldoAcum[f] * L.funcDia / nd, 0);
      }
      const agreg = fsx => fsx.some(v => v === 'Sem prazo') ? 'Sem prazo' : (fsx.filter(isNum).length ? Math.max(...fsx.filter(isNum)) : null);
      L.moF34 = agreg([L.mo[3], L.mo[4]]);
      L.moTodas = agreg([1, 2, 3, 4].map(f => L.mo[f]));
      L.acrescimo = isNum(L.moTodas) ? Math.max(0, L.moTodas - L.equipe) : (L.moTodas === 'Sem prazo' ? 'Sem prazo' : null);
      // Atraso gerado (AX:BB).
      L.atrasoGerado = {};
      const gerado = (v, ants) => {
        if (!isNum(v)) return null;
        const a = ants.filter(isNum);
        return a.length ? Math.max(0, Math.min(...a) - v) : Math.max(0, -v);
      };
      for (const f of [1, 2, 3, 4]) L.atrasoGerado[f] = gerado(L.folga[f], preds.map(p => p.folga[f]));
      L.atrasoGerado.obra = gerado(L.piorFolga, preds.map(p => p.piorFolga));
      // Início do serviço em cada prumada (BC:BF).
      L.inicioPrumada = {};
      for (const f of [1, 2, 3, 4]) {
        if (!isNum(L.term[f])) { L.inicioPrumada[f] = null; continue; }
        if (nao) { L.inicioPrumada[f] = L.inicio; continue; }
        let mx = isNum(L.inicio) ? L.inicio : 0;
        for (const g of [1, 2, 3, 4]) if (prio[g] < prio[f] && isNum(L.term[g])) mx = Math.max(mx, L.term[g]);
        L.inicioPrumada[f] = Math.min(L.term[f], mx);
      }
      // Fator para a data necessária (BG:BJ).
      L.fator = {};
      for (const f of [1, 2, 3, 4]) {
        if (!isNum(L.term[f]) || L.term[f] <= L.limite[f]) L.fator[f] = 1;
        else L.fator[f] = Math.max(0, D.networkdays(hoje, L.limite[f], fer)) / Math.max(1, D.networkdays(hoje, L.term[f], fer));
      }
      porOrdem[s.ordem] = L;
      linhas.push(L);
    }
    // Resumo por prumada (linhas 32–36).
    const entrega = itens.filter(i => i.ordem === 12);
    const resumo = (final, meta, termos, gerados) => {
      const t = termos.filter(isNum);
      const termino = t.length ? Math.max(...t) : null;
      const folga = termino === null ? null : meta - termino;
      const mg = Math.max(...gerados.map(v => isNum(v) ? v : -Infinity));
      const gerador = !(mg > 0) ? '—' : linhas[gerados.findIndex(v => v === mg)].servico;
      const sel = final ? entrega.filter(i => i.final === final) : entrega;
      return {
        final, meta, termino, folga, gerador,
        situacao: termino === null ? 'Concluída' : (folga >= 0 ? 'No prazo' : 'Atrasada'),
        aptosEscopo: sel.filter(i => i.status !== 'Cancelado').length,
        entregues: sel.filter(i => i.status === 'Concluído').length,
        prioridade: final ? prio[final] : null
      };
    };
    const prumadas = FINAIS.map(f => resumo(f, metaDe(estado, f), linhas.map(l => l.term[f]), linhas.map(l => l.atrasoGerado[f])));
    const obra = resumo(null, estado.cronograma.metaMacro, linhas.map(l => l.termTodas), linhas.map(l => l.atrasoGerado.obra));
    obra.aptosEscopo = prumadas.reduce((a, p) => a + p.aptosEscopo, 0);
    return { limites: lim, servicos: linhas, porOrdem, prumadas, obra, piso: pisoCalc };
  }

  Object.assign(PA.motor, { limites, fila, cronograma, metaDe, _roundup: roundup });
})(typeof globalThis !== 'undefined' ? globalThis : this);
