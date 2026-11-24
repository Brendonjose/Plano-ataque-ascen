'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { abrir, importarV6 } = require('./util');

test('acompanhamento: matriz → clique em Louças × Liberado mostra os aptos', { timeout: 90000 }, async () => {
  const { browser, page, erros } = await abrir({ viewport: { width: 1366, height: 900 } });
  try {
    await importarV6(page);
    await page.evaluate(() => sessionStorage.removeItem('pa.filtrosAcomp'));
    await page.goto(page.url().split('#')[0] + '#acompanhamento');
    await page.waitForSelector('table.tab');
    const linha = page.locator('table.tab tbody tr', { hasText: 'Louças e metais' });
    const n = Number(await linha.locator('td').nth(3).innerText());
    await linha.locator('td').nth(3).locator('button').click();
    assert.strictEqual(await page.$eval('label:has-text("Serviço") select', s => s.value), 'Louças e metais');
    const chips = await page.locator('details[open] .pill.lib').first().innerText();
    assert.ok(chips.includes('(' + n + ')'), chips);
    await page.screenshot({ path: 'test-results/acompanhamento.png', fullPage: true });
    assert.deepStrictEqual(erros, []);
  } finally { await browser.close(); }
});
