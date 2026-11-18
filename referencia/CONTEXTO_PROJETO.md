# CONTEXTO DO PROJETO — Plano de Ataque / Recuperação de prazo — Edifício Ventisette (ASCEN)

> Pacote gerado em 18/11/2026 a partir de uma conversa longa no Claude (10/11 a 18/11/2026).
> Este arquivo é a memória completa do projeto. Leia-o inteiro antes de mexer em qualquer arquivo.
> Tudo o que foi entregue está nesta pasta (ver "Índice de arquivos" no fim).

---

## 0. Como trabalhar neste projeto (instruções para o Claude Code)

- **Idioma:** responda sempre em **português do Brasil**. Datas no formato **DD/MM/AAAA**.
- **Arquivo vivo:** a planilha atual é `01_planilha_atual/Plano_de_Ataque_v6.xlsx`. Se o Brendon mandar uma cópia mais nova
  (ele lança avanços diariamente), trabalhe SEMPRE sobre a cópia dele e preserve todos os lançamentos.
- **Excel do usuário = Excel 2010** (AppVersion 14.0300, calcId 144525). NÃO use funções posteriores ao 2010:
  MINIFS, MAXIFS, IFS, SWITCH, TEXTJOIN, CONCAT, XLOOKUP, XMATCH, FILTER, SORT, UNIQUE, SEQUENCE, LET. Use SUMPRODUCT,
  COUNTIFS, INDEX/MATCH, fórmulas matriciais {=MIN(IF(...))}. (Já houve um bug real por MINIFS — ver §6.)
- **Não faça "round-trip" com openpyxl no arquivo do usuário.** A partir da v4 todas as edições foram feitas
  **editando o XML do .xlsx diretamente** (scripts em `06_scripts/`, classe `Sheet` em `xl.py`), porque o openpyxl
  perde as validações x14 (listas dos filtros do dashboard que apontam para outras abas) e pode estragar gráficos.
  openpyxl só para LER (dois passes: fórmulas e `data_only=True`).
- **Recalcular para testar:** LibreOffice headless (`06_scripts/recalc_libreoffice.py` era o script do ambiente; no Claude
  Code use `soffice --headless --convert-to xlsx` numa cópia). O arquivo entregue tem `fullCalcOnLoad="1"`: o Excel recalcula
  ao abrir. Lembrar o usuário de clicar em **"Habilitar Edição"** (no modo protegido os números aparecem zerados).
- **Fórmulas usam TODAY():** os resultados mudam a cada dia. Para comparar versões, recalcule as duas no mesmo dia.
- **Sempre testar** antes de entregar: zero erros (#REF!, #VALUE!, #NAME?), comparação com a versão anterior (o que não deveria
  mudar não mudou), e testes funcionais (filtros, "canc", mudança de status, simulação de cenários). Registrar cada célula
  alterada na aba GUIA (seção "Registro de alterações").
- **Preservar** estrutura, lógica, nomes de abas e fórmulas que funcionam. Não recriar do zero. Não renomear abas.
- **Estilo do usuário:** gosta de respostas estruturadas, visuais, tabelas, checklists, planilhas e matrizes de decisão.
  Para documentos de campo pediu linguagem **ASD-STE100 em português** (frases curtas, imperativo, uma instrução por frase,
  sempre o mesmo termo). Quer coisas simples de repassar a empreiteiros, mestres e estagiários, e fáceis de explicar à diretoria.

---

## 1. Quem é o usuário e qual é a obra

- **Brendon** — engenheiro orçamentista na construtora **ASCEN**; quer chegar a Diretor de Obras.
- **Obra:** **Edifício Ventisette** (ASCEN). Logos em `04_arquivos_recebidos/` (logo_ASCEN.png, logo_Ventisette.png).
- **Torre única.** Pavimentos 1 a 27. **Finais 1 e 2: pavimentos 1–27 (27 aptos cada). Finais 3 e 4: pavimentos 1–20 (20 cada).**
  Total **94 apartamentos**. Numeração = pavimento×10 + final (ex.: 13 = pav 1 final 3; 271 = pav 27 final 1).
- **Metas:** obra completa (macro) **15/02/2027**; Finais 3 e 4 **18/01/2027**; Finais 1 e 2 **15/02/2027**.
- **Prioridade de prumadas (atual):** Final 4 = 1, Final 3 = 2, Final 2 = 3, Final 1 = 4 (Brendon mudou; o padrão inicial era F3=1, F4=2).
- **Apresentação à diretoria:** 13/11/2026 (plano de recuperação). Contexto anterior do Brendon: levantou o avanço físico real,
  vai medir produtividade em campo por uma semana, montar novo cronograma/EAP abandonando a baseline antiga; frases de alinhamento
  com a equipe ("falta de mão de obra" ou "trava de frente").
- **Vendidos:** 68 de 94 (lista em §5). Decorados 24 e 44 e Modelo 34 (Final 4) tratados como NÃO vendidos.

### Serviços (sequência executiva) e dependências

Piso → Rejunte → Pintura 1ª demão → Portas de madeira → Louças e metais → Limpeza grossa → Checklist rejunte →
Pintura 2ª demão → Limpeza fina → Checklist → Regulagem de caixilhos → Entrega.
Dependências reais: Rejunte depende do Piso; Pintura 1ª NÃO depende do Piso; Portas dependem de Piso+Rejunte+Pintura 1ª;
os demais dependem do imediatamente anterior.

### Empreiteiras (célula K2 de cada aba) e equipes (posição 16–17/11/2026)

| Ordem | Serviço | Aba | Empreiteira | Equipe atual | Célula da equipe | Produtividade (un/func/dia) | Unid./apto | Prazo E (d.ú.) | Ciclo/apto (d.ú.) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Piso | Piso | DS ALENCAR (Q2) e Juninho (T2) | DS 2 + Juninho 4 = 6 | Piso!R15 / Piso!U15 | DS piso 20 m², azulejo 19 m²; Juninho piso 22 (=110/5), azulejo 19 (=95/5) | 205 m² (110 piso + 95 azulejo) | 10 | 10 (Piso!R6) |
| 2 | Rejunte | (Piso, grade I:L) | DS ALENCAR / Juninho (códigos) | 2 (premissa) | CRONOGRAMA!I17 | 0,5 apto/func/dia (Brendon alterou de 1 para 0,5) — PREMISSA | 1 | 0 | 1 |
| 3 | Pintura 1ª demão | Pintura 1° Demão | TROVÃO ENGENHARIA | 3 | L15 | 59,6 m² | 343,5 m² | 5 | 5,76 |
| 4 | Portas de madeira | Portas Mad | W J Instaladora | 2 | L23 | 9 | 12 | 1 | 1,33 |
| 5 | Louças e metais | Louças e Metais | Camargo | 1 | L23 | 1 apto | 1 | 1 | 1 |
| 6 | Limpeza grossa | Limpeza grossa | Ramos Empreiteira | 1 | L23 | 75 m² | 110 m² | 3 | 1,47 |
| 7 | Checklist rejunte | Checklist Rej. | Ascen (própria) | 4 | L23 | 30 m² | 110 m² | 5 | 3,67 |
| 8 | Pintura 2ª demão | Pintura de 2° Demão | Trovão Engenharia | 4 | L23 | 69,9 m² | 343,5 m² | 5 | 4,91 |
| 9 | Limpeza fina | Limpeza fina | "Ramos " (com espaço no fim — confirmar se é a mesma Ramos) | 3 | L23 | 50 m² | 110 m² | 4 | 2,2 |
| 10 | Checklist | Checklist | Ascen | 1 | L23 | 55 m² | 110 m² | 2 | 2 |
| 11 | Regulagem de caixilhos | Regulagem de caixilhos | Diagonal | 1 | L23 | 1 | 1 | 1 | 1 |
| 12 | Entrega | Entrega | Ascen | 1 | L23 | 1 | 0,5 | 2 | 0,5 |

Total equipe atual ≈ 30 pessoas. No original todas as abas a partir de Pintura 1ª tinham K2 = "W G Instaladora" (erro de cópia);
o Brendon corrigiu para os nomes acima em 11/11.

Piso — outros dados da aba Piso: U7 = 25 aptos repassados ao Juninho; Q10 (DS falta executar) e T10 (Juninho falta) calculados;
financeiro: R25 desvio (orçamento − contratado) = 766.865,694 − 996.329,688 = **−229.463,99**; R26 desvio ref = −264.527,99;
R27 dif. total = −35.064. Feriados em B37:B60 de cada aba (inclui 2026 e, desde a v2, 01/01/2027, 08/02/2027, 09/02/2027).

---

## 2. Linha do tempo da conversa (pedido → entrega)

1. **10/11 — Pedido inicial** (prompt completo em `04_arquivos_recebidos/0_prompt_original_projeto_planilha.txt`): aprimorar a
   planilha existente (não criar do zero), diagnóstico (preservar / corrigir / acrescentar), controle por empreiteira, torre,
   pavimento, apto, datas previstas × realizadas, atrasos, bloqueios, saldo, observações; DASHBOARD com 8 KPIs, 7 gráficos,
   painel de críticos, 6 filtros; RANKING de empreiteiras com critérios e pesos explícitos; status Concluído / Em andamento /
   Não iniciado / Atrasado / Bloqueado / Cancelado (em andamento pode estar atrasado; data atingida não conclui); paleta
   azul-marinho/branco/cinza/verde/amarelo/vermelho; validação obrigatória; backup do original.
   → **Entregue v2** (`Plano_de_Ataque_Brendon_v2.xlsx`) + backup do original. Detalhes em §6.
2. **10/11 — Correções pedidas:** excluir a aba "Dashboard" e manter o DASHBOARD EXECUTIVO; inconsistência "Entrega termina
   19/01/2027 mas Checklist rejunte termina 15/07/2027"; prumadas 3 e 4 separadas do resto; mão de obra necessária calculada
   errada; datas por prumada (Final 3, 4, 2, 1) e data macro no dashboard.
   → **Entregue v3** (`Plano_de_Ataque_Brendon_v3.xlsx`): aba CRONOGRAMA (substitui Dashboard), projeção encadeada por prumada,
   mão de obra correta, bloco de prazos por prumada. Resultado na época (prioridade F3→F4→F2→F1): F3 04/02/27 (−17), F4 05/04/27
   (−77), F2 18/06/27 (−123), F1 e obra 02/09/27 (−199). Gerador nº 1: Limpeza grossa (+62 dias, 1 funcionário). Validação: com a
   equipe necessária todas as prumadas cumpriam a meta (obra 10/02/27).
3. **10/11 — Guia passo a passo** para preenchimento, onde ver datas e como repassar a empreiteiros/mestres, em ASD-STE100.
   → **Documento online** "Guia rápido — Plano de Ataque" (cópia em `05_documentos_online/Guia_rapido_Plano_de_Ataque.md`).
4. **11–12/11 — Apresentação PowerPoint** à diretoria como engenheiro de planejamento sênior (datas, gargalos, estratégias,
   ataque aos 68 vendidos + outras estratégias, gráficos, logos ASCEN e Ventisette), sobre a planilha que o Brendon preencheu em
   11/11 (`04_arquivos_recebidos/2_...11-11-2026.xlsx`).
   → **`03_apresentacao/Recuperacao_Prazo_Ventisette.pptx`** (13 slides; texto e dados em `Conteudo_da_apresentacao.md`).
5. **12–13/11 — "De quais equipes são as 12 pessoas?"** → tabela por equipe (§7) → depois **planilha online "Custo do reforço"**
   (`05_documentos_online/Custo_reforco_equipe.md`).
6. **13/11 — "Existem outras estratégias?"** → lista de estratégias (§8).
7. **13–16/11 — Lista da prumada Final 4 por serviço** (uma aba por serviço, apto + data do serviço + data de entrega do apto, para
   empreiteiros/mestres/estagiários) → **planilha online "Programação Final 4"**; depois datas formatadas DD/MM/AAAA
   (`05_documentos_online/Programacao_Final4_por_servico.md`).
8. **16/11 11h42 — Divergências relatadas:** piso no dashboard terminando 08/01 mas aba Piso com DS Alencar 25/01/2027 e Juninho
   30/12/2026; "canc" não alterava os prazos (não dava para simular "só vendidos"). **Estratégias adotadas pela obra:**
   (a) atacar SOMENTE os vendidos a partir do serviço Checklist rejunte; (b) Limpeza grossa em TODOS os aptos; (c) divisão por
   prumada só depois do piso; (d) piso na torre toda conforme liberação de aptos. Pediu também análise do andamento.
   Junto veio de novo o prompt original. → **Entregue v4** (`Plano_de_Ataque_v4.xlsx`), §6.
9. **16/11 15h10 — Segundo dashboard macro** no formato da planilha `ACOMPANHAMENTO DE SERVIÇOS FINAIS` (enviada), lacunas
   preenchidas com as datas do plano, aba de pendências, tudo automatizado; pediu perguntas até 95% de clareza. Respostas do
   Brendon em §9. → **Entregue v5** (`Plano_de_Ataque_v5.xlsx`): PAINEL MACRO, QUADRO F1–F4, PENDÊNCIAS, lista de 68 vendidos.
10. **17/11 — Seletor nos quadros** para alternar entre datas previstas e datas NECESSÁRIAS (ex.: Louças dos aptos 164, 174, 184,
    194, 204 do Final 4 terminam depois do planejado) → **Entregue v6** (`Plano_de_Ataque_v6.xlsx`), seletor em C3.
11. **18/11 — Este pacote** para continuar no Claude Code.

---

## 3. Estrutura da planilha atual (v6) — 26 abas, nesta ordem

| Aba | Para que serve | Onde o usuário digita |
|---|---|---|
| DASHBOARD EXECUTIVO | Painel executivo: subtítulo com escopo ativo (B2); 8 filtros (B5 Empreiteira, D5 Torre, F5 Pavimento, H5 Serviço, J5 Status, L5 Período de, N5 Período até, P5 Prumada — "(Todos)" = sem filtro); 8 KPIs (linha 8: Total, Concluídos, Em andamento, Não iniciados, Atrasados, Bloqueados, % conclusão, Vencimento próximo); alerta de dados (B11); Prazos por prumada e macro (14–19, não filtra); Risco de prazo e mão de obra por serviço (23–35: limites, término, pior folga, situação, equipe atual × necessária, pendentes, %); 7 gráficos (status, % por empreiteira, atrasados×vencendo por empreiteira, evolução semanal previsto×realizado, previsto×realizado por serviço, torre/prumadas, pavimento); Serviços críticos top 20 (90–110). | Só os filtros (amarelos) |
| PAINEL MACRO | Visão geral (meta, término, folga, aptos no escopo, entregues, % itens, pendências abertas/atrasadas); prazo por prumada (linhas 10–14); matriz Etapa × Prumada com % ok, término e folga (linhas 20–31). | Nada |
| QUADRO F1 … QUADRO F4 | Formato do "Acompanhamento de Serviços Finais": 1 apto por linha (linha 8 = pav 1, subindo), 1 etapa por coluna. "ok" = concluído; data = término; "—" = fora do escopo. Linha 4 data-limite, 5 término (previsto/necessário), 6 % concluído, 7 cabeçalho. Coluna A vendido?, B apto, última coluna pendências abertas. **C3 = seletor "Cenário atual" / "Necessário"**. Colunas amarelas manuais: Caixilhos, Bancadas, Rodapé, Check list civil, Espelhos, Caix. Gourmet e Caix. Técnica (só F3/F4), Retoque. Vermelho = data após a data-limite. | C3 e colunas amarelas |
| PENDÊNCIAS | Linhas 6–305: A Nº (auto), B Apto, C Etapa (lista em N), D Descrição, E Responsável, F Abertura, G Prazo, H Status (Aberta/Resolvida), I Resolvida em, J Observação, K Final (auto), L Atrasada? (auto). C3/E3/G3 = abertas/resolvidas/atrasadas. Já lançadas: 203 e 204 "Balancinho ocupando apto., travando demais serviços como piso, pintura, etc." (Geral, Aberta). | B:J |
| GUIA | Instruções, códigos, regras de status, como incluir serviço e **registro de todas as alterações célula a célula** (seções 1–9). | — |
| CRONOGRAMA | Motor de prazos (substituiu a antiga aba "Dashboard"). Ver §4. | D5, D8:D11, E8:E11, E16:E27 (prazos), linha 17 (Rejunte: F17, G17, I17, K17) |
| ESTRATÉGIA | Grade V/N de vendidos (C5:F31; linha = 32 − pav; C..F = finais 1..4); por serviço (linhas 5–16): I = Escopo (Todos/Vendidos), J = Segue prioridade de prumada? (Sim/Não), K = escopo aplicado (Vendidos se ele ou algum anterior for Vendidos), L aptos no escopo, M pendentes, N término, O pior folga; resultado do cenário (H20:N25); contagem V/N (I27:I29); instruções (H36+). | C5:F31, I5:I16, J5:J16 |
| Piso, Pintura 1° Demão, Portas Mad, Louças e Metais, Limpeza grossa, Checklist Rej., Pintura de 2° Demão, Limpeza fina, Checklist, Regulagem de caixilhos, Entrega | Abas originais do Brendon (lançamento diário). Grade C5:F31 (linha = 32 − pavimento; C=final 1 … F=final 4; pav 21–27 só C e D). Piso tem também a grade do rejunte I5:L31 e o bloco de produtividade/financeiro (N:U). Portas…Entrega: fórmulas "ok"/"N/L"/"canc" automáticas — digitar 1/and/canc por cima. K2 empreiteira, L4 produtividade, L5 unid/apto, L6 dias/apto, L23 equipe (P1: L15), L24/L28 mão de obra necessária (vinda do CRONOGRAMA), I11/I16 projeções. | Grades + células de equipe/produtividade |
| RANKING EMPREITEIRAS | Critérios C1 conclusão das frentes liberadas (40%), C2 cumprimento de prazo atual (30%), C3 prazo projetado (30%; folga ≥ 0 → 100%, atraso ≥ 60 d → 0%); tabela de cálculo (linhas 27–36) e ranking ordenado (13–22); gráfico. Produtividade real não entra (sem medição). | Pesos na CONFIG |
| HISTÓRICO | Curva semanal: C5 % realizado hoje, D5 concluídos; linhas 9+ semana, data, % previsto (plano), % realizado registrado (manual, colar como VALOR toda segunda), concluídos registrados, observação. Registros: semana 1 (10/11) 17,6%/198 (retrato inicial); semana 2 (17/11) 20,05%/220 (lançado pelo Brendon). | E:G das semanas |
| BASE | 1.128 linhas (5–1132) = 12 serviços × 94 aptos, geradas por fórmula. Ver §4. | P (data conclusão real) e X (observação/justificativa) |
| CONFIG | C4 Torre ("Torre Única"), C5 data-base 10/11/2026, C6 janela de vencimento 15 dias, C7:C9 pesos do ranking, C10 = 60 dias; tabela de serviços (15–26) e projeção por empreiteira (31–42, lista única de empreiteiras em I31+). | C4:C10 |
| APOIO_DASH | Tabelas dos gráficos e listas dos filtros (P/Q/R/S), curva semanal (linha 61+). | Nada |

### Códigos das grades

| Aba | Código | Significado |
|---|---|---|
| Piso C:F | 1 / 2 | Concluído por DS Alencar / Juninho |
| Piso I:L (rejunte) | 1/2/3 | DS: rejuntado / rejuntando / sem rejunte (liberado) |
| Piso I:L | 4/5/6 | Juninho: rejuntado / rejuntando / sem rejunte |
| Demais | 1 | Concluído |
| Todas | and | Em andamento |
| Todas | canc | Cancelado / fora do escopo (sai do % e, desde a v4, passa para todos os serviços seguintes do apto) |
| Portas … Entrega | ok / N/L | Automático: liberado / não liberado (serviço anterior não concluído) → status Bloqueado |

Regras de status (BASE K/L): Concluído só por código; Bloqueado = N/L (rejunte: piso não feito); Atrasado = não concluído/cancelado
e HOJE > data-limite (sinalizador, coexiste com outros); Vencimento próximo = pendente com limite em até CONFIG!C6 dias.
Data-limite por apto = limite da prumada do apto (CRONOGRAMA L:O). Rejunte usa as datas do Piso.

---

## 4. Lógica de cálculo (motor)

### CRONOGRAMA (linhas 16–27 = serviços 1–12)
- B ordem · C serviço · D aba · **E prazo do serviço (d.ú., entrada)** · F unid/apto · G produtividade · H func-dia/apto (=F/G) ·
  I equipe atual · **J ritmo (aptos/dia) = equipe ÷ func-dia** · K ciclo por apto.
  - **Piso (J16, desde v4):** `(Piso!Q10+Piso!T10)/MAX(Piso!R18,Piso!U18)` — cada empreiteira faz a sua cota; o piso termina na maior
    das duas datas (DS × Juninho), igual à aba Piso.
- **L:O datas-limite F3, F4, F2, F1** = `WORKDAY(meta da prumada, −SUM(prazos E do serviço até a Entrega))` (convenção herdada da aba
  Dashboard original: desconta também o prazo do próprio serviço — ponto levantado ao Brendon, mantido). P = limite F3-4, Q = obra.
  Entrega: limite = meta.
- R:U saldo pendente por prumada (BASE, exclui Concluído e Cancelado) · V liberados agora · **W início projetado** (hoje se há apto
  liberado; senão início do anterior + ciclo).
- X:AA saldo acumulado pela prioridade (`SUMIF` prioridade ≤); quando ESTRATÉGIA!J = "Não" (sem divisão por prumada) usa a
  posição máxima da prumada na fila de baixo para cima da torre inteira (`SUMPRODUCT(MAX(...BASE!AD))`) — desde a v5.
- AB:AE término só por capacidade = `WORKDAY(W, saldo_acum/J)` · **AF:AI término ENCADEADO** = MAX(capacidade; término do anterior
  na mesma prumada + ciclo) — nenhum serviço termina uma prumada antes do anterior · AJ F3-4 · AK todas.
- AL:AO folga (limite − término) · AP pior folga.
- **AQ:AT mão de obra necessária** = `ROUNDUP(saldo_acum × func-dia ÷ NETWORKDAYS(MAX(hoje,início), limite), 0)` ("Sem prazo" se ≤ 0
  dias); se J="Não" usa o limite da obra. AU F3-4, AV todas, AW acréscimo (= AV − equipe).
- AX:BB **atraso gerado** = folga do anterior − folga deste serviço (o "maior gerador" é o serviço que mais acrescenta atraso).
- BC:BF início do serviço em cada prumada (v5) · **BG:BJ fator para data necessária** (v6) =
  `IF(término<=limite, 1, NETWORKDAYS(hoje,limite)/NETWORKDAYS(hoje,término))`.
- Resumo por prumada linhas 32–36 (B prumada, D meta, E término, F folga, G situação, H maior gerador, I aptos no escopo, J entregues).
- Metas D5 (macro), D8:D11 (F3, F4, F2, F1 — F1/F2 = D5 por padrão), prioridades E8:E11, aptos F8:F11. Feriados = Piso!B37:B60.

### BASE (colunas)
A ID · B ordem · C serviço · D empreiteira · E torre · F pavimento · G final · H apto · I grupo (Finais 1-2/3-4) · J código na aba ·
K status · L status consolidado (Atrasado sobrepõe) · M detalhe ("Aguardando portas", etc.) · N início previsto · O data-limite ·
**P data conclusão real (entrada)** · Q dias p/ vencer · R atrasado · S dias de atraso · T vence em breve · U concluído fora do prazo ·
V previsto hoje · W concluído na data-base · **X observação/justificativa (entrada)** · Y alerta de dados · Z filtro do dashboard ·
AA pontuação de risco (críticos) · AB prioridade da fila · AC pendente · AD posição na fila (de baixo para cima) ·
**AE término previsto por apto** · **AF data necessária por apto** (v6).
Linha = 5 + 94×(ordem−1) + índice do apto (ordem dos aptos: pav 27→1, finais 1→4; pav > 20 só finais 1 e 2).
BASE!J de Piso e Pintura 1ª: se fora do escopo e célula vazia → "canc" (grades manuais).

### Datas por apartamento (BASE!AE, v5)
Equipe percorre a prumada **de baixo para cima**. A data é interpolada entre o início do serviço na prumada (CRONOGRAMA BC:BF) e o término
da prumada (AF:AI) pela posição na fila, e nunca fica antes do serviço anterior no mesmo apto + ciclo. O último apto = término da prumada
(testado: 48 pares serviço × prumada, 0 divergências).

### Data necessária (BASE!AF, v6)
1. Comprime a previsão a partir de hoje pelo fator BG:BJ do serviço/prumada (a etapa termina na data-limite).
2. De trás para frente: cada etapa termina no máximo um ciclo (ROUNDUP K do sucessor) antes da etapa seguinte no mesmo apto
   (sucessores: 1→2, 2→4, 3→4, 4→5, …, 11→12).
3. Resultado = MAX(MIN(hoje, previsto), MIN(...)) → nunca depois da prevista; se o limite já passou, mostra hoje.
Teste (17/11): 718 datas, 0 depois da data-limite, 0 depois da prevista, 0 inversões de sequência.

### Estratégia / escopo (v4)
- Grades Portas…Entrega e rejunte: `=IF(OR(anterior="canc", AND(ESTRATÉGIA!K<serviço>="Vendidos", ESTRATÉGIA!<apto>="N")),"canc", <fórmula original ok/N/L>)`.
  Valor digitado (1, and) sempre vale mais que o escopo.
- K10/K17 das abas descontam "canc".

---

## 5. Lista de vendidos (ESTRATÉGIA, desde v5 — fonte: ACOMPANHAMENTO DE SERVIÇOS FINAIS de 16/11)

**Não vendidos (N) = 26:**
- Final 1 (11): 11, 71, 111, 181, 191, 201, 221, 241, 251, 261, 271
- Final 2 (4): 12, 32, 72, 262
- Final 3 (3): 13, 33, 193
- Final 4 (8): 14, 24 (Decorado), 34 (Modelo), 44 (Decorado), 74, 124, 134, 204
Todos os demais = V (68 vendidos). Na v4 só 6 estavam marcados (os "canc" digitados pelo Brendon no Checklist Rej. Final 4: 44, 74,
114, 124, 134, 204); o 114 é "sim" no exemplo e ficou vendido. Brendon digitou 67 em Checklist Rej.!K13 mas falou em 68 — confirmar.

Estratégia configurada (ESTRATÉGIA I/J): Piso — Todos / **Não** (torre toda); Rejunte … Limpeza grossa — Todos / Sim;
**Checklist rejunte — Vendidos** / Sim (a partir dele todos os seguintes ficam "Vendidos").

---

## 6. Histórico de versões e correções

### v2 (10/11) — diagnóstico + DASHBOARD EXECUTIVO
Preservado: grades, códigos, cadeia ok/N/L, cronograma regressivo, cálculos de produtividade e financeiro, mesclagens e CF.
Corrigido (cada célula registrada na GUIA):
- Regulagem e Entrega (I7/I8) apontavam para a coluna do Checklist na aba Dashboard.
- "Prazo (Final − Serviço)" (I6) de 8 abas somava a partir de Portas (cópia); rótulos copiados (H6:H8, K4).
- Regulagem L13 usava L4 em vez de L5.
- Pintura 1ª: O18 dava #VALUE!; L16 usava células do layout de Portas.
- Portas linha 32 (rodapé 1-2-3-4) sobrescrita por fórmulas.
- Textos "Atrasado -14 Dias" e 1 dia adiantado classificado como atrasado.
- Faltavam feriados 2027 (01/01, 08/02, 09/02) → faixa padronizada B37:B60 (mudou projeções 1–5 dias).
- Dashboard linha 14 incompleta; grades de Pintura 2ª…Entrega vazias receberam a lógica de liberação.
Acrescentado: DASHBOARD EXECUTIVO, GUIA, RANKING, HISTÓRICO, BASE, CONFIG, APOIO_DASH; rejunte como serviço; códigos and/canc com
listas suspensas e cores. Números da época: 21% concluído; 820 de 1.128 itens bloqueados; 10 de 12 serviços projetados após o limite
(Checklist 179, Checklist rejunte 177, Limpeza grossa 133 dias).

### v3 (10/11) — CRONOGRAMA, encadeamento, mão de obra
Excluída a aba "Dashboard" (dados migrados ao CRONOGRAMA; referências remapeadas). Causa da inconsistência: cada aba projetava a partir de
hoje, sem esperar o serviço anterior. Fórmula antiga de mão de obra (dias de atraso × produtividade + funcionários, dava 5.312 pessoas)
substituída. Exemplos v3: Piso 7 → 9; Checklist rejunte 2 → 9; Pintura 2ª 4 → 11; Limpeza grossa 1 → 4.

### v4 (16/11) — sobre a planilha do Brendon de 16/11
- **Divergência do piso:** CRONOGRAMA!J16 somava as equipes como se dividissem o mesmo saldo; agora cota de cada empreiteira
  (piso termina em 25/01/2027 = DS; Juninho 30/12/2026). AB16:AE16 com ROUND(…,4) para bater no dia com a aba Piso.
- **"canc" sem efeito:** cascata para todos os serviços seguintes (≈ 800 fórmulas reescritas), saldos K10/K17 descontam canc.
- **Erro oculto no RANKING:** MINIFS não existe no Excel 2010 → critério C3 dava 100% a todos; trocado por matricial {=MIN(IF())}.
- Rejunte: piso "and" liberava rejunte antes de o piso terminar (corrigido).
- Nova aba ESTRATÉGIA; X:AA e AQ:AT respeitam "sem divisão por prumada"; CRONOGRAMA I31:I36 = aptos no escopo; dashboard mostra
  o escopo ativo.
- Cenários v4 (posição 16/11, 6 aptos N): estratégia informada → F4 26/02/27, F3 01/03/27, obra 29/07/27; com piso fechando F4/F3
  primeiro → F4 06/01/27; + Limpeza grossa 1→3, Checklist 1→3, Louças 1→2 → F4 28/12/26, F3 25/01/27, obra 29/04/27; antes (94 aptos):
  F4 18/01, F3 17/03, obra 16/08/27.
- Avanço medido: 11/11→16/11 = 27 itens (233→260), ~9/dia útil; necessário ~14/dia (12 com 68 vendidos).

### v5 (16/11) — PAINEL MACRO, QUADRO F1–F4, PENDÊNCIAS
Lista de 68 vendidos carregada; datas por apto (BASE AB:AE); início por prumada (CRONOGRAMA BC:BF); piso sem divisão sobe a torre
andar por andar (antes todas as prumadas terminavam o piso juntas em 25/01). Colunas manuais trazidas do exemplo (73 valores).
Divergências exemplo × plano: 51 (45 com o plano à frente, quase todas Rejunte; 6 com "ok" no exemplo e não no plano — Louças do 54 e
etapas finais do 24/34 que estão fora do escopo). Fonte adotada: o plano (abas de serviço).
Resultado v5 (16/11): F4 27/01/27 (−9), F3 25/02/27 (−38), F2 30/04/27 (−74), F1 e obra 15/06/27 (−120).

### v6 (17/11) — seletor Cenário atual / Necessário
C3 de cada QUADRO (validação "Cenário atual,Necessário"; amarelo quando Necessário); linha 5 e textos mudam com o modo; BASE!AF e
CRONOGRAMA!BG:BJ. No modo Cenário atual as datas são idênticas à v5 (testado). Exemplo Louças Final 4 (limite 16/12/26):
164 17/12 → 03/12; 174 21/12 → 07/12; 184 24/12 → 09/12; 194 30/12 → 11/12; 204 04/01/27 → 15/12/26. Pisos restantes do F4 necessários até 23/11.

---

## 7. Situação e números atuais (v6 recalculada em 17/11/2026; mudam com TODAY e com lançamentos)

KPIs: 1.128 itens; 260 concluídos; 20 em andamento; 90 não iniciados; 0 atrasados; 608 bloqueados; 27% de conclusão; 15 com vencimento próximo.

| Prumada | Meta | Término projetado | Folga | Maior gerador | Aptos no escopo |
|---|---|---|---|---|---|
| Final 4 | 18/01/2027 | 28/01/2027 | −10 | Piso | 12 |
| Final 3 | 18/01/2027 | 26/02/2027 | −39 | Piso | 17 |
| Final 2 | 15/02/2027 | 03/05/2027 | −77 | Limpeza grossa | 23 |
| Final 1 | 15/02/2027 | 16/06/2027 | −121 | Limpeza grossa | 16 |
| Obra | 15/02/2027 | 16/06/2027 | −121 | Limpeza grossa | 68 |

Por serviço (término / pior folga / equipe necessária): Piso 26/01/27 −35 (9); Rejunte 27/01/27 −36 (4); Pintura 1ª 04/01/27 +1 (3);
Portas 29/01/27 −17 (3); Louças 16/03/27 −62 (3); Limpeza grossa 20/05/27 −126 (4); Checklist rejunte 26/05/27 −127 (6);
Pintura 2ª 02/06/27 −127 (7); Limpeza fina 07/06/27 −125 (4); Checklist 14/06/27 −126 (3); Regulagem 15/06/27 −125 (2); Entrega 16/06/27 −121 (1).

Ranking (17/11): 1 Juninho 0,94 · 2 DS ALENCAR 0,78 · 3 "Ramos " 0,70 · 4 Diagonal 0,70 · 5 W J Instaladora 0,67 · 6 TROVÃO 0,63 ·
7 Ramos Empreiteira 0,53 · 8 Camargo 0,52 · 9 Ascen 0,50.

Status por serviço em 16/11 (concluídos de 94): Piso 73, Rejunte 58, Pintura 1ª 78, Portas 22, Louças 14, Limpeza grossa 8,
Checklist rejunte 3, Pintura 2ª 2, Limpeza fina 1, Checklist 0, Regulagem 1, Entrega 0. (11/11 → 16/11: Portas +9, Louças +5, Rejunte +4,
Piso +3 — Portas e Louças acima do ritmo da planilha: atualizar L4 dessas abas.)

### Análise e recomendações já dadas
- Ritmo geral insuficiente; Limpeza grossa (1 funcionário, 1 apto em 3 dias, 86 aptos) é o maior gargalo dos Finais 1/2; nos Finais 3/4
  é o piso (DS caiu de 3 para 2 funcionários; termina 25–26/01). Faltavam só 6 pisos nos F3/F4 (113, 153, 203; 154, 184, 204): fechar
  primeiro devolve ~50 dias ao F4.
- Cortar "só vendidos" a partir do Checklist rejunte rende pouco porque os vendidos esperam a Limpeza grossa da prumada inteira.
- Recomendado: 6 pisos F3/F4 primeiro e repor 3º funcionário da DS; Limpeza grossa vendidos primeiro e 3 pessoas; Checklist 3 pessoas;
  completar lista de vendidos (feito na v5).

---

## 8. Apresentação, reforço de equipe e estratégias

### Apresentação (11–12/11; base 11/11; prioridade F4=1) — 13 slides
Capa; mensagem (ritmo atual 11/08/2027, −177 d; com o plano 05/02/2027, +10 d); situação (21% concluído, 69% bloqueados); prumadas;
gargalos (Checklist +62, Limpeza grossa +60, Louças +46 — todos com 1 funcionário); ritmo atual × necessário (10 de 12 abaixo;
Checklist precisa quadruplicar 0,5 → 2,0 aptos/dia); Estratégia 1 vendidos (−72 dias); cenários; reforço; outras alavancas; plano de ação;
premissas e riscos; decisões. Cenários:

| Cenário | Pessoas | Obra | Folga |
|---|---|---|---|
| Hoje (94 aptos) | 30 | 11/08/2027 | −177 |
| Só vendidos (68; 26 não vendidos distribuídos uniformemente — premissa) | 30 | 31/05/2027 | −105 |
| Vendidos + 3 gargalos (Checklist 1→3, Limpeza grossa 1→3, Louças 1→2) | 35 | 25/03/2027 | −38 |
| **Vendidos + equipe necessária (recomendado)** | **42** | **05/02/2027** | **+10** |
| Todos + equipe necessária | 51 | 11/02/2027 | +4 |

Decisões pedidas: prioridade aos 68 vendidos; reforço de 12 pessoas; alavancas de método; definir recesso de fim de ano.

### Reforço (+12 pessoas, 497 homem-dia, de 23/11/2026 até o fim de cada serviço)
Pintura 2ª (Trovão) +3, 45 d.ú. · Limpeza grossa (Ramos) +2, 36 · Checklist rejunte (Ascen) +2, 40 · Checklist (Ascen) +2, 51 ·
Rejunte (DS/Juninho) +1, 22 · Louças (Camargo) +1, 34 · Regulagem (Diagonal) +1, 52. Equipe 14 → 26 nessas 7 equipes. Ascen 4 pessoas
(182 h-d), empreiteiras 8 (315 h-d). Custo = reforço × dias × custo diário (planilha online, custo ainda não preenchido).

### Outras estratégias sugeridas (13/11)
1. Rever dependências (maior potencial): Louças não precisam esperar Portas; Checklist rejunte logo após o rejunte; Regulagem em paralelo
   após a Pintura 2ª (ofereci simular no CRONOGRAMA — não feito).
2. Atacar retrabalho: lacrar apto concluído, proteger acabamentos, apto-piloto por serviço.
3. Logística: kit por apto no pavimento, janela de cremalheira/elevador, conferir prazos de portas/louças/metais dos fornecedores.
4. Organização: limpeza em turno vespertino/noturno, 2ª empreiteira nos gargalos, equipe de fechamento por pavimento.
5. Comercial: ordenar vendidos por data contratual e multa; entrega escalonada com comunicação; não vendidos como apoio/pulmão.
6. Risco fora da planilha: **habite-se** (áreas comuns, fachada, elevadores, AVCB, ligações definitivas, vistoria da prefeitura).
Também na apresentação: checklist em dois papéis (vistoria × reparo), limpeza terceirizada, sábados nos gargalos (+20%), linha de balanço +
reunião diária (PPC ≥ 80%), contrato por resultado.

---

## 9. Decisões do Brendon (respostas às perguntas de 16/11)

- Etapas do exemplo que não existem no plano (Caixilhos, Bancadas, Rodapé, Metais, Espelhos, Caix. Gourmet, Caix. Técnica, Retoque):
  **manuais no painel**.
- Equivalências: **Check list civil é etapa diferente do Checklist rejunte (manual)**; **Check list fino = Checklist rejunte (e piso)**;
  **Pintura = Pintura 2ª demão**; **Check list eng. = Checklist**; **Louças = Louças**; Metais = mesma data de Louças.
- Lista de vendidos: a do exemplo; decorados e modelo FORA.
- Pendências: lista com resumo no painel (abertas por apto e prumada).
- Ordem de execução dentro da prumada: **de baixo para cima**.
- Incluir Piso, Pintura 1ª e Regulagem de caixilhos como colunas automáticas nos quadros: sim.
- Formato: resumo (PAINEL MACRO) + 4 abas (QUADRO F1–F4).
- 17/11: seletor de datas nos quadros ("Cenário atual" / "Necessário").

---

## 10. Pontos em aberto (confirmar com o Brendon)

- "Ramos " (Limpeza fina, com espaço) × "Ramos Empreiteira" (Limpeza grossa): mesma empresa? Igualar K2 se for.
- 67 (Checklist Rej.!K13) × 68 vendidos.
- Rejunte está com divisão por prumada (só o Piso está "Não") — trocar se o rejunte roda a torre toda.
- Recesso de fim de ano não está nos feriados (datas caem em 24/12 e 31/12).
- Custo do reforço (planilha online) não preenchido.
- Quais aptos de piso são do Juninho (pendentes aparecem como "A definir").
- Etapas manuais (Bancadas/marmoraria dos aptos 154 e 184, Caixilhos 14 e 204) não deslocam datas.
- Convenção das datas-limite desconta também o prazo do próprio serviço (mantida; WORKDAY original não considerava feriados).
- Fórmula de mão de obra original de Portas+ (unidades não fechavam) foi substituída na v3.
- Produtividade real medida em campo ainda não registrada (Portas e Louças estão acima do previsto) — ranking não usa produtividade.
- Datas "Necessário" podem ser agressivas (ex.: 3 pisos F4 até 23/11) — combinar com "Equipe necessária".
- A Programação Final 4 online está superada pelos QUADROS (que recalculam).
- Proposta pendente de simular a revisão de dependências (Louças × Portas etc.) no CRONOGRAMA.

---

## 11. Índice de arquivos deste pacote

| Pasta / arquivo | O que é |
|---|---|
| `CLAUDE.md` | Este arquivo (contexto completo) |
| `01_planilha_atual/Plano_de_Ataque_v6.xlsx` | **Versão vigente** (17/11/2026) |
| `02_historico_versoes/Plano_de_Ataque_Brendon_ORIGINAL_backup.xlsx` | Backup do original (= arquivo recebido em 10/11) |
| `02_historico_versoes/Plano_de_Ataque_Brendon_v2.xlsx` | v2 (10/11) |
| `02_historico_versoes/Plano_de_Ataque_Brendon_v3.xlsx` | v3 (10/11) |
| `02_historico_versoes/Plano_de_Ataque_v4.xlsx` | v4 (16/11, manhã) |
| `02_historico_versoes/Plano_de_Ataque_v5.xlsx` | v5 (16/11, tarde) |
| `03_apresentacao/Recuperacao_Prazo_Ventisette.pptx` | Apresentação à diretoria (13 slides) |
| `03_apresentacao/Conteudo_da_apresentacao.md` | Texto, tabelas, dados dos gráficos e notas extraídos do .pptx |
| `04_arquivos_recebidos/0_prompt_original_projeto_planilha.txt` | Prompt completo do projeto (enviado em 10/11 e reenviado em 16/11) |
| `04_arquivos_recebidos/1_Plano_de_Ataque_Brendon_ORIGINAL_10-11-2026.xlsx` | Planilha original do Brendon |
| `04_arquivos_recebidos/2_Plano_de_Ataque_v3_preenchido_pelo_Brendon_11-11-2026.xlsx` | v3 com lançamentos do Brendon (base da apresentação) |
| `04_arquivos_recebidos/3_Plano_de_Ataque_v3_preenchido_pelo_Brendon_16-11-2026.xlsx` | v3 com lançamentos de 16/11 (base da v4) |
| `04_arquivos_recebidos/4_ACOMPANHAMENTO_DE_SERVICOS_FINAIS_16-11-2026.xlsx` | Planilha modelo do quadro (abas Final 1–4, vendidos, colunas manuais, quadro de pendências) |
| `04_arquivos_recebidos/logo_ASCEN.png`, `logo_Ventisette.png` | Logos usadas na apresentação |
| `05_documentos_online/Guia_rapido_Plano_de_Ataque.md` | Guia ASD-STE100 (online: https://claude.ai/artifact/JpUNL4hmut5KjiKa3BWJ9U) |
| `05_documentos_online/Custo_reforco_equipe.md` | Planilha online de custo do reforço (https://claude.ai/artifact/H7aTRzjdfD1KUd1vsJXSJR) |
| `05_documentos_online/Programacao_Final4_por_servico.md` | Planilha online da programação do Final 4 (https://claude.ai/artifact/XdarEg3bFCCTKjAYxWsqrQ) |
| `06_scripts/` | Scripts Python que geraram v4–v6 (ver `06_scripts/LEIA-ME.md`) |
