/* Diferença entre dois estados → operações granulares (o que o servidor precisa gravar). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.dados = PA.dados || {};
  const json = v => JSON.stringify(v === undefined ? null : v);
  const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const PARAMS = ['config', 'feriados', 'cronograma', 'piso', 'estrategia', 'retratoBase'];

  /** Chaves de equipe: serviços (exceto piso) + as duas equipes do piso. */
  function chavesEquipe() { return PA.modelo.SERVICOS.filter(s => s.id !== 'piso').map(s => s.id).concat(['piso_ds', 'piso_jun']); }
  function lerEquipe(e, chave) {
    if (chave === 'piso_ds') return e.piso.equipeDS;
    if (chave === 'piso_jun') return e.piso.equipeJun;
    return e.cronograma.servicos[chave].equipe;
  }
  function escreverEquipe(e, chave, v) {
    if (chave === 'piso_ds') e.piso.equipeDS = v;
    else if (chave === 'piso_jun') e.piso.equipeJun = v;
    else e.cronograma.servicos[chave].equipe = v;
  }
  /** Parâmetro sem os campos de equipe (que têm coleção própria). */
  function lerParam(e, chave) {
    const v = clone(e[chave]);
    if (chave === 'cronograma' && v) for (const id of Object.keys(v.servicos)) if (id !== 'piso') delete v.servicos[id].equipe;
    if (chave === 'piso' && v) { delete v.equipeDS; delete v.equipeJun; }
    return v;
  }
  function escreverParam(e, chave, v) {
    if (chave === 'cronograma') {
      const eq = {}; for (const id of Object.keys(e.cronograma.servicos)) eq[id] = e.cronograma.servicos[id].equipe;
      e.cronograma = clone(v);
      for (const id of Object.keys(e.cronograma.servicos)) if (id !== 'piso' && eq[id] !== undefined) e.cronograma.servicos[id].equipe = eq[id];
    } else if (chave === 'piso') {
      const ds = e.piso.equipeDS, jun = e.piso.equipeJun;
      e.piso = clone(v); e.piso.equipeDS = ds; e.piso.equipeJun = jun;
    } else e[chave] = clone(v);
  }

  function diff(a, b) {
    const ops = [];
    for (const s of PA.modelo.SERVICOS) {
      const la = a.lancamentos[s.id] || {}, lb = b.lancamentos[s.id] || {};
      const aptos = new Set(Object.keys(la).concat(Object.keys(lb)));
      for (const k of [...aptos].sort((x, y) => x - y)) {
        if (json(la[k]) !== json(lb[k])) ops.push({ tipo: 'lanc', servico: s.id, apto: Number(k), valor: lb[k] === undefined ? null : clone(lb[k]) });
      }
    }
    for (const c of chavesEquipe()) {
      const va = lerEquipe(a, c), vb = lerEquipe(b, c);
      if (json(va) !== json(vb)) ops.push({ tipo: 'equipe', chave: c, valor: vb });
    }
    const pa = {}; a.pendencias.forEach(p => { pa[p.id] = p; });
    const pb = {}; b.pendencias.forEach(p => { pb[p.id] = p; });
    for (const id of new Set(Object.keys(pa).concat(Object.keys(pb)))) {
      if (json(pa[id]) !== json(pb[id])) ops.push({ tipo: 'pend', uid: id, valor: pb[id] === undefined ? null : clone(pb[id]) });
    }
    const aptosM = new Set(Object.keys(a.manuais).concat(Object.keys(b.manuais)));
    for (const ap of aptosM) {
      const ma = a.manuais[ap] || {}, mb = b.manuais[ap] || {};
      for (const et of new Set(Object.keys(ma).concat(Object.keys(mb)))) {
        if (json(ma[et]) !== json(mb[et])) ops.push({ tipo: 'manual', apto: Number(ap), etapa: et, valor: mb[et] === undefined ? null : mb[et] });
      }
    }
    const ha = {}; a.historico.forEach(x => { ha[x.semana] = x; });
    const hb = {}; b.historico.forEach(x => { hb[x.semana] = x; });
    for (const sem of new Set(Object.keys(ha).concat(Object.keys(hb)))) {
      if (json(ha[sem]) !== json(hb[sem])) ops.push({ tipo: 'semana', semana: Number(sem), valor: hb[sem] === undefined ? null : clone(hb[sem]) });
    }
    for (const c of PARAMS) {
      const va = lerParam(a, c), vb = lerParam(b, c);
      if (json(va) !== json(vb)) ops.push({ tipo: 'param', chave: c, valor: vb === undefined ? null : vb });
    }
    return ops;
  }

  /** Aplica operações a um estado (usado no tempo real e nos testes). Devolve um novo estado. */
  function aplicarOps(estado, ops) {
    const e = clone(estado);
    for (const op of ops) {
      if (op.tipo === 'lanc') { if (op.valor === null) delete e.lancamentos[op.servico][op.apto]; else e.lancamentos[op.servico][op.apto] = clone(op.valor); }
      else if (op.tipo === 'equipe') escreverEquipe(e, op.chave, op.valor);
      else if (op.tipo === 'pend') {
        const i = e.pendencias.findIndex(p => p.id === op.uid);
        if (op.valor === null) { if (i >= 0) e.pendencias.splice(i, 1); }
        else if (i >= 0) e.pendencias[i] = clone(op.valor); else e.pendencias.push(clone(op.valor));
        e.pendencias.sort((x, y) => (x.ordem || 0) - (y.ordem || 0));
      } else if (op.tipo === 'manual') {
        const m = e.manuais[op.apto] = e.manuais[op.apto] || {};
        if (op.valor === null) { delete m[op.etapa]; if (!Object.keys(m).length) delete e.manuais[op.apto]; } else m[op.etapa] = op.valor;
      } else if (op.tipo === 'semana') {
        const i = e.historico.findIndex(x => x.semana === op.semana);
        if (op.valor === null) { if (i >= 0) e.historico.splice(i, 1); }
        else if (i >= 0) e.historico[i] = clone(op.valor); else e.historico.push(clone(op.valor));
        e.historico.sort((x, y) => x.semana - y.semana);
      } else if (op.tipo === 'param') escreverParam(e, op.chave, op.valor);
    }
    return e;
  }

  /** Ids determinísticos (15 caracteres [a-z0-9], exigência do PocketBase) → gravação idempotente. */
  function hash(s) {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 2246822519) >>> 0; }
    return (h1.toString(36) + h2.toString(36)).padEnd(14, '0').slice(0, 14);
  }
  const pad15 = s => (s + '000000000000000').slice(0, 15);
  const ids = {
    lanc: (servico, apto) => pad15('l' + String(PA.modelo.POR_ID[servico].ordem).padStart(2, '0') + String(apto).padStart(3, '0')),
    manual: (apto, etapa) => 'm' + hash(apto + '|' + etapa),
    equipe: chave => 'e' + hash(chave),
    param: chave => 'p' + hash(chave),
    semana: semana => pad15('s' + String(semana).padStart(3, '0')),
    pend: uid => 'n' + hash(uid)
  };
  Object.assign(PA.dados, { diff, aplicarOps, ids, chavesEquipe, PARAMS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
