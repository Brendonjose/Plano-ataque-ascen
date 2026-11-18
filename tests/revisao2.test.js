'use strict';
/* Achados do checkpoint de revisão 2. */
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE, deISO } = require('./helpers');
const PA = carregarApp();

test('C1: produtividade zero ou equipe minúscula não trava o cálculo', () => {
  const script = `
    const h = require(${JSON.stringify(path.join(__dirname, 'helpers.js'))}); const PA = h.carregarApp();
    const base = PA.importar.deWorkbook(h.lerWorkbookV6());
    const casos = [e => { e.piso.prodDS.piso = 0; }, e => { e.piso.prodJun.azulejo = null; }, e => { e.cronograma.servicos.portas.equipe = 0.0001; },
      e => { e.piso.equipeDS = 0.00001; }, e => { e.cronograma.servicos.portas.prazo = 1e8; }];
    for (const c of casos) { const e = JSON.parse(JSON.stringify(base)); c(e); PA.motor.calcular(e, h.HOJE_FIXTURE); }
    console.log('ok');`;
  const r = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' });
  assert.strictEqual(r.stdout.trim(), 'ok', 'travou ou falhou: ' + (r.error ? r.error.code : r.stderr.slice(0, 300)));
});
test('C1: workday com dias não finitos ou absurdos não entra em laço', () => {
  assert.strictEqual(PA.datas.workday(deISO('2026-11-17'), Infinity), null);
  assert.strictEqual(PA.datas.workday(deISO('2026-11-17'), NaN), null);
  assert.strictEqual(PA.datas.workday(deISO('2026-11-17'), 1e9), null);
});
test('I2: registrar semana usa a data real, não a de conferência', () => {
  const e = PA.importar.deWorkbook(lerWorkbookV6());
  const res = PA.motor.calcular(e, deISO('2026-12-15')); // conferência
  const e2 = PA.acoes.registrarSemana(e, res, deISO('2026-11-18')); // hoje real
  assert.ok(!e2.historico.find(h => h.semana === 6 && typeof h.realizado === 'number'));
  assert.ok(typeof e2.historico.find(h => h.semana === 2).realizado === 'number');
});
test('I4: limpar volta ao automático e apaga a data real, mantendo a observação', () => {
  let e = PA.importar.deWorkbook(lerWorkbookV6());
  e = PA.acoes.lancar(e, 'portas', 11, { codigo: '1', dataReal: HOJE_FIXTURE, obs: 'x' });
  const e1 = PA.acoes.limpar(e, 'portas', [11]);
  assert.deepStrictEqual(e1.lancamentos.portas[11], { codigo: '', obs: 'x' });
  e = PA.acoes.lancar(e, 'portas', 21, { codigo: '1' });
  const e2 = PA.acoes.limpar(e, 'portas', [21, 11]);
  assert.strictEqual(e2.lancamentos.portas[21], undefined);
  const it = PA.motor.calcular(e1, HOJE_FIXTURE).itens.find(i => i.ordem === 4 && i.apto === 11);
  assert.notStrictEqual(it.alerta, 'Data real informada sem status concluído');
});
