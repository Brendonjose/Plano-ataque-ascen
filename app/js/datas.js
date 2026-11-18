/* Funções de data no padrão Excel (serial com base em 30/12/1899). */
(function (root) {
  'use strict';
  const PA = root.PA = root.PA || {};
  const BASE_UTC = Date.UTC(1899, 11, 30);
  const DIA = 864e5;

  function deISO(s) {
    if (!s) return null;
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - BASE_UTC) / DIA);
  }
  function paraDate(n) { return new Date(BASE_UTC + Math.floor(n) * DIA); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function paraISO(n) {
    if (n === null || n === undefined || n === '') return '';
    const d = paraDate(n);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function fmt(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    const d = paraDate(n);
    return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  }
  function fmtCurto(n) { return typeof n === 'number' ? fmt(n).slice(0, 5) : ''; }
  /** Serial do dia local (data do computador) ou de um Date informado. */
  function hojeSerial(date) {
    const d = date || new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - BASE_UTC) / DIA);
  }
  function diaSemana(n) { return paraDate(n).getUTCDay(); } // 0 = domingo
  function diaUtil(n, fer) { const w = diaSemana(n); return w !== 0 && w !== 6 && !(fer && fer.has(n)); }

  /** WORKDAY do Excel: dias truncados; 0 devolve a data inicial. */
  function workday(inicio, dias, fer) {
    let n = Math.floor(inicio);
    let k = Math.trunc(dias);
    const passo = k >= 0 ? 1 : -1;
    k = Math.abs(k);
    while (k > 0) { n += passo; if (diaUtil(n, fer)) k--; }
    return n;
  }
  /** NETWORKDAYS do Excel: inclusivo; negativo se a > b. */
  function networkdays(a, b, fer) {
    a = Math.floor(a); b = Math.floor(b);
    if (a > b) return -networkdays(b, a, fer);
    let c = 0;
    for (let n = a; n <= b; n++) if (diaUtil(n, fer)) c++;
    return c;
  }
  PA.datas = { deISO, paraISO, paraDate, fmt, fmtCurto, hojeSerial, diaSemana, diaUtil, workday, networkdays };
})(typeof globalThis !== 'undefined' ? globalThis : this);
