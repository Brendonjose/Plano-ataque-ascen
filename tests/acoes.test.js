'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE, deISO } = require('./helpers');
const PA = carregarApp();
let base;
test.before(() => { base = PA.importar.deWorkbook(lerWorkbookV6()); });

function memoria() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }

test('lançar e desfazer', () => {
  const e1 = PA.acoes.lancar(base, 'portas', 193, { codigo: '1' });
  assert.strictEqual(e1.lancamentos.portas[193].codigo, '1');
  assert.notStrictEqual(e1, base);
  const e2 = PA.acoes.desfazer(e1);
  assert.deepStrictEqual(e2.lancamentos.portas[193], base.lancamentos.portas[193]);
  const e3 = PA.acoes.lancar(e1, 'portas', 193, null);
  assert.strictEqual(e3.lancamentos.portas[193], undefined);
});
test('pilha de desfazer limitada a 20', () => {
  let e = base;
  for (let i = 0; i < 25; i++) e = PA.acoes.lancar(e, 'loucas', 193, { codigo: i % 2 ? '1' : 'and' });
  assert.strictEqual(e.meta.pilhaDesfazer.length, 20);
});
test('armazenamento: salvar, carregar, sem backend e cota cheia', () => {
  const ar = PA.armazenamento.criar(memoria());
  assert.strictEqual(ar.disponivel, true);
  assert.deepStrictEqual(ar.salvar(base), { ok: true });
  assert.deepStrictEqual(ar.carregar().lancamentos, base.lancamentos);
  const semBackend = PA.armazenamento.criar(null);
  assert.strictEqual(semBackend.disponivel, false);
  assert.strictEqual(semBackend.salvar(base).ok, false);
  const cheio = PA.armazenamento.criar({ getItem: () => null, setItem: () => { const er = new Error('cheio'); er.name = 'QuotaExceededError'; throw er; }, removeItem() {} });
  assert.deepStrictEqual(cheio.salvar(base), { ok: false, erro: 'cota' });
  const quebrado = PA.armazenamento.criar({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() {} });
  assert.strictEqual(quebrado.disponivel, false);
});
test('backup JSON ida e volta, sem data de conferência', () => {
  const s = PA.acoes.backupJSON(base);
  assert.ok(!s.includes('hojeConferencia'));
  const r = PA.acoes.restaurarJSON(s);
  assert.deepStrictEqual(r.lancamentos, base.lancamentos);
  assert.deepStrictEqual(r.cronograma, base.cronograma);
  assert.throws(() => PA.acoes.restaurarJSON('{"x":1}'), /backup/i);
});
test('importar por cima devolve o backup do atual', () => {
  const atual = PA.acoes.lancar(base, 'portas', 193, { codigo: '1' });
  const { estado, backup } = PA.acoes.importarPorCima(atual, base);
  assert.strictEqual(JSON.parse(backup).estado.lancamentos.portas[193].codigo, '1');
  assert.strictEqual(estado.lancamentos.portas[193], base.lancamentos.portas[193]);
});
test('backup atrasado após 7 dias', () => {
  const e = JSON.parse(JSON.stringify(base));
  e.meta.ultimoBackup = HOJE_FIXTURE - 8;
  assert.strictEqual(PA.acoes.backupAtrasado(e, HOJE_FIXTURE), true);
  e.meta.ultimoBackup = HOJE_FIXTURE - 2;
  assert.strictEqual(PA.acoes.backupAtrasado(e, HOJE_FIXTURE), false);
});
test('registrar semana grava o % de hoje na semana corrente', () => {
  const res = PA.motor.calcular(base, deISO('2026-11-24'));
  const e = PA.acoes.registrarSemana(base, res);
  const s3 = e.historico.find(h => h.semana === 3);
  assert.ok(Math.abs(s3.realizado - res.historico.pctHoje) < 1e-12);
  assert.strictEqual(s3.concluidos, res.historico.concluidosHoje);
});
test('pendências e colunas manuais', () => {
  let e = PA.acoes.pendencia.criar(base, { apto: 54, etapa: 'Piso', descricao: 'Peça trincada', responsavel: 'DS', abertura: HOJE_FIXTURE });
  const p = e.pendencias[e.pendencias.length - 1];
  assert.strictEqual(p.status, 'Aberta');
  e = PA.acoes.pendencia.editar(e, p.id, { status: 'Resolvida', resolvidaEm: HOJE_FIXTURE });
  assert.strictEqual(e.pendencias.find(x => x.id === p.id).status, 'Resolvida');
  e = PA.acoes.pendencia.remover(e, p.id);
  assert.ok(!e.pendencias.some(x => x.id === p.id));
  e = PA.acoes.manual(e, 154, 'Bancadas', 'ok');
  assert.strictEqual(e.manuais[154].Bancadas, 'ok');
});
