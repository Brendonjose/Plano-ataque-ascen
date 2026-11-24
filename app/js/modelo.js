/* Estrutura fixa da obra: serviços, apartamentos e dependências (igual à v6). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};

  // preds = dependências de liberação (grades ok/N/L); predsCron = antecessores usados no CRONOGRAMA (W/AF);
  // suc = sucessor usado na data necessária (BASE!AF).
  const SERVICOS = [
    { ordem: 1, id: 'piso', nome: 'Piso', curto: 'Piso', aba: 'Piso', preds: [], predsCron: [], suc: 2, aguardando: '' },
    { ordem: 2, id: 'rejunte', nome: 'Rejunte', curto: 'Rejunte', aba: 'Piso', preds: [1], predsCron: [1], suc: 4, aguardando: 'piso' },
    { ordem: 3, id: 'pintura1', nome: 'Pintura 1ª demão', curto: 'Pintura 1ª', aba: 'Pintura 1° Demão', preds: [], predsCron: [], suc: 4, aguardando: 'None' },
    { ordem: 4, id: 'portas', nome: 'Portas de madeira', curto: 'Portas', aba: 'Portas Mad', preds: [1, 2, 3], predsCron: [2, 3], suc: 5, aguardando: 'piso, rejunte e pintura 1ª' },
    { ordem: 5, id: 'loucas', nome: 'Louças e metais', curto: 'Louças', aba: 'Louças e Metais', preds: [4], predsCron: [4], suc: 6, aguardando: 'portas' },
    { ordem: 6, id: 'limpeza-grossa', nome: 'Limpeza grossa', curto: 'Limp. grossa', aba: 'Limpeza grossa', preds: [5], predsCron: [5], suc: 7, aguardando: 'louças e metais' },
    { ordem: 7, id: 'checklist-rejunte', nome: 'Checklist rejunte', curto: 'Check. rej.', aba: 'Checklist Rej.', preds: [6], predsCron: [6], suc: 8, aguardando: 'limpeza grossa' },
    { ordem: 8, id: 'pintura2', nome: 'Pintura 2ª demão', curto: 'Pintura 2ª', aba: 'Pintura de 2° Demão', preds: [7], predsCron: [7], suc: 9, aguardando: 'checklist rejunte' },
    { ordem: 9, id: 'limpeza-fina', nome: 'Limpeza fina', curto: 'Limp. fina', aba: 'Limpeza fina', preds: [8], predsCron: [8], suc: 10, aguardando: 'pintura 2ª demão' },
    { ordem: 10, id: 'checklist', nome: 'Checklist', curto: 'Checklist', aba: 'Checklist', preds: [9], predsCron: [9], suc: 11, aguardando: 'limpeza fina' },
    { ordem: 11, id: 'regulagem', nome: 'Regulagem de caixilhos', curto: 'Regulagem', aba: 'Regulagem de caixilhos', preds: [10], predsCron: [10], suc: 12, aguardando: 'checklist' },
    { ordem: 12, id: 'entrega', nome: 'Entrega', curto: 'Entrega', aba: 'Entrega', preds: [11], predsCron: [11], suc: null, aguardando: 'regulagem de caixilhos' }
  ];
  const POR_ID = {}; const POR_ORDEM = {};
  SERVICOS.forEach(s => { POR_ID[s.id] = s; POR_ORDEM[s.ordem] = s; });

  // Ordem da BASE: pav 27 → 1; finais 1 → 4; pav > 20 só finais 1 e 2.
  const APTOS = [];
  for (let pav = 27; pav >= 1; pav--) {
    const nf = pav > 20 ? 2 : 4;
    for (let final = 1; final <= nf; final++) {
      APTOS.push({ apto: pav * 10 + final, pav, final, grupo: final <= 2 ? 'Finais 1-2' : 'Finais 3-4', idx: APTOS.length });
    }
  }
  const APTO_POR_NUM = {};
  APTOS.forEach(a => { APTO_POR_NUM[a.apto] = a; });

  // Prumadas na ordem do CRONOGRAMA (F3, F4, F2, F1) — índice 1..4 usado em INDEX(E8:E11, k).
  const ORDEM_PRUMADAS = [3, 4, 2, 1];

  // Colunas dos quadros F1–F4 (manuais = digitadas no quadro; auto = vêm do motor).
  const ETAPAS_QUADRO = [
    { col: 'Caixilhos', manual: true }, { col: 'Bancadas', manual: true },
    { col: 'Piso', ordem: 1 }, { col: 'Rejunte', ordem: 2 }, { col: 'Pintura 1ª demão', ordem: 3 },
    { col: 'Portas', ordem: 4 }, { col: 'Rodapé', manual: true }, { col: 'Louças', ordem: 5 },
    { col: 'Metais', ordem: 5 }, { col: 'Limpeza grossa', ordem: 6 }, { col: 'Check list civil', manual: true },
    { col: 'Check list fino', ordem: 7 }, { col: 'Pintura (2ª demão)', ordem: 8 }, { col: 'Espelhos', manual: true },
    { col: 'Caix. Gourmet', manual: true, so34: true }, { col: 'Caix. Técnica', manual: true, so34: true },
    { col: 'Limpeza fina', ordem: 9 }, { col: 'Retoque', manual: true }, { col: 'Check list eng.', ordem: 10 },
    { col: 'Regulagem caixilhos', ordem: 11 }, { col: 'Entrega', ordem: 12 }
  ];

  function linhaGrade(pav) { return 32 - pav; }
  function colGrade(final) { return 'CDEF'[final - 1]; }
  function colRejunte(final) { return 'IJKL'[final - 1]; }
  /** Normaliza um código como a v6 faz com LOWER(TRIM(x&"")). */
  function norm(c) { return c === null || c === undefined ? '' : String(c).trim().toLowerCase(); }

  function estadoVazio() {
    const lancamentos = {};
    SERVICOS.forEach(s => { lancamentos[s.id] = {}; });
    const servicos = {};
    SERVICOS.forEach(s => { servicos[s.id] = { prazo: 0, unid: 1, produtividade: 1, equipe: 1, empreiteira: '' }; });
    return {
      versao: 1,
      lancamentos,
      config: { torre: 'Torre Única', dataBase: null, janela: 15, pesos: { c1: 0.4, c2: 0.3, c3: 0.3 }, notaZeroDias: 60 },
      feriados: [],
      cronograma: { metaMacro: null, prumadas: { 1: { meta: null, prioridade: 4 }, 2: { meta: null, prioridade: 3 }, 3: { meta: null, prioridade: 2 }, 4: { meta: null, prioridade: 1 } }, servicos, cicloRejunte: 1 },
      piso: { empreiteiras: { ds: 'DS ALENCAR', jun: 'Juninho' }, prodDS: { piso: 20, azulejo: 19 }, prodJun: { piso: 22, azulejo: 19 }, equipeDS: 0, equipeJun: 0, repassadosJun: 0, m2: { piso: 110, azulejo: 95 }, diasPorApto: 10 },
      estrategia: { vendido: {}, escopo: {}, segueprioridade: {}, rotulo: {} },
      manuais: {},
      retratoBase: {}, // aptos concluídos na data-base (BASE!W), por serviço
      vistorias: [], // vistorias do cliente na entrega
      categoriasReprova: null, // null = lista padrão (categoriasPadrao)
      pendencias: [],
      historico: [],
      meta: { ultimoBackup: null, pilhaDesfazer: [], importadoEm: null, origem: null }
    };
  }

  /** Categorias de reprova padrão, cada uma ligada à empreiteira do serviço correspondente. */
  function categoriasPadrao(estado) {
    const emp = id => (estado && estado.cronograma.servicos[id] ? estado.cronograma.servicos[id].empreiteira : '') || '';
    const piso = estado ? estado.piso.empreiteiras.ds + ' / ' + estado.piso.empreiteiras.jun : '';
    return [['Piso', piso], ['Rejunte', piso], ['Pintura', emp('pintura2')], ['Portas', emp('portas')], ['Louças e metais', emp('loucas')],
      ['Limpeza', emp('limpeza-fina')], ['Caixilhos', emp('regulagem')], ['Bancadas', ''], ['Rodapé', ''], ['Espelhos', ''], ['Elétrica', ''], ['Hidráulica', ''], ['Outros', '']]
      .map(([nome, empreiteira]) => ({ nome, empreiteira: String(empreiteira).trim() }));
  }
  function categoriasReprova(estado) { return estado.categoriasReprova && estado.categoriasReprova.length ? estado.categoriasReprova : categoriasPadrao(estado); }
  PA.modelo = { categoriasPadrao, categoriasReprova, SERVICOS, POR_ID, POR_ORDEM, APTOS, APTO_POR_NUM, ORDEM_PRUMADAS, ETAPAS_QUADRO, linhaGrade, colGrade, colRejunte, norm, estadoVazio };
})(typeof globalThis !== 'undefined' ? globalThis : this);
