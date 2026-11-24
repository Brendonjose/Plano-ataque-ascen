'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE, deISO } = require('./helpers');
const PA = carregarApp();
let e;
test.before(() => { e = PA.importar.deWorkbook(lerWorkbookV6()); });
const ent = (est, apto) => PA.motor.calcular(est, HOJE_FIXTURE).itens.find(i => i.ordem === 12 && i.apto === apto);

test('categorias padrão com empreiteira do serviço', () => {
  const cats = PA.modelo.categoriasPadrao(e);
  const nomes = cats.map(c => c.nome);
  assert.deepStrictEqual(nomes, ['Piso', 'Rejunte', 'Pintura', 'Portas', 'Louças e metais', 'Limpeza', 'Caixilhos', 'Bancadas', 'Rodapé', 'Espelhos', 'Elétrica', 'Hidráulica', 'Outros']);
  assert.strictEqual(cats.find(c => c.nome === 'Louças e metais').empreiteira, 'Camargo');
  assert.strictEqual(cats.find(c => c.nome === 'Elétrica').empreiteira, '');
});
test('reprovar cria próxima vistoria, pendências e deixa a Entrega em andamento; aprovar conclui', () => {
  let s = PA.acoes.vistoria.agendar(e, 164, deISO('2026-11-25'));
  s = PA.acoes.vistoria.reprovar(s, 164, { realizada: deISO('2026-11-25'), acompanhadoPor: 'u1', motivos: [{ categoria: 'Pintura', descricao: 'mancha no teto' }, { categoria: 'Louças e metais', descricao: 'torneira pingando' }], novaData: deISO('2026-12-02') });
  const vs = s.vistorias.filter(v => v.apto === 164).sort((a, b) => a.numero - b.numero);
  assert.deepStrictEqual(vs.map(v => [v.numero, v.resultado]), [[1, 'reprovado'], [2, 'agendada']]);
  assert.strictEqual(vs[1].agendada, deISO('2026-12-02'));
  const pend = s.pendencias.filter(p => p.apto === 164 && /vistoria nº 1/i.test(p.descricao));
  assert.strictEqual(pend.length, 2);
  assert.ok(pend.some(p => p.responsavel === 'Camargo' && p.etapa === 'Louças e metais' && p.prazo === deISO('2026-12-02')));
  assert.strictEqual(ent(s, 164).status, 'Em andamento');
  s = PA.acoes.vistoria.aprovar(s, 164, { realizada: deISO('2026-12-02'), acompanhadoPor: 'u1' });
  const v2 = s.vistorias.filter(v => v.apto === 164).find(v => v.numero === 2);
  assert.strictEqual(v2.resultado, 'aprovado');
  assert.strictEqual(ent(s, 164).status, 'Concluído');
  // Desfazer volta tudo (vistoria, pendências e lançamento).
  const d = PA.acoes.desfazer(s);
  assert.strictEqual(ent(d, 164).status, 'Em andamento');
});
test('aprovar sem vistoria agendada cria a 1ª já aprovada; apto sem vistoria mantém lançamento manual', () => {
  const s = PA.acoes.vistoria.aprovar(e, 174, { realizada: deISO('2026-11-26'), acompanhadoPor: 'Fulano' });
  assert.deepStrictEqual(s.vistorias.filter(v => v.apto === 174).map(v => [v.numero, v.resultado]), [[1, 'aprovado']]);
  assert.strictEqual(ent(s, 174).status, 'Concluído');
  assert.strictEqual(ent(e, 184).status, ent(s, 184).status);
});
test('diff e aplicarOps levam as vistorias e as categorias', () => {
  let s = PA.acoes.vistoria.reprovar(e, 164, { realizada: deISO('2026-11-25'), motivos: [{ categoria: 'Piso', descricao: 'x' }], novaData: deISO('2026-12-02') });
  s = PA.acoes.alterar(s, 'cat', x => { x.categoriasReprova = [{ nome: 'Piso', empreiteira: 'DS ALENCAR' }]; });
  const ops = PA.dados.diff(e, s);
  assert.ok(ops.some(o => o.tipo === 'vistoria') && ops.some(o => o.tipo === 'param' && o.chave === 'categoriasReprova'));
  const r = PA.dados.aplicarOps(e, ops);
  assert.deepStrictEqual(r.vistorias, s.vistorias);
  assert.deepStrictEqual(r.categoriasReprova, s.categoriasReprova);
});
