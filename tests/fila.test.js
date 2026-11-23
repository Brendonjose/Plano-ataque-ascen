'use strict';
/* Fila de envio: dono da fila, várias abas e erros temporários (checkpoint 1 da v2). */
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp } = require('./helpers');
const PA = carregarApp();

function armazenamento() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m }; }
function dadosFalsos(dono) {
  const d = { enviados: [], online: true, dono, usuario: () => (d.dono ? { id: d.dono } : null),
    gravar: async ops => { if (!d.online) return { ok: false, falhas: ops.map(op => ({ op, motivo: 'rede' })) }; d.enviados.push(...ops); return { ok: true, falhas: [] }; } };
  return d;
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

test('C1: fila de um usuário não envia com a sessão de outro e para ao sair', async () => {
  globalThis.localStorage = armazenamento();
  const d = dadosFalsos('A'); d.online = false;
  const f = PA.dados.fila.criar(d, 'A', {});
  f.enviar([{ tipo: 'lanc', servico: 'portas', apto: 11, valor: { codigo: '1' } }]);
  await esperar(10);
  d.dono = 'B'; d.online = true;             // outra pessoa entrou no mesmo navegador
  await f.processar(); await esperar(10);
  assert.strictEqual(d.enviados.length, 0, 'não enviou com a sessão de B');
  assert.strictEqual(f.pendentes(), 1, 'continua guardado para A');
  f.parar(); d.dono = 'A';
  await f.processar(); await esperar(10);
  assert.strictEqual(d.enviados.length, 0, 'fila parada não envia');
});
test('I2: duas abas do mesmo usuário não perdem lançamentos', async () => {
  globalThis.localStorage = armazenamento();
  const d1 = dadosFalsos('A'), d2 = dadosFalsos('A'); d1.online = d2.online = false;
  const f1 = PA.dados.fila.criar(d1, 'A', {}), f2 = PA.dados.fila.criar(d2, 'A', {});
  const x = { tipo: 'lanc', servico: 'portas', apto: 11, valor: { codigo: '1' } }, y = { tipo: 'lanc', servico: 'portas', apto: 21, valor: { codigo: '1' } };
  f1.enviar([x]); await esperar(5); f2.enviar([y]); await esperar(5);
  d1.online = true; await f1.processar(); await esperar(10);
  d2.online = true; await f2.processar(); await esperar(10);
  const todos = d1.enviados.concat(d2.enviados).map(o => o.apto).sort();
  assert.deepStrictEqual(todos, [11, 21]);
  assert.deepStrictEqual(JSON.parse(globalThis.localStorage.getItem('pa.fila.A')), []);
});
