/* Motor — grades efetivas (ok/N/L/canc automáticos) e status por item (BASE A:Y da v6). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};

  /** Serviços com escopo "Vendidos" aplicado (ESTRATÉGIA!K: o próprio ou algum antecessor). */
  function escopoAplicado(estado) {
    const M = PA.modelo, out = {};
    for (const s of M.SERVICOS) {
      out[s.ordem] = estado.estrategia.escopo[s.id] === 'Vendidos' || s.preds.some(p => out[p]);
    }
    return out;
  }

  /** Grade efetiva por serviço/apto, igual às abas da v6 (valor digitado vale mais que a fórmula). */
  function grade(estado) {
    const M = PA.modelo, n = M.norm;
    const esc = escopoAplicado(estado);
    const g = {};
    const lanc = (id, apto) => { const l = estado.lancamentos[id][apto]; return l && l.codigo !== '' && l.codigo !== null && l.codigo !== undefined ? l.codigo : null; };
    for (const s of M.SERVICOS) g[s.id] = {};
    for (const a of M.APTOS) {
      const ap = a.apto;
      const forEscopo = o => esc[o] && estado.estrategia.vendido[ap] === 'N';
      // Piso e Pintura 1ª: grades manuais (vazio = vazio).
      g.piso[ap] = lanc('piso', ap) ?? '';
      g.pintura1[ap] = lanc('pintura1', ap) ?? '';
      // Rejunte: fórmula da grade I:L do Piso.
      {
        const d = lanc('rejunte', ap);
        if (d !== null) g.rejunte[ap] = d;
        else {
          const p = n(g.piso[ap]);
          g.rejunte[ap] = (p === 'canc' || forEscopo(2)) ? 'canc' : (p === '1' ? '3' : (p === '2' ? '6' : ''));
        }
      }
      // Portas: piso (1/2) + rejunte (1/4) + pintura 1ª (1).
      {
        const d = lanc('portas', ap);
        if (d !== null) g.portas[ap] = d;
        else {
          const p = n(g.piso[ap]), r = n(g.rejunte[ap]), t = n(g.pintura1[ap]);
          if (p === 'canc' || r === 'canc' || t === 'canc' || forEscopo(4)) g.portas[ap] = 'canc';
          else g.portas[ap] = ((p === '1' || p === '2') && (r === '1' || r === '4') && t === '1') ? 'ok' : 'N/L';
        }
      }
      // Demais: dependem do imediatamente anterior.
      for (const s of M.SERVICOS) {
        if (s.ordem < 5) continue;
        const d = lanc(s.id, ap);
        if (d !== null) { g[s.id][ap] = d; continue; }
        const ant = n(g[M.POR_ORDEM[s.preds[0]].id][ap]);
        g[s.id][ap] = (ant === 'canc' || forEscopo(s.ordem)) ? 'canc' : (ant === '1' ? 'ok' : 'N/L');
      }
    }
    return { g, esc };
  }

  function statusDe(s, c) {
    if (c === 'canc') return 'Cancelado';
    if (s.id === 'piso') return (c === '1' || c === '2') ? 'Concluído' : (c === 'and' ? 'Em andamento' : 'Não iniciado');
    if (s.id === 'rejunte') {
      if (c === '1' || c === '4') return 'Concluído';
      if (c === '2' || c === '5') return 'Em andamento';
      if (c === '3' || c === '6') return 'Não iniciado';
      return c === '' ? 'Bloqueado' : 'Não iniciado';
    }
    if (c === '1') return 'Concluído';
    if (c === 'and') return 'Em andamento';
    if (c === 'n/l') return 'Bloqueado';
    return 'Não iniciado';
  }
  function detalheDe(s, st, c, empreiteira) {
    if (s.id === 'piso') {
      if (st === 'Concluído') return 'Executado por ' + empreiteira;
      if (st === 'Em andamento') return 'Em execução';
      if (st === 'Cancelado') return 'Cancelado';
      return c === '' ? 'Não iniciado' : 'Código não reconhecido';
    }
    if (s.id === 'rejunte') {
      if (st === 'Bloqueado') return 'Aguardando piso';
      if (st === 'Concluído') return 'Rejuntado';
      if (st === 'Em andamento') return 'Rejuntando';
      if (st === 'Cancelado') return 'Cancelado';
      return (c === '3' || c === '6') ? 'Piso pronto, sem rejunte' : 'Código não reconhecido';
    }
    if (st === 'Bloqueado') return 'Aguardando ' + s.aguardando;
    if (st === 'Concluído') return 'Executado';
    if (st === 'Em andamento') return 'Em execução';
    if (st === 'Cancelado') return 'Cancelado';
    if (c === 'ok') return 'Liberado para execução';
    return c === '' ? 'Não iniciado' : 'Código não reconhecido';
  }
  function empreiteiraDe(estado, s, c) {
    const P = estado.piso.empreiteiras;
    if (s.id === 'piso') return c === '1' ? P.ds : (c === '2' ? P.jun : 'A definir');
    if (s.id === 'rejunte') return ['1', '2', '3'].includes(c) ? P.ds : (['4', '5', '6'].includes(c) ? P.jun : 'A definir');
    return estado.cronograma.servicos[s.id].empreiteira;
  }

  /**
   * Itens serviço × apto (ordem da BASE). `limites[ordem][final]` = data-limite (CRONOGRAMA L:O).
   */
  function itens(estado, hoje, limites, gradeCalc) {
    const M = PA.modelo, n = M.norm;
    const { g, esc } = gradeCalc || grade(estado);
    const out = [];
    const retrato = {};
    for (const [id, lista] of Object.entries(estado.retratoBase || {})) retrato[id] = new Set(lista);
    const dataBase = estado.config.dataBase;
    for (const s of M.SERVICOS) {
      for (const a of M.APTOS) {
        let bruto = g[s.id][a.apto];
        // Piso e Pintura 1ª: fora do escopo e vazio → canc (BASE!J).
        if ((s.id === 'piso' || s.id === 'pintura1') && (bruto === '' || bruto === null) && esc[s.ordem] && estado.estrategia.vendido[a.apto] === 'N') bruto = 'canc';
        const codigo = bruto === null || bruto === undefined ? '' : (typeof bruto === 'number' ? String(bruto) : bruto);
        const c = n(codigo);
        const status = statusDe(s, c);
        const empreiteira = empreiteiraDe(estado, s, c);
        const lim = limites[s.ordem] ? limites[s.ordem][a.final] : null;
        const limite = typeof lim === 'number' ? lim : null;
        // Início previsto (BASE!N): limite do serviço anterior na sequência, se for antes deste.
        let inicio = dataBase;
        if (s.ordem > 1) {
          const la = limites[s.ordem - 1] ? limites[s.ordem - 1][a.final] : null;
          if (typeof la === 'number' && limite !== null && la < limite) inicio = Math.max(dataBase, la);
        }
        const l = estado.lancamentos[s.id][a.apto] || {};
        const dataReal = typeof l.dataReal === 'number' ? l.dataReal : null;
        const fechado = status === 'Concluído' || status === 'Cancelado';
        const diasVencer = (fechado || limite === null) ? null : limite - hoje;
        const atrasado = (!fechado && limite !== null && hoje > limite) ? 1 : 0;
        const diasAtraso = atrasado ? hoje - limite : 0;
        const venceBreve = (!atrasado && !fechado && limite !== null && limite - hoje <= estado.config.janela) ? 1 : 0;
        const foraPrazo = (status === 'Concluído' && dataReal !== null && dataReal > limite) ? 1 : 0;
        const noBase = retrato[s.id] && retrato[s.id].has(a.apto) ? 1 : 0;
        let previstoHoje;
        if (status === 'Cancelado') previstoHoje = 0;
        else if (noBase) previstoHoje = 1;
        else if (limite <= inicio) previstoHoje = hoje >= limite ? 1 : 0;
        else previstoHoje = Math.max(0, Math.min(1, (hoje - inicio) / (limite - inicio)));
        const detalhe = detalheDe(s, status, c, empreiteira);
        const obs = l.obs || '';
        let alerta = '';
        if (limite === null) alerta = 'Sem data-limite';
        else if (detalhe === 'Código não reconhecido') alerta = 'Código não reconhecido na aba';
        else if (empreiteira === 'A definir' && !fechado) alerta = 'Empreiteira a definir';
        else if (atrasado && obs === '') alerta = 'Atraso sem justificativa';
        else if (dataReal !== null && status !== 'Concluído') alerta = 'Data real informada sem status concluído';
        out.push({
          id: 'S' + String(s.ordem).padStart(2, '0') + '-' + a.apto, ordem: s.ordem, servico: s.nome, servicoId: s.id,
          empreiteira, torre: estado.config.torre, pav: a.pav, final: a.final, apto: a.apto, grupo: a.grupo, idxApto: a.idx,
          codigo, status, consolidado: atrasado ? 'Atrasado' : status, detalhe, inicio, limite, dataReal,
          diasVencer, atrasado, diasAtraso, venceBreve, foraPrazo, previstoHoje, noBase, obs, alerta
        });
      }
    }
    return out;
  }

  Object.assign(PA.motor, { escopoAplicado, grade: e => grade(e).g, gradeCompleta: grade, itens });
})(typeof globalThis !== 'undefined' ? globalThis : this);
