'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { abrir, importarV6 } = require('./util');

test('I1: restaurar backup baixa antes uma cópia dos dados atuais', { timeout: 90000 }, async () => {
  const { browser, page } = await abrir();
  try {
    await importarV6(page);
    const bk = await page.evaluate(() => PA.acoes.backupJSON(PA.ui.ctx.estado));
    const arq = path.join(require('os').tmpdir(), 'pa_bk_teste.json'); fs.writeFileSync(arq, bk);
    await page.evaluate(() => PA.ui.aplicar(PA.acoes.lancar(PA.ui.ctx.estado, 'portas', 193, { codigo: '1' })));
    await page.goto(page.url().split('#')[0] + '#config');
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Restaurar backup")')]);
    await fc.setFiles(arq);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('.modal button.prim')]);
    const salvo = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    assert.strictEqual(salvo.estado.lancamentos.portas[193].codigo, '1');
  } finally { await browser.close(); }
});
test('I2/I5: conferência não vaza para pendência resolvida; KPIs do Macro cabem no celular', { timeout: 90000 }, async () => {
  const { browser, page } = await abrir({ viewport: { width: 390, height: 844 } });
  try {
    await importarV6(page); // conferência = 17/11/2026
    const real = await page.evaluate(() => PA.datas.hojeSerial());
    await page.goto(page.url().split('#')[0] + '#pendencias');
    await page.locator('button[title="Marcar como resolvida"]').first().click();
    const r = await page.evaluate(() => PA.ui.ctx.estado.pendencias.find(p => p.status === 'Resolvida').resolvidaEm);
    assert.strictEqual(r, real);
    await page.goto(page.url().split('#')[0] + '#macro');
    await page.click('button:has-text("Visão macro")');
    const cortes = await page.$$eval('.kpi .v', els => els.filter(e => e.scrollWidth > e.clientWidth + 1).length);
    assert.strictEqual(cortes, 0);
  } finally { await browser.close(); }
});
test('C1/I3: produtividade zero é recusada na tela; foco continua no campo após editar', { timeout: 90000 }, async () => {
  const { browser, page, erros } = await abrir({ viewport: { width: 1440, height: 900 } });
  try {
    await importarV6(page);
    await page.goto(page.url().split('#')[0] + '#cronograma');
    const prod = page.locator('tr:has-text("DS ALENCAR") input').nth(1);
    await prod.fill('0'); await prod.press('Tab');
    assert.strictEqual(await page.evaluate(() => PA.ui.ctx.estado.piso.prodDS.piso), 20);
    const eq = page.locator('table.tab tbody tr', { hasText: 'Limpeza grossa' }).first().locator('input').nth(3);
    await eq.fill('2'); await eq.press('Tab');
    assert.strictEqual(await page.evaluate(() => PA.ui.ctx.estado.cronograma.servicos['limpeza-grossa'].equipe), 2);
    assert.strictEqual(await page.evaluate(() => document.activeElement.tagName), 'INPUT');
    assert.deepStrictEqual(erros, []);
  } finally { await browser.close(); }
});
