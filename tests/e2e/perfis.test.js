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

async function entrar(email, senha) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  const erros = []; page.on('pageerror', e => erros.push(String(e)));
  await page.goto(S.url + '/');
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', senha || SENHA);
  await page.click('button[type=submit]');
  await page.waitForSelector('.lateral nav');
  return { context, page, erros };
}
const menu = page => page.$$eval('.lateral nav a span', a => a.map(x => x.textContent));

test('menu por perfil', { timeout: 90000 }, async () => {
  const esperado = {
    empreiteira: ['Painel', 'Torre', 'Entregas', 'Reprovas', 'Acompanhamento', 'Macro', 'Cronograma', 'Pendências', 'Histórico', 'Relatórios', 'Minha conta'],
    diretoria: ['Painel', 'Torre', 'Entregas', 'Reprovas', 'Acompanhamento', 'Macro', 'Cronograma', 'Estratégia', 'Ranking', 'Pendências', 'Histórico', 'Relatórios', 'Minha conta']
  };
  for (const papel of Object.keys(esperado)) {
    const u = await entrar(papel + '@teste.local');
    assert.deepStrictEqual((await menu(u.page)).filter(m => esperado[papel].includes(m) || true).sort(), esperado[papel].slice().sort(), papel);
    assert.deepStrictEqual(u.erros, []);
    await u.context.close();
  }
  const obra = await entrar('obra@teste.local');
  const mo = await menu(obra.page);
  assert.ok(mo.includes('Lançar') && mo.includes('Alterações') && !mo.includes('Usuários') && !mo.includes('Config.'), mo.join(','));
  await obra.context.close();
  const adm = await entrar('admin@teste.local');
  const ma = await menu(adm.page);
  assert.ok(ma.includes('Usuários') && ma.includes('Config.') && ma.includes('Alterações'), ma.join(','));
  await adm.context.close();
});
test('admin cria empreiteira pela tela; ela entra no Acompanhamento filtrado', { timeout: 90000 }, async () => {
  const adm = await entrar('admin@teste.local');
  await adm.page.goto(S.url + '/#usuarios');
  await adm.page.click('button:has-text("Novo usuário")');
  await adm.page.fill('.modal label:has-text("Nome") input', 'Camargo Instalações');
  await adm.page.fill('.modal label:has-text("E-mail") input', 'camargo@teste.local');
  await adm.page.fill('.modal label:has-text("Senha inicial") input', 'Camargo-123456');
  await adm.page.selectOption('.modal label:has-text("Perfil") select', 'empreiteira');
  await adm.page.fill('.modal label:has-text("Empresa") input', 'Camargo');
  await adm.page.click('.modal button:has-text("Salvar")');
  await adm.page.waitForSelector('td:has-text("camargo@teste.local")');
  await adm.context.close();
  const emp = await entrar('camargo@teste.local', 'Camargo-123456');
  await emp.page.waitForSelector('h1:has-text("Acompanhamento")');
  assert.strictEqual(await emp.page.$eval('label:has-text("Empreiteira") select', s => s.value), 'Camargo');
  await emp.context.close();
});
test('obra altera a equipe mas não a meta; alteração aparece com o autor', { timeout: 90000 }, async () => {
  const obra = await entrar('obra@teste.local');
  await obra.page.goto(S.url + '/#cronograma');
  assert.ok(await obra.page.locator('label:has-text("Data-alvo da obra") input').isDisabled());
  const eq = obra.page.locator('table.tab tbody tr', { hasText: 'Louças e metais' }).first().locator('input[data-equipe]');
  await eq.fill('3'); await eq.press('Tab');
  const t0 = Date.now();
  while (Date.now() - t0 < 8000 && (await S.su.collection('equipes').getFullList({ filter: 'chave="loucas"' }))[0].equipe !== 3) await new Promise(r => setTimeout(r, 200));
  assert.strictEqual((await S.su.collection('equipes').getFullList({ filter: 'chave="loucas"' }))[0].equipe, 3);
  await obra.page.goto(S.url + '/#alteracoes');
  await obra.page.waitForSelector('table.tab tbody tr');
  assert.ok((await obra.page.innerText('table.tab')).includes('Usuário obra'));
  await obra.context.close();
});
test('usuário troca a própria senha e entra com a nova', { timeout: 90000 }, async () => {
  const u = await entrar('diretoria@teste.local');
  await u.page.goto(S.url + '/#conta');
  await u.page.fill('label:has-text("Senha atual") input', SENHA);
  await u.page.fill('label:has-text("Nova senha") input', 'Nova-senha-987');
  await u.page.fill('label:has-text("Repita") input', 'Nova-senha-987');
  await u.page.click('button:has-text("Trocar senha")');
  await u.page.waitForSelector('.toast:has-text("Senha alterada")');
  await u.context.close();
  const u2 = await entrar('diretoria@teste.local', 'Nova-senha-987');
  assert.ok((await menu(u2.page)).includes('Painel'));
  await u2.context.close();
});
