'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE, valor } = require('./helpers');
const PA = carregarApp();
let res;
test.before(() => { res = PA.motor.calcular(PA.importar.deWorkbook(lerWorkbookV6()), HOJE_FIXTURE); });

test('totais iguais à aba PENDÊNCIAS e divisão por prumada', () => {
  const p = PA.motor.pendenciasPainel(res, {});
  assert.strictEqual(p.abertas, valor('PENDÊNCIAS', 'C3'));
  assert.strictEqual(p.resolvidas, valor('PENDÊNCIAS', 'E3'));
  assert.strictEqual(p.atrasadas, valor('PENDÊNCIAS', 'G3'));
  assert.strictEqual([1, 2, 3, 4].reduce((s, f) => s + (p.porPrumada[f] || 0), 0), p.abertas);
  const a203 = p.aptos.find(a => a.apto === 203);
  assert.ok(a203 && a203.etapas.includes('Geral'));
  assert.ok(p.porResponsavel.some(r => r.responsavel === 'RD Santos' && r.abertas > 0));
});
test('filtro de prumada e pavimento', () => {
  const p = PA.motor.pendenciasPainel(res, { prumada: 'Final 3' });
  assert.ok(p.aptos.every(a => a.apto % 10 === 3));
  const q = PA.motor.pendenciasPainel(res, { pavimento: 20 });
  assert.ok(q.aptos.length >= 2 && q.aptos.every(a => Math.floor(a.apto / 10) === 20));
});
