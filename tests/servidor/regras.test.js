'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { subir } = require('./util');
let S;
test.before(async () => { S = await subir(); });
test.after(async () => { if (S) await S.parar(); });

const lanc = { id: 'l04193000000000', servico: 'portas', apto: 193, codigo: '1' };
async function falha(promessa) { try { await promessa; return null; } catch (e) { return e.status; } }

test('empreiteira e diretoria não gravam nada, mesmo chamando a API direto', async () => {
  for (const papel of ['empreiteira', 'diretoria']) {
    const c = await S.cliente(papel);
    for (const [col, dados] of [['lancamentos', lanc], ['parametros', { chave: 'config', valor: {} }], ['pendencias', { uid: 'u1', apto: 11 }], ['equipes', { chave: 'loucas', equipe: 9 }]]) {
      const st = await falha(c.collection(col).create(dados));
      assert.ok([400, 403, 404].includes(st), `${papel} criar ${col}: ${st}`);
    }
  }
  assert.strictEqual((await S.su.collection('lancamentos').getFullList()).length, 0);
  // Registro existente: nem alterar nem apagar.
  const obra = await S.cliente('obra');
  await obra.collection('lancamentos').create(lanc);
  for (const papel of ['empreiteira', 'diretoria']) {
    const c = await S.cliente(papel);
    assert.ok([400, 403, 404].includes(await falha(c.collection('lancamentos').update(lanc.id, { codigo: 'canc' }))));
    assert.ok([400, 403, 404].includes(await falha(c.collection('lancamentos').delete(lanc.id))));
  }
  assert.strictEqual((await S.su.collection('lancamentos').getOne(lanc.id)).codigo, '1');
});
test('obra lança mas não altera parâmetros', async () => {
  const c = await S.cliente('obra');
  const r = await c.collection('lancamentos').update(lanc.id, { codigo: 'and' });
  assert.strictEqual(r.codigo, 'and');
  assert.ok([400, 403, 404].includes(await falha(c.collection('parametros').create({ chave: 'config', valor: {} }))));
  const eq = await c.collection('equipes').create({ chave: 'loucas', equipe: 2 });
  assert.strictEqual(eq.equipe, 2);
});
test('ninguém muda o próprio papel; admin muda o dos outros', async () => {
  const c = await S.cliente('obra');
  await falha(c.collection('users').update(S.usuarios.obra.id, { papel: 'admin' }));
  await falha(c.collection('users').update(S.usuarios.obra.id, { ativo: false }));
  const u = await S.su.collection('users').getOne(S.usuarios.obra.id);
  assert.deepStrictEqual([u.papel, u.ativo], ['obra', true]);
  const emp = await S.cliente('empreiteira');
  await falha(emp.collection('users').update(S.usuarios.empreiteira.id, { empreiteira: 'Outra' }));
  assert.strictEqual((await S.su.collection('users').getOne(S.usuarios.empreiteira.id)).empreiteira, 'Camargo');
  const adm = await S.cliente('admin');
  const d = await adm.collection('users').update(S.usuarios.diretoria.id, { nome: 'Diretor' });
  assert.strictEqual(d.nome, 'Diretor');
  assert.ok([400, 403, 404].includes(await falha(c.collection('users').create({ email: 'x@x.local', password: 'Senha-teste-123', passwordConfirm: 'Senha-teste-123', papel: 'admin', ativo: true }))));
});
test('usuário inativo não entra; desativado com sessão aberta não lê nem grava', async () => {
  await assert.rejects(S.cliente('inativo'));
  const c = await S.cliente('obra2');
  await S.su.collection('users').update(S.usuarios.obra2.id, { ativo: false });
  const lista = await c.collection('lancamentos').getList(1, 10).catch(e => ({ items: [], status: e.status }));
  assert.strictEqual(lista.items.length, 0);
  assert.ok([400, 403, 404].includes(await falha(c.collection('lancamentos').create({ id: 'l05011000000000', servico: 'loucas', apto: 11, codigo: '1' }))));
  await S.su.collection('users').update(S.usuarios.obra2.id, { ativo: true });
});
test('autoria vem do servidor e o histórico registra antes/depois', async () => {
  const c = await S.cliente('obra2');
  await c.collection('lancamentos').update(lanc.id, { codigo: '1', atualizado_por: S.usuarios.admin.id });
  const r = await S.su.collection('lancamentos').getOne(lanc.id);
  assert.strictEqual(r.atualizado_por, S.usuarios.obra2.id);
  const alts = await S.su.collection('alteracoes').getFullList({ filter: `registro = "${lanc.id}"`, sort: 'em' });
  const ult = alts[alts.length - 1];
  assert.deepStrictEqual([ult.acao, ult.antes.codigo, ult.depois.codigo, ult.por], ['alterar', 'and', '1', S.usuarios.obra2.id]);
  const emp = await S.cliente('empreiteira');
  const vis = await emp.collection('alteracoes').getList(1, 5).catch(() => ({ items: [] }));
  assert.strictEqual(vis.items.length, 0);
  const obraVe = await (await S.cliente('obra')).collection('alteracoes').getList(1, 5);
  assert.ok(obraVe.items.length > 0);
});
test('empreiteira e diretoria leem os dados', async () => {
  for (const papel of ['empreiteira', 'diretoria']) {
    const c = await S.cliente(papel);
    assert.ok((await c.collection('lancamentos').getFullList()).length >= 1);
  }
});
test('vistorias: obra grava; diretoria e empreiteira não; histórico registra', async () => {
  const dados = { id: 'vteste000000001', uid: 'vu1', apto: 164, numero: 1, agendada: 46351, resultado: 'agendada', motivos: [] };
  for (const papel of ['empreiteira', 'diretoria']) {
    const c = await S.cliente(papel);
    assert.ok([400, 403, 404].includes(await falha(c.collection('vistorias').create(dados))), papel);
  }
  const obra = await S.cliente('obra');
  const r = await obra.collection('vistorias').create(dados);
  assert.strictEqual(r.atualizado_por, S.usuarios.obra.id);
  const emp = await S.cliente('empreiteira');
  assert.strictEqual((await emp.collection('vistorias').getFullList()).length, 1, 'empreiteira lê');
  assert.ok([400, 403, 404].includes(await falha(emp.collection('vistorias').update(dados.id, { resultado: 'aprovado' }))));
  const alts = await S.su.collection('alteracoes').getFullList({ filter: 'tabela="vistorias"' });
  assert.strictEqual(alts.length, 1);
});
