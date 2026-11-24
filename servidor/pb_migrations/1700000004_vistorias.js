/// <reference path="../pb_data/types.d.ts" />
// v3: vistorias do cliente na entrega (aprovado / reprovado / agendada).
migrate((app) => {
  const ATIVO = '@request.auth.id != "" && @request.auth.collectionName = "users" && @request.auth.ativo = true';
  const EDITA = ATIVO + ' && (@request.auth.papel = "admin" || @request.auth.papel = "obra")';
  app.save(new Collection({
    type: 'base', name: 'vistorias',
    listRule: ATIVO, viewRule: ATIVO, createRule: EDITA, updateRule: EDITA, deleteRule: EDITA,
    fields: [
      { type: 'text', name: 'uid', required: true, max: 40 },
      { type: 'number', name: 'apto', required: true, onlyInt: true },
      { type: 'number', name: 'numero', onlyInt: true },
      { type: 'number', name: 'agendada', onlyInt: true },
      { type: 'number', name: 'realizada', onlyInt: true },
      { type: 'select', name: 'resultado', maxSelect: 1, values: ['agendada', 'aprovado', 'reprovado'] },
      { type: 'json', name: 'motivos', maxSize: 20000 },
      { type: 'text', name: 'acompanhado_por', max: 120 },
      { type: 'text', name: 'obs', max: 2000 },
      { type: 'text', name: 'atualizado_por', max: 32 },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_vist_uid ON vistorias (uid)', 'CREATE INDEX idx_vist_apto ON vistorias (apto)']
  }));
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('vistorias')); } catch (e) { /* já removida */ }
});
