# Plano de Ataque v3: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:**
- Tela Torre (por serviço, por apto e entrega).
- Vistorias do cliente com reprovas, gerando pendências.
- Painel de Entregas.
- Ranking de Reprovas.
- "O que define o prazo".
- Prévia em link privado.

**Architecture:**
- **Motor sem mudança.** As funções novas são puras: `PA.motor.torre`, `PA.motor.limitacao`, `PA.motor.entregas` e `PA.motor.reprovas`.
- **Vistorias:**
  - viram `estado.vistorias[]`, com a nova operação `vistoria` em `diff`/`aplicarOps` e a coleção `vistorias` no PocketBase (migração 4, com regras e ganchos de autoria);
  - as ações de vistoria gravam também o lançamento derivado da Entrega e as pendências automáticas.

**Tech Stack:** o mesmo da v2.

**Spec:** `docs/superpowers/specs/2026-11-24-v3-torre-entregas-reprovas-design.md`

## Global Constraints
- **Motor intacto:** testes de fidelidade (npm test, `tests/cenarios.test.js`) sem regressão.
- **Permissões no servidor:**
  - `vistorias`: escrita só por admin e obra;
  - `categoriasReprova`: só admin (é um parâmetro).
- **Modo local** continua funcionando; **produção** só muda depois da aprovação da prévia.
- Datas em DD/MM/AAAA; textos em pt-BR.

## Review Focus
1. Reprova salva sem internet: a fila envia a vistoria, a vistoria seguinte e as pendências uma única vez (T2).
2. Duas pessoas registram resultado no mesmo apto: o histórico tem as duas vistorias (T2).
3. Apto sem vistoria registrada mantém o lançamento manual da Entrega, compatível com a v2 (T2).
4. Categoria apagada que ainda tem reprovas: o ranking continua mostrando a categoria pelo nome gravado na reprova (T3).
5. Empreiteira e diretoria tentam gravar vistoria pela API: recebem 403 e nada é gravado (T2).

---

### Task 1: Motor — torre e "o que define o prazo"
**Files:** `app/js/motor/torre.js`; testes em `tests/torre.test.js`.

**Interfaces:**
- `PA.motor.torre(res, {modo:'servico'|'apto'|'entrega', servico, prumada}, estado)` → `{celulas: {[apto]: {classe, rotulo, sub, item?}}, porPav: [{pav, pct}], porPrumada: [{final, pct}], legenda: [...]}`
- `PA.motor.limitacao(res)` → `{porServico: {[ordem]: {tipo: 'equipe'|'anterior'|'concluido', anterior?: nome}}, gargalo: {servico, folga}}`

- [ ] **Testes (falham):**
  - modo serviço: as classes batem com o status dos itens;
  - modo apto: `sub` = `concluídos/total no escopo`, mais o próximo serviço não concluído;
  - `limitacao` com os dados da v6 em 24/11: Louças = 'equipe', Rejunte = 'anterior' (Piso);
  - gargalo da obra = o serviço cujo reforço antecipa a data: quando o tipo é 'equipe' e o término é igual ao término da obra.
- [ ] Implementar → PASS → commit.

### Task 2: Vistorias (dados, servidor, ações)
**Files:**
- `app/js/modelo.js` (`vistorias: []`, `categoriasReprova` padrão);
- `app/js/dados/{diff,servidor}.js` (operação `vistoria`);
- `app/js/acoes.js` (`PA.acoes.vistoria.{agendar, aprovar, reprovar}`);
- `servidor/pb_migrations/1700000004_vistorias.js`;
- `servidor/pb_hooks/autoria.pb.js` (inclui `vistorias`).

**Testes:** `tests/vistorias.test.js`, acréscimos em `tests/servidor/regras.test.js` e `adaptador.test.js`.

**Interfaces:**
- **Vistoria:** `{uid, apto, numero, agendada, realizada, resultado, motivos: [{categoria, descricao}], acompanhadoPor, obs}`
- **`reprovar(estado, apto, {realizada, motivos, acompanhadoPor, novaData, obs})`:**
  - atualiza a vistoria aberta do apto, ou cria uma, com `resultado = reprovado`;
  - cria a próxima vistoria (`agendada`);
  - cria uma pendência por motivo (responsável = empreiteira da categoria, prazo = `novaData`);
  - marca `lancamentos.entrega[apto] = 'and'`.
- **`aprovar`:** marca o resultado `aprovado` e `lancamentos.entrega[apto] = '1'`.

- [ ] **Testes (falham):**
  - reprovar → 2 vistorias, N pendências, Entrega "Em andamento"; aprovar depois → Entrega Concluído e `numero = 2`;
  - `diff`/`aplicarOps` ida e volta;
  - regras: diretoria e empreiteira recebem 403 em `vistorias`;
  - o adaptador grava e carrega as vistorias.
- [ ] Implementar → PASS → commit.

> **Checkpoint de verificação 1:** revisor independente das Tasks 1–2, em paralelo com as Tasks 3–4.

### Task 3: Motor — Painel de Entregas e Reprovas
**Files:** `app/js/motor/entregas.js`; testes em `tests/entregas.test.js`.

**Interfaces:**
- `PA.motor.entregas(estado, res, {prumada})` → `{noEscopo, entregues, dePrimeira, aposReprova, semRegistro, reprovadosAguardando, agendadas, proximas: [...], atrasadas: [...], mediaVistorias, porPrumada: {...}}`
- `PA.motor.reprovas(estado, res, {prumada, categoria, de, ate})` → `{porCategoria: [{categoria, ocorrencias, aptos}], porEmpreiteira: [...], lista: [...]}`

- [ ] **Testes (falham):** um estado com 3 vistorias de exemplo dá os números esperados; uma categoria apagada continua aparecendo no ranking.
- [ ] Implementar → PASS → commit.

### Task 4: Telas
**Files:** `app/js/ui/torre.js`, `entregas.js`, `reprovas.js`; ficha de vistoria em `lancar.js`; categorias em `config.js`; "o que define o prazo", gargalo e aviso em `cronograma.js`; menu e tela inicial da diretoria = Torre em `app.js`.

**Teste:** `tests/e2e/v3.test.js`:
- Torre nos 3 modos;
- ficha: reprovar com 2 motivos → pendências aparecem; aprovar;
- telas Entregas e Reprovas;
- coluna "O que define o prazo";
- mudar a equipe de Rejunte mostra o aviso "aguarda o serviço anterior".

- [ ] FAIL → implementar → PASS (capturas revisadas) → commit.

### Task 5: Prévia em link privado
**Files:** `app/js/previa.js` (carrega o estado embutido quando existe `window.PA_PREVIA`) e o script `tools/gerar-previa.js` (gera `dados-previa.js` a partir da v6).

- [ ] O teste e2e abre a prévia em `file://` com `PA_CONFIG.modo = 'local'` e mostra a Torre sem precisar importar.
- [ ] Publicar no claude.ai (Artifact) e passar o link ao Brendon.

> **Checkpoint de verificação 2 (final):** revisor da branch inteira; correções com teste.
