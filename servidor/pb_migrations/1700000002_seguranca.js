/// <reference path="../pb_data/types.d.ts" />
// Endurecimento do servidor: limite de tentativas, batch desligado, sem upload de arquivos em usuários.
migrate((app) => {
  const s = app.settings();
  s.rateLimits.enabled = true;
  s.rateLimits.rules = [
    { label: '*:auth', audience: '', duration: 60, maxRequests: 10 },          // tentativas de login por IP
    { label: '/api/', audience: '@guest', duration: 10, maxRequests: 60 },     // visitantes sem login
    { label: '/api/', audience: '@auth', duration: 10, maxRequests: 600 }      // uso normal (inclui tempo real)
  ];
  s.batch.enabled = false;
  app.save(s);

  const users = app.findCollectionByNameOrId('users');
  const avatar = users.fields.getByName('avatar');
  if (avatar) users.fields.removeById(avatar.id);
  // Ninguém altera o próprio e-mail, visibilidade do e-mail, papel, empresa ou situação (só o admin).
  const ATIVO = '@request.auth.id != "" && @request.auth.collectionName = "users" && @request.auth.ativo = true';
  users.updateRule = ATIVO + ' && @request.auth.papel = "admin" || (' + ATIVO + ' && @request.auth.id = id && @request.body.papel:isset = false && @request.body.ativo:isset = false && @request.body.empreiteira:isset = false && @request.body.email:isset = false && @request.body.verified:isset = false && @request.body.emailVisibility:isset = false)';
  app.save(users);
}, (app) => {
  const s = app.settings(); s.rateLimits.enabled = false; app.save(s);
});
