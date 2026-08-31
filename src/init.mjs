import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ESTADOS, Erro, c, escrever, hoje, slug, template } from './core.mjs';

const DIRS = [
  'docs/dec', 'docs/plano-diretor', 'docs/sumario',
  'docs/canon/personagens', 'docs/canon/lugares',
  'samples', 'manuscrito', 'capitulos',
];

export function init(args) {
  const titulo = args.titulo || args._[0];
  if (!titulo) throw new Erro('Uso: bookfw init "Titulo da obra"');
  if (titulo.includes(':')) throw new Erro('Titulo com ":" — no Windows o NTFS abre alternate data stream e o arquivo fica com 0 byte. Use travessao.');
  const raiz = process.cwd();
  if (existsSync(join(raiz, 'livro.yaml'))) throw new Erro('Ja existe um livro.yaml aqui.');
  const filhos = readdirSync(raiz, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(raiz, d.name, 'livro.yaml')))
    .map((d) => d.name);
  if (filhos.length && !args.forcar) {
    throw new Erro(
      [`Esta pasta e um porta-livros — ja tem projeto(s) dentro: ${filhos.join(', ')}.`,
        '       O init escreve na pasta corrente, entao aqui ele espalharia os arquivos',
        '       ao lado dos outros livros. Crie a pasta e rode de dentro dela:',
        '         mkdir meu-livro && cd meu-livro && bookfw init "Meu Livro"',
        '       Repita com --forcar se voce quer mesmo um livro na raiz.',
      ].join(String.fromCharCode(10)),
    );
  }

  for (const d of DIRS) mkdirSync(join(raiz, d), { recursive: true });
  for (const e of ESTADOS) mkdirSync(join(raiz, 'capitulos', e), { recursive: true });

  escrever(join(raiz, 'livro.yaml'), template('livro.yaml', {
    titulo, slug: slug(titulo), data: hoje(),
    genero: args.genero || 'a definir',
    autor: args.autor || 'a definir',
  }));
  escrever(join(raiz, 'docs/canon/cronologia.md'), template('cronologia.md', { titulo }));
  escrever(join(raiz, 'docs/canon/regras.md'), template('regras.md', { titulo }));
  escrever(join(raiz, 'docs/style-card.md'), template('style-card.md', { titulo, data: hoje() }));
  escrever(join(raiz, 'samples/LEIAME.md'),
    '# samples\n\nColoque aqui textos ja escritos por voce (um .md ou .txt por texto).\n' +
    'O `bookfw style` mede a metrica objetiva; o agente Euterpe escreve o resto\n' +
    'do `docs/style-card.md` a partir deles.\n');

  console.log(`${c.green('projeto criado')} — ${titulo}`);
  console.log(c.dim('  proximo: bookfw dec "Decisao de obra"  ou  /bookfw:pd'));
}
