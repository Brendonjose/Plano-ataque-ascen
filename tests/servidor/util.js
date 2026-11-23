'use strict';
/* Sobe um PocketBase de teste (pasta temporária, porta livre) com as migrações e ganchos do projeto. */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const RAIZ = path.join(__dirname, '..', '..');
const BIN_DIR = path.join(RAIZ, 'node_modules', '.cache', 'pocketbase');
const BIN = path.join(BIN_DIR, 'pocketbase');
const SUPER = { email: 'super@teste.local', senha: 'Super-teste-123' };
const SENHA = 'Senha-teste-123';

function portaLivre() { return new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }

async function subir(opts) {
  execFileSync('bash', [path.join(RAIZ, 'servidor', 'baixar-pocketbase.sh'), BIN_DIR]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-pb-'));
  const args = ['--dir', path.join(dir, 'pb_data'), '--migrationsDir', path.join(RAIZ, 'servidor', 'pb_migrations'), '--hooksDir', path.join(RAIZ, 'servidor', 'pb_hooks'), '--publicDir', path.join(RAIZ, 'app')];
  execFileSync(BIN, ['migrate', 'up', ...args], { stdio: 'ignore' });
  execFileSync(BIN, ['superuser', 'upsert', SUPER.email, SUPER.senha, ...args], { stdio: 'ignore' });
  const porta = await portaLivre();
  const proc = spawn(BIN, ['serve', '--http', '127.0.0.1:' + porta, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; proc.stdout.on('data', d => { log += d; }); proc.stderr.on('data', d => { log += d; });
  const url = 'http://127.0.0.1:' + porta;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url + '/api/health'); if (r.ok) break; } catch (e) { /* aguarda */ }
    await new Promise(r => setTimeout(r, 100));
  }
  const PocketBase = require('pocketbase/cjs');
  const su = new PocketBase(url); su.autoCancellation(false);
  await su.collection('_superusers').authWithPassword(SUPER.email, SUPER.senha);
  const usuarios = {};
  for (const [papel, extra] of Object.entries(Object.assign({ admin: {}, obra: {}, obra2: {}, diretoria: {}, empreiteira: { empreiteira: 'Camargo' }, inativo: {} }, (opts && opts.usuarios) || {}))) {
    const p = papel === 'obra2' ? 'obra' : (papel === 'inativo' ? 'obra' : papel);
    const u = await su.collection('users').create(Object.assign({ email: papel + '@teste.local', password: SENHA, passwordConfirm: SENHA, nome: 'Usuário ' + papel, papel: p, ativo: papel !== 'inativo', verified: true }, extra));
    usuarios[papel] = u;
  }
  async function cliente(papel) {
    const c = new PocketBase(url); c.autoCancellation(false);
    await c.collection('users').authWithPassword(papel + '@teste.local', SENHA);
    return c;
  }
  async function parar() { proc.kill('SIGTERM'); await new Promise(r => setTimeout(r, 200)); fs.rmSync(dir, { recursive: true, force: true }); }
  return { url, su, usuarios, cliente, parar, log: () => log, SENHA };
}
module.exports = { subir, SENHA };
