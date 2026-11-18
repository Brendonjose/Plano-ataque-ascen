/* Importa a planilha Plano de Ataque (v6) para o estado do sistema. Guarda só as entradas. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};

  function achaAba(wb, nome) {
    if (wb.Sheets[nome]) return wb.Sheets[nome];
    const alvo = nome.trim().toLowerCase();
    const k = wb.SheetNames.find(n => n.trim().toLowerCase() === alvo);
    return k ? wb.Sheets[k] : null;
  }
  function celula(ws, ref) { return ws ? ws[ref] : undefined; }
  /** Valor da célula (calculado ou digitado). */
  function val(ws, ref) {
    const c = celula(ws, ref);
    if (!c || c.t === 'z' || c.t === 'e') return null;
    if (c.v === undefined || c.v === '') return null;
    return c.v;
  }
  /** Valor digitado (ignora células com fórmula). */
  function digitado(ws, ref) {
    const c = celula(ws, ref);
    if (!c || c.f || c.F) return null;
    return val(ws, ref);
  }
  function num(v, padrao) { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : padrao; }
  function data(v) { return typeof v === 'number' ? Math.floor(v) : (v instanceof Date ? PA.datas.hojeSerial(v) : null); }

  function deWorkbook(wb) {
    const M = PA.modelo;
    const e = M.estadoVazio();
    const piso = achaAba(wb, 'Piso');
    if (!piso) throw new Error('A planilha não tem a aba "Piso". Use a planilha Plano de Ataque v6.');
    const cron = achaAba(wb, 'CRONOGRAMA');
    const conf = achaAba(wb, 'CONFIG');
    const estr = achaAba(wb, 'ESTRATÉGIA');

    // Lançamentos digitados nas grades (fórmulas ok/N/L são automáticas e ficam de fora).
    for (const s of M.SERVICOS) {
      const ws = achaAba(wb, s.aba);
      for (const a of M.APTOS) {
        const col = s.id === 'rejunte' ? M.colRejunte(a.final) : M.colGrade(a.final);
        const v = digitado(ws, col + M.linhaGrade(a.pav));
        if (v === null) continue;
        const n = M.norm(v);
        if (n === 'ok' || n === 'n/l' || n === '') continue;
        e.lancamentos[s.id][a.apto] = { codigo: typeof v === 'number' ? String(v) : String(v) };
      }
    }
    // BASE: data de conclusão real (P) e observação (X).
    const base = achaAba(wb, 'BASE');
    if (base) {
      for (const s of M.SERVICOS) {
        for (const a of M.APTOS) {
          const r = 5 + 94 * (s.ordem - 1) + a.idx;
          const p = digitado(base, 'P' + r), x = digitado(base, 'X' + r);
          if (p === null && x === null) continue;
          const l = e.lancamentos[s.id][a.apto] || (e.lancamentos[s.id][a.apto] = { codigo: '' });
          if (p !== null) l.dataReal = data(p);
          if (x !== null) l.obs = String(x);
        }
      }
    }

    // Configuração.
    e.config.torre = String(val(conf, 'C4') || 'Torre Única');
    e.config.dataBase = data(val(conf, 'C5'));
    e.config.janela = num(val(conf, 'C6'), 15);
    e.config.pesos = { c1: num(val(conf, 'C7'), 0.4), c2: num(val(conf, 'C8'), 0.3), c3: num(val(conf, 'C9'), 0.3) };
    e.config.notaZeroDias = num(val(conf, 'C10'), 60);
    for (let r = 37; r <= 60; r++) { const f = data(val(piso, 'B' + r)); if (f !== null) e.feriados.push(f); }

    // Cronograma: metas e prioridades (linhas 8–11 = F3, F4, F2, F1).
    e.cronograma.metaMacro = data(val(cron, 'D5'));
    M.ORDEM_PRUMADAS.forEach((final, i) => {
      const r = 8 + i;
      const c = celula(cron, 'D' + r);
      const meta = c && (c.f || c.F) ? null : data(val(cron, 'D' + r)); // fórmula (=D5) → segue a macro
      e.cronograma.prumadas[final] = { meta, prioridade: num(val(cron, 'E' + r), i + 1) };
    });
    // Serviços: prazo (CRONOGRAMA E), produtividade, unidades, equipe e empreiteira (abas).
    for (const s of M.SERVICOS) {
      const r = 15 + s.ordem;
      const sv = e.cronograma.servicos[s.id];
      sv.prazo = num(val(cron, 'E' + r), 0);
      if (s.id === 'piso') {
        sv.empreiteira = String(val(piso, 'Q2') || 'DS ALENCAR') + ' / ' + String(val(piso, 'T2') || 'Juninho');
      } else if (s.id === 'rejunte') {
        sv.unid = num(val(cron, 'F17'), 1); sv.produtividade = num(val(cron, 'G17'), 0.5);
        sv.equipe = num(val(cron, 'I17'), 2); e.cronograma.cicloRejunte = num(val(cron, 'K17'), 1);
        sv.empreiteira = sv.empreiteira || '';
      } else {
        const ws = achaAba(wb, s.aba);
        sv.produtividade = num(val(ws, 'L4'), 1);
        sv.unid = num(val(ws, 'L5'), 1);
        sv.equipe = num(val(ws, s.id === 'pintura1' ? 'L15' : 'L23'), 1);
        sv.empreiteira = String(val(ws, 'K2') || '');
      }
    }
    // Piso: duas empreiteiras.
    e.piso = {
      empreiteiras: { ds: String(val(piso, 'Q2') || 'DS ALENCAR'), jun: String(val(piso, 'T2') || 'Juninho') },
      prodDS: { piso: num(val(piso, 'R4'), 20), azulejo: num(val(piso, 'R5'), 19) },
      prodJun: { piso: num(val(piso, 'U4'), 22), azulejo: num(val(piso, 'U5'), 19) },
      equipeDS: num(val(piso, 'R15'), 0), equipeJun: num(val(piso, 'U15'), 0),
      repassadosJun: num(val(piso, 'U7'), 0),
      m2: { piso: num(val(piso, 'X4'), 110), azulejo: num(val(piso, 'X5'), 95) },
      diasPorApto: num(val(piso, 'R6'), 10)
    };

    // Estratégia: vendidos (C5:F31) e escopo por serviço (linhas 5–16).
    for (const a of M.APTOS) {
      const v = M.norm(val(estr, M.colGrade(a.final) + M.linhaGrade(a.pav)));
      e.estrategia.vendido[a.apto] = v === 'n' ? 'N' : 'V';
    }
    for (const s of M.SERVICOS) {
      const r = 4 + s.ordem;
      e.estrategia.escopo[s.id] = M.norm(val(estr, 'I' + r)) === 'vendidos' ? 'Vendidos' : 'Todos';
      e.estrategia.segueprioridade[s.id] = M.norm(val(estr, 'J' + r)) === 'não' ? 'Não' : 'Sim';
    }

    // Quadros F1–F4: colunas manuais digitadas.
    for (let final = 1; final <= 4; final++) {
      const ws = achaAba(wb, 'F' + final);
      if (!ws) continue;
      const cab = {};
      for (let c = 0; c < 30; c++) {
        const col = colLetra(c);
        const h = val(ws, col + '7');
        if (h) cab[col] = String(h);
      }
      for (let r = 8; r < 40; r++) {
        const apto = val(ws, 'B' + r);
        if (typeof apto !== 'number') continue;
        for (const [col, nome] of Object.entries(cab)) {
          const et = M.ETAPAS_QUADRO.find(x => x.col === nome && x.manual);
          if (!et) continue;
          const v = digitado(ws, col + r);
          if (v === null) continue;
          (e.manuais[apto] = e.manuais[apto] || {})[nome] = String(v);
        }
      }
    }

    // Pendências (linhas 6–305).
    const pend = achaAba(wb, 'PENDÊNCIAS');
    for (let r = 6; r <= 305; r++) {
      const apto = val(pend, 'B' + r);
      if (apto === null) continue;
      e.pendencias.push({
        id: 'p' + (r - 5),
        apto: num(apto, null),
        etapa: String(val(pend, 'C' + r) || ''),
        descricao: String(val(pend, 'D' + r) || ''),
        responsavel: String(val(pend, 'E' + r) || ''),
        abertura: data(val(pend, 'F' + r)),
        prazo: data(val(pend, 'G' + r)),
        status: M.norm(val(pend, 'H' + r)) === 'resolvida' ? 'Resolvida' : 'Aberta',
        resolvidaEm: data(val(pend, 'I' + r)),
        obs: String(val(pend, 'J' + r) || '')
      });
    }

    // Histórico semanal (linhas 9+): semana, data, registros manuais E/F/G.
    const hist = achaAba(wb, 'HISTÓRICO');
    for (let r = 9; r <= 60; r++) {
      const sem = val(hist, 'B' + r);
      if (typeof sem !== 'number') continue;
      const h = { semana: sem, data: data(val(hist, 'C' + r)) };
      const re = digitado(hist, 'E' + r), co = digitado(hist, 'F' + r), ob = digitado(hist, 'G' + r);
      if (re !== null) h.realizado = num(re, null);
      if (co !== null) h.concluidos = num(co, null);
      if (ob !== null) h.obs = String(ob);
      e.historico.push(h);
    }
    e.meta.origem = 'planilha';
    return e;
  }
  function colLetra(i) { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

  PA.importar = { deWorkbook, achaAba, colLetra };
})(typeof globalThis !== 'undefined' ? globalThis : this);
