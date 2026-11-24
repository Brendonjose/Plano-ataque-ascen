/// <reference path="../pb_data/types.d.ts" />
// Autoria e histórico: o autor vem SEMPRE do usuário logado, nunca do corpo da requisição.
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/util.js`);
  e.record.set('atualizado_por', e.auth ? e.auth.id : '');
  e.next();
  u.registrar(e.app, e.collection.name, e.record.id, 'criar', null, u.exportar(e.record), e.auth ? e.auth.id : '');
}, 'lancamentos', 'equipes', 'pendencias', 'manuais', 'semanas', 'parametros', 'vistorias');

onRecordUpdateRequest((e) => {
  const u = require(`${__hooks}/util.js`);
  const antes = u.exportar(e.record.original());
  e.record.set('atualizado_por', e.auth ? e.auth.id : '');
  e.next();
  u.registrar(e.app, e.collection.name, e.record.id, 'alterar', antes, u.exportar(e.record), e.auth ? e.auth.id : '');
}, 'lancamentos', 'equipes', 'pendencias', 'manuais', 'semanas', 'parametros', 'vistorias');

onRecordDeleteRequest((e) => {
  const u = require(`${__hooks}/util.js`);
  const antes = u.exportar(e.record);
  e.next();
  u.registrar(e.app, e.collection.name, e.record.id, 'apagar', antes, null, e.auth ? e.auth.id : '');
}, 'lancamentos', 'equipes', 'pendencias', 'manuais', 'semanas', 'parametros', 'vistorias');
