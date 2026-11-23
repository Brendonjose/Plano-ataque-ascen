/// <reference path="../pb_data/types.d.ts" />
// Plano de Ataque — coleções, campos e regras de acesso (aplicadas no servidor).
const ATIVO = '@request.auth.id != "" && @request.auth.collectionName = "users" && @request.auth.ativo = true';
const EDITA = ATIVO + ' && (@request.auth.papel = "admin" || @request.auth.papel = "obra")';
const ADMIN = ATIVO + ' && @request.auth.papel = "admin"';

function base(nome, campos, indices, escrita) {
  return new Collection({
    type: 'base', name: nome,
    listRule: ATIVO, viewRule: ATIVO, createRule: escrita, updateRule: escrita, deleteRule: escrita,
    fields: campos.concat([
      { type: 'text', name: 'atualizado_por', max: 32 },
      { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ]),
    indexes: indices
  });
}

migrate((app) => {
  // Usuários: perfis e regras. Cadastro aberto desligado (só admin cria).
  const users = app.findCollectionByNameOrId('users');
  users.fields.add(new TextField({ name: 'nome', max: 120 }));
  users.fields.add(new SelectField({ name: 'papel', required: true, maxSelect: 1, values: ['admin', 'obra', 'diretoria', 'empreiteira'] }));
  users.fields.add(new TextField({ name: 'empreiteira', max: 120 }));
  users.fields.add(new BoolField({ name: 'ativo' }));
  users.authRule = 'ativo = true'; // usuário desativado não entra nem renova a sessão
  users.listRule = ATIVO;
  users.viewRule = ATIVO;
  users.createRule = ADMIN;
  users.deleteRule = ADMIN;
  users.manageRule = ADMIN;
  // Cada um só troca a própria senha/nome; papel, empresa e ativo só o admin.
  users.updateRule = ADMIN + ' || (' + ATIVO + ' && @request.auth.id = id && @request.body.papel:isset = false && @request.body.ativo:isset = false && @request.body.empreiteira:isset = false && @request.body.email:isset = false && @request.body.verified:isset = false)';
  app.save(users);

  app.save(base('lancamentos', [
    { type: 'text', name: 'servico', required: true, max: 40 },
    { type: 'number', name: 'apto', required: true, onlyInt: true },
    { type: 'text', name: 'codigo', max: 20 },
    { type: 'number', name: 'data_real', onlyInt: true },
    { type: 'text', name: 'obs', max: 2000 }
  ], ['CREATE UNIQUE INDEX idx_lanc_serv_apto ON lancamentos (servico, apto)'], EDITA));

  app.save(base('equipes', [
    { type: 'text', name: 'chave', required: true, max: 40 },
    { type: 'number', name: 'equipe', min: 0, max: 1000 }
  ], ['CREATE UNIQUE INDEX idx_equipes_chave ON equipes (chave)'], EDITA));

  app.save(base('pendencias', [
    { type: 'text', name: 'uid', required: true, max: 40 },
    { type: 'number', name: 'ordem' },
    { type: 'number', name: 'apto', onlyInt: true },
    { type: 'text', name: 'etapa', max: 80 },
    { type: 'text', name: 'descricao', max: 2000 },
    { type: 'text', name: 'responsavel', max: 120 },
    { type: 'number', name: 'abertura', onlyInt: true },
    { type: 'number', name: 'prazo', onlyInt: true },
    { type: 'text', name: 'status', max: 20 },
    { type: 'number', name: 'resolvida_em', onlyInt: true },
    { type: 'text', name: 'obs', max: 2000 }
  ], ['CREATE UNIQUE INDEX idx_pend_uid ON pendencias (uid)'], EDITA));

  app.save(base('manuais', [
    { type: 'number', name: 'apto', required: true, onlyInt: true },
    { type: 'text', name: 'etapa', required: true, max: 80 },
    { type: 'text', name: 'valor', max: 200 }
  ], ['CREATE UNIQUE INDEX idx_manuais ON manuais (apto, etapa)'], EDITA));

  // Semana guardada como objeto (distingue "não registrado" de zero).
  app.save(base('semanas', [
    { type: 'number', name: 'semana', required: true, onlyInt: true },
    { type: 'json', name: 'dados', maxSize: 5000 }
  ], ['CREATE UNIQUE INDEX idx_semanas ON semanas (semana)'], EDITA));

  app.save(base('parametros', [
    { type: 'text', name: 'chave', required: true, max: 40 },
    { type: 'json', name: 'valor', maxSize: 2000000 }
  ], ['CREATE UNIQUE INDEX idx_param_chave ON parametros (chave)'], ADMIN));

  // Histórico de alterações: só o servidor grava (regras nulas = só superusuário/ganchos).
  const alt = new Collection({
    type: 'base', name: 'alteracoes',
    listRule: EDITA, viewRule: EDITA, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: 'text', name: 'tabela', required: true, max: 40 },
      { type: 'text', name: 'registro', max: 40 },
      { type: 'text', name: 'acao', max: 10 },
      { type: 'json', name: 'antes', maxSize: 200000 },
      { type: 'json', name: 'depois', maxSize: 200000 },
      { type: 'text', name: 'por', max: 32 },
      { type: 'autodate', name: 'em', onCreate: true, onUpdate: false }
    ],
    indexes: ['CREATE INDEX idx_alt_em ON alteracoes (em)']
  });
  app.save(alt);
}, (app) => {
  for (const n of ['alteracoes', 'parametros', 'semanas', 'manuais', 'pendencias', 'equipes', 'lancamentos']) {
    try { app.delete(app.findCollectionByNameOrId(n)); } catch (e) { /* já removida */ }
  }
});
