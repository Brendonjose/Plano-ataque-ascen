'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { abrir, importarV6 } = require('./util');
const { valor } = require('../helpers');

test('macro/quadros, cronograma, estratégia e ranking', { timeout: 120000 }, async () => {
  const { browser, page, erros } = await abrir({ viewport: { width: 1440, height: 900 } });
  const base = page.url;
  try {
    await importarV6(page);
    const url = page.url().split('#')[0];
    // Quadro F4 no modo Necessário: Louças do apto 164.
    await page.goto(url + '#macro');
    await page.click('button:has-text("Quadro F4")');
    await page.click('button:has-text("Necessário")');
    const esperado = await page.evaluate(() => { const it = PA.ui.ctx.resultado.itens.find(i => i.ordem === 5 && i.apto === 164); return PA.datas.fmtCurto(it.dataNecessaria); });
    const linha = page.locator('table.quadro tbody tr', { has: page.locator('td.fix', { hasText: /^164$/ }) });
    assert.ok((await linha.innerText()).includes(esperado), 'quadro mostra ' + esperado);
    await page.screenshot({ path: 'test-results/quadro-f4.png' });
    await page.click('button:has-text("Visão macro")');
    await page.screenshot({ path: 'test-results/macro.png', fullPage: true });
    // Cronograma: Limpeza grossa 1 → 3.
    await page.goto(url + '#cronograma');
    const linhaLG = page.locator('table.tab tbody tr', { hasText: 'Limpeza grossa' }).first();
    await linhaLG.locator('input').nth(3).fill('3');
    await linhaLG.locator('input').nth(3).dispatchEvent('change');
    const [eq, term] = await page.evaluate(() => [PA.ui.ctx.estado.cronograma.servicos['limpeza-grossa'].equipe, PA.ui.ctx.resultado.cron.obra.termino]);
    assert.strictEqual(eq, 3);
    const esperadoTerm = await page.evaluate(() => PA.motor.calcular(PA.ui.ctx.estado, PA.ui.ctx.hoje).cron.obra.termino);
    assert.strictEqual(term, esperadoTerm);
    const tLG = await page.evaluate(() => PA.ui.ctx.resultado.cron.porOrdem[6].termTodas);
    assert.ok(tLG < valor('CRONOGRAMA', 'AK21'), 'limpeza grossa termina antes com mais equipe');
    await page.screenshot({ path: 'test-results/cronograma.png', fullPage: true });
    await page.click('.acoes-topo button:has-text("Desfazer")');
    assert.strictEqual(await page.evaluate(() => PA.ui.ctx.estado.cronograma.servicos['limpeza-grossa'].equipe), 1, 'desfez a equipe');
    // Estratégia: apto 11 (N) → V aumenta aptos no escopo do Checklist rejunte.
    await page.goto(url + '#estrategia');
    const antes = await page.evaluate(() => PA.ui.ctx.resultado.estrategia.servicos[6].aptosEscopo);
    await page.click('.celula[data-apto="11"]');
    const depois = await page.evaluate(() => PA.ui.ctx.resultado.estrategia.servicos[6].aptosEscopo);
    assert.strictEqual(depois, antes + 1);
    await page.screenshot({ path: 'test-results/estrategia.png', fullPage: true });
    await page.click('.acoes-topo button:has-text("Desfazer")');
    assert.strictEqual(await page.evaluate(() => PA.ui.ctx.estado.estrategia.vendido[11]), 'N', 'desfez o vendido');
    // Ranking.
    await page.goto(url + '#ranking');
    const nomes = await page.$$eval('table.tab tbody tr td:nth-child(2)', t => t.map(x => x.textContent));
    assert.deepStrictEqual(nomes.slice(-9), [13, 14, 15, 16, 17, 18, 19, 20, 21].map(r => valor('RANKING EMPREITEIRAS', 'C' + r)));
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/ranking.png', fullPage: true });
    assert.deepStrictEqual(erros, []);
  } finally { await browser.close(); }
});
