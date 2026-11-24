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
// ---- Checkpoint 1 da v3 ----
test('I1: situação da Entrega vem das vistorias (nunca contradiz o histórico)', () => {
  let s = PA.acoes.vistoria.reprovar(e, 164, { realizada: deISO('2026-11-25'), motivos: [{ categoria: 'Piso', descricao: 'x' }], novaData: deISO('2026-12-02') });
  // Simula a gravação concorrente: o lançamento manual diz "1", mas o histórico diz reprovado/agendada.
  s = JSON.parse(JSON.stringify(s)); s.lancamentos.entrega[164] = { codigo: '1' };
  assert.strictEqual(ent(s, 164).status, 'Em andamento');
  s = PA.acoes.vistoria.aprovar(s, 164, { realizada: deISO('2026-12-02') });
  assert.strictEqual(ent(s, 164).status, 'Concluído');
});
test('I2: textos e quantidade de motivos são limitados para caber no servidor', () => {
  const longo = 'x'.repeat(3000);
  const s = PA.acoes.vistoria.reprovar(e, 154, { realizada: deISO('2026-11-25'), novaData: deISO('2026-12-02'), obs: longo,
    motivos: Array.from({ length: 30 }, (_, i) => ({ categoria: 'Pintura', descricao: longo + i })) });
  const v = s.vistorias.find(x => x.apto === 154 && x.resultado === 'reprovado');
  assert.ok(v.motivos.length <= 10 && v.motivos.every(m => m.descricao.length <= 500) && v.obs.length <= 500);
  assert.ok(JSON.stringify(v.motivos).length < 20000);
  assert.ok(s.pendencias.filter(p => p.apto === 154).every(p => p.descricao.length <= 600));
});
test('I3: corrigir a ficha não cria vistoria nova nem duplica pendências', () => {
  let s = PA.acoes.vistoria.aprovar(e, 144, { realizada: deISO('2026-11-25'), obs: 'a' });
  s = PA.acoes.vistoria.aprovar(s, 144, { realizada: deISO('2026-11-25'), obs: 'corrigido' });
  assert.deepStrictEqual(s.vistorias.filter(v => v.apto === 144).map(v => [v.numero, v.resultado, v.obs]), [[1, 'aprovado', 'corrigido']]);
  let r = PA.acoes.vistoria.reprovar(e, 134, { realizada: deISO('2026-11-25'), motivos: [{ categoria: 'Piso', descricao: 'a' }, { categoria: 'Pintura', descricao: 'b' }] });
  r = PA.acoes.vistoria.reprovar(r, 134, { realizada: deISO('2026-11-25'), motivos: [{ categoria: 'Piso', descricao: 'a' }, { categoria: 'Pintura', descricao: 'b' }, { categoria: 'Portas', descricao: 'c' }] });
  assert.deepStrictEqual(r.vistorias.filter(v => v.apto === 134).map(v => v.resultado), ['reprovado']);
  assert.strictEqual(r.pendencias.filter(p => p.apto === 134 && /vistoria nº 1/.test(p.descricao)).length, 3);
  const ag = PA.acoes.vistoria.agendar(s, 144, deISO('2026-12-10'));
  assert.strictEqual(ag, s, 'apto já aprovado: agendar não faz nada');
});
test('M3: importar estado com vistorias não quebra', () => {
  const s = PA.acoes.vistoria.aprovar(e, 174, { realizada: deISO('2026-11-25') });
  const ops = PA.dados.diff(PA.modelo.estadoVazio(), s);
  for (const op of ops) assert.ok(PA.dados.servidor.opParaRegistro(op));
});
// ---- Checkpoint 2 da v3 ----
test('C2-I2: vistoria só agendada não muda a Entrega (apto bloqueado ou já entregue)', () => {
  const res = PA.motor.calcular(e, HOJE_FIXTURE);
  const blq = res.itens.find(i => i.ordem === 12 && i.status === 'Bloqueado').apto;
  const s = PA.acoes.vistoria.agendar(e, blq, deISO('2026-12-10'));
  assert.strictEqual(ent(s, blq).status, 'Bloqueado');
  let d = PA.acoes.lancar(e, 'entrega', 174, { codigo: '1', dataReal: deISO('2026-10-01') });
  d = PA.acoes.vistoria.agendar(d, 174, deISO('2026-12-10'));
  assert.strictEqual(ent(d, 174).status, 'Concluído');
});
test('C2-M3/M4: importar por cima mantém vistorias e categorias; responsável da pendência cabe no servidor', () => {
  let s = PA.acoes.vistoria.aprovar(e, 174, { realizada: deISO('2026-11-25') });
  s = JSON.parse(JSON.stringify(s)); s.categoriasReprova = [{ nome: 'Piso', empreiteira: 'y'.repeat(300) }];
  const { estado } = PA.acoes.importarPorCima(s, e);
  assert.strictEqual(estado.vistorias.length, 1); assert.strictEqual(estado.categoriasReprova.length, 1);
  const r = PA.acoes.vistoria.reprovar(s, 164, { realizada: deISO('2026-11-25'), motivos: [{ categoria: 'Piso', descricao: 'a' }], novaData: deISO('2026-12-02') });
  assert.ok(r.pendencias.filter(p => p.apto === 164).every(p => p.responsavel.length <= 120));
});
