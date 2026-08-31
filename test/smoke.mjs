/**
 * Smoke do bookfw: cria um projeto descartavel, percorre o fluxo inteiro e
 * confere que o gate reprova o que tem de reprovar.
 *
 *   npm test
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'bookfw.mjs');
const raiz = mkdtempSync(join(tmpdir(), 'bookfw-'));
const descartar = [raiz];
let falhas = 0;

/** Projeto descartavel proprio, para o teste que precisa comecar do zero. */
function projeto(titulo) {
  const dir = mkdtempSync(join(tmpdir(), 'bookfw-'));
  descartar.push(dir);
  const rodar = (...args) => {
    const r = spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8' });
    return { saida: (r.stdout || '') + (r.stderr || ''), codigo: r.status ?? 1 };
  };
  rodar('init', titulo);
  rodar('pd');
  rodar('sum');
  return { dir, rodar };
}

/** saida junta stdout e stderr — aviso do CLI sai em stderr e tambem e testavel. */
const run = (...args) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: raiz, encoding: 'utf8' });
  return { saida: (r.stdout || '') + (r.stderr || ''), codigo: r.status ?? 1 };
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

// Um arquivo por corte. Sem isso, `--desde pronto` sobrescreve em silencio o
// manuscrito de trabalho com uma versao parcial — e as duas tem a mesma cara.
ok('corte nao padrao ganha sufixo no nome',
  run('build', '--desde', 'esboco').saida.includes('-esboco.md'));

ok('validate --json devolve JSON', JSON.parse(run('validate', '--json').saida).erros.length === 0);

// dai em diante o capitulo vai para revisao, e o gate passa a cobrar prosa
run('cap', 'move', '1', 'revisao');
ok('gate reprova capitulo em revisao sem prosa escrita', run('validate').codigo === 1);

const padrao = run('build');
ok('corte padrao gera manuscrito', padrao.codigo === 0);
ok('corte padrao mantem o nome limpo',
  padrao.saida.includes('obra-de-teste.md') && !padrao.saida.includes('-revisao.md'));
ok('os dois cortes convivem no disco',
  existsSync(join(raiz, 'manuscrito', 'obra-de-teste.md'))
  && existsSync(join(raiz, 'manuscrito', 'obra-de-teste-esboco.md')));

// guarda do pronto: reabrir capitulo fechado exige --forcar
run('cap', 'move', '1', 'pronto');
const reabrir = run('cap', 'move', '1', 'escrita');
ok('recusa reabrir capitulo pronto sem --forcar', reabrir.codigo === 1);
ok('a recusa explica o que fazer', reabrir.saida.includes('--forcar'));
ok('brief avisa quando o capitulo esta pronto', run('brief', '1').saida.includes('esta em pronto'));
ok('reabre com --forcar', run('cap', 'move', '1', 'escrita', '--forcar').codigo === 0);
ok('mover para pronto segue livre', run('cap', 'move', '1', 'pronto').codigo === 0);

// ---------------------------------------------------------------------------
// Regressao dos quatro bugs de 0.1.3. Cada bloco e a sonda que provou a falha.
// ---------------------------------------------------------------------------

// 1. Cabecalho no meio do capitulo cortava a prosa. O `status` contava o texto
//    inteiro e o manuscrito saia com metade, sem aviso nenhum.
{
  const p = projeto('Prosa Cortada');
  p.rodar('cap', 'new', 'Um');
  const arq = join(p.dir, 'capitulos', 'backlog', 'cap-01-um.md');
  writeFileSync(arq, readFileSync(arq, 'utf8').replace(
    '<!-- a prosa da cena entra aqui, logo abaixo do contrato -->',
    'Primeira metade da prosa da cena.\n\n## Corte no meio\n\nSENTINELA depois do cabecalho.\n',
  ), 'utf8');
  p.rodar('build', '--desde', 'backlog');
  const ms = readFileSync(join(p.dir, 'manuscrito', 'prosa-cortada-backlog.md'), 'utf8');
  ok('prosa depois de cabecalho entra no manuscrito', ms.includes('SENTINELA'));
  ok('o cabecalho de trabalho nao entra no manuscrito', !ms.includes('Corte no meio'));
  ok('a contagem do capitulo inclui a prosa toda',
    /capitulos 1 \| cenas 1 \| palavras 1[0-9]\b/.test(p.rodar('validate').saida));
}

// 2. Promessa com crase no texto sumia do gate — o livro fechava com fio solto
//    e o validate dava OK.
{
  const p = projeto('Promessa Com Crase');
  const dirPd = join(p.dir, 'docs', 'plano-diretor');
  const pd = join(dirPd, readdirSync(dirPd)[0]);
  // ancorado na linha: o texto de instrucao do template cita `- P1 — texto`
  // como exemplo, e um replace solto acertaria a citacao em vez da promessa.
  writeFileSync(pd, readFileSync(pd, 'utf8')
    .replace('\n- P1 — \n', '\n- P1 — o `arquivo` que nao apaga volta no fim\n'), 'utf8');
  ok('promessa com crase e contada', JSON.parse(p.rodar('validate', '--json').saida).promessas === 1);
  ok('promessa com crase aparece no status', p.rodar('status').saida.includes('nao apaga volta no fim'));
}

// 3. Plano diretor revisado era ignorado: `[0]` pegava o mais antigo, e
//    revisar o PD desligava a cobranca de promessa em silencio.
{
  const p = projeto('Plano Revisado');
  writeFileSync(join(p.dir, 'docs', 'plano-diretor', 'PD-2099-01-01-revisao.md'),
    '---\ntitulo: Plano Revisado\n---\n\n## Promessas\n\n- P9 — a promessa que so existe no plano novo\n', 'utf8');
  const v = p.rodar('validate');
  ok('vale o plano diretor mais recente', v.saida.includes('P9'));
  ok('o gate diz qual plano diretor esta valendo', v.saida.includes('PD-2099-01-01-revisao.md'));
}

// 4. Capitulo em bloqueado sumia do manuscrito sem uma linha de aviso.
{
  const p = projeto('Capitulo Bloqueado');
  p.rodar('cap', 'new', 'Um');
  p.rodar('cap', 'new', 'Dois');
  const arq = join(p.dir, 'capitulos', 'backlog', 'cap-02-dois.md');
  writeFileSync(arq, readFileSync(arq, 'utf8').replace(
    '<!-- a prosa da cena entra aqui, logo abaixo do contrato -->',
    'Prosa escrita e depois bloqueada, que nao pode sumir calada.\n',
  ), 'utf8');
  p.rodar('cap', 'move', '2', 'bloqueado');
  const b = p.rodar('build', '--desde', 'backlog');
  ok('build avisa o capitulo com prosa que ficou de fora', b.saida.includes('fora do manuscrito'));
  ok('o aviso nomeia o arquivo e o estado',
    b.saida.includes('cap-02-dois.md') && b.saida.includes('bloqueado'));
  ok('build diz quantos capitulos de quantos entraram', b.saida.includes('1 de 2 capitulos'));
}

// ---------------------------------------------------------------------------
// 0.1.4 — os comandos que faltavam entre o que o gate cobra e o que o CLI cria.
// ---------------------------------------------------------------------------

/** Troca a tabela em branco do template do sumario por uma preenchida. */
function preencheSumario(dir, tabela) {
  const d = join(dir, 'docs', 'sumario');
  const arq = join(d, readdirSync(d)[0]);
  writeFileSync(arq, readFileSync(arq, 'utf8').replace(
    '| 01 | 1 |  |  | P1 | 2500 |\n| 02 | 1 |  |  |  | 2500 |', tabela,
  ), 'utf8');
}

// canon new — o gate reprovava personagem sem ficha e o CLI nao sabia criar uma.
{
  const p = projeto('Canon Novo');
  const cr = p.rodar('canon', 'new', 'personagem', 'Marta Vieira', '--apelidos', 'Marta, Dona Marta');
  ok('canon new cria ficha de personagem', cr.codigo === 0);
  const ficha = readFileSync(join(p.dir, 'docs', 'canon', 'personagens', 'marta-vieira.md'), 'utf8');
  ok('a ficha nasce com o nome preenchido', ficha.includes('nome: Marta Vieira'));
  ok('a ficha nasce com os apelidos', ficha.includes('apelidos: [Marta, Dona Marta]'));
  ok('a ficha nao deixa placeholder sobrando', !ficha.includes('{{'));

  ok('canon new aceita o plural do diretorio',
    p.rodar('canon', 'new', 'lugares', 'Cozinha da casa').codigo === 0);
  ok('o lugar tambem nasce sem placeholder',
    !readFileSync(join(p.dir, 'docs', 'canon', 'lugares', 'cozinha-da-casa.md'), 'utf8').includes('{{'));

  // Nome repetido e o comeco de toda contradicao: duas fichas do mesmo sujeito.
  const choque = p.rodar('canon', 'new', 'personagem', 'dona marta');
  ok('canon new recusa nome que ja e apelido de outra ficha', choque.codigo === 1);
  ok('a recusa nomeia a ficha que ja ocupa o nome', choque.saida.includes('marta-vieira.md'));

  // O gate deixou de apontar diretorio e passou a dar o comando pronto.
  p.rodar('cap', 'new', 'Um');
  p.rodar('cena', 'add', '1', '--personagens', 'Fulano', '--objetivo', 'x', '--conflito', 'y', '--virada', 'z');
  p.rodar('cap', 'move', '1', 'esboco');
  ok('o gate diz o comando que cria a ficha que falta',
    p.rodar('validate').saida.includes('bookfw canon new personagem "Fulano"'));
}

// sum --materializar — eram 17 e 24 `cap new` digitados nas duas obras reais.
{
  const p = projeto('Sumario Materializado');
  // ultima coluna "Fonte", nao "Palavras": as obras reais trocam essa coluna,
  // entao a leitura tem de ser por nome de coluna e nao por posicao.
  preencheSumario(p.dir, [
    '| 01 | 1 | A kombi | mundo e ferida | P1 | original |',
    '| 02 | 1 | O fosforo | incidente incitante | P2 | fluxo |',
    '| 07 | 2a | A mascara | falso ganho | **paga P1** | fluxo |',
  ].join('\n'));

  const sim = p.rodar('sum', '--simular');
  ok('sum --simular lista o que criaria', sim.saida.includes('criaria') && sim.saida.includes('A kombi'));
  ok('sum --simular nao escreve nada', !existsSync(join(p.dir, 'capitulos', 'backlog', 'cap-01-a-kombi.md')));

  const mat = p.rodar('sum', '--materializar');
  ok('sum --materializar cria os capitulos do sumario',
    existsSync(join(p.dir, 'capitulos', 'backlog', 'cap-01-a-kombi.md'))
    && existsSync(join(p.dir, 'capitulos', 'backlog', 'cap-07-a-mascara.md')));
  ok('a coluna final variavel nao atrapalha a leitura', mat.saida.includes('3 criados'));
  ok('o numero do sumario e respeitado, buraco inclusive',
    readFileSync(join(p.dir, 'capitulos', 'backlog', 'cap-07-a-mascara.md'), 'utf8').includes('numero: 7'));

  const denovo = p.rodar('sum', '--materializar');
  ok('materializar duas vezes nao duplica nada', denovo.saida.includes('0 criados'));
  ok('e diz o que pulou', denovo.saida.includes('ja existe') && denovo.saida.includes('cap-01-a-kombi.md'));
}

// Sumario de obra real: uma segunda tabela depois da de capitulos, e uma linha
// de vao ("04–06 | a escrever"). Varrer o arquivo inteiro atras de linha com
// barra criava capitulo 406 e um capitulo 1 fantasma vindo de "da pagina 1".
{
  const p = projeto('Sumario Real');
  preencheSumario(p.dir, [
    '| 01 | 1 | A kombi | mundo e ferida | P1 | original |',
    '| 04–06 | 2a | a escrever |  |  |  |',
    '',
    'Texto entre as duas tabelas, que e o que as separa.',
    '',
    '| Ato | Capitulos | Funcao | Virada que fecha o ato |',
    '|---|---|---|---|',
    '| 2 | 08-12 | pressao, perdas, ponto mais baixo | ele perde o emprego |',
    '| 3 | 20-24 | escolha, climax, novo equilibrio | pede ajuda pela primeira vez |',
  ].join('\n'));

  const s = p.rodar('sum', '--simular');
  ok('a segunda tabela do sumario nao vira capitulo',
    !s.saida.includes('ponto mais baixo') && !s.saida.includes('novo equilibrio'));
  ok('so a tabela de capitulos e lida', s.saida.includes('1 a criar'));
  ok('linha de vao nao vira capitulo inventado', !s.saida.includes('406'));
  ok('linha de vao e reportada, nao sumida', s.saida.includes('ignorada') && s.saida.includes('04–06'));

  p.rodar('sum', '--materializar');
  const criados = readdirSync(join(p.dir, 'capitulos', 'backlog'));
  ok('materializou exatamente o capitulo valido', criados.length === 1 && criados[0] === 'cap-01-a-kombi.md');
}

// sum --materializar sobre sumario em branco: erro que diz qual dos dois e.
{
  const p = projeto('Sumario Vazio');
  const vazio = p.rodar('sum', '--materializar');
  ok('materializar sumario em branco reprova', vazio.codigo === 1);
  ok('e distingue tabela vazia de tabela ausente', vazio.saida.includes('preenchidos'));
}

// cena add — da segunda cena em diante era edicao de markdown na mao.
{
  const p = projeto('Cena Nova');
  p.rodar('cap', 'new', 'Um');
  const a = p.rodar('cena', 'add', '1', '--objetivo', 'sair antes que percebam');
  ok('cena add acrescenta contrato ao capitulo', a.codigo === 0);
  ok('o id segue a numeracao que o capitulo ja usa', a.saida.includes('cena 1.2'));
  ok('a dica lista so o que ficou em branco',
    a.saida.includes('conflito, virada em branco') && !a.saida.includes('objetivo, conflito'));

  const arq = join(p.dir, 'capitulos', 'backlog', 'cap-01-um.md');
  ok('o bloco novo e um contrato de cena valido',
    /```cena\n[\s\S]*?id: 1\.2[\s\S]*?```/.test(readFileSync(arq, 'utf8')));
  ok('o capitulo passa a ter duas cenas', p.rodar('status').saida.includes(' 2 cenas'));

  // id com letra continua com letra: impor esquema reescreveria a mao do autor.
  writeFileSync(arq, readFileSync(arq, 'utf8').replace('id: 1.2', 'id: 1.B'), 'utf8');
  ok('id com letra continua na letra seguinte', p.rodar('cena', 'add', '1').saida.includes('cena 1.C'));

  // mesma guarda do cap move: capitulo fechado nao muda de estrutura sozinho
  p.rodar('cap', 'move', '1', 'pronto', '--forcar');
  const emPronto = p.rodar('cena', 'add', '1');
  ok('cena add recusa capitulo em pronto sem --forcar', emPronto.codigo === 1);
  ok('a recusa explica o que fazer', emPronto.saida.includes('--forcar'));
  ok('cena add em pronto passa com --forcar', p.rodar('cena', 'add', '1', '--forcar').codigo === 0);
}

for (const d of descartar) rmSync(d, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} falha(s).` : '\nOK.');
process.exit(falhas ? 1 : 0);
