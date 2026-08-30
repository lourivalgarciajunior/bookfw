#!/usr/bin/env node
/**
 * bookfw — governanca de escrita de livros.
 * DEC -> PD -> SUM -> kanban de capitulos -> manuscrito.
 */
import { readFileSync } from 'node:fs';
import { Erro, c } from '../src/core.mjs';
import { init } from '../src/init.mjs';
import { dec, pd, sum, capNew, capMove } from '../src/novo.mjs';
import { status, context } from '../src/status.mjs';
import { validate } from '../src/validate.mjs';
import { style } from '../src/style.mjs';
import { brief } from '../src/brief.mjs';
import { build } from '../src/build.mjs';

// fonte unica: duplicar a versao aqui deixou o CLI dizendo 0.1.0 com o pacote em 0.1.1
const VERSAO = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;

const AJUDA = `bookfw ${VERSAO} — governanca de escrita de livros

  bookfw init "Titulo"              cria o projeto do livro
  bookfw dec "Decisao"              decisao de obra (POV, tempo verbal, final)
  bookfw pd ["Titulo"]              plano diretor da obra
  bookfw sum ["Titulo"]             sumario derivado do plano diretor
  bookfw cap new "Titulo do cap"    novo capitulo em backlog/
  bookfw cap move <cap> <estado>    move no kanban (--forcar para reabrir pronto)
  bookfw brief <cap> [--cena N]     briefing da cena — o pacote do escritor
  bookfw style                      mede sua voz sobre samples/
  bookfw status                     kanban, promessas e contagem
  bookfw context                    dump da governanca para LLM
  bookfw validate [--json]          gate — zero violacoes antes de fechar
  bookfw build [--desde <estado>]   costura o manuscrito (padrao: revisao)

estados: backlog esboco escrita revisao pronto bloqueado abandonado`;

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else args._.push(a);
  }
  return args;
}

const [, , cmd, ...resto] = process.argv;
const args = parse(resto);

try {
  switch (cmd) {
    case 'init': init(args); break;
    case 'dec': dec(args); break;
    case 'pd': pd(args); break;
    case 'sum': sum(args); break;
    case 'cap': {
      const sub = args._.shift();
      if (sub === 'new') capNew(args);
      else if (sub === 'move') capMove(args);
      else throw new Erro('Uso: bookfw cap new|move');
      break;
    }
    case 'brief': brief(args); break;
    case 'style': style(args); break;
    case 'status': status(args); break;
    case 'context': context(args); break;
    case 'validate': process.exitCode = validate(args); break;
    case 'build': build(args); break;
    case 'version': case '--version': case '-v': console.log(VERSAO); break;
    case undefined: case 'help': case '--help': case '-h': console.log(AJUDA); break;
    default:
      console.error(`${c.red('comando desconhecido')} "${cmd}"\n`);
      console.log(AJUDA);
      process.exitCode = 1;
  }
} catch (e) {
  if (e instanceof Erro) {
    console.error(`${c.red('erro')} ${e.message}`);
    process.exitCode = 1;
  } else throw e;
}
