'use strict';
const test = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();

test('exportar → reimportar dá os mesmos resultados', () => {
  let e = PA.importar.deWorkbook(lerWorkbookV6());
  e = PA.acoes.lancar(e, 'portas', 193, { codigo: '1', obs: 'teste' });
  const res = PA.motor.calcular(e, HOJE_FIXTURE);
  const wb = PA.exportar.workbook(e, res);
  for (const aba of ['RESUMO', 'BASE', 'CRONOGRAMA', 'PENDÊNCIAS', 'HISTÓRICO', 'ESTRATÉGIA', 'Piso', 'Entrega', 'SISTEMA']) assert.ok(wb.Sheets[aba], aba);
  const bin = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const wb2 = XLSX.read(bin, { type: 'buffer' });
  const e2 = PA.importar.deWorkbook(wb2);
  const res2 = PA.motor.calcular(e2, HOJE_FIXTURE);
  assert.deepStrictEqual(e2.lancamentos, e.lancamentos);
  assert.deepStrictEqual(PA.motor.painel(e2, res2, {}).kpis, PA.motor.painel(e, res, {}).kpis);
  assert.deepStrictEqual(res2.cron.prumadas, res.cron.prumadas);
  // Aba BASE legível: cabeçalho e 1.128 linhas.
  const base = XLSX.utils.sheet_to_json(wb2.Sheets.BASE, { header: 1 });
  assert.strictEqual(base.filter(r => r[0] && String(r[0]).startsWith('S')).length, 1128);
});
