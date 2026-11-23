'use strict';
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

test('empreiteira vê só o próprio relatório; imprimir e Excel', { timeout: 90000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const erros = []; page.on('pageerror', e => erros.push(String(e)));
  await page.goto(S.url + '/');
  await page.evaluate(() => sessionStorage.setItem('pa.hojeConferencia', String(PA.datas.deISO('2026-11-17'))));
  await page.fill('input[type=email]', 'empreiteira@teste.local'); await page.fill('input[type=password]', SENHA);
  await page.click('button[type=submit]');
  await page.waitForSelector('.lateral nav');
  await page.goto(S.url + '/#relatorios');
  await page.waitForSelector('.relatorio-folha');
  assert.ok(await page.locator('.filtros-rel label:has-text("Empreiteira") input').isDisabled());
  await page.click('label:has-text("Final 1") input'); await page.click('label:has-text("Final 2") input');
  const linhas = await page.locator('table.rel-linhas tbody tr').count();
  const esperado = await page.evaluate(() => PA.motor.relatorio(PA.ui.ctx.estado, PA.ui.ctx.resultado, { empreiteira: 'Camargo', prumadas: [3, 4] }).linhas.length);
  assert.strictEqual(linhas, esperado);
  await page.evaluate(() => { window.__imprimiu = 0; window.print = () => { window.__imprimiu++; }; });
  await page.click('button:has-text("Imprimir")');
  assert.strictEqual(await page.evaluate(() => window.__imprimiu), 1);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Excel")')]);
  assert.match(dl.suggestedFilename(), /^Relatorio_Camargo_.*\.xlsx$/);
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: 'test-results/relatorio-impressao.png', fullPage: true });
  assert.deepStrictEqual(erros, []);
  await context.close();
});
test('revisão final: impressão cabe no A4, Meu relatório, filtro de serviço e Backup só para admin', { timeout: 90000 }, async () => {
  async function entrar(email) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(S.url + '/');
    await page.evaluate(() => sessionStorage.setItem('pa.hojeConferencia', String(PA.datas.deISO('2026-11-17'))));
    await page.fill('input[type=email]', email); await page.fill('input[type=password]', SENHA);
    await page.click('button[type=submit]');
    await page.waitForSelector('.lateral nav');
    return { context, page };
  }
  const emp = await entrar('empreiteira@teste.local');
  assert.strictEqual(await emp.page.locator('.acoes-topo button:has-text("Backup")').count(), 0, 'empreiteira sem Backup');
  await emp.page.click('button:has-text("Meu relatório")');
  await emp.page.waitForSelector('.relatorio-folha');
  // Impressão: a tabela cabe na largura útil do A4 (~718 px).
  await emp.page.setViewportSize({ width: 718, height: 1000 });
  await emp.page.emulateMedia({ media: 'print' });
  const [larg, cont] = await emp.page.$eval('table.rel-linhas', t => [t.scrollWidth, t.closest('.relatorio-folha').clientWidth]);
  assert.ok(larg <= cont + 1, `tabela ${larg}px > folha ${cont}px`);
  await emp.context.close();
  const adm = await entrar('admin@teste.local');
  assert.strictEqual(await adm.page.locator('.acoes-topo button:has-text("Backup")').count(), 1, 'admin com Backup');
  await adm.page.goto(S.url + '/#relatorios');
  await adm.page.selectOption('.filtros-rel label:has-text("Empreiteira") select', { label: 'TROVÃO ENGENHARIA' });
  await adm.page.waitForSelector('.relatorio-folha');
  const servAntes = await adm.page.$$eval('table.rel-linhas tbody tr td:nth-child(4)', t => [...new Set(t.map(x => x.textContent))].sort());
  assert.deepStrictEqual(servAntes, ['Pintura 1ª demão', 'Pintura 2ª demão']);
  await adm.page.click('.filtros-rel label:has-text("Pintura 1ª demão") input');
  const servDepois = await adm.page.$$eval('.relatorio-folha table.tab:not(.rel-linhas) tbody tr td:first-child', t => t.map(x => x.textContent));
  assert.deepStrictEqual(servDepois, ['Pintura 2ª demão']);
  assert.strictEqual(await adm.page.locator('table.rel-linhas th:has-text("Serviço")').count(), 0, 'um serviço só: sem coluna Serviço');
  await adm.context.close();
});
