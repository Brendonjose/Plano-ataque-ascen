'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { subir, SENHA } = require('./util');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('../helpers');
globalThis.PocketBase = require('pocketbase/cjs');
const PA = carregarApp();
let S, v6;
test.before(async () => { S = await subir(); v6 = PA.importar.deWorkbook(lerWorkbookV6()); });
test.after(async () => { if (S) await S.parar(); });

async function adaptador(papel) {
  const d = PA.dados.servidor.criar(S.url, { armazenamento: null });
  await d.entrar(papel + '@teste.local', SENHA);
  return d;
}
const dadosDe = e => ({ l: e.lancamentos, p: e.pendencias, h: e.historico, c: e.cronograma, pi: e.piso, es: e.estrategia, f: e.feriados, co: e.config, m: e.manuais, r: e.retratoBase });

test('importar a v6 e carregar dá o mesmo estado e os mesmos prazos', async () => {
  const d = await adaptador('admin');
  assert.deepStrictEqual(d.usuario().papel, 'admin');
  await d.importarTudo(v6);
  const e = await (await adaptador('diretoria')).carregar();
  assert.deepStrictEqual(dadosDe(e), dadosDe(v6));
  assert.deepStrictEqual(PA.motor.calcular(e, HOJE_FIXTURE).cron.prumadas, PA.motor.calcular(v6, HOJE_FIXTURE).cron.prumadas);
});
test('segunda importação é recusada', async () => {
  const d = await adaptador('admin');
  await assert.rejects(d.importarTudo(v6), /uma vez/);
});
test('gravar é idempotente e obra grava; diretoria recebe falha de permissão', async () => {
  const d = await adaptador('obra');
  const op = { tipo: 'lanc', servico: 'portas', apto: 193, valor: { codigo: '1' } };
  assert.strictEqual((await d.gravar([op])).ok, true);
  assert.strictEqual((await d.gravar([op])).ok, true);
  const lista = await S.su.collection('lancamentos').getFullList({ filter: 'servico = "portas" && apto = 193' });
  assert.strictEqual(lista.length, 1);
  const dir = await adaptador('diretoria');
  const r = await dir.gravar([{ tipo: 'lanc', servico: 'portas', apto: 194, valor: { codigo: '1' } }]);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.falhas[0].motivo, 'permissao');
  const limpar = await d.gravar([{ tipo: 'lanc', servico: 'portas', apto: 193, valor: null }]);
  assert.strictEqual(limpar.ok, true);
  assert.strictEqual((await d.gravar([{ tipo: 'lanc', servico: 'portas', apto: 193, valor: null }])).ok, true, 'apagar de novo não é erro');
});
test('equipe gravada pela obra aparece no estado', async () => {
  const d = await adaptador('obra');
  await d.gravar([{ tipo: 'equipe', chave: 'loucas', valor: 3 }, { tipo: 'equipe', chave: 'piso_ds', valor: 5 }]);
  const e = await d.carregar();
  assert.deepStrictEqual([e.cronograma.servicos.loucas.equipe, e.piso.equipeDS], [3, 5]);
});
test('I1: duas primeiras gravações no mesmo registro ao mesmo tempo: as duas dão certo (última vale)', async () => {
  const a = await adaptador('obra'), b = await adaptador('admin');
  for (let i = 0; i < 5; i++) {
    const apto = 101 + i * 10;
    const [ra, rb] = await Promise.all([
      a.gravar([{ tipo: 'lanc', servico: 'checklist', apto, valor: { codigo: 'and' } }]),
      b.gravar([{ tipo: 'lanc', servico: 'checklist', apto, valor: { codigo: '1' } }])]);
    assert.deepStrictEqual([ra.ok, rb.ok], [true, true], JSON.stringify([ra.falhas, rb.falhas]));
  }
});
test('I3: muitas tentativas de senha errada são limitadas; avatar e emailVisibility protegidos', async () => {
  const PB = require('pocketbase/cjs');
  const c = new PB(S.url); c.autoCancellation(false);
  const cfg = await S.su.settings.getAll();
  assert.strictEqual(cfg.rateLimits.rules.some(r => r.label === '*:auth'), true, 'migração criou a regra de login');
  await S.su.settings.update({ rateLimits: Object.assign({}, cfg.rateLimits, { enabled: true }) });
  let limitado = false;
  for (let i = 0; i < 30 && !limitado; i++) {
    try { await c.collection('users').authWithPassword('obra@teste.local', 'errada-' + i); } catch (e) { if (e.status === 429) limitado = true; }
  }
  await S.su.settings.update({ rateLimits: Object.assign({}, cfg.rateLimits, { enabled: false }) });
  assert.ok(limitado, 'login limitado (429)');
  const col = await S.su.collections.getOne('users');
  assert.ok(!col.fields.some(f => f.name === 'avatar'), 'sem campo avatar');
  const settings = await S.su.settings.getAll();
  assert.strictEqual(settings.batch.enabled, false);
  const obra = await S.cliente('obra2');
  await obra.collection('users').update(S.usuarios.obra2.id, { emailVisibility: true }).catch(() => null);
  assert.strictEqual((await S.su.collection('users').getOne(S.usuarios.obra2.id)).emailVisibility, false);
});
