import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharProjeto, artefatos, c, capitulos, escrever, hoje, lerConfig, linhasDoSumario, moverCapitulo, planoDiretor, rel, slug, sumario, template } from './core.mjs';

function checaTitulo(t) {
  if (!t) throw new Erro('Titulo obrigatorio.');
  if (t.includes(':')) throw new Erro('Titulo com ":" — o NTFS trunca o arquivo para 0 byte. Use travessao ou hifen.');
  return t;
}

export function dec(args) {
  const raiz = acharProjeto();
  const titulo = checaTitulo(args._.join(' '));
  const nome = `DEC-${hoje()}-${slug(titulo)}.md`;
  const caminho = join(raiz, 'docs/dec', nome);
  if (existsSync(caminho)) throw new Erro(`${nome} ja existe.`);
  escrever(caminho, template('dec.md', { titulo, data: hoje(), id: nome.replace('.md', '') }));
  console.log(`${c.green('DEC criada')}  ${rel(raiz, caminho)}`);
}

export function pd(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const titulo = checaTitulo(args._.join(' ') || cfg.titulo);
  const nome = `PD-${hoje()}-${slug(titulo)}.md`;
  const caminho = join(raiz, 'docs/plano-diretor', nome);
  if (existsSync(caminho)) throw new Erro(`${nome} ja existe.`);
  const decs = artefatos(raiz, 'dec').map((d) => `- ${d.arquivo.replace('.md', '')}`).join('\n') || '- (nenhuma ainda)';
  escrever(caminho, template('pd.md', {
    titulo, data: hoje(), genero: cfg.genero || 'a definir',
    palavras_alvo: cfg.palavras_alvo || '60000', decs,
  }));
  console.log(`${c.green('Plano diretor criado')}  ${rel(raiz, caminho)}`);
  console.log(c.dim('  preencha com /bookfw:pd — o agente book-caliope conduz a entrevista'));
}

export function sum(args) {
  const raiz = acharProjeto();
  if (args.materializar || args.simular) return materializar(raiz, args);

  const pdArq = planoDiretor(raiz);
  if (!pdArq) throw new Erro('Nenhum plano diretor. Rode `bookfw pd` antes — sumario sem PD e outline sem promessa.');
  const cfg = lerConfig(raiz);
  const titulo = checaTitulo(args._.join(' ') || cfg.titulo);
  const nome = `SUM-${hoje()}-${slug(titulo)}.md`;
  const caminho = join(raiz, 'docs/sumario', nome);
  if (existsSync(caminho)) throw new Erro(`${nome} ja existe.`);
  escrever(caminho, template('sum.md', {
    titulo, data: hoje(), pd: pdArq.arquivo.replace('.md', ''),
    capitulos_alvo: args.capitulos || '24',
  }));
  console.log(`${c.green('Sumario criado')}  ${rel(raiz, caminho)}`);
  console.log(c.dim('  preencha a tabela com /bookfw:sum, depois `bookfw sum --materializar`'));
}

/**
 * Materializa o sumario no kanban. Ate aqui era `cap new` digitado uma vez por
 * capitulo — dezessete e vinte e quatro vezes nas duas obras reais. Idempotente:
 * capitulo que ja existe e pulado, entao rodar de novo depois de acrescentar
 * linha ao sumario so cria o que falta.
 */
function materializar(raiz, args) {
  const sumArq = sumario(raiz);
  if (!sumArq) throw new Erro('Nenhum sumario. Rode `bookfw sum` antes.');
  const { linhas, ignoradas, temTabela } = linhasDoSumario(sumArq.corpo);
  if (!linhas.length) {
    // Sem tabela e tabela em branco sao problemas diferentes, e a saida tem de
    // dizer qual dos dois: um se corrige no cabecalho, o outro escrevendo.
    throw new Erro(temTabela
      ? `A tabela de ${sumArq.arquivo} nao tem nenhuma linha com "#" e "Titulo" preenchidos.\n`
        + '       Preencha o sumario primeiro — materializar outline vazio so cria arquivo vazio.'
      : `${sumArq.arquivo} nao tem tabela de capitulos. Ela precisa das colunas "#" e "Titulo".`);
  }

  const cfg = lerConfig(raiz);
  const existentes = capitulos(raiz);
  const criados = [];
  const pulados = [];

  for (const linha of linhas) {
    const jaExiste = existentes.find((x) => x.numero === linha.numero);
    if (jaExiste) { pulados.push({ ...linha, arquivo: jaExiste.arquivo }); continue; }
    if (linha.titulo.includes(':')) {
      throw new Erro(`Capitulo ${linha.numero} tem ":" no titulo — o NTFS trunca o arquivo para 0 byte. Corrija ${sumArq.arquivo}.`);
    }
    const id = `cap-${String(linha.numero).padStart(2, '0')}-${slug(linha.titulo)}`;
    const caminho = join(raiz, 'capitulos', 'backlog', `${id}.md`);
    if (!args.simular) {
      escrever(caminho, template('capitulo.md', {
        id, titulo: linha.titulo, numero: String(linha.numero), data: hoje(),
        ato: linha.ato || '1', foco: 'a definir',
        palavras_alvo: linha.palavras || cfg.palavras_por_capitulo || '2500',
      }));
    }
    criados.push({ ...linha, caminho });
  }

  console.log(`${args.simular ? c.yellow('simulacao') : c.green('sumario materializado')}  de ${sumArq.arquivo}`);
  for (const x of criados) console.log(`  ${args.simular ? 'criaria' : c.green('criado ')} ${String(x.numero).padStart(2, '0')} ${x.titulo}`);
  for (const x of pulados) console.log(c.dim(`  ja existe ${String(x.numero).padStart(2, '0')} ${x.arquivo}`));
  // Linha ignorada tem de aparecer: um vao como "04–06 | a escrever" e trabalho
  // pendente, e sumir com ele daria a impressao de sumario inteiro materializado.
  for (const x of ignoradas) {
    console.log(`  ${c.yellow('ignorada')} "${x.bruto}" ${x.titulo ? `— ${x.titulo} ` : ''}(${x.motivo})`);
  }
  console.log(c.dim(`\n  ${criados.length} ${args.simular ? 'a criar' : 'criados'} | ${pulados.length} ja no kanban | ${linhas.length} no sumario${ignoradas.length ? ` | ${ignoradas.length} ignorada(s)` : ''}`));
  if (args.simular && criados.length) console.log(c.dim('  repita com --materializar para escrever'));
}

export function capNew(args) {
  const raiz = acharProjeto();
  const titulo = checaTitulo(args._.join(' '));
  const existentes = capitulos(raiz);
  const numero = Number(args.numero ?? (Math.max(0, ...existentes.map((x) => x.numero)) + 1));
  if (existentes.some((x) => x.numero === numero)) throw new Erro(`Ja existe capitulo numero ${numero}.`);
  const id = `cap-${String(numero).padStart(2, '0')}-${slug(titulo)}`;
  const caminho = join(raiz, 'capitulos', 'backlog', `${id}.md`);
  escrever(caminho, template('capitulo.md', {
    id, titulo, numero: String(numero), data: hoje(),
    ato: args.ato || '1', foco: args.foco || 'a definir',
    palavras_alvo: args.palavras || '2500',
  }));
  console.log(`${c.green('Capitulo criado')}  ${rel(raiz, caminho)}`);
}

export function capMove(args) {
  const raiz = acharProjeto();
  const [nome, destino] = args._;
  if (!nome || !destino) throw new Erro('Uso: bookfw cap move <capitulo> <estado> [--forcar]');
  const r = moverCapitulo(raiz, nome, destino, { forcar: Boolean(args.forcar) });
  console.log(`${c.cyan(r.de)} -> ${c.green(r.para)}  ${rel(raiz, r.caminho)}`);
}
