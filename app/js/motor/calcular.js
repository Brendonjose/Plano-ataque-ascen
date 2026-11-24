/* Motor — orquestra o cálculo completo, na mesma ordem de dependência da v6. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};

  /** A Entrega de um apto com vistoria realizada (aprovada ou reprovada) segue o histórico: a última manda.
   *  Vistoria só agendada não muda nada (o apto pode estar bloqueado ou já entregue). */
  function entregaPelasVistorias(estado) {
    const vs = (estado.vistorias || []).filter(v => v.resultado === 'aprovado' || v.resultado === 'reprovado');
    if (!vs.length) return estado;
    const ult = {};
    for (const v of vs) if (!ult[v.apto] || v.numero > ult[v.apto].numero || (v.numero === ult[v.apto].numero && v.resultado === 'aprovado')) ult[v.apto] = v;
    const ent = Object.assign({}, estado.lancamentos.entrega);
    for (const apto in ult) {
      const v = ult[apto], l = Object.assign({}, ent[apto] || {});
      if (v.resultado === 'aprovado') { l.codigo = '1'; if (typeof v.realizada === 'number') l.dataReal = v.realizada; }
      else { l.codigo = 'and'; delete l.dataReal; }
      ent[apto] = l;
    }
    return Object.assign({}, estado, { lancamentos: Object.assign({}, estado.lancamentos, { entrega: ent }) });
  }

  function calcular(estado, hoje) {
    estado = entregaPelasVistorias(estado);
    const m = PA.motor;
    const gc = m.gradeCompleta(estado);
    const lim = m.limites(estado);
    const itens = m.fila(estado, m.itens(estado, hoje, lim, gc));
    const cron = m.cronograma(estado, hoje, itens, lim);
    m.datasApto(estado, hoje, itens, cron);
    const res = { hoje, grade: gc.g, escopo: gc.esc, itens, cron };
    if (m.paineis) m.paineis(estado, res);
    return res;
  }
  PA.motor.calcular = calcular;
  PA.motor.entregaPelasVistorias = entregaPelasVistorias;
})(typeof globalThis !== 'undefined' ? globalThis : this);
