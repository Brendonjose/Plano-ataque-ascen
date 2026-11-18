'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, valor, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
let estado, res;
test.before(() => { estado = PA.importar.deWorkbook(lerWorkbookV6()); res = PA.motor.calcular(estado, HOJE_FIXTURE); });
const v = x => (x === null || x === undefined || x === '') ? '' : x;

test('BASE AB:AF igual à v6', () => {
  const cols = { AB: 'prioridadeFila', AC: 'pendente', AD: 'posicaoFila', AE: 'terminoPrevisto', AF: 'dataNecessaria' };
  const erros = [];
  res.itens.forEach((it, i) => {
    for (const [c, k] of Object.entries(cols)) {
      const esp = v(valor('BASE', c + (5 + i))), obt = v(it[k]);
      if (String(esp) !== String(obt)) erros.push(`${c}${5 + i} ${it.servico}/${it.apto}: v6=${esp} sistema=${obt}`);
    }
  });
  assert.deepStrictEqual(erros.slice(0, 20), []);
});
test('data necessária: nunca depois do limite nem da prevista, sem inversões', () => {
  const M = PA.modelo;
  const porChave = {};
  res.itens.forEach(it => { porChave[it.ordem + '|' + it.apto] = it; });
  let depoisLimite = 0, depoisPrevista = 0, inversoes = 0;
  for (const it of res.itens) {
    if (typeof it.dataNecessaria !== 'number') continue;
    if (it.dataNecessaria > Math.max(it.limite, HOJE_FIXTURE)) depoisLimite++;
    if (it.dataNecessaria > it.terminoPrevisto) depoisPrevista++;
    const suc = M.POR_ORDEM[it.ordem].suc;
    const s = suc && porChave[suc + '|' + it.apto];
    if (s && typeof s.dataNecessaria === 'number' && s.dataNecessaria < it.dataNecessaria) inversoes++;
  }
  assert.deepStrictEqual([depoisLimite, depoisPrevista, inversoes], [0, 0, 0]);
});
test('calcular é rápido (< 300 ms)', () => {
  const t = Date.now();
  for (let i = 0; i < 3; i++) PA.motor.calcular(estado, HOJE_FIXTURE);
  assert.ok((Date.now() - t) / 3 < 300, 'ms médio ' + (Date.now() - t) / 3);
});
