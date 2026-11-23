#!/usr/bin/env bash
# Instala ou atualiza o Plano de Ataque numa EC2 Ubuntu (PocketBase + HTTPS automático).
# Pode rodar de novo quantas vezes quiser: atualiza sem apagar os dados.
#
# Uso: sudo ./servidor/instalar.sh --dominio NOME.duckdns.org --admin-email EMAIL [--admin-senha SENHA] [--simular]
set -euo pipefail

DIR_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO=/opt/plano-ataque
USUARIO=pocketbase
DOMINIO="" ; ADMIN_EMAIL="" ; ADMIN_SENHA="" ; SIMULAR=0

uso() { echo "Uso: sudo $0 --dominio NOME.duckdns.org --admin-email EMAIL [--admin-senha SENHA] [--simular]"; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dominio) DOMINIO="${2:-}"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="${2:-}"; shift 2 ;;
    --admin-senha) ADMIN_SENHA="${2:-}"; shift 2 ;;
    --simular) SIMULAR=1; shift ;;
    -h|--help) uso; exit 0 ;;
    *) echo "Opção desconhecida: $1"; uso; exit 2 ;;
  esac
done
if [[ -z "$DOMINIO" || -z "$ADMIN_EMAIL" ]]; then uso; exit 2; fi
if [[ ! "$DOMINIO" =~ ^[a-z0-9.-]+$ ]]; then echo "Domínio inválido: $DOMINIO"; exit 2; fi
if [[ -z "$ADMIN_SENHA" && $SIMULAR -eq 0 ]]; then
  read -r -s -p "Senha do administrador (mínimo 12 caracteres): " ADMIN_SENHA; echo
fi
if [[ $SIMULAR -eq 0 || -n "$ADMIN_SENHA" ]] && [[ ${#ADMIN_SENHA} -lt 12 ]]; then
  echo "A senha do administrador precisa ter pelo menos 12 caracteres."; exit 2
fi

if [[ "$ADMIN_SENHA" == *'"'* || "$ADMIN_SENHA" == *'\'* ]]; then echo "A senha não pode ter aspas (\") nem barra invertida (\\)."; exit 2; fi
passo() { echo "[$1/8] $2"; }
rodar() { if [[ $SIMULAR -eq 1 ]]; then echo "      (simulação) $*"; else "$@"; fi; }
if [[ $SIMULAR -eq 0 && $EUID -ne 0 ]]; then echo "Rode com sudo."; exit 1; fi

passo 1 "Criar o usuário de sistema '$USUARIO' (sem login) e a pasta $DESTINO"
if ! id "$USUARIO" >/dev/null 2>&1; then rodar useradd --system --home "$DESTINO" --shell /usr/sbin/nologin "$USUARIO"; fi
rodar mkdir -p "$DESTINO/pb_data"

passo 2 "Baixar o PocketBase (versão fixada) e conferir o checksum"
rodar apt-get install -y -qq curl unzip
rodar bash "$DIR_REPO/servidor/baixar-pocketbase.sh" "$DESTINO"

passo 3 "Copiar as telas, as migrações e os ganchos"
rodar rm -rf "$DESTINO/pb_public" "$DESTINO/pb_migrations" "$DESTINO/pb_hooks"
rodar cp -r "$DIR_REPO/app" "$DESTINO/pb_public"
rodar cp -r "$DIR_REPO/servidor/pb_migrations" "$DESTINO/pb_migrations"
rodar cp -r "$DIR_REPO/servidor/pb_hooks" "$DESTINO/pb_hooks"
rodar chown -R "$USUARIO:$USUARIO" "$DESTINO"
rodar chmod 700 "$DESTINO/pb_data"

ARGS=(--dir "$DESTINO/pb_data" --publicDir "$DESTINO/pb_public" --migrationsDir "$DESTINO/pb_migrations" --hooksDir "$DESTINO/pb_hooks")
passo 4 "Aplicar as migrações do banco (cria ou atualiza as tabelas)"
rodar sudo -u "$USUARIO" "$DESTINO/pocketbase" migrate up "${ARGS[@]}"

passo 5 "Instalar o serviço systemd (inicia sozinho e reinicia se cair) para https://$DOMINIO"
UNIT=/etc/systemd/system/plano-ataque.service
if [[ $SIMULAR -eq 1 ]]; then
  echo "      (simulação) gerar $UNIT a partir de servidor/pocketbase.service.modelo"
else
  sed -e "s#__DOMINIO__#$DOMINIO#g" -e "s#__DESTINO__#$DESTINO#g" -e "s#__USUARIO__#$USUARIO#g" "$DIR_REPO/servidor/pocketbase.service.modelo" > "$UNIT"
fi
rodar systemctl daemon-reload
rodar systemctl enable plano-ataque
rodar systemctl restart plano-ataque

passo 6 "Firewall (portas 22, 80 e 443) e atualizações automáticas de segurança do Ubuntu"
rodar apt-get install -y -qq ufw unattended-upgrades
rodar ufw allow 22/tcp
rodar ufw allow 80/tcp
rodar ufw allow 443/tcp
rodar ufw --force enable
rodar dpkg-reconfigure -f noninteractive unattended-upgrades

passo 7 "Backup automático diário (3h, guarda 7 cópias em $DESTINO/pb_data/backups)"
echo "      (configurado pela migração 1700000003_backups.js)"

passo 8 "Criar o superusuário e o primeiro administrador do sistema ($ADMIN_EMAIL)"
if [[ $SIMULAR -eq 1 ]]; then
  echo "      (simulação) pocketbase superuser upsert $ADMIN_EMAIL ********"
  echo "      (simulação) criar usuário admin $ADMIN_EMAIL no sistema"
else
  sudo -u "$USUARIO" "$DESTINO/pocketbase" superuser upsert "$ADMIN_EMAIL" "$ADMIN_SENHA" "${ARGS[@]}" >/dev/null
  # Espera o servidor responder (o certificado HTTPS pode levar alguns segundos na primeira vez).
  for _ in $(seq 1 60); do curl -fsS "https://$DOMINIO/api/health" >/dev/null 2>&1 && break; sleep 2; done
  TOKEN=$(curl -fsS -X POST "https://$DOMINIO/api/collections/_superusers/auth-with-password" \
    -H 'Content-Type: application/json' --data-binary @- <<<"{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_SENHA\"}" | sed -E 's/.*"token":"([^"]+)".*/\1/')
  EXISTE=$(curl -fsS -G "https://$DOMINIO/api/collections/users/records" -H "Authorization: $TOKEN" --data-urlencode "filter=email='$ADMIN_EMAIL'" | grep -c '"totalItems":0' || true)
  if [[ "$EXISTE" == "1" ]]; then
    curl -fsS -X POST "https://$DOMINIO/api/collections/users/records" -H "Authorization: $TOKEN" -H 'Content-Type: application/json' --data-binary @- >/dev/null <<<"{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_SENHA\",\"passwordConfirm\":\"$ADMIN_SENHA\",\"nome\":\"Administrador\",\"papel\":\"admin\",\"ativo\":true,\"verified\":true}"
    echo "      Administrador criado."
  else
    echo "      Administrador já existia (nada mudou)."
  fi
fi

echo
echo "Pronto. Abra https://$DOMINIO e entre com $ADMIN_EMAIL."
echo "Painel técnico do PocketBase (só para emergências): https://$DOMINIO/_/"
