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

test('carimbar_versao: arquivos locais do index.html ganham ?v= (e trocam numa nova atualização)', () => {
  const fs = require('fs'); const os = require('os'); const path = require('path');
  const { execFileSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carimbo-'));
  const arq = path.join(dir, 'index.html');
  fs.copyFileSync(path.join(__dirname, '..', '..', 'app', 'index.html'), arq);
  const lib = path.join(__dirname, '..', '..', 'servidor', 'lib.sh');
  execFileSync('bash', ['-c', `source "${lib}" && carimbar_versao "${arq}" abc123 && carimbar_versao "${arq}" def456`]);
  const html = fs.readFileSync(arq, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.length > 40);
  for (const r of refs) assert.match(r, /\?v=def456$/, r);
  assert.ok(html.includes('src="js/modelo.js?v=def456"'));
  fs.rmSync(dir, { recursive: true, force: true });
});
