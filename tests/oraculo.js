'use strict';
/* Oráculo: executa as fórmulas ORIGINAIS da v6 (HyperFormula) com alterações, para comparar com o motor. */
const { HyperFormula, FunctionPlugin, FunctionArgumentType } = require('hyperformula');
const { carregarFixture, deISO } = require('./helpers');
const PA = globalThis.PA;

class NPlugin extends FunctionPlugin {
  n(ast, state) { return this.runFunction(ast.args, state, this.metadata('N'), v => (typeof v === 'number' ? v : (v === true ? 1 : 0))); }
}
NPlugin.implementedFunctions = { N: { method: 'n', parameters: [{ argumentType: FunctionArgumentType.SCALAR }] } };
let registrado = false;

const ABAS = ['Piso', 'Pintura 1° Demão', 'Portas Mad', 'Louças e Metais', 'Limpeza grossa', 'Checklist Rej.', 'Pintura de 2° Demão',
  'Limpeza fina', 'Checklist', 'Regulagem de caixilhos', 'Entrega', 'BASE', 'CRONOGRAMA', 'ESTRATÉGIA', 'CONFIG', 'PENDÊNCIAS'];
function a1(ref) { const m = ref.match(/^([A-Z]+)(\d+)$/); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [+m[2] - 1, c - 1]; }

/** alteracoes: [{aba, ref, valor}] ; hoje: serial. Devolve valor(aba, ref). */
function rodar(alteracoes, hoje, abasExtras) {
  if (!registrado) { HyperFormula.registerFunctionPlugin(NPlugin, { enGB: { N: 'N' } }); registrado = true; }
  const fx = carregarFixture().abas;
  const iso = PA.datas.paraISO(hoje).split('-').map(Number);
  const TODAY = `DATE(${iso[0]},${iso[1]},${iso[2]})`;
  const sheets = {};
  for (const nome of ABAS.concat(abasExtras || [])) {
    const f = Object.assign({}, fx[nome].f);
    for (const a of alteracoes) if (a.aba === nome) f[a.ref] = a.valor;
    const grid = [];
    for (const [ref, v] of Object.entries(f)) {
      const [r, c] = a1(ref);
      (grid[r] = grid[r] || [])[c] = (v && typeof v === 'object' && v.d) ? deISO(v.d)
        : (typeof v === 'string' && v.startsWith('=') ? v.replace(/TODAY\(\)/g, TODAY).replace(/\$3000/g, '$1132') : v);
    }
    for (let i = 0; i < grid.length; i++) { grid[i] = grid[i] || []; for (let j = 0; j < grid[i].length; j++) if (grid[i][j] === undefined) grid[i][j] = null; }
    sheets[nome] = grid;
  }
  const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3', useArrayArithmetic: true, nullDate: { year: 1899, month: 12, day: 30 } });
  return {
    valor(aba, ref) {
      const [r, c] = a1(ref);
      const v = hf.getCellValue({ sheet: hf.getSheetId(aba), row: r, col: c });
      return (v && typeof v === 'object') ? '#ERRO' : v;
    }
  };
}
module.exports = { rodar };
