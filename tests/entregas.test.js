'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE, deISO } = require('./helpers');
const PA = carregarApp();
let e, s, res;
test.before(() => {
  e = PA.importar.deWorkbook(lerWorkbookV6());
  s = PA.acoes.vistoria.aprovar(e, 174, { realizada: deISO('2026-11-16') });                         // de primeira
  s = PA.acoes.vistoria.reprovar(s, 164, { realizada: deISO('2026-11-10'), novaData: deISO('2026-11-16'), motivos: [{ categoria: 'Pintura', descricao: 'a' }, { categoria: 'Louças e metais', descricao: 'b' }] });
  s = PA.acoes.vistoria.aprovar(s, 164, { realizada: deISO('2026-11-16') });                         // após reprova
  s = PA.acoes.vistoria.reprovar(s, 154, { realizada: deISO('2026-11-12'), novaData: deISO('2026-11-19'), motivos: [{ categoria: 'Pintura', descricao: 'c' }] }); // aguardando
  s = PA.acoes.vistoria.agendar(s, 144, deISO('2026-11-15'));                                         // agendada e atrasada
  res = PA.motor.calcular(s, HOJE_FIXTURE);
});
test('painel de entregas', () => {
  const p = PA.motor.entregas(s, res, {});
  assert.strictEqual(p.dePrimeira, 1);
  assert.strictEqual(p.aposReprova, 1);
  assert.strictEqual(p.reprovadosAguardando, 1);
  assert.strictEqual(p.agendadas, 1);
  assert.deepStrictEqual(p.proximas.map(x => x.apto), [154]);          // próximos 7 dias a partir de 17/11
  assert.deepStrictEqual(p.atrasadas.map(x => x.apto), [144]);
  assert.strictEqual(p.entregues, res.itens.filter(i => i.ordem === 12 && i.status === 'Concluído').length);
  assert.strictEqual(p.semRegistro, p.entregues - 2);
  assert.ok(Math.abs(p.pctPrimeira - 0.5) < 1e-9);
  assert.ok(Math.abs(p.mediaVistorias - 1.5) < 1e-9);
  const p4 = PA.motor.entregas(s, res, { prumada: 'Final 4' });
  assert.strictEqual(p4.dePrimeira + p4.aposReprova + p4.reprovadosAguardando + p4.agendadas, 4);
});
test('ranking de reprovas por categoria e empreiteira; categoria apagada continua no ranking', () => {
  const r = PA.motor.reprovas(s, res, {});
  assert.deepStrictEqual(r.porCategoria[0], { categoria: 'Pintura', ocorrencias: 2, aptos: 2 });
  assert.ok(r.porEmpreiteira.some(x => x.empreiteira === 'Camargo' && x.ocorrencias === 1));
  assert.strictEqual(r.lista.length, 3);
  const s2 = PA.acoes.alterar(s, 'cat', x => { x.categoriasReprova = PA.modelo.categoriasReprova(x).filter(c => c.nome !== 'Pintura'); });
  const r2 = PA.motor.reprovas(s2, PA.motor.calcular(s2, HOJE_FIXTURE), {});
  assert.strictEqual(r2.porCategoria[0].categoria, 'Pintura');
  const r3 = PA.motor.reprovas(s, res, { categoria: 'Louças e metais' });
  assert.strictEqual(r3.lista.length, 1);
});
