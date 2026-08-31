/**
 * Acrescenta um contrato de cena a um capitulo. O template do capitulo entrega
 * a cena 1; da segunda em diante era edicao de markdown na mao — justamente o
 * formato que o gate cobra com erro.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Erro, acharProjeto, c, canon, capitulos, rel } from './core.mjs';

/**
 * O proximo id segue o que o capitulo ja usa: `6.1` continua em `6.2`, `6.A`
 * continua em `6.B`. Impor um esquema so reescreveria a mao do autor.
 */
export function proximoId(cap) {
  if (!cap.cenas.length) return `${cap.numero}.1`;
  const ultimo = String(cap.cenas[cap.cenas.length - 1].id || '').trim();
  const m = ultimo.match(/^(.*[.\-])?([0-9]+|[A-Za-z])$/);
  if (!m) return `${cap.numero}.${cap.cenas.length + 1}`;
  const [, prefixo = `${cap.numero}.`, sufixo] = m;
  const proximo = /[0-9]/.test(sufixo)
    ? String(Number(sufixo) + 1)
    : String.fromCharCode(sufixo.charCodeAt(0) + 1);
  return `${prefixo}${proximo}`;
}

export function cenaAdd(args) {
  const raiz = acharProjeto();
  const alvoId = args._[0];
  if (!alvoId) throw new Erro('Uso: bookfw cena add <capitulo> [--local ... --objetivo ...]');
  const cap = capitulos(raiz).find((x) =>
    x.arquivo === alvoId || x.arquivo === `${alvoId}.md` || String(x.numero) === String(alvoId) || x.fm.id === alvoId);
  if (!cap) throw new Erro(`Capitulo "${alvoId}" nao encontrado.`);

  // Mesma guarda do `cap move`: acrescentar cena a capitulo fechado e reabrir
  // a estrutura de um texto que ja foi dado por pronto.
  if (cap.estado === 'pronto' && !args.forcar) {
    throw new Erro(`Capitulo ${cap.arquivo} esta em pronto.\n`
      + `       Acrescentar cena a texto fechado e deliberado — repita com --forcar se for isso mesmo.`);
  }

  const personagens = String(args.personagens || '').split(',').map((x) => x.trim()).filter(Boolean);
  const id = args.id ? String(args.id) : proximoId(cap);
  if (cap.cenas.some((s) => String(s.id).trim() === id)) throw new Erro(`Capitulo ${cap.arquivo} ja tem cena "${id}".`);

  const numero = cap.cenas.length + 1;
  const bloco = `\n## Cena ${numero}\n\n\`\`\`cena\n`
    + `id: ${id}\n`
    + `local: ${args.local || ''}\n`
    + `tempo: ${args.tempo || ''}\n`
    + `foco: ${args.foco || cap.fm.foco || 'a definir'}\n`
    + `personagens: [${personagens.join(', ')}]\n`
    + `objetivo: ${args.objetivo || ''}\n`
    + `conflito: ${args.conflito || ''}\n`
    + `virada: ${args.virada || ''}\n`
    + `saida: ${args.saida || ''}\n`
    + `promessas: [${String(args.promessas || '').split(',').map((x) => x.trim()).filter(Boolean).join(', ')}]\n`
    + `paga: [${String(args.paga || '').split(',').map((x) => x.trim()).filter(Boolean).join(', ')}]\n`
    + `palavras_alvo: ${args.palavras || 1200}\n`
    + '```\n\n<!-- a prosa da cena entra aqui, logo abaixo do contrato -->\n';

  const raw = readFileSync(cap.caminho, 'utf8');
  writeFileSync(cap.caminho, `${raw.replace(/\s*$/, '')}\n${bloco}`, 'utf8');

  console.log(`${c.green('Cena criada')}  ${rel(raiz, cap.caminho)}  cena ${id} (${numero} de ${numero})`);

  // O gate reprova personagem sem ficha. Dizer isso aqui, com o comando pronto,
  // e mais barato que descobrir no validate depois de escrever a cena.
  const nomes = new Set(
    [...canon(raiz).personagens].flatMap((p) => [p.nome, ...p.apelidos]).map((n) => String(n).toLowerCase()),
  );
  for (const nome of personagens.filter((n) => !nomes.has(n.toLowerCase()))) {
    console.error(`  ${c.yellow('sem ficha')} "${nome}" — rode: bookfw canon new personagem "${nome}"`);
  }
  const branco = ['objetivo', 'conflito', 'virada'].filter((campo) => !args[campo]);
  if (branco.length) {
    console.log(c.dim(`  ${branco.join(', ')} em branco — o gate reprova a cena fora do backlog`));
  }
}
