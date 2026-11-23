'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE, valor } = require('./helpers');
const PA = carregarApp();
let e, res;
test.before(() => { e = PA.importar.deWorkbook(lerWorkbookV6()); res = PA.motor.calcular(e, HOJE_FIXTURE); });

test('Portas: números batem com a BASE e somam 94', () => {
  const a = PA.motor.acompanhamento(res, { servico: 'Portas de madeira' });
  let concl = 0; for (let i = 0; i < 94; i++) if (valor('BASE', 'K' + (5 + 94 * 3 + i)) === 'Concluído') concl++;
  const n = a.numeros;
  assert.strictEqual(n.executado, concl);
  assert.strictEqual(n.liberado + n.bloqueado + n.execucao + n.executado + n.fora, 94);
  assert.strictEqual(n.total, 94);
  assert.ok(a.servico && typeof a.servico.termino === 'number');
  assert.strictEqual(a.matriz, null);
  assert.strictEqual(a.porPrumada.reduce((s, p) => s + p.executado, 0), concl);
  const lib = a.listas.liberado;
  for (let i = 1; i < lib.length; i++) assert.ok((lib[i - 1].dataNecessaria || Infinity) <= (lib[i].dataNecessaria || Infinity));
});
test('sem serviço: matriz de 12 serviços, cada linha soma 94', () => {
  const a = PA.motor.acompanhamento(res, {});
  assert.strictEqual(a.matriz.length, 12);
  a.matriz.forEach(m => assert.strictEqual(m.executado + m.execucao + m.liberado + m.bloqueado + m.fora, 94, m.servico));
  assert.strictEqual(a.servico, null);
});
test('filtros de empreiteira (sem diferenciar maiúsculas), prumada e pavimento', () => {
  const a = PA.motor.acompanhamento(res, { empreiteira: 'camargo' });
  const todos = [].concat(...Object.values(a.listas));
  assert.ok(todos.length > 0 && todos.every(i => i.empreiteira.toLowerCase() === 'camargo'));
  const b = PA.motor.acompanhamento(res, { servico: 'Louças e metais', prumada: 'Finais 3-4', pavimento: 16 });
  assert.strictEqual(b.numeros.total, 2);
  assert.ok([].concat(...Object.values(b.listas)).every(i => i.final >= 3 && i.pav === 16));
});
test('itens trazem o número de pendências abertas', () => {
  const a = PA.motor.acompanhamento(res, { servico: 'Piso' });
  const it = [].concat(...Object.values(a.listas)).find(i => i.apto === 203);
  assert.ok(it.pendencias >= 1);
});
