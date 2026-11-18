/* Motor — orquestra o cálculo completo, na mesma ordem de dependência da v6. */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  PA.motor = PA.motor || {};

  function calcular(estado, hoje) {
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
})(typeof globalThis !== 'undefined' ? globalThis : this);
