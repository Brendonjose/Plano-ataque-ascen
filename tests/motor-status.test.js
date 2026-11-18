'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, valor, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
const M = PA.modelo;
let estado;
test.before(() => { estado = PA.importar.deWorkbook(lerWorkbookV6()); });

/** Limites da fixture (CRONOGRAMA L:O = F3, F4, F2, F1). */
function limitesFixture() {
  const out = {};
  for (const s of M.SERVICOS) {
    const r = 15 + s.ordem;
    out[s.ordem] = { 3: valor('CRONOGRAMA', 'L' + r), 4: valor('CRONOGRAMA', 'M' + r), 2: valor('CRONOGRAMA', 'N' + r), 1: valor('CRONOGRAMA', 'O' + r) };
  }
  return out;
}
const vazio = v => (v === null || v === undefined || v === '') ? '' : v;

test('1.128 itens iguais à BASE (J:Y)', () => {
  const itens = PA.motor.itens(estado, HOJE_FIXTURE, limitesFixture());
  assert.strictEqual(itens.length, 1128);
  const cols = { J: 'codigo', K: 'status', L: 'consolidado', M: 'detalhe', D: 'empreiteira', N: 'inicio', O: 'limite', Q: 'diasVencer', R: 'atrasado', S: 'diasAtraso', T: 'venceBreve', U: 'foraPrazo', Y: 'alerta' };
  const erros = [];
  itens.forEach((it, i) => {
    const r = 5 + i;
    assert.strictEqual(it.id, valor('BASE', 'A' + r));
    for (const [c, k] of Object.entries(cols)) {
      const esp = vazio(valor('BASE', c + r)), obt = vazio(it[k]);
      if (String(esp) !== String(obt)) erros.push(`${c}${r} ${it.servico}/${it.apto}: esperado ${esp} obtido ${obt}`);
    }
    const v = valor('BASE', 'V' + r);
    if (Math.abs(v - it.previstoHoje) > 1e-9) erros.push(`V${r}: ${v} × ${it.previstoHoje}`);
  });
  assert.deepStrictEqual(erros.slice(0, 15), []);
});

function comLanc(serv, apto, codigo) {
  const e = JSON.parse(JSON.stringify(estado));
  if (codigo === null) delete e.lancamentos[serv][apto]; else e.lancamentos[serv][apto] = { codigo };
  return e;
}
test('cascata do canc a partir do piso', () => {
  const e = comLanc('piso', 113, 'canc');
  for (const s of M.SERVICOS) if (s.ordem > 1) e.lancamentos[s.id][113] && delete e.lancamentos[s.id][113];
  const g = PA.motor.grade(e);
  for (const s of M.SERVICOS) if (s.id !== 'pintura1') assert.strictEqual(g[s.id][113], 'canc', s.nome); // Pintura 1ª não depende do piso
});
test('escopo vendidos cancela aptos N sem lançamento', () => {
  const g = PA.motor.grade(estado);
  assert.strictEqual(estado.estrategia.vendido[11], 'N');
  for (const s of M.SERVICOS) if (s.ordem >= 7 && !estado.lancamentos[s.id][11]) assert.strictEqual(g[s.id][11], 'canc', s.nome);
});
test('códigos fora do padrão', () => {
  const casos = [[' 1 ', 'Concluído', 'Executado'], ['OK', 'Não iniciado', 'Liberado para execução'], ['x', 'Não iniciado', 'Código não reconhecido'], [1, 'Concluído', 'Executado']];
  for (const [c, st, det] of casos) {
    const e = comLanc('loucas', 193, c);
    const it = PA.motor.itens(e, HOJE_FIXTURE, limitesFixture()).find(i => i.ordem === 5 && i.apto === 193);
    assert.deepStrictEqual([it.status, it.detalhe], [st, det], JSON.stringify(c));
  }
});
test('concluir apto bloqueado libera o seguinte', () => {
  const g0 = PA.motor.grade(estado);
  const apto = M.APTOS.find(a => g0.portas[a.apto] === 'N/L').apto;
  const e = comLanc('portas', apto, '1');
  const g = PA.motor.grade(e);
  assert.strictEqual(g.portas[apto], '1');
  if (!e.lancamentos.loucas[apto]) assert.strictEqual(g.loucas[apto], 'ok');
});
