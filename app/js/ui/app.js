/* UI — casca da aplicação: estado, navegação, avisos e fluxo de importação/backup. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, icone, toast, confirmar, baixar, escolherArquivo } = PA.ui;
  const TELAS = [];
  const ctx = { estado: null, resultado: null, hoje: null, conferencia: null, filtros: {}, ui: {}, armazenamento: null, salvo: true,
    dados: null, usuario: null, fila: null, minhasVersoes: {}, semConexao: false };
  const servidor = () => ctx.dados && ctx.dados.modo === 'servidor';
  /** Permissões por papel (a regra de verdade está no servidor; aqui só esconde o que não se pode fazer). */
  const PERM = {
    admin: ['lancar', 'equipe', 'parametros', 'usuarios', 'alteracoes', 'ranking', 'estrategia', 'config', 'importar', 'pendencias', 'semana'],
    obra: ['lancar', 'equipe', 'alteracoes', 'ranking', 'estrategia', 'pendencias', 'semana'],
    diretoria: ['ranking', 'estrategia'],
    empreiteira: []
  };
  function pode(acao) { const p = ctx.usuario ? ctx.usuario.papel : 'admin'; return (PERM[p] || []).includes(acao); }

  function registrarTela(id, def) { TELAS.push(Object.assign({ id }, def)); }

  function lerSessao(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function gravarSessao(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  function lerLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravarLocal(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } }

  function definirHoje() {
    const c = lerSessao('pa.hojeConferencia');
    ctx.conferencia = c ? Number(c) : null;
    ctx.hoje = ctx.conferencia || PA.datas.hojeSerial();
  }
  function recalcular() {
    const t = performance.now();
    ctx.resultado = PA.motor.calcular(ctx.estado, ctx.hoje);
    ctx.ultimoCalculoMs = performance.now() - t;
  }
  /** Aplica um novo estado: salva, recalcula e redesenha. */
  function aplicar(novo, opts) {
    if (novo === ctx.estado && !(opts && opts.forcar)) return;
    // Calcula antes de salvar: uma entrada que quebra o cálculo nunca chega ao armazenamento.
    const anterior = ctx.estado, resAnterior = ctx.resultado;
    ctx.estado = novo;
    try { recalcular(); } catch (e) {
      console.error(e);
      ctx.estado = anterior; ctx.resultado = resAnterior;
      toast('Valor não aceito: o cálculo não consegue usar esse dado. Nada foi alterado.');
      desenhar();
      return;
    }
    if (servidor()) {
      const ops = PA.dados.diff(anterior || PA.modelo.estadoVazio(), novo);
      // Guarda no passo de desfazer quais registros ESTA ação mudou (o desfazer só mexe neles).
      const ultimo = p => (p && p.length ? p[p.length - 1].id : null);
      const pn = novo.meta.pilhaDesfazer || [];
      if (pn.length && ultimo(pn) !== ultimo(anterior && anterior.meta.pilhaDesfazer)) pn[pn.length - 1].chaves = ops.map(PA.dados.servidor.chaveOp);
      guardarCache();
      if (ops.length && !(opts && opts.semEnvio)) ctx.fila.enviar(ops);
    } else {
      const r = ctx.armazenamento.salvar(novo);
      ctx.salvo = r.ok; ctx.erroSalvar = r.erro;
    }
    desenhar();
    if (opts && opts.msg) toast(opts.msg, opts.desfazer === false ? null : { rotulo: 'Desfazer', fn: desfazer });
  }
  async function desfazer() {
    if (!ctx.estado || !(ctx.estado.meta.pilhaDesfazer || []).length) return;
    const rot = PA.acoes.ultimoRotulo(ctx.estado);
    let volta = PA.acoes.desfazer(ctx.estado);
    if (servidor()) {
      const pilha = ctx.estado.meta.pilhaDesfazer;
      const passo = pilha[pilha.length - 1];
      const chaves = new Set(passo.chaves || []);
      // Só os registros que ESTA ação mudou; o resto (mudanças de outras pessoas) fica como está.
      const ops = PA.dados.diff(ctx.estado, volta).filter(op => chaves.has(PA.dados.servidor.chaveOp(op)));
      const naFila = new Set(ctx.fila.ops().map(PA.dados.servidor.chaveOp));
      const checar = ops.filter(op => !naFila.has(PA.dados.servidor.chaveOp(op)));
      let srv;
      try { srv = await ctx.dados.versoesServidor(checar); } catch (e) { toast('Sem conexão: não foi possível conferir o desfazer.'); return; }
      // Conflito: o registro no servidor não é mais a versão que EU gravei (alterado ou apagado por outra pessoa).
      const conflito = checar.some(op => { const k = PA.dados.servidor.chaveOp(op); return srv[k] !== (ctx.minhasVersoes[k] || null); });
      if (conflito) {
        pilha.pop();
        desenhar();
        toast('Outra pessoa alterou depois. Desfazer cancelado: ' + rot);
        return;
      }
      const base = JSON.parse(JSON.stringify(ctx.estado));
      base.meta.pilhaDesfazer = pilha.slice(0, -1);
      volta = PA.dados.aplicarOps(base, ops);
    }
    aplicar(volta);
    toast('Desfeito: ' + rot);
  }
  function definirConferencia(serial) {
    gravarSessao('pa.hojeConferencia', serial ? String(serial) : null);
    definirHoje(); recalcular(); desenhar();
  }

  async function importarPlanilha() {
    const f = await escolherArquivo('.xlsx,.xlsm,.xls');
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const novo = PA.importar.deWorkbook(wb);
      novo.meta.importadoEm = PA.datas.hojeSerial();
      novo.meta.origem = f.name;
      if (servidor()) {
        const ok = await confirmar('Importar a planilha no servidor?', 'A planilha "' + f.name + '" vira a base de todos os usuários. Isso só pode ser feito uma vez.', 'Importar');
        if (!ok) return;
        await ctx.dados.importarTudo(novo);
        await carregarDoServidor();
        toast('Planilha importada no servidor.');
        return;
      }
      if (ctx.estado) {
        const ok = await confirmar('Substituir os dados atuais?', 'Os lançamentos feitos no sistema serão substituídos pelos da planilha "' + f.name + '". Antes, o sistema baixa um backup dos dados atuais.', 'Baixar backup e substituir');
        if (!ok) return;
        const { estado, backup } = PA.acoes.importarPorCima(ctx.estado, novo);
        baixar('backup_antes_importar_' + PA.datas.paraISO(PA.datas.hojeSerial()) + '.json', backup, 'application/json');
        aplicar(estado, { msg: 'Planilha importada.', desfazer: false });
      } else {
        aplicar(novo, { msg: 'Planilha importada. Bem-vindo!', desfazer: false });
      }
    } catch (e) {
      console.error(e);
      toast('Não foi possível importar: ' + e.message);
    }
  }
  async function restaurarBackup() {
    if (servidor()) { toast('No modo servidor, os backups são restaurados pelo administrador no próprio servidor (ver OPERACAO.md).'); return; }
    const f = await escolherArquivo('.json');
    if (!f) return;
    try {
      const novo = PA.acoes.restaurarJSON(await f.text());
      if (ctx.estado) {
        const ok = await confirmar('Restaurar backup?', 'Os dados atuais serão substituídos pelo backup "' + f.name + '". Antes, o sistema baixa uma cópia dos dados atuais.', 'Baixar cópia e restaurar');
        if (!ok) return;
        const { backup } = PA.acoes.importarPorCima(ctx.estado, novo);
        baixar('backup_antes_restaurar_' + PA.datas.paraISO(PA.datas.hojeSerial()) + '.json', backup, 'application/json');
      }
      aplicar(novo, { msg: 'Backup restaurado.', desfazer: false });
    } catch (e) { toast(e.message); }
  }
  function salvarBackup() {
    if (servidor()) {
      baixar('Plano_de_Ataque_backup_' + PA.datas.paraISO(PA.datas.hojeSerial()) + '.json', PA.acoes.backupJSON(ctx.estado), 'application/json');
      toast('Cópia dos dados salva na pasta de downloads.');
      return;
    }
    const e = PA.acoes.marcarBackup(ctx.estado, PA.datas.hojeSerial());
    baixar('Plano_de_Ataque_backup_' + PA.datas.paraISO(PA.datas.hojeSerial()) + '.json', PA.acoes.backupJSON(e), 'application/json');
    aplicar(e, { msg: 'Backup salvo na pasta de downloads.', desfazer: false });
  }
  function exportarExcel() {
    const wb = PA.exportar.workbook(ctx.estado, ctx.resultado);
    XLSX.writeFile(wb, 'Plano_de_Ataque_' + PA.datas.paraISO(PA.datas.hojeSerial()) + '.xlsx');
    toast('Planilha exportada.');
  }

  function tema(alternar) {
    let t = lerLocal('pa.tema') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
    if (alternar) { t = t === 'escuro' ? 'claro' : 'escuro'; gravarLocal('pa.tema', t); }
    document.documentElement.setAttribute('data-tema', t);
    return t;
  }

  /** A tela aparece para este usuário? (perfis = papéis que veem; servidor = só no modo multiusuário) */
  function visivel(t) {
    if (t.servidor && !servidor()) return false;
    if (!t.perfis) return true;
    return t.perfis.includes(ctx.usuario ? ctx.usuario.papel : 'admin');
  }
  function telaInicial() {
    const p = ctx.usuario ? ctx.usuario.papel : 'admin';
    const pref = p === 'empreiteira' ? 'acompanhamento' : (p === 'diretoria' ? 'painel' : 'lancar');
    return TELAS.find(t => t.id === pref && visivel(t)) || TELAS.find(visivel);
  }
  function telaAtual() {
    const id = (location.hash || '').slice(1).split('?')[0];
    const t = TELAS.find(x => x.id === id);
    return t && visivel(t) ? t : telaInicial();
  }

  /** Posição do campo com foco, para devolver o foco depois de redesenhar. */
  function marcarFoco() {
    let a = document.activeElement;
    if (!a || !a.closest || !a.closest('main')) a = ctx.ultimoFoco && ctx.ultimoFoco.isConnected ? ctx.ultimoFoco : null;
    if (!a || !a.closest || !a.closest('main')) return null;
    const lista = [...document.querySelectorAll('main input, main select, main textarea, main button')];
    return { i: lista.indexOf(a), tela: (location.hash || '#lancar') };
  }
  function desenhar() {
    const foco = marcarFoco();
    const raiz = document.getElementById('app');
    raiz.innerHTML = '';
    if (servidor() && !ctx.usuario) { raiz.appendChild(PA.ui.login.tela(ctx.dados, aoEntrar)); return; }
    if (servidor() && ctx.estado && vazio(ctx.estado)) { raiz.appendChild(servidorVazio()); return; }
    if (!ctx.estado) { raiz.appendChild(boasVindas()); return; }
    const tela = telaAtual();
    const nav = h('nav', { 'aria-label': 'Telas' }, TELAS.filter(visivel).map(t => h('a' + (t === tela ? '.ativo' : ''), { href: '#' + t.id, title: t.titulo }, icone(t.icone), h('span', t.menu || t.titulo))));
    const lateral = h('aside.lateral', h('div.marca', h('img', { src: 'img/logo_ASCEN.png', alt: 'ASCEN' }), h('span', 'Ventisette · Plano de Ataque')), nav,
      h('div.rodape', servidor() ? ['Dados no servidor', h('br'), ctx.usuario.nome + ' · ' + ctx.usuario.papel] : ['Dados neste computador', h('br'), ctx.estado.meta.origem ? 'Origem: ' + ctx.estado.meta.origem : '']));
    const podeDesfazer = (ctx.estado.meta.pilhaDesfazer || []).length > 0;
    const topo = h('header.topo',
      h('div', h('h1', tela.titulo), h('div.sub', 'Edifício Ventisette · ' + ctx.estado.config.torre + ' · hoje ' + PA.datas.fmt(ctx.hoje))),
      h('div.espaco'),
      h('div.linha.acoes-topo',
        h('button.btn.peq', { onclick: desfazer, disabled: !podeDesfazer, title: podeDesfazer ? 'Desfazer: ' + PA.acoes.ultimoRotulo(ctx.estado) : 'Nada para desfazer' }, icone('desfazer'), 'Desfazer'),
        h('button.btn.peq', { onclick: salvarBackup, title: 'Baixar backup (.json)' }, icone('baixar'), 'Backup'),
        h('button.btn.peq', { onclick: () => { tema(true); desenhar(); }, title: 'Tema claro/escuro', 'aria-label': 'Alternar tema' }, icone(document.documentElement.getAttribute('data-tema') === 'escuro' ? 'sol' : 'lua')),
        servidor() ? h('button.btn.peq', { onclick: sair, title: 'Sair (' + ctx.usuario.nome + ')' }, 'Sair') : null));
    const faixas = [];
    if (ctx.conferencia) faixas.push(h('div.faixa.amarela', { role: 'alert' }, '⚠ Modo conferência: o sistema está calculando como se hoje fosse ' + PA.datas.fmt(ctx.conferencia) + '.', h('button', { onclick: () => definirConferencia(null) }, 'Voltar para hoje')));
    if (servidor()) {
      const n = ctx.fila.pendentes();
      if (ctx.semConexao) faixas.push(h('div.faixa.vermelha', { role: 'alert' }, '⚠ Sem conexão com o servidor: mostrando os dados salvos neste aparelho.'));
      if (n) faixas.push(h('div.faixa.amarela', { role: 'status', 'data-fila': n }, `${n} ${n === 1 ? 'lançamento aguardando' : 'lançamentos aguardando'} envio. O sistema envia sozinho quando a conexão voltar.`, h('button', { onclick: () => ctx.fila.retomar() }, 'Tentar agora')));
    } else if (!ctx.armazenamento.disponivel || !ctx.salvo) faixas.push(h('div.faixa.vermelha', { role: 'alert' }, ctx.erroSalvar === 'cota' ? '⚠ O navegador está sem espaço: os dados NÃO estão sendo salvos. Baixe um backup agora.' : '⚠ Dados não estão sendo salvos neste navegador (janela anônima ou bloqueio). Baixe um backup antes de fechar.', h('button', { onclick: salvarBackup }, 'Baixar backup')));
    else if (!servidor() && PA.acoes.backupAtrasado(ctx.estado, PA.datas.hojeSerial())) faixas.push(h('div.faixa.amarela', 'Faça um backup dos dados: o último foi ' + (ctx.estado.meta.ultimoBackup ? 'em ' + PA.datas.fmt(ctx.estado.meta.ultimoBackup) : 'nunca') + '.', h('button', { onclick: salvarBackup }, 'Fazer backup agora')));
    const conteudo = h('main.conteudo');
    const principal = h('div.principal', topo, faixas, conteudo);
    raiz.appendChild(h('div.app', lateral, principal));
    try { tela.render(conteudo, ctx); } catch (e) { console.error(e); conteudo.appendChild(h('div.cartao', 'Erro ao desenhar a tela: ' + e.message)); }
    if (foco && foco.i >= 0 && foco.tela === (location.hash || '#lancar') && !document.querySelector('.fundo-modal')) {
      // Se a edição terminou com Tab, segue para o próximo campo (o navegador perderia o foco ao redesenhar).
      const tab = Date.now() - (ctx.ultimoTab || 0) < 400 ? (ctx.ultimoTabShift ? -1 : 1) : 0;
      setTimeout(() => {
        const lista = [...document.querySelectorAll('main input, main select, main textarea, main button')];
        const alvo = lista[foco.i + tab] || lista[foco.i];
        if (alvo) alvo.focus({ preventScroll: true });
      }, 0);
    }
  }

  function boasVindas() {
    return h('div.boas-vindas',
      h('img', { src: 'img/logo_Ventisette.png', alt: 'Ventisette' }),
      h('h2', 'Plano de Ataque · Serviços finais'),
      h('p.mudo', 'Para começar, importe a planilha Plano de Ataque (v6) ou restaure um backup do sistema. Os dados ficam guardados neste computador.'),
      h('div.acoes', h('button.btn.prim', { onclick: importarPlanilha }, icone('subir'), 'Importar planilha (.xlsx)'), h('button.btn', { onclick: restaurarBackup }, icone('subir'), 'Restaurar backup (.json)')),
      ctx.armazenamento.corrompido ? h('p', { style: { color: 'var(--late)', marginTop: '18px' } }, 'Os dados salvos neste navegador estavam ilegíveis. Uma cópia foi guardada (pa.estado.v1.corrompido). Restaure o último backup (.json).') : null,
      ctx.erroInicio ? h('p', { style: { color: 'var(--late)', marginTop: '18px' } }, 'Os dados salvos não puderam ser calculados (' + ctx.erroInicio + '). Restaure um backup ou importe a planilha de novo.') : null,
      !ctx.armazenamento.disponivel ? h('p', { style: { color: 'var(--late)', marginTop: '18px' } }, 'Atenção: este navegador não está salvando dados (janela anônima?). Use uma janela normal do Chrome ou Edge.') : null);
  }

  // ---------- Modo servidor ----------
  const vazio = e => e.config.dataBase === null && e.cronograma.metaMacro === null;
  function servidorVazio() {
    return h('div.boas-vindas',
      h('img', { src: 'img/logo_Ventisette.png', alt: 'Ventisette' }), h('h2', 'Plano de Ataque · Serviços finais'),
      pode('importar') ? [h('p.mudo', 'O servidor ainda não tem dados. Importe a planilha Plano de Ataque (v6). Isso é feito uma única vez.'),
        h('div.acoes', h('button.btn.prim', { onclick: importarPlanilha }, icone('subir'), 'Importar planilha (.xlsx)'))]
        : h('p.mudo', 'O administrador ainda não carregou a planilha. Tente de novo mais tarde.'),
      h('div.acoes', h('button.btn', { onclick: sair }, 'Sair')));
  }
  const chaveCache = () => 'pa.cache.' + (ctx.usuario ? ctx.usuario.id : 'x');
  function guardarCache() {
    try { const c = JSON.parse(JSON.stringify(ctx.estado)); c.meta.pilhaDesfazer = []; localStorage.setItem(chaveCache(), JSON.stringify(c)); } catch (e) { /* sem espaço */ }
  }
  async function carregarDoServidor() {
    try {
      ctx.estado = await ctx.dados.carregar();
      ctx.semConexao = false;
      // Operações ainda na fila (feitas sem conexão) continuam valendo na tela.
      ctx.estado = PA.dados.aplicarOps(ctx.estado, ctx.fila.ops());
    } catch (e) {
      let c = null; try { c = JSON.parse(localStorage.getItem(chaveCache()) || 'null'); } catch (e2) { c = null; }
      if (!c) throw e;
      ctx.estado = PA.dados.aplicarOps(c, ctx.fila.ops());
      ctx.semConexao = true;
    }
    if (!ctx.estado.meta.pilhaDesfazer) ctx.estado.meta.pilhaDesfazer = [];
    if (!vazio(ctx.estado)) { recalcular(); guardarCache(); }
    desenhar();
  }
  function prepararFila() {
    ctx.fila = PA.dados.fila.criar(ctx.dados, ctx.usuario.id, {
      sucesso: op => { const k = PA.dados.servidor.chaveOp(op); ctx.minhasVersoes[k] = ctx.dados.versaoLocal(op); },
      mudou: (n, motivo) => { if (motivo === 'rede') ctx.semConexao = true; else if (!n) ctx.semConexao = false; desenhar(); },
      sessao: () => pedirLogin('Sua sessão expirou ou o acesso foi alterado. Entre de novo para enviar os lançamentos.'),
      recusa: (op, f) => { toast('O servidor recusou uma alteração (sem permissão). Recarregando os dados.'); carregarDoServidor(); }
    });
  }
  function pedirLogin(aviso) {
    if (document.querySelector('.fundo-modal.login')) return;
    const anterior = ctx.usuario ? ctx.usuario.id : null;
    const m = PA.ui.modal('Entre de novo', PA.ui.login.formulario(ctx.dados, async u => {
      m.fechar();
      if (u.id !== anterior) {
        // Outra pessoa entrou: a fila do usuário anterior fica guardada para ele e não é enviada.
        if (ctx.fila) ctx.fila.parar();
        ctx.usuario = u; ctx.minhasVersoes = {}; prepararFila(); await carregarDoServidor(); ctx.fila.processar();
      } else { ctx.usuario = u; ctx.fila.retomar(); desenhar(); }
    }, aviso));
    m.el.parentNode.classList.add('login');
  }
  async function aoEntrar(u) {
    ctx.usuario = u;
    prepararFila();
    await carregarDoServidor();
    // Mudanças de outros usuários chegam uma a uma: junta e recalcula uma vez (ex.: importação = milhares).
    let lote = [], tLote = null;
    ctx.dados.aoMudar(op => {
      lote.push(op);
      if (tLote) return;
      tLote = setTimeout(() => {
        const ops = lote; lote = []; tLote = null;
        if (!ctx.estado) return;
        ctx.estado = PA.dados.aplicarOps(ctx.estado, ops);
        if (vazio(ctx.estado)) { desenhar(); return; }
        try { recalcular(); } catch (e) { console.error(e); }
        guardarCache();
        if (!document.querySelector('.fundo-modal')) desenhar(); else ctx.redesenharAoFechar = true;
      }, 300);
    }).catch(() => { /* tempo real indisponível: segue sem */ });
    ctx.fila.processar();
    if (!location.hash) { const t = telaInicial(); if (t) history.replaceState(null, '', '#' + t.id); desenhar(); }
  }
  function sair() {
    if (ctx.fila && ctx.fila.pendentes() && !confirm('Há lançamentos ainda não enviados. Se sair agora, eles ficam guardados neste aparelho e serão enviados no próximo login. Sair mesmo assim?')) return;
    if (ctx.fila) ctx.fila.parar();
    ctx.fila = null; ctx.minhasVersoes = {};
    ctx.dados.sair(); ctx.usuario = null; ctx.estado = null; ctx.resultado = null; desenhar();
  }

  function iniciar() {
    tema(false);
    let backend = null;
    try { backend = window.localStorage; } catch (e) { backend = null; }
    ctx.armazenamento = PA.armazenamento.criar(backend);
    // Aberto por um servidor (http/https) → modo multiusuário; aberto como arquivo → modo local da v1.
    const cfg = root.PA_CONFIG || {};
    if (/^https?:$/.test(location.protocol) && cfg.modo !== 'local' && root.PocketBase) {
      ctx.dados = PA.dados.servidor.criar(cfg.servidor || location.origin);
      definirHoje();
      window.addEventListener('hashchange', () => { desenhar(); window.scrollTo(0, 0); });
      document.addEventListener('focusin', e => { ctx.ultimoFoco = e.target; });
      document.addEventListener('keydown', e => { if (e.key === 'Tab') { ctx.ultimoTab = Date.now(); ctx.ultimoTabShift = e.shiftKey; } }, true);
      const u = ctx.dados.usuario();
      if (u) {
        aoEntrar(u).catch(e => { console.error(e); ctx.usuario = null; desenhar(); });
        // Confirma a sessão com o servidor (usuário desativado cai para o login).
        ctx.dados.renovar().then(r => { if (!r && !ctx.semConexao) { ctx.usuario = null; desenhar(); } });
      } else desenhar();
      return;
    }
    ctx.dados = PA.dados.local.criar(ctx.armazenamento);
    ctx.estado = ctx.armazenamento.carregar();
    if (ctx.estado) { const v = PA.modelo.estadoVazio(); for (const k of Object.keys(v)) if (ctx.estado[k] === undefined) ctx.estado[k] = v[k]; }
    definirHoje();
    if (ctx.estado) {
      try { recalcular(); } catch (e) {
        console.error(e);
        // Dado salvo que não calcula: não trava; oferece restaurar ou importar de novo.
        ctx.erroInicio = e.message; ctx.estadoInvalido = ctx.estado; ctx.estado = null;
      }
    }
    window.addEventListener('hashchange', () => { desenhar(); window.scrollTo(0, 0); });
    document.addEventListener('focusin', e => { ctx.ultimoFoco = e.target; });
    document.addEventListener('keydown', e => { if (e.key === 'Tab') { ctx.ultimoTab = Date.now(); ctx.ultimoTabShift = e.shiftKey; } }, true);
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); desfazer(); } });
    desenhar();
  }

  Object.assign(PA.ui, { pode, servidor, visivel, registrarTela, ctx, aplicar, desfazer, desenhar, recalcular, importarPlanilha, restaurarBackup, salvarBackup, exportarExcel, definirConferencia, iniciar, TELAS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
