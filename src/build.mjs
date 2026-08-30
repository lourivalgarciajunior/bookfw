/**
 * Costura o manuscrito. Le o kanban em ordem de capitulo e concatena so a
 * prosa — contrato de cena e comentario nao entram no livro.
 */
import { join } from 'node:path';
import { ESTADOS_ATIVOS, Erro, acharProjeto, c, capitulos, escrever, hoje, lerConfig, palavras, prosaDe, rel } from './core.mjs';

export function build(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const minimo = args.desde || 'esboco';
  const ordem = ESTADOS_ATIVOS;
  const corte = ordem.indexOf(minimo);
  if (corte < 0) throw new Erro(`--desde deve ser um de ${ordem.join(', ')}`);

  const caps = capitulos(raiz).filter((x) => ordem.indexOf(x.estado) >= corte);
  if (!caps.length) throw new Erro(`Nenhum capitulo em ${minimo} ou adiante.`);

  const partes = [`# ${cfg.titulo}\n`];
  if (cfg.autor && cfg.autor !== 'a definir') partes.push(`_${cfg.autor}_\n`);
  for (const cap of caps) {
    partes.push(`\n\n## ${String(cap.numero).padStart(2, '0')} — ${cap.fm.titulo || ''}\n`);
    const prosa = cap.cenas.length
      ? cap.cenas.map((s) => s.prosa).filter(Boolean).join('\n\n* * *\n\n')
      : prosaDe(cap.corpo).trim();
    partes.push(prosa || `> _[capitulo ainda sem prosa — ${cap.cenas.length} cenas planejadas]_`);
  }
  const texto = partes.join('\n');
  const alvo = join(raiz, 'manuscrito', `${cfg.slug || 'manuscrito'}.md`);
  escrever(alvo, texto);

  const total = palavras(texto);
  console.log(`${c.green('manuscrito gerado')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  ${caps.length} capitulos | ${total} palavras | ~${Math.ceil(total / 250)} paginas | gerado em ${hoje()}`));
  const alvoPal = Number(cfg.palavras_alvo || 0);
  if (alvoPal) console.log(c.dim(`  ${Math.round((total / alvoPal) * 100)}% do alvo de ${alvoPal}`));
  console.log(c.dim('  DOCX/EPUB e com o agente book-hermes'));
}
