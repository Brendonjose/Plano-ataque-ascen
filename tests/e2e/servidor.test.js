'use strict';
/* Modo servidor de ponta a ponta: PocketBase de teste servindo app/ e vários usuários em abas. */
const test = require('node:test');
const assert = require('node:assert');
const { chromium } = require('playwright');
const { subir, SENHA } = require('../servidor/util');
const { PLANILHA } = require('./util');
let S, browser;
test.before(async () => { S = await subir(); browser = await chromium.launch(); });
test.after(async () => { if (browser) await browser.close(); if (S) await S.parar(); });

async function entrar(papel) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto(S.url + '/');
  await page.evaluate(() => sessionStorage.setItem('pa.hojeConferencia', String(PA.datas.deISO('2026-11-17'))));
  await page.fill('input[type=email]', papel + '@teste.local');
  await page.fill('input[type=password]', SENHA);
  await page.click('button[type=submit]');
  return { context, page, erros };
}
const status = (page, ordem, apto) => page.evaluate(([o, a]) => { const r = PA.ui.ctx.resultado; return r ? r.itens.find(i => i.ordem === o && i.apto === a).status : null; }, [ordem, apto]);
async function lancar(page, servico, apto, opcao) {
  await page.goto(S.url + '/#lancar');
  await page.click(`.servico-chip:has-text("${servico}")`);
  await page.click(`.celula[data-apto="${apto}"]`);
  await page.click(`.opcao:has-text("${opcao}")`);
}
async function esperar(fn, ms) { const t = Date.now(); while (Date.now() - t < (ms || 8000)) { if (await fn()) return true; await new Promise(r => setTimeout(r, 200)); } return false; }

test('admin importa a v6 uma vez; obra lança e a diretoria vê ao vivo', { timeout: 120000 }, async () => {
  const adm = await entrar('admin');
  const [fc] = await Promise.all([adm.page.waitForEvent('filechooser'), adm.page.click('text=Importar planilha (.xlsx)')]);
  await fc.setFiles(PLANILHA);
  await adm.page.click('.modal button.prim');
  await adm.page.waitForSelector('.servicos-fita', { timeout: 30000 });
  const dir = await entrar('diretoria');
  await dir.page.waitForSelector('.servicos-fita');
  const obra = await entrar('obra');
  await obra.page.waitForSelector('.servicos-fita');
  assert.notStrictEqual(await status(dir.page, 4, 193), 'Concluído');
  await lancar(obra.page, 'Portas', 193, 'Concluído');
  assert.ok(await esperar(async () => (await status(dir.page, 4, 193)) === 'Concluído'), 'diretoria viu ao vivo');
  // Diretoria: sem opções de lançamento e a API recusa.
  await dir.page.click('.servico-chip:has-text("Portas")');
  await dir.page.click('.celula[data-apto="194"]');
  assert.strictEqual(await dir.page.locator('.opcao').count(), 0);
  const r = await dir.page.evaluate(() => PA.ui.ctx.dados.gravar([{ tipo: 'lanc', servico: 'portas', apto: 194, valor: { codigo: '1' } }]));
  assert.deepStrictEqual([r.ok, r.falhas[0].motivo], [false, 'permissao']);
  assert.deepStrictEqual(adm.erros.concat(dir.erros, obra.erros), []);
  for (const u of [adm, dir, obra]) await u.context.close();
});
test('sem internet: lançamento fica na fila e é enviado uma vez quando volta', { timeout: 120000 }, async () => {
  const obra = await entrar('obra');
  await obra.page.waitForSelector('.servicos-fita');
  await obra.context.setOffline(true);
  await lancar(obra.page, 'Portas', 183, 'Concluído');
  assert.ok(await esperar(async () => (await obra.page.locator('[data-fila="1"]').count()) === 1), 'faixa da fila');
  assert.strictEqual(await status(obra.page, 4, 183), 'Concluído', 'tela responde na hora');
  await obra.page.close();
  await obra.context.setOffline(false);
  const p2 = await obra.context.newPage();
  await p2.goto(S.url + '/');
  assert.ok(await esperar(async () => (await S.su.collection('lancamentos').getFullList({ filter: 'servico="portas" && apto=183' })).length === 1, 15000), 'enviado ao voltar');
  assert.ok(await esperar(async () => (await p2.locator('[data-fila]').count()) === 0));
  await obra.context.close();
});
test('dois usuários ao mesmo tempo; desfazer conferido; acesso revogado pede login', { timeout: 120000 }, async () => {
  const a = await entrar('obra'); const b = await entrar('obra2');
  await a.page.waitForSelector('.servicos-fita'); await b.page.waitForSelector('.servicos-fita');
  await Promise.all([lancar(a.page, 'Louças', 174, 'Em andamento'), lancar(b.page, 'Louças', 164, 'Em andamento')]);
  assert.ok(await esperar(async () => (await S.su.collection('lancamentos').getFullList({ filter: 'servico="loucas" && (apto=174 || apto=164) && codigo="and"' })).length === 2));
  // Mesmo apto: A lança, B altera depois → desfazer de A é recusado.
  await lancar(a.page, 'Louças', 154, 'Em andamento');
  assert.ok(await esperar(async () => (await S.su.collection('lancamentos').getFullList({ filter: 'servico="loucas" && apto=154' })).length === 1));
  assert.ok(await esperar(async () => (await status(b.page, 5, 154)) === 'Em andamento'));
  await lancar(b.page, 'Louças', 154, 'Cancelado');
  assert.ok(await esperar(async () => (await S.su.collection('lancamentos').getFirstListItem('servico="loucas" && apto=154')).codigo === 'canc'));
  await a.page.click('.acoes-topo button:has-text("Desfazer")');
  await a.page.waitForSelector('.toast:has-text("Outra pessoa alterou")');
  assert.strictEqual((await S.su.collection('lancamentos').getFirstListItem('servico="loucas" && apto=154')).codigo, 'canc');
  const alts = await S.su.collection('alteracoes').getFullList({ filter: 'tabela="lancamentos"' });
  assert.ok(alts.filter(x => (x.depois || x.antes).apto === 154).length >= 2);
  // Acesso revogado: B desativado → próxima gravação pede login e fica na fila.
  await S.su.collection('users').update(S.usuarios.obra2.id, { ativo: false });
  await lancar(b.page, 'Louças', 144, 'Em andamento');
  await b.page.waitForSelector('.modal:has-text("Entre de novo")', { timeout: 10000 });
  assert.strictEqual(await b.page.evaluate(() => PA.ui.ctx.fila.pendentes()), 1);
  await S.su.collection('users').update(S.usuarios.obra2.id, { ativo: true });
  await a.context.close(); await b.context.close();
});
