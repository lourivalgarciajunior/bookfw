/**
 * O briefing de uma cena — o pacote minimo e suficiente que o escritor recebe
 * para escrever 800-1500 palavras sem reler o livro inteiro. E o que resolve
 * "nao consigo escrever texto grande": ninguem escreve um livro, escreve-se
 * uma cena com contrato declarado e contexto fechado.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharProjeto, artefatos, canon, capitulos, lerConfig, palavras, prosaDe, rel } from './core.mjs';

export function brief(args) {
  const raiz = acharProjeto();
  const alvoId = args._[0];
  if (!alvoId) throw new Erro('Uso: bookfw brief <capitulo> [--cena N]');
  const caps = capitulos(raiz);
  const cap = caps.find((x) => x.arquivo === alvoId || x.arquivo === `${alvoId}.md` || String(x.numero) === String(alvoId) || x.fm.id === alvoId);
  if (!cap) throw new Erro(`Capitulo "${alvoId}" nao encontrado.`);

  // brief e leitura, entao nao recusa — mas pedir briefing de capitulo fechado
  // costuma ser alvo errado, e o aviso sai antes de alguem escrever por cima.
  if (cap.estado === 'pronto') {
    console.error(`[aviso] ${cap.arquivo} esta em pronto — este capitulo ja foi fechado.\n`);
  }

  const cfg = lerConfig(raiz);
  const cn = canon(raiz);
  const idx = args.cena ? cap.cenas.findIndex((s, i) => String(s.id) === String(args.cena) || i + 1 === Number(args.cena)) : cap.cenas.findIndex((s) => !s.prosa);
  const cena = idx >= 0 ? cap.cenas[idx] : cap.cenas[0];
  if (!cena) throw new Erro(`Capitulo ${cap.arquivo} nao tem contrato de cena. Escreva o bloco cena antes de pedir briefing.`);

  const elenco = [].concat(cena.personagens || []).map((n) => String(n).toLowerCase());
  const fichas = cn.personagens.filter((p) => elenco.includes(p.nome.toLowerCase()) || p.apelidos.some((a) => elenco.includes(a.toLowerCase())));
  const lugar = cn.lugares.find((l) => String(cena.local || '').toLowerCase() === l.nome.toLowerCase());

  // cauda: as ultimas palavras ja escritas, para o tom emendar
  let cauda = '';
  const anteriores = [
    ...cap.cenas.slice(0, Math.max(0, idx)).map((s) => s.prosa),
    ...caps.filter((x) => x.numero < cap.numero).sort((a, b) => a.numero - b.numero).map((x) => prosaDe(x.corpo)),
  ].filter(Boolean);
  if (idx > 0 && cap.cenas[idx - 1].prosa) cauda = cap.cenas[idx - 1].prosa;
  else {
    const antes = caps.filter((x) => x.numero < cap.numero && palavras(prosaDe(x.corpo)) > 50).pop();
    if (antes) cauda = prosaDe(antes.corpo).trim();
  }
  cauda = cauda.split(/\s+/).slice(-250).join(' ');

  const sc = join(raiz, 'docs/style-card.md');
  const styleCard = existsSync(sc) ? readFileSync(sc, 'utf8').trim() : '(sem style card — rode `bookfw style`)';
  const decs = artefatos(raiz, 'dec').map((d) => d.corpo.trim()).join('\n\n');

  const alvoPal = cena.palavras_alvo || Math.round(Number(cap.fm.palavras_alvo || 2500) / Math.max(1, cap.cenas.length));

  console.log(`# BRIEFING DE CENA — ${cfg.titulo}
Arquivo: ${rel(raiz, cap.caminho)}
Capitulo ${cap.numero} — ${cap.fm.titulo || ''} (ato ${cap.fm.ato || '?'})
Cena ${cena.id || idx + 1} de ${cap.cenas.length} | alvo ${alvoPal} palavras

## Contrato invariavel da obra
narracao em ${cfg.pessoa_narrativa} pessoa | tempo verbal ${cfg.tempo_verbal} | genero ${cfg.genero}
${decs ? `\n### Decisoes de obra\n${decs}` : ''}

## Style card (escreva NESTA voz)
${styleCard}

## Contrato desta cena
local:      ${cena.local || '-'}
tempo:      ${cena.tempo || '-'}
foco:       ${cena.foco || cap.fm.foco || '-'}
personagens:${[].concat(cena.personagens || []).join(', ') || ' -'}
objetivo:   ${cena.objetivo || '-'}
conflito:   ${cena.conflito || '-'}
virada:     ${cena.virada || '-'}
saida:      ${cena.saida || '-'}
promessas:  ${[].concat(cena.promessas || []).join(', ') || '-'}
paga:       ${[].concat(cena.paga || []).join(', ') || '-'}

## Fichas do canon em cena
${fichas.map((p) => `### ${p.nome}\n${p.corpo.trim()}`).join('\n\n') || '(nenhuma ficha — o canon esta vazio para este elenco)'}
${lugar ? `\n### Lugar — ${lugar.nome}\n${lugar.corpo.trim()}` : ''}

## Onde o texto parou (cauda do que ja foi escrito)
${cauda || '(inicio da obra)'}

## Instrucoes
- Escreva apenas ESTA cena, ~${alvoPal} palavras, prosa continua.
- Comece no meio da acao; nao resuma o que ja aconteceu.
- A cena tem de cumprir objetivo, conflito e virada. Se nao couber, pare e diga.
- Nao invente fato de canon: se faltar dado, escreva e liste a pendencia ao final.
- Nao mude o foco, a pessoa narrativa nem o tempo verbal.
- Termine na saida declarada — nao feche o capitulo se ele continua.`);

  if (anteriores.length === 0 && cap.numero > 1) {
    console.error('\n[aviso] nenhum capitulo anterior escrito — a cauda esta vazia.');
  }
}
