'use strict';
/* Conferência: equipe, produtividade e serviço executado mudam o prazo no modo servidor (tela → servidor → outro usuário). */
const test = require('node:test');
const assert = require('node:assert');
const { chromium } = require('playwright');
const { subir, SENHA } = require('../servidor/util');
const { carregarApp, lerWorkbookV6 } = require('../helpers');
globalThis.PocketBase = require('pocketbase/cjs');
const PA = carregarApp();
let S, browser;
test.before(async () => {
  S = await subir(); browser = await chromium.launch();
  const d = PA.dados.servidor.criar(S.url); await d.entrar('admin@teste.local', SENHA);
  await d.importarTudo(PA.importar.deWorkbook(lerWorkbookV6()));
});
test.after(async () => { if (browser) await browser.close(); if (S) await S.parar(); });
async function entrar(papel) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.goto(S.url + '/');
  await page.fill('input[type=email]', papel + '@teste.local'); await page.fill('input[type=password]', SENHA);
  await page.click('button[type=submit]'); await page.waitForSelector('.lateral nav');
  return { context, page };
}
const term = (page, ordem) => page.evaluate(o => PA.ui.ctx.resultado.cron.porOrdem[o].termTodas, ordem);
async function esperar(fn, ms) { const t = Date.now(); while (Date.now() - t < (ms || 8000)) { if (await fn()) return true; await new Promise(r => setTimeout(r, 200)); } return false; }

test('equipe e produtividade alteradas na tela mudam o prazo, gravam e chegam aos outros', { timeout: 120000 }, async () => {
  const adm = await entrar('admin'); const dir = await entrar('diretoria');
  await adm.page.goto(S.url + '/#cronograma');
  const t0 = await term(adm.page, 5);
  const linha = adm.page.locator('table.tab tbody tr', { hasText: 'Louças e metais' }).first();
  const eq = linha.locator('input[data-equipe]');
  await eq.fill('2'); await eq.press('Tab');
  const t1 = await term(adm.page, 5);
  assert.ok(t1 < t0, `Louças: ${t0} → ${t1}`);
  assert.ok(await esperar(async () => (await term(dir.page, 5)) === t1), 'diretoria recebe ao vivo');
  await adm.page.reload(); await adm.page.waitForSelector('.lateral nav');
  assert.strictEqual(await term(adm.page, 5), t1, 'persistiu após recarregar');
  // Produtividade (só admin): dobrar a de Louças também antecipa ou mantém.
  await adm.page.goto(S.url + '/#cronograma');
  const prod = adm.page.locator('table.tab tbody tr', { hasText: 'Louças e metais' }).first().locator('input').nth(2);
  await prod.fill('3'); await prod.press('Tab');
  assert.ok((await term(adm.page, 5)) <= t1);
  await adm.context.close(); await dir.context.close();
});
test('serviço executado (lançamento) antecipa o término', { timeout: 120000 }, async () => {
  const obra = await entrar('obra');
  const t0 = await term(obra.page, 6);
  const aptos = await obra.page.evaluate(() => PA.ui.ctx.resultado.itens.filter(i => i.ordem === 6 && i.status === 'Não iniciado').slice(0, 5).map(i => i.apto));
  await obra.page.evaluate(ap => { let e = PA.ui.ctx.estado; for (const a of ap) e = PA.acoes.lancar(e, 'limpeza-grossa', a, { codigo: '1' }); PA.ui.aplicar(e); }, aptos);
  const t1 = await term(obra.page, 6);
  assert.ok(t1 < t0, `Limpeza grossa: ${t0} → ${t1}`);
  await obra.context.close();
});
