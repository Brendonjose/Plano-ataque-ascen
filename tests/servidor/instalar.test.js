'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const SCRIPT = path.join(__dirname, '..', '..', 'servidor', 'instalar.sh');

test('instalar.sh: sintaxe válida', () => {
  const r = spawnSync('bash', ['-n', SCRIPT], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
});
test('instalar.sh sem domínio sai com código 2 e mostra o uso', () => {
  const r = spawnSync('bash', [SCRIPT], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  assert.match(r.stdout + r.stderr, /Uso: .*--dominio/);
});
test('instalar.sh --simular lista as 8 ações na ordem, sem executar', () => {
  const r = spawnSync('bash', [SCRIPT, '--simular', '--dominio', 'teste.duckdns.org', '--admin-email', 'a@b.c', '--admin-senha', 'Senha-forte-123'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const passos = r.stdout.split('\n').filter(l => /^\[\d\/8\]/.test(l)).map(l => l.slice(0, 5));
  assert.deepStrictEqual(passos, ['[1/8]', '[2/8]', '[3/8]', '[4/8]', '[5/8]', '[6/8]', '[7/8]', '[8/8]']);
  assert.match(r.stdout, /teste\.duckdns\.org/);
  assert.ok(!r.stdout.includes('Senha-forte-123'), 'não mostra a senha');
});
test('instalar.sh recusa senha fraca', () => {
  const r = spawnSync('bash', [SCRIPT, '--simular', '--dominio', 'teste.duckdns.org', '--admin-email', 'a@b.c', '--admin-senha', '123'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
});
test('servidor sai configurado com backup diário (7 cópias) e limites', { timeout: 60000 }, async () => {
  const { subir } = require('./util');
  const S = await subir();
  try {
    const cfg = await S.su.settings.getAll();
    assert.deepStrictEqual([cfg.backups.cron, cfg.backups.cronMaxKeep, cfg.batch.enabled], ['0 6 * * *', 7, false]);
  } finally { await S.parar(); }
});
