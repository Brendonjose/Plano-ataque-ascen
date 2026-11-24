/* Motor — relatório por empreiteira e prumada: datas que cada apto precisa cumprir. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  const isNum = v => typeof v === 'number' && isFinite(v);
  const low = s => String(s || '').trim().toLowerCase();
  const SIT = { 'Concluído': 'Executado', 'Em andamento': 'Em execução', 'Não iniciado': 'Liberado', 'Bloqueado': 'Bloqueado' };

  /** Itens da empreiteira. No piso/rejunte, os aptos ainda sem dono ("A definir") entram nos relatórios das duas empresas do piso. */
  function daEmpreiteira(estado, it, emp) {
    if (low(it.empreiteira) === emp) return true;
    if ((it.servicoId === 'piso' || it.servicoId === 'rejunte') && it.empreiteira === 'A definir') {
      const P = estado.piso.empreiteiras;
      return low(P.ds) === emp || low(P.jun) === emp;
    }
    return false;
  }

  function relatorio(estado, res, opts) {
    const emp = low(opts.empreiteira);
    const prum = opts.prumadas && opts.prumadas.length ? opts.prumadas : [1, 2, 3, 4];
    const pend = (res.pendencias && res.pendencias.abertasPorApto) || {};
    let itens = res.itens.filter(it => it.status !== 'Cancelado' && prum.includes(it.final) && daEmpreiteira(estado, it, emp));
    if (opts.servicos && opts.servicos.length) itens = itens.filter(it => opts.servicos.includes(it.servicoId));
    const ordens = [...new Set(itens.map(i => i.ordem))].sort((a, b) => a - b);
    const servicos = ordens.map(o => {
      const L = res.cron.porOrdem[o], d = itens.filter(i => i.ordem === o);
      const exec = d.filter(i => i.status === 'Concluído').length;
      const termos = prum.map(f => L.term[f]).filter(isNum), folgas = prum.map(f => L.folga[f]).filter(isNum), limites = prum.map(f => L.limite[f]);
      const mos = prum.map(f => L.mo[f]);
      // Piso: cada empresa tem a própria equipe e o próprio término (cota DS × Juninho).
      const P = estado.piso.empreiteiras;
      const propria = o === 1 ? (low(P.ds) === emp ? 'ds' : (low(P.jun) === emp ? 'jun' : null)) : null;
      if (propria) {
        const termino = propria === 'ds' ? res.cron.piso.finalDS : res.cron.piso.finalJun;
        const limite = Math.max(...limites);
        return { ordem: o, nome: L.servico, executado: exec, total: d.length, pct: d.length ? exec / d.length : 0, limite, termino,
          folga: isNum(termino) ? limite - termino : null, equipe: propria === 'ds' ? estado.piso.equipeDS : estado.piso.equipeJun, necessaria: null };
      }
      return {
        ordem: o, nome: L.servico, executado: exec, total: d.length, pct: d.length ? exec / d.length : 0,
        limite: Math.max(...limites), termino: termos.length ? Math.max(...termos) : null, folga: folgas.length ? Math.min(...folgas) : null,
        equipe: L.equipe, necessaria: mos.includes('Sem prazo') ? 'Sem prazo' : (mos.filter(isNum).length ? Math.max(...mos.filter(isNum)) : null)
      };
    });
    const linhas = itens.filter(i => opts.incluirExecutados || i.status !== 'Concluído').map(i => ({
      apto: i.apto, pav: i.pav, final: i.final, servico: i.servico, ordem: i.ordem, situacao: SIT[i.status] || i.status, detalhe: i.detalhe, atrasado: i.atrasado,
      dataNecessaria: i.status === 'Concluído' ? null : i.dataNecessaria, previsto: i.status === 'Concluído' ? null : i.terminoPrevisto,
      limite: i.limite, pendencias: pend[i.apto] || 0
    }));
    const chave = v => (isNum(v) ? v : Infinity);
    linhas.sort((a, b) => (a.situacao === 'Executado') - (b.situacao === 'Executado') || chave(a.dataNecessaria) - chave(b.dataNecessaria) || a.ordem - b.ordem || a.apto - b.apto);
    const nome = (PA.motor.empreiteiras(estado, res.cron).unicas.find(u => low(u) === emp) || opts.empreiteira).trim();
    return { cabecalho: { empreiteira: nome, servicos, prumadas: prum, emitidoEm: PA.datas.hojeSerial(), calculadoEm: res.hoje }, linhas };
  }
  PA.motor.relatorio = relatorio;
  PA.motor.daEmpreiteira = daEmpreiteira;
})(typeof globalThis !== 'undefined' ? globalThis : this);
