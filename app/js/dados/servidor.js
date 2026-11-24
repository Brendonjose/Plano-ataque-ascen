/* Adaptador de dados — servidor PocketBase (multiusuário). Mesma interface do adaptador local. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.dados = PA.dados || {};
  const COLECOES = ['lancamentos', 'equipes', 'pendencias', 'manuais', 'semanas', 'parametros', 'vistorias'];
  const nulo0 = v => (typeof v === 'number' && v !== 0 ? v : null); // campo número vazio no PocketBase = 0

  // ---- Conversão estado ⇄ registros ----
  function opParaRegistro(op) {
    const ids = PA.dados.ids;
    if (op.tipo === 'lanc') {
      const v = op.valor;
      return { colecao: 'lancamentos', id: ids.lanc(op.servico, op.apto), dados: v && { servico: op.servico, apto: op.apto, codigo: v.codigo || '', data_real: typeof v.dataReal === 'number' ? v.dataReal : 0, obs: v.obs || '' } };
    }
    if (op.tipo === 'equipe') return { colecao: 'equipes', id: ids.equipe(op.chave), dados: op.valor === null ? null : { chave: op.chave, equipe: Number(op.valor) || 0 } };
    if (op.tipo === 'pend') {
      const p = op.valor;
      return { colecao: 'pendencias', id: ids.pend(op.uid), dados: p && { uid: op.uid, ordem: p.ordem || 0, apto: p.apto || 0, etapa: p.etapa || '', descricao: p.descricao || '', responsavel: p.responsavel || '',
        abertura: p.abertura || 0, prazo: p.prazo || 0, status: p.status || 'Aberta', resolvida_em: p.resolvidaEm || 0, obs: p.obs || '' } };
    }
    if (op.tipo === 'manual') return { colecao: 'manuais', id: ids.manual(op.apto, op.etapa), dados: op.valor === null ? null : { apto: op.apto, etapa: op.etapa, valor: String(op.valor) } };
    if (op.tipo === 'semana') return { colecao: 'semanas', id: ids.semana(op.semana), dados: op.valor && { semana: op.semana, dados: op.valor } };
    if (op.tipo === 'vistoria') {
      const v = op.valor;
      return { colecao: 'vistorias', id: ids.vistoria(op.uid), dados: v && { uid: op.uid, apto: v.apto, numero: v.numero || 0, agendada: v.agendada || 0, realizada: v.realizada || 0,
        resultado: v.resultado, motivos: v.motivos || [], acompanhado_por: v.acompanhadoPor || '', obs: v.obs || '' } };
    }
    if (op.tipo === 'param') return { colecao: 'parametros', id: ids.param(op.chave), dados: op.valor === null ? null : { chave: op.chave, valor: op.valor } };
    throw new Error('Operação desconhecida: ' + op.tipo);
  }
  function registroParaOp(colecao, r, apagado) {
    if (colecao === 'lancamentos') {
      if (apagado) return { tipo: 'lanc', servico: r.servico, apto: r.apto, valor: null };
      const v = { codigo: r.codigo || '' };
      if (nulo0(r.data_real) !== null) v.dataReal = r.data_real;
      if (r.obs) v.obs = r.obs;
      return { tipo: 'lanc', servico: r.servico, apto: r.apto, valor: v };
    }
    if (colecao === 'equipes') return { tipo: 'equipe', chave: r.chave, valor: apagado ? null : r.equipe };
    if (colecao === 'pendencias') {
      if (apagado) return { tipo: 'pend', uid: r.uid, valor: null };
      return { tipo: 'pend', uid: r.uid, valor: { id: r.uid, ordem: r.ordem, apto: nulo0(r.apto), etapa: r.etapa, descricao: r.descricao, responsavel: r.responsavel,
        abertura: nulo0(r.abertura), prazo: nulo0(r.prazo), status: r.status, resolvidaEm: nulo0(r.resolvida_em), obs: r.obs } };
    }
    if (colecao === 'manuais') return { tipo: 'manual', apto: r.apto, etapa: r.etapa, valor: apagado ? null : r.valor };
    if (colecao === 'semanas') return { tipo: 'semana', semana: r.semana, valor: apagado ? null : r.dados };
    if (colecao === 'vistorias') {
      if (apagado) return { tipo: 'vistoria', uid: r.uid, valor: null };
      return { tipo: 'vistoria', uid: r.uid, valor: { uid: r.uid, apto: r.apto, numero: r.numero, agendada: nulo0(r.agendada), realizada: nulo0(r.realizada), resultado: r.resultado,
        motivos: Array.isArray(r.motivos) ? r.motivos : [], acompanhadoPor: r.acompanhado_por || '', obs: r.obs || '' } };
    }
    if (colecao === 'parametros') return { tipo: 'param', chave: r.chave, valor: apagado ? null : r.valor };
    return null;
  }
  /** Classifica um erro do PocketBase. */
  function motivo(err) {
    const st = err && err.status;
    if (!st || st === 429 || st >= 500) return 'rede'; // temporário: tenta de novo depois
    if (st === 401) return 'sessao';
    return 'permissao';
  }

  function criar(url, opts) {
    if (!root.PocketBase) throw new Error('Biblioteca PocketBase não carregada.');
    const pb = new root.PocketBase(url);
    pb.autoCancellation(false);
    const versoes = {}; // "colecao:id" → updated
    const ouvintes = [];
    let assinaturas = [];
    const chave = (c, id) => c + ':' + id;

    function usuario() {
      const r = pb.authStore.record;
      if (!r || !pb.authStore.isValid) return null;
      return { id: r.id, nome: r.nome || r.email, email: r.email, papel: r.papel, empreiteira: r.empreiteira || '', ativo: r.ativo };
    }
    async function entrar(email, senha) {
      try { await pb.collection('users').authWithPassword(email, senha); }
      catch (e) { throw new Error(e && e.status === 400 ? 'E-mail ou senha incorretos, ou usuário desativado.' : 'Não foi possível conectar ao servidor.'); }
      return usuario();
    }
    async function renovar() {
      try { await pb.collection('users').authRefresh(); return usuario(); } catch (e) {
        if (!e || !e.status) return usuario(); // sem conexão: mantém a sessão guardada
        pb.authStore.clear(); return null;
      }
    }
    function sair() { pararTempoReal(); pb.authStore.clear(); }

    async function carregar() {
      let e = PA.modelo.estadoVazio();
      const ops = [];
      for (const c of COLECOES) {
        const lista = await pb.collection(c).getFullList({ batch: 1000, sort: c === 'pendencias' ? 'ordem' : '' });
        for (const r of lista) { versoes[chave(c, r.id)] = r.updated; const op = registroParaOp(c, r, false); if (op) ops.push(op); }
      }
      // Parâmetros primeiro (base), depois o resto.
      const ordem = { param: 0, equipe: 1, lanc: 2, pend: 2, manual: 2, semana: 2, vistoria: 2 };
      ops.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
      e = PA.dados.aplicarOps(e, ops);
      e.meta.origem = 'servidor';
      return e;
    }

    async function gravarUma(op) {
      const { colecao, id, dados } = opParaRegistro(op);
      const col = pb.collection(colecao);
      if (dados === null) {
        try { await col.delete(id); delete versoes[chave(colecao, id)]; return; } catch (err) {
          if (err.status !== 404) throw err;
          // 404: já não existe (ok) ou sem permissão para ver → distingue.
          try { await col.getOne(id); } catch (e2) { if (e2.status === 404) return; throw e2; }
          const e3 = new Error('Sem permissão'); e3.status = 403; throw e3;
        }
      }
      let r;
      try { r = await col.update(id, dados); } catch (err) {
        if (err.status !== 404) throw err;
        try { r = await col.create(Object.assign({ id }, dados)); } catch (e2) {
          // Outra pessoa criou o mesmo registro ao mesmo tempo: vale a última gravação → atualiza.
          if (e2.status !== 400) throw e2;
          r = await col.update(id, dados);
        }
      }
      versoes[chave(colecao, id)] = r.updated;
    }
    /** Grava operações (idempotente). Devolve {ok, falhas:[{op, motivo}]}. */
    async function gravar(ops) {
      const falhas = [];
      if (!pb.authStore.isValid) return { ok: false, falhas: ops.map(op => ({ op, motivo: 'sessao' })) };
      for (const op of ops) {
        try { await gravarUma(op); } catch (err) {
          let m = motivo(err);
          // Recusa pode ser acesso revogado (usuário desativado/papel trocado): confirma a sessão.
          if (m === 'permissao') {
            try { await pb.collection('users').authRefresh(); } catch (e2) { if (e2 && e2.status) { pb.authStore.clear(); m = 'sessao'; } else m = 'rede'; }
          }
          falhas.push({ op, motivo: m, erro: err && err.message });
        }
      }
      return { ok: falhas.length === 0, falhas };
    }
    /** Versão atual (updated) de cada registro afetado pelas operações, lida do servidor. */
    async function versoesServidor(ops) {
      const out = {};
      for (const op of ops) {
        const { colecao, id } = opParaRegistro(op);
        try { out[chave(colecao, id)] = (await pb.collection(colecao).getOne(id, { fields: 'updated' })).updated; } catch (e) { out[chave(colecao, id)] = null; }
      }
      return out;
    }
    function versaoLocal(op) { const { colecao, id } = opParaRegistro(op); return versoes[chave(colecao, id)] || null; }

    async function importarTudo(estado) {
      const ops = PA.dados.diff(PA.modelo.estadoVazio(), estado);
      const corpo = { origem: estado.meta && estado.meta.origem || '', lancamentos: [], equipes: [], pendencias: [], manuais: [], semanas: [], parametros: [], vistorias: [] };
      // Parâmetros do estado completo (o diff contra o vazio só traz o que difere do padrão).
      for (const c of PA.dados.PARAMS) {
        if (!ops.some(o => o.tipo === 'param' && o.chave === c)) ops.push({ tipo: 'param', chave: c, valor: JSON.parse(JSON.stringify(estado[c])) });
      }
      for (const c of PA.dados.chavesEquipe()) if (!ops.some(o => o.tipo === 'equipe' && o.chave === c)) {
        ops.push({ tipo: 'equipe', chave: c, valor: c === 'piso_ds' ? estado.piso.equipeDS : c === 'piso_jun' ? estado.piso.equipeJun : estado.cronograma.servicos[c].equipe });
      }
      for (const op of ops) {
        const { colecao, id, dados } = opParaRegistro(op);
        if (dados) corpo[colecao].push(Object.assign({ id }, dados));
      }
      try { await pb.send('/api/pa/importar', { method: 'POST', body: corpo }); } catch (err) {
        if (err.status === 409) throw new Error('A planilha só pode ser importada uma vez: o servidor já tem dados.');
        throw new Error('Falha ao importar: ' + (err.message || err.status));
      }
    }

    /** Tempo real: avisa mudanças feitas por outros usuários (já convertidas em operações). */
    async function aoMudar(cb) {
      ouvintes.push(cb);
      if (assinaturas.length) return;
      for (const c of COLECOES) {
        const un = await pb.collection(c).subscribe('*', ev => {
          const k = chave(c, ev.record.id);
          if (ev.action !== 'delete' && versoes[k] === ev.record.updated) return; // eco da própria gravação
          if (ev.action === 'delete') delete versoes[k]; else versoes[k] = ev.record.updated;
          const op = registroParaOp(c, ev.record, ev.action === 'delete');
          if (op) ouvintes.forEach(f => f(op, ev.record.atualizado_por));
        });
        assinaturas.push(un);
      }
    }
    function pararTempoReal() { assinaturas.forEach(un => { try { un(); } catch (e) { /* ignora */ } }); assinaturas = []; }

    // Usuários (tela Usuários, só admin) e histórico.
    const usuarios = {
      listar: () => pb.collection('users').getFullList({ sort: 'nome' }),
      criar: d => pb.collection('users').create(Object.assign({ verified: true, emailVisibility: false }, d, { passwordConfirm: d.password })),
      alterar: (id, d) => pb.collection('users').update(id, d.password ? Object.assign({}, d, { passwordConfirm: d.password }) : d),
      trocarMinhaSenha: (atual, nova) => pb.collection('users').update(pb.authStore.record.id, { oldPassword: atual, password: nova, passwordConfirm: nova })
    };
    const alteracoes = { listar: (pagina, filtro) => pb.collection('alteracoes').getList(pagina || 1, 50, { sort: '-em', filter: filtro || '' }) };

    return { modo: 'servidor', pb, url, entrar, sair, renovar, usuario, carregar, gravar, importarTudo, aoMudar, pararTempoReal, versaoLocal, versoesServidor, usuarios, alteracoes };
  }
  /** Chave única do registro afetado por uma operação (para conferir versões). */
  function chaveOp(op) { const r = opParaRegistro(op); return r.colecao + ':' + r.id; }
  PA.dados.servidor = { criar, opParaRegistro, registroParaOp, chaveOp };
})(typeof globalThis !== 'undefined' ? globalThis : this);
