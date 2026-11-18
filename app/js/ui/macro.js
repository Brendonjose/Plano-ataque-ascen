/* Tela Macro e Quadros — PAINEL MACRO + QUADRO F1–F4 (seletor Cenário atual / Necessário). */
(function (root) {
  'use strict';
  const PA = root.PA;
  const { h, fmt, folgaEl, modal } = PA.ui;

  function pref(k, p) { try { return sessionStorage.getItem(k) || p; } catch (e) { return p; } }
  function setPref(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignora */ } }
  const sit = s => h('span.pill.' + ({ 'Atrasada': 'late', 'No prazo': 'ok', 'Concluída': 'ok' }[s] || 'blq'), s);

  function visaoMacro(ctx) {
    const m = ctx.resultado.macro, g = m.geral;
    const k = (r, v, s, cls) => h('div.kpi.' + (cls || 'navy'), h('div.r', r), h('div.v', v), h('div.s', s || ''));
    return h('div.pilha',
      h('div.kpis', { style: { gridTemplateColumns: 'repeat(4, minmax(0,1fr))' } },
        k('Meta da obra', fmt.data(g.meta), 'data-alvo macro'), k('Término projetado', fmt.dataOu(g.termino), 'equipes de hoje', g.folga < 0 ? 'late' : 'ok'),
        k('Folga', (g.folga > 0 ? '+' : '') + fmt.num(g.folga) + ' dias', g.folga < 0 ? 'atraso projetado' : 'dentro da meta', g.folga < 0 ? 'late' : 'ok'),
        k('% concluído', fmt.pct(g.pct, 1), g.entregues + ' de ' + g.aptosEscopo + ' aptos entregues', 'teal')),
      h('div.cartao', h('h2', 'Prazo por prumada', h('small', `pendências: ${g.pendAbertas} abertas · ${g.pendAtrasadas} atrasadas`)),
        h('div.tabela-wrap', h('table.tab', h('thead', h('tr', ['Prumada', 'Situação', 'Meta', 'Término projetado', 'Folga', 'Aptos no escopo', 'Entregues', '% concluído', 'Pend. abertas', 'Maior gerador de atraso'].map((t, i) => h('th' + ([4, 5, 6, 7, 8].includes(i) ? '.num' : ''), t)))),
          h('tbody', m.prumadas.map(p => h('tr' + (p.final === null ? '.destaque' : ''), h('td', p.final === null ? 'Obra completa (macro)' : 'Final ' + p.final), h('td', sit(p.situacao)), h('td', fmt.data(p.meta)),
            h('td', fmt.dataOu(p.termino, 'concluída')), h('td.num', folgaEl(p.folga)), h('td.num', p.aptosEscopo), h('td.num', p.entregues), h('td.num', fmt.pct(p.pct, 1)), h('td.num', p.pendAbertas), h('td', p.gerador))))))),
      h('div.cartao', h('h2', 'Etapas × prumada', h('small', '% ok = aptos concluídos ÷ aptos no escopo · término previsto · folga em dias')),
        h('div.tabela-wrap', h('table.tab',
          h('thead', h('tr', h('th', 'Etapa'), h('th', 'Empreiteira'), [1, 2, 3, 4].map(f => h('th', { colspan: 3, style: { textAlign: 'center' } }, 'Final ' + f)), h('th', { colspan: 3, style: { textAlign: 'center' } }, 'Obra (todas)')),
            h('tr', h('th'), h('th'), [1, 2, 3, 4, 5].map(() => [h('th.num', '% ok'), h('th', 'Término'), h('th.num', 'Folga')]))),
          h('tbody', m.matriz.map(x => h('tr', h('td', h('b', x.servico)), h('td.peq', x.empreiteira),
            [1, 2, 3, 4].map(f => { const c = x.prumadas[f]; return [h('td.num', fmt.pct(c.pct)), h('td', fmt.dataOu(c.termino)), h('td.num', folgaEl(c.folga))]; }),
            h('td.num', fmt.pct(x.obra.pct)), h('td', fmt.dataOu(x.obra.termino)), h('td.num', folgaEl(x.obra.folga)))))))));
  }

  function editarManual(ctx, apto, etapa, atual) {
    const inp = h('input', { value: atual || '', placeholder: 'ok, data ou observação' });
    const salvar = () => { m.fechar(); PA.ui.aplicar(PA.acoes.manual(ctx.estado, apto, etapa, inp.value.trim()), { msg: `${etapa} · apto ${apto} atualizado` }); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') salvar(); });
    const m = modal(`${etapa} · apto ${apto}`, [h('p.mudo.peq', 'Coluna manual (não altera os prazos). Deixe vazio para apagar.'), h('label.campo', 'Valor', inp)],
      [h('button.btn', { onclick: () => m.fechar() }, 'Cancelar'), h('button.btn.prim', { onclick: salvar }, 'Salvar')]);
  }

  function quadro(ctx, final, modo) {
    const q = PA.motor.quadro(ctx.estado, ctx.resultado, final, modo);
    const cel = c => {
      if (c.manual) return null;
      if (c.valor === 'ok') return h('td.okc', 'ok');
      if (c.valor === '—') return h('td.trc', '—');
      return h('td' + (c.atrasada ? '.atr' : ''), c.data ? fmt.curta(c.valor) : '');
    };
    return h('div.cartao',
      h('h2', 'Quadro — Final ' + final, h('small', modo === 'necessario' ? 'Necessário: data máxima para cada apto terminar a etapa a tempo' : 'Cenário atual: projeção com as equipes de hoje')),
      h('div.quadro-wrap', h('table.quadro',
        h('thead',
          h('tr', h('th.fix', 'Data-limite'), h('th'), q.colunas.map(c => h('th', c.manual ? '' : fmt.curta(c.limite))), h('th')),
          h('tr', h('th.fix', modo === 'necessario' ? 'Término necessário' : 'Término previsto'), h('th'), q.colunas.map(c => h('th', c.manual ? '' : fmt.dataOu(c.termino === 'ok' ? 'ok' : c.termino).slice(0, 5))), h('th')),
          h('tr', h('th.fix', '% concluído'), h('th'), q.colunas.map(c => h('th', c.manual ? '' : fmt.pct(c.pct))), h('th')),
          h('tr', h('th.fix', 'Apto'), h('th', 'Vendido?'), q.colunas.map(c => h('th', { style: c.manual ? { background: '#FFF4D6', color: '#6B4E00' } : {} }, c.col)), h('th', 'Pend.'))),
        h('tbody', q.linhas.map(l => h('tr', h('td.fix', l.apto), h('td', l.vendido),
          l.celulas.map((c, j) => c.manual ? h('td.man', { title: 'Clique para editar', onclick: () => editarManual(ctx, l.apto, q.colunas[j].col, c.valor) }, c.valor) : cel(c)),
          h('td', l.pendAbertas || '')))))),
      h('p.mudo.peq', { style: { marginTop: '10px' } }, 'ok = concluído · data = término · — = fora do escopo · vermelho = depois da data-limite · colunas amarelas são manuais (clique para editar).'));
  }

  function render(el, ctx) {
    const aba = pref('pa.macroAba', 'macro');
    const modo = pref('pa.quadroModo', 'atual');
    const tab = (id, t) => h('button' + (aba === id ? '.ativo' : ''), { onclick: () => { setPref('pa.macroAba', id); PA.ui.desenhar(); } }, t);
    el.appendChild(h('div.linha', { style: { marginBottom: '14px', justifyContent: 'space-between' } },
      h('div.seg', tab('macro', 'Visão macro'), tab('F1', 'Quadro F1'), tab('F2', 'Quadro F2'), tab('F3', 'Quadro F3'), tab('F4', 'Quadro F4')),
      aba !== 'macro' ? h('div.seg', { title: 'Datas exibidas no quadro' },
        h('button' + (modo === 'atual' ? '.ativo' : ''), { onclick: () => { setPref('pa.quadroModo', 'atual'); PA.ui.desenhar(); } }, 'Cenário atual'),
        h('button' + (modo === 'necessario' ? '.ativo' : ''), { onclick: () => { setPref('pa.quadroModo', 'necessario'); PA.ui.desenhar(); } }, 'Necessário')) : null,
      aba !== 'macro' ? h('button.btn.peq', { onclick: () => window.print() }, PA.ui.icone('imprimir'), 'Imprimir') : null));
    el.appendChild(aba === 'macro' ? visaoMacro(ctx) : quadro(ctx, Number(aba.slice(1)), modo));
  }
  PA.ui.registrarTela('macro', { titulo: 'Macro e quadros por prumada', menu: 'Macro', icone: 'quadros', render });
})(typeof globalThis !== 'undefined' ? globalThis : this);
