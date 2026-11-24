/* Motor — Torre visual (por serviço, por apartamento, entrega) e "o que define o prazo". */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};
  const isNum = v => typeof v === 'number' && isFinite(v);
  const CLASSE = { 'Concluído': 'ok', 'Em andamento': 'and', 'Não iniciado': 'lib', 'Bloqueado': 'blq', 'Cancelado': 'canc' };
  const pct = (a, b) => (b > 0 ? a / b : 0);

  /** Situação da entrega de um apto a partir das vistorias (cores do modo Entrega). */
  function situacaoEntrega(estado, it) {
    const vs = ((estado && estado.vistorias) || []).filter(v => v.apto === it.apto).sort((a, b) => a.numero - b.numero);
    const ult = vs[vs.length - 1];
    if (ult && ult.resultado === 'aprovado') return vs.some(v => v.resultado === 'reprovado') ? { classe: 'ent-apos', rotulo: 'Aprovado após reprova', vistorias: vs } : { classe: 'ent-primeira', rotulo: 'Aprovado de primeira', vistorias: vs };
    if (ult && ult.resultado === 'agendada' && vs.some(v => v.resultado === 'reprovado')) return { classe: 'ent-reprovado', rotulo: 'Reprovado · nova vistoria ' + PA.datas.fmtCurto(ult.agendada), vistorias: vs };
    if (ult && ult.resultado === 'agendada') return { classe: 'ent-agendada', rotulo: 'Vistoria ' + PA.datas.fmtCurto(ult.agendada), vistorias: vs };
    if (ult && ult.resultado === 'reprovado') return { classe: 'ent-reprovado', rotulo: 'Reprovado', vistorias: vs };
    if (it.status === 'Concluído') return { classe: 'ent-sem', rotulo: 'Entregue (sem vistoria registrada)', vistorias: vs };
    if (it.status === 'Cancelado') return { classe: 'canc', rotulo: 'Fora do escopo', vistorias: vs };
    if (it.status === 'Bloqueado') return { classe: 'blq', rotulo: 'Ainda não liberado', vistorias: vs };
    return { classe: 'lib', rotulo: 'Liberado para vistoria', vistorias: vs };
  }

  function torre(res, f, estado) {
    f = f || {};
    const M = PA.modelo;
    const celulas = {};
    const noFiltro = a => !f.prumada || f.prumada === 'Final ' + a.final || f.prumada === a.grupo;
    const porApto = {};
    res.itens.forEach(it => { (porApto[it.apto] = porApto[it.apto] || []).push(it); });
    const serv = f.servico ? M.SERVICOS.find(s => s.nome === f.servico) : null;
    const contagem = {}; // apto → [concluído, escopo]
    for (const a of M.APTOS) {
      const lista = porApto[a.apto];
      let c;
      if (f.modo === 'apto') {
        const esc = lista.filter(i => i.status !== 'Cancelado');
        const concl = esc.filter(i => i.status === 'Concluído').length;
        const prox = lista.find(i => i.status !== 'Concluído' && i.status !== 'Cancelado');
        const p = pct(concl, esc.length);
        const classe = !esc.length ? 'canc' : (p >= 1 ? 'ok' : 'p' + Math.min(4, Math.floor(p * 5)));
        c = { classe, rotulo: String(a.apto), sub: concl + '/' + esc.length, proximo: prox ? M.POR_ORDEM[prox.ordem].curto : null, atrasado: lista.some(i => i.atrasado) };
        contagem[a.apto] = [concl, esc.length];
      } else if (f.modo === 'entrega') {
        const it = lista[11];
        const s = situacaoEntrega(estado, it);
        c = Object.assign({ rotulo: String(a.apto), sub: s.rotulo, item: it }, s);
        contagem[a.apto] = [it.status === 'Concluído' ? 1 : 0, it.status === 'Cancelado' ? 0 : 1];
      } else {
        const it = lista[(serv || M.SERVICOS[0]).ordem - 1];
        c = { classe: CLASSE[it.status] + (it.atrasado ? ' late' : ''), rotulo: String(a.apto), sub: it.status === 'Concluído' ? '✓' : (it.status === 'Em andamento' ? 'execução' : it.status === 'Bloqueado' ? 'aguarda' : it.status === 'Cancelado' ? 'fora' : 'liberado'), item: it };
        contagem[a.apto] = [it.status === 'Concluído' ? 1 : 0, it.status === 'Cancelado' ? 0 : 1];
      }
      c.visivel = noFiltro(a);
      celulas[a.apto] = c;
    }
    const soma = filtro => { let x = 0, y = 0; for (const a of M.APTOS) if (filtro(a) && noFiltro(a)) { x += contagem[a.apto][0]; y += contagem[a.apto][1]; } return pct(x, y); };
    const porPav = []; for (let p = 27; p >= 1; p--) porPav.push({ pav: p, pct: soma(a => a.pav === p) });
    const porPrumada = [1, 2, 3, 4].map(final => ({ final, pct: soma(a => a.final === final) }));
    return { modo: f.modo || 'servico', celulas, porPav, porPrumada, total: soma(() => true) };
  }

  /** Para cada serviço: o término é definido pela própria equipe ou pelo serviço anterior? E qual é o gargalo da obra. */
  function limitacao(res) {
    const M = PA.modelo, porServico = {};
    for (const L of res.cron.servicos) {
      if (!isNum(L.termTodas)) { porServico[L.ordem] = { tipo: 'concluido' }; continue; }
      const f = [1, 2, 3, 4].find(k => L.term[k] === L.termTodas);
      const s = M.POR_ORDEM[L.ordem];
      const preds = s.predsCron.map(o => res.cron.porOrdem[o]).filter(P => isNum(P.term[f]));
      if (preds.length && !(isNum(L.termCap[f]) && L.termCap[f] >= L.term[f])) {
        const P = preds.reduce((a, b) => (b.term[f] > a.term[f] ? b : a));
        porServico[L.ordem] = { tipo: 'anterior', anterior: P.servico, ordemAnterior: P.ordem, final: f };
      } else porServico[L.ordem] = { tipo: 'equipe', final: f };
    }
    // Gargalo: segue a cadeia a partir do serviço que define a data da obra até achar quem é limitado pela própria equipe.
    let gargalo = null;
    const ultimo = res.cron.servicos.filter(L => isNum(L.termTodas)).reduce((a, b) => (!a || b.termTodas >= a.termTodas ? b : a), null);
    let o = ultimo && ultimo.ordem, guarda = 0;
    while (o && guarda++ < 20) {
      const p = porServico[o];
      if (p.tipo === 'anterior') { o = p.ordemAnterior; continue; }
      if (p.tipo === 'equipe') { const L = res.cron.porOrdem[o]; gargalo = { ordem: o, servico: L.servico, termino: L.termTodas, folga: L.piorFolga, equipe: L.equipe, necessaria: L.moTodas }; }
      break;
    }
    return { porServico, gargalo };
  }
  Object.assign(PA.motor, { torre, limitacao, situacaoEntrega });
})(typeof globalThis !== 'undefined' ? globalThis : this);
