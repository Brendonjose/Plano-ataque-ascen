'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { abrir, importarV6 } = require('./util');
const { valor } = require('../helpers');

test('painel: KPIs da v6, filtro Camargo e 7 gráficos', { timeout: 90000 }, async () => {
  const { browser, page, erros } = await abrir({ viewport: { width: 1440, height: 900 } });
  try {
    await importarV6(page);
    await page.goto(page.url().split('#')[0] + '#painel');
    await page.waitForSelector('.kpis');
    const v = await page.$$eval('.kpi .v', els => els.map(e => e.textContent));
    assert.deepStrictEqual(v.slice(0, 6).map(Number), ['B8', 'D8', 'F8', 'H8', 'J8', 'L8'].map(r => valor('DASHBOARD EXECUTIVO', r)));
    await page.waitForTimeout(600);
    assert.strictEqual(await page.$$eval('canvas', c => c.length), 7);
    await page.screenshot({ path: 'test-results/painel.png', fullPage: true });
    await page.selectOption('label:has-text("Empreiteira") select', 'Camargo');
    await page.waitForTimeout(300);
    const total = await page.$eval('.kpi .v', e => Number(e.textContent));
    assert.strictEqual(total, 94);
    await page.click('button:has-text("Limpar filtros")');
    assert.deepStrictEqual(erros, []);
  } finally { await browser.close(); }
});
