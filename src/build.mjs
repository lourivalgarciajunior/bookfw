/**
 * Costura o manuscrito. Le o kanban em ordem de capitulo e concatena so a
 * prosa — contrato de cena e comentario nao entram no livro.
 */
import { join } from 'node:path';
import { ESTADOS_ATIVOS, Erro, acharProjeto, c, capitulos, escrever, hoje, lerConfig, palavras, prosaDe, rel } from './core.mjs';

/** O corte que produz o manuscrito de trabalho — tudo que ja tem prosa completa. */
const CORTE_PADRAO = 'revisao';

export function build(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const minimo = args.desde || CORTE_PADRAO;
  const ordem = ESTADOS_ATIVOS;
  const corte = ordem.indexOf(minimo);
  if (corte < 0) throw new Erro(`--desde deve ser um de ${ordem.join(', ')}`);

  const todos = capitulos(raiz);
  const caps = todos.filter((x) => ordem.indexOf(x.estado) >= corte);
  if (!caps.length) throw new Erro(`Nenhum capitulo em ${minimo} ou adiante.`);

  // Capitulo bloqueado com prosa tem de ser dito. Ficar abaixo do corte e o
  // proposito do corte, e abandonar e decisao ja tomada — mas bloqueado e
  // pendencia, e o manuscrito saia com o buraco sem uma linha de aviso.
  const bloqueados = todos.filter((x) => x.estado === 'bloqueado' && x.palavras > 0);
  const abaixoDoCorte = todos.filter((x) => {
    const i = ordem.indexOf(x.estado);
    return i >= 0 && i < corte;
  });

  const partes = [`# ${cfg.titulo}\n`];
  if (cfg.autor && cfg.autor !== 'a definir') partes.push(`_${cfg.autor}_\n`);
  for (const cap of caps) {
    partes.push(`\n\n## ${String(cap.numero).padStart(2, '0')} — ${cap.fm.titulo || ''}\n`);
    const prosa = cap.cenas.length
      ? cap.cenas.map((s) => s.prosa).filter(Boolean).join('\n\n* * *\n\n')
      : prosaDe(cap.corpo).trim();
    partes.push(prosa || `> _[capitulo ainda sem prosa — ${cap.cenas.length} cenas planejadas]_`);
  }
  // Um arquivo por corte. O corte padrao fica com o nome limpo, e e o que as
  // ferramentas de exportacao leem; os outros ganham sufixo para nunca
  // sobrescrever o manuscrito de trabalho com uma versao parcial.
  const texto = partes.join('\n');
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
  console.log(c.dim('  DOCX/EPUB e com o agente book-hermes'));
}
