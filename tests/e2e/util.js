'use strict';
const path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..', '..');
const URL_APP = 'file://' + path.join(RAIZ, 'app', 'index.html');
const PLANILHA = path.join(RAIZ, 'referencia', 'Plano_de_Ataque_v6.xlsx');
async function abrir(opts) {
  const browser = await chromium.launch();
  const context = await browser.newContext(Object.assign({ viewport: { width: 1366, height: 860 }, acceptDownloads: true }, opts || {}));
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto(URL_APP);
  return { browser, context, page, erros };
}
/** Importa a v6 com a data de conferência 17/11/2026 (mesma da fixture). */
async function importarV6(page) {
  await page.evaluate(() => sessionStorage.setItem('pa.hojeConferencia', String(PA.datas.deISO('2026-11-17'))));
  await page.reload();
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=Importar planilha (.xlsx)')]);
  await fc.setFiles(PLANILHA);
  await page.waitForSelector('.servicos-fita', { timeout: 20000 });
}
module.exports = { abrir, importarV6, URL_APP, PLANILHA, RAIZ };
