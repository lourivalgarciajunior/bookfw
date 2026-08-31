import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESTADOS_ATIVOS, acharProjeto, artefatos, c, canon, capitulos, lerConfig, planoDiretor, promessas, rel, sumario } from './core.mjs';

export function status() {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const caps = capitulos(raiz);
  const cn = canon(raiz);
  const total = caps.reduce((a, x) => a + x.palavras, 0);
  const alvo = Number(cfg.palavras_alvo || 0);

  console.log(c.b(`${cfg.titulo || 'sem titulo'}`) + c.dim(`  ${cfg.genero || ''}`));
  console.log(c.dim(`PD ${artefatos(raiz, 'plano-diretor').length ? 'sim' : 'NAO'} | SUM ${artefatos(raiz, 'sumario').length ? 'sim' : 'NAO'} | DEC ${artefatos(raiz, 'dec').length} | personagens no canon ${cn.personagens.length}`));
  console.log('');

  for (const estado of ESTADOS_ATIVOS) {
    const doEstado = caps.filter((x) => x.estado === estado);
    const cor = estado === 'escrita' ? c.cyan : estado === 'pronto' ? c.green : c.dim;
    console.log(cor(`${estado.padEnd(9)}`) + ` ${doEstado.length}`);
    for (const cap of doEstado) {
      console.log(`  ${String(cap.numero).padStart(2, '0')} ${(cap.fm.titulo || cap.arquivo).padEnd(40)} ${String(cap.cenas.length).padStart(2)} cenas  ${String(cap.palavras).padStart(5)} pal`);
    }
  }

  const bloq = caps.filter((x) => x.estado === 'bloqueado');
  if (bloq.length) {
    console.log(c.yellow(`\nbloqueado ${bloq.length}`));
    for (const cap of bloq) console.log(`  ${cap.arquivo} — ${cap.fm.motivo || 'sem motivo declarado'}`);
  }

  const proms = promessas(raiz);
  if (proms.length) {
    const pagas = new Set(caps.flatMap((x) => x.cenas).flatMap((s) => [].concat(s.paga || [])));
    console.log(`\npromessas pagas ${pagas.size}/${proms.length}`);
    for (const p of proms) console.log(`  ${pagas.has(p.id) ? c.green('x') : ' '} ${p.id} ${p.texto}`);
  }

  console.log(`\n${c.b(String(total))} palavras${alvo ? ` de ${alvo} (${Math.round((total / alvo) * 100)}%)` : ''}`);
}

/**
 * Dump da governanca formatado para LLM. E o que um agente le ao retomar um
 * livro sem contexto nenhum.
 */
export function context() {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const caps = capitulos(raiz);
  const cn = canon(raiz);
  const out = [];
  out.push(`# Contexto da obra — ${cfg.titulo}`);
  out.push(`Genero ${cfg.genero} | narracao em ${cfg.pessoa_narrativa} pessoa | tempo verbal ${cfg.tempo_verbal} | alvo ${cfg.palavras_alvo} palavras`);

  const pd = planoDiretor(raiz);
  if (pd) out.push(`\n## Plano diretor (${pd.arquivo})\n${pd.corpo.trim()}`);

  for (const d of artefatos(raiz, 'dec')) out.push(`\n## ${d.arquivo}\n${d.corpo.trim()}`);

  // O sumario e o que diz o que vem a seguir, e ficava de fora do dump que
  // existe justamente para um agente retomar a obra sem contexto nenhum.
  const sumArq = sumario(raiz);
  if (sumArq) out.push(`\n## Sumario (${sumArq.arquivo})\n${sumArq.corpo.trim()}`);

  const sc = join(raiz, 'docs/style-card.md');
  if (existsSync(sc)) out.push(`\n## Style card\n${readFileSync(sc, 'utf8').trim()}`);

  // Cronologia e regras sao canon tanto quanto as fichas: o init as cria e nada
  // as lia, entao a contradicao de tempo e de mundo nunca chegava a quem escreve.
  for (const [titulo, arq] of [['Cronologia', 'cronologia.md'], ['Regras do mundo', 'regras.md']]) {
    const caminho = join(raiz, 'docs/canon', arq);
    if (existsSync(caminho)) out.push(`\n## ${titulo}\n${readFileSync(caminho, 'utf8').trim()}`);
  }

  out.push(`\n## Canon — personagens`);
  for (const p of cn.personagens) out.push(`- ${p.nome}${p.apelidos.length ? ` (${p.apelidos.join(', ')})` : ''}: ${(p.fm.resumo || '').slice(0, 200)}`);
  out.push(`\n## Canon — lugares`);
  for (const l of cn.lugares) out.push(`- ${l.nome}: ${(l.fm.resumo || '').slice(0, 200)}`);

  // Razao de promessas plantadas e pagas: e o estado de governanca mais caro de
  // reconstruir lendo os capitulos, e o mais barato de imprimir aqui.
  const proms = promessas(raiz);
  if (proms.length) {
    const cenas = caps.flatMap((x) => x.cenas);
    const plantadas = new Set(cenas.flatMap((s) => [].concat(s.promessas || [])));
    const pagas = new Set(cenas.flatMap((s) => [].concat(s.paga || [])));
    out.push(`\n## Promessas`);
    for (const p of proms) {
      const estado = pagas.has(p.id) ? 'paga' : plantadas.has(p.id) ? 'plantada, nao paga' : 'nao plantada';
      out.push(`- ${p.id} [${estado}] ${p.texto}`);
    }
  }

  out.push(`\n## Kanban`);
  for (const cap of caps) {
    out.push(`- [${cap.estado}] ${String(cap.numero).padStart(2, '0')} ${cap.fm.titulo || cap.arquivo} — ${cap.cenas.length} cenas, ${cap.palavras} palavras`);
  }
  out.push(`\nArquivos: ${caps.map((x) => rel(raiz, x.caminho)).join(', ') || '(nenhum)'}`);
  console.log(out.join('\n'));
}
