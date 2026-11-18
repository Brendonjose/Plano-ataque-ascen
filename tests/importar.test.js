'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, carregarFixture, valor, deISO, lerWorkbookV6 } = require('./helpers');
const PA = carregarApp();
const M = PA.modelo;
let estado;
test.before(() => { estado = PA.importar.deWorkbook(lerWorkbookV6()); });

test('94 aptos na ordem da BASE', () => {
  assert.strictEqual(M.APTOS.length, 94);
  assert.deepStrictEqual([M.APTOS[0].apto, M.APTOS[0].pav, M.APTOS[0].final], [271, 27, 1]);
  assert.ok(!M.APTOS.some(a => a.pav > 20 && a.final > 2));
  const base = carregarFixture().abas.BASE.v;
  M.APTOS.forEach((a, i) => assert.strictEqual(base['H' + (5 + i)], a.apto));
});
test('lançamentos batem com os concluídos da BASE', () => {
  for (const s of M.SERVICOS) {
    let concluidosBase = 0, concl = 0;
    M.APTOS.forEach((a, i) => { if (valor('BASE', 'K' + (5 + 94 * (s.ordem - 1) + i)) === 'Concluído') concluidosBase++; });
    for (const l of Object.values(estado.lancamentos[s.id])) {
      const c = M.norm(l.codigo);
      if (s.id === 'piso' ? (c === '1' || c === '2') : s.id === 'rejunte' ? (c === '1' || c === '4') : c === '1') concl++;
    }
    assert.strictEqual(concl, concluidosBase, s.nome);
  }
});
test('nenhum lançamento automático (ok/N/L)', () => {
  for (const s of M.SERVICOS) for (const l of Object.values(estado.lancamentos[s.id])) assert.ok(!['ok', 'n/l'].includes(M.norm(l.codigo)));
});
test('metas, prioridades e escopo', () => {
  assert.strictEqual(estado.cronograma.prumadas[3].meta, deISO('2027-01-20'));
  assert.strictEqual(estado.cronograma.prumadas[1].meta, null);
  assert.strictEqual(estado.cronograma.metaMacro, deISO('2027-03-15'));
  assert.deepStrictEqual([1, 2, 3, 4].map(f => estado.cronograma.prumadas[f].prioridade), [4, 3, 2, 1]);
  assert.strictEqual(Object.values(estado.estrategia.vendido).filter(v => v === 'V').length, 68);
  assert.strictEqual(estado.estrategia.escopo['checklist-rejunte'], 'Vendidos');
  assert.strictEqual(estado.estrategia.segueprioridade.piso, 'Não');
  assert.strictEqual(estado.cronograma.servicos['limpeza-grossa'].equipe, 1);
  assert.strictEqual(estado.cronograma.servicos.pintura1.equipe, 3);
  assert.strictEqual(estado.feriados.length >= 15, true);
});
test('pendências e histórico', () => {
  assert.strictEqual(estado.pendencias.filter(p => p.status === 'Aberta').length, valor('PENDÊNCIAS', 'C3'));
  const s2 = estado.historico.find(h => h.semana === 2);
  assert.ok(Math.abs(s2.realizado - valor('HISTÓRICO', 'E10')) < 1e-9);
  assert.ok(estado.manuais[183] && estado.manuais[183].Bancadas);
});
