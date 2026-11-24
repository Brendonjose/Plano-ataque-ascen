# Manter o Plano de Ataque no ar com segurança

Roteiro curto para o administrador. Os comandos são rodados na EC2, por SSH. Rode um de cada vez.

## Toda semana (5 minutos)

- [ ] **Baixe um backup para o seu computador.**
  - Abra `https://SEUSITE/_/` e entre com o e-mail e a senha do administrador.
  - Vá em **Settings → Backups**: os backups diários aparecem ali.
  - Baixe o mais recente e guarde **fora da EC2** (seu computador, OneDrive ou Google Drive).
  - Se a instância for perdida, esse arquivo é a sua cópia.
- [ ] **Confira se o site está no ar:** abra o endereço e veja se o Painel carrega.
- [ ] **Exporte o Excel** (Config. → Exportar para Excel). É uma cópia legível, que qualquer pessoa abre.

## Todo mês (15 minutos)

- [ ] **Atualizações do sistema operacional.** As de segurança já são automáticas. Para aplicar as restantes e reiniciar:

  ```bash
  sudo apt-get update && sudo apt-get -y upgrade
  ```

  ```bash
  sudo reboot
  ```

  O serviço volta sozinho depois do reinício.
- [ ] **Espaço em disco.** Se passar de 80%, apague backups antigos no painel `/_/`.

  ```bash
  df -h /
  ```

- [ ] **Usuários.** Em **Usuários**, desative quem saiu da obra ou da empreiteira (desmarque "Ativo"). Não apague: o histórico guarda o nome de quem lançou.
- [ ] **Histórico de alterações.** Dê uma olhada em **Alterações** para ver se há algo fora do normal.

## Atualizar o sistema

Rode os dois comandos abaixo, um de cada vez:

```bash
cd /opt/plano-ataque-repo && sudo git pull
```

```bash
sudo ./servidor/instalar.sh --dominio SEUSITE --admin-email SEU_EMAIL
```

A versão do PocketBase é fixa em `servidor/versao.env`. **Não troque essa versão por conta própria**: versões novas podem mudar regras. A troca vem pronta numa atualização do repositório, já testada.

## Se o site cair

1. Veja o estado do serviço:

   ```bash
   sudo systemctl status plano-ataque
   ```

2. Veja as últimas mensagens:

   ```bash
   sudo journalctl -u plano-ataque -n 100
   ```

3. Reinicie:

   ```bash
   sudo systemctl restart plano-ataque
   ```

4. Se o problema for o certificado HTTPS, confira se o DuckDNS ainda aponta para o IP elástico da instância e se as portas 80 e 443 estão abertas no Security Group.

Enquanto o site estiver fora, a obra pode continuar lançando nas páginas que já estavam abertas. Os lançamentos ficam guardados no aparelho e são enviados quando o servidor voltar.

## Restaurar um backup

1. Entre no painel técnico `https://SEUSITE/_/` → **Settings → Backups**.
2. Escolha o backup e clique em **Restore**. O serviço reinicia sozinho.
3. Se o backup estiver só no seu computador, use **Upload backup** antes.

## Trocar ou revogar acessos

- **Alguém saiu:** em Usuários, desmarque **Ativo**. A pessoa perde o acesso na hora, mesmo que esteja com o site aberto.
- **Senha esquecida:** em Usuários → Editar, digite uma nova senha e passe para a pessoa.
- **Senha do administrador vazou:** troque a sua em **Minha conta** e a do painel técnico:

  ```bash
  sudo -u pocketbase /opt/plano-ataque/pocketbase superuser update SEU_EMAIL NOVA_SENHA --dir /opt/plano-ataque/pb_data
  ```

## O que já vem protegido

- **Firewall ligado:** só as portas 22, 80 e 443 ficam abertas.
- **Atualizações de segurança** do Ubuntu automáticas.
- **HTTPS automático**, com renovação do certificado.
- **O serviço roda sem ser root** e só escreve na própria pasta de dados.
- **Permissões checadas no servidor:**
  - diretoria e empreiteiras não conseguem alterar nada, nem chamando o servidor direto;
  - ninguém muda o próprio perfil.
- **Senha errada repetida:** muitas tentativas seguidas são bloqueadas por alguns minutos.
- **Autoria e histórico:** cada alteração guarda quem fez e quando.
- **Backup automático diário**, com 7 cópias.

## Riscos que dependem de você

- **O painel técnico `/_/` fica acessível pela internet,** protegido pela senha e pelo limite de tentativas. Use uma senha forte e única.
- **Os backups ficam na própria EC2.** Por isso, baixe um por semana para fora dela.
- **O acesso SSH (porta 22)** deve ficar liberado só para o seu IP no Security Group.

## Atualizar com segurança e voltar atrás

Antes de instalar uma versão nova:

1. **Faça um backup dos dados agora:** painel técnico `https://SEUSITE/_/` → **Settings → Backups → Initialize new backup**. Baixe o arquivo para o seu computador.
2. Atualize normalmente (seção "Atualizar o sistema").

Se não gostar da versão nova, volte para a anterior. A versão 2 está guardada na branch `backup/v2-estavel`. Rode na EC2, um comando de cada vez:

```bash
cd /opt/plano-ataque-repo && sudo git fetch origin && sudo git checkout backup/v2-estavel
```

```bash
sudo ./servidor/instalar.sh --dominio SEUSITE --admin-email SEU_EMAIL
```

- **Lançamentos feitos depois da atualização continuam valendo.** Os dados não são apagados ao voltar o código.
- **Para voltar também os dados** ao ponto anterior, restaure no painel `/_/` o backup do passo 1. Isso apaga o que foi lançado depois dele.
- **Para voltar a seguir a versão nova depois:** `sudo git checkout main && sudo git pull` e rode o instalador de novo.
