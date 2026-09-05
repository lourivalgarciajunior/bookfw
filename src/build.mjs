/**
 * Costura o manuscrito. Le o kanban em ordem de capitulo e concatena so a
 * prosa — contrato de cena e comentario nao entram no livro.
 */
import { join } from 'node:path';
import { ESTADOS_ATIVOS, Erro, acharProjeto, c, capitulos, escrever, hoje, lerConfig, palavras, partes, prosaDe, rel } from './core.mjs';
import { carimbo, revisaoAtual } from './revisao.mjs';

/** O corte que produz o manuscrito de trabalho — tudo que ja tem prosa completa. */
export const CORTE_PADRAO = 'revisao';

/**
 * A prosa final de um capitulo: as cenas costuradas com o separador, ou o
 * corpo limpo quando o capitulo nao usa contrato de cena.
 */
export function prosaFinal(cap) {
  return cap.cenas.length
    ? cap.cenas.map((s) => s.prosa).filter(Boolean).join('\n\n* * *\n\n')
    : prosaDe(cap.corpo).trim();
}

/**
 * Quais capitulos entram na saida, dado o corte. Fonte unica do `build` e do
 * `docx`: o gerador de DOCX vivia copiado dentro das obras e reconstruia esta
 * selecao relendo o `.md` do manuscrito e recasando capitulo por numero. Um
 * cabecalho fora do formato e o capitulo perdia o frontmatter em silencio —
 * saia no papel sem ato e sem carimbo de ressalva, com a mesma cara de um
 * capitulo conferido. Lendo o kanban uma vez so, essa classe de erro some.
 */
export function selecao(raiz, minimo = CORTE_PADRAO) {
  const ordem = ESTADOS_ATIVOS;
  const corte = ordem.indexOf(minimo);
  if (corte < 0) throw new Erro(`--desde deve ser um de ${ordem.join(', ')}`);

  const todos = capitulos(raiz);
  const caps = todos.filter((x) => ordem.indexOf(x.estado) >= corte);
  if (!caps.length) throw new Erro(`Nenhum capitulo em ${minimo} ou adiante.`);

  // Capitulo bloqueado com prosa tem de ser dito. Ficar abaixo do corte e o
  // proposito do corte, e abandonar e decisao ja tomada — mas bloqueado e
  // pendencia, e o manuscrito saia com o buraco sem uma linha de aviso.
  return {
    ordem,
    corte,
    todos,
    caps,
    bloqueados: todos.filter((x) => x.estado === 'bloqueado' && x.palavras > 0),
    abaixoDoCorte: todos.filter((x) => {
      const i = ordem.indexOf(x.estado);
      return i >= 0 && i < corte;
    }),
  };
}

export function build(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const minimo = args.desde || CORTE_PADRAO;
  const { todos, caps, bloqueados, abaixoDoCorte } = selecao(raiz, minimo);

  const saida = [`# ${cfg.titulo}\n`];
  if (cfg.autor && cfg.autor !== 'a definir') saida.push(`_${cfg.autor}_\n`);
  // O carimbo LE o registro; nunca calcula. Sem revisao registrada o
  // manuscrito sai sem a linha — e o build avisa, porque e assim que duas
  // leituras acabam com o mesmo nome.
  const rev = revisaoAtual(raiz);
  if (rev) saida.push(`_${carimbo(rev)}_\n`);
  // A estrutura declarada no plano diretor chegando ao leitor: o divisor sai
  // quando o ato muda. Ato sem linha na tabela nao inventa titulo — avisa.
  const mapaPartes = partes(raiz);
  const orfaos = new Set();
  let atoAnterior = null;
  let divisores = 0;
  for (const cap of caps) {
    const ato = Number(cap.fm.ato) || null;
    if (ato && ato !== atoAnterior) {
      const parte = mapaPartes.get(ato);
      if (parte) { saida.push(`\n\n## Parte ${parte.romano} — ${parte.titulo}\n`); divisores++; }
      else if (mapaPartes.size) orfaos.add(ato);
      atoAnterior = ato;
    }
    saida.push(`\n\n## ${String(cap.numero).padStart(2, '0')} — ${cap.fm.titulo || ''}\n`);
    const prosa = prosaFinal(cap);
    saida.push(prosa || `> _[capitulo ainda sem prosa — ${cap.cenas.length} cenas planejadas]_`);
  }
  // Um arquivo por corte. O corte padrao fica com o nome limpo, e e o que as
  // ferramentas de exportacao leem; os outros ganham sufixo para nunca
  // sobrescrever o manuscrito de trabalho com uma versao parcial.
  const texto = saida.join('\n');
  const sufixo = minimo === CORTE_PADRAO ? '' : `-${minimo}`;
  const alvo = join(raiz, 'manuscrito', `${cfg.slug || 'manuscrito'}${sufixo}.md`);
  escrever(alvo, texto);

  const total = palavras(texto);
  console.log(`${c.green('manuscrito gerado')}  ${rel(raiz, alvo)}`);
  const fora = abaixoDoCorte.length ? `, ${abaixoDoCorte.length} abaixo do corte` : '';
  console.log(c.dim(`  corte: ${minimo} ou adiante | ${caps.length} de ${todos.length} capitulos${fora} | ${total} palavras | ~${Math.ceil(total / 250)} paginas | gerado em ${hoje()}`));
  const alvoPal = Number(cfg.palavras_alvo || 0);
  if (alvoPal) console.log(c.dim(`  ${Math.round((total / alvoPal) * 100)}% do alvo de ${alvoPal}`));
  for (const cap of bloqueados) {
    console.log(`  ${c.yellow('fora do manuscrito')} ${rel(raiz, cap.caminho)} — ${cap.palavras} palavras em ${cap.estado}`);
  }
  if (rev) console.log(c.dim(`  ${carimbo(rev).toLowerCase()} — ${rev.nota}`));
  else console.log(c.yellow('  sem revisao registrada — bookfw revisao "o que mudou" antes de mandar a alguem'));
  if (divisores) console.log(c.dim(`  ${divisores} divisor(es) de Parte, do plano diretor`));
  for (const a of orfaos) console.log(c.yellow(`  ato ${a} nao esta na tabela Estrutura do plano diretor — sem divisor`));
  console.log(c.dim('  versao de leitura em DOCX: bookfw docx'));
}
