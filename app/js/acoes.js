/* Ações sobre o estado (imutáveis): lançar, desfazer, backup, pendências, histórico. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  const MAX_DESFAZER = 20;
  const clone = o => JSON.parse(JSON.stringify(o));

  /** Aplica uma mudança guardando o estado anterior para desfazer. */
  function alterar(estado, rotulo, fn) {
    const antes = clone(estado);
    delete antes.meta.pilhaDesfazer;
    const novo = clone(estado);
    fn(novo);
    // Nada mudou: não cria passo de desfazer.
    const semPilha = o => { const c = Object.assign({}, o, { meta: Object.assign({}, o.meta, { pilhaDesfazer: [] }) }); return JSON.stringify(c); };
    if (semPilha(novo) === semPilha(estado)) return estado;
    const pilha = (estado.meta.pilhaDesfazer || []).concat([{ rotulo, estado: antes, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }]);
    novo.meta.pilhaDesfazer = pilha.slice(-MAX_DESFAZER);
    return novo;
  }
  function desfazer(estado) {
    const pilha = (estado.meta.pilhaDesfazer || []).slice();
    if (!pilha.length) return estado;
    const ult = pilha.pop();
    const volta = clone(ult.estado);
    volta.meta.pilhaDesfazer = pilha;
    return volta;
  }
  function ultimoRotulo(estado) { const p = estado.meta.pilhaDesfazer || []; return p.length ? p[p.length - 1].rotulo : null; }

  /** Lança (ou limpa, com valor null) o código de um serviço num apto. */
  function lancar(estado, servicoId, apto, valor) {
    const s = PA.modelo.POR_ID[servicoId];
    return alterar(estado, `${s.nome} · apto ${apto}`, e => {
      if (!valor) { delete e.lancamentos[servicoId][apto]; return; }
      const l = { codigo: String(valor.codigo === undefined ? '' : valor.codigo) };
      if (typeof valor.dataReal === 'number') l.dataReal = valor.dataReal;
      if (valor.obs) l.obs = String(valor.obs);
      e.lancamentos[servicoId][apto] = l;
    });
  }
  /** Volta os aptos ao cálculo automático: apaga código e data real, mantém a observação. */
  function limpar(estado, servicoId, aptos) {
    const s = PA.modelo.POR_ID[servicoId];
    return alterar(estado, `${s.nome} · ${aptos.length === 1 ? 'apto ' + aptos[0] : aptos.length + ' aptos'}: automático`, e => {
      for (const a of aptos) {
        const l = e.lancamentos[servicoId][a];
        if (!l) continue;
        if (l.obs) e.lancamentos[servicoId][a] = { codigo: '', obs: l.obs }; else delete e.lancamentos[servicoId][a];
      }
    });
  }
  function backupJSON(estado) {
    const c = clone(estado);
    c.meta.pilhaDesfazer = [];
    delete c.hojeConferencia;
    return JSON.stringify({ tipo: 'plano-ataque-backup', geradoEm: new Date().toISOString(), estado: c });
  }
  function restaurarJSON(texto) {
    let o;
    try { o = JSON.parse(texto); } catch (e) { throw new Error('Arquivo de backup inválido.'); }
    const e = o && o.tipo === 'plano-ataque-backup' ? o.estado : null;
    if (!e || !e.lancamentos || !e.cronograma) throw new Error('Este arquivo não é um backup do Plano de Ataque.');
    const vazio = PA.modelo.estadoVazio();
    for (const k of Object.keys(vazio)) if (e[k] === undefined) e[k] = vazio[k];
    e.meta.pilhaDesfazer = [];
    return e;
  }
  function importarPorCima(atual, novo) {
    const backup = atual ? backupJSON(atual) : null;
    const e = clone(novo);
    e.meta.pilhaDesfazer = [];
    e.meta.ultimoBackup = atual && atual.meta ? atual.meta.ultimoBackup : null;
    return { estado: e, backup };
  }
  function backupAtrasado(estado, hoje) {
    const u = estado.meta && estado.meta.ultimoBackup;
    return typeof u !== 'number' || hoje - u > 7;
  }
  function marcarBackup(estado, hoje) { const e = clone(estado); e.meta.ultimoBackup = hoje; return e; }

  /** Grava o % realizado de hoje na semana do histórico que contém hoje. */
  function registrarSemana(estado, res, hojeReal) {
    const ref = typeof hojeReal === 'number' ? hojeReal : res.hoje;
    const sem = res.historico.semanas.filter(s => s.data <= ref).pop();
    if (!sem) return estado;
    return alterar(estado, 'Registrar semana ' + sem.semana, e => {
      let h = e.historico.find(x => x.semana === sem.semana);
      if (!h) { h = { semana: sem.semana, data: sem.data }; e.historico.push(h); e.historico.sort((a, b) => a.semana - b.semana); }
      h.realizado = res.historico.pctHoje;
      h.concluidos = res.historico.concluidosHoje;
    });
  }
  const pendencia = {
    criar(estado, p) {
      return alterar(estado, 'Nova pendência', e => {
        // Id único mesmo com várias pessoas criando ao mesmo tempo (vira o uid no servidor).
        const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        e.pendencias.push({ id, ordem: Date.now(), apto: Number(p.apto), etapa: p.etapa || '', descricao: p.descricao || '', responsavel: p.responsavel || '',
          abertura: p.abertura ?? null, prazo: p.prazo ?? null, status: p.status || 'Aberta', resolvidaEm: p.resolvidaEm ?? null, obs: p.obs || '' });
      });
    },
    editar(estado, id, campos) { return alterar(estado, 'Editar pendência', e => { const p = e.pendencias.find(x => x.id === id); if (p) Object.assign(p, campos); }); },
    remover(estado, id) { return alterar(estado, 'Remover pendência', e => { e.pendencias = e.pendencias.filter(x => x.id !== id); }); }
  };
  function manual(estado, apto, etapa, valor) {
    return alterar(estado, `${etapa} · apto ${apto}`, e => {
      const m = e.manuais[apto] = e.manuais[apto] || {};
      if (valor === '' || valor === null) delete m[etapa]; else m[etapa] = String(valor);
    });
  }
  // ---------- Vistoria do cliente (Entrega) ----------
  const novoUid = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function vistoriasDo(e, apto) { return e.vistorias.filter(v => v.apto === apto).sort((a, b) => a.numero - b.numero); }
  /** Vistoria em aberto (agendada) do apto; cria uma nova se não houver. */
  function abertaOuNova(e, apto) {
    const vs = vistoriasDo(e, apto);
    const ab = vs.filter(v => v.resultado === 'agendada').pop();
    if (ab) return ab;
    const v = { uid: novoUid(), apto, numero: (vs.length ? vs[vs.length - 1].numero : 0) + 1, agendada: null, realizada: null, resultado: 'agendada', motivos: [], acompanhadoPor: '', obs: '' };
    e.vistorias.push(v);
    return v;
  }
  function lancEntrega(e, apto, codigo, data) {
    const l = Object.assign({}, e.lancamentos.entrega[apto] || {}, { codigo });
    if (typeof data === 'number' && codigo === '1') l.dataReal = data; else delete l.dataReal;
    e.lancamentos.entrega[apto] = l;
  }
  const vistoria = {
    agendar(estado, apto, data, acompanhadoPor) {
      return alterar(estado, `Vistoria agendada · apto ${apto}`, e => {
        e.vistorias = e.vistorias || [];
        const v = abertaOuNova(e, apto); v.agendada = data; if (acompanhadoPor !== undefined) v.acompanhadoPor = acompanhadoPor;
      });
    },
    aprovar(estado, apto, d) {
      d = d || {};
      return alterar(estado, `Vistoria aprovada · apto ${apto}`, e => {
        e.vistorias = e.vistorias || [];
        const v = abertaOuNova(e, apto);
        Object.assign(v, { resultado: 'aprovado', realizada: d.realizada ?? null, acompanhadoPor: d.acompanhadoPor || v.acompanhadoPor || '', obs: d.obs || '', motivos: [] });
        if (v.agendada === null) v.agendada = v.realizada;
        lancEntrega(e, apto, '1', v.realizada);
      });
    },
    /** Reprova: registra os motivos, agenda a próxima vistoria e abre uma pendência por motivo. */
    reprovar(estado, apto, d) {
      d = d || {};
      return alterar(estado, `Vistoria reprovada · apto ${apto}`, e => {
        e.vistorias = e.vistorias || [];
        const v = abertaOuNova(e, apto);
        const motivos = (d.motivos || []).filter(m => m && m.categoria).map(m => ({ categoria: m.categoria, descricao: m.descricao || '' }));
        Object.assign(v, { resultado: 'reprovado', realizada: d.realizada ?? null, acompanhadoPor: d.acompanhadoPor || v.acompanhadoPor || '', obs: d.obs || '', motivos });
        if (v.agendada === null) v.agendada = v.realizada;
        if (typeof d.novaData === 'number') e.vistorias.push({ uid: novoUid(), apto, numero: v.numero + 1, agendada: d.novaData, realizada: null, resultado: 'agendada', motivos: [], acompanhadoPor: '', obs: '' });
        const cats = PA.modelo.categoriasReprova(e);
        const agora = Date.now();
        motivos.forEach((m, i) => {
          const c = cats.find(x => x.nome === m.categoria);
          e.pendencias.push({ id: 'p' + agora.toString(36) + i + Math.random().toString(36).slice(2, 6), ordem: agora + i, apto, etapa: m.categoria,
            descricao: `Reprova vistoria nº ${v.numero}: ${m.descricao}`.trim(), responsavel: c ? c.empreiteira : '', abertura: v.realizada,
            prazo: typeof d.novaData === 'number' ? d.novaData : null, status: 'Aberta', resolvidaEm: null, obs: '' });
        });
        lancEntrega(e, apto, 'and');
      });
    }
  };
  PA.acoes = { vistoria, limpar, alterar, desfazer, ultimoRotulo, lancar, backupJSON, restaurarJSON, importarPorCima, backupAtrasado, marcarBackup, registrarSemana, pendencia, manual };
})(typeof globalThis !== 'undefined' ? globalThis : this);
