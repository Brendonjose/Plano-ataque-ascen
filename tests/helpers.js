'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
let fixture = null;
function carregarFixture() {
  if (!fixture) fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'v6.json'), 'utf8'));
  return fixture;
}
function carregarApp() {
  if (!globalThis.XLSX) globalThis.XLSX = require('xlsx');
  const arquivos = ['datas.js', 'modelo.js', 'importar.js', 'motor/status.js', 'motor/cronograma.js',
    'motor/datas-apto.js', 'motor/paineis.js', 'motor/calcular.js', 'armazenamento.js', 'acoes.js', 'exportar.js',
    'dados/diff.js', 'dados/local.js', 'dados/servidor.js'];
  for (const a of arquivos) {
    const p = path.join(RAIZ, 'app', 'js', a);
    if (fs.existsSync(p)) require(p);
  }
  return globalThis.PA;
}
function deISO(s) { const [y, m, d] = s.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5); }
/** Valor gravado na v6 (datas viram serial). */
function valor(aba, ref) {
  const v = carregarFixture().abas[aba].v[ref];
  if (v && typeof v === 'object' && v.d) return deISO(v.d);
  return v === undefined ? null : v;
}
function feriados() {
  const out = [];
  for (let r = 37; r <= 60; r++) { const v = valor('Piso', 'B' + r); if (typeof v === 'number') out.push(v); }
  return out;
}
function lerWorkbookV6() {
  const XLSX = require('xlsx');
  return XLSX.readFile(path.join(RAIZ, 'referencia', 'Plano_de_Ataque_v6.xlsx'), { cellDates: false });
}
const HOJE_FIXTURE = deISO('2026-11-17');
module.exports = { carregarFixture, carregarApp, valor, deISO, feriados, lerWorkbookV6, HOJE_FIXTURE, RAIZ };
