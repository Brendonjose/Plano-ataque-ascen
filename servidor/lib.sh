#!/usr/bin/env bash
# Funções usadas pelo instalar.sh.

# esperar_https URL [TENTATIVAS] [INTERVALO_SEG]: espera o site responder; se não responder, explica o que conferir.
esperar_https() {
  local url="$1" tentativas="${2:-60}" intervalo="${3:-2}" i
  for ((i = 0; i < tentativas; i++)); do
    if curl -fsS "${url%/}/api/health" >/dev/null 2>&1; then return 0; fi
    sleep "$intervalo"
  done
  echo
  echo "ERRO: o site $url não respondeu em HTTPS."
  echo "  Confira: (1) no DuckDNS, o domínio aponta para o IP elástico desta EC2;"
  echo "           (2) no Security Group, as portas 80 e 443 estão abertas para todos."
  echo "  Depois rode o instalar.sh de novo (nada se perde)."
  return 3
}

# carimbar_versao INDEX_HTML VERSAO: acrescenta ?v=VERSAO aos arquivos locais (js, css, config) do index.html,
# para o navegador baixar tudo de novo depois de cada atualização (sem misturar arquivo novo com antigo do cache).
carimbar_versao() {
  local arq="$1" versao="$2"
  sed -i -E "s#(src|href)=\"((js|css|vendor|img)/[^\"?]+|config\.js)(\?v=[^\"]*)?\"#\1=\"\2?v=${versao}\"#g" "$arq"
}
