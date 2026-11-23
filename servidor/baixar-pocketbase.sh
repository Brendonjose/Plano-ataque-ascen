#!/usr/bin/env bash
# Baixa o PocketBase na versão fixada e confere o checksum.
# Uso: servidor/baixar-pocketbase.sh <pasta-destino>
set -euo pipefail
DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=versao.env
source "$DIR_SCRIPT/versao.env"
DESTINO="${1:?informe a pasta de destino}"
mkdir -p "$DESTINO"
if [[ -x "$DESTINO/pocketbase" ]] && "$DESTINO/pocketbase" --version | grep -q "$PB_VERSAO"; then
  exit 0
fi
ZIP="$DESTINO/pocketbase_${PB_VERSAO}.zip"
curl -fsSL -o "$ZIP" "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSAO}/pocketbase_${PB_VERSAO}_linux_amd64.zip"
echo "${PB_SHA256}  ${ZIP}" | sha256sum -c --quiet -
unzip -oq "$ZIP" pocketbase -d "$DESTINO"
rm -f "$ZIP"
chmod +x "$DESTINO/pocketbase"
