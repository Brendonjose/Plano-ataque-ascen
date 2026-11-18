'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { abrir, importarV6 } = require('./util');

test('pendências, histórico, configurações, backup e exportação', { timeout: 120000 }, async () => {
  const { browser, page, erros } = await abrir({ viewport: { width: 1440, height: 900 } });
  try {
    await importarV6(page);
    const url = page.url().split('#')[0];
    // Pendência nova.
    await page.goto(url + '#pendencias');
    const abertas0 = await page.evaluate(() => PA.ui.ctx.resultado.pendencias.abertas);
    await page.click('button:has-text("Nova pendência")');
    await page.selectOption('.modal label:has-text("Apto") select', '54');
    await page.fill('.modal textarea', 'Porta empenada');
    await page.click('.modal button:has-text("Salvar")');
    assert.strictEqual(await page.evaluate(() => PA.ui.ctx.resultado.pendencias.abertas), abertas0 + 1);
    await page.screenshot({ path: 'test-results/pendencias.png' });
    // Registrar semana (hoje = 17/11 → semana 2).
    await page.goto(url + '#historico');
    assert.ok(await page.locator('button:has-text("Registrar semana")').isDisabled(), 'bloqueado em modo conferência');
    await page.click('button:has-text("Voltar para hoje")');
    await page.click('button:has-text("Registrar semana")');
    const s2 = await page.evaluate(() => PA.ui.ctx.estado.historico.filter(h => typeof h.realizado === 'number').pop());
    const pct = await page.evaluate(() => PA.ui.ctx.resultado.historico.pctHoje);
    assert.ok(Math.abs(s2.realizado - pct) < 1e-12);
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/historico.png' });
    // Configurações: empreiteira de Louças.
    await page.goto(url + '#config');
    const inp = page.locator('tr:has-text("Louças e metais") input');
    await inp.fill('Camargo Instalações');
    await inp.dispatchEvent('change');
    await page.goto(url + '#painel');
    await page.waitForSelector('.kpis');
    assert.ok((await page.locator('table.tab tr:has-text("Louças e metais")').first().innerText()).includes('Camargo Instalações'));
    // Backup e exportação.
    await page.goto(url + '#config');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Salvar backup")')]);
    assert.match(dl.suggestedFilename(), /\.json$/);
    const conteudo = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    assert.strictEqual(conteudo.tipo, 'plano-ataque-backup');
    const [dx] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Exportar para Excel")')]);
    assert.match(dx.suggestedFilename(), /^Plano_de_Ataque_\d{4}-\d{2}-\d{2}\.xlsx$/);
    await page.screenshot({ path: 'test-results/config.png' });
    assert.deepStrictEqual(erros, []);
  } finally { await browser.close(); }
});
