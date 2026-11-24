'use strict';
const test = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
let e, res;
test.before(() => { e = PA.importar.deWorkbook(lerWorkbookV6()); res = PA.motor.calcular(e, HOJE_FIXTURE); });

test('Camargo, Finais 3–4: só Louças, só finais 3 e 4, ordenado pela data necessária', () => {
  const r = PA.motor.relatorio(e, res, { empreiteira: 'Camargo', prumadas: [3, 4], incluirExecutados: false });
  assert.deepStrictEqual(r.cabecalho.servicos.map(s => s.nome), ['Louças e metais']);
  assert.ok(r.linhas.length > 0 && r.linhas.every(l => l.final >= 3 && l.servico === 'Louças e metais' && l.situacao !== 'Executado'));
  const l164 = r.linhas.find(l => l.apto === 164);
  const it = res.itens.find(i => i.ordem === 5 && i.apto === 164);
  assert.strictEqual(l164.dataNecessaria, it.dataNecessaria);
  for (let i = 1; i < r.linhas.length; i++) assert.ok((r.linhas[i - 1].dataNecessaria || Infinity) <= (r.linhas[i].dataNecessaria || Infinity));
  const cab = r.cabecalho.servicos[0];
  assert.strictEqual(cab.total, res.itens.filter(i => i.ordem === 5 && i.final >= 3 && i.status !== 'Cancelado').length);
});
test('empreiteira com dois serviços e executados no fim; nome sem diferenciar maiúsculas', () => {
  const r = PA.motor.relatorio(e, res, { empreiteira: 'trovão engenharia', prumadas: null, incluirExecutados: true });
  assert.deepStrictEqual(r.cabecalho.servicos.map(s => s.nome).sort(), ['Pintura 1ª demão', 'Pintura 2ª demão']);
  const iExec = r.linhas.findIndex(l => l.situacao === 'Executado');
  assert.ok(iExec > 0 && r.linhas.slice(iExec).every(l => l.situacao === 'Executado'));
});
test('Excel do relatório tem uma linha por apto', () => {
  const r = PA.motor.relatorio(e, res, { empreiteira: 'Camargo', prumadas: [3, 4], incluirExecutados: false });
  const wb = PA.exportar.relatorio(r);
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).filter(x => typeof x[0] === 'number');
  assert.strictEqual(linhas.length, r.linhas.length);
});
