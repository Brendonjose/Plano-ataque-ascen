# Plano de Ataque v3: Torre visual, Entregas (vistoria do cliente) e Reprovas

Data: 24/11/2026 · Pedido: Brendon (engenharia ASCEN)

Base:
- v2, já em produção em https://planoventisette.duckdns.org (EC2 + PocketBase; PR #2 com merge na `main`).
- Desenhos anteriores em `docs/superpowers/specs/`.

## 1. Intenção (o porquê)

A v2 ficou "muito boa e intuitiva", mas para a **diretoria** a visualização ficou confusa: muitos números e tabelas.
O Brendon quer algo **mais visual**, no estilo da grade da tela de Lançar: **o desenho da torre com cores** mostrando onde está pronto.
Essa visão precisa funcionar **por serviço** e **por apartamento** (o apto como um todo).

A obra também precisa acompanhar a **entrega ao cliente**. Quem faz a vistoria do apto é o **cliente**, que pode **aprovar ou reprovar**. Na reprova, a obra registra o motivo e marca nova data. O objetivo é:

- saber quem passou **de primeira** e quem foi reprovado;
- **tratar o que mais reprova** (ranking) para não repetir nos próximos aptos.

Mais adiante, depois de terminar a Ventisette, o sistema deve servir para **outras obras**: montar a torre, quantidade de aptos e assim por diante. Isso **não faz parte desta versão** (seção 2, "Não objetivos").

## 2. Objetivos, não objetivos e antiobjetivos

**Objetivos**

1. **Tela "Torre"** (visual, para todos os perfis e tela inicial da **diretoria**):
   - Desenho da torre (pavimentos 27→1 × finais 1–4), com cores e legenda grande.
   - **Modo "Por serviço":** escolhe-se o serviço, e cada apto mostra a situação daquele serviço (executado, em execução, liberado, bloqueado, fora do escopo, atrasado).
   - **Modo "Por apartamento":** cada apto mostra o seu **avanço geral**: quantos dos 12 serviços estão concluídos, com uma cor que vai do claro ao escuro conforme o avanço, mais o nome curto do **próximo serviço**. Clicar no apto abre a linha do tempo dos 12 serviços daquele apto (situação, data prevista e data necessária).
   - **Modo "Entrega":** cores da vistoria do cliente (objetivo 2).
   - Lado a lado com a torre: % por pavimento e % por prumada, para leitura rápida.
   - Filtro de prumada.
   - Só leitura. Quem pode lançar (obra/admin) e clica no apto abre o mesmo lançamento da tela Lançar.
2. **Vistoria do cliente** (na Entrega):
   - Ficha por apto, aberta pela grade de Lançar (serviço Entrega) e pela Torre: vistoria agendada (data), resultado (**Aprovado** / **Reprovado**), **acompanhado por** e observação.
   - **Reprovado:** um ou mais **motivos**, cada um com **categoria** (de uma lista) e **descrição livre**, mais a **nova data de vistoria**.
   - **Acompanhado por:** é escolhido entre os **usuários cadastrados no sistema**, incluindo cadastros futuros. No modo local (sem servidor) é um texto livre, com sugestões.
   - **Histórico** de todas as vistorias do apto (1ª, 2ª, 3ª…).
   - **Aprovado** conclui a Entrega do apto, com o mesmo efeito do código "1" de hoje. **Reprovado** deixa a Entrega "em andamento" até a próxima vistoria.
3. **Painel de Entregas:**
   - Aptos entregues de quantos no escopo;
   - **% aprovados de primeira**;
   - aprovados depois de reprova;
   - reprovados aguardando nova vistoria;
   - **próximas vistorias** (os próximos 7 dias e as atrasadas);
   - média de vistorias por apto entregue.

   Tudo por prumada e no total.
4. **Aba "Reprovas"** (ranking):
   - **Ranking de motivos (categorias):** quantidade de ocorrências e de aptos afetados.
   - **Ranking por empreiteira responsável:** cada categoria é ligada a uma empreiteira.
   - **Lista das reprovas:** apto, data, categoria, descrição e quem acompanhou, com filtro por prumada, categoria e período.
5. **Categorias de reprova** editáveis pelo **administrador** (Configurações).
   - Lista inicial: Piso, Rejunte, Pintura, Portas, Louças e metais, Limpeza, Caixilhos, Bancadas, Rodapé, Espelhos, Elétrica, Hidráulica, Outros.
   - Cada categoria tem uma **empreiteira responsável** opcional. Por padrão é a empreiteira do serviço correspondente; Elétrica e Hidráulica ficam "a definir", e o admin preenche.
6. **Cada motivo de reprova vira uma pendência** do apto, com responsável = empreiteira da categoria, etapa = categoria e prazo = nova data da vistoria. Assim o reparo entra no fluxo de pendências que já existe.
7. **"O que define o prazo"** (acrescentado em 24/11/2026, depois que o Brendon mudou equipes e as datas não andaram):
   - **Cronograma:** cada serviço mostra se o término é definido pela **própria equipe** ou se **aguarda o serviço anterior** (e qual).
   - **Topo do Cronograma e Torre:** mostram o **gargalo atual da obra**, ou seja, o serviço que, reforçado, antecipa a entrega.
   - **Mudança de equipe sem efeito na data:** aparece um aviso explicando o motivo.
   - A conferência de 24/11 confirmou que o motor está certo. A data não andava por causa do encadeamento (regra da v6).
8. **Prévia antes de produção:** as mudanças são feitas numa branch e publicadas como **prévia num link privado** (página no claude.ai, só do Brendon), carregada com os dados da v6. Nada muda na EC2 até o Brendon aprovar. Depois de aprovado: merge na `main` e o comando de atualização do `DEPLOY.md` na EC2.

**Não objetivos (desta versão)**

- **Multi-obra:** montar torre, aptos e serviços de novos empreendimentos. Vira um projeto próprio depois da Ventisette.
- Agendamento automático com o cliente, envio de e-mail ou WhatsApp.
- Fotos anexadas à reprova.

**Antiobjetivos**

- Mudar números ou regras que já existem. O motor e os testes de fidelidade com a v6 continuam iguais.
- A Torre ficar tão carregada quanto o Painel. Ela é a visão simples: cores, legenda e poucas palavras.
- Mexer na produção antes da aprovação da prévia. Ponto de retorno: a branch `backup/v2-estavel`; o roteiro para voltar está no `OPERACAO.md`.
- Uma reprova não deixar rastro. Todo registro de vistoria fica no histórico de alterações, como os lançamentos.

## 3. Restrições

- **Mesma arquitetura da v2:** scripts clássicos, modo local (`file://`) e modo servidor (PocketBase), permissões no servidor (a obra e o admin gravam vistorias; diretoria e empreiteira só leem) e autoria por gancho.
- **Banco:** a coleção nova (`vistorias`) e o parâmetro novo (`categoriasReprova`) entram por **migração** (`1700000004_...`). O backup e a instalação seguem como estão.
- **Empreiteiras veem vistorias e reprovas** (transparência, como nas pendências). O campo "Acompanhado por" mostra o nome do usuário. O e-mail não aparece.
- **Datas:** DD/MM/AAAA.

## 4. Abordagens consideradas

| Abordagem | Prós | Contras |
|---|---|---|
| **A. Estender o app atual** (telas novas + coleção `vistorias`) (escolhida) | Reaproveita motor, permissões, tempo real e instalação; uma só aplicação | Nenhum relevante |
| B. Painel separado só para a diretoria | Isolado | Duplica login e dados; mais para manter |

**Como validar antes de produção** (discutido em 24/11/2026):

| Opção | Situação |
|---|---|
| Rodar só no computador do Brendon | Funciona, mas exige baixar arquivos a cada rodada |
| Subdomínio ou `planoventisette.duckdns.org/versaonova` na mesma EC2 | Exigiria reorganizar o servidor (o PocketBase entrega o site e o HTTPS sozinho, e uma segunda instância não consegue as portas 80/443) |
| **Prévia em link privado** com os dados da v6 (escolhida) | Nada toca a produção; abre no computador e no celular |

## 5. O que foi decidido

### 5.1 Dados da vistoria

Coleção **`vistorias`**, com um registro por vistoria:

| Campo | Conteúdo |
|---|---|
| `uid` | id gerado no navegador |
| `apto` | o apto |
| `numero` | 1ª, 2ª, … |
| `agendada` | data da vistoria agendada |
| `realizada` | data em que a vistoria aconteceu |
| `resultado` | `agendada` \| `aprovado` \| `reprovado` |
| `motivos` | lista de `{ categoria, descricao }` |
| `acompanhado_por` | id do usuário; no modo local, texto |
| `obs` | observação |
| `atualizado_por`, `updated` | autoria |

Regras da coleção:
- **Escrita:** só admin e obra.
- **Leitura:** qualquer usuário ativo.
- **Histórico:** o gancho de autoria grava em `alteracoes`.

Regras de cada ação:
- **Reprovar:** cria automaticamente a vistoria seguinte (`resultado = agendada`, com a nova data).
- **Lançamento da Entrega:** é derivado da última vistoria do apto:
  - aprovado → código `1`;
  - reprovado ou agendada → `and`.
  - Um apto **sem** nenhuma vistoria continua com o lançamento manual de hoje (compatível com a v2).

Outros dados:
- **Categorias:** `parametros.categoriasReprova = [{ nome, empreiteira }]`.
- **Pendências automáticas:** criadas na mesma ação, com `etapa = categoria`, `responsavel = empreiteira da categoria` e `prazo = nova data`. Na descrição, ficam marcadas como "Reprova vistoria nº N".

### 5.2 Telas

- **Torre** (nova; tela inicial da diretoria): três modos, Por serviço, Por apartamento e Entrega (seção 2, objetivo 1).
  ```
  [Por serviço | Por apartamento | Entrega]   Serviço [Louças ▾]   Prumada [Todas ▾]
   27º  [271 ■][272 ■]
   …
   16º  [161 ■][162 ■][163 ■][164 ■]   ← cor = situação; no modo "Por apto": 9/12 + "Limp. fina"
   …
   Legenda: ■ Executado ■ Em execução ■ Liberado ■ Bloqueado ■ Fora ▢ Atrasado (borda)
   Ao lado: % por pavimento (barras) e % por prumada
  ```
  - **Cores do modo Entrega:**
    - aprovado de primeira (verde forte);
    - aprovado depois de reprova (verde claro);
    - reprovado, aguardando (vermelho);
    - vistoria agendada (azul);
    - ainda não liberado para entrega (cinza).
- **Lançar:** no serviço Entrega, tocar no apto abre a **ficha de vistoria** no lugar das opções Concluído/Em andamento. A opção antiga continua acessível como "Lançamento manual".
- **Entregas** (nova): o painel do objetivo 3, mais a lista "próximas vistorias" (clicar abre a ficha).
- **Reprovas** (nova): o ranking e a lista do objetivo 4.
- **Configurações:** a seção "Categorias de reprova" (nome + empreiteira responsável), só para o admin.
- **Menu por perfil:**
  - Torre, Entregas e Reprovas aparecem para todos;
  - a ficha de vistoria só grava para admin e obra.

### 5.3 Prévia

O `app/` da branch, em modo local, é publicado como página privada no claude.ai, já carregada com os dados da v6 (o backup do estado entra embutido na página). A cada rodada de ajustes, a prévia é republicada no mesmo link.

## 6. Deixado para quem constrói

- Escala de cores do modo "Por apartamento", com contraste checado nos temas claro e escuro.
- Layout fino das telas novas, seguindo o visual atual.
- Testes:
  - fidelidade (os testes atuais continuam);
  - unidade das funções novas do motor (`torre`, `entregas`, `reprovas`);
  - regras do servidor para `vistorias`;
  - e2e da ficha de vistoria, incluindo a pendência automática e o tempo real.

## 7. Decisões tomadas pelo construtor (para o Brendon conferir)

- A **Torre** é a tela inicial da **diretoria**. Hoje é o Painel; o Painel continua no menu.
- O **número de vistorias** conta a partir desta versão. As entregas já concluídas na v6 aparecem como "entregue (sem vistoria registrada)".
- A **lista inicial de categorias** e as empreiteiras ligadas a elas são as da seção 2, objetivo 5.
- **Reprova gera pendência** automaticamente, com responsável = empreiteira da categoria.
- **Empreiteiras veem as reprovas** de todos, por transparência, como nas pendências.
