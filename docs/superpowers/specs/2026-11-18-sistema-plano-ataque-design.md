# Sistema Plano de Ataque — Edifício Ventisette (ASCEN) — Desenho

Data: 18/11/2026 · Autor do pedido: Brendon (engenharia ASCEN)
Referências: `referencia/CONTEXTO_PROJETO.md` (memória completa do projeto) e `referencia/Plano_de_Ataque_v6.xlsx`
(planilha vigente, com os lançamentos do Brendon).

## 1. Intenção (o porquê)

A planilha v6 já calcula tudo o que a obra precisa: status, liberação, prazos por prumada, projeção, folga,
mão de obra, ranking, vendidos e pendências. O problema é o uso do dia a dia. Para lançar um avanço, a pessoa
navega por várias abas até chegar no serviço. Além disso, o Excel 2010 limita o visual e as fórmulas.

O sistema substitui o lançamento diário e a leitura dos painéis por uma aplicação no navegador. Ela precisa ser
bonita para mostrar à diretoria e simples para qualquer pessoa preencher. A planilha continua existindo como
exemplo, como carga inicial e como exportação (relatório e backup).

## 2. Objetivos, não objetivos e antiobjetivos

**Objetivos**
- Lançar o avanço do dia em poucos toques: escolher o serviço, tocar no apartamento e marcar.
- Mostrar as datas de finalização, os prazos e quem está atrasado ou adiantado, por serviço, prumada,
  empreiteira e apartamento.
- Ter os mesmos indicadores, gráficos, filtros e visões da v6, com os mesmos números.
- Rodar no computador do Brendon com dois cliques, sem instalar nada e sem internet.
- Deixar o sistema pronto para, no futuro, várias pessoas lançarem os dados.

**Não objetivos (v1)**
- Multiusuário agora: um usuário, um computador.
- Bloco financeiro das abas (orçamento × levantamento, desvio). Fica fora da v1.
- Editar o `.xlsx` original. O sistema exporta uma planilha nova, não altera a v6.

**Antiobjetivos (o que faria o sistema falhar, mesmo funcionando)**
- Números diferentes da planilha sem explicação.
- Lançar exigir mais passos do que hoje, ou exigir saber códigos (1/2/4/5…).
- Lançar em dois lugares (sistema e planilha). A partir da implantação, o lançamento é só no sistema.
- Perder dados por limpeza do navegador sem aviso.

## 3. Restrições

- Abre por `file://` no Chrome ou no Edge do Windows. Sem servidor e sem Node para o usuário final.
  Por isso: scripts clássicos (sem módulos ES, que não carregam por `file://`) e bibliotecas copiadas para a
  pasta (`vendor/`), sem CDN.
- Idioma pt-BR e datas DD/MM/AAAA.
- Regras de cálculo = as da v6 (`CONTEXTO_PROJETO.md` §3–§5), incluindo as convenções mantidas de propósito
  (ex.: a data-limite desconta também o prazo do próprio serviço).
- Feriados = lista das abas (B37:B60), editável.

## 4. Abordagens consideradas

| Abordagem | Prós | Contras |
|---|---|---|
| **A. Página no navegador, dados locais + importação/exportação de Excel** (escolhida) | Zero instalação, offline, rápida de usar e de repassar. A camada de dados isolada permite migrar depois. | Os dados ficam no navegador; exige backup (mitigado por aviso e botão). |
| B. Python + SQLite no PC, acesso pela rede | Mais perto de um sistema multiusuário. | Exige instalar o Python e abrir uma janela de comando; mais manutenção. |
| C. Google Planilhas + Apps Script | Online e multiusuário de imediato. | Tira os dados do Excel; não é o caso de uso atual. |

O Brendon escolheu a **A** em 18/11/2026: "a princípio somente eu no meu computador, deixe de alguma forma que
futuramente consiga lançar para que todos preencham".

## 5. O que foi decidido

### 5.1 Telas (menu lateral; no celular vira menu inferior)

1. **Lançar** (tela inicial do dia a dia)
   - Fita com os 12 serviços em sequência, cada um com o seu % concluído. Ao escolher um, aparece a grade
     Pavimento × Final igual à da planilha (pav. 27 no topo; pav. 21–27 só finais 1 e 2).
   - Cada célula mostra o número do apto e uma cor de status. Tocar na célula abre um menu curto com
     **Concluído · Em andamento · Cancelado · Limpar**, mais data de conclusão real e observação (opcionais).
   - Piso: "Concluído — DS Alencar" ou "Concluído — Juninho" (a empreiteira vem do lançamento).
     Rejunte: Rejuntado, Rejuntando ou Sem rejunte, também por empreiteira (equivale aos códigos 1–6).
   - **"ok" e "N/L" são automáticos** (decisão do Brendon): o sistema calcula se o apto está Liberado ou
     Bloqueado pelas dependências, pela cascata do "canc" e pelo escopo de vendidos. Ninguém digita isso.
     A célula bloqueada mostra o motivo (ex.: "Aguardando portas"). O valor lançado sempre vale mais do que o
     automático, como na planilha.
   - Segundo modo, **Por apartamento**: escolhe o apto e vê os 12 serviços dele, com status e data prevista.
   - Desfazer o último lançamento.
2. **Painel** (= DASHBOARD EXECUTIVO): 8 filtros (Empreiteira, Torre, Pavimento, Serviço, Status, Período
   de/até da data-limite, Prumada), 8 KPIs, prazos por prumada e data macro, risco de prazo e mão de obra por
   serviço, 7 gráficos (status; % por empreiteira; atrasados × vencendo por empreiteira; evolução semanal
   previsto × realizado; previsto hoje × realizado por serviço; torre e prumadas; % por pavimento) e a lista
   de serviços críticos.
3. **Macro e Quadros** (= PAINEL MACRO + QUADRO F1–F4): visão geral, prazo por prumada, matriz Etapa ×
   Prumada (% ok, término, folga) e quadro por prumada (1 apto por linha, 1 etapa por coluna, "ok" ou data,
   vermelho após o limite). Inclui o seletor **Cenário atual / Necessário** e as colunas manuais (Caixilhos,
   Bancadas, Rodapé, Check list civil, Espelhos, Caix. Gourmet/Técnica, Retoque), editáveis no quadro.
4. **Cronograma** (= CRONOGRAMA): metas (macro e por prumada), prioridades, e por serviço o prazo, a
   produtividade, as unidades por apto e a equipe atual (editáveis). Mostra os cálculos: datas-limite, saldo,
   término encadeado, folga, mão de obra necessária e atraso gerado. Mudar a equipe recalcula na hora, o que
   permite simular cenários.
5. **Estratégia** (= ESTRATÉGIA): grade V/N de vendidos, escopo Todos/Vendidos e "segue prioridade de
   prumada?" por serviço, e o resultado do cenário.
6. **Ranking** (= RANKING EMPREITEIRAS): critérios C1, C2 e C3 com os pesos da configuração, a tabela e o
   gráfico.
7. **Pendências** (= PENDÊNCIAS): lista com filtro, cadastro rápido (apto, etapa, descrição, responsável,
   abertura, prazo, status), totais de abertas, resolvidas e atrasadas.
8. **Histórico** (= HISTÓRICO): curva semanal previsto × realizado. O botão **Registrar semana** grava o
   % de hoje, sem copiar e colar.
9. **Configurações e Dados**: torre, data-base, janela de alerta, pesos do ranking, empreiteiras por
   serviço, feriados. Importar a planilha `.xlsx` (v6), exportar para `.xlsx`, salvar e restaurar backup
   (`.json`), aviso de backup atrasado e uma opção "data de hoje" para conferência (padrão = hoje real).

### 5.2 Dados (o "banco")

Só as **entradas** são guardadas; tudo o mais é recalculado a cada mudança, igual à planilha:
- `lancamentos[servico][apto]` = { código, data conclusão real, observação, empreiteira (piso/rejunte) }
- `config` (torre, data-base, janela, pesos, nota zero de prazo = 60 dias), `feriados[]`
- `cronograma` (metas, prioridades; por serviço: prazo, unid./apto, produtividade, equipe, empreiteira)
- `piso` (produtividades DS/Juninho, equipes, aptos repassados), `estrategia` (V/N por apto, escopo e
  prumada por serviço), `quadros_manuais[apto][etapa]`, `pendencias[]`, `historico[]`

A camada de armazenamento tem uma interface única (`carregar`, `salvar`, `exportar`). A v1 grava no
`localStorage` do navegador. No futuro, a mesma interface pode gravar num servidor ou no Google Planilhas,
sem mudar as telas.

### 5.3 Motor de cálculo

O motor é JavaScript puro, sem tela, e reproduz a v6: BASE (status, consolidado, detalhe, data-limite,
atraso, vencimento, previsto hoje, posição na fila, término por apto, data necessária), CRONOGRAMA (saldos,
ritmo, inclusive a cota DS × Juninho do piso, início, término por capacidade e encadeado, folga, mão de obra,
atraso gerado, fator da data necessária), ESTRATÉGIA, RANKING e PAINEL MACRO. Usa WORKDAY e NETWORKDAYS com
os feriados.

**Critério de aceite:** com a data de hoje fixada em 17/11/2026 e os dados importados da v6, o motor
reproduz os valores gravados na planilha (KPIs, tabela por serviço, prumadas, ranking, datas por apto).
Toda diferença é explicada, ou corrigida antes da entrega. Testes automatizados em Node comparam com os
valores extraídos do `.xlsx`.

### 5.4 Visual

Paleta da planilha (azul-marinho, branco, cinza; verde, amarelo e vermelho para status), logos ASCEN e
Ventisette, cartões de KPI, tema claro e escuro, e layout responsivo (funciona no celular para o futuro).
Gráficos com Chart.js; leitura e escrita de Excel com SheetJS (as duas bibliotecas ficam na pasta `vendor/`).

## 6. Deixado para quem constrói

- Layout fino de cada tela, ícones e microtextos (frases curtas, no estilo ASD-STE100 do Brendon).
- Formato exato da planilha exportada. Mínimo: uma aba por serviço no formato da grade, a BASE com status e
  datas, pendências e histórico.
- Como mapear a importação célula a célula da v6, seguindo `CONTEXTO_PROJETO.md` §3–§4.

## 7. Decisões que o construtor tomou (para o Brendon conferir)

- Financeiro fora da v1.
- Exportar não sobrescreve a v6: gera um arquivo novo com data.
- Metas, prioridades e equipes vêm da v6 importada (hoje: F3/F4 20/01/2027, F1/F2 e obra 15/03/2027).
- Pontos em aberto do `CONTEXTO_PROJETO.md` §10 (ex.: "Ramos " × "Ramos Empreiteira") são importados como
  estão e podem ser ajustados em Configurações.
