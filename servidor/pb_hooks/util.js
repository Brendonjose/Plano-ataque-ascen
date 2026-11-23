// Funções compartilhadas pelos ganchos (carregadas com require dentro de cada handler).
module.exports = {
  COLECOES: ['lancamentos', 'equipes', 'pendencias', 'manuais', 'semanas', 'parametros'],
  exportar(rec) {
    if (!rec) return null;
    const o = {};
    const dados = JSON.parse(JSON.stringify(rec.publicExport()));
    for (const k of Object.keys(dados)) if (['collectionId', 'collectionName'].indexOf(k) < 0) o[k] = dados[k];
    return o;
  },
  registrar(app, tabela, registro, acao, antes, depois, por) {
    const col = app.findCollectionByNameOrId('alteracoes');
    const r = new Record(col);
    r.set('tabela', tabela); r.set('registro', registro); r.set('acao', acao);
    r.set('antes', antes); r.set('depois', depois); r.set('por', por || '');
    app.save(r);
  }
};
