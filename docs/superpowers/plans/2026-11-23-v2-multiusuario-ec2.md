# Plano de Ataque v2 (multiusuário na EC2): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o sistema na EC2 com o PocketBase, com login e quatro perfis, gravação compartilhada por registro, tempo real e fila offline. Acrescentar as telas Acompanhamento, Relatórios, Usuários e Alterações e as Pendências no Painel.

**Architecture:**
- **Motor:** continua no navegador, sem mudança.
- **Gravação por diferença:** um adaptador `PA.dados.servidor` monta o `estado` da v1 a partir das coleções do PocketBase. Cada mudança vira operações granulares, calculadas pela **diferença entre o estado anterior e o novo** (`PA.dados.diff`). Assim, as ações da v1 continuam iguais.
- **Permissões e autoria:** a permissão vem das *API rules* do PocketBase. A autoria e o histórico vêm de ganchos no servidor (`pb_hooks`).
- **Telas novas:** usam funções puras do motor (`PA.motor.acompanhamento`, `PA.motor.relatorio`, `PA.motor.pendenciasPainel`).

**Tech Stack:**
- Servidor: PocketBase **v0.34.0** (versão fixada), com migrações e ganchos em JS do próprio PocketBase.
- Navegador: SDK `pocketbase@0.29.0` (UMD em `app/vendor/`).
- Mantidos da v1: Node 22 com `node --test`, Playwright e Chromium, e scripts clássicos.

**Spec:** `docs/superpowers/specs/2026-11-23-multiusuario-acompanhamento-relatorio-design.md`

## Global Constraints

- **Custo zero** além da EC2. Nenhum serviço pago (sem S3, sem e-mail, sem domínio).
- **Nome do site:** subdomínio **DuckDNS**. O HTTPS vem do Let's Encrypt, emitido pelo próprio PocketBase (`serve <dominio>`).
- **Sem build no front:** os scripts seguem o padrão `(function (root) {…})(globalThis)` da v1, e o modo `file://` continua funcionando com `PA.dados.local`.
- **Perfis:** `admin` | `obra` | `diretoria` | `empreiteira`. As permissões seguem a tabela da spec, §2, e são aplicadas no servidor. Esconder na tela é só conveniência.
- **Autoria:** `atualizado_por` e `atualizado_em` são preenchidos **só no servidor**, por gancho. O que o navegador envia nesses campos é ignorado.
- **Importação da v6:** uma vez só. O servidor recusa se `lancamentos` já tiver registros.
- **Motor:** os 51 testes de unidade, os 5 cenários e os e2e da v1 continuam passando sem mudança nos resultados.
- **Textos e datas:** pt-BR, datas DD/MM/AAAA.

## Review Focus

1. **Um usuário `empreiteira` ou `diretoria` chamando a API direto** (sem a tela) para criar, alterar ou apagar qualquer registro, ou para mudar o próprio papel. Esperado: HTTP 403 ou 404 e nada gravado. O teste fica na Task 1.
2. **Duas abas de usuários diferentes lançando ao mesmo tempo:**
   - em aptos diferentes, as duas gravações ficam;
   - no mesmo apto, vale a última e o histórico tem as duas.

   O teste fica na Task 3.
3. **Internet cai no meio de um lançamento.** Esperado:
   - o lançamento fica na fila, com a faixa visível;
   - depois de recarregar a página, a fila continua;
   - quando a conexão volta, é enviado uma vez só, sem duplicar.

   O teste fica na Task 3.
4. **Sessão expirada ou usuário desativado durante o uso.** Esperado: a gravação falha com aviso "Entre de novo", a operação não se perde (vai para a fila) e a tela de login aparece. O teste fica na Task 3.
5. **Importação disparada duas vezes**, por clique duplo ou por outra pessoa. Esperado: a segunda é recusada pelo servidor e os dados não ficam duplicados. O teste fica na Task 2.

---

### Task 1: Servidor PocketBase (coleções, regras, ganchos) e ambiente de teste

**Files:**
- Create:
  - `servidor/versao.env` (`PB_VERSAO=0.34.0` e o sha256 do zip linux_amd64)
  - `servidor/baixar-pocketbase.sh` (baixa e confere o checksum; serve para teste e produção)
  - `servidor/pb_migrations/1_colecoes.js`
  - `servidor/pb_hooks/autoria.pb.js`
  - `servidor/pb_hooks/importacao.pb.js`
- Test:
  - `tests/servidor/util.js` (sobe o PocketBase numa pasta temporária, porta livre, admin e usuários de cada papel)
  - `tests/servidor/regras.test.js`

**Interfaces:**
- **Coleções**, conforme a spec §5.1:
  - `users`: auth, com `nome`, `papel`, `empreiteira`, `ativo` e cadastro aberto desligado.
  - `lancamentos`: `servico`, `apto`, `codigo`, `data_real`, `obs`, `atualizado_por` e `atualizado_em`, com índice único (`servico`, `apto`).
  - `equipes`: `chave` (único) e `equipe`.
  - `pendencias`: os campos da v1, mais `uid` (único, gerado no navegador).
  - `manuais`: `apto` e `etapa` (único juntos), mais `valor`.
  - `semanas`: `semana` (único), `data`, `realizado`, `concluidos` e `obs`.
  - `parametros`: `chave` (único) e `valor` (json).
  - `alteracoes`: `tabela`, `registro`, `antes`, `depois`, `por` e `em`.
- **Regras** (o filtro `ATIVO` = `@request.auth.id != "" && @request.auth.ativo = true`):
  - `list` e `view` de todas as coleções: `ATIVO`. Em `alteracoes`: `ATIVO && papel ∈ {admin, obra}`.
  - `create`, `update` e `delete`:
    - `lancamentos`, `pendencias`, `manuais`, `semanas`, `equipes`: `ATIVO && papel ∈ {admin, obra}`;
    - `parametros`: só `admin`;
    - `alteracoes`: ninguém (só o gancho grava);
    - `users`: só `admin`, exceto a troca da própria senha. Na alteração de `users`, `@request.body.papel:isset = false || @request.auth.papel = "admin"`.
- **Ganchos:**
  - `autoria.pb.js`: em create, update e delete das coleções de dados, define `atualizado_por = auth.id` e `atualizado_em = agora`, e grava em `alteracoes` com o antes e o depois em json.
  - `importacao.pb.js`: rota `POST /api/pa/importar`, só para admin. Recebe o `estado` inteiro e grava tudo numa transação. Responde **409** se `lancamentos` não estiver vazia.

- [ ] **Step 1: testes de regras (falham).** Em `tests/servidor/regras.test.js`, com um usuário de cada papel:
  - empreiteira e diretoria recebem 403 ou 404 em create, update e delete de `lancamentos`, `parametros` e `pendencias`. Depois de cada tentativa, a coleção continua sem mudança.
  - obra cria e altera um lançamento (200) e recebe 403 em `parametros`.
  - usuário `obra` tenta `PATCH users/<si mesmo> {papel:"admin"}`: recebe 400 ou 403 e o papel continua `obra`.
  - usuário com `ativo=false` recebe lista vazia ou 403 em qualquer coleção.
  - depois de um update feito pela obra com `atualizado_por` forjado no corpo, o registro guarda o id da obra, e `alteracoes` tem um registro com `antes`, `depois` e `por` corretos.
  - empreiteira não lê `alteracoes`.
- [ ] **Step 2:** rodar `node --test tests/servidor/regras.test.js`. Esperado: falha (o servidor não tem coleções).
- [ ] **Step 3:** implementar a migração, os ganchos e os scripts. O `util.js` usa `servidor/baixar-pocketbase.sh` com cache em `node_modules/.cache/pocketbase`.
- [ ] **Step 4:** rodar os testes. Esperado: PASS.
- [ ] **Step 5:** commit `feat(servidor): coleções, regras de acesso e histórico de alterações`.

### Task 2: Adaptador de dados (`PA.dados`) e diferença de estados

**Files:**
- Create:
  - `app/js/dados/diff.js`
  - `app/js/dados/local.js` (o `armazenamento.js` da v1 adaptado à nova interface)
  - `app/js/dados/servidor.js`
  - `app/vendor/pocketbase.umd.js`
- Test:
  - `tests/diff.test.js`
  - `tests/servidor/adaptador.test.js`

**Interfaces:**
- `PA.dados.diff(antes, depois) -> Op[]`, onde `Op` é um destes:
  - `{tipo:'lanc', servico, apto, valor}`, com `valor` null para apagar;
  - `{tipo:'equipe', chave, valor}`;
  - `{tipo:'pend', uid, valor}`;
  - `{tipo:'manual', apto, etapa, valor}`;
  - `{tipo:'semana', semana, valor}`;
  - `{tipo:'param', chave, valor}`.
- **Equipes:**
  - As chaves são `cronograma.servicos[id].equipe` (com `id` diferente de `piso`), mais `piso_ds` e `piso_jun`.
  - Mudanças de equipe geram `equipe`, não `param`.
  - Em `param`, `cronograma` e `piso` são enviados **sem** os campos de equipe.
- **Adaptador** (os dois implementam a mesma interface): `{ modo:'local'|'servidor', entrar(email, senha), sair(), usuario() -> {id, nome, papel, empreiteira}|null, carregar() -> Promise<estado>, gravar(ops) -> Promise<{ok, falhas:[{op, motivo:'rede'|'permissao'|'sessao'|'conflito'}]}>, importarTudo(estado) -> Promise, aoMudar(cb), versoes() -> {chaveRegistro: atualizado_em} }`
- **Ids determinísticos:**
  - lançamento: `'l' + String(ordem).padStart(2,'0') + String(apto).padStart(3,'0')`, completado com `'0'` à direita até 15 caracteres;
  - manuais: hash curto de (apto, etapa);
  - pendências: `uid` gerado no navegador.
- **`gravar` é idempotente:** usa upsert pelo id.

- [ ] **Step 1: testes (falham).**
  - **`diff`:**
    - lançar → 1 op `lanc`;
    - limpar → `valor` null;
    - trocar a equipe de Louças → 1 op `equipe` e nenhum `param`;
    - trocar a meta → 1 `param` (`cronograma`);
    - estados iguais → `[]`.
  - **Ida e volta:** `PA.dados.diff(vazio, estadoV6)` aplicado num estado vazio reconstrói os lançamentos, as pendências e as semanas.
  - **Adaptador contra o servidor de teste:**
    - `importarTudo(v6)` e depois `carregar()` dão o mesmo `estado` (`deepEqual` nos campos de dados) e o mesmo `PA.motor.calcular(...).cron.prumadas`;
    - uma segunda chamada de `importarTudo` rejeita com 409;
    - `gravar([op])` feito duas vezes resulta em 1 registro só.
- [ ] **Step 2:** rodar os testes. Esperado: falha.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** PASS. Os testes da v1 continuam PASS.
- [ ] **Step 5:** commit `feat(dados): adaptador local/servidor e diferença de estados`.

### Task 3: Integração no app (login, gravação, fila offline, tempo real, desfazer com conferência)

**Files:**
- Modify: `app/js/ui/app.js`, `app/index.html`, `app/css/estilo.css`
- Create: `app/js/dados/fila.js`, `app/js/ui/login.js`
- Test: `tests/e2e/servidor.test.js`, que usa o servidor de teste servindo `app/` como `pb_public`

**Interfaces:**
- `aplicar(novo)`:
  1. recalcula (como na v1);
  2. `ops = PA.dados.diff(atual, novo)`;
  3. troca o estado na tela;
  4. `PA.dados.fila.enviar(ops)`.
- **Falhas de envio:**
  - `permissao`: reverte o estado e mostra o aviso;
  - `sessao`: guarda na fila e mostra a tela de login;
  - `rede`: guarda na fila e mostra a faixa.
- `PA.dados.fila`: `{ enviar(ops), pendentes() -> n, tentarDeNovo() }`. Usa `localStorage` com a chave `pa.fila.<usuario>` e tenta de novo a cada 15 s e no evento `online`.
- **Desfazer:**
  - aplica o estado anterior da pilha;
  - antes de enviar, compara `versoes()` dos registros afetados com as versões guardadas no momento da ação;
  - se mudou, recusa e mostra o aviso "Outra pessoa alterou depois. Desfazer cancelado."
- **Tempo real:** `aoMudar` aplica a mudança de outro usuário ao `estado`, recalcula e redesenha **sem roubar o foco**.

- [ ] **Step 1: e2e (falha).**
  - login com obra → lança Portas 193 → uma segunda aba logada como diretoria vê 193 concluído em até 5 s;
  - a diretoria não vê o botão de lançar, e a chamada `PA.dados.atual.gravar(...)` feita no console falha com permissão;
  - **Review Focus 3:**
    1. `context.setOffline(true)`, lança 183;
    2. a faixa mostra "1 lançamento aguardando envio";
    3. recarrega com a página ainda offline;
    4. volta online;
    5. resultado: no servidor há 1 registro de 183, e a faixa some.
  - **Review Focus 2:** duas abas, obra A e obra B, lançam aptos diferentes ao mesmo tempo → as duas gravações ficam. Mesmo apto → `alteracoes` tem 2 entradas.
  - **Review Focus 4:** o admin desativa a obra B; a próxima gravação de B mostra "Entre de novo" e a op fica na fila.
  - **Desfazer com conferência:** A lança; B altera o mesmo apto; o Desfazer de A é recusado com aviso.
- [ ] **Step 2:** rodar e2e. Esperado: falha.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** PASS, e os e2e da v1 (modo local) também PASS.
- [ ] **Step 5:** commit `feat: login, gravação compartilhada, fila offline e tempo real`.

> **Checkpoint de verificação 1:** depois da Task 3, um revisor independente revisa as Tasks 1–3 (segurança e dados) em paralelo, enquanto as Tasks 4–7 seguem.

### Task 4: Perfis nas telas, Usuários, Minha conta e Alterações

**Files:**
- Create: `app/js/ui/usuarios.js`, `app/js/ui/alteracoes.js`, `app/js/ui/conta.js`
- Modify: `app/js/ui/app.js` (menu por papel; a tela inicial da empreiteira é o Acompanhamento), `lancar.js`, `macro.js` (sem a coluna "Vendido?" para empreiteira), `cronograma.js` (só leitura para quem não é admin; o campo Equipe fica editável para obra)
- Test: `tests/e2e/perfis.test.js`

**Interfaces:**
- `PA.ui.pode(acao)`, com `acao` ∈ `lancar | equipe | parametros | usuarios | alteracoes | ranking | estrategia | config | importar`. É lido do papel do usuário logado.
- `registrarTela(id, {…, perfis:[...]})`: a tela só aparece no menu dos papéis listados.

- [ ] **Step 1: e2e (falha).**
  - **Menu por perfil:**
    - empreiteira: Painel, Acompanhamento, Macro, Cronograma, Pendências, Histórico, Relatórios e Minha conta;
    - diretoria: as mesmas, mais Ranking e Estratégia (só leitura);
    - obra: tudo, menos Usuários e Configurações;
    - admin: tudo.
  - **Usuários:** o admin cria um usuário empreiteira "Camargo" pela tela; ele faz login e cai no Acompanhamento já filtrado por "Camargo".
  - **Cronograma:** a obra altera a equipe de Louças; o campo de meta aparece desabilitado.
  - **Alterações:** a tela mostra a alteração acima com o nome do autor.
  - **Minha conta:** um usuário troca a própria senha e entra com a nova.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS. **Step 5:** commit `feat: telas por perfil, usuários, conta e histórico de alterações`.

### Task 5: Tela Acompanhamento

**Files:**
- Create: `app/js/motor/acompanhamento.js`, `app/js/ui/acompanhamento.js`
- Test: `tests/acompanhamento.test.js`, `tests/e2e/acompanhamento.test.js`

**Interfaces:**
- `PA.motor.acompanhamento(res, filtros)`, com `filtros = {servico, prumada, empreiteira, pavimento}`, devolve:

  ```
  {
    numeros: {total, executado, execucao, liberado, bloqueado, fora, pct, atrasados},
    servico: {termino, folga, limite, equipe, necessaria} | null,
    porPrumada: [{final, executado, execucao, liberado, bloqueado, pct, limite, termino, folga}],
    matriz: [{servico, executado, execucao, liberado, bloqueado, fora}] | null,
    listas: {liberado: Item[], execucao: Item[], bloqueado: Item[], executado: Item[]}
  }
  ```

  - `matriz` só vem preenchida quando `filtros.servico` é vazio.
  - `pct = executado ÷ (total − fora)`.
  - A lista `liberado` vem ordenada por `dataNecessaria` e, no empate, por `apto`.

- [ ] **Step 1: testes (falham).**
  - Com a v6 em 17/11/2026, filtro `servico='Portas de madeira'`: `executado` = número de itens Concluído de Portas na BASE da fixture, e `liberado + bloqueado + execucao + executado + fora = 94`.
  - Sem filtro de serviço, a `matriz` tem 12 linhas e a soma de cada linha é 94.
  - Com o filtro `empreiteira='Camargo'`, todos os itens das listas têm `empreiteira` Camargo, sem diferenciar maiúsculas.
  - e2e: clicar na célula Louças × Liberado da matriz aplica o filtro e mostra a lista.
- [ ] **Step 2–4:** FAIL → implementar (layout da spec §5.4, ⚠ de pendência) → PASS.
- [ ] **Step 5:** commit `feat: tela Acompanhamento`.

### Task 6: Relatórios por empreiteira e prumada

**Files:**
- Create: `app/js/motor/relatorio.js`, `app/js/ui/relatorios.js`
- Modify: `app/css/estilo.css` (bloco `@media print` do relatório, A4)
- Test: `tests/relatorio.test.js`, `tests/e2e/relatorio.test.js`

**Interfaces:**
- `PA.motor.relatorio(estado, res, {empreiteira, servicos:[id]|null, prumadas:[1..4]|null, incluirExecutados})` devolve:

  ```
  {
    cabecalho: {empreiteira, servicos:[{nome, executado, total, pct, limite, termino, folga, equipe, necessaria}], prumadas, emitidoEm},
    linhas: [{apto, pav, final, servico, situacao, dataNecessaria, previsto, limite, pendencias}]
  }
  ```

  - As linhas vêm ordenadas por `dataNecessaria` e depois por `apto`.
  - Os executados ficam no fim, ou fora, quando `incluirExecutados` é false.
  - `servicos` null significa todos os serviços em que a empreiteira aparece.
- `PA.exportar.relatorio(rel) -> wb` (SheetJS).

- [ ] **Step 1: testes (falham).**
  - Camargo, Finais 3–4:
    - só aparecem aptos dos finais 3 e 4;
    - só aparece o serviço Louças;
    - a linha do 164 tem `dataNecessaria` igual a `res.itens[Louças,164].dataNecessaria`;
    - a ordem é crescente.
  - e2e:
    - a empreiteira logada vê só a própria empresa no filtro;
    - "Imprimir" abre `window.print` (interceptado);
    - "Excel" baixa um `.xlsx` com o número certo de linhas.
- [ ] **Step 2–4:** FAIL → implementar → PASS. Revisar a captura de tela do layout de impressão (`page.emulateMedia({media:'print'})`).
- [ ] **Step 5:** commit `feat: relatório por empreiteira e prumada`.

### Task 7: Pendências no Painel e marcador ⚠

**Files:**
- Create: `app/js/motor/pendencias-painel.js`
- Modify: `app/js/ui/painel.js`, `lancar.js`, `acompanhamento.js`, `relatorios.js`
- Test: `tests/pendencias-painel.test.js`, acréscimo em `tests/e2e/painel.test.js`

**Interfaces:**
- `PA.motor.pendenciasPainel(res, {prumada, pavimento})` devolve:

  ```
  {
    abertas, atrasadas, resolvidas,
    porPrumada: {1..4: n},
    porResponsavel: [{responsavel, abertas, atrasadas}],
    aptos: [{apto, qtd, etapas:[...], prazoMaisProximo}]
  }
  ```

- [ ] **Step 1: testes (falham).**
  - Com a v6, `abertas` = PENDÊNCIAS!C3 e `porPrumada[3] + porPrumada[4] + … = abertas`.
  - O apto 203 está em `aptos`, com a etapa "Geral".
  - e2e: o bloco aparece no Painel, e a célula 203 da grade de Lançar mostra ⚠.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat: pendências no painel e marcador por apto`.

### Task 8: Implantação na EC2 (DuckDNS) e roteiro

**Files:**
- Create:
  - `servidor/instalar.sh` (idempotente)
  - `servidor/pocketbase.service.modelo`
  - `servidor/duckdns.sh` (atualiza o IP; o cron só serve se não houver IP elástico)
  - `DEPLOY.md`
- Modify: `LEIA-ME.md` (seção "Versão online")
- Test: `tests/servidor/instalar.test.js` (`bash -n`, `shellcheck` se disponível, e execução em modo `--simular` que imprime as ações sem executá-las)

**Interfaces:**
- `sudo ./servidor/instalar.sh --dominio NOME.duckdns.org --admin-email E --admin-senha S`. O script:
  1. cria o usuário `pocketbase`;
  2. baixa o PocketBase via `baixar-pocketbase.sh`, com checksum;
  3. copia `app/` para `/opt/plano-ataque/pb_public`, além das migrações e dos ganchos;
  4. aplica `setcap cap_net_bind_service`;
  5. instala e ativa o serviço `systemd` com `serve NOME.duckdns.org`;
  6. aplica `ufw` (22, 80, 443) e `unattended-upgrades`;
  7. configura o backup diário (cron do próprio PocketBase, 7 cópias);
  8. cria o superusuário e o primeiro usuário `admin` do sistema.

- [ ] **Step 1: teste (falha).** `instalar.sh --simular` lista as 8 ações, na ordem; sem `--dominio`, sai com código 2 e mostra a mensagem de uso.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** escrever o `DEPLOY.md`, em passos curtos:
  1. criar a conta e o subdomínio no DuckDNS;
  2. criar um IP elástico e associar à EC2;
  3. apontar o DuckDNS para esse IP;
  4. configurar o Security Group;
  5. fazer `ssh`, `git clone` e rodar o `instalar.sh`;
  6. abrir o site, entrar e importar a v6;
  7. criar os usuários.
- [ ] **Step 6:** commit `feat(servidor): instalação na EC2 com DuckDNS e guia`.

> **Checkpoint de verificação 2 (final):** revisor independente da branch inteira; correção de Critical e Important com teste.

Depois que o sistema estiver no ar: `OPERACAO.md` (spec §5.8), um roteiro de manutenção segura, entregue a pedido do Brendon.
