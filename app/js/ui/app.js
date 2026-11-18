/* UI — casca da aplicação: estado, navegação, avisos e fluxo de importação/backup. */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, icone, toast, confirmar, baixar, escolherArquivo } = PA.ui;
  const TELAS = [];
  const ctx = { estado: null, resultado: null, hoje: null, conferencia: null, filtros: {}, ui: {}, armazenamento: null, salvo: true };

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
    ctx.estado = novo;
    const r = ctx.armazenamento.salvar(novo);
    ctx.salvo = r.ok; ctx.erroSalvar = r.erro;
    recalcular();
    desenhar();
    if (opts && opts.msg) toast(opts.msg, opts.desfazer === false ? null : { rotulo: 'Desfazer', fn: desfazer });
  }
  function desfazer() {
    if (!ctx.estado || !(ctx.estado.meta.pilhaDesfazer || []).length) return;
    const rot = PA.acoes.ultimoRotulo(ctx.estado);
    aplicar(PA.acoes.desfazer(ctx.estado));
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
    const f = await escolherArquivo('.json');
    if (!f) return;
    try {
      const novo = PA.acoes.restaurarJSON(await f.text());
      if (ctx.estado) {
        const ok = await confirmar('Restaurar backup?', 'Os dados atuais serão substituídos pelo backup "' + f.name + '".', 'Restaurar');
        if (!ok) return;
      }
      aplicar(novo, { msg: 'Backup restaurado.', desfazer: false });
    } catch (e) { toast(e.message); }
  }
  function salvarBackup() {
    const e = PA.acoes.marcarBackup(ctx.estado, PA.datas.hojeSerial());
    baixar('Plano_de_Ataque_backup_' + PA.datas.paraISO(PA.datas.hojeSerial()) + '.json', PA.acoes.backupJSON(e), 'application/json');
    aplicar(e, { msg: 'Backup salvo na pasta de downloads.', desfazer: false });
  }
  function exportarExcel() {
    const wb = PA.exportar.workbook(ctx.estado, ctx.resultado);
    XLSX.writeFile(wb, 'Plano_de_Ataque_' + PA.datas.paraISO(ctx.hoje) + '.xlsx');
    toast('Planilha exportada.');
  }

  function tema(alternar) {
    let t = lerLocal('pa.tema') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
    if (alternar) { t = t === 'escuro' ? 'claro' : 'escuro'; gravarLocal('pa.tema', t); }
    document.documentElement.setAttribute('data-tema', t);
    return t;
  }

  function telaAtual() {
    const id = (location.hash || '#lancar').slice(1).split('?')[0];
    return TELAS.find(t => t.id === id) || TELAS[0];
  }

  function desenhar() {
    const raiz = document.getElementById('app');
    raiz.innerHTML = '';
    if (!ctx.estado) { raiz.appendChild(boasVindas()); return; }
    const tela = telaAtual();
    const nav = h('nav', { 'aria-label': 'Telas' }, TELAS.map(t => h('a' + (t === tela ? '.ativo' : ''), { href: '#' + t.id, title: t.titulo }, icone(t.icone), h('span', t.menu || t.titulo))));
    const lateral = h('aside.lateral', h('div.marca', h('img', { src: 'img/logo_ASCEN.png', alt: 'ASCEN' }), h('span', 'Ventisette · Plano de Ataque')), nav,
      h('div.rodape', 'Dados neste computador', h('br'), ctx.estado.meta.origem ? 'Origem: ' + ctx.estado.meta.origem : ''));
    const podeDesfazer = (ctx.estado.meta.pilhaDesfazer || []).length > 0;
    const topo = h('header.topo',
      h('div', h('h1', tela.titulo), h('div.sub', 'Edifício Ventisette · ' + ctx.estado.config.torre + ' · hoje ' + PA.datas.fmt(ctx.hoje))),
      h('div.espaco'),
      h('div.linha.acoes-topo',
        h('button.btn.peq', { onclick: desfazer, disabled: !podeDesfazer, title: podeDesfazer ? 'Desfazer: ' + PA.acoes.ultimoRotulo(ctx.estado) : 'Nada para desfazer' }, icone('desfazer'), 'Desfazer'),
        h('button.btn.peq', { onclick: salvarBackup, title: 'Baixar backup (.json)' }, icone('baixar'), 'Backup'),
        h('button.btn.peq', { onclick: () => { tema(true); desenhar(); }, title: 'Tema claro/escuro', 'aria-label': 'Alternar tema' }, icone(document.documentElement.getAttribute('data-tema') === 'escuro' ? 'sol' : 'lua'))));
    const faixas = [];
    if (ctx.conferencia) faixas.push(h('div.faixa.amarela', { role: 'alert' }, '⚠ Modo conferência: o sistema está calculando como se hoje fosse ' + PA.datas.fmt(ctx.conferencia) + '.', h('button', { onclick: () => definirConferencia(null) }, 'Voltar para hoje')));
    if (!ctx.armazenamento.disponivel || !ctx.salvo) faixas.push(h('div.faixa.vermelha', { role: 'alert' }, ctx.erroSalvar === 'cota' ? '⚠ O navegador está sem espaço: os dados NÃO estão sendo salvos. Baixe um backup agora.' : '⚠ Dados não estão sendo salvos neste navegador (janela anônima ou bloqueio). Baixe um backup antes de fechar.', h('button', { onclick: salvarBackup }, 'Baixar backup')));
    else if (PA.acoes.backupAtrasado(ctx.estado, PA.datas.hojeSerial())) faixas.push(h('div.faixa.amarela', 'Faça um backup dos dados: o último foi ' + (ctx.estado.meta.ultimoBackup ? 'em ' + PA.datas.fmt(ctx.estado.meta.ultimoBackup) : 'nunca') + '.', h('button', { onclick: salvarBackup }, 'Fazer backup agora')));
    const conteudo = h('main.conteudo');
    const principal = h('div.principal', topo, faixas, conteudo);
    raiz.appendChild(h('div.app', lateral, principal));
    try { tela.render(conteudo, ctx); } catch (e) { console.error(e); conteudo.appendChild(h('div.cartao', 'Erro ao desenhar a tela: ' + e.message)); }
  }

  function boasVindas() {
    return h('div.boas-vindas',
      h('img', { src: 'img/logo_Ventisette.png', alt: 'Ventisette' }),
      h('h2', 'Plano de Ataque · Serviços finais'),
      h('p.mudo', 'Para começar, importe a planilha Plano de Ataque (v6) ou restaure um backup do sistema. Os dados ficam guardados neste computador.'),
      h('div.acoes', h('button.btn.prim', { onclick: importarPlanilha }, icone('subir'), 'Importar planilha (.xlsx)'), h('button.btn', { onclick: restaurarBackup }, icone('subir'), 'Restaurar backup (.json)')),
      !ctx.armazenamento.disponivel ? h('p', { style: { color: 'var(--late)', marginTop: '18px' } }, 'Atenção: este navegador não está salvando dados (janela anônima?). Use uma janela normal do Chrome ou Edge.') : null);
  }

  function iniciar() {
    tema(false);
    let backend = null;
    try { backend = window.localStorage; } catch (e) { backend = null; }
    ctx.armazenamento = PA.armazenamento.criar(backend);
    ctx.estado = ctx.armazenamento.carregar();
    if (ctx.estado) { const v = PA.modelo.estadoVazio(); for (const k of Object.keys(v)) if (ctx.estado[k] === undefined) ctx.estado[k] = v[k]; }
    definirHoje();
    if (ctx.estado) recalcular();
    window.addEventListener('hashchange', () => { desenhar(); window.scrollTo(0, 0); });
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); desfazer(); } });
    desenhar();
  }

  Object.assign(PA.ui, { registrarTela, ctx, aplicar, desfazer, desenhar, recalcular, importarPlanilha, restaurarBackup, salvarBackup, exportarExcel, definirConferencia, iniciar, TELAS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
