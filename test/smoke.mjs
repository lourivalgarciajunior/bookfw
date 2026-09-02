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

/**
 * Reescreve o sumario com a tabela dada. Reescrever em vez de substituir as
 * linhas do template deixa a funcao idempotente: o mesmo projeto pode ter o
 * sumario trocado mais de uma vez no mesmo teste.
 */
function preencheSumario(dir, tabela) {
  const d = join(dir, 'docs', 'sumario');
  const arq = join(d, readdirSync(d)[0]);
  writeFileSync(arq, [
    '---', 'titulo: Teste', 'data: 2026-01-01', '---', '',
    '# Sumario', '',
    '| # | Ato | Titulo | Funcao no arco | Promessas | Palavras |',
    '|---|---|---|---|---|---|',
    tabela, '',
  ].join('\n'), 'utf8');
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

// init dentro de uma pasta que ja guarda livros espalharia os arquivos ao lado deles.
{
  const porta = mkdtempSync(join(tmpdir(), 'bookfw-porta-'));
  descartar.push(porta);
  const dentro = (cwd, ...args) => {
    const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
    return { saida: (r.stdout || '') + (r.stderr || ''), codigo: r.status ?? 1 };
  };
  mkdirSync(join(porta, 'livro-a'), { recursive: true });
  dentro(join(porta, 'livro-a'), 'init', 'Livro A');
  const espalha = dentro(porta, 'init', 'Livro B');
  ok('init recusa pasta que ja guarda livros', espalha.codigo === 1);
  ok('a recusa nomeia o projeto encontrado', espalha.saida.includes('livro-a'));
  ok('a recusa ensina o mkdir', espalha.saida.includes('mkdir meu-livro'));
  ok('--forcar passa por cima', dentro(porta, 'init', 'Livro B', '--forcar').codigo === 0);
  ok('--titulo vale como titulo',
    dentro(join(porta, 'livro-a'), 'status').saida.includes('Livro A'));
}

// ---------------------------------------------------------------------------
// bookfw docx — o carimbo de ressalva.
//
// O modo de falha deste comando nao e o erro: e o capitulo nao confirmado
// saindo do papel com a mesma cara de um capitulo apurado. Um so numero cobre
// os dois sentidos da regressao — carimbo que some e carimbo que sobra.
// ---------------------------------------------------------------------------
{
  // `docx` e dependencia opcional. Sem ela, os casos que geram arquivo sao
  // pulados com aviso na tela — nunca silenciosamente verdes.
  let Zip = null;
  try {
    await import('docx');
    Zip = (await import('jszip')).default;
  } catch { /* ausente */ }

  if (!Zip) {
    console.log('  PULADO  bookfw docx — pacote `docx` ausente (npm i docx para cobrir)');
  } else {
    const p = projeto('Carimbo');

    /**
     * Insere linhas no frontmatter, logo depois do `---` de abertura. O `\r?`
     * nao e enfeite: no Windows o template chega com CRLF, e um `^---\n` cru
     * nao casa — o helper nao insere nada e o teste passa a medir um
     * frontmatter vazio, verde por engano.
     */
    const fmAdd = (arq, linhas) => {
      const t = readFileSync(arq, 'utf8');
      const novo = t.replace(/^---\r?\n/, (m) => `${m}${linhas.join('\n')}\n`);
      if (novo === t) throw new Error(`fmAdd nao achou o frontmatter de ${arq}`);
      writeFileSync(arq, novo, 'utf8');
    };
    const capArq = (n, slug) => join(p.dir, 'capitulos', 'backlog', `cap-0${n}-${slug}.md`);
    const texto = async (nome) => {
      const z = await Zip.loadAsync(readFileSync(join(p.dir, 'manuscrito', nome)));
      return z.file('word/document.xml').async('string');
    };
    const conta = (s, alvo) => s.split(alvo).length - 1;

    for (const t of ['Um', 'Dois', 'Tres', 'Quatro']) p.rodar('cap', 'new', t);

    // 1. valor na mesma linha — a unica forma que o gerador copiado entendia
    fmAdd(capArq(1, 'um'), ['verificar: a data da internacao']);
    // 2. lista em bloco — a forma que saia do papel sem carimbo nenhum
    fmAdd(capArq(2, 'dois'), ['verificar:', '  - a data', '  - o nome do hospital']);
    // 3. especime tem precedencia sobre verificar
    fmAdd(capArq(3, 'tres'), ['origem: ESPECIME DE FORMA', 'verificar: tudo']);
    // 4. capitulo sem pendencia nenhuma: tem de sair limpo
    for (let i = 1; i <= 4; i++) {
      const arq = capArq(i, ['um', 'dois', 'tres', 'quatro'][i - 1]);
      writeFileSync(arq, `${readFileSync(arq, 'utf8')}\n\nProsa do capitulo ${i}.\n`, 'utf8');
      p.rodar('cap', 'move', String(i), 'revisao');
    }

    const livro = join(p.dir, 'livro.yaml');
    writeFileSync(livro, `${readFileSync(livro, 'utf8')}\nressalva_verificar: Conferir em fonte primaria\n`, 'utf8');
    writeFileSync(join(p.dir, 'docs', 'apendice.md'),
      '# Apendice\n\n## O que ainda falta conferir\n\nA lista de pendencias da obra.\n', 'utf8');

    const saida = p.rodar('docx');
    ok('docx roda sem build previo', saida.codigo === 0);

    // Presenca e ausencia no mesmo numero: 4 capitulos, 3 carimbados.
    ok('docx conta os capitulos com ressalva', saida.saida.includes('4 capitulos, 3 com ressalva'));

    const xml = await texto('Carimbo — versao de leitura.docx');
    ok('carimbo sai na forma inline e na forma de lista em bloco',
      conta(xml, 'Conferir em fonte primaria') === 2);
    ok('ESPECIME tem precedencia sobre verificar',
      conta(xml, 'ESPECIME DE FORMA — inventado inteiro') === 1);
    ok('ressalva_verificar substitui o texto padrao',
      conta(xml, 'Fatos ainda nao verificados pelo autor') === 0);
    ok('capitulo sem pendencia sai sem carimbo',
      conta(xml, 'Quatro') >= 1 && conta(xml, 'Conferir em fonte primaria') === 2);
    ok('apendice sai no fim do livro',
      xml.includes('O que ainda falta conferir')
      && xml.indexOf('O que ainda falta conferir') > xml.indexOf('Prosa do capitulo 4'));

    // Sem a chave no livro.yaml, o texto antigo continua sendo o padrao: livro
    // que nunca configurou nada nao pode perder o carimbo nesta mudanca.
    writeFileSync(livro, readFileSync(livro, 'utf8').replace(/^ressalva_verificar:.*$/m, ''), 'utf8');
    p.rodar('docx');
    const semChave = await texto('Carimbo — versao de leitura.docx');
    ok('sem ressalva_verificar volta o texto padrao',
      conta(semChave, 'Fatos ainda nao verificados pelo autor') === 2);

    // O corte e o mesmo do build, lido do kanban — nao do .md do manuscrito.
    p.rodar('cap', 'move', '4', 'escrita', '--forcar');
    ok('--desde move o corte junto com o build',
      p.rodar('docx').saida.includes('3 capitulos')
      && p.rodar('docx', '--desde', 'escrita').saida.includes('4 capitulos'));
  }
}

// ---------------------------------------------------------------------------
// 0.2.1 — o sumario deixa de ser decorativo: o gate le a tabela, e o dump para
// LLM passa a carregar outline, cronologia, regras e o placar de promessas.
// ---------------------------------------------------------------------------

{
  const p = projeto('Kanban Contra Sumario');
  preencheSumario(p.dir, [
    '| 01 | 1 | A kombi | mundo e ferida | P1 | 2500 |',
    '| 02 | 1 | O fosforo | incidente incitante | P2 | 2500 |',
  ].join('\n'));
  p.rodar('sum', '--materializar');
  p.rodar('cap', 'new', 'Capitulo fora do plano');   // vira 03, ausente do sumario

  const v = p.rodar('validate');
  ok('gate acusa capitulo escrito fora do sumario', v.saida.includes('capitulo 3 nao esta no sumario'));
  ok('gate nao reclama do que esta nos dois lados',
    !v.saida.includes('capitulo 1 nao esta') && !v.saida.includes('capitulo 2 nao esta'));

  // planejado e nunca materializado: o outro lado da mesma divergencia
  preencheSumario(p.dir, [
    '| 01 | 1 | A kombi | mundo e ferida | P1 | 2500 |',
    '| 02 | 1 | O fosforo | incidente incitante | P2 | 2500 |',
    '| 09 | 3 | O desfecho | paga tudo | P1 | 2500 |',
  ].join('\n'));
  const v2 = p.rodar('validate');
  ok('gate acusa capitulo planejado e nao materializado',
    v2.saida.includes('capitulo 9 ("O desfecho") planejado e nao materializado'));
  ok('e diz o comando que resolve', v2.saida.includes('bookfw sum --materializar'));
}

// Vao deliberado no sumario nao e violacao: em metamorfose os numeros 13 a 19
// estao livres de proposito. Buraco so importa contra o plano, nunca sozinho.
{
  const p = projeto('Vao Deliberado');
  preencheSumario(p.dir, [
    '| 01 | 1 | Primeiro | abertura | P1 | 2500 |',
    '| 20 | 3 | Ultimo | fechamento | P1 | 2500 |',
  ].join('\n'));
  p.rodar('sum', '--materializar');
  const v = p.rodar('validate');
  ok('numeracao com vao planejado nao gera aviso',
    !v.saida.includes('nao esta no sumario') && !v.saida.includes('nao materializado'));
}

// Titulo que diverge do sumario e aviso; acento e caixa nao sao divergencia.
{
  const p = projeto('Titulo Divergente');
  preencheSumario(p.dir, [
    '| 01 | 1 | A cozinha | abertura | P1 | 2500 |',
    '| 02 | 1 | O fosforo | segunda | P2 | 2500 |',
  ].join('\n'));
  p.rodar('sum', '--materializar');

  const arq = join(p.dir, 'capitulos', 'backlog', 'cap-01-a-cozinha.md');
  writeFileSync(arq, readFileSync(arq, 'utf8').replace('titulo: A cozinha', 'titulo: A varanda'), 'utf8');
  const arq2 = join(p.dir, 'capitulos', 'backlog', 'cap-02-o-fosforo.md');
  writeFileSync(arq2, readFileSync(arq2, 'utf8').replace('titulo: O fosforo', 'titulo: O Fósforo'), 'utf8');

  const v = p.rodar('validate');
  ok('gate acusa titulo que diverge do sumario', v.saida.includes('"A varanda" diverge do sumario'));
  ok('acento e caixa nao contam como divergencia', !v.saida.includes('Fósforo'));
}

// context era o dump "para LLM" sem o outline, sem a cronologia e sem as regras.
{
  const p = projeto('Contexto Completo');
  preencheSumario(p.dir, ['| 01 | 1 | A kombi | mundo e ferida | P1 | 2500 |'].join('\n'));
  p.rodar('sum', '--materializar');
  const pdDir = join(p.dir, 'docs', 'plano-diretor');
  const pdArq = join(pdDir, readdirSync(pdDir)[0]);
  writeFileSync(pdArq, readFileSync(pdArq, 'utf8')
    .replace('\n- P1 — \n', '\n- P1 — o fio que o desfecho paga\n'), 'utf8');
  writeFileSync(join(p.dir, 'docs', 'canon', 'cronologia.md'),
    '# Cronologia\n\n- dia 1: MARCO TEMPORAL DE TESTE\n', 'utf8');
  writeFileSync(join(p.dir, 'docs', 'canon', 'regras.md'),
    '# Regras\n\n- REGRA DE MUNDO DE TESTE\n', 'utf8');

  const ctx = p.rodar('context').saida;
  ok('context carrega o sumario', ctx.includes('## Sumario') && ctx.includes('A kombi'));
  ok('context carrega a cronologia', ctx.includes('MARCO TEMPORAL DE TESTE'));
  ok('context carrega as regras do mundo', ctx.includes('REGRA DE MUNDO DE TESTE'));
  ok('context traz o placar de promessas', ctx.includes('P1 [nao plantada]'));
}

// ---------------------------------------------------------------------------
// 0.3.0 — cap move em lote, renumber e retitle. Nome de arquivo e frontmatter
// mudam juntos; feitos na mao, desencontram.
// ---------------------------------------------------------------------------

function comCincoCapitulos(titulo) {
  const p = projeto(titulo);
  for (let i = 1; i <= 5; i++) p.rodar('cap', 'new', `Capitulo ${i}`);
  return p;
}

{
  const p = comCincoCapitulos('Lote');
  const faixa = p.rodar('cap', 'move', '2..4', 'esboco');
  ok('cap move aceita faixa', faixa.codigo === 0 && faixa.saida.includes('3 capitulos movidos'));
  ok('a faixa move exatamente os da faixa',
    existsSync(join(p.dir, 'capitulos', 'esboco', 'cap-03-capitulo-3.md'))
    && existsSync(join(p.dir, 'capitulos', 'backlog', 'cap-01-capitulo-1.md')));

  const lista = p.rodar('cap', 'move', '1,5', 'esboco');
  ok('cap move aceita lista', lista.codigo === 0 && lista.saida.includes('2 capitulos movidos'));
  ok('sem repetir alvo', p.rodar('cap', 'move', '1..2,2', 'escrita').saida.includes('2 capitulos movidos'));

  // Em lote, um capitulo fechado no meio da faixa nao pode deixar metade movida.
  p.rodar('cap', 'move', '3', 'pronto');
  const parcial = p.rodar('cap', 'move', '3..5', 'escrita');
  ok('lote com capitulo pronto recusa inteiro', parcial.codigo === 1);
  ok('a recusa diz que nada foi movido', parcial.saida.includes('nada foi movido'));
  ok('e nenhum capitulo da faixa se moveu',
    existsSync(join(p.dir, 'capitulos', 'esboco', 'cap-04-capitulo-4.md')));
}

{
  const p = comCincoCapitulos('Renumerar');
  const r = p.rodar('cap', 'renumber', '5', '9');
  ok('renumber renomeia o arquivo', r.codigo === 0 && r.saida.includes('cap-09-capitulo-5.md'));
  const fm = readFileSync(join(p.dir, 'capitulos', 'backlog', 'cap-09-capitulo-5.md'), 'utf8');
  ok('renumber acerta o numero no frontmatter', /^numero: 9$/m.test(fm));
  ok('renumber acerta o id no frontmatter', /^id: cap-09-capitulo-5$/m.test(fm));
  ok('o arquivo antigo nao fica para tras',
    !existsSync(join(p.dir, 'capitulos', 'backlog', 'cap-05-capitulo-5.md')));

  const choque = p.rodar('cap', 'renumber', '1', '2');
  ok('renumber recusa numero ocupado', choque.codigo === 1);
  ok('a recusa nomeia quem ocupa', choque.saida.includes('cap-02-capitulo-2.md'));
  ok('renumber recusa numero invalido', p.rodar('cap', 'renumber', '1', 'zero').codigo === 1);
}

{
  const p = comCincoCapitulos('Retitular');
  const r = p.rodar('cap', 'retitle', '2', 'O nome novo');
  ok('retitle renomeia o arquivo', r.codigo === 0 && r.saida.includes('cap-02-o-nome-novo.md'));
  const fm = readFileSync(join(p.dir, 'capitulos', 'backlog', 'cap-02-o-nome-novo.md'), 'utf8');
  ok('retitle acerta o titulo no frontmatter', /^titulo: O nome novo$/m.test(fm));
  ok('retitle acerta o id, que carrega o slug', /^id: cap-02-o-nome-novo$/m.test(fm));
  ok('retitle preserva o numero', /^numero: 2$/m.test(fm));
  ok('retitle recusa titulo com dois-pontos',
    p.rodar('cap', 'retitle', '3', 'Isto e: proibido').codigo === 1);

  // o corpo do capitulo nao pode ser tocado: so o frontmatter e reescrito
  const arq = join(p.dir, 'capitulos', 'backlog', 'cap-04-capitulo-4.md');
  writeFileSync(arq, readFileSync(arq, 'utf8').replace(
    '<!-- a prosa da cena entra aqui, logo abaixo do contrato -->',
    'Prosa com a palavra numero: no meio, que nao pode ser reescrita.\n',
  ), 'utf8');
  p.rodar('cap', 'retitle', '4', 'Outro nome');
  ok('retitle nao mexe na prosa',
    readFileSync(join(p.dir, 'capitulos', 'backlog', 'cap-04-outro-nome.md'), 'utf8')
      .includes('Prosa com a palavra numero: no meio'));
}

// ---------------------------------------------------------------------------
// 0.4.0 — capa. O SVG e a fonte da verdade e sai sem dependencia nenhuma; o
// PNG e derivado, e depende do rasterizador opcional.
// ---------------------------------------------------------------------------

/** Preenche o PD com as secoes que a capa le. */
function preenchePd(dir, extra = '') {
  const d = join(dir, 'docs', 'plano-diretor');
  const arq = join(d, readdirSync(d)[0]);
  writeFileSync(arq, [
    '---', 'titulo: Teste', '---', '',
    '## Premissa', '', 'Um homem perde o controle e descobre quem o sustenta.', '',
    '## Tema', '', 'O controle e ilusao administrada.', '',
    '## Promessa ao leitor', '', 'Relato honesto de quem chegou ao fundo e voltou.', '',
    '## Promessas', '', '- P1 — o fio que o desfecho paga', '',
    '## Desfecho', '', 'Ele aceita ajuda para poder ajudar.', '',
    '## Nao vai ter', '', '- Cena de luz no fim do tunel.', '- Vilao medico.', '',
    extra,
  ].join('\n'), 'utf8');
  return arq;
}

{
  const p = projeto('Capa Briefing');
  preenchePd(p.dir);
  const b = p.rodar('capa', 'brief');
  ok('capa brief roda', b.codigo === 0);
  const brf = readFileSync(join(p.dir, 'capa', 'briefing.md'), 'utf8');
  ok('o briefing traz a premissa', brf.includes('perde o controle e descobre quem o sustenta'));
  ok('o briefing traz as promessas numeradas', brf.includes('P1 — o fio que o desfecho paga'));
  ok('o briefing traz o bloco de prompt', brf.includes('Capa de livro. Genero:'));
  ok('cada bloco aponta a origem', brf.includes('_fonte: docs/plano-diretor/'));

  // Secao em lista aparada como paragrafo entregava instrucao pela metade ao
  // gerador de imagem: "Cronologia embaralhada — a ordem e a dos dias, e essa d…"
  ok('o que evitar sai em itens inteiros, nunca cortado no meio',
    brf.includes('Evitar: Cena de luz no fim do tunel; Vilao medico'));

  // o helper `projeto` ja roda `pd`; para este caso o projeto nasce so com init
  const cru = mkdtempSync(join(tmpdir(), 'bookfw-'));
  descartar.push(cru);
  spawnSync(process.execPath, [CLI, 'init', 'Sem Plano'], { cwd: cru, encoding: 'utf8' });
  const semPd = spawnSync(process.execPath, [CLI, 'capa', 'brief'], { cwd: cru, encoding: 'utf8' });
  ok('capa brief recusa obra sem plano diretor', semPd.status === 1);
}

{
  const p = projeto('Capa SVG');
  preenchePd(p.dir);
  const r = p.rodar('capa', '--formato', 'svg');
  ok('capa gera SVG sem dependencia nenhuma', r.codigo === 0);
  const svg = readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8');
  ok('o SVG traz o titulo', svg.includes('Capa SVG'));
  ok('o SVG tem a dimensao de ebook', svg.includes('width="1600"') && svg.includes('height="2560"'));
  ok('sem arte, a capa sai tipografica', r.saida.includes('tipografica, sem arte'));

  // Arte entra como data URI. Com caminho relativo o SVG abre na maquina do
  // autor e quebra em qualquer outra, inclusive na da grafica.
  writeFileSync(join(p.dir, 'capa', 'arte.png'), Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  p.rodar('capa', '--formato', 'svg');
  const comArte = readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8');
  ok('a arte entra como data URI', comArte.includes('href="data:image/png;base64,'));
  ok('e nunca como caminho relativo', !comArte.includes('href="capa/'));

  // O veu escuro e fixo em 0.42, calibrado para foto clara. Sobre arte que ja
  // nasce escura ele apaga o desenho — na capa real da metamorfose sumiu com a
  // linha inteira. Quem sabe quanto a arte aguenta e quem olha a capa.
  ok('o veu sobre a arte e regulavel',
    readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8').includes('opacity="0.42"'));
  p.rodar('capa', '--formato', 'svg', '--escurecer', '0.05');
  const claro = readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8');
  ok('--escurecer troca o veu', claro.includes('opacity="0.05"') && !claro.includes('opacity="0.42"'));
  p.rodar('capa', '--formato', 'svg', '--escurecer', '0');
  ok('--escurecer 0 nao poe veu nenhum',
    !/fill="#[0-9a-f]{6}" opacity="0"/.test(readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8')));
  ok('--escurecer fora de 0..1 e recusado', p.rodar('capa', '--escurecer', '2').codigo === 1);

  // A calibragem e da OBRA. Sem lugar para grava-la, o arquivo composto deixa
  // de ser regeneravel: quem clonasse o repositorio e rodasse `bookfw capa`
  // receberia o padrao de foto e uma capa diferente da que o autor aprovou.
  const yaml = join(p.dir, 'livro.yaml');
  const base = readFileSync(yaml, 'utf8');
  const calibrar = (valor) => writeFileSync(yaml, `${base}\ncapa_escurecer: ${valor}\n`, 'utf8');
  const svgDaCapa = () => readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8');

  calibrar('0.07');
  const daObra = p.rodar('capa', '--formato', 'svg');
  ok('o veu sai do livro.yaml quando declarado', svgDaCapa().includes('opacity="0.07"'));
  ok('e a saida diz de onde a calibragem veio', daObra.saida.includes('(livro.yaml)'));
  ok('o flag tem precedencia sobre o livro.yaml',
    p.rodar('capa', '--formato', 'svg', '--escurecer', '0.3').saida.includes('(--escurecer)')
    && svgDaCapa().includes('opacity="0.3"'));

  calibrar('muito');
  const ruim = p.rodar('capa', '--formato', 'svg');
  ok('valor invalido no livro.yaml e recusado', ruim.codigo === 1);
  ok('e a recusa aponta o livro.yaml, nao o flag', ruim.saida.includes('capa_escurecer no livro.yaml'));

  writeFileSync(yaml, base, 'utf8');
  p.rodar('capa', '--formato', 'svg');

  // Titulo de nao-ficcao e longo por natureza. Com corpo fixo em 11.5% da
  // largura, "Os Oito Modelos da Reforma Tributaria" saia em quatro linhas por
  // cima da arte: o bloco crescia para baixo sem limite.
  const yaml2 = join(p.dir, 'livro.yaml');
  const antes = readFileSync(yaml2, 'utf8');
  writeFileSync(yaml2, antes.replace(/^titulo: .*$/m,
    'titulo: Os Oito Modelos da Reforma Tributaria Brasileira'), 'utf8');
  const longo = p.rodar('capa', '--formato', 'svg');
  const svgLongo = readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8');
  const corpos = [...svgLongo.matchAll(/font-size="(\d+)"/g)].map((m) => Number(m[1]));
  ok('titulo longo tem o corpo reduzido para caber', Math.max(...corpos) < 1600 * 0.115);
  ok('e o comando diz que reduziu', longo.saida.includes('corpo reduzido para caber'));
  const linhasTitulo = (svgLongo.match(/Os |Modelos|Reforma|Tributaria|Brasileira/g) || []).length;
  ok('o bloco do titulo cabe na faixa reservada', (() => {
    const ys = [...svgLongo.matchAll(/<text[^>]*y="([\d.]+)"[^>]*font-size="(\d+)"/g)]
      .map((m) => Number(m[1])).filter((y) => y < 2000);
    return ys.length > 0 && Math.max(...ys) - Math.min(...ys) <= 2560 * 0.30;
  })());
  writeFileSync(yaml2, antes, 'utf8');

  // O genero "nao-ficcao tecnica" nao contem "tecnico": o livro tecnico saia
  // com a paleta dourada do padrao, errando a cor por uma letra.
  writeFileSync(yaml2, antes.replace(/^genero: .*$/m, 'genero: nao-ficcao tecnica'), 'utf8');
  p.rodar('capa', '--formato', 'svg', '--tipografica');
  ok('genero no plural ou no feminino acha a paleta certa',
    readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8').includes('#101418'));
  writeFileSync(yaml2, antes, 'utf8');
  p.rodar('capa', '--formato', 'svg');

  const tip = p.rodar('capa', '--formato', 'svg', '--tipografica');
  ok('--tipografica ignora a arte existente', tip.saida.includes('tipografica, sem arte'));
  ok('e o SVG resultante nao tem imagem',
    !readFileSync(join(p.dir, 'capa', 'capa-svg-ebook.svg'), 'utf8').includes('<image'));
}

{
  const p = projeto('Capa Impressao');
  preenchePd(p.dir);
  const r = p.rodar('capa', '--formato', 'impressao');
  ok('a lombada e declarada, nao escondida', /\d+ paginas estimadas, lombada de \d+px/.test(r.saida));

  // Lombada calculada, nao constante plausivel: duas obras de tamanhos
  // diferentes tem de sair com lombadas diferentes.
  const q = projeto('Capa Impressao Grossa');
  preenchePd(q.dir);
  q.rodar('cap', 'new', 'Um');
  const arq = join(q.dir, 'capitulos', 'backlog', 'cap-01-um.md');
  writeFileSync(arq, readFileSync(arq, 'utf8').replace(
    '<!-- a prosa da cena entra aqui, logo abaixo do contrato -->',
    'palavra '.repeat(40000),
  ), 'utf8');
  const grossa = q.rodar('capa', '--formato', 'impressao');
  const lombada = (s) => Number(s.match(/lombada de (\d+)px/)[1]);
  ok('obra maior produz lombada maior', lombada(grossa.saida) > lombada(r.saida));
  // O texto da quarta capa vem do plano diretor, que e markdown. Sem tirar a
  // marcacao, o asterisco vai IMPRESSO: a contracapa de "Os Oito Modelos" saiu
  // com `**o que a transicao quebra no sistema**` literal.
  const pdDir2 = join(p.dir, 'docs', 'plano-diretor');
  const pdArq2 = join(pdDir2, readdirSync(pdDir2)[0]);
  writeFileSync(pdArq2, readFileSync(pdArq2, 'utf8').replace(
    'Relato honesto de quem chegou ao fundo e voltou.',
    'Relato **honesto** de quem chegou ao _fundo_ e voltou, com `codigo` junto.'), 'utf8');
  p.rodar('capa', '--formato', 'impressao');
  const verso = readFileSync(join(p.dir, 'capa', 'capa-impressao-impressao.svg'), 'utf8');
  ok('a quarta capa nao leva marcacao de markdown',
    !verso.includes('**') && !verso.includes('`codigo`'));
  ok('mas leva o texto todo', verso.includes('honesto') && verso.includes('fundo') && verso.includes('codigo'));

  // a capa de impressao e a que mais precisa de ajuste fino: tem de ter SVG
  ok('a capa de impressao tambem sai em SVG',
    existsSync(join(p.dir, 'capa', 'capa-impressao-impressao.svg')));
  ok('a quarta capa traz a promessa ao leitor do PD',
    readFileSync(join(p.dir, 'capa', 'capa-impressao-impressao.svg'), 'utf8').includes('chegou ao fundo'));
}

{
  // Sem o rasterizador o comando entrega o SVG e diz o que instalar. Silenciar
  // a falta e sair com codigo 0 sem produzir nada seria pior que quebrar.
  const p = projeto('Capa Sem Rasterizador');
  preenchePd(p.dir);
  const r = p.rodar('capa', '--formato', 'ebook');
  const temResvg = existsSync(join(p.dir, 'capa', 'capa-sem-rasterizador-ebook.png'));
  ok('sem o pacote opcional o comando nao quebra', r.codigo === 0);
  ok(temResvg ? 'com o pacote, o PNG sai' : 'sem o pacote, o aviso diz o que instalar',
    temResvg || r.saida.includes('npm i @resvg/resvg-js'));
}

{
  // O gate so cobra capa quando ha capitulo fechado: obra no capitulo 3 nao
  // precisa de capa, e avisar antes da hora treina o autor a ignorar aviso.
  const p = projeto('Capa No Gate');
  preenchePd(p.dir);
  p.rodar('cap', 'new', 'Um');
  ok('sem capitulo em pronto o gate nao cobra capa', !p.rodar('validate').saida.includes('nenhuma capa'));

  const arq = join(p.dir, 'capitulos', 'backlog', 'cap-01-um.md');
  writeFileSync(arq, readFileSync(arq, 'utf8')
    .replace('objetivo:', 'objetivo: sair')
    .replace('conflito:', 'conflito: a porta')
    .replace('virada:', 'virada: nao era a porta')
    .replace('<!-- a prosa da cena entra aqui, logo abaixo do contrato -->', 'palavra '.repeat(400)), 'utf8');
  p.rodar('cap', 'move', '1', 'pronto');
  const v = p.rodar('validate');
  ok('com capitulo em pronto e sem capa, o gate avisa', v.saida.includes('nenhuma capa'));
  ok('e diz o comando que resolve', v.saida.includes('bookfw capa brief'));
  // na lista de avisos, nunca na de erros — o codigo de saida nao serve de
  // prova aqui, porque a obra deste teste esta toda em pronto com promessa
  // nao plantada, o que ja e um erro legitimo e proprio do gate.
  const j = JSON.parse(p.rodar('validate', '--json').saida);
  ok('capa ausente e aviso, nunca erro',
    j.avisos.some((a) => a.includes('nenhuma capa')) && !j.erros.some((e) => e.includes('nenhuma capa')));

  p.rodar('capa', '--formato', 'svg');
  ok('com capa no lugar o aviso some', !p.rodar('validate').saida.includes('nenhuma capa'));
}

// ---------------------------------------------------------------------------
// 0.4.1 — o lexico do style card. Frequencia bruta em portugues devolve palavra
// funcional por construcao; a medida passa a separar conteudo de tique de voz.
// ---------------------------------------------------------------------------

/** Amostra com voz: hesitacao repetida, lexico proprio e o substantivo "mente". */
function comAmostra(p, repeticoes = 40) {
  const paragrafo = [
    'O corpo estava ali e a consciencia tinha ido embora.',
    'Havia apenas o casulo, e talvez o casulo fosse a resposta.',
    'A lagarta ainda nao sabia que os corpos mudam completamente.',
    'A mente dele estava em outro lugar, e a mente nao obedece.',
  ].join('\n\n');
  writeFileSync(join(p.dir, 'samples', 'amostra.md'),
    `${`${paragrafo}\n\n`.repeat(repeticoes)}`, 'utf8');
}

{
  const p = projeto('Lexico');
  comAmostra(p);
  const r = p.rodar('style');
  ok('style roda com amostra de verdade', r.codigo === 0);
  const card = readFileSync(join(p.dir, 'docs', 'style-card.md'), 'utf8');
  const lexico = card.match(/Lexico da obra: ([^\n]+)/)[1];
  const tiques = card.match(/Tiques de voz: ([^\n]+)/)[1];

  // O defeito de origem: verbo auxiliar no topo do ranking.
  ok('auxiliar nao entra no lexico',
    !/\b(estava|tinha|havia|fosse)\b/.test(lexico));
  ok('substantivo da obra entra no lexico', /corpo/.test(lexico) && /casulo/.test(lexico));

  // Sair do conteudo nao e ser descartado: hedge e sinal, e vai com taxa.
  ok('hedge vai para os tiques, com taxa', /apenas [\d.]+/.test(tiques) && /talvez [\d.]+/.test(tiques));
  ok('e nao para o lexico de conteudo', !/\b(apenas|talvez|ainda)\b/.test(lexico));
  ok('adverbio em -mente e tique', /completamente/.test(tiques));

  // O substantivo "mente" nao e o sufixo "-mente".
  ok('o substantivo "mente" fica no lexico', /\bmente\b/.test(lexico));
  ok('e nao vira tique de voz', !/\bmente [\d.]/.test(tiques));

  // Plural e singular sao a mesma palavra; o rotulo fica com a forma mais usada.
  ok('plural e singular contam junto', (lexico.match(/\bcorpos?\b/g) || []).length === 1);

  ok('o comando mostra o lexico na saida', r.saida.includes('lexico: '));
}

{
  // 92 palavras nao medem voz. A metrica sai, mas nao passa por medida firme.
  const p = projeto('Amostra Curta');
  writeFileSync(join(p.dir, 'samples', 'pouco.md'),
    'Um texto curto demais para dizer qualquer coisa sobre a voz de alguem.\n', 'utf8');
  const r = p.rodar('style');
  ok('amostra curta ainda mede', r.codigo === 0);
  ok('o comando avisa a amostra curta', r.saida.includes('amostra curta'));
  ok('e a ressalva fica no proprio bloco, nao so no console',
    readFileSync(join(p.dir, 'docs', 'style-card.md'), 'utf8').includes('**Amostra curta.**'));

  const q = projeto('Amostra Suficiente');
  comAmostra(q, 60);
  ok('amostra suficiente nao recebe ressalva',
    !q.rodar('style').saida.includes('amostra curta')
    && !readFileSync(join(q.dir, 'docs', 'style-card.md'), 'utf8').includes('**Amostra curta.**'));
}

{
  // O briefing de capa le este bloco por REGEX: rotulo trocado sem o leitor
  // acompanhar esvazia o briefing sem erro nenhum.
  const p = projeto('Lexico Na Capa');
  preenchePd(p.dir);
  comAmostra(p);
  p.rodar('style');
  p.rodar('capa', 'brief');
  ok('o briefing de capa consome o lexico novo',
    readFileSync(join(p.dir, 'capa', 'briefing.md'), 'utf8').includes('casulo'));

  // style card gerado antes da 0.4.1 continua no disco das obras
  const card = join(p.dir, 'docs', 'style-card.md');
  writeFileSync(card, readFileSync(card, 'utf8')
    .replace(/Lexico da obra: [^\n]+/, 'Palavras marcantes: rotulo, antigo, preservado.'), 'utf8');
  p.rodar('capa', 'brief');
  ok('e o style card no formato antigo nao quebra',
    readFileSync(join(p.dir, 'capa', 'briefing.md'), 'utf8').includes('rotulo, antigo, preservado'));
}

for (const d of descartar) rmSync(d, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} falha(s).` : '\nOK.');
process.exit(falhas ? 1 : 0);
