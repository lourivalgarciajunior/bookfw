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
  //
  // O `\r?` nao e enfeite. No Windows o PD nasce com CRLF, o casamento por
  // string crua nao acontece, e o teste passa a medir um plano diretor que
  // nunca foi editado — verde por engano nos tres casos que dependem dele.
  const antesPd = readFileSync(pd, 'utf8');
  const depoisPd = antesPd.replace(/^- P1 — *\r?$/m, '- P1 — o `arquivo` que nao apaga volta no fim');
  if (depoisPd === antesPd) throw new Error('o replace da promessa P1 nao achou a linha no plano diretor');
  writeFileSync(pd, depoisPd, 'utf8');
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
  // `\r?` pelo mesmo motivo do caso da promessa com crase: no Windows o PD
  // nasce com CRLF e o casamento por string crua nao acontece.
  const pdAntes = readFileSync(pdArq, 'utf8');
  const pdDepois = pdAntes.replace(/^- P1 — *\r?$/m, '- P1 — o fio que o desfecho paga');
  if (pdDepois === pdAntes) throw new Error('o replace da promessa P1 nao achou a linha no plano diretor');
  writeFileSync(pdArq, pdDepois, 'utf8');
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
  // 0.7.2 — o subtitulo nao quebrava linha. "o que Maria, José, Pedro, Paulo e
  // outros fizeram quando a vida apertou" vazou das duas bordas do ebook e
  // atravessou a lombada da impressao, com o comando saindo 0 e sem aviso.
  const p = projeto('Ninguem nasce santo');
  preenchePd(p.dir);
  const yaml = join(p.dir, 'livro.yaml');
  const base = readFileSync(yaml, 'utf8');
  const SUB = 'o que Maria, José, Pedro, Paulo e outros fizeram quando a vida apertou';
  const comSub = (s) => writeFileSync(yaml, base.replace(/^titulo: .*$/m, (l) => `${l}\nsubtitulo: ${s}`), 'utf8');
  const ler = (f) => readFileSync(join(p.dir, 'capa', `ninguem-nasce-santo-${f}.svg`), 'utf8');
  const textos = (svg) => [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*font-size="(\d+)"[^>]*>([^<]*)<\/text>/g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), corpo: Number(m[3]), texto: m[4] }));
  const linhasSub = (svg) => textos(svg).filter((t) => t.texto && SUB.includes(t.texto));

  comSub(SUB);
  const r = p.rodar('capa', '--formato', 'ebook,impressao,miniatura');
  ok('capa com subtitulo longo roda', r.codigo === 0);
  for (const [f, largura, altura] of [['ebook', 1600, 2560], ['impressao', 1800, 2700], ['miniatura', 400, 640]]) {
    const svg = ler(f);
    const ls = linhasSub(svg);
    ok(`${f}: o subtitulo longo sai em mais de uma linha`, ls.length > 1);
    ok(`${f}: nenhuma palavra do subtitulo se perde`, ls.map((l) => l.texto).join(' ') === SUB);
    ok(`${f}: nenhuma linha estimada passa da largura util`,
      ls.length > 0 && ls.every((l) => l.texto.length * l.corpo * 0.52 <= largura * 0.8));
    ok(`${f}: o bloco do subtitulo para acima do fio inferior`, ls.every((l) => l.y < altura * 0.72));
    if (f === 'impressao') {
      // A frente comeca onde a lombada termina, e o fundo dela e o rect de 1800
      // de largura fora da origem. A lombada pode nem ter texto (obra fina).
      const xFrente = Math.max(0, ...[...svg.matchAll(/<rect x="([\d.]+)" y="0" width="1800"/g)].map((m) => Number(m[1])));
      ok('impressao: nenhuma linha do subtitulo invade a lombada',
        xFrente > 0 && ls.length > 0 && ls.every((l) => l.x - (l.texto.length * l.corpo * 0.52) / 2 > xFrente));
    }
  }
  ok('o comando avisa que quebrou o subtitulo', r.saida.includes('subtitulo em') && r.saida.includes('confira o SVG'));
  ok('e nao acusa longo demais quando cabe', !r.saida.includes('subtitulo longo demais'));

  // subtitulo que ja cabia nao pode mudar: capa aprovada continua a mesma
  comSub('um subtitulo curto');
  p.rodar('capa', '--formato', 'ebook');
  const curto = textos(ler('ebook'));
  const corpoTitulo = Math.max(...curto.map((t) => t.corpo));
  const sub = curto.filter((t) => t.texto === 'um subtitulo curto');
  ok('subtitulo curto continua em uma linha, no corpo de antes',
    sub.length === 1 && sub[0].corpo === Math.round(corpoTitulo * 0.34));

  comSub(`${'palavra'.repeat(12)} ${'mais '.repeat(60)}`);
  const absurdo = p.rodar('capa', '--formato', 'ebook');
  ok('subtitulo que nem no piso cabe e avisado, sem mudar o codigo de saida',
    absurdo.codigo === 0 && absurdo.saida.includes('subtitulo longo demais'));
  writeFileSync(yaml, base, 'utf8');
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

{
  // bookfw revisao — a historia de leitura da obra. O DOCX saia sempre com o
  // mesmo nome, e o leitor externo nao sabia qual revisao estava lendo.
  const p = projeto('Obra Revisada');
  const r0 = p.rodar('revisao');
  ok('revisao sem nota recusa', r0.codigo !== 0 && r0.saida.includes('precisa de uma nota'));
  ok('e nao cria o registro ao recusar', !existsSync(join(p.dir, 'docs', 'revisoes.md')));

  const r1 = p.rodar('revisao', 'primeira leitura interna');
  ok('primeira revisao registra e numera 1', r1.codigo === 0 && r1.saida.includes('revisao 1 registrada'));
  const reg1 = readFileSync(join(p.dir, 'docs', 'revisoes.md'), 'utf8');
  ok('o registro nasce com cabecalho e a linha 1', reg1.includes('| # | Data |') && /^\| 1 \| \d{4}-\d{2}-\d{2} \|/m.test(reg1));

  const r2 = p.rodar('revisao', 'aplica a leitura; cap. 1 reescrito');
  ok('segunda revisao numera 2', r2.saida.includes('revisao 2 registrada'));
  const reg2 = readFileSync(join(p.dir, 'docs', 'revisoes.md'), 'utf8');
  ok('o registro e append-only: a linha 1 continua la', reg2.includes('| 1 |') && reg2.includes('| 2 |') && reg2.includes('primeira leitura interna'));

  // Buraco no registro nao pode colidir numero: o proximo e o MAIOR + 1.
  writeFileSync(join(p.dir, 'docs', 'revisoes.md'), reg2.replace(/^\| 2 \|.*\n/m, ''), 'utf8');
  const r3 = p.rodar('revisao', 'terceira, depois de apagar a segunda a mao');
  ok('numero e o maior existente mais um, nao a contagem de linhas', r3.saida.includes('revisao 2 registrada'));

  ok('status mostra a revisao corrente', p.rodar('status').saida.includes('revisao 2 —'));
  ok('context lista o registro', p.rodar('context').saida.includes('## Revisoes (docs/revisoes.md)'));

  // build carimba sob o titulo — precisa de um capitulo com prosa em revisao.
  p.rodar('cap', 'new', 'Um Capitulo');
  const arq = readdirSync(join(p.dir, 'capitulos', 'backlog')).find((f) => f.endsWith('.md'));
  const cam = join(p.dir, 'capitulos', 'backlog', arq);
  writeFileSync(cam, readFileSync(cam, 'utf8') + '\n\nUma frase de prosa para o manuscrito ter corpo.\n', 'utf8');
  p.rodar('cap', 'move', arq, 'revisao');
  const b = p.rodar('build');
  const ms = readdirSync(join(p.dir, 'manuscrito')).find((f) => f.endsWith('.md'));
  ok('build carimba a revisao sob o titulo', b.codigo === 0 && readFileSync(join(p.dir, 'manuscrito', ms), 'utf8').includes('_Revisao 2 —'));

  // Sem revisao registrada o build avisa — e o aviso e o que muda o habito.
  const q = projeto('Obra Sem Revisao');
  q.rodar('cap', 'new', 'Cap');
  const arqQ = readdirSync(join(q.dir, 'capitulos', 'backlog')).find((f) => f.endsWith('.md'));
  const camQ = join(q.dir, 'capitulos', 'backlog', arqQ);
  writeFileSync(camQ, readFileSync(camQ, 'utf8') + '\n\nProsa.\n', 'utf8');
  q.rodar('cap', 'move', arqQ, 'revisao');
  ok('build sem revisao avisa', q.rodar('build').saida.includes('sem revisao registrada'));

  let temDocx = true;
  try { await import('docx'); } catch { temDocx = false; }
  if (temDocx) {
    const d = p.rodar('docx');
    const nomes = readdirSync(join(p.dir, 'manuscrito'));
    ok('o nome do docx carrega o numero da revisao', d.codigo === 0 && nomes.some((f) => f.includes('— revisao 2.docx')));
    ok('e o console diz a revisao', d.saida.includes('revisao 2 —'));
    ok('docx sem revisao sai com o nome antigo e avisa',
      q.rodar('docx').saida.includes('sem revisao registrada')
      && readdirSync(join(q.dir, 'manuscrito')).some((f) => f.includes('versao de leitura.docx')));
  } else {
    console.log('  PULADO  nome do docx com revisao — pacote `docx` ausente');
  }
}

{
  // O divisor de Parte: a estrutura declarada no plano diretor chegando ao
  // leitor. Antes disto, obra com quatro Partes saia com zero divisores.
  const p = projeto('Obra Com Partes');
  const pd = join(p.dir, 'docs', 'plano-diretor');
  const arqPd = join(pd, readdirSync(pd).find((f) => f.endsWith('.md')));
  writeFileSync(arqPd, readFileSync(arqPd, 'utf8') + [
    '', '## Estrutura', '',
    '| Parte | Capitulos | Funcao |', '|---|---|---|',
    '| I — O comeco | 01 | abrir |', '| II — O meio | 02 | virar |', '',
  ].join('\n'), 'utf8');

  const capitulo = (titulo, ato) => {
    p.rodar('cap', 'new', titulo);
    const arq = readdirSync(join(p.dir, 'capitulos', 'backlog')).find((f) => f.endsWith('.md'));
    const cam = join(p.dir, 'capitulos', 'backlog', arq);
    writeFileSync(cam, readFileSync(cam, 'utf8').replace(/^ato:.*$/m, `ato: ${ato}`) + '\n\nProsa deste capitulo.\n', 'utf8');
    p.rodar('cap', 'move', arq, 'revisao');
  };
  capitulo('Um', 1);
  capitulo('Dois', 2);

  const b = p.rodar('build');
  const ms = readdirSync(join(p.dir, 'manuscrito')).find((f) => f.endsWith('.md'));
  const texto = readFileSync(join(p.dir, 'manuscrito', ms), 'utf8');
  ok('o divisor de Parte sai no manuscrito', texto.includes('## Parte I — O comeco') && texto.includes('## Parte II — O meio'));
  ok('e a saida conta as Partes', b.saida.includes('2 divisor(es) de Parte'));
  ok('o divisor vem ANTES do capitulo da Parte', texto.indexOf('## Parte I') < texto.indexOf('## 01 —'));

  // Ato que a tabela nao tem: nao inventa titulo, avisa.
  capitulo('Tres', 7);
  ok('ato fora da tabela avisa e nao inventa divisor',
    p.rodar('build').saida.includes('ato 7 nao esta na tabela Estrutura'));

  // Obra sem `## Estrutura` segue exatamente como antes.
  const q = projeto('Obra Sem Partes');
  q.rodar('cap', 'new', 'Cap');
  const arqQ = readdirSync(join(q.dir, 'capitulos', 'backlog')).find((f) => f.endsWith('.md'));
  const camQ = join(q.dir, 'capitulos', 'backlog', arqQ);
  writeFileSync(camQ, readFileSync(camQ, 'utf8') + '\n\nProsa.\n', 'utf8');
  q.rodar('cap', 'move', arqQ, 'revisao');
  const bq = q.rodar('build');
  const msQ = readdirSync(join(q.dir, 'manuscrito')).find((f) => f.endsWith('.md'));
  ok('obra sem tabela Estrutura nao ganha divisor nem erro',
    bq.codigo === 0 && !bq.saida.includes('divisor(es) de Parte')
    && !readFileSync(join(q.dir, 'manuscrito', msQ), 'utf8').includes('## Parte'));
}

// ---------------------------------------------------------------------------
// Contrato de cena: linha de continuacao dobra, e o que nao dobra reprova.
//
// O parser lia chave e valor linha a linha e descartava calado o que nao
// casasse `chave:`. Como o arquivo e quebrado em 79 colunas e contrato de cena
// chega a 114, quebrar a linha longa era o movimento natural — e apagava o
// dado sem que o gate percebesse. Cada `ok` abaixo cobre um caminho de perda
// medido em 2026-09-08.
{
  const { yamlRaso } = await import('../src/core.mjs');
  const campos = (t) => yamlRaso(t);
  const queixas = (t) => { const p = []; yamlRaso(t, p); return p; };

  ok('continuacao indentada dobra na chave anterior',
    campos('virada: a lista mostra o que falta\n  e que a pendencia e de calendario\n').virada
    === 'a lista mostra o que falta e que a pendencia e de calendario');

  ok('continuacao sem indentacao tambem dobra',
    campos('virada: a lista mostra o que falta\ne que a pendencia e de calendario\n').virada
    === 'a lista mostra o que falta e que a pendencia e de calendario');

  ok('continuacao com dois-pontos dentro nao vira chave nova',
    campos('virada: o seguinte\n  o problema e este: calendario\n').virada
    === 'o seguinte o problema e este: calendario');

  ok('chave vazia seguida de texto vira escalar, nao lista vazia',
    campos('virada:\n  a pendencia e de calendario\n').virada === 'a pendencia e de calendario');

  ok('tres linhas dobram na ordem', campos('virada: um\n  dois\n  tres\n').virada === 'um dois tres');

  // Nao regressao: o que ja funcionava tem de continuar igual.
  const lista = campos('personagens:\n  - A apuracao\n  - O contas a pagar\npaga: [P5, P3]\ntitulo: "O credito"\n');
  ok('lista em bloco sem regressao',
    Array.isArray(lista.personagens) && lista.personagens.join('|') === 'A apuracao|O contas a pagar');
  ok('lista em linha e aspas sem regressao',
    lista.paga.join('|') === 'P5|P3' && lista.titulo === 'O credito');

  // O caso que quase virou defeito novo: texto solto depois de uma lista ja
  // iniciada nao pode dobrar, senao apaga os itens.
  const depois = 'personagens:\n  - A apuracao\n  texto orfao\n';
  ok('texto solto depois de lista nao apaga a lista',
    Array.isArray(campos(depois).personagens) && campos(depois).personagens.join('|') === 'A apuracao');
  ok('e vira queixa, com a linha certa',
    queixas(depois).length === 1 && queixas(depois)[0].linha === 3 && queixas(depois)[0].texto === 'texto orfao');

  ok('linha solta sem chave anterior vira queixa',
    queixas('texto solto no comeco\nid: 1.1\n').length === 1);
  ok('comentario e linha em branco nao viram queixa',
    queixas('# nota\n\nid: 1.1\n').length === 0);

  // Ponta a ponta: o gate reprova, nomeando a linha do arquivo.
  const s = projeto('Obra Com Contrato Quebrado');
  s.rodar('cap', 'new', 'Sonda');
  const arqS = readdirSync(join(s.dir, 'capitulos', 'backlog')).find((f) => f.endsWith('.md'));
  const camS = join(s.dir, 'capitulos', 'backlog', arqS);
  writeFileSync(camS, [
    '---', 'id: cap-01-sonda', 'numero: 1', 'titulo: Sonda', 'estado: backlog', '---', '',
    '# Sonda', '',
    '```cena', 'id: 1.1', 'objetivo: mostrar', 'conflito: nenhum', 'virada: nenhuma',
    'personagens:', '  - A apuracao', '  texto orfao', '```', '', 'Prosa.', '',
  ].join('\n'), 'utf8');
  const vs = s.rodar('validate');
  ok('validate reprova a linha solta', vs.saida.includes('linha solta na cena 1.1'));
  ok('e diz a linha do arquivo', vs.saida.includes(`${arqS}:17`));
  ok('e o texto perdido', vs.saida.includes('texto orfao'));
}

// ---------------------------------------------------------------------------
// Os dois orcamentos do capitulo: o alvo do frontmatter e a soma das cenas.
//
// Eram independentes e ninguem conferia um contra o outro. Numa obra real, 22
// de 23 capitulos tinham os dois divergindo — mediana 1,54 — e o gate passava
// em silencio, enquanto a faixa de "fora do alvo" media contra um numero que o
// proprio arquivo desmentia.
{
  const { divergenciaDeAlvo, FOLGA_ALVO } = await import('../src/core.mjs');
  const cap = (alvo, ...cenas) => ({
    fm: alvo ? { palavras_alvo: alvo } : {},
    cenas: cenas.map((n) => (n === null ? {} : { palavras_alvo: n })),
  });

  ok('divergencia acima da folga e detectada',
    divergenciaDeAlvo(cap(1250, 850, 850, 650))?.cenas === 2350);
  ok('e traz os dois numeros',
    divergenciaDeAlvo(cap(1250, 850, 850, 650))?.capitulo === 1250);
  ok('obra sa nao acusa nada', divergenciaDeAlvo(cap(1500, 500, 500, 500)) === null);
  ok('dentro da folga nao acusa', divergenciaDeAlvo(cap(1000, 350, 350, 350)) === null);
  ok('divergencia para baixo tambem acusa', divergenciaDeAlvo(cap(2400, 700, 700)) !== null);

  // Falta de declaracao nao e divergencia — os tres guardas.
  ok('capitulo sem alvo nao acusa', divergenciaDeAlvo(cap(0, 850, 850)) === null);
  ok('capitulo sem cena nao acusa', divergenciaDeAlvo(cap(1250)) === null);
  ok('cena sem alvo nao acusa', divergenciaDeAlvo(cap(1250, null, null)) === null);

  ok('a folga e a calibrada nas obras reais', FOLGA_ALVO === 0.10);

  // Ponta a ponta: o gate avisa, e a faixa da prosa NAO mudou de base.
  const t = projeto('Obra Com Alvos Discordantes');
  t.rodar('cap', 'new', 'Sonda');
  const arqT = readdirSync(join(t.dir, 'capitulos', 'backlog')).find((f) => f.endsWith('.md'));
  const camT = join(t.dir, 'capitulos', 'backlog', arqT);
  writeFileSync(camT, [
    '---', 'id: cap-01-sonda', 'numero: 1', 'titulo: Sonda', 'estado: backlog',
    'palavras_alvo: 1250', '---', '', '# Sonda', '',
    '```cena', 'id: 1.1', 'objetivo: um', 'conflito: dois', 'virada: tres',
    'palavras_alvo: 850', '```', '', 'Prosa.', '',
    '```cena', 'id: 1.2', 'objetivo: um', 'conflito: dois', 'virada: tres',
    'palavras_alvo: 850', '```', '', 'Mais prosa.', '',
  ].join('\n'), 'utf8');
  const vt = t.rodar('validate');
  ok('validate avisa os dois orcamentos', vt.saida.includes('os dois orcamentos discordam'));
  ok('e diz o alvo do capitulo e a soma das cenas',
    vt.saida.includes('alvo do capitulo 1250 contra 1700'));
  ok('e o status marca o capitulo', t.rodar('status').saida.includes('alvo ?'));

  // A faixa da prosa continua medindo contra o alvo do CAPITULO, nao contra a
  // soma das cenas: trocar a base em silencio esconderia a divergencia.
  ok('a faixa da prosa nao passou a usar a soma das cenas',
    !vt.saida.includes('palavras contra alvo 1700'));
}

// ---------------------------------------------------------------------------
// O markdown lido como estrutura. Funcao pura: roda sem o pacote `docx`.
//
// O que quebrou: o DOCX que foi para um revisor tecnico externo saiu com 952
// asteriscos de negrito a vista, 106 de italico, 26 crases e o `>` de citacao
// no meio de frase — porque o bloco inteiro virava um `TextRun` so.
{
  const { trechos, blocos } = await import('../src/markdown.mjs');
  const so = (t) => trechos(t).map((x) => `${x.negrito ? 'N' : ''}${x.italico ? 'I' : ''}${x.codigo ? 'C' : ''}:${x.texto}`).join('|');
  const tipos = (t) => blocos(t).map((b) => b.tipo).join(',');

  ok('negrito, italico e codigo viram estilo',
    so('a **forte** b *fraco* c `cod` d') === ':a |N:forte|: b |I:fraco|: c |C:cod|: d');
  ok('negrito com italico dentro acumula os dois',
    so('**forte com *fraco* dentro**') === 'N:forte com |NI:fraco|N: dentro');
  ok('multiplicacao e marcador solto ficam como texto',
    so('3 * 4 = 12 e um ** solto') === ':3 * 4 = 12 e um ** solto');
  ok('nao ha enfase dentro de crase', so('`a ** b`') === 'C:a ** b');
  // O texto sem os marcadores tem de sobreviver inteiro: apagar caractere do
  // autor seria pior do que imprimir o marcador.
  ok('o texto sobrevive a viagem',
    trechos('um **dois** tres *quatro* `cinco`').map((x) => x.texto).join('') === 'um dois tres quatro cinco');

  // O marcador de citacao sai de TODAS as linhas. Juntar antes de remover era
  // o que levava o `>` para o meio da frase.
  const cit = blocos('> primeira linha do bloco\n> segunda linha do bloco');
  ok('citacao de duas linhas nao guarda o marcador no meio',
    cit.length === 1 && cit[0].tipo === 'citacao'
    && cit[0].blocos[0].texto === 'primeira linha do bloco segunda linha do bloco');

  ok('o separador de cena continua sendo separador', tipos('* * *') === 'separador');
  ok('cerca de codigo com linha em branco dentro sai inteira',
    blocos('```\num\n\ntres\n```')[0].linhas.join('|') === 'um||tres');
  ok('tabela vira cabecalho e linhas', (() => {
    const [t] = blocos('| A | B |\n|---|---|\n| 1 | 2 |');
    return t.tipo === 'tabela' && t.cabecalho.join() === 'A,B' && t.linhas[0].join() === '1,2';
  })());
  ok('lista com hard-wrap junta a continuacao no item',
    blocos('- um item\n  que continua\n- dois').map((b) => b.itens.map((i) => i.texto).join('/')).join('')
    === 'um item que continua/dois');
  ok('lista numerada guarda o numero do autor',
    blocos('1. um\n2. dois')[0].itens.map((i) => i.marca).join() === '1.,2.');
  ok('titulo tem nivel', (() => { const [t] = blocos('### Assim'); return t.tipo === 'titulo' && t.nivel === 3; })());
  // Livro sobre reforma tributaria tem hard-wrap comecando com "2033. O ...".
  ok('linha de continuacao com ano nao vira lista numerada',
    tipos('O prazo vence em 2033.\n2026. Foi quando comecou.') === 'paragrafo');
}

// ---------------------------------------------------------------------------
// E o mesmo markdown no papel. Dois numeros, e nao um: marcador remanescente
// ZERO e formatacao aplicada MAIOR QUE ZERO. So o primeiro passaria com um
// `replace` que apaga o marcador e entrega o texto sem a enfase do autor.
// ---------------------------------------------------------------------------
{
  let Zip = null;
  try { await import('docx'); Zip = (await import('jszip')).default; } catch { /* ausente */ }

  if (!Zip) {
    console.log('  PULADO  markdown no docx — pacote `docx` ausente (npm i docx para cobrir)');
  } else {
    const p = projeto('Marcacao');
    p.rodar('cap', 'new', 'O capitulo marcado');
    const arq = readdirSync(join(p.dir, 'capitulos', 'backlog')).find((f) => f.endsWith('.md'));
    const cam = join(p.dir, 'capitulos', 'backlog', arq);
    writeFileSync(cam, `${readFileSync(cam, 'utf8')}\n${[
      '',
      'Um paragrafo com **negrito**, com *italico* e com `codigo` no meio.',
      '',
      '> A citacao ocupa duas linhas no fonte e nao pode levar o marcador',
      '> para o meio da frase quando as linhas se juntarem.',
      '',
      '* * *',
      '',
      '| Coluna A | Coluna B |',
      '|---|---|',
      '| valor um | valor dois |',
      '',
      '- primeiro item da lista',
      '- segundo item da lista',
      '',
      '```',
      'diagrama --> com espaco',
      '',
      '   e linha em branco dentro',
      '```',
      '',
      'Fim do capitulo.',
      '',
    ].join('\n')}`, 'utf8');
    p.rodar('cap', 'move', arq, 'revisao');
    ok('docx roda com o capitulo marcado', p.rodar('docx').codigo === 0);

    const z = await Zip.loadAsync(readFileSync(join(p.dir, 'manuscrito', 'Marcacao — versao de leitura.docx')));
    const xml = await z.file('word/document.xml').async('string');
    // As entidades voltam ao caractere: `&gt;` escondido no XML e um marcador
    // de citacao que a contagem nao veria.
    const texto = xml
      .replace(/<w:br\s*\/>/g, '\n').replace(/<w:p[ >]/g, '\n<w:p ').replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

    // 1. O marcador nao chega ao papel.
    ok('nenhum asterisco de negrito no texto', !texto.includes('**'));
    ok('nenhuma crase de codigo no texto', !texto.includes('`'));
    ok('nenhum marcador de citacao no texto', !/(^|\s)>\s/.test(texto));
    ok('nenhum tubo de tabela no texto', !texto.split('\n').some((l) => /^\s*\|/.test(l)));
    ok('nenhum hifen de lista no texto', !texto.split('\n').some((l) => /^\s*-\s/.test(l)));
    ok('nenhuma cerca de codigo no texto', !texto.includes('```'));

    // 2. E a formatacao existe, no trecho certo. Conferir `<w:i/>` no documento
    // inteiro nao serve: o genero no rosto e a ressalva de capitulo ja saem em
    // italico, e o teste ficaria verde com a prosa toda em texto reto.
    const corridas = xml.split('<w:r>').slice(1);
    const corridaCom = (t) => corridas.find((r) => r.includes(`>${t}<`)) || '';
    ok('o negrito foi aplicado no trecho que o autor marcou', /<w:b\s*\/>/.test(corridaCom('negrito')));
    ok('o italico foi aplicado no trecho que o autor marcou', /<w:i\s*\/>/.test(corridaCom('italico')));
    ok('o codigo saiu em fonte monoespacada', corridaCom('codigo').includes('w:ascii="Consolas"'));
    ok('a tabela saiu como tabela', xml.includes('<w:tbl>'));
    ok('a lista saiu com marca', texto.includes('•  primeiro item da lista'));
    ok('o separador de cena continua virando o ornamento', texto.includes('❧'));

    // 3. Nada foi comido no caminho.
    ok('o texto da citacao saiu inteiro e numa frase so',
      texto.includes('A citacao ocupa duas linhas no fonte e nao pode levar o marcador para o meio da frase quando as linhas se juntarem.'));
    ok('o diagrama guardou a quebra e o espaco de recuo',
      texto.includes('diagrama --> com espaco') && texto.includes('   e linha em branco dentro'));
    ok('a celula da tabela guardou o conteudo', texto.includes('valor dois'));
    ok('paragrafo sem marcacao nenhuma segue paragrafo', texto.includes('Fim do capitulo.'));
  }
}

// ---------------------------------------------------------------------------
// 0.8.0 — pdf. Cada DOCX de revisao vira PDF por um conversor externo. O CI
// nao tem Word nem LibreOffice: o teste usa um conversor proprio, que e a
// mesma porta que o autor tem para plugar outro conversor.
// ---------------------------------------------------------------------------

{
  const p = projeto('Ágape — Obra');
  const man = join(p.dir, 'manuscrito');
  mkdirSync(man, { recursive: true });
  const docx = (nome) => { writeFileSync(join(man, nome), 'docx de mentira', 'utf8'); return join(man, nome); };
  docx('Ágape — Obra — revisao 1.docx');
  docx('Ágape — Obra — revisao 2.docx');
  docx('~$ape — Obra — revisao 2.docx');
  docx('Ágape — Obra — versao de leitura.docx');

  const conversores = mkdtempSync(join(tmpdir(), 'bookfw-conv-'));
  descartar.push(conversores);
  const bom = join(conversores, 'bom.mjs');
  writeFileSync(bom, "import { writeFileSync } from 'node:fs';\nconst [, , entrada, saida] = process.argv;\nwriteFileSync(saida, `%PDF-1.4\\n% de ${entrada}\\n`);\n", 'utf8');
  const lixo = join(conversores, 'lixo.mjs');
  writeFileSync(lixo, "import { writeFileSync } from 'node:fs';\nwriteFileSync(process.argv[3], 'isto nao e pdf');\n", 'utf8');
  const pdfs = () => readdirSync(man).filter((f) => f.endsWith('.pdf')).sort();

  const r = p.rodar('pdf', '--conversor', bom);
  ok('pdf converte cada DOCX de revisao', r.codigo === 0
    && JSON.stringify(pdfs()) === JSON.stringify(['Ágape — Obra — revisao 1.pdf', 'Ágape — Obra — revisao 2.pdf']));
  ok('a trava do Word e o DOCX sem numero de revisao ficam fora', !pdfs().some((f) => f.startsWith('~$') || f.includes('versao de leitura')));
  ok('a saida diz quantos converteu e com qual conversor', r.saida.includes('2 convertido(s)') && r.saida.includes('conversor'));

  const denovo = p.rodar('pdf', '--conversor', lixo);
  ok('PDF mais novo que o DOCX e pulado, sem chamar o conversor', denovo.codigo === 0 && denovo.saida.includes('2 ja atualizado(s)'));

  const uma = p.rodar('pdf', '--revisao', '1', '--forcar', '--conversor', bom);
  ok('--revisao 1 --forcar converte so aquela', uma.codigo === 0 && uma.saida.includes('1 convertido(s)') && uma.saida.includes('revisao 1.pdf'));
  ok('--revisao sem DOCX e erro que diz quais existem', p.rodar('pdf', '--revisao', '9', '--conversor', bom).codigo === 1);

  const ruim = p.rodar('pdf', '--forcar', '--conversor', lixo);
  ok('conversor que nao produz PDF faz o comando falhar', ruim.codigo === 1 && !ruim.saida.includes('pdf gerado'));
  ok('conversor inexistente e erro', p.rodar('pdf', '--forcar', '--conversor', join(conversores, 'nao-existe.mjs')).codigo === 1);

  const vazio = projeto('Sem Revisao');
  ok('sem DOCX de revisao o pdf recusa e diz o caminho', (() => {
    const v = vazio.rodar('pdf', '--conversor', bom);
    return v.codigo === 1 && v.saida.includes('bookfw docx');
  })());
}

// ---------------------------------------------------------------------------
// 0.9.0 — referencia biblica, pagina sem quebra solta, sumario, indice e
// pagina final. Ver ADR-2026-09-18.
//
// O modo de falha do gate e a referencia sem livro passar calada; o do indice,
// o homonimo levar as paginas do outro ("Jose" de Nazare e do Egito). Os dois
// sao medidos aqui pelo numero, e nao pela existencia do recurso.
// ---------------------------------------------------------------------------
{
  const { trechosDeReferencia, problemasDeReferencia, modoDeReferencia } = await import('../src/biblia.mjs');
  const { fichasDoIndice, termosDaCena, acharTermos, campoXE } = await import('../src/indice.mjs');

  const frase = 'Diz (Mateus 20,3-4), (II Coríntios 4,7), (Salmo 139(138),13) e (Cântico dos Cânticos 2,7; 3,5). Mas (20,3), (1 Coríntios 6,1) e (3,5 milhões).';
  const refs = trechosDeReferencia(frase).filter((x) => x.referencia).map((x) => x.texto);
  ok('referencia reconhecida pelo livro, com salmo e lista', JSON.stringify(refs) === JSON.stringify(
    ['(Mateus 20,3-4)', '(II Coríntios 4,7)', '(Salmo 139(138),13)', '(Cântico dos Cânticos 2,7; 3,5)', '(1 Coríntios 6,1)']));
  ok('os trechos devolvem o texto inteiro', trechosDeReferencia(frase).map((x) => x.texto).join('') === frase);
  const romano = problemasDeReferencia(frase, 'romano').map((p) => p.trecho);
  ok('romano cobra referencia sem livro e algarismo arabico', romano.includes('(20,3)') && romano.includes('1 Coríntios 6') && romano.length === 2);
  ok('arabico cobra so a referencia sem livro', JSON.stringify(problemasDeReferencia(frase, 'arabico').map((p) => p.trecho)) === '["(20,3)"]');
  ok('numero decimal entre parenteses nao e referencia', !romano.some((t) => t.includes('milhões')));
  ok('valor desconhecido de referencia_biblica e invalido, nao erro', modoDeReferencia({ referencia_biblica: 'sim' }) === 'invalido' && modoDeReferencia({}) === null);

  const fichas = fichasDoIndice([
    { nome: 'José de Nazaré', apelidos: ['José', 'o carpinteiro'] },
    { nome: 'José do Egito', apelidos: ['José'] },
    { nome: 'Maria de Nazaré', apelidos: ['Maria'] },
    { nome: 'Irma Dulce', apelidos: ['Maria Rita'] },
    { nome: 'O leitor', apelidos: [] },
  ], ['O leitor']);
  ok('indice_excluir tira a ficha', !fichas.has('o leitor'));
  ok('apelido descritivo, em minuscula, nao vira termo', !fichas.get('jose de nazare').termos.includes('o carpinteiro'));
  const nazare = termosDaCena(fichas, ['José de Nazaré']);
  const ambos = termosDaCena(fichas, ['José de Nazaré', 'José do Egito']);
  ok('a cena resolve o homonimo', acharTermos('José acordou.', nazare).map((m) => m.nome).join() === 'José de Nazaré');
  ok('apelido de duas fichas da mesma cena fica de fora', acharTermos('José acordou.', ambos).length === 0);
  ok('ficha nao declarada na cena nao marca', acharTermos('José acordou.', termosDaCena(fichas, ['Maria de Nazaré'])).length === 0);
  const dulce = termosDaCena(fichas, ['Irma Dulce', 'Maria de Nazaré']);
  ok('termo mais longo consome o trecho primeiro', acharTermos('Maria Rita rezava.', dulce).map((m) => m.nome).join() === 'Irma Dulce');
  ok('aspas e barra saem da instrucao do campo', campoXE('Ana "a\\b"') === 'XE "Ana ab"');

  // O gate, pela linha de comando.
  const g = projeto('Gate da Referencia');
  g.rodar('cap', 'new', 'Um', '--ato', '1');
  const gArq = join(g.dir, 'capitulos', 'backlog', readdirSync(join(g.dir, 'capitulos', 'backlog'))[0]);
  const gBase = readFileSync(gArq, 'utf8');
  const gLivro = join(g.dir, 'livro.yaml');
  const gLivroBase = readFileSync(gLivro, 'utf8');
  const gateCom = (valor, prosa) => {
    writeFileSync(gLivro, valor ? `${gLivroBase}\nreferencia_biblica: ${valor}\n` : gLivroBase, 'utf8');
    writeFileSync(gArq, `${gBase}\n\n${prosa}\n`, 'utf8');
    return g.rodar('validate');
  };
  const semLivro = gateCom('romano', 'Ele respondeu (20,3).');
  ok('gate reprova referencia sem livro', semLivro.codigo === 1 && semLivro.saida.includes('referencia sem o livro'));
  const arab = gateCom('romano', 'Paulo escreveu (1 Coríntios 6,1).');
  ok('gate reprova algarismo no modo romano e diz a forma', arab.codigo === 1 && arab.saida.includes('I Coríntios'));
  ok('gate aceita algarismo no modo arabico', gateCom('arabico', 'Paulo escreveu (1 Coríntios 6,1).').codigo === 0);
  ok('gate aceita a referencia completa', gateCom('romano', 'Ele respondeu (Mateus 20,3).').codigo === 0);
  ok('sem a chave, nada muda no gate', gateCom('', 'Ele respondeu (20,3).').codigo === 0);
  const inval = gateCom('sim', 'Ele respondeu (20,3).');
  ok('valor invalido desliga a regra com aviso', inval.codigo === 0 && inval.saida.includes('ficou desligada'));

  // O papel.
  let Zip = null;
  try { await import('docx'); Zip = (await import('jszip')).default; } catch { /* ausente */ }
  if (!Zip) {
    console.log('  PULADO  docx 0.9.0 — pacote `docx` ausente (npm i docx para cobrir)');
  } else {
    const montar = (titulo, extras, comFinal) => {
      const p = projeto(titulo);
      const dirP = join(p.dir, 'docs', 'canon', 'personagens');
      mkdirSync(dirP, { recursive: true });
      const ficha = (arq, nome, apelidos) => writeFileSync(join(dirP, arq),
        `---\nnome: ${nome}\napelidos: [${apelidos}]\nresumo: x\n---\n\n## Quem e\n\nx.\n`, 'utf8');
      ficha('jose-de-nazare.md', 'José de Nazaré', 'José');
      ficha('jose-do-egito.md', 'José do Egito', 'José');
      ficha('marta.md', 'Marta', '');
      const capitulo = (n, titulo2, quem, prosa) => {
        p.rodar('cap', 'new', titulo2, '--ato', '1');
        const arq = join(p.dir, 'capitulos', 'backlog', readdirSync(join(p.dir, 'capitulos', 'backlog')).find((f) => f.startsWith(`cap-0${n}`)));
        const t = readFileSync(arq, 'utf8')
          .replace('personagens: []', `personagens: [${quem}]`)
          .replace('objetivo:', 'objetivo: a').replace('conflito:', 'conflito: b').replace('virada:', 'virada: c');
        writeFileSync(arq, `${t}\n\n${prosa}\n`, 'utf8');
        p.rodar('cap', 'move', String(n), 'revisao');
      };
      capitulo(1, 'O carpinteiro', 'José de Nazaré, Marta', 'José acordou e fez isso (Mateus 1,24). Marta viu.');
      capitulo(2, 'O vendido', 'José do Egito', 'José foi vendido por vinte moedas (Gênesis 37,28).');
      if (extras) writeFileSync(join(p.dir, 'livro.yaml'), `${readFileSync(join(p.dir, 'livro.yaml'), 'utf8')}\n${extras}\n`, 'utf8');
      if (comFinal) {
        writeFileSync(join(p.dir, 'docs', 'pagina-final.md'),
          '## Deus capacita os escolhidos\n\nA nossa capacidade vem de Deus.\n(II Coríntios 3,5-6)\n', 'utf8');
      }
      const r = p.rodar('docx');
      return { p, r };
    };
    const xmlDe = async (p) => {
      const nome = readdirSync(join(p.dir, 'manuscrito')).find((f) => f.endsWith('.docx'));
      const z = await Zip.loadAsync(readFileSync(join(p.dir, 'manuscrito', nome)));
      return z.file('word/document.xml').async('string');
    };
    const conta = (s, alvo) => s.split(alvo).length - 1;

    const com = montar('Livro Completo', [
      'referencia_biblica: romano', 'referencia_biblica_corpo: 9', 'sumario: sim',
      'indice: personagens', 'indice_excluir: [Marta]',
    ].join('\n'), true);
    ok('docx roda com as chaves novas', com.r.codigo === 0 && com.r.saida.includes('sumario com 3 entrada(s)'));
    const x = await xmlDe(com.p);
    const corridas = x.split('<w:r>').slice(1);
    const daRef = corridas.find((r) => r.includes('>(Mateus 1,24)<')) || '';
    ok('a referencia sai em italico e no corpo configurado', /<w:i\/>/.test(daRef) && daRef.includes('<w:sz w:val="18"/>'));
    const daProsa = corridas.find((r) => r.includes('foi vendido')) || '';
    ok('a prosa em volta continua reta e no corpo do texto', !/<w:i\/>/.test(daProsa) && daProsa.includes('<w:sz w:val="21"/>'));
    ok('nenhum paragrafo so de quebra de pagina', !x.includes('w:type="page"'));
    ok('cada capitulo abre pagina pelo proprio paragrafo', conta(x, '<w:pageBreakBefore/>') >= 3);
    ok('o sumario e um TOC sobre campos TC', x.includes('TOC \\f &quot;S&quot; \\l &quot;1-2&quot;') && conta(x, ' TC &quot;') === 3);
    ok('o sumario nao omite o numero de pagina', !/TOC [^<]*\\n/.test(x));
    ok('Jose de Nazare marcado uma vez, no capitulo que o declara', conta(x, 'XE &quot;José de Nazaré&quot;') === 1);
    ok('Jose do Egito marcado uma vez, no capitulo que o declara', conta(x, 'XE &quot;José do Egito&quot;') === 1);
    ok('a marca do homonimo cai no capitulo certo', x.indexOf('XE &quot;José do Egito&quot;') > x.indexOf('O vendido'));
    ok('indice_excluir e respeitado no papel', !x.includes('XE &quot;Marta&quot;'));
    ok('o livro termina num campo INDEX', x.includes(' INDEX \\h &quot;A&quot;'));
    ok('nenhum campo simples vazio, que embaralha o Word', !x.includes('fldSimple'));
    // Campo sem inicio vira texto solto para o Word: XE, TC e INDEX somem.
    const instrucoes = conta(x, '<w:instrText');
    ok('todo campo abre e fecha: um inicio e um fim por instrucao',
      instrucoes >= 5 && conta(x, 'w:fldCharType="begin"') === instrucoes && conta(x, 'w:fldCharType="end"') === instrucoes);
    ok('a pagina final fica no pe da pagina, a direita', x.includes('<w:vAlign w:val="bottom"/>') && x.includes('Deus capacita os escolhidos') && x.includes('<w:jc w:val="right"/>'));

    const sem = montar('Livro Simples', '', false);
    const xs = await xmlDe(sem.p);
    ok('sem as chaves, sem sumario, indice nem referencia estilizada', sem.r.codigo === 0
      && !xs.includes(' TOC ') && !xs.includes(' XE ') && !xs.includes('vAlign')
      && !(xs.split('<w:r>').find((r) => r.includes('>(Mateus 1,24)')) || '').includes('<w:i/>'));
    ok('sem as chaves, tambem sem paragrafo de quebra', !xs.includes('w:type="page"'));

    const vazio = montar('Indice Vazio', 'indice: personagens\nindice_excluir: [José de Nazaré, José do Egito, Marta]', false);
    const xv = await xmlDe(vazio.p);
    ok('indice sem nenhum nome nao gera pagina de indice, e avisa', !xv.includes(' INDEX ') && vazio.r.saida.includes('nenhum nome encontrado'));
  }
}


// ------------------------------------------------------------- fragmentos
// Documento sem narrador entre capitulos. Antes de 2026-09-20 eles nao
// existiam para o CLI: numa obra de 38 capitulos, os 12 fragmentos sairam do
// manuscrito calados e o DOCX so ficou certo por injecao manual revertida
// depois. Ver ADR-2026-09-20-fragmento-e-um-artefato-da-obra.
{
  // O titulo NAO pode conter a palavra que as assercoes procuram: o build
  // imprime o caminho do manuscrito, e 'obra-com-fragmento.md' faria
  // `saida.includes('fragmento')` passar sem nenhum fragmento existir.
  const { dir, rodar } = projeto('Obra com Documento');

  // Um capitulo com prosa, para haver onde pendurar o fragmento.
  rodar('cap', 'new', 'O primeiro', '--ato', '1');
  rodar('cap', 'move', '1', 'esboco');
  const cap1 = join(dir, 'capitulos', 'esboco', 'cap-01-o-primeiro.md');
  writeFileSync(cap1, readFileSync(cap1, 'utf8')
    .replace('local:', 'local: Cozinha')
    .replace('objetivo:', 'objetivo: sair de casa')
    .replace('conflito:', 'conflito: a porta esta trancada')
    .replace('virada:', 'virada: a chave nao e dela')
    + '\n\nProsa do primeiro capitulo, com palavras suficientes para existir.\n', 'utf8');
  rodar('cap', 'move', '1', 'escrita');
  rodar('cap', 'move', '1', 'revisao');

  const frag = (nome, texto) => {
    mkdirSync(join(dir, 'docs', 'fragmentos'), { recursive: true });
    writeFileSync(join(dir, 'docs', 'fragmentos', nome), texto, 'utf8');
  };

  // AC12 — sem o diretorio, nada muda.
  const semFrag = rodar('build');
  ok('sem docs/fragmentos o build nao fala em fragmento', !semFrag.saida.includes('fragmento'));
  ok('sem docs/fragmentos o status nao fala em fragmento', !rodar('status').saida.includes('fragmento'));

  // LEIAME do diretorio nao e fragmento: nao tem id nem posicao.
  frag('LEIAME.md', '# Fragmentos\n\nComo escrever um fragmento.\n');
  ok('arquivo sem id e sem posicao nao e fragmento', !rodar('build').saida.includes('fragmento'));

  // AC2 — o fragmento sai depois do capitulo declarado.
  frag('F01-boletim.md', [
    '---', 'id: F01', 'depois_do_capitulo: 1', 'tipo: boletim trimestral', '---', '',
    '# F01 — Boletim ao cotista', '', '---', '',
    'Taxa de acerto no rodape, sem ninguem comentando.', '', '---', '',
  ].join('\n'));
  const comFrag = rodar('build');
  ok('build intercala o fragmento e diz quantos', comFrag.codigo === 0 && comFrag.saida.includes('1 fragmento(s) intercalado(s)'));
  const manuscrito = readFileSync(join(dir, 'manuscrito', 'obra-com-documento.md'), 'utf8');
  ok('o corpo do fragmento entra no manuscrito', manuscrito.includes('Taxa de acerto no rodape'));
  ok('o titulo do fragmento sai sem o id', manuscrito.includes('### Boletim ao cotista') && !manuscrito.includes('### F01 —'));
  ok('o fragmento vem depois do capitulo que ele segue', manuscrito.indexOf('Taxa de acerto') > manuscrito.indexOf('Prosa do primeiro capitulo'));
  // A regua da borda e do arquivo; o separador quem poe e o build.
  ok('regua na borda do corpo nao sai duplicada', !/---\n\n---/.test(manuscrito));

  // AC10 — o painel conta.
  ok('status conta o fragmento', rodar('status').saida.includes('fragmentos 1'));

  // AC5 — fragmento depois de capitulo abaixo do corte nao sai.
  rodar('cap', 'new', 'O segundo', '--ato', '1');
  frag('F02-tardio.md', ['---', 'id: F02', 'depois_do_capitulo: 2', '---', '', '# F02 — Tardio', '', 'Corpo do tardio.', ''].join('\n'));
  const corte = rodar('build');
  ok('fragmento depois de capitulo abaixo do corte nao sai', corte.saida.includes('1 fragmento(s) intercalado(s)')
    && !readFileSync(join(dir, 'manuscrito', 'obra-com-documento.md'), 'utf8').includes('Corpo do tardio'));

  // AC6, AC7, AC9 — o gate.
  const gate = (nome, texto) => { frag(nome, texto); const r = rodar('validate'); return r.saida; };
  ok('gate reprova id ausente',
    gate('sem-id.md', ['---', 'depois_do_capitulo: 1', '---', '', '# Sem id', '', 'Corpo.', ''].join('\n')).includes('sem "id"'));
  ok('gate reprova id duplicado',
    gate('duplicado.md', ['---', 'id: F01', 'depois_do_capitulo: 1', '---', '', '# Outro F01', '', 'Corpo.', ''].join('\n')).includes('duplicado com'));
  ok('gate reprova posicao que nao e numero',
    gate('texto.md', ['---', 'id: F03', 'depois_do_capitulo: depois do capitulo 1', '---', '', '# F03', '', 'Corpo.', ''].join('\n')).includes('nao e um numero de capitulo'));
  ok('gate reprova posicao apontando para capitulo inexistente',
    gate('longe.md', ['---', 'id: F04', 'depois_do_capitulo: 99', '---', '', '# F04', '', 'Corpo.', ''].join('\n')).includes('nao existe capitulo 99'));
  ok('gate reprova fragmento pagando promessa',
    gate('paga.md', ['---', 'id: F05', 'depois_do_capitulo: 1', 'paga: [P1]', '---', '', '# F05', '', 'Corpo.', ''].join('\n')).includes('planta promessa e nao paga'));
  ok('gate reprova promessa que nao esta no plano diretor',
    gate('promessa.md', ['---', 'id: F06', 'depois_do_capitulo: 1', 'promessas: [P99]', '---', '', '# F06', '', 'Corpo.', ''].join('\n')).includes('"P99" nao existe no plano diretor'));

  // AC8 e AC9 — promessa do PD declarada em fragmento conta como plantada.
  for (const f of ['sem-id.md', 'duplicado.md', 'texto.md', 'longe.md', 'paga.md', 'promessa.md']) {
    rmSync(join(dir, 'docs', 'fragmentos', f), { force: true });
  }
  const pds = readdirSync(join(dir, 'docs', 'plano-diretor'));
  const pdPath = join(dir, 'docs', 'plano-diretor', pds[pds.length - 1]);
  // Ancorado na linha: o template cita `- P1 — texto` na instrucao acima da
  // lista, e um replace solto trocava o exemplo em vez da promessa.
  writeFileSync(pdPath, readFileSync(pdPath, 'utf8').replace(/^- P1 —.*$/m, '- P1 — o boletim acerta demais e a obra explica por que'), 'utf8');
  frag('F01-boletim.md', [
    '---', 'id: F01', 'depois_do_capitulo: 1', 'promessas: [P1]', '---', '',
    '# F01 — Boletim ao cotista', '', 'Taxa de acerto no rodape.', '',
  ].join('\n'));
  const chekhov = rodar('validate');
  ok('promessa plantada em fragmento nao e mais cobrada como ausente',
    !chekhov.saida.includes('promessa P1 ("o boletim acerta demais e a obra explica por que") nao aparece em nenhuma cena'));
  ok('promessa plantada em fragmento e cobrada como nao paga',
    chekhov.saida.includes('promessa P1 plantada e nunca paga'));
}

for (const d of descartar) rmSync(d, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} falha(s).` : '\nOK.');
process.exit(falhas ? 1 : 0);
