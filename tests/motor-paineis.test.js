'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, valor, lerWorkbookV6, HOJE_FIXTURE, carregarFixture } = require('./helpers');
const PA = carregarApp();
let estado, res, pn;
test.before(() => { estado = PA.importar.deWorkbook(lerWorkbookV6()); res = PA.motor.calcular(estado, HOJE_FIXTURE); pn = PA.motor.painel(estado, res, {}); });
const norm = v => (v === null || v === undefined || v === '') ? '' : v;
function confere(erros, aba, ref, obt) {
  const esp = norm(valor(aba, ref)); obt = norm(obt);
  const ok = (typeof esp === 'number' && typeof obt === 'number') ? Math.abs(esp - obt) < 1e-6 : String(esp) === String(obt);
  if (!ok) erros.push(`${aba}!${ref}: v6=${esp} sistema=${obt}`);
}

test('KPIs, prumadas, risco e críticos do Dashboard', () => {
  const e = [], k = pn.kpis;
  [['B8', k.total], ['D8', k.concluidos], ['F8', k.andamento], ['H8', k.naoIniciados], ['J8', k.atrasados], ['L8', k.bloqueados], ['N8', k.pct], ['P8', k.vencendo]].forEach(([r, v]) => confere(e, 'DASHBOARD EXECUTIVO', r, v));
  assert.ok(String(valor('DASHBOARD EXECUTIVO', 'B11')).includes(' ' + pn.alertas + ' item'));
  pn.prumadas.forEach((p, i) => {
    const r = 15 + i;
    [['E', p.meta], ['F', p.termino === null ? 'Concluída' : p.termino], ['G', p.folga === null ? '—' : p.folga], ['H', p.situacao], ['J', p.gerador], ['L', p.aptosEscopo], ['M', p.entregues], ['N', p.pct], ['O', p.leitura]].forEach(([c, v]) => confere(e, 'DASHBOARD EXECUTIVO', c + r, v));
  });
  pn.risco.forEach((x, i) => {
    const r = 24 + i;
    [['B', x.servico], ['D', x.empreiteira], ['F', x.limiteF34], ['G', x.limiteObra], ['H', x.termino], ['I', x.piorFolga], ['J', x.situacao], ['L', x.equipe], ['M', x.necessaria], ['N', x.pendentes], ['O', x.pct], ['P', x.leitura]].forEach(([c, v]) => confere(e, 'DASHBOARD EXECUTIVO', c + r, v));
  });
  pn.criticos.forEach((x, i) => {
    const r = 91 + i;
    [['B', x.prioridade], ['C', x.servico], ['E', x.empreiteira], ['G', x.local], ['I', x.limite], ['J', x.situacao], ['L', x.diasAtraso], ['M', x.diasVencer], ['N', x.obs]].forEach(([c, v]) => confere(e, 'DASHBOARD EXECUTIVO', c + r, v));
  });
  assert.strictEqual(pn.criticos.length, carregarFixture().abas['DASHBOARD EXECUTIVO'].v.B111 ? pn.criticos.length : 0);
  assert.deepStrictEqual(e, []);
});
test('séries dos gráficos (APOIO_DASH)', () => {
  const e = [], g = pn.graficos;
  g.status.forEach((s, i) => confere(e, 'APOIO_DASH', 'C' + (5 + i), s.qtde));
  g.servicos.forEach((s, i) => { const r = 5 + i; confere(e, 'APOIO_DASH', 'J' + r, s.total); confere(e, 'APOIO_DASH', 'K' + r, s.concluidos); confere(e, 'APOIO_DASH', 'L' + r, s.pctRealizado); confere(e, 'APOIO_DASH', 'M' + r, s.pctPrevisto); confere(e, 'APOIO_DASH', 'N' + r, s.cancelados); });
  g.empreiteiras.forEach((s, i) => { const r = 15 + i; if (valor('APOIO_DASH', 'B' + r) === null) return; /* a v6 só tem 8 linhas */ ['B', 'C', 'D', 'E', 'F', 'G'].forEach((c, j) => confere(e, 'APOIO_DASH', c + r, [s.empreiteira, s.total, s.concluidos, s.pct, s.atrasados, s.vencendo][j])); });
  g.locais.forEach((s, i) => { const r = 21 + i; confere(e, 'APOIO_DASH', 'J' + r, s.total); confere(e, 'APOIO_DASH', 'K' + r, s.concluidos); confere(e, 'APOIO_DASH', 'L' + r, s.pct); });
  g.pavimentos.forEach((s, i) => { const r = 31 + i; confere(e, 'APOIO_DASH', 'C' + r, s.total); confere(e, 'APOIO_DASH', 'D' + r, s.concluidos); confere(e, 'APOIO_DASH', 'E' + r, s.pct); });
  assert.deepStrictEqual(e, []);
});
test('histórico e curva prevista', () => {
  const e = [], h = res.historico;
  confere(e, 'HISTÓRICO', 'C5', h.pctHoje); confere(e, 'HISTÓRICO', 'D5', h.concluidosHoje); confere(e, 'HISTÓRICO', 'E5', h.itensValidos);
  h.semanas.forEach((s, i) => { confere(e, 'HISTÓRICO', 'C' + (9 + i), s.data); confere(e, 'HISTÓRICO', 'D' + (9 + i), s.previsto); });
  assert.deepStrictEqual(e, []);
});
test('painel macro', () => {
  const e = [], m = res.macro;
  [['B6', m.geral.meta], ['C6', m.geral.termino], ['D6', m.geral.folga], ['E6', m.geral.aptosEscopo], ['F6', m.geral.entregues], ['G6', m.geral.pct], ['H6', m.geral.pendAbertas], ['I6', m.geral.pendAtrasadas]].forEach(([r, v]) => confere(e, 'PAINEL MACRO', r, v));
  m.prumadas.forEach((p, i) => { const r = 10 + i; [['C', p.situacao], ['D', p.meta], ['E', p.termino === null ? 'concluída' : p.termino], ['F', p.folga], ['G', p.aptosEscopo], ['H', p.entregues], ['I', p.pct], ['J', p.pendAbertas], ['K', p.gerador]].forEach(([c, v]) => confere(e, 'PAINEL MACRO', c + r, v)); });
  m.matriz.forEach((x, i) => {
    const r = 20 + i; confere(e, 'PAINEL MACRO', 'C' + r, x.empreiteira);
    [[1, 'D', 'E', 'F'], [2, 'G', 'H', 'I'], [3, 'J', 'K', 'L'], [4, 'M', 'N', 'O']].forEach(([f, a, b, c]) => { confere(e, 'PAINEL MACRO', a + r, x.prumadas[f].pct); confere(e, 'PAINEL MACRO', b + r, x.prumadas[f].termino); confere(e, 'PAINEL MACRO', c + r, x.prumadas[f].folga); });
    confere(e, 'PAINEL MACRO', 'P' + r, x.obra.pct); confere(e, 'PAINEL MACRO', 'Q' + r, x.obra.termino); confere(e, 'PAINEL MACRO', 'R' + r, x.obra.folga);
  });
  assert.deepStrictEqual(e, []);
});
test('quadros F1–F4 (modo gravado em C3)', () => {
  const e = [];
  const L = n => PA.importar.colLetra(n);
  for (let f = 1; f <= 4; f++) {
    const q = PA.motor.quadro(estado, res, f, valor('F' + f, 'C3') === 'Necessário' ? 'necessario' : 'atual');
    q.colunas.forEach((c, j) => {
      if (c.manual) return;
      const col = L(2 + j);
      confere(e, 'F' + f, col + 4, c.limite); confere(e, 'F' + f, col + 5, c.termino); confere(e, 'F' + f, col + 6, c.pct);
    });
    q.linhas.forEach((l, i) => {
      const r = 8 + i;
      confere(e, 'F' + f, 'A' + r, l.vendido); confere(e, 'F' + f, 'B' + r, l.apto);
      l.celulas.forEach((c, j) => confere(e, 'F' + f, L(2 + j) + r, c.valor));
      confere(e, 'F' + f, L(2 + q.colunas.length) + r, l.pendAbertas);
    });
  }
  assert.deepStrictEqual(e.slice(0, 20), []);
});
test('estratégia, ranking e pendências', () => {
  const e = [], s = res.estrategia;
  s.servicos.forEach((x, i) => { const r = 5 + i; [['K', x.aplicado], ['L', x.aptosEscopo], ['M', x.pendentes], ['N', x.termino], ['O', x.piorFolga]].forEach(([c, v]) => confere(e, 'ESTRATÉGIA', c + r, v)); });
  confere(e, 'ESTRATÉGIA', 'I27', s.vendidos); confere(e, 'ESTRATÉGIA', 'I28', s.naoVendidos);
  res.ranking.tabela.forEach((t, i) => {
    const r = 27 + i;
    [['C', t.empreiteira], ['D', t.servicos], ['E', t.total], ['F', t.concluidos], ['G', t.andamento], ['H', t.naoIniciados], ['I', t.bloqueados], ['J', t.cancelados], ['K', t.vencidos], ['L', t.foraPrazo], ['M', t.folga], ['N', t.c1], ['O', t.c2], ['P', t.c3], ['Q', t.pontuacao], ['R', t.posicao]].forEach(([c, v]) => confere(e, 'RANKING EMPREITEIRAS', c + r, v));
  });
  res.ranking.ordenado.forEach((t, i) => { confere(e, 'RANKING EMPREITEIRAS', 'C' + (13 + i), t.empreiteira); confere(e, 'RANKING EMPREITEIRAS', 'N' + (13 + i), t.pontuacao); });
  const p = res.pendencias;
  confere(e, 'PENDÊNCIAS', 'C3', p.abertas); confere(e, 'PENDÊNCIAS', 'E3', p.resolvidas); confere(e, 'PENDÊNCIAS', 'G3', p.atrasadas);
  p.lista.forEach((x, i) => { confere(e, 'PENDÊNCIAS', 'A' + (6 + i), x.n); confere(e, 'PENDÊNCIAS', 'K' + (6 + i), x.final); confere(e, 'PENDÊNCIAS', 'L' + (6 + i), x.atrasada); });
  assert.deepStrictEqual(e, []);
});
test('filtro por empreiteira (Camargo)', () => {
  const p = PA.motor.painel(estado, res, { empreiteira: 'Camargo' });
  const base = res.itens.filter(i => i.empreiteira.toLowerCase() === 'camargo');
  assert.strictEqual(p.kpis.total, base.length);
  assert.strictEqual(p.kpis.concluidos, base.filter(i => i.status === 'Concluído').length);
  assert.ok(p.kpis.total === 94);
});
