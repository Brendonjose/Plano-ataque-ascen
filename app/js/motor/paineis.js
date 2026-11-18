/* Motor — painéis: Dashboard, Macro, Quadros F1–F4, Estratégia, Ranking, Pendências e Histórico. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  const isNum = v => typeof v === 'number' && isFinite(v);
  const low = s => String(s === null || s === undefined ? '' : s).toLowerCase();
  const div = (a, b) => (b <= 0 ? 0 : a / b);
  const FINAIS = [3, 4, 2, 1];
  const STATUS_GRAF = ['Concluído', 'Em andamento', 'Não iniciado', 'Bloqueado', 'Atrasado', 'Cancelado'];

  /** Lista única de empreiteiras (CONFIG!I31:I42), sem diferenciar maiúsculas (COUNTIF do Excel). */
  function empreiteiras(estado, cron) {
    const linhas = [
      { servico: 'Piso', nome: estado.piso.empreiteiras.ds, folga: isNum(cron.piso.finalDS) ? limObra(cron) - cron.piso.finalDS : null },
      { servico: 'Piso', nome: estado.piso.empreiteiras.jun, folga: isNum(cron.piso.finalJun) ? limObra(cron) - cron.piso.finalJun : null }
    ];
    for (const L of cron.servicos) {
      if (L.ordem < 3) continue;
      linhas.push({ servico: L.servico, nome: estado.cronograma.servicos[L.id].empreiteira, folga: L.piorFolga });
    }
    const unicas = [];
    for (const l of linhas) if (l.nome !== '' && !unicas.some(u => low(u) === low(l.nome))) unicas.push(l.nome);
    return { linhas, unicas };
  }
  function limObra(cron) { return cron.porOrdem[1].limite.obra; }

  function filtrar(itens, f) {
    f = f || {};
    return itens.map(it => {
      const ok = (!f.empreiteira || low(it.empreiteira) === low(f.empreiteira)) &&
        (!f.torre || it.torre === f.torre) &&
        (!f.pavimento || it.pav === Number(f.pavimento)) &&
        (!f.servico || it.servico === f.servico) &&
        (!f.status || it.status === f.status || (f.status === 'Atrasado' && it.atrasado === 1) || (f.status === 'Vencimento próximo' && it.venceBreve === 1)) &&
        (!isNum(f.de) || it.limite >= f.de) &&
        (!isNum(f.ate) || it.limite <= f.ate) &&
        (!f.prumada || f.prumada === 'Final ' + it.final || f.prumada === it.grupo);
      return ok ? 1 : 0;
    });
  }

  /** Painel executivo, respeitando os filtros (null/'' = Todos). */
  function painel(estado, res, filtros) {
    const M = PA.modelo;
    const itens = res.itens, cron = res.cron;
    const z = filtrar(itens, filtros);
    const sel = itens.filter((_, i) => z[i]);
    const cnt = fn => sel.reduce((a, it) => a + (fn(it) ? 1 : 0), 0);
    const total = sel.length;
    const canc = cnt(i => i.status === 'Cancelado');
    const concl = cnt(i => i.status === 'Concluído');
    const kpis = {
      total, concluidos: concl, andamento: cnt(i => i.status === 'Em andamento'), naoIniciados: cnt(i => i.status === 'Não iniciado'),
      atrasados: cnt(i => i.atrasado === 1), bloqueados: cnt(i => i.status === 'Bloqueado'),
      pct: total - canc <= 0 ? 0 : concl / (total - canc), vencendo: cnt(i => i.venceBreve === 1), cancelados: canc
    };
    const alertas = cnt(i => i.alerta !== '');
    // Risco por serviço (linhas 24–35).
    const risco = cron.servicos.map(L => {
      const doServ = sel.filter(i => i.ordem === L.ordem);
      const J = doServ.length, K = doServ.filter(i => i.status === 'Concluído').length, N = doServ.filter(i => i.status === 'Cancelado').length;
      const pct = J - N <= 0 ? 0 : K / (J - N);
      const I = isNum(L.piorFolga) ? L.piorFolga : '—';
      const sit = pct >= 1 ? 'Concluído' : (I === '—' ? 'Sem projeção' : (I < 0 ? 'Risco de atraso' : (I <= 5 ? 'Atenção' : 'No prazo')));
      let leitura;
      if (sit === 'Risco de atraso') leitura = Math.abs(I) + ' dias após limite' + (isNum(L.acrescimo) ? (L.acrescimo > 0 ? ' · reforçar +' + L.acrescimo + ' func.' : '') : (L.acrescimo === 'Sem prazo' ? ' · prazo esgotado' : ''));
      else if (sit === 'Atenção') leitura = 'Folga de apenas ' + I + ' dia(s)';
      else if (sit === 'No prazo') leitura = 'Folga de ' + I + ' dias';
      else if (sit === 'Concluído') leitura = 'Serviço finalizado';
      else leitura = 'Sem produtividade cadastrada';
      return {
        ordem: L.ordem, servico: L.servico, empreiteira: empreiteiraServico(estado, L.id), limiteF34: L.limite.f34, limiteObra: L.limite.obra,
        termino: isNum(L.termTodas) ? L.termTodas : '—', piorFolga: I, situacao: sit, equipe: L.equipe,
        necessaria: L.moTodas === null ? '—' : L.moTodas, pendentes: J - K - N, pct, leitura, acrescimo: L.acrescimo
      };
    });
    // Críticos (BASE!AA + DASHBOARD 91–110).
    const criticos = [];
    itens.forEach((it, i) => {
      if (!z[i] || !(it.atrasado || it.venceBreve)) return;
      const q = isNum(it.diasVencer) ? Math.max(0, it.diasVencer) : 0;
      const score = it.atrasado * 10000 + it.diasAtraso * 10 + it.venceBreve * (1000 - q * 10) + (13 - it.ordem) + (5 + i) / 100000;
      criticos.push({ score, it });
    });
    criticos.sort((a, b) => b.score - a.score);
    const totalCriticos = criticos.length;
    const top = criticos.slice(0, 20).map((c, k) => ({
      prioridade: k + 1, servico: c.it.servico, empreiteira: c.it.empreiteira,
      local: c.it.torre + ' · Pav ' + c.it.pav + ' · Apto ' + c.it.apto, apto: c.it.apto,
      limite: c.it.limite, situacao: (c.it.atrasado ? 'ATRASADO · ' : 'VENCE EM BREVE · ') + c.it.status,
      diasAtraso: c.it.diasAtraso, diasVencer: c.it.diasVencer, obs: c.it.obs !== '' ? c.it.obs : c.it.detalhe
    }));
    // Séries dos gráficos (APOIO_DASH).
    const g = {};
    g.status = STATUS_GRAF.map(s => ({ rotulo: s, qtde: cnt(i => i.consolidado === s) }));
    g.servicos = cron.servicos.map(L => {
      const d = sel.filter(i => i.ordem === L.ordem);
      const J = d.length, K = d.filter(i => i.status === 'Concluído').length, N = d.filter(i => i.status === 'Cancelado').length;
      const V = d.reduce((a, i) => a + i.previstoHoje, 0);
      return { servico: L.servico, total: J, concluidos: K, pctRealizado: J - N <= 0 ? 0 : K / (J - N), pctPrevisto: J - N <= 0 ? 0 : V / (J - N), cancelados: N };
    });
    const { unicas } = empreiteiras(estado, cron);
    g.empreiteiras = ['A definir', ...unicas].map(nome => {
      const d = sel.filter(i => low(i.empreiteira) === low(nome));
      const C = d.length, D = d.filter(i => i.status === 'Concluído').length, Cn = d.filter(i => i.status === 'Cancelado').length;
      return { empreiteira: nome, total: C, concluidos: D, pct: C - Cn <= 0 ? 0 : D / (C - Cn), atrasados: d.filter(i => i.atrasado === 1).length, vencendo: d.filter(i => i.venceBreve === 1).length };
    });
    const loc = d => { const J = d.filter(i => i.status !== 'Cancelado').length, K = d.filter(i => i.status === 'Concluído').length; return { total: J, concluidos: K, pct: J === 0 ? 0 : K / J }; };
    g.locais = [{ local: estado.config.torre + ' (total)', ...loc(sel.filter(i => i.torre === estado.config.torre)) }]
      .concat([1, 2, 3, 4].map(f => ({ local: 'Prumada final ' + f, ...loc(sel.filter(i => i.final === f)) })));
    g.pavimentos = [];
    for (let p = 1; p <= 27; p++) g.pavimentos.push({ pav: p, ...loc(sel.filter(i => i.pav === p)) });
    g.evolucao = res.historico ? res.historico.semanas : [];
    return { kpis, alertas, risco, criticos: top, totalCriticos, graficos: g, prumadas: tabelaPrumadas(res) };
  }
  function empreiteiraServico(estado, id) {
    if (id === 'piso' || id === 'rejunte') return estado.piso.empreiteiras.ds + ' / ' + estado.piso.empreiteiras.jun;
    return estado.cronograma.servicos[id].empreiteira;
  }
  function pctFinal(itens, final, ordem) {
    const d = itens.filter(i => (final === null || i.final === final) && (ordem === undefined || i.ordem === ordem));
    const den = d.filter(i => i.status !== 'Cancelado').length;
    return den === 0 ? 0 : d.filter(i => i.status === 'Concluído').length / den;
  }
  /** Prazos por prumada e data macro (DASHBOARD 15–19; não responde aos filtros). */
  function tabelaPrumadas(res) {
    const linhas = res.cron.prumadas.map(p => ({ ...p, pct: pctFinal(res.itens, p.final) }));
    linhas.push({ ...res.cron.obra, pct: pctFinal(res.itens, null), final: null });
    return linhas.map(p => ({
      ...p, leitura: p.situacao === 'Concluída' ? 'Prumada entregue' : (p.situacao === 'Atrasada' ? Math.abs(p.folga) + ' dias após a meta · gerador: ' + p.gerador : 'Folga de ' + p.folga + ' dias')
    }));
  }

  /** Curva semanal prevista (APOIO_DASH 61–111) e histórico. */
  function historico(estado, res) {
    const M = PA.modelo, lim = res.cron.limites, db = estado.config.dataBase;
    const linhas = [];
    for (const s of M.SERVICOS) for (const f of FINAIS) {
      const d = res.itens.filter(i => i.ordem === s.ordem && i.final === f);
      const D = d.filter(i => i.status !== 'Cancelado').length, E = d.filter(i => i.noBase === 1).length;
      const G = lim[s.ordem][f];
      const Lp = s.ordem > 1 ? lim[s.ordem - 1][f] : null;
      const F = s.ordem === 1 ? db : (Lp < G ? Math.max(db, Lp) : db);
      linhas.push({ D, E, F, G });
    }
    const totalD = linhas.reduce((a, l) => a + l.D, 0);
    const semanas = [];
    for (let k = 0; k < 20; k++) {
      const t = db + 7 * k;
      let soma = 0;
      for (const l of linhas) soma += l.E + (l.D - l.E) * (l.G <= l.F ? (t >= l.G ? 1 : 0) : Math.max(0, Math.min(1, (t - l.F) / (l.G - l.F))));
      const reg = estado.historico.find(h => h.semana === k + 1) || {};
      semanas.push({ semana: k + 1, data: t, previsto: totalD === 0 ? 0 : soma / totalD, realizado: isNum(reg.realizado) ? reg.realizado : null, concluidos: isNum(reg.concluidos) ? reg.concluidos : null, obs: reg.obs || '' });
    }
    const validos = res.itens.filter(i => i.status !== 'Cancelado').length;
    const concl = res.itens.filter(i => i.status === 'Concluído').length;
    return { hoje: res.hoje, pctHoje: validos === 0 ? 0 : concl / validos, concluidosHoje: concl, itensValidos: validos, semanas };
  }

  function pendencias(estado, hoje) {
    const lista = estado.pendencias.map((p, i) => ({ ...p, n: i + 1, final: isNum(p.apto) ? p.apto % 10 : null, atrasada: p.status === 'Aberta' && isNum(p.prazo) && p.prazo < hoje ? 'Sim' : '' }));
    return {
      lista, abertas: lista.filter(p => p.status === 'Aberta').length, resolvidas: lista.filter(p => p.status === 'Resolvida').length,
      atrasadas: lista.filter(p => p.atrasada === 'Sim').length,
      abertasPorApto: lista.reduce((m, p) => { if (p.status === 'Aberta') m[p.apto] = (m[p.apto] || 0) + 1; return m; }, {}),
      abertasPorFinal: lista.reduce((m, p) => { if (p.status === 'Aberta') m[p.final] = (m[p.final] || 0) + 1; return m; }, {})
    };
  }

  function macro(estado, res) {
    const cron = res.cron, pend = res.pendencias;
    const linhasPrumada = [1, 2, 3, 4].map(f => {
      const p = cron.prumadas.find(x => x.final === f);
      return { ...p, pct: pctFinal(res.itens, f), pendAbertas: pend.abertasPorFinal[f] || 0 };
    });
    linhasPrumada.push({ ...cron.obra, pct: pctFinal(res.itens, null), pendAbertas: pend.abertas });
    const matriz = cron.servicos.map(L => ({
      servico: L.servico, empreiteira: empreiteiraServico(estado, L.id),
      prumadas: Object.fromEntries([1, 2, 3, 4].map(f => [f, { pct: pctFinal(res.itens, f, L.ordem), termino: isNum(L.term[f]) ? L.term[f] : 'ok', folga: isNum(L.folga[f]) ? L.folga[f] : null }])),
      obra: { pct: pctFinal(res.itens, null, L.ordem), termino: isNum(L.termTodas) ? L.termTodas : 'ok', folga: L.piorFolga }
    }));
    return {
      geral: { meta: cron.obra.meta, termino: isNum(cron.obra.termino) ? cron.obra.termino : 'concluída', folga: cron.obra.folga, aptosEscopo: cron.obra.aptosEscopo, entregues: cron.obra.entregues, pct: pctFinal(res.itens, null), pendAbertas: pend.abertas, pendAtrasadas: pend.atrasadas },
      prumadas: linhasPrumada, matriz
    };
  }

  /** Quadro de uma prumada (QUADRO F1–F4). modo = 'atual' | 'necessario'. */
  function quadro(estado, res, final, modo) {
    const M = PA.modelo;
    const cols = M.ETAPAS_QUADRO.filter(e => !e.so34 || final >= 3);
    const chave = {};
    res.itens.forEach(it => { chave[it.ordem + '|' + it.apto] = it; });
    const aptos = M.APTOS.filter(a => a.final === final).sort((a, b) => a.pav - b.pav);
    const linhas = aptos.map(a => ({
      apto: a.apto, pav: a.pav, vendido: estado.estrategia.vendido[a.apto] === 'N' ? ((estado.estrategia.rotulo || {})[a.apto] || 'não') : 'sim',
      pendAbertas: res.pendencias.abertasPorApto[a.apto] || 0,
      celulas: cols.map(c => {
        if (c.manual) return { manual: true, valor: (estado.manuais[a.apto] || {})[c.col] || '' };
        const it = chave[c.ordem + '|' + a.apto];
        if (it.status === 'Concluído') return { valor: 'ok', item: it };
        if (it.status === 'Cancelado') return { valor: '—', item: it };
        const v = modo === 'necessario' ? it.dataNecessaria : it.terminoPrevisto;
        return { valor: isNum(v) ? v : '', data: isNum(v), atrasada: isNum(v) && v > it.limite, item: it };
      })
    }));
    const cab = cols.map((c, j) => {
      if (c.manual) return { ...c };
      const L = res.cron.porOrdem[c.ordem];
      let termino;
      if (modo === 'necessario') { const ds = linhas.map(l => l.celulas[j].valor).filter(isNum); termino = ds.length ? Math.max(...ds) : 'ok'; }
      else termino = isNum(L.term[final]) ? L.term[final] : 'ok';
      return { ...c, limite: L.limite[final], termino, pct: pctFinal(res.itens, final, c.ordem) };
    });
    return { final, modo, colunas: cab, linhas };
  }

  function estrategiaResumo(estado, res) {
    const M = PA.modelo;
    const servicos = res.cron.servicos.map(L => ({
      ordem: L.ordem, servico: L.servico, escopo: estado.estrategia.escopo[L.id], segue: estado.estrategia.segueprioridade[L.id],
      aplicado: res.escopo[L.ordem] ? 'Vendidos' : 'Todos',
      aptosEscopo: res.itens.filter(i => i.ordem === L.ordem && i.status !== 'Cancelado').length,
      pendentes: L.saldo[1] + L.saldo[2] + L.saldo[3] + L.saldo[4],
      termino: isNum(L.termTodas) ? L.termTodas : '—', piorFolga: isNum(L.piorFolga) ? L.piorFolga : '—'
    }));
    const v = M.APTOS.filter(a => estado.estrategia.vendido[a.apto] === 'V').length;
    const algum = servicos.filter(s => s.aplicado === 'Vendidos').length;
    return { servicos, vendidos: v, naoVendidos: M.APTOS.length - v, total: M.APTOS.length, servicosComVendidos: algum, cenario: [...res.cron.prumadas, res.cron.obra] };
  }

  function ranking(estado, res) {
    const { linhas, unicas } = empreiteiras(estado, res.cron);
    const P = estado.config.pesos, zero = estado.config.notaZeroDias;
    const tabela = unicas.map((nome, k) => {
      const d = res.itens.filter(i => low(i.empreiteira) === low(nome));
      const c = s => d.filter(i => i.status === s).length;
      const E = d.length, F = c('Concluído'), G = c('Em andamento'), H = c('Não iniciado'), I = c('Bloqueado'), J = c('Cancelado');
      const K = d.filter(i => i.atrasado === 1).length, Lf = d.filter(i => i.foraPrazo === 1).length;
      const minhas = linhas.filter(l => low(l.nome) === low(nome));
      const folgas = minhas.map(l => l.folga).filter(isNum);
      const Mf = folgas.length ? Math.min(...folgas) : null;
      const N = E - J - I <= 0 ? 'n/a' : F / (E - J - I);
      const O = E - J <= 0 ? 1 : 1 - (K + Lf) / (E - J);
      const Pp = Mf === null ? 1 : Math.max(0, Math.min(1, 1 + Mf / zero));
      const Q = ((N === 'n/a' ? 0 : P.c1 * N) + P.c2 * O + P.c3 * Pp) / ((N === 'n/a' ? 0 : P.c1) + P.c2 + P.c3);
      return { n: k + 1, empreiteira: nome, servicos: minhas.length, total: E, concluidos: F, andamento: G, naoIniciados: H, bloqueados: I, cancelados: J, vencidos: K, foraPrazo: Lf, folga: Mf, c1: N, c2: O, c3: Pp, pontuacao: Q };
    });
    // Empate: desempata pela ordem do cadastro (na v6 o empate exato vira posições seguidas por arredondamento).
    tabela.forEach((t, i) => { t.posicao = tabela.filter((o, j) => o.pontuacao > t.pontuacao + 1e-12 || (Math.abs(o.pontuacao - t.pontuacao) <= 1e-12 && j < i)).length + 1; });
    const ordenado = [];
    for (let p = 1; p <= tabela.length; p++) { const t = tabela.find(x => x.posicao === p); if (t) ordenado.push(t); }
    return { tabela, ordenado };
  }

  /** Acrescenta ao resultado os blocos que não dependem de filtro. */
  function paineis(estado, res) {
    res.pendencias = pendencias(estado, res.hoje);
    res.historico = historico(estado, res);
    res.macro = macro(estado, res);
    res.estrategia = estrategiaResumo(estado, res);
    res.ranking = ranking(estado, res);
    return res;
  }

  Object.assign(PA.motor, { paineis, painel, quadro, filtrar, empreiteiras, empreiteiraServico, STATUS_GRAF });
})(typeof globalThis !== 'undefined' ? globalThis : this);
