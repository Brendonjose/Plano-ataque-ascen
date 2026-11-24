'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
let e, res;
test.before(() => { e = PA.importar.deWorkbook(lerWorkbookV6()); res = PA.motor.calcular(e, HOJE_FIXTURE); });
const item = (o, a) => res.itens.find(i => i.ordem === o && i.apto === a);

test('modo serviço: classe segue a situação do item', () => {
  const t = PA.motor.torre(res, { modo: 'servico', servico: 'Louças e metais' }, e);
  assert.strictEqual(Object.keys(t.celulas).length, 94);
  const mapa = { 'Concluído': 'ok', 'Em andamento': 'and', 'Não iniciado': 'lib', 'Bloqueado': 'blq', 'Cancelado': 'canc' };
  for (const [ap, c] of Object.entries(t.celulas)) assert.strictEqual(c.classe.split(' ')[0], mapa[item(5, Number(ap)).status], ap);
  assert.strictEqual(t.porPav.length, 27);
  assert.strictEqual(t.porPrumada.length, 4);
});
test('modo apartamento: concluídos/escopo e próximo serviço', () => {
  const t = PA.motor.torre(res, { modo: 'apto' }, e);
  const c = t.celulas[164];
  const doApto = res.itens.filter(i => i.apto === 164);
  const concl = doApto.filter(i => i.status === 'Concluído').length, esc = doApto.filter(i => i.status !== 'Cancelado').length;
  assert.strictEqual(c.sub, concl + '/' + esc);
  const prox = doApto.find(i => i.status !== 'Concluído' && i.status !== 'Cancelado');
  assert.strictEqual(c.proximo, prox ? PA.modelo.POR_ORDEM[prox.ordem].curto : null);
});
test('o que define o prazo e gargalo da obra', () => {
  const l = PA.motor.limitacao(res);
  assert.strictEqual(l.porServico[5].tipo, 'equipe');          // Louças: limitada pela própria equipe
  assert.deepStrictEqual([l.porServico[2].tipo, l.porServico[2].anterior], ['anterior', 'Piso']); // Rejunte aguarda o piso
  assert.ok(l.gargalo && l.porServico[l.gargalo.ordem].tipo === 'equipe');
  // Reforçar o gargalo antecipa a obra.
  const e2 = JSON.parse(JSON.stringify(e)); const id = PA.modelo.POR_ORDEM[l.gargalo.ordem].id;
  if (id === 'piso') e2.piso.equipeDS *= 3; else e2.cronograma.servicos[id].equipe *= 3;
  assert.ok(PA.motor.calcular(e2, HOJE_FIXTURE).cron.obra.termino < res.cron.obra.termino);
});
