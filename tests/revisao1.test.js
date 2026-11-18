'use strict';
/* Achados do checkpoint de revisão 1 (importação, ranking e armazenamento). */
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();

test('importação mantém N/L digitado por cima da fórmula', () => {
  const wb = lerWorkbookV6();
  wb.Sheets['Louças e Metais'].F15 = { t: 's', v: 'N/L' };
  const e = PA.importar.deWorkbook(wb);
  assert.strictEqual(e.lancamentos.loucas[174] && e.lancamentos.loucas[174].codigo, 'N/L');
  const res = PA.motor.calcular(e, HOJE_FIXTURE);
  assert.strictEqual(res.itens.find(i => i.ordem === 5 && i.apto === 174).status, 'Bloqueado');
});
test('importação avisa quando falta aba essencial', () => {
  for (const aba of ['CRONOGRAMA', 'CONFIG', 'ESTRATÉGIA', 'Portas Mad']) {
    const wb = lerWorkbookV6();
    wb.SheetNames = wb.SheetNames.filter(n => n !== aba); delete wb.Sheets[aba];
    assert.throws(() => PA.importar.deWorkbook(wb), new RegExp(aba.replace('.', '\\.')), aba);
  }
});
test('importação aceita º no lugar de ° no nome da aba', () => {
  const wb = lerWorkbookV6();
  const i = wb.SheetNames.indexOf('Pintura 1° Demão');
  wb.SheetNames[i] = 'Pintura 1º Demão'; wb.Sheets['Pintura 1º Demão'] = wb.Sheets['Pintura 1° Demão']; delete wb.Sheets['Pintura 1° Demão'];
  const e = PA.importar.deWorkbook(wb);
  assert.ok(Object.keys(e.lancamentos.pintura1).length >= 78);
});
test('ranking: DS sem equipe não ganha folga infinita', () => {
  const e = PA.importar.deWorkbook(lerWorkbookV6());
  e.piso.equipeDS = 0;
  const res = PA.motor.calcular(e, HOJE_FIXTURE);
  const ds = PA.motor.empreiteiras(e, res.cron).linhas[0];
  assert.strictEqual(ds.folga, null);
});
test('armazenamento guarda cópia quando o dado salvo está corrompido', () => {
  const m = { 'pa.estado.v1': '{quebrado' };
  const b = { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: k => { delete m[k]; } };
  const ar = PA.armazenamento.criar(b);
  assert.strictEqual(ar.carregar(), null);
  assert.strictEqual(m['pa.estado.v1.corrompido'], '{quebrado');
  assert.strictEqual(ar.corrompido, true);
});
