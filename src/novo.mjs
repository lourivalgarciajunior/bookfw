import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharProjeto, artefatos, c, capitulos, escrever, hoje, lerConfig, moverCapitulo, rel, slug, template } from './core.mjs';

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
  const pdArq = artefatos(raiz, 'plano-diretor')[0];
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
  console.log(c.dim('  gere os capitulos com /bookfw:sum, depois `bookfw cap new` para materializar'));
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
  if (!nome || !destino) throw new Erro('Uso: bookfw cap move <capitulo> <estado>');
  const r = moverCapitulo(raiz, nome, destino);
  console.log(`${c.cyan(r.de)} -> ${c.green(r.para)}  ${rel(raiz, r.caminho)}`);
}
