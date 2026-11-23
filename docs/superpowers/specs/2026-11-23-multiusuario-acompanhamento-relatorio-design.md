# Plano de Ataque v2: multiusuário na EC2, Acompanhamento, Relatório por empreiteira e Pendências no Painel

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

Depois que o sistema estiver no ar, o Brendon quer um **roteiro de como manter o sistema seguro e funcionando**.

## 2. Objetivos, não objetivos e antiobjetivos

**Objetivos**

- **Hospedagem:** numa **EC2 do Brendon**, **sem nenhum custo além da própria instância**. Nada de S3, domínio pago, serviço de e-mail ou banco gerenciado.
- **Login:** individual, com e-mail e senha. São quatro perfis:

  | Perfil | Vê | Altera |
  |---|---|---|
  | Administrador | tudo | tudo, inclusive metas, prazos, produtividade, Estratégia, Configurações, importar planilha e usuários |
  | Obra | tudo | lançamentos (código, data real, observação), **equipe atual de cada serviço** (incluindo DS/Juninho no piso), pendências, colunas manuais dos quadros, "Registrar semana" |
  | Diretoria | tudo | nada |
  | Empreiteira | Painel, Acompanhamento, Macro/Quadros, Cronograma (só leitura), Pendências, Histórico e o próprio Relatório | nada |

  - Para a empreiteira **ficam ocultos**: Ranking (avaliação interna), Estratégia, a coluna "Vendido?" dos quadros, Configurações, Usuários e Alterações.
- **Gravação:**
  - **Cada gravação é um registro separado**, com autor e horário. Duas pessoas lançando aptos diferentes ao mesmo tempo nunca apagam o trabalho uma da outra.
  - Toda alteração fica num **histórico de alterações** (quem, quando, antes e depois).
- **Números iguais aos da v1:** o motor de cálculo continua no navegador e não muda. Os testes de fidelidade com a v6 continuam valendo.
- **Atualização ao vivo:** quando alguém lança, os outros veem a mudança em poucos segundos, sem recarregar a página.
- **Sinal fraco na obra:** se a internet cair, o lançamento fica numa fila local, com aviso visível, e é enviado sozinho quando a conexão volta. Nada se perde em silêncio.
- **Planilha v6:** é importada **uma única vez**, na implantação (decisão do Brendon). Depois disso o sistema é a única fonte e a planilha só sai como exportação.
- **Telas novas:** "Acompanhamento" (item 1), "Relatórios" (item 2) e um bloco de Pendências no Painel (item 3), descritos na seção 5.
- **Roteiro de manutenção segura** (`OPERACAO.md`), entregue com o sistema no ar.

**Não objetivos (desta versão)**

- Aplicativo nativo de celular. O site responsivo já atende.
- Envio automático do relatório por e-mail ou WhatsApp. O relatório é impresso ou salvo em PDF/Excel e enviado pela obra.
- Recuperação de senha por e-mail. Exigiria servidor de e-mail; quem redefine a senha é o administrador.
- Importação periódica da planilha, com mescla.
- O bloco financeiro.

**Antiobjetivos (falha mesmo funcionando)**

- Uma empreiteira ou alguém da diretoria conseguir alterar qualquer dado, **mesmo burlando a tela**. A proteção precisa estar no servidor.
- Lançamento perdido sem aviso: conflito, internet ou sessão expirada.
- Números diferentes dos da v1 para os mesmos dados.
- Ficar mais lento que a v1 para lançar. A tela responde na hora e o envio acontece em segundo plano.
- Gerar custo além da instância.

## 3. Restrições

- **EC2 com Linux.** O Brendon informa o tamanho e o sistema operacional na implantação; uma t3.micro ou t3.small atende.
- **HTTPS gratuito (Let's Encrypt) exige um nome de site:**
  - um subdomínio de domínio que a ASCEN já tenha (só um registro DNS, sem custo); **ou**
  - um subdomínio gratuito do DuckDNS.
- **Sem etapa de build no front:** scripts clássicos, como na v1. O SDK do PocketBase entra em `app/vendor/` como UMD, com versão fixa.
- **Versão do PocketBase:** ainda não chegou à 1.0, então a versão é **fixada** e a atualização segue o `OPERACAO.md`.
- **Datas:** DD/MM/AAAA, pt-BR.
- **Limitação aceita, a "Estratégia oculta" é só de tela:**
  - O motor precisa saber quais aptos estão fora do escopo para calcular.
  - Os aptos cancelados por escopo aparecem nas grades de todos.
  - Esconder a tela e a coluna evita a exposição casual da lista de vendidos, mas não impede quem souber inspecionar o navegador.

## 4. Abordagens consideradas

| Abordagem | Prós | Contras |
|---|---|---|
| ~~Vercel + Supabase~~ | Login e RLS prontos | Descartada: a conta do Brendon no Supabase não tem vaga para mais um projeto |
| **A. PocketBase na EC2** (escolhida) | Um único programa (banco SQLite, login, regras de permissão, tempo real, painel de admin, backups automáticos e HTTPS automático); manutenção mínima; roda em instância pequena; custo zero além da EC2 | Ainda não chegou à 1.0: atualizar exige cuidado (versão fixada e roteiro) |
| B. Node + PostgreSQL + Nginx próprios | Padrão de mercado, controle total | Login, sessões, proteções e permissões escritos por nós (mais código e mais chance de brecha), e dois serviços para manter |
| C. Supabase em Docker na EC2 | Mantém o desenho anterior | Mais de 10 contêineres, pelo menos 4 GB de RAM, o mais difícil de manter |

Escolha do Brendon, em 23/11/2026: **A**, "desde que não gere custos além da própria instância".

## 5. O que foi decidido

### 5.1 Servidor (PocketBase)

**Como roda:**
- Um único executável `pocketbase` como serviço `systemd`, com usuário próprio e sem privilégios. Recebe a permissão de abrir as portas 80/443 (`setcap`).
- O próprio PocketBase:
  - entrega as telas (pasta `pb_public/` = conteúdo de `app/`);
  - serve a API;
  - emite e renova o certificado HTTPS (Let's Encrypt automático, comando `serve <domínio>`).
- **Não há Nginx.**

**Coleções (tabelas):**

- **`users`** (coleção de autenticação)
  - Campos: `nome`, `papel` (`admin` | `obra` | `diretoria` | `empreiteira`), `empreiteira` (texto, para o papel empreiteira) e `ativo`.
  - Cadastro aberto desligado: só o admin cria usuários.
- **`lancamentos`**
  - Campos: `servico`, `apto`, `codigo`, `data_real`, `obs`.
  - Índice único em (`servico`, `apto`).
  - Equivale a `estado.lancamentos`.
- **`equipes`**
  - Campos: `chave` (id do serviço, `piso_ds` ou `piso_jun`) e `equipe`.
  - Gravável por admin e obra.
  - O adaptador junta este valor ao `cronograma` e ao `piso` do estado.
- **`pendencias`**: os mesmos campos da v1.
- **`manuais`**: campos `apto`, `etapa` e `valor`, com índice único em (`apto`, `etapa`).
- **`semanas`**: campos `semana` (único), `data`, `realizado`, `concluidos` e `obs`.
- **`parametros`**
  - Campos: `chave` (único) e `valor` (json).
  - Chaves: `config`, `feriados`, `cronograma`, `piso`, `estrategia`, `retratoBase`.
  - Só o admin grava.
- **`alteracoes`**
  - Campos: `tabela`, `registro`, `antes`, `depois`, `por`, `em`.
  - Só leitura, e só para admin e obra.

**Autor das alterações:** todas as coleções de dados têm `atualizado_por` e `atualizado_em`. Quem preenche é um **gancho no servidor** (`pb_hooks/`), a partir do usuário logado, nunca a partir do que o navegador envia. O mesmo gancho grava a coleção `alteracoes` em toda inclusão, alteração ou exclusão.

**Regras de acesso (API rules, aplicadas no servidor):**
- **Leitura:** qualquer usuário logado e ativo. A exceção é `alteracoes`, que só admin e obra leem.
- **Escrita:** segue a tabela da seção 2. Exemplo para `lancamentos`: `@request.auth.ativo = true && (@request.auth.papel = "admin" || @request.auth.papel = "obra")`.
- **Usuários:**
  - Só o admin cria, edita papéis e redefine senhas.
  - Cada usuário pode trocar a própria senha.
  - Ninguém altera o próprio papel.

**Versionamento:**
- O esquema é criado por **migrações versionadas** em `servidor/pb_migrations/`.
- Os ganchos ficam em `servidor/pb_hooks/`.

### 5.2 Adaptador de dados

A interface tem dois adaptadores, `PA.dados.local` (v1) e `PA.dados.servidor` (PocketBase).
- Quando a página é aberta pelo servidor, usa o PocketBase.
- Quando é aberta em `file://`, usa o modo local, como na v1.

**Métodos:**
- `entrar(email, senha)`, `sair()`, `usuario()` → `{ id, nome, papel, empreiteira }`
- `carregar()` → `estado` (o mesmo objeto da v1)
- Operações granulares:
  - `gravarLancamento(servico, apto, valor|null)`
  - `gravarEquipe(chave, n)`
  - `gravarPendencia(p)`, `removerPendencia(id)`
  - `gravarManual(apto, etapa, valor)`
  - `gravarSemana(reg)`
  - `gravarParametro(chave, valor)`
  - `importarTudo(estado)` (só admin, só com o banco vazio)
- `aoMudar(callback)`: assinatura em tempo real; aplica ao `estado` as mudanças feitas por outros usuários e redesenha a tela.

**Fila offline:**
- Uma operação que falha por rede vai para uma fila no `localStorage` e é reenviada quando a conexão volta.
- A faixa "N lançamentos aguardando envio" fica visível enquanto houver fila.
- As operações são **idempotentes**: o mesmo lançamento enviado de novo não duplica.
- Erro de permissão não entra na fila: é mostrado ao usuário e a mudança é desfeita na tela.

**Ações e desfazer:**
- As ações (`PA.acoes`) passam a devolver, além do novo `estado`, a lista de operações que o adaptador grava.
- O **Desfazer** vale para as próprias alterações da sessão e é enviado ao servidor como operação inversa.
- Se outra pessoa alterou o mesmo registro depois (comparação pelo `atualizado_em`), o desfazer é **recusado com aviso**.

### 5.3 Login, usuários e telas por perfil

- **Tela de login** (e-mail e senha) com a marca Ventisette/ASCEN.
- **Tela Usuários** (só admin):
  - criar usuário com nome, e-mail, senha inicial, papel e, se for o caso, empresa;
  - ativar e desativar usuários;
  - redefinir senha.
- **Primeiro acesso:** o primeiro administrador é criado no comando de implantação (seção 5.7).
- **Troca de senha:** cada usuário pode trocar a própria em "Minha conta".
- **Menu por perfil:** o menu e os botões mostram só o que o perfil pode fazer, e o servidor garante a mesma regra.
- **Empreiteira:**
  - entra direto no **Acompanhamento**, já filtrado pela empresa dela;
  - tem o botão "Meu relatório";
  - a empresa do perfil é comparada sem diferenciar maiúsculas, como no motor.
- **Tela Alterações** (admin e obra): histórico com filtro por data, pessoa, apto e serviço.

### 5.4 Tela "Acompanhamento" (item 1)

Filtros no topo, em linha, no estilo da planilha: **Serviço**, **Prumada** (Final 1–4, Finais 1-2, Finais 3-4), **Empreiteira** e **Pavimento**. Todos os blocos abaixo respondem a eles.

1. **Faixa de números do recorte:**
   - Total, Executado, Em execução, Liberado (pode executar), Bloqueado (aguardando), Fora do escopo, % executado e Atrasados.
   - Com um serviço escolhido, aparecem também: término projetado, folga, limite e equipe atual → necessária.
2. **Por prumada:** Final, Executado, Em execução, Liberado, Bloqueado, %, Limite, Término projetado e Folga.
3. **Com Serviço = Todos:** matriz **serviços × situação**. Clicar numa célula filtra e mostra a lista.
4. **"O que falta":** aptos agrupados por situação.
   - **Liberado, pode atacar já:** ordenado pela data necessária, com "até DD/MM".
   - **Em execução.**
   - **Bloqueado:** com o motivo.
   - **Executado:** recolhido.
   - Cada apto mostra ⚠ se tiver pendência aberta.
   - Quem pode lançar abre o lançamento clicando no apto.

Equivalência com o motor da v1:

| Situação | Status no motor |
|---|---|
| Executado | Concluído |
| Em execução | Em andamento |
| Liberado | Não iniciado |
| Bloqueado | Bloqueado |
| Fora do escopo | Cancelado |

### 5.5 Relatório por empreiteira e prumada (item 2)

- **Onde fica:** na tela **Relatórios**. Para a empreiteira, o botão "Meu relatório" já abre filtrado.
- **Filtros:** empreiteira, serviço(s) dela e prumadas.
- **Cabeçalho:**
  - empreiteira, serviço(s), prumadas e data de emissão;
  - por serviço: executado de total (%), limite, término no ritmo atual, folga, e equipe atual → necessária.
- **Tabela:**
  - colunas: Apto, Pav, Final, Situação, **Precisa estar pronto (data necessária)**, Previsto no ritmo atual, Data-limite e Pendências abertas;
  - ordenada pela data necessária;
  - os executados ficam numa seção final ou ocultos.
- **Saídas:**
  - **Imprimir / Salvar PDF**, com layout A4 próprio: sem menu, com cabeçalho e logo;
  - **Excel (.xlsx)**.

### 5.6 Pendências no Painel (item 3)

O Painel ganha um bloco **Pendências**, que responde aos filtros de prumada e pavimento:
- totais de abertas, atrasadas e resolvidas;
- abertas por prumada e por responsável;
- lista dos aptos com pendência aberta: apto, quantidade, etapas e o prazo mais próximo.

Também passam a mostrar ⚠ nos aptos com pendência aberta:
- a grade do **Lançar**;
- o **Acompanhamento**;
- o **Relatório**.

### 5.7 Implantação na EC2 (custo zero além da instância)

O `DEPLOY.md` traz o passo a passo com frases curtas, e há um script único `servidor/instalar.sh` que é idempotente (pode rodar de novo sem estragar nada).

1. **Pré-requisitos:**
   - EC2 Ubuntu LTS;
   - Security Group abrindo **só** as portas 22 (SSH, de preferência só para o IP do Brendon), 80 e 443;
   - um nome de site apontando para o IP elástico da instância. O IP elástico é gratuito enquanto estiver associado a uma instância ligada.
2. **`instalar.sh`:**
   - cria o usuário de sistema;
   - baixa o PocketBase na versão fixada e confere o checksum;
   - copia `app/` para `pb_public/` e as migrações e ganchos para os lugares certos;
   - cria o serviço `systemd` com reinício automático;
   - liga o firewall (`ufw`) e as atualizações automáticas de segurança do Ubuntu (`unattended-upgrades`);
   - cria o primeiro administrador.
3. **Atualizar o sistema:** `git pull` seguido de `instalar.sh`.
4. **Backup automático:** o PocketBase faz um backup diário no próprio disco e guarda os 7 mais recentes. O administrador **baixa um backup por semana** pelo painel do PocketBase ou pela tela Configurações, e o aviso de "backup atrasado" continua.
5. **Carga inicial:** o administrador entra e importa a v6 uma vez. A importação só é permitida com o banco vazio.

### 5.8 Manutenção segura (entregue depois que estiver no ar)

O `OPERACAO.md` é um roteiro curto, em checklist:
- o que fazer toda semana (baixar backup, conferir se o serviço está no ar);
- o que fazer todo mês (atualizações, espaço em disco, revisar usuários ativos);
- como atualizar o PocketBase com segurança;
- como restaurar um backup;
- como trocar ou revogar acessos;
- o que fazer se o servidor cair.

## 6. Deixado para quem constrói

- Layout fino das telas novas, seguindo o visual da v1.
- **Formato dos ids e da fila offline**, que deve ser idempotente. Sugestão: id determinístico por (serviço, apto) nos lançamentos e uuid gerado no navegador nas pendências.
- **Conflitos:** a regra base é "última gravação vence" por registro. O histórico de alterações garante a rastreabilidade.
- **Testes:**
  - regras de acesso, contra um PocketBase local, com usuários de cada perfil;
  - fila offline e tempo real;
  - fidelidade (os testes atuais continuam).

## 7. Decisões tomadas pelo construtor (para o Brendon conferir)

- A **obra também atualiza a equipe atual** de cada serviço. Metas, prazos, produtividade, vendidos e configurações ficam só com o administrador.
- As **empreiteiras veem as pendências** de todos, já que muitas estão no nome delas.
- O **Desfazer** vale para as próprias alterações da sessão e é recusado com aviso se outra pessoa mexeu depois.
- O **histórico de alterações** cobre todas as coleções de dados; a tela fica visível para admin e obra.
- A **recuperação de senha** é feita pelo administrador, sem e-mail, para manter o custo zero.
- **Sem Nginx:** o próprio PocketBase entrega as telas e o HTTPS.
- A empreiteira entra direto no Acompanhamento filtrado pela empresa dela.
- A **data cobrada** no relatório é a data necessária; a prevista aparece ao lado.
- O **modo local** (`file://`) continua funcionando.
