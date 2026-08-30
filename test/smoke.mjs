/**
 * Smoke do bookfw: cria um projeto descartavel, percorre o fluxo inteiro e
 * confere que o gate reprova o que tem de reprovar.
 *
 *   npm test
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'bookfw.mjs');
const raiz = mkdtempSync(join(tmpdir(), 'bookfw-'));
let falhas = 0;

const run = (...args) => {
  try {
    return { saida: execFileSync(process.execPath, [CLI, ...args], { cwd: raiz, encoding: 'utf8' }), codigo: 0 };
  } catch (e) {
    return { saida: (e.stdout || '') + (e.stderr || ''), codigo: e.status ?? 1 };
  }
};
const ok = (nome, cond) => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome}`); falhas++; }
};

console.log(`smoke em ${raiz}`);

ok('init cria o projeto', run('init', 'Obra de Teste', '--genero', 'suspense').codigo === 0);
ok('dec', run('dec', 'Narracao em primeira pessoa no passado').codigo === 0);
ok('pd', run('pd').codigo === 0);
ok('sum', run('sum').codigo === 0);
ok('cap new', run('cap', 'new', 'O telefonema', '--ato', '1').codigo === 0);

ok('titulo com dois-pontos e recusado', run('dec', 'Isto e: proibido').codigo === 1);

// capitulo em backlog com contrato em branco: aviso, nao erro
ok('gate passa com contrato em branco no backlog', run('validate').codigo === 0);

// contrato em branco fora do backlog: erro
run('cap', 'move', '1', 'esboco');
ok('gate reprova contrato em branco fora do backlog', run('validate').codigo === 1);

// preenche contrato e ficha de canon
const capPath = join(raiz, 'capitulos', 'esboco', 'cap-01-o-telefonema.md');
const cap = readFileSync(capPath, 'utf8')
  .replace('local:', 'local: Cozinha')
  .replace('personagens: []', 'personagens: [Marta]')
  .replace('objetivo:', 'objetivo: atender antes que desliguem')
  .replace('conflito:', 'conflito: o telefone esta do outro lado da casa')
  .replace('virada:', 'virada: quem liga nao e quem ela esperava')
  .replace('saida:', 'saida: ela entende que foi vigiada');
writeFileSync(capPath, cap, 'utf8');

ok('gate reprova personagem fora do canon', run('validate').codigo === 1);

mkdirSync(join(raiz, 'docs', 'canon', 'personagens'), { recursive: true });
writeFileSync(join(raiz, 'docs', 'canon', 'personagens', 'marta.md'),
  '---\nnome: Marta\nresumo: protagonista\n---\n\n## Quem e\n\nProtagonista.\n', 'utf8');

ok('gate passa com o canon completo', run('validate').codigo === 0);
ok('brief monta o pacote da cena', run('brief', '1').saida.includes('BRIEFING DE CENA'));
ok('status roda', run('status').codigo === 0);
ok('context roda', run('context').saida.includes('Contexto da obra'));
ok('build costura o manuscrito', run('build', '--desde', 'esboco').codigo === 0);
ok('validate --json devolve JSON', JSON.parse(run('validate', '--json').saida).erros.length === 0);

rmSync(raiz, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} falha(s).` : '\nOK.');
process.exit(falhas ? 1 : 0);
