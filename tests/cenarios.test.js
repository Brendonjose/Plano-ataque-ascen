'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
const oraculo = require('./oraculo');
let base;
test.before(() => { base = PA.importar.deWorkbook(lerWorkbookV6()); });
const clone = o => JSON.parse(JSON.stringify(o));
const vz = v => (v === null || v === undefined || v === '') ? '' : v;
const igual = (a, b) => (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) < 1e-6 : String(vz(a)) === String(vz(b));
const F = [3, 4, 2, 1];

function comparar(o, res) {
  const erros = [];
  const ver = (aba, ref, obt) => { const esp = o.valor(aba, ref); if (!igual(esp, obt)) erros.push(`${aba}!${ref}: v6=${esp} sistema=${obt}`); };
  // Status de todos os itens (BASE!K) e datas por apto (AE).
  res.itens.forEach((it, i) => { ver('BASE', 'K' + (5 + i), it.status); ver('BASE', 'AE' + (5 + i), it.terminoPrevisto); });
  for (const L of res.cron.servicos) {
    const r = 15 + L.ordem;
    ['AF', 'AG', 'AH', 'AI'].forEach((c, k) => ver('CRONOGRAMA', c + r, L.term[F[k]]));
    ver('CRONOGRAMA', 'AK' + r, L.termTodas); ver('CRONOGRAMA', 'AP' + r, L.piorFolga); ver('CRONOGRAMA', 'AV' + r, L.moTodas);
  }
  [...res.cron.prumadas, res.cron.obra].forEach((p, i) => { ver('CRONOGRAMA', 'E' + (32 + i), p.termino === null ? 'Concluída' : p.termino); ver('CRONOGRAMA', 'H' + (32 + i), p.gerador); });
  return erros;
}
function cenario(nome, alteracoes, mudarEstado) {
  test(nome, { timeout: 120000 }, () => {
    const e = clone(base); mudarEstado(e);
    const res = PA.motor.calcular(e, HOJE_FIXTURE);
    const erros = comparar(oraculo.rodar(alteracoes, HOJE_FIXTURE), res);
    assert.deepStrictEqual(erros.slice(0, 15), []);
  });
}
cenario('1. lançar piso concluído no apto 162', [{ aba: 'Piso', ref: 'D16', valor: 1 }], e => { e.lancamentos.piso[162] = { codigo: '1' }; });
cenario('2. cancelar o piso do apto 113', [{ aba: 'Piso', ref: 'E21', valor: 'canc' }], e => { e.lancamentos.piso[113] = { codigo: 'canc' }; });
cenario('3. limpeza grossa com 3 funcionários', [{ aba: 'Limpeza grossa', ref: 'L23', valor: 3 }], e => { e.cronograma.servicos['limpeza-grossa'].equipe = 3; });
cenario('4. piso só vendidos', [{ aba: 'ESTRATÉGIA', ref: 'I5', valor: 'Vendidos' }], e => { e.estrategia.escopo.piso = 'Vendidos'; });
test('5. quadro F4 no modo Cenário atual', { timeout: 120000 }, () => {
  const res = PA.motor.calcular(base, HOJE_FIXTURE);
  const o = oraculo.rodar([{ aba: 'F4', ref: 'C3', valor: 'Cenário atual' }], HOJE_FIXTURE, ['F4']);
  const q = PA.motor.quadro(base, res, 4, 'atual');
  const erros = [];
  q.linhas.forEach((l, i) => l.celulas.forEach((c, j) => {
    if (c.manual) return;
    const ref = PA.importar.colLetra(2 + j) + (8 + i);
    if (!igual(o.valor('F4', ref), c.valor)) erros.push(`F4!${ref}: v6=${o.valor('F4', ref)} sistema=${c.valor}`);
  }));
  assert.deepStrictEqual(erros.slice(0, 15), []);
});
