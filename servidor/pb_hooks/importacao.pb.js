/// <reference path="../pb_data/types.d.ts" />
// Carga inicial da planilha v6: uma única vez, só admin, tudo numa transação.
routerAdd('POST', '/api/pa/importar', (e) => {
  const u = require(`${__hooks}/util.js`);
  const auth = e.auth;
  if (!auth || auth.collection().name !== 'users' || !auth.getBool('ativo') || auth.getString('papel') !== 'admin') {
    throw new ForbiddenError('Só o administrador pode importar.');
  }
  const corpo = e.requestInfo().body || {};
  let erro = null;
  e.app.runInTransaction((tx) => {
    const n = tx.countRecords('lancamentos') + tx.countRecords('parametros');
    if (n > 0) { erro = 'ja'; return; }
    const tabelas = { lancamentos: 'lancamentos', equipes: 'equipes', pendencias: 'pendencias', manuais: 'manuais', semanas: 'semanas', parametros: 'parametros' };
    let total = 0;
    for (const chave of Object.keys(tabelas)) {
      const col = tx.findCollectionByNameOrId(tabelas[chave]);
      for (const dados of (corpo[chave] || [])) {
        const r = new Record(col);
        for (const k of Object.keys(dados)) if (k !== 'atualizado_por') r.set(k, dados[k]);
        r.set('atualizado_por', auth.id);
        tx.save(r);
        total++;
      }
    }
    u.registrar(tx, 'importacao', '', 'importar', null, { registros: total, origem: corpo.origem || '' }, auth.id);
  });
  if (erro === 'ja') return e.json(409, { message: 'O banco já tem dados. A importação da planilha só é feita uma vez.' });
  return e.json(200, { ok: true });
}, $apis.requireAuth('users'));
