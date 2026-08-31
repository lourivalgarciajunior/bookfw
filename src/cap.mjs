/**
 * Operacoes de capitulo que mexem em nome de arquivo E frontmatter ao mesmo
 * tempo. Feitas na mao, as duas coisas desencontram: o arquivo diz cap-07 e o
 * frontmatter diz 8, ou o titulo muda e o slug do nome fica preso ao antigo.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharProjeto, c, capitulos, moverCapitulo, rel, slug } from './core.mjs';

/**
 * Resolve o alvo por arquivo, id ou numero. Aceita lista e faixa:
 * `8,9,12` e `8..12`. Fechar dez capitulos era dez comandos.
 */
export function alvosDe(caps, texto) {
  const pedidos = String(texto).split(',').map((x) => x.trim()).filter(Boolean);
  const achados = [];
  for (const pedido of pedidos) {
    const faixa = pedido.match(/^(\d+)\.\.(\d+)$/);
    if (faixa) {
      const [de, ate] = [Number(faixa[1]), Number(faixa[2])];
      if (de > ate) throw new Erro(`Faixa "${pedido}" esta invertida.`);
      const naFaixa = caps.filter((x) => x.numero >= de && x.numero <= ate);
      if (!naFaixa.length) throw new Erro(`Nenhum capitulo na faixa ${pedido}.`);
      achados.push(...naFaixa);
      continue;
    }
    const cap = caps.find((x) =>
      x.arquivo === pedido || x.arquivo === `${pedido}.md` || x.fm.id === pedido || String(x.numero) === pedido);
    if (!cap) throw new Erro(`Capitulo "${pedido}" nao encontrado.`);
    achados.push(cap);
  }
  // sem repetir: `8..12,9` e um pedido plausivel e nao deve mover duas vezes
  return [...new Map(achados.map((x) => [x.caminho, x])).values()];
}

export function capMove(args) {
  const raiz = acharProjeto();
  const [pedido, destino] = args._;
  if (!pedido || !destino) throw new Erro('Uso: bookfw cap move <capitulo|lista|faixa> <estado> [--forcar]');

  const alvos = alvosDe(capitulos(raiz), pedido);
  // Em lote, um capitulo em pronto no meio da faixa nao pode abortar os outros
  // depois de metade ja ter movido. Confere tudo antes de mexer em qualquer um.
  if (!args.forcar) {
    const fechados = alvos.filter((x) => x.estado === 'pronto' && destino !== 'pronto');
    if (fechados.length) {
      throw new Erro(`${fechados.map((x) => x.arquivo).join(', ')} em pronto — nada foi movido.\n`
        + '       Reabrir texto fechado e deliberado; repita com --forcar se for isso mesmo.');
    }
  }

  for (const alvo of alvos) {
    const r = moverCapitulo(raiz, alvo.arquivo, destino, { forcar: Boolean(args.forcar) });
    console.log(`${c.cyan(r.de)} -> ${c.green(r.para)}  ${rel(raiz, r.caminho)}`);
  }
  if (alvos.length > 1) console.log(c.dim(`  ${alvos.length} capitulos movidos`));
}

/** Reescreve id, numero e titulo no frontmatter e renomeia o arquivo junto. */
function reescrever(raiz, cap, { numero = cap.numero, titulo = cap.fm.titulo || '' }) {
  const id = `cap-${String(numero).padStart(2, '0')}-${slug(titulo)}`;
  const novo = join(raiz, 'capitulos', cap.estado, `${id}.md`);
  if (novo !== cap.caminho && existsSync(novo)) throw new Erro(`${rel(raiz, novo)} ja existe.`);

  const raw = readFileSync(cap.caminho, 'utf8');
  // Casa CRLF tambem: no Windows o arquivo abre com `---\r\n`, e procurar
  // `---\n` cru fazia o comando recusar todo capitulo do disco do autor.
  const m = /^(﻿?---\r?\n)([\s\S]*?)(\r?\n---)/.exec(raw);
  if (!m) throw new Erro(`${cap.arquivo} nao tem frontmatter — corrija a mao.`);
  // so o frontmatter e reescrito: `^numero:` solto pegaria linha da prosa
  const fm = m[2]
    .replace(/^id:.*$/m, `id: ${id}`)
    .replace(/^numero:.*$/m, `numero: ${numero}`)
    .replace(/^titulo:.*$/m, `titulo: ${titulo}`);
  writeFileSync(cap.caminho, m[1] + fm + raw.slice(m[1].length + m[2].length), 'utf8');
  if (novo !== cap.caminho) renameSync(cap.caminho, novo);
  return { id, caminho: novo };
}

export function capRenumber(args) {
  const raiz = acharProjeto();
  const [pedido, alvo] = args._;
  if (!pedido || !alvo) throw new Erro('Uso: bookfw cap renumber <capitulo> <novo numero>');
  const numero = Number(alvo);
  if (!Number.isInteger(numero) || numero < 1) throw new Erro(`"${alvo}" nao e um numero de capitulo.`);

  const caps = capitulos(raiz);
  const [cap] = alvosDe(caps, pedido);
  if (cap.numero === numero) throw new Erro(`Capitulo ja e o numero ${numero}.`);
  const ocupado = caps.find((x) => x.numero === numero);
  if (ocupado) {
    throw new Erro(`Numero ${numero} ja e de ${ocupado.arquivo}.\n`
      + '       Renumerar por cima de capitulo existente troca dois textos de lugar sem dizer — mova o outro antes.');
  }

  const antes = cap.arquivo;
  const r = reescrever(raiz, cap, { numero });
  console.log(`${c.green('renumerado')}  ${antes} -> ${rel(raiz, r.caminho)}`);
  console.log(c.dim('  confira o sumario: o gate compara os dois'));
}

export function capRetitle(args) {
  const raiz = acharProjeto();
  const pedido = args._.shift();
  const titulo = args._.join(' ').trim();
  if (!pedido || !titulo) throw new Erro('Uso: bookfw cap retitle <capitulo> "Titulo novo"');
  if (titulo.includes(':')) throw new Erro('Titulo com ":" — o NTFS trunca o arquivo para 0 byte. Use travessao ou hifen.');

  const [cap] = alvosDe(capitulos(raiz), pedido);
  const antes = cap.arquivo;
  const r = reescrever(raiz, cap, { titulo });
  console.log(`${c.green('retitulado')}  ${antes} -> ${rel(raiz, r.caminho)}`);
  console.log(c.dim(`  "${cap.fm.titulo || '(sem titulo)'}" -> "${titulo}"`));
  console.log(c.dim('  confira o sumario: o gate compara os dois'));
}
