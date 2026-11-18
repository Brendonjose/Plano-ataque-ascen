# Sistema Plano de Ataque — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicação no navegador (abre por `file://`, sem instalação) que substitui o lançamento diário e os
painéis da planilha `Plano_de_Ataque_v6.xlsx`, com os mesmos cálculos.

**Architecture:** Estado = só as entradas (lançamentos, parâmetros, vendidos, pendências, histórico), guardado
por um adaptador de armazenamento (v1: `localStorage`). Um motor JS puro (`calcular(estado, hoje)`) reproduz a
v6 e devolve todas as tabelas derivadas; as telas só leem o resultado. Fidelidade garantida por testes Node
contra os valores gravados na v6 (17/11/2026) e contra um "oráculo" que executa as fórmulas originais da v6
com HyperFormula (só em teste — em produção era lento demais: 13 s ao abrir, 9 s por lançamento).

**Tech Stack:** HTML/CSS/JS clássico (sem módulos ES, sem build), Chart.js 4.4.1 e SheetJS (xlsx 0.18.5)
copiados em `app/vendor/`; testes com `node --test` (Node 22); dev: `hyperformula@2.7.1`, `xlsx@0.18.5`;
Python 3 + openpyxl só para extrair a fixture.

**Spec:** `docs/superpowers/specs/2026-11-18-sistema-plano-ataque-design.md` (+ `referencia/CONTEXTO_PROJETO.md`
§3–§5 para as regras).

## Global Constraints

- Abre com duplo clique em `app/index.html` no Chrome/Edge (Windows), offline. Nenhum `import`/`export`, nenhum CDN.
- Todo arquivo JS segue o padrão `(function (root) { const PA = root.PA = root.PA || {}; ... })(typeof globalThis !== 'undefined' ? globalThis : this);` para rodar no navegador e no Node (`require`).
- Textos em pt-BR; datas exibidas DD/MM/AAAA; datas internas = serial Excel (inteiro, base 30/12/1899).
- Feriados: lista importada de `Piso!B37:B60`. `WORKDAY` das datas-limite (CRONOGRAMA L:O) **sem** feriados, como na v6; demais com feriados.
- Regras = fórmulas da v6. Fonte da verdade de cada coluna: `referencia/formulas/<aba>.txt` (gerado na Task 1).
- Valor lançado sempre vale mais que o automático (ok/N/L/canc por escopo).
- Financeiro fora da v1. Exportação gera arquivo novo `Plano_de_Ataque_AAAA-MM-DD.xlsx`; nunca sobrescreve a v6.
- Paleta: azul-marinho `#1F3864`, branco, cinzas; verde `#2E7D32`, amarelo `#F9A825`, vermelho `#C62828`; tema claro e escuro.

## Review Focus

1. Planilha mais nova com códigos fora do padrão (`" 1 "`, `"OK"`, `"x"`, números como texto) → importa sem quebrar; `trim/lower` como a v6; o desconhecido vira "Código não reconhecido" (teste na Task 3).
2. Navegador sem `localStorage` (janela anônima, cota cheia) → o app funciona em memória e mostra o aviso "Dados não estão sendo salvos" (teste na Task 8).
3. Lançar Concluído num apto Bloqueado (N/L) → aceito; vira Concluído e libera o seguinte, igual à v6 (teste na Task 3).
4. "Data de hoje" de conferência esquecida ligada → faixa amarela fixa no topo enquanto ativa; não persiste entre sessões (teste na Task 8).
5. Importar de novo por cima de dados lançados no sistema → confirma antes de substituir e faz backup automático (teste na Task 8).

---

### Task 1: Base do projeto, datas e fixture da v6

**Files:**
- Create: `package.json`, `.gitignore`, `tools/extrair_v6.py`, `tests/fixtures/v6.json`, `referencia/formulas/*.txt`, `app/js/datas.js`, `tests/datas.test.js`

**Interfaces:**
- Produces: `PA.datas = { deISO(s)->serial, paraISO(n)->'AAAA-MM-DD', fmt(n)->'DD/MM/AAAA', hojeSerial(date?)->serial, diaUtil(n, feriadosSet)->bool, workday(inicio, dias, feriadosSet?)->serial, networkdays(a, b, feriadosSet?)->int }`
- Produces: `tests/fixtures/v6.json` = `{ abas: { <nome>: { f: {A1: fórmula|valor}, v: {A1: valor} } } }` com datas como `{d:'AAAA-MM-DD'}`; `tests/helpers.js` com `carregarFixture()`, `valor(aba, ref)`.

- [ ] **Step 1:** `tools/extrair_v6.py <xlsx> <saida.json> <pasta_formulas>` — lê com openpyxl em dois passes (fórmulas e `data_only`), grava a fixture (abas exceto GUIA) e, para cada aba, um `.txt` com `ref | fórmula` de todas as células com fórmula. Rodar sobre `referencia/Plano_de_Ataque_v6.xlsx`.
- [ ] **Step 2: Testes de datas (falham)** em `tests/datas.test.js`:
  - `workday(deISO('2027-01-20'), -10)` = `deISO('2027-01-06')` (sem feriados).
  - Com feriados da fixture (`Piso!B37:B60`): `workday(deISO('2026-11-17'), 1, F)` = `deISO('2026-11-18')`; `workday(deISO('2026-11-19'), 1, F)` = `deISO('2026-11-23')` (20/11 feriado).
  - `networkdays(deISO('2026-11-17'), deISO('2026-11-26'), F)` = 7; `networkdays(b, a)` com `b>a` = negativo, como no Excel.
  - `workday` com dias fracionários trunca como o Excel: `workday(x, 2.9)` = `workday(x, 2)`.
  - `fmt(deISO('2027-03-15'))` = `'15/03/2027'`.
- [ ] **Step 3:** Implementar `app/js/datas.js`.
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5:** Commit `feat: base do projeto, funções de data e fixture da v6`.

### Task 2: Modelo e importação da planilha

**Files:**
- Create: `app/js/modelo.js`, `app/js/importar.js`, `tests/importar.test.js`

**Interfaces:**
- Produces: `PA.modelo = { SERVICOS: [{ordem, id, nome, aba, preds:[ordens]}] (12, ordem da spec), APTOS: [{apto, pav, final, grupo:'Finais 1-2'|'Finais 3-4', idx}] (94, ordem da BASE: pav 27→1, final 1→4; pav>20 só finais 1–2), linhaGrade(pav)=32-pav, colGrade(final)='CDEF'[final-1], colRejunte(final)='IJKL'[final-1], ETAPAS_MANUAIS: [...], estadoVazio() }`
- Dependências (`preds`): Rejunte←Piso; Pintura 1ª←(nenhum); Portas←Piso+Rejunte+Pintura 1ª; demais ← imediato anterior. Antecessores para W/AF do CRONOGRAMA: os da v6 (`referencia/formulas/CRONOGRAMA.txt` W17:W27, AF17:AF27).
- Produces: `PA.importar.deWorkbook(wb /* SheetJS */) -> estado`, com `estado = { versao:1, lancamentos:{[servicoId]:{[apto]:{codigo, dataReal?, obs?}}}, config:{torre, dataBase, janela, pesos:{c1,c2,c3}, notaZeroDias}, feriados:[serial], cronograma:{metaMacro, prumadas:{1..4:{meta, prioridade}}, servicos:{[id]:{prazo, unid, produtividade, equipe, empreiteira}}}, piso:{empreiteiras:{ds, jun}, prodDS:{piso,azulejo}, prodJun:{piso,azulejo}, equipeDS, equipeJun, repassadosJun, m2:{piso,azulejo}}, estrategia:{vendido:{[apto]:'V'|'N'}, escopo:{[id]:'Todos'|'Vendidos'}, segueprioridade:{[id]:'Sim'|'Não'}}, manuais:{[apto]:{[etapa]:valor}}, pendencias:[...], historico:[{semana, data, realizado?, concluidos?, obs?}] }`
- Lançamentos guardam **só o que foi digitado**: células com fórmula na grade (ok/N/L automáticos) são ignoradas; Piso → códigos 1/2/and/canc; Rejunte → 1–6/canc (grade I:L do Piso); BASE!P e BASE!X → `dataReal`/`obs`.

- [ ] **Step 1: Testes (falham)** com a v6 lida via `xlsx` do npm:
  - `APTOS.length === 94`; `APTOS[0]` = `{apto:271,pav:27,final:1}`; nenhum apto com `pav>20 && final>2`.
  - Contagens batem com a BASE da fixture: nº de aptos com status Concluído em Piso = 73 conforme `BASE!K` (calcular a partir da fixture, não fixar o número à mão).
  - `estado.cronograma.prumadas[3].meta === deISO('2027-01-20')`, `prioridade` F4=1, F3=2, F2=3, F1=4.
  - Nenhum lançamento com código `ok` ou `N/L`.
  - `estado.estrategia.vendido` tem 68 'V'; `escopo['checklist-rejunte'] === 'Vendidos'`; `segueprioridade.piso === 'Não'`.
  - Pendências: 35 abertas; histórico: semana 2 com realizado ≈ 0.2005.
- [ ] **Step 2:** Implementar `modelo.js` e `importar.js` (endereços das entradas: `CONTEXTO_PROJETO.md` §3 e CONFIG/CRONOGRAMA/ESTRATÉGIA/PENDÊNCIAS/HISTÓRICO/QUADRO F1–F4 na fixture).
- [ ] **Step 3:** `node --test` → PASS. Commit `feat: modelo de dados e importação da v6`.

### Task 3: Motor — grades automáticas e status (BASE A:Y)

**Files:**
- Create: `app/js/motor/status.js`, `tests/motor-status.test.js`, `tests/helpers.js` (se ainda não existe)

**Interfaces:**
- Consumes: `PA.modelo`, `PA.datas`, estado da Task 2.
- Produces: `PA.motor.grade(estado) -> {[servicoId]:{[apto]: codigo|'ok'|'N/L'|'canc'|''}}` (efetivo, como as grades da v6) e `PA.motor.itens(estado, hoje, cron) -> Item[]` (1.128, ordem da BASE) com `Item = {id, ordem, servico, empreiteira, torre, pav, final, apto, grupo, codigo, status, consolidado, detalhe, inicio, limite, dataReal, diasVencer, atrasado, diasAtraso, venceBreve, foraPrazo, previstoHoje, obs, alerta}`. `limite` vem de `cron.limites[ordem][final]` (Task 4); para testar sozinho, use os valores da fixture CRONOGRAMA L:O.

- [ ] **Step 1: Testes (falham):**
  - Para os 1.128 itens, `codigo`, `status`, `consolidado`, `detalhe`, `empreiteira`, `atrasado`, `venceBreve` e `previstoHoje` (±1e-9) iguais a `BASE!J,K,L,M,D,R,T,V` da fixture, com hoje = 17/11/2026.
  - Cascata: `canc` no Piso do apto 113 → todos os serviços seguintes ficam `canc` (menos os que têm valor digitado).
  - Escopo: com `escopo['checklist-rejunte']='Vendidos'`, apto 11 (N) sem lançamento → `canc` de Checklist rejunte até Entrega.
  - Review Focus 1: códigos `" 1 "`, `"OK"`, `"x"`, `1` (número) → `status` Concluído, Não iniciado, "Código não reconhecido" e Concluído, nessa ordem.
  - Review Focus 3: lançar `1` em Portas de um apto `N/L` → Concluído, e Louças desse apto passa a `ok`.
- [ ] **Step 2:** Implementar portando as fórmulas das grades (`referencia/formulas/Portas Mad.txt` … `Entrega.txt`, grade do rejunte em `Piso.txt`) e BASE colunas D, J–Y.
- [ ] **Step 3:** `node --test` → PASS. Commit `feat: motor de status e liberação`.

### Task 4: Motor — Piso e CRONOGRAMA

**Files:**
- Create: `app/js/motor/cronograma.js`, `tests/motor-cronograma.test.js`

**Interfaces:**
- Produces: `PA.motor.cronograma(estado, hoje, itens) -> { limites:{[ordem]:{1..4, f34, obra}}, servicos:[{ordem, prazo, unid, prod, funcDia, equipe, ritmo, ciclo, saldo:{1..4}, liberados, inicio, saldoAcum:{1..4}, termCap:{1..4}, term:{1..4}, termF34, termTodas, folga:{1..4}, piorFolga, mo:{1..4}, moF34, moTodas, acrescimo, atrasoGerado:{1..4, obra}, inicioPrumada:{1..4}, fator:{1..4}}], prumadas:[{final, meta, prioridade, termino, folga, situacao, gerador, aptosEscopo, entregues}], obra:{...mesmos campos}, piso:{faltaDS, faltaJun, diasDS, diasJun, finalDS, finalJun} }`. Valores vazios = `null`; "Sem prazo" = string `'Sem prazo'`.
- Duas passagens: `limites` não depende de `itens`; `itens` (Task 3) usa `limites`; o resto usa `itens`. A posição na fila (BASE!AD) vem da Task 5. Exponha `PA.motor.limites(estado)` separado.

- [ ] **Step 1: Testes (falham):** para as linhas 16–27, todas as colunas E:BJ iguais à fixture (datas exatas, números ±1e-6, `''`↔`null`); linhas 32–36 (resumo por prumada) iguais; `Piso!Q10,T10,R16:R19,U16:U19` iguais.
- [ ] **Step 2:** Implementar portando `referencia/formulas/CRONOGRAMA.txt` e o bloco de produtividade de `Piso.txt` (Piso usa `ROUND(x,4)` em AB:AE; demais `ROUNDUP(x,0)`; X:AA com `segueprioridade='Não'` usa a posição máxima na fila da Task 5).
- [ ] **Step 3:** `node --test` → PASS. Commit `feat: motor do cronograma`.

### Task 5: Motor — fila, datas por apto e data necessária (BASE Z:AF)

**Files:**
- Create: `app/js/motor/datas-apto.js`, `app/js/motor/calcular.js`, `tests/motor-datas-apto.test.js`

**Interfaces:**
- Produces: campos extras em `Item`: `prioridadeFila, pendente, posicaoFila, terminoPrevisto, dataNecessaria`.
- Produces: `PA.motor.calcular(estado, hoje) -> Resultado = { hoje, grade, itens, cron, ... }` (orquestra Tasks 3–7 na ordem certa; dependência circular X:AA ↔ AD resolvida pela ordem da v6: AD depende só de status/prioridade).

- [ ] **Step 1: Testes (falham):** `BASE!AB,AC,AD,AE,AF` dos 1.128 itens iguais à fixture; teste da v6 reproduzido: 0 datas necessárias depois da data-limite; 0 depois da prevista; 0 inversões de sequência (sucessores 1→2, 2→4, 3→4, 4→5 … 11→12).
- [ ] **Step 2:** Implementar portando BASE AB:AF (`referencia/formulas/BASE.txt`).
- [ ] **Step 3:** `calcular` completo para os 1.128 itens em < 300 ms no Node (teste de tempo).
- [ ] **Step 4:** Commit `feat: datas por apartamento e data necessária`.

### Task 6: Motor — painéis (Dashboard, Macro, Quadros, Estratégia, Ranking, Pendências, Histórico)

**Files:**
- Create: `app/js/motor/paineis.js`, `tests/motor-paineis.test.js`

**Interfaces:**
- Produces: `PA.motor.painel(resultado, filtros) -> { kpis:{total, concluidos, andamento, naoIniciados, atrasados, bloqueados, pct, vencendo}, alertas, prumadas, risco:[...linhas 24–35], graficos:{status, pctEmpreiteira, atrasVencEmp, evolucao, prevRealServico, torrePrumadas, pctPavimento}, criticos:[top 20] }` com `filtros = {empreiteira, torre, pavimento, servico, status, de, ate, prumada}` (`null` = Todos).
- Produces: `resultado.macro` (PAINEL MACRO), `resultado.quadros[1..4]` (QUADRO F1–F4, modo `'atual'|'necessario'`), `resultado.estrategia` (L:O e H20:N25, I27:I29), `resultado.ranking` (tabela 27–36 + ordenado), `resultado.pendencias` (Nº, Final, Atrasada?, totais), `resultado.historico` (% realizado hoje, concluídos, itens válidos, % previsto por semana).

- [ ] **Step 1: Testes (falham):** sem filtros, comparar com a fixture: DASHBOARD B8:P8, B15:O19, B24:P35, B91:N105; APOIO_DASH (séries dos gráficos); PAINEL MACRO B6:I6, B10:K14, B20:R31; QUADRO F1–F4 linhas 4–6 e 8+ (os dois modos: o modo "Necessário" vem da troca de C3, conferir via oráculo na Task 7); ESTRATÉGIA K5:O16, H21:N25, I27:I29; RANKING B13:N21 e B27:R35; PENDÊNCIAS C3,E3,G3, K, L; HISTÓRICO C5:E5, D9:D28. Com filtro `empreiteira='Camargo'`: KPIs batem com `COUNTIFS` sobre a fixture.
- [ ] **Step 2:** Implementar portando `referencia/formulas/{DASHBOARD EXECUTIVO,APOIO_DASH,PAINEL MACRO,QUADRO F1..F4,ESTRATÉGIA,RANKING EMPREITEIRAS,PENDÊNCIAS,HISTÓRICO}.txt` (ranking: o critério C3 usa MIN da folga projetada da empreiteira).
- [ ] **Step 3:** `node --test` → PASS. Commit `feat: motor dos painéis`.

### Task 7: Oráculo — cenários contra as fórmulas originais

**Files:**
- Create: `tests/oraculo.js`, `tests/cenarios.test.js`

**Interfaces:**
- Produces: `oraculo.rodar(alteracoes /* [{aba, ref, valor}] */, hoje) -> { valor(aba, ref) }` — carrega a fixture no HyperFormula (plugin `N`, `TODAY()`→`DATE(...)`, sem GUIA) e aplica as alterações.

- [ ] **Step 1:** Cenários, cada um aplicado no oráculo (células da v6) e no estado (`calcular`), comparando KPIs, CRONOGRAMA AF:AK/AP/AV e resumo por prumada:
  1. Lançar `1` em `Piso!E9` (pav 23, final 3).
  2. `canc` no Piso do apto 113.
  3. Equipe da Limpeza grossa de 1 → 3 (`'Limpeza grossa'!L23`).
  4. `ESTRATÉGIA!I5='Vendidos'`.
  5. QUADRO F4 C3 = "Necessário" (compara as datas da linha 8+).
- [ ] **Step 2:** `node --test` → PASS (timeout 120 s). Commit `test: cenários contra o oráculo das fórmulas da v6`.

### Task 8: Armazenamento e ações sobre o estado

**Files:**
- Create: `app/js/armazenamento.js`, `app/js/acoes.js`, `tests/acoes.test.js`

**Interfaces:**
- Produces: `PA.armazenamento.criar(backend = localStorage|null) -> { carregar()->estado|null, salvar(estado)->{ok, erro?}, disponivel:bool }` (chave `pa.estado.v1`; sem backend ou exceção → modo memória, `disponivel=false`). Interface pensada para trocar depois por um servidor (mesmos 3 métodos, assíncronos via Promise).
- Produces: `PA.acoes = { lancar(estado, servicoId, apto, {codigo, dataReal?, obs?}|null) -> estado, desfazer(estado) -> estado, importarPorCima(estadoAtual, novo) -> {estado, backup}, backupJSON(estado)->string, restaurarJSON(s)->estado, backupAtrasado(estado, hoje)->bool (>7 dias), registrarSemana(estado, resultado) -> estado, pendencia:{criar, editar, remover}, manual(estado, apto, etapa, valor) }` — imutáveis; `estado.meta = {ultimoBackup, pilhaDesfazer (até 20)}`.

- [ ] **Step 1: Testes (falham):** `lancar` + `desfazer` volta ao estado anterior; Review Focus 2: `criar(null).salvar(x).ok === false` e `disponivel === false`; backend que lança `QuotaExceededError` → `{ok:false, erro:'cota'}`; Review Focus 5: `importarPorCima` devolve `backup` igual ao atual; `restaurarJSON(backupJSON(e))` deep-equal `e`; Review Focus 4: a data de conferência não faz parte de `estado` (vive em `sessionStorage` na UI) — teste que `backupJSON` não contém `hojeConferencia`.
- [ ] **Step 2:** Implementar. **Step 3:** PASS. Commit `feat: armazenamento local e ações`.

### Task 9: Casca da aplicação e tela Lançar

**Files:**
- Create: `app/index.html`, `app/css/estilo.css`, `app/vendor/{chart.umd.min.js,xlsx.full.min.js}`, `app/img/{logo_ASCEN.png,logo_Ventisette.png}`, `app/js/ui/app.js`, `app/js/ui/lancar.js`, `tests/e2e/lancar.spec.js` (Playwright, Chromium pré-instalado)

**Interfaces:**
- Produces: `PA.ui = { registrarTela(id, {titulo, icone, render(el, ctx)}), ctx = {estado, resultado, aplicar(novoEstado), hoje, filtros} }`; `aplicar` salva, recalcula e redesenha a tela atual.
- Primeira abertura sem dados: tela de boas-vindas com **Importar planilha (.xlsx)** e **Restaurar backup (.json)**.
- Lançar: fita dos 12 serviços com % concluído; grade Pav × Final (pav 27 no topo); célula = nº do apto + cor (Concluído verde, Em andamento amarelo, Liberado branco com borda, Bloqueado cinza com cadeado e motivo, Cancelado riscado, Atrasado borda vermelha); toque abre a folha de opções (Piso: "Concluído — DS Alencar"/"— Juninho"; Rejunte: Rejuntado/Rejuntando/Sem rejunte × empreiteira; demais: Concluído/Em andamento/Cancelado/Limpar) + data real + observação; botão Desfazer; aba "Por apartamento".
- Faixa amarela fixa quando a data de conferência estiver ativa; aviso vermelho quando `disponivel=false`; aviso de backup atrasado.

- [ ] **Step 1: Teste e2e (falha):** abre `file://.../app/index.html`, importa `referencia/Plano_de_Ataque_v6.xlsx`, escolhe Portas de madeira, toca no apto 193, marca Concluído; o KPI "Concluídos" do Painel sobe 1; recarrega a página e o lançamento continua lá; Desfazer volta.
- [ ] **Step 2:** Implementar. **Step 3:** e2e PASS; captura de tela 1280×800 e 390×844 (celular) revisada. Commit `feat: casca e tela de lançamento`.

### Task 10: Tela Painel

**Files:** Create `app/js/ui/painel.js`, `app/js/ui/graficos.js`; Test `tests/e2e/painel.spec.js`

- [ ] **Step 1: Teste e2e (falha):** 8 KPIs com os valores da fixture; filtro Empreiteira = Camargo muda os KPIs para os valores da Task 6; os 7 gráficos renderizam (`canvas` presente, sem erro no console).
- [ ] **Step 2:** Implementar: filtros em linha (chips/selects), cartões de KPI, tabelas de prazos por prumada e de risco por serviço (folga colorida; "reforçar +N func."), 7 gráficos Chart.js nas cores da paleta, lista de críticos.
- [ ] **Step 3:** PASS + captura. Commit `feat: painel executivo`.

### Task 11: Telas Macro/Quadros, Cronograma, Estratégia e Ranking

**Files:** Create `app/js/ui/{macro,cronograma,estrategia,ranking}.js`; Test `tests/e2e/telas.spec.js`

- [ ] **Step 1: Teste e2e (falha):** Quadro F4 no modo Necessário mostra a data necessária do apto 164 de Louças igual ao oráculo; no Cronograma, mudar a equipe da Limpeza grossa para 3 muda o término da obra para o valor do cenário 3 da Task 7; na Estratégia, trocar um apto V→N altera "Aptos no escopo"; o Ranking ordena como a fixture.
- [ ] **Step 2:** Implementar (Quadros: colunas manuais editáveis na célula; vermelho após o limite).
- [ ] **Step 3:** PASS + capturas. Commit `feat: telas de macro, cronograma, estratégia e ranking`.

### Task 12: Pendências, Histórico, Configurações e Dados (importar/exportar)

**Files:** Create `app/js/ui/{pendencias,historico,config}.js`, `app/js/exportar.js`; Test `tests/exportar.test.js`, `tests/e2e/dados.spec.js`

**Interfaces:**
- Produces: `PA.exportar.workbook(estado, resultado) -> wb SheetJS` com abas: RESUMO, uma por serviço (grade Pav × Final com o código efetivo), BASE (colunas A:AF com nomes da v6), CRONOGRAMA (tabela por serviço), PENDÊNCIAS, HISTÓRICO, ESTRATÉGIA.

- [ ] **Step 1: Testes (falham):** `exportar` → reimportar com `importar.deWorkbook` → `calcular` dá os mesmos KPIs e o mesmo resumo por prumada (ida e volta); e2e: criar pendência, registrar semana (linha da semana atual recebe % de hoje), trocar a empreiteira de um serviço em Configurações reflete no Painel, **Salvar backup** baixa um `.json`.
- [ ] **Step 2:** Implementar (Configurações: torre, data-base, janela, pesos (soma ≠ 100% → aviso), nota zero, empreiteiras, feriados (adicionar/remover), data de conferência).
- [ ] **Step 3:** PASS. Commit `feat: pendências, histórico, configurações e dados`.

### Task 13: Acabamento e entrega

**Files:** Create `LEIA-ME.md` (raiz) e `app/LEIA-ME.txt` (uso em frases curtas, ASD-STE100); Modify telas conforme revisão visual.

- [ ] **Step 1:** Rodar `node --test` e todos os e2e → PASS; medir: abrir e importar < 3 s; lançar → tela atualizada < 200 ms.
- [ ] **Step 2:** Capturas finais de todas as telas (claro/escuro, desktop/celular) e revisão: sem rolagem horizontal, textos legíveis, cores consistentes.
- [ ] **Step 3:** `LEIA-ME.md`: como abrir, rotina diária (3 passos), backup, exportar, e "como evoluir para vários usuários" (trocar o adaptador de armazenamento).
- [ ] **Step 4:** Commit `docs: guia de uso` e push.
