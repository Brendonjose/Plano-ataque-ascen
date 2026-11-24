'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

test('prévia: abre na Torre com os dados embutidos, sem importar e sem erros', { timeout: 120000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'previa-'));
  execFileSync(process.execPath, [path.join(__dirname, '..', '..', 'tools', 'gerar-previa.js'), dir]);
  const corpo = fs.readFileSync(path.join(dir, 'previa.html'), 'utf8');
  assert.ok(!/<!doctype|<body/i.test(corpo) && !/pocketbase|xlsx/.test(corpo));
  fs.writeFileSync(path.join(dir, 'teste.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body>' + corpo + '</body></html>');
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
    const erros = []; p.on('pageerror', e => erros.push(e.message));
    await p.goto('file://' + path.join(dir, 'teste.html'));
    await p.waitForSelector('.torre .celula');
    assert.strictEqual(await p.locator('.torre .celula').count(), 94);
    await p.click('.seg button:has-text("Entrega")');
    assert.ok(await p.locator('.torre .celula.ent-reprovado').count() > 0);
    await p.goto('file://' + path.join(dir, 'teste.html') + '#reprovas');
    await p.waitForSelector('.ranking-barras');
    assert.deepStrictEqual(erros, []);
  } finally { await b.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
