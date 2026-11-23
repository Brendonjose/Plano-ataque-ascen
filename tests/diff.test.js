'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
let v6;
test.before(() => { v6 = PA.importar.deWorkbook(lerWorkbookV6()); });
const tipos = ops => ops.map(o => o.tipo).sort();

test('lançar e limpar geram uma operação de lançamento', () => {
  const e1 = PA.acoes.lancar(v6, 'portas', 193, { codigo: '1', obs: 'ok' });
  assert.deepStrictEqual(PA.dados.diff(v6, e1), [{ tipo: 'lanc', servico: 'portas', apto: 193, valor: { codigo: '1', obs: 'ok' } }]);
  const e2 = PA.acoes.lancar(e1, 'portas', 193, null);
  assert.deepStrictEqual(PA.dados.diff(e1, e2), [{ tipo: 'lanc', servico: 'portas', apto: 193, valor: null }]);
});
test('equipe vira operação própria; meta vira parâmetro', () => {
  const e1 = PA.acoes.alterar(v6, 'x', e => { e.cronograma.servicos.loucas.equipe = 3; });
  assert.deepStrictEqual(PA.dados.diff(v6, e1), [{ tipo: 'equipe', chave: 'loucas', valor: 3 }]);
  const e2 = PA.acoes.alterar(v6, 'x', e => { e.piso.equipeDS = 4; });
  assert.deepStrictEqual(PA.dados.diff(v6, e2), [{ tipo: 'equipe', chave: 'piso_ds', valor: 4 }]);
  const e3 = PA.acoes.alterar(v6, 'x', e => { e.cronograma.metaMacro += 10; });
  const ops = PA.dados.diff(v6, e3);
  assert.deepStrictEqual(tipos(ops), ['param']);
  assert.strictEqual(ops[0].chave, 'cronograma');
  assert.ok(Object.entries(ops[0].valor.servicos).every(([id, sv]) => id === 'piso' || sv.equipe === undefined), 'parâmetro sem equipes (o piso usa equipeDS/Jun)');
});
test('pendência, manual e semana', () => {
  let e = PA.acoes.pendencia.criar(v6, { apto: 54, etapa: 'Piso', descricao: 'x' });
  let ops = PA.dados.diff(v6, e);
  assert.deepStrictEqual(tipos(ops), ['pend']);
  assert.strictEqual(ops[0].uid, e.pendencias[e.pendencias.length - 1].id);
  const e2 = PA.acoes.manual(e, 154, 'Bancadas', 'ok');
  assert.deepStrictEqual(PA.dados.diff(e, e2), [{ tipo: 'manual', apto: 154, etapa: 'Bancadas', valor: 'ok' }]);
  const res = PA.motor.calcular(e2, HOJE_FIXTURE);
  const e3 = PA.acoes.registrarSemana(e2, res, HOJE_FIXTURE);
  assert.deepStrictEqual(tipos(PA.dados.diff(e2, e3)), ['semana']);
});
test('estados iguais não geram operações; estado completo gera tudo e reconstrói', () => {
  assert.deepStrictEqual(PA.dados.diff(v6, JSON.parse(JSON.stringify(v6))), []);
  const vazio = PA.modelo.estadoVazio();
  const ops = PA.dados.diff(vazio, v6);
  const rec = PA.dados.aplicarOps(PA.modelo.estadoVazio(), ops);
  assert.deepStrictEqual(rec.lancamentos, v6.lancamentos);
  assert.deepStrictEqual(rec.pendencias, v6.pendencias);
  assert.deepStrictEqual(rec.historico, v6.historico);
  assert.deepStrictEqual(rec.cronograma, v6.cronograma);
  assert.deepStrictEqual(rec.piso, v6.piso);
});
test('ids determinísticos válidos no PocketBase', () => {
  const id = PA.dados.ids.lanc('portas', 193);
  assert.match(id, /^[a-z0-9]{15}$/);
  assert.strictEqual(id, PA.dados.ids.lanc('portas', 193));
  assert.match(PA.dados.ids.manual(154, 'Caix. Técnica'), /^[a-z0-9]{15}$/);
  assert.notStrictEqual(PA.dados.ids.manual(154, 'Bancadas'), PA.dados.ids.manual(154, 'Espelhos'));
});
