'use strict';
/* Achados da revisão final da v2 (checkpoint 2). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawnSync } = require('child_process');
const { carregarApp, lerWorkbookV6, HOJE_FIXTURE } = require('./helpers');
const PA = carregarApp();
let e, res;
test.before(() => { e = PA.importar.deWorkbook(lerWorkbookV6()); res = PA.motor.calcular(e, HOJE_FIXTURE); });

test('I2: Acompanhamento da empreiteira do piso inclui os aptos "A definir", como o relatório', () => {
  const a = PA.motor.acompanhamento(res, { servico: 'Piso', empreiteira: 'DS ALENCAR' }, e);
  const r = PA.motor.relatorio(e, res, { empreiteira: 'DS ALENCAR', servicos: ['piso'], incluirExecutados: false });
  assert.strictEqual(a.numeros.total - a.numeros.executado - a.numeros.fora, r.linhas.length);
  assert.ok(a.numeros.liberado + a.numeros.execucao > 0);
});
test('I3: cabeçalho do relatório do piso usa a equipe e o término da própria empresa', () => {
  const ds = PA.motor.relatorio(e, res, { empreiteira: 'DS ALENCAR', servicos: ['piso'] }).cabecalho.servicos[0];
  assert.deepStrictEqual([ds.equipe, ds.termino], [e.piso.equipeDS, res.cron.piso.finalDS]);
  const jn = PA.motor.relatorio(e, res, { empreiteira: 'Juninho', servicos: ['piso'] }).cabecalho.servicos[0];
  assert.deepStrictEqual([jn.equipe, jn.termino], [e.piso.equipeJun, res.cron.piso.finalJun]);
});
test('I4: instalador já instalado não pede nem troca a senha do painel técnico', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-inst-'));
  fs.mkdirSync(path.join(dir, 'pb_data')); fs.writeFileSync(path.join(dir, 'pb_data', '.admin_criado'), 'x');
  const r = spawnSync('bash', [path.join(__dirname, '..', 'servidor', 'instalar.sh'), '--simular', '--dominio', 'x.duckdns.org', '--admin-email', 'a@b.c'],
    { encoding: 'utf8', env: Object.assign({}, process.env, { PA_DESTINO: dir }), input: '' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /já instalado.*senha.*não foram alterados/i);
  assert.ok(!/superuser upsert/.test(r.stdout));
});
test('I5: espera do HTTPS falha com mensagem clara', () => {
  const r = spawnSync('bash', ['-c', `source ${path.join(__dirname, '..', 'servidor', 'lib.sh')}; esperar_https https://127.0.0.1:9/ 1 0`], { encoding: 'utf8' });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /DuckDNS.*80.*443.*de novo/s);
});
