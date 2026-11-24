#!/usr/bin/env bash
# Atualiza o IP no DuckDNS. Só é necessário se a EC2 NÃO tiver IP elástico (o IP muda ao reiniciar).
# Uso (cron a cada 5 min): */5 * * * * /opt/plano-ataque-repo/servidor/duckdns.sh NOME TOKEN
set -euo pipefail
NOME="${1:?informe o subdomínio (sem .duckdns.org)}"; TOKEN="${2:?informe o token do DuckDNS}"
curl -fsS "https://www.duckdns.org/update?domains=${NOME}&token=${TOKEN}&ip=" | grep -q OK
