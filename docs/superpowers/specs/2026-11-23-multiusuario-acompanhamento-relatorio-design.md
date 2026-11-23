# Plano de Ataque v2: multiusuário, Acompanhamento, Relatório por empreiteira e Pendências no Painel

Data: 23/11/2026 · Pedido: Brendon (engenharia ASCEN)

Base:
- Sistema v1, já com merge na `main` (PR #1).
- Desenho anterior: `docs/superpowers/specs/2026-11-18-sistema-plano-ataque-design.md`.
- Regras da obra: `referencia/CONTEXTO_PROJETO.md`.

## 1. Intenção (o porquê)

A v1 funciona para uma pessoa, num computador, com os dados no navegador. O Brendon quer publicar o sistema para que **todos acompanhem a mesma obra**, cada um no seu papel:

- **A obra lança** o avanço diário.
- **A diretoria consulta.**
- **As empreiteiras acompanham** o próprio serviço ao lado dos outros, para "se apressarem e se cobrarem entre si", e **recebem um relatório** com as datas que precisam cumprir.

Antes de publicar, ele pediu três melhorias de uso:

1. Um painel "estilo planilha" em que se filtra por serviço e se vê **o que foi executado, o que está em execução e o que falta**, com os aptos listados.
2. Um **relatório por empreiteira e prumada** para passar as datas e cobrar.
3. **Pendências por apto** no painel geral.

## 2. Objetivos, não objetivos e antiobjetivos

**Objetivos**
- Hospedagem na **Vercel** (telas) com **Supabase** (banco Postgres e login). Decisão do Brendon em 23/11/2026.
- Login individual por e-mail e senha, com quatro perfis:

  | Perfil | Vê | Altera |
  |---|---|---|
  | Administrador | tudo | tudo, inclusive Cronograma, Estratégia, Configurações, importar planilha e papéis dos usuários |
  | Obra | tudo | lançamentos (código, data real, observação), pendências, colunas manuais dos quadros, "Registrar semana" |
  | Diretoria | tudo | nada |
  | Empreiteira | Painel, Acompanhamento, Macro/Quadros, Cronograma (só leitura), Pendências, Histórico e o próprio Relatório | nada |

  - Para a empreiteira, **ficam ocultos**: o Ranking (avaliação interna), a tela Estratégia, a coluna "Vendido?" dos quadros e as Configurações.
- **Cada gravação é um registro separado**, com autor e horário. Duas pessoas lançando aptos diferentes ao mesmo tempo nunca apagam o trabalho uma da outra. Todo lançamento fica num **histórico de alterações** (quem, quando, antes e depois).
- **Números iguais aos da v1:** o motor de cálculo continua no navegador e não muda. Os testes de fidelidade com a v6 continuam valendo.
- **Atualização entre usuários:** quando alguém lança, os outros veem a mudança em poucos segundos, sem recarregar a página.
- **Sinal fraco na obra:** se a internet cair, o lançamento fica numa fila local, com um aviso visível, e é enviado sozinho quando a conexão volta. Nada se perde em silêncio.
- **Migração para a EC2 preservada:**
  - o banco fica em SQL de Postgres puro, versionado no repositório;
  - toda leitura e escrita passa por **um único adaptador de dados**;
  - o modo local da v1 (`file://`, `localStorage`) continua funcionando como outro adaptador.
- **Nova tela "Acompanhamento"** (item 1), **Relatório** (item 2) e **bloco de Pendências no Painel** (item 3), descritos na seção 5.

**Não objetivos (desta versão)**
- Servidor próprio na EC2. Só deixamos o caminho pronto.
- Aplicativo nativo de celular. O site responsivo já atende.
- Envio automático de relatório por e-mail ou WhatsApp. O relatório é impresso ou salvo em PDF/Excel e enviado pela obra.
- O bloco financeiro (orçamento × levantamento).

**Antiobjetivos (falha mesmo funcionando)**
- Uma empreiteira ou alguém da diretoria conseguir alterar qualquer dado, mesmo burlando a tela. A proteção precisa estar **no banco**, não só nos botões escondidos.
- Um lançamento perdido sem aviso: conflito, internet ou sessão expirada.
- Números diferentes dos da v1 para os mesmos dados.
- Ficar mais lento que a v1 para lançar. A tela deve responder na hora; o envio acontece em segundo plano.

## 3. Restrições

- **Supabase gratuito:** aceita 2 projetos ativos por organização e pausa projetos sem uso por 7 dias. O Brendon já tem um sistema lá, então o projeto novo precisa de vaga (outra organização, ou plano pago). Com uso diário, não pausa.
- **Chave do navegador:** a chave pública (`anon`) do Supabase fica no navegador. Por isso **toda permissão é feita por RLS** (regras por linha no banco).
- **Sem etapa de build:** o front continua em scripts clássicos, sem módulos ES, para manter o modo `file://`. O cliente `@supabase/supabase-js` entra em `app/vendor/` como UMD, com versão fixa.
- **Datas:** DD/MM/AAAA em pt-BR, como na v1.
- **Limitação aceita, a "Estratégia oculta" é só de tela:** a lista de vendidos não é segredo garantido. Para calcular, o motor precisa saber quais aptos estão fora do escopo, e os aptos cancelados aparecem nas grades de todos os serviços. Esconder a tela e a coluna evita exposição casual, mas não impede quem souber inspecionar o navegador.

## 4. Abordagens consideradas

| Abordagem | Prós | Contras |
|---|---|---|
| **A. Vercel + Supabase (Auth + Postgres com RLS + Realtime)** (escolhida) | Login e permissões já prontos e testados; sem servidor para manter; grátis nesse volume | Dados num serviço externo à AWS da ASCEN; limite de 2 projetos gratuitos |
| B. Vercel + funções próprias + Postgres | Controle total da API | Mais código e mais pontos de brecha de segurança, sem ganho real |
| C. EC2 (Node + Postgres + nginx) | Tudo dentro da AWS | Manutenção de servidor, certificado, backup e quedas |

Escolha do Brendon: **A**, com a possibilidade de migrar para a **C**. Por isso os itens de portabilidade da seção 2.

## 5. O que foi decidido

### 5.1 Dados no banco (Postgres)

O motor continua recebendo o mesmo objeto `estado` da v1. O adaptador monta esse objeto a partir das tabelas:

- **`perfis`**
  - Campos: `usuario` (uuid de `auth.users`), `nome`, `papel` (`admin` | `obra` | `diretoria` | `empreiteira`), `empreiteira` (texto, para quem tem papel empreiteira), `ativo`.
  - Usuário sem perfil ativo não vê nada.
- **`lancamentos`**
  - Chave: (`servico`, `apto`).
  - Campos: `codigo`, `data_real`, `obs`, `atualizado_por`, `atualizado_em`.
  - Equivale a `estado.lancamentos`.
- **`alteracoes`** (histórico)
  - Gravado por um gatilho genérico a cada inclusão, alteração ou exclusão em `lancamentos`, `pendencias`, `manuais`, `historico_semanal` e `parametros`.
  - Campos: `tabela`, `chave`, `antes` (jsonb), `depois` (jsonb), `por`, `em`. Todas essas tabelas têm `atualizado_por` e `atualizado_em`.
- **`pendencias`**: os campos da v1, mais `criado_por`, `atualizado_por` e `atualizado_em`.
- **`manuais`**: chave (`apto`, `etapa`) e o campo `valor`.
- **`historico_semanal`**: chave `semana`, com `data`, `realizado`, `concluidos` e `obs`.
- **`parametros`**
  - Chave `chave`, com o campo `valor` (jsonb).
  - Chaves: `config`, `feriados`, `cronograma`, `piso`, `estrategia`, `retratoBase`.
  - Só o administrador grava.

**RLS:**
- Leitura em todas as tabelas para qualquer perfil ativo. `alteracoes` é exceção: só admin e obra leem.
- Escrita conforme a tabela da seção 2.
- Uma função `papel_atual()` lê o papel em `perfis` a partir de `auth.uid()`.

**Arquivos SQL:**
- `servidor/schema.sql` cria tabelas, gatilhos e RLS.
- `servidor/seed_de_planilha.md` explica a carga inicial: o administrador importa a v6 pela tela, e o adaptador grava as tabelas.

### 5.2 Adaptador de dados

Interface única com dois adaptadores, `PA.dados.local` (v1) e `PA.dados.supabase`. O adaptador é escolhido por `app/config.js`: com URL e chave preenchidas, usa o Supabase; sem elas, usa o modo local.

- `entrar(email, senha)`, `sair()`, `usuario()` → `{ id, nome, papel, empreiteira }`
- `carregar()` → `estado`
- **Operações granulares:**
  - `gravarLancamento(servico, apto, valor|null)`
  - `gravarPendencia(p)` e `removerPendencia(id)`
  - `gravarManual(apto, etapa, valor)`
  - `gravarSemana(reg)`
  - `gravarParametro(chave, valor)`
  - `importarTudo(estado)` (só admin)
- `aoMudar(callback)`: recebe as mudanças feitas por outros usuários (Realtime) e atualiza `estado` e a tela.
- **Fila offline:**
  - Operações que falham por rede vão para uma fila no `localStorage` e são reenviadas quando a conexão volta.
  - Uma faixa mostra "N lançamentos aguardando envio".
  - Erro de permissão (RLS) não vai para a fila: aparece para o usuário e o lançamento é desfeito na tela.

Mudanças na interface de hoje:
- As ações (`PA.acoes`) passam a gerar, além do novo `estado`, a **lista de operações** que o adaptador grava.
- O **Desfazer** vira uma operação inversa enviada ao banco. Ele vale só para os próprios lançamentos da sessão.

### 5.3 Login e telas por perfil

- Tela de login (e-mail e senha) com a marca Ventisette/ASCEN e a opção "Esqueci minha senha", que usa o envio de e-mail do Supabase.
- **Cadastro de usuários:**
  - O administrador cria a pessoa no painel do Supabase (Authentication → Add user).
  - Depois, na nova tela **Usuários** do sistema, define o nome, o papel e, para empreiteira, o nome da empresa.
  - Não há auto-cadastro aberto.
- O menu e os botões mostram só o que o perfil pode fazer. O banco garante a mesma regra (seção 5.1).
- **Empreiteira:** entra direto no **Acompanhamento**, já filtrado pela empresa dela, e tem o botão "Meu relatório".

### 5.4 Tela "Acompanhamento" (item 1)

Filtros no topo, em linha, no estilo da planilha: **Serviço**, **Prumada** (Final 1–4, Finais 1-2, Finais 3-4), **Empreiteira** e **Pavimento**. Todos os blocos abaixo respondem a eles.

1. **Faixa de números do recorte:**
   - Total, Executado, Em execução, Liberado (pode executar), Bloqueado (aguardando), Fora do escopo, % executado, Atrasados.
   - Com um serviço escolhido: término projetado, folga, limite e equipe atual → necessária.
2. **Por prumada:** Final, Executado, Em execução, Liberado, Bloqueado, %, Limite, Término projetado, Folga.
3. **Com Serviço = Todos:** matriz **serviços × situação**, com a contagem em cada célula. Clicar numa célula aplica o filtro de serviço e mostra a lista.
4. **"O que falta":** listas de aptos agrupadas por situação.
   - **Liberado, pode atacar já:** ordenado pela data necessária, mostrando "até DD/MM".
   - **Em execução.**
   - **Bloqueado:** com o motivo ("aguardando piso").
   - **Executado:** recolhido por padrão.
   - Cada apto mostra ⚠ quando tem pendência aberta.
   - Para quem pode lançar, clicar no apto abre o lançamento.

As definições são as do motor da v1:

| Situação | Itens do motor |
|---|---|
| Executado | status Concluído |
| Em execução | Em andamento |
| Liberado | Não iniciado, sem bloqueio |
| Bloqueado | Bloqueado |
| Fora do escopo | Cancelado |

### 5.5 Relatório por empreiteira e prumada (item 2)

- **Onde fica:** nova tela **Relatórios**. O botão "Meu relatório" da empreiteira abre essa tela já filtrada.
- **Filtros:** empreiteira (obrigatória, exceto para a própria empreiteira), um ou mais serviços dela, e as prumadas.
- **Cabeçalho:**
  - empreiteira, serviço(s), prumadas e data de emissão;
  - por serviço: executado de total (%), limite, término projetado no ritmo atual, folga, equipe atual → necessária.
- **Tabela:**
  - colunas: Apto, Pav, Final, Situação, **Precisa estar pronto (data necessária)**, Previsto no ritmo atual, Data-limite da prumada, Pendências abertas;
  - linhas ordenadas pela data necessária;
  - aptos executados ficam numa seção final ou podem ser ocultados (opção).
- **Saídas:**
  - **Imprimir / Salvar PDF** pela impressão do navegador, com layout de impressão próprio: A4, sem menu e com cabeçalho e logo;
  - **Excel (.xlsx)** com o mesmo conteúdo.

### 5.6 Pendências no Painel (item 3)

O Painel ganha um bloco **Pendências**, com:
- abertas, atrasadas e resolvidas;
- abertas por prumada e por responsável;
- lista dos aptos com pendência aberta (apto, quantidade, etapas, prazo mais próximo).

O bloco responde aos filtros de prumada e pavimento do Painel.

Também passam a mostrar ⚠ nos aptos com pendência aberta:
- a grade de **Lançar**;
- as listas do **Acompanhamento**;
- o **Relatório**.

### 5.7 Publicação

- **Vercel:** importa o repositório, com diretório raiz `app/` e sem comando de build. O `vercel.json` traz cabeçalhos de segurança e de cache.
- **`app/config.js`:** guarda a URL do projeto Supabase e a chave pública (`anon`). Essa chave pode ficar no código; a segurança vem do RLS.
- **`DEPLOY.md`:** passo a passo, com telas e frases curtas, para:
  1. criar o projeto Supabase;
  2. rodar `servidor/schema.sql`;
  3. criar o primeiro administrador;
  4. publicar na Vercel;
  5. importar a v6 no sistema publicado.
- **Backup:** o administrador continua podendo baixar o backup `.json` e o Excel. O `DEPLOY.md` mostra também o backup diário automático do Supabase (plano pago) ou um `pg_dump` manual (plano gratuito).

### 5.8 Caminho para a EC2 (documentado, não construído)

O `DEPLOY.md` traz uma seção "Migrar para EC2":
- Postgres com o mesmo `schema.sql`.
- As funções `auth.uid()` e `papel_atual()` são trocadas por uma API Node pequena com login próprio.
- Um terceiro adaptador `PA.dados.api` com a mesma interface da seção 5.2.

As telas e o motor não mudam.

## 6. Deixado para quem constrói

- Layout fino das telas novas, seguindo o visual da v1.
- **Formato exato das operações e da fila offline:**
  - deve ser idempotente;
  - reenviar o mesmo lançamento não pode duplicar;
  - as pendências usam um id gerado no navegador (uuid).
- **Reconciliação de conflito:** a regra base é "última gravação vence" por registro (apto × serviço). O histórico de alterações garante a rastreabilidade.
- **Testes do RLS:** contra um Postgres local, simulando `auth.uid()`.

## 7. Decisões tomadas pelo construtor (para o Brendon conferir)

- O perfil **Obra** não altera Cronograma, Estratégia nem Configurações; só o **Administrador** altera.
- As empreiteiras **veem as pendências** de todos, já que muitas estão no nome delas.
- O **Desfazer** vale para as próprias alterações da sessão (lançamentos, pendências, colunas manuais, semana, parâmetros). Se outra pessoa alterou o mesmo registro depois, o desfazer é **recusado com aviso** (comparação por `atualizado_em`), para não apagar o trabalho dela.
- O **histórico de alterações** cobre todas as tabelas de dados (gatilho genérico; todas ganham `atualizado_por`/`atualizado_em`). Há uma tela **Alterações** (admin e obra) com filtro por data, usuário, apto e serviço.
- A empreiteira entra direto no Acompanhamento filtrado pela empresa dela.
- Na data cobrada no relatório, a coluna principal é a **data necessária**; a prevista aparece ao lado.
- O **modo local** (`file://`) continua funcionando quando `config.js` estiver vazio.
