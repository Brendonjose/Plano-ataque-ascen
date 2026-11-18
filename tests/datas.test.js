'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, deISO, feriados } = require('./helpers');
const PA = carregarApp();
const D = () => PA.datas;
const F = () => new Set(feriados());

test('workday negativo sem feriados', () => {
  assert.strictEqual(D().workday(deISO('2027-01-20'), -10), deISO('2027-01-06'));
});
test('workday com feriados', () => {
  assert.strictEqual(D().workday(deISO('2026-11-17'), 1, F()), deISO('2026-11-18'));
  assert.strictEqual(D().workday(deISO('2026-11-19'), 1, F()), deISO('2026-11-23'));
});
test('workday zero devolve a própria data e trunca fração', () => {
  const x = deISO('2026-11-21');
  assert.strictEqual(D().workday(x, 0), x);
  assert.strictEqual(D().workday(deISO('2026-11-17'), 2.9), D().workday(deISO('2026-11-17'), 2));
});
test('networkdays inclusivo e negativo invertido', () => {
  const a = deISO('2026-11-17'), b = deISO('2026-11-26');
  assert.strictEqual(D().networkdays(a, b, F()), 7);
  assert.strictEqual(D().networkdays(b, a, F()), -7);
});
test('formatos', () => {
  assert.strictEqual(D().fmt(deISO('2027-03-15')), '15/03/2027');
  assert.strictEqual(D().paraISO(deISO('2027-03-15')), '2027-03-15');
  assert.strictEqual(D().deISO('2027-03-15'), deISO('2027-03-15'));
  assert.strictEqual(D().fmt(null), '');
});
