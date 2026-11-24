# Plano de Ataque — Edifício Ventisette (ASCEN)

Sistema para acompanhar os **serviços finais da obra**: datas de finalização, prazos, quem está atrasado ou adiantado, mão de obra necessária e entrega por prumada. Ele substitui o lançamento diário e os painéis da planilha `Plano_de_Ataque_v6.xlsx` e faz **os mesmos cálculos** que ela.

## Versão online (todos acessam)

O sistema também roda num servidor (EC2), com login e perfis:

| Perfil | Pode fazer |
|---|---|
| **Administrador** | Tudo: metas, equipes, vendidos, usuários e importação |
| **Obra** | Lançar, atualizar as equipes e cuidar das pendências |
| **Diretoria** | Só consulta |
| **Empreiteira** | Só consulta; entra no Acompanhamento da própria empresa e tira o próprio relatório |

- Os lançamentos aparecem ao vivo para todos.
- Se a internet cair, ficam guardados no aparelho e são enviados quando ela voltar.
- Para instalar, siga o [DEPLOY.md](DEPLOY.md). Para manter seguro, siga o [OPERACAO.md](OPERACAO.md).

Telas novas da versão 2:
- **Acompanhamento:** executado, em execução, liberado e bloqueado por serviço, prumada, empreiteira e pavimento, com a lista dos aptos.
- **Relatórios:** por empreiteira e prumada, com a data em que cada apto precisa estar pronto. Imprime em PDF ou baixa em Excel.
- **Pendências no Painel**, com o sinal ⚠ nos aptos que têm pendência aberta.
- **Usuários, Minha conta e Alterações:** quem mudou o quê e quando.

Aberto direto pelo arquivo `index.html`, o sistema continua funcionando como antes, só neste computador.

## Como abrir

1. Baixe esta pasta (ou o repositório) para o seu computador.
2. Abra a pasta `app`.
3. Dê dois cliques em **`index.html`**. O sistema abre no Chrome ou no Edge.

Não precisa instalar nada e funciona sem internet.

Na primeira vez, clique em **Importar planilha (.xlsx)** e escolha a sua `Plano_de_Ataque_v6.xlsx`. A planilha original não é alterada.

## Rotina diária (3 passos)

1. Abra **Lançar**.
2. Escolha o serviço na faixa de cima. Toque no apartamento e escolha **Concluído**, **Em andamento** ou **Cancelado**.
   - "Liberado" e "Bloqueado" são calculados sozinhos a partir dos serviços anteriores.
   - Para lançar vários aptos de uma vez, use **Marcar vários**.
   - Para ver um apto inteiro, use **Por apartamento**.
3. Veja o resultado no **Painel** e em **Macro**. Errou? Clique em **Desfazer** ou use Ctrl+Z.

Uma vez por semana, abra **Histórico** e clique em **Registrar semana**.

## Telas

| Tela | O que faz | Equivale na planilha |
|---|---|---|
| Lançar | Grade Pav × Final por serviço, lançamento por apto ou em lote | Abas de cada serviço |
| Painel | 8 filtros, 8 KPIs, prazos por prumada, risco e mão de obra, 7 gráficos, críticos | DASHBOARD EXECUTIVO |
| Macro | Visão macro e quadros F1–F4 (Cenário atual / Necessário), colunas manuais | PAINEL MACRO, QUADRO F1–F4 |
| Cronograma | Metas, prioridades, prazos, produtividade e equipes; simula na hora | CRONOGRAMA |
| Estratégia | Vendidos (V/N) e escopo por serviço | ESTRATÉGIA |
| Ranking | Desempenho das empreiteiras (C1, C2, C3) | RANKING EMPREITEIRAS |
| Pendências | Lista por apto com cadastro rápido | PENDÊNCIAS |
| Histórico | Curva previsto × realizado | HISTÓRICO |
| Config. | Parâmetros, empreiteiras, feriados, backup, exportar, data de conferência | CONFIG |

## Seus dados

- Os dados ficam guardados **no navegador deste computador**. Use sempre o mesmo navegador. Não use janela anônima.
- **Backup:** clique em **Backup** (no topo) pelo menos uma vez por semana. O sistema avisa quando o último backup tem mais de 7 dias. Para recuperar, use Config. → Restaurar backup.
- **Exportar para Excel:** Config. → Exportar. Gera um arquivo novo (`Plano_de_Ataque_AAAA-MM-DD.xlsx`) com resumo, grades, BASE, cronograma, pendências e histórico. Esse arquivo também pode ser importado de volta sem perder nada.
- **Importar de novo:** substitui os dados atuais. O sistema baixa um backup automático antes.

## Como os números são conferidos

Os testes automáticos comparam o sistema com a planilha v6:

- **Valores gravados:** com a data de 17/11/2026, o sistema reproduz os valores que a v6 tinha gravados.
- **Status e datas:** são comparados os 1.128 itens da BASE, o CRONOGRAMA inteiro, o painel, os quadros, a estratégia, o ranking, as pendências e o histórico.
- **Simulações:** cinco cenários (lançar, cancelar, mudar equipe, só vendidos, quadro F4) são rodados também com as **fórmulas originais da v6**, para comparar os dois resultados.

```bash
npm install
npm test
node --test tests/cenarios.test.js
npm run e2e
```

## Para vários usuários no futuro

Toda a leitura e gravação dos dados passa por `app/js/armazenamento.js`, nos métodos `carregar` e `salvar`. Para todos lançarem os dados, basta trocar esse arquivo por um que grave num servidor ou no Google Planilhas. As telas e o motor de cálculo não mudam.

## Estrutura

- `app/`: o sistema.
  - `index.html`: página principal.
  - `js/motor/`: cálculos.
  - `js/ui/`: telas.
  - `vendor/`: Chart.js e SheetJS.
- `tests/`: testes do motor e das telas, mais o "oráculo" que roda as fórmulas originais da v6.
- `referencia/`: a planilha v6, as fórmulas de cada aba, a memória do projeto e as logos.
- `docs/superpowers/`: desenho e plano de implementação.
