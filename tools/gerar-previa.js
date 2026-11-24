#!/usr/bin/env node
/* Gera a prévia da v3 (modo local, sem servidor) com os dados da planilha v6 + vistorias de EXEMPLO.
   Uso: node tools/gerar-previa.js PASTA_SAIDA
   A pasta de saída recebe: previa.html (página), previa-dados.js e cópias de js/css/vendor/img do app. */
'use strict';
const fs = require('fs');
const path = require('path');
const { carregarApp, lerWorkbookV6 } = require('../tests/helpers');

const saida = path.resolve(process.argv[2] || 'previa');
const RAIZ = path.join(__dirname, '..');
const PA = carregarApp();
let e = PA.importar.deWorkbook(lerWorkbookV6());
const hoje = PA.datas.hojeSerial();
const d = n => PA.datas.workday(hoje, n);

// Vistorias de exemplo nos aptos liberados para a entrega (ou os primeiros aptos), para os painéis não ficarem vazios.
const res = PA.motor.calcular(e, hoje);
const ent = res.itens.filter(i => i.ordem === 12 && i.status !== 'Cancelado');
const candidatos = ent.filter(i => i.status !== 'Bloqueado').concat(ent.filter(i => i.status === 'Bloqueado')).map(i => i.apto);
const pega = () => candidatos.shift();
const V = PA.acoes.vistoria, acomp = 'Exemplo · Engenharia';
for (let k = 0; k < 4; k++) e = V.aprovar(e, pega(), { realizada: d(-10 + k), acompanhadoPor: acomp });
const motivos = [
  [{ categoria: 'Pintura', descricao: 'mancha no teto da sala' }, { categoria: 'Louças e metais', descricao: 'torneira da cozinha pingando' }],
  [{ categoria: 'Piso', descricao: 'peça trincada no banheiro' }],
  [{ categoria: 'Pintura', descricao: 'retoque na parede do quarto' }, { categoria: 'Caixilhos', descricao: 'janela da suíte não fecha' }],
  [{ categoria: 'Portas', descricao: 'porta do lavabo raspando' }, { categoria: 'Pintura', descricao: 'marca de rolo no corredor' }]
];
const reprovados = [];
motivos.forEach((m, k) => { const a = pega(); reprovados.push(a); e = V.reprovar(e, a, { realizada: d(-8 + k), acompanhadoPor: acomp, motivos: m, novaData: d(2 + k * 3) }); });
e = V.aprovar(e, reprovados[0], { realizada: d(-1), acompanhadoPor: acomp }); // aprovado após reprova
for (let k = 0; k < 3; k++) e = V.agendar(e, pega(), d(1 + k * 2), acomp);
e.meta.pilhaDesfazer = [];
e.meta.ultimoBackup = hoje; // a prévia não cobra backup
e.meta.origem = 'Prévia v3 · planilha v6 + vistorias de exemplo';

fs.rmSync(saida, { recursive: true, force: true });
fs.mkdirSync(saida, { recursive: true });
for (const p of ['js', 'css', 'vendor', 'img', 'config.js']) fs.cpSync(path.join(RAIZ, 'app', p), path.join(saida, p), { recursive: true });
fs.rmSync(path.join(saida, 'vendor', 'pocketbase.umd.js'));
fs.rmSync(path.join(saida, 'vendor', 'xlsx.full.min.js'));
fs.writeFileSync(path.join(saida, 'previa-dados.js'), 'window.PA_PREVIA = ' + JSON.stringify(e) + ';\n');
fs.copyFileSync(path.join(RAIZ, 'app', 'js', 'previa.js'), path.join(saida, 'js', 'previa.js'));

// Página: o index.html do app sem o esqueleto (a publicação acrescenta), sem PocketBase e com a prévia antes do início.
let html = fs.readFileSync(path.join(RAIZ, 'app', 'index.html'), 'utf8');
const corpo = html.slice(html.indexOf('<div id="app">'), html.indexOf('</body>'))
  .replace('  <script src="vendor/pocketbase.umd.js"></script>\n', '')
  .replace('  <script src="vendor/xlsx.full.min.js"></script>\n', '') // importar/exportar Excel fica fora da prévia
  .replace('<script src="config.js"></script>', '<script src="config.js"></script>\n  <script src="previa-dados.js"></script>')
  .replace('<script src="js/armazenamento.js"></script>', '<script src="js/armazenamento.js"></script>\n  <script src="js/previa.js"></script>');
const pagina = `<title>Plano de Ataque · Prévia v3</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="css/estilo.css">
<style>.faixa-previa{background:var(--and-bg);color:var(--text);border-bottom:1px solid var(--line-2);padding:8px max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px));font-size:13px;text-align:center;font-family:var(--font)}</style>
<div class="faixa-previa">PRÉVIA da nova versão · dados da planilha v6 + vistorias de exemplo · o que você mexer aqui fica só neste navegador e não altera o sistema real</div>
${corpo}`;
fs.writeFileSync(path.join(saida, 'previa.html'), pagina);
console.log('Prévia gerada em', saida, '·', (fs.statSync(path.join(saida, 'previa-dados.js')).size / 1024).toFixed(0), 'KB de dados');
