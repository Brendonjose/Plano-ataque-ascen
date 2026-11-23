# Colocar o Plano de Ataque no ar (EC2 + DuckDNS)

O site fica em `https://SEUNOME.duckdns.org`, com HTTPS grátis. Não há custo além da instância EC2.
Faça os passos na ordem.

## 1. Criar o nome do site no DuckDNS (grátis)

1. Abra https://www.duckdns.org e entre com uma conta Google ou GitHub.
2. Em "sub domain", digite um nome, por exemplo `planoventisette`. Clique em **add domain**.
3. Anote o nome: `planoventisette.duckdns.org`.
4. Anote também o **token** que aparece no topo da página. Não compartilhe o token.

## 2. Preparar a EC2

1. Crie a instância com:
   - **Ubuntu Server 24.04 LTS, 64-bit (x86)**. Não use ARM/Graviton (t4g): o instalador baixa a versão x86.
   - Tipo **t3.micro** (nível gratuito em contas novas) ou **t3.small** (mais folga).
   - Disco **20 GB gp3**.
   - Um par de chaves novo, no formato `.pem`. Guarde a chave com cuidado.
   - Região **São Paulo (sa-east-1)**, mais rápida para a obra, ou **us-east-1**, mais barata.
2. Associe um **IP elástico** à instância:
   - Vá em **EC2 → Elastic IPs → Allocate → Associate**.
   - Custo: a AWS cobra todo IP público (cerca de US$ 0,005 por hora). Em contas novas, o nível gratuito de 12 meses costuma cobrir. Esse é o único custo além da instância; confira os preços em calculator.aws.
3. No DuckDNS, cole esse IP no campo "current ip" do seu domínio e clique em **update ip**.
4. No **Security Group** da instância, deixe só estas entradas:
   - **22** (SSH), **só para o seu IP** ("My IP");
   - **80** (HTTP), para todos (0.0.0.0/0);
   - **443** (HTTPS), para todos (0.0.0.0/0).

> Sem IP elástico, o IP muda quando a instância reinicia. Nesse caso, rode `servidor/duckdns.sh` a cada 5 minutos pelo cron (instruções dentro do arquivo).

## 3. Instalar

Entre na instância por SSH e rode os comandos abaixo, um de cada vez.

```bash
sudo apt-get update && sudo apt-get install -y git
```

```bash
sudo git clone https://github.com/Brendonjose/Plano-ataque-ascen /opt/plano-ataque-repo
```

```bash
cd /opt/plano-ataque-repo
```

```bash
sudo ./servidor/instalar.sh --dominio planoventisette.duckdns.org --admin-email SEU_EMAIL
```

O script pede a **senha do administrador**. Use pelo menos 12 caracteres, sem aspas nem barra invertida. Guarde essa senha com cuidado: ela também é a senha do painel técnico.

Depois de 1 ou 2 minutos, abra `https://planoventisette.duckdns.org`.

> Se o repositório for privado, o `git clone` pede login. Use um *Personal Access Token* do GitHub com permissão só de leitura.

## 4. Carga inicial (uma vez só)

1. Entre no site com o e-mail e a senha do administrador.
2. Clique em **Importar planilha (.xlsx)** e escolha a `Plano_de_Ataque_v6.xlsx` mais recente.
3. Confira o Painel e o Acompanhamento.

A importação só funciona uma vez. Depois dela, o sistema passa a ser a única fonte dos dados.

## 5. Criar os usuários

1. No menu, abra **Usuários → Novo usuário**.
2. Preencha nome, e-mail, senha inicial e perfil:
   - **Obra**: engenheiros, mestres e estagiários. Lançam o avanço, atualizam equipes e cuidam das pendências.
   - **Diretoria**: só consulta.
   - **Empreiteira**: só consulta. Em **Empresa**, escreva o nome igual ao da planilha, por exemplo `Camargo`. Ela entra direto no Acompanhamento da empresa e tem o próprio relatório.
3. Passe para cada pessoa o endereço do site, o e-mail e a senha inicial.
4. Peça que cada uma troque a senha em **Minha conta**.

## 6. Atualizar o sistema (quando houver versão nova)

Rode os dois comandos abaixo, um de cada vez:

```bash
cd /opt/plano-ataque-repo && sudo git pull
```

```bash
sudo ./servidor/instalar.sh --dominio planoventisette.duckdns.org --admin-email SEU_EMAIL
```

Os dados não são apagados. O script atualiza as telas, aplica as mudanças do banco e reinicia o serviço.

## Para manter tudo seguro

Veja o roteiro em [OPERACAO.md](OPERACAO.md).
