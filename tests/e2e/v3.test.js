'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { abrir, importarV6 } = require('./util');

test('v3: torre, ficha de vistoria, entregas, reprovas, categorias e o que define o prazo', { timeout: 120000 }, async () => {
  const { browser, page, erros } = await abrir({ viewport: { width: 1366, height: 900 } });
  try {
    await importarV6(page);
    const url = page.url().split('#')[0];
    // Torre: três modos.
    await page.goto(url + '#torre');
    await page.waitForSelector('.torre .celula');
    assert.strictEqual(await page.locator('.torre .celula').count(), 94);
    assert.ok((await page.innerText('.gargalo')).includes('Gargalo'));
    await page.click('.seg button:has-text("Por apartamento")');
    assert.match(await page.innerText('.torre .celula[data-apto="164"]'), /\d+\/\d+/);
    await page.click('.seg button:has-text("Entrega")');
    await page.screenshot({ path: 'test-results/torre-entrega.png', fullPage: true });
    // Ficha de vistoria pela Torre: reprovar com 2 motivos.
    await page.click('.torre .celula[data-apto="164"]');
    await page.click('.modal button:has-text("Reprovado")');
    await page.selectOption('.modal .motivo select >> nth=0', 'Pintura');
    await page.fill('.modal .motivo input >> nth=0', 'mancha no teto');
    await page.click('.modal button:has-text("+ motivo")');
    await page.selectOption('.modal .motivo select >> nth=1', 'Louças e metais');
    await page.fill('.modal .motivo input >> nth=1', 'torneira pingando');
    await page.fill('.modal label:has-text("Nova vistoria") input', '2026-12-02');
    await page.screenshot({ path: 'test-results/ficha-vistoria.png' });
    await page.click('.modal button:has-text("Confirmar reprova")');
    const st = await page.evaluate(() => ({ v: PA.ui.ctx.estado.vistorias.filter(x => x.apto === 164).map(x => x.resultado), p: PA.ui.ctx.estado.pendencias.filter(p => p.apto === 164 && /Reprova/.test(p.descricao)).length }));
    assert.deepStrictEqual(st, { v: ['reprovado', 'agendada'], p: 2 });
    // Aprovar na 2ª vistoria.
    await page.click('.torre .celula[data-apto="164"]');
    await page.click('.modal button:has-text("Aprovado")');
    await page.click('.modal button:has-text("Confirmar aprovação")');
    assert.strictEqual(await page.evaluate(() => PA.ui.ctx.resultado.itens.find(i => i.ordem === 12 && i.apto === 164).status), 'Concluído');
    // Entregas e Reprovas.
    await page.goto(url + '#entregas');
    await page.waitForSelector('.kpis');
    assert.ok((await page.innerText('main')).toLowerCase().includes('aprovados após reprova'));
    await page.screenshot({ path: 'test-results/entregas.png', fullPage: true });
    await page.goto(url + '#reprovas');
    await page.waitForSelector('.ranking-barras');
    assert.ok((await page.innerText('.ranking-barras')).includes('Pintura'));
    await page.screenshot({ path: 'test-results/reprovas.png', fullPage: true });
    // Categorias (Config.).
    await page.goto(url + '#config');
    assert.ok(await page.locator('.categorias-reprova input').count() >= 13);
    // Cronograma: coluna e aviso.
    await page.goto(url + '#cronograma');
    assert.ok((await page.innerText('main')).includes('Aguarda Piso'));
    const rej = page.locator('table.tab tbody tr', { hasText: 'Rejunte' }).first().locator('input[data-equipe]');
    await rej.fill('4'); await rej.press('Tab');
    await page.waitForSelector('.toast:has-text("aguarda")');
    assert.deepStrictEqual(erros, []);
  } finally { await browser.close(); }
});
