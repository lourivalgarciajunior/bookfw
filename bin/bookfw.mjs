#!/usr/bin/env node
/**
 * bookfw — governanca de escrita de livros.
 * DEC -> PD -> SUM -> kanban de capitulos -> manuscrito.
 */
import { readFileSync } from 'node:fs';
import { Erro, c } from '../src/core.mjs';
import { init } from '../src/init.mjs';
import { dec, pd, sum, capNew } from '../src/novo.mjs';
import { capMove, capRenumber, capRetitle } from '../src/cap.mjs';
import { capa, capaBrief } from '../src/capa.mjs';
import { canonNew } from '../src/canon.mjs';
import { cenaAdd } from '../src/cena.mjs';
import { status, context } from '../src/status.mjs';
import { validate } from '../src/validate.mjs';
import { style } from '../src/style.mjs';
import { brief } from '../src/brief.mjs';
import { build } from '../src/build.mjs';
import { docx } from '../src/docx.mjs';

// fonte unica: duplicar a versao aqui deixou o CLI dizendo 0.1.0 com o pacote em 0.1.1
const VERSAO = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;

const AJUDA = `bookfw ${VERSAO} — governanca de escrita de livros

  bookfw init "Titulo"              cria o projeto do livro
  bookfw dec "Decisao"              decisao de obra (POV, tempo verbal, final)
  bookfw pd ["Titulo"]              plano diretor da obra
  bookfw sum ["Titulo"]             sumario derivado do plano diretor
  bookfw sum --materializar         cria no kanban os capitulos do sumario
  bookfw cap new "Titulo do cap"    novo capitulo em backlog/
  bookfw cap move <cap|8..12> <est> move no kanban, um ou varios (--forcar)
  bookfw cap renumber <cap> <n>     troca o numero, arquivo e frontmatter juntos
  bookfw cap retitle <cap> "Titulo" troca o titulo, arquivo e frontmatter juntos
  bookfw cena add <cap>             novo contrato de cena no capitulo
  bookfw canon new <tipo> "Nome"    ficha de personagem ou lugar
  bookfw brief <cap> [--cena N]     briefing da cena — o pacote do escritor
  bookfw capa brief                 briefing da capa, derivado da obra
  bookfw capa [--formato <f>]       compoe a capa (svg,ebook,impressao,miniatura)
  bookfw style                      mede sua voz sobre samples/
  bookfw status                     kanban, promessas e contagem
  bookfw context                    dump da governanca para LLM
  bookfw validate [--json]          gate — zero violacoes antes de fechar
  bookfw build [--desde <estado>]   costura o manuscrito (padrao: revisao)
  bookfw docx [--desde <estado>]    versao de leitura em DOCX (pede o pacote docx)

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
      else if (sub === 'renumber') capRenumber(args);
      else if (sub === 'retitle') capRetitle(args);
      else throw new Erro('Uso: bookfw cap new|move|renumber|retitle');
      break;
    }
    case 'cena': {
      const sub = args._.shift();
      if (sub === 'add') cenaAdd(args);
      else throw new Erro('Uso: bookfw cena add <capitulo>');
      break;
    }
    case 'canon': {
      const sub = args._.shift();
      if (sub === 'new') canonNew(args);
      else throw new Erro('Uso: bookfw canon new personagem|lugar "Nome"');
      break;
    }
    case 'capa': {
      const sub = args._[0] === 'brief' ? args._.shift() : null;
      if (sub === 'brief') capaBrief(args);
      else await capa(args);
      break;
    }
    case 'brief': brief(args); break;
    case 'style': style(args); break;
    case 'status': status(args); break;
    case 'context': context(args); break;
    case 'validate': process.exitCode = validate(args); break;
    case 'build': build(args); break;
    case 'docx': await docx(args); break;
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
