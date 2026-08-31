/**
 * Lint do proprio bookfw. Nao e lint de estilo — para isso o smoke ja serve.
 * Cada regra aqui existe porque a coisa correspondente ja quebrou:
 *
 *   npm run lint
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');
const erros = [];
const falha = (regra, msg) => erros.push(`${regra}: ${msg}`);

const pkg = JSON.parse(ler('package.json'));
const srcs = readdirSync(join(RAIZ, 'src')).filter((f) => f.endsWith('.mjs'));
const todoOCodigo = [ler('bin', 'bookfw.mjs'), ...srcs.map((f) => ler('src', f))].join('\n');

// 1. Template no disco que nenhum comando le e template morto: personagem.md e
//    lugar.md ficaram assim ate a 0.1.4, com o gate exigindo a ficha que eles
//    descrevem e nenhum comando capaz de cria-la.
for (const t of readdirSync(join(RAIZ, 'templates'))) {
  if (!todoOCodigo.includes(`'${t}'`)) falha('template-morto', `templates/${t} nao e lido por nenhum comando`);
}

// 2. Placeholder que nenhuma substituicao preenche sai no arquivo do autor como
//    `{{nome}}` cru.
for (const t of readdirSync(join(RAIZ, 'templates'))) {
  for (const [, chave] of ler('templates', t).matchAll(/\{\{(\w+)\}\}/g)) {
    if (!todoOCodigo.includes(`${chave}:`) && !todoOCodigo.includes(`${chave},`)) {
      falha('placeholder-orfao', `templates/${t} usa {{${chave}}} e nada no codigo passa essa chave`);
    }
  }
}

// 3. Comando que existe no switch do bin e nao aparece na ajuda e comando que
//    so quem leu o codigo sabe que existe.
const bin = ler('bin', 'bookfw.mjs');
const ajuda = bin.slice(bin.indexOf('const AJUDA'), bin.indexOf('function parse'));
const ignorar = new Set(['version', '--version', '-v', 'help', '--help', '-h', 'undefined']);
for (const [, cmd] of bin.slice(bin.indexOf('switch (cmd)')).matchAll(/case '([a-z-]+)':/g)) {
  if (!ignorar.has(cmd) && !ajuda.includes(`bookfw ${cmd}`)) {
    falha('comando-sem-ajuda', `"${cmd}" existe no bin e nao aparece em AJUDA`);
  }
}

// 4. Versao publicada sem entrada no changelog e release que ninguem consegue
//    ler depois.
if (!ler('CHANGELOG.md').includes(`## ${pkg.version} `)) {
  falha('changelog', `nao ha secao "## ${pkg.version}" no CHANGELOG.md`);
}

// 5. O que o npm empacota. O CHANGELOG ficou de fora ate a 0.3.0 — quem
//    instalava do registry nao tinha como saber o que mudou.
for (const obrigatorio of ['bin', 'src', 'templates', 'README.md', 'CHANGELOG.md']) {
  if (!pkg.files.includes(obrigatorio)) falha('files', `package.json nao empacota ${obrigatorio}`);
}

// 6. Todo modulo de src precisa ser alcancavel a partir do bin, direta ou
//    indiretamente. Arquivo orfao e codigo que ninguem executa e ninguem testa.
const alcancados = new Set();
const alcancar = (arq) => {
  if (alcancados.has(arq)) return;
  alcancados.add(arq);
  for (const [, dep] of ler('src', arq).matchAll(/from '\.\/([\w-]+\.mjs)'/g)) alcancar(dep);
};
for (const [, arq] of bin.matchAll(/from '\.\.\/src\/([\w-]+\.mjs)'/g)) alcancar(arq);
for (const f of srcs) if (!alcancados.has(f)) falha('modulo-orfao', `src/${f} nao e importado a partir do bin`);

// 7. O README precisa citar todo comando da ajuda: e a porta de entrada de quem
//    nao roda `bookfw help`.
const readme = ler('README.md');
for (const [, cmd] of ajuda.matchAll(/bookfw ([a-z-]+)/g)) {
  if (cmd !== 'help' && !readme.includes(`bookfw ${cmd}`)) {
    falha('readme', `comando "${cmd}" nao aparece no README`);
  }
}

console.log(`bookfw ${pkg.version} | ${srcs.length} modulos | ${readdirSync(join(RAIZ, 'templates')).length} templates`);
if (!existsSync(join(RAIZ, 'test', 'smoke.mjs'))) falha('teste', 'test/smoke.mjs sumiu');
for (const e of erros) console.log(`  ERRO   ${e}`);
console.log(erros.length ? `\n${erros.length} problema(s).` : '\nOK.');
process.exit(erros.length ? 1 : 0);
