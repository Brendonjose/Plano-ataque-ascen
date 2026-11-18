'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { abrir, importarV6 } = require('./util');

test('importar, lançar Portas no apto 193, persistir e desfazer', { timeout: 90000 }, async () => {
  const { browser, page, erros } = await abrir();
  try {
    await importarV6(page);
    const concl = () => page.evaluate(() => PA.ui.ctx.resultado.itens.filter(i => i.status === 'Concluído').length);
    const antes = await concl();
    await page.click('.servico-chip:has-text("Portas")');
    const st0 = await page.evaluate(() => PA.ui.ctx.resultado.itens.find(i => i.ordem === 4 && i.apto === 193).status);
    assert.notStrictEqual(st0, 'Concluído');
    await page.click('.celula[data-apto="193"]');
    await page.click('.opcao:has-text("Concluído")');
    assert.strictEqual(await concl(), antes + 1);
    await page.reload();
    await page.waitForSelector('.servicos-fita');
    assert.strictEqual(await concl(), antes + 1, 'persistiu após recarregar');
    await page.click('button:has-text("Desfazer")');
    assert.strictEqual(await concl(), antes);
    await page.screenshot({ path: 'test-results/lancar-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/lancar-celular.png', fullPage: false });
    assert.deepStrictEqual(erros.filter(e => !/favicon/i.test(e)), []);
  } finally { await browser.close(); }
});
