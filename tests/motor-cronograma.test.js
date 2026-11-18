'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, valor, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
let estado, cron;
test.before(() => {
  estado = PA.importar.deWorkbook(lerWorkbookV6());
  const lim = PA.motor.limites(estado);
  const itens = PA.motor.fila(estado, PA.motor.itens(estado, HOJE_FIXTURE, lim));
  cron = PA.motor.cronograma(estado, HOJE_FIXTURE, itens, lim);
});
const F = [3, 4, 2, 1];
function col(letras, getter) { return letras.map((c, i) => [c, L => getter(L, F[i])]); }
const COLS = [
  ['E', L => L.prazo], ['F', L => L.unid], ['G', L => L.prod], ['H', L => L.funcDia], ['I', L => L.equipe], ['J', L => L.ritmo], ['K', L => L.ciclo],
  ...col(['L', 'M', 'N', 'O'], (L, f) => L.limite[f]), ['P', L => L.limite.f34], ['Q', L => L.limite.obra],
  ...col(['R', 'S', 'T', 'U'], (L, f) => L.saldo[f]), ['V', L => L.liberados], ['W', L => L.inicio],
  ...col(['X', 'Y', 'Z', 'AA'], (L, f) => L.saldoAcum[f]), ...col(['AB', 'AC', 'AD', 'AE'], (L, f) => L.termCap[f]),
  ...col(['AF', 'AG', 'AH', 'AI'], (L, f) => L.term[f]), ['AJ', L => L.termF34], ['AK', L => L.termTodas],
  ...col(['AL', 'AM', 'AN', 'AO'], (L, f) => L.folga[f]), ['AP', L => L.piorFolga],
  ...col(['AQ', 'AR', 'AS', 'AT'], (L, f) => L.mo[f]), ['AU', L => L.moF34], ['AV', L => L.moTodas], ['AW', L => L.acrescimo],
  ...col(['AX', 'AY', 'AZ', 'BA'], (L, f) => L.atrasoGerado[f]), ['BB', L => L.atrasoGerado.obra],
  ...col(['BC', 'BD', 'BE', 'BF'], (L, f) => L.inicioPrumada[f]), ...col(['BG', 'BH', 'BI', 'BJ'], (L, f) => L.fator[f])
];
const igual = (a, b) => {
  const va = (a === null || a === undefined || a === '') ? '' : a, vb = (b === null || b === undefined || b === '') ? '' : b;
  if (typeof va === 'number' && typeof vb === 'number') return Math.abs(va - vb) < 1e-6;
  return String(va) === String(vb);
};
test('CRONOGRAMA E16:BJ27 igual à v6', () => {
  const erros = [];
  for (const L of cron.servicos) {
    const r = 15 + L.ordem;
    for (const [c, g] of COLS) {
      const esp = valor('CRONOGRAMA', c + r), obt = g(L);
      if (!igual(esp, obt)) erros.push(`${c}${r} (${L.servico}): v6=${esp} sistema=${obt}`);
    }
  }
  assert.deepStrictEqual(erros.slice(0, 25), []);
});
test('resumo por prumada (32–36)', () => {
  const linhas = [...cron.prumadas, cron.obra];
  const erros = [];
  linhas.forEach((p, i) => {
    const r = 32 + i;
    const pares = { D: p.meta, E: p.termino === null ? 'Concluída' : p.termino, F: p.folga, G: p.situacao, H: p.gerador, I: p.aptosEscopo, J: p.entregues };
    for (const [c, v] of Object.entries(pares)) if (!igual(valor('CRONOGRAMA', c + r), v)) erros.push(`${c}${r}: v6=${valor('CRONOGRAMA', c + r)} sistema=${v}`);
  });
  assert.deepStrictEqual(erros, []);
});
test('bloco do piso', () => {
  const p = cron.piso;
  assert.strictEqual(p.faltaDS, valor('Piso', 'Q10'));
  assert.strictEqual(p.faltaJun, valor('Piso', 'T10'));
  assert.ok(Math.abs(p.diasDS - valor('Piso', 'R18')) < 1e-9);
  assert.ok(Math.abs(p.diasJun - valor('Piso', 'U18')) < 1e-9);
  assert.strictEqual(p.finalDS, valor('Piso', 'R19'));
  assert.strictEqual(p.finalJun, valor('Piso', 'U19'));
});
