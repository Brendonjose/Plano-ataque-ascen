/* Exporta o estado e os resultados para uma planilha Excel nova (relatório + backup embutido). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  const PEDACO = 30000; // limite de texto por célula do Excel = 32.767

  function X() { return root.XLSX; }
  const dt = n => (typeof n === 'number' ? { t: 'n', v: n, z: 'dd/mm/yyyy' } : (n === null || n === undefined ? '' : n));
  const pc = n => (typeof n === 'number' ? { t: 'n', v: n, z: '0.0%' } : (n === null || n === undefined ? '' : n));
  const vz = v => (v === null || v === undefined ? '' : v);

  function aba(wb, nome, linhas, larguras) {
    const ws = X().utils.aoa_to_sheet(linhas);
    if (larguras) ws['!cols'] = larguras.map(w => ({ wch: w }));
    X().utils.book_append_sheet(wb, ws, nome);
    return ws;
  }

  function workbook(estado, res) {
    const M = PA.modelo, D = PA.datas;
    const wb = X().utils.book_new();
    const pn = PA.motor.painel(estado, res, {});
    const k = pn.kpis;
    // RESUMO
    const resumo = [
      ['PLANO DE ATAQUE — EDIFÍCIO VENTISETTE (ASCEN)'], ['Exportado em', dt(D.hojeSerial()), 'Data de cálculo', dt(res.hoje)], [],
      ['Total de itens', k.total], ['Concluídos', k.concluidos], ['Em andamento', k.andamento], ['Não iniciados', k.naoIniciados],
      ['Atrasados', k.atrasados], ['Bloqueados', k.bloqueados], ['% conclusão', pc(k.pct)], ['Vencimento próximo', k.vencendo], [],
      ['Prumada', 'Prioridade', 'Meta', 'Término projetado', 'Folga (dias)', 'Situação', 'Maior gerador', 'Aptos', 'Entregues', '% concluído'],
      ...pn.prumadas.map(p => [p.final ? 'Final ' + p.final : 'Obra completa', vz(p.prioridade), dt(p.meta), dt(p.termino), vz(p.folga), p.situacao, p.gerador, p.aptosEscopo, p.entregues, pc(p.pct)]),
      [], ['Serviço', 'Empreiteira', 'Término projetado', 'Pior folga', 'Situação', 'Equipe atual', 'Equipe necessária', 'Pendentes', '% concluído', 'Leitura'],
      ...pn.risco.map(r => [r.servico, r.empreiteira, dt(r.termino), vz(r.piorFolga), r.situacao, r.equipe, vz(r.necessaria), r.pendentes, pc(r.pct), r.leitura])
    ];
    aba(wb, 'RESUMO', resumo, [26, 22, 14, 16, 12, 16, 18, 10, 10, 34]);
    // Uma aba por serviço, no formato da grade (código efetivo).
    for (const s of M.SERVICOS) {
      if (s.id === 'rejunte') continue;
      const linhas = [[s.nome.toUpperCase(), '', '', '', '', s.id === 'piso' ? 'Rejunte' : ''], ['Pav', 'Final 1', 'Final 2', 'Final 3', 'Final 4', s.id === 'piso' ? 'Final 1' : '', s.id === 'piso' ? 'Final 2' : '', s.id === 'piso' ? 'Final 3' : '', s.id === 'piso' ? 'Final 4' : '']];
      for (let pav = 27; pav >= 1; pav--) {
        const l = [pav];
        for (let f = 1; f <= 4; f++) l.push(pav > 20 && f > 2 ? '' : vz(res.grade[s.id][pav * 10 + f]));
        if (s.id === 'piso') for (let f = 1; f <= 4; f++) l.push(pav > 20 && f > 2 ? '' : vz(res.grade.rejunte[pav * 10 + f]));
        linhas.push(l);
      }
      aba(wb, s.aba.slice(0, 31), linhas, [8, 10, 10, 10, 10, 10, 10, 10, 10]);
    }
    // BASE
    const cab = ['ID', 'Ordem', 'Serviço', 'Empreiteira', 'Torre', 'Pavimento', 'Final', 'Apto', 'Grupo', 'Código', 'Status', 'Status consolidado', 'Detalhe', 'Início previsto', 'Data-limite',
      'Data conclusão real', 'Dias p/ vencer', 'Atrasado', 'Dias de atraso', 'Vence em breve', 'Concluído fora do prazo', 'Previsto hoje', 'Concluído na data-base', 'Observação / Justificativa',
      'Alerta de dados', 'Prioridade da fila', 'Pendente', 'Posição na fila', 'Término previsto', 'Data necessária'];
    aba(wb, 'BASE', [cab, ...res.itens.map(i => [i.id, i.ordem, i.servico, i.empreiteira, i.torre, i.pav, i.final, i.apto, i.grupo, i.codigo, i.status, i.consolidado, i.detalhe,
      dt(i.inicio), dt(i.limite), dt(i.dataReal), vz(i.diasVencer), i.atrasado, i.diasAtraso, i.venceBreve, i.foraPrazo, pc(i.previstoHoje), i.noBase, i.obs, i.alerta,
      i.prioridadeFila, i.pendente, i.posicaoFila, dt(i.terminoPrevisto), dt(i.dataNecessaria)])], [9, 6, 20, 18]);
    // CRONOGRAMA
    const F = [3, 4, 2, 1];
    aba(wb, 'CRONOGRAMA', [
      ['Serviço', 'Prazo (d.ú.)', 'Unid./apto', 'Produtividade', 'Equipe atual', 'Ritmo (aptos/dia)', ...F.map(f => 'Limite F' + f), ...F.map(f => 'Saldo F' + f), 'Início projetado',
        ...F.map(f => 'Término F' + f), 'Término (todas)', ...F.map(f => 'Folga F' + f), 'Pior folga', 'Equipe necessária', 'Acréscimo'],
      ...res.cron.servicos.map(L => [L.servico, L.prazo, L.unid, L.prod, L.equipe, L.ritmo, ...F.map(f => dt(L.limite[f])), ...F.map(f => L.saldo[f]), dt(L.inicio),
        ...F.map(f => dt(L.term[f])), dt(L.termTodas), ...F.map(f => vz(L.folga[f])), vz(L.piorFolga), vz(L.moTodas), vz(L.acrescimo)])], [22]);
    // PENDÊNCIAS
    aba(wb, 'PENDÊNCIAS', [['Nº', 'Apto', 'Etapa', 'Descrição', 'Responsável', 'Abertura', 'Prazo', 'Status', 'Resolvida em', 'Observação', 'Final', 'Atrasada?'],
      ...res.pendencias.lista.map(p => [p.n, p.apto, p.etapa, p.descricao, p.responsavel, dt(p.abertura), dt(p.prazo), p.status, dt(p.resolvidaEm), p.obs, vz(p.final), p.atrasada])], [5, 7, 16, 44, 18]);
    // HISTÓRICO
    aba(wb, 'HISTÓRICO', [['Semana', 'Data', '% previsto (plano)', '% realizado (registrado)', 'Concluídos (registrado)', 'Observação'],
      ...res.historico.semanas.map(s => [s.semana, dt(s.data), pc(s.previsto), pc(s.realizado), vz(s.concluidos), s.obs])], [8, 12, 16, 20, 18, 40]);
    // ESTRATÉGIA
    const est = [['Pav', 'Final 1', 'Final 2', 'Final 3', 'Final 4']];
    for (let pav = 27; pav >= 1; pav--) { const l = [pav]; for (let f = 1; f <= 4; f++) l.push(pav > 20 && f > 2 ? '' : estado.estrategia.vendido[pav * 10 + f]); est.push(l); }
    est.push([], ['Serviço', 'Escopo', 'Segue prioridade?', 'Escopo aplicado', 'Aptos no escopo', 'Pendentes', 'Término', 'Pior folga'],
      ...res.estrategia.servicos.map(s => [s.servico, s.escopo, s.segue, s.aplicado, s.aptosEscopo, s.pendentes, dt(s.termino), vz(s.piorFolga)]));
    aba(wb, 'ESTRATÉGIA', est, [22, 10, 10, 10, 10]);
    // SISTEMA: cópia exata dos dados para reimportar sem perdas.
    const json = PA.acoes.backupJSON(estado);
    const linhas = [['plano-ataque-backup', 'Não edite esta aba: ela permite reimportar a planilha no sistema sem perder nada.']];
    for (let i = 0; i < json.length; i += PEDACO) linhas.push([json.slice(i, i + PEDACO)]);
    aba(wb, 'SISTEMA', linhas, [40, 80]);
    return wb;
  }

  /** Se a planilha veio do próprio sistema, devolve o estado embutido (ou null). */
  function estadoEmbutido(wb) {
    const ws = wb.Sheets.SISTEMA;
    if (!ws || !ws.A1 || ws.A1.v !== 'plano-ataque-backup') return null;
    let s = '';
    for (let r = 2; ws['A' + r]; r++) s += String(ws['A' + r].v);
    return PA.acoes.restaurarJSON(s);
  }
  /** Relatório por empreiteira em Excel. */
  function relatorio(rel) {
    const wb = X().utils.book_new();
    const c = rel.cabecalho;
    const linhas = [
      ['RELATÓRIO DE PRAZOS — EDIFÍCIO VENTISETTE'], ['Empreiteira', c.empreiteira], ['Prumadas', c.prumadas.map(f => 'Final ' + f).join(', ')], ['Emitido em', dt(c.emitidoEm)], [],
      ['Serviço', 'Executado', 'Total', '% executado', 'Data-limite', 'Término no ritmo atual', 'Folga (dias)', 'Equipe atual', 'Equipe necessária'],
      ...c.servicos.map(s => [s.nome, s.executado, s.total, pc(s.pct), dt(s.limite), dt(s.termino), vz(s.folga), s.equipe, vz(s.necessaria)]), [],
      ['Apto', 'Pav', 'Final', 'Serviço', 'Situação', 'PRECISA ESTAR PRONTO', 'Previsto no ritmo atual', 'Data-limite', 'Pendências abertas'],
      ...rel.linhas.map(l => [l.apto, l.pav, l.final, l.servico, l.situacao + (l.atrasado ? ' (atrasado)' : ''), dt(l.dataNecessaria), dt(l.previsto), dt(l.limite), l.pendencias || ''])
    ];
    aba(wb, 'Relatório', linhas, [8, 6, 6, 22, 18, 20, 20, 14, 12]);
    return wb;
  }
  PA.exportar = { workbook, estadoEmbutido, relatorio };
})(typeof globalThis !== 'undefined' ? globalThis : this);
