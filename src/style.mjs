/**
 * Metrica objetiva da voz do autor, medida sobre samples/. O que e contavel
 * sai daqui; o que e julgamento (o que o autor nunca faz, o que ele repete de
 * proposito) fica para o agente book-euterpe escrever no mesmo arquivo.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharProjeto, c, escrever, frontmatter, hoje, palavras, rel } from './core.mjs';

const VAZIAS = new Set(('de a o que e do da em um para com nao uma os no se na por mais as dos como mas ao ele das tem seu sua ou ser quando muito ha nos ja esta eu tambem so pelo pela ate isso ela entre era depois sem mesmo aos seus quem nas me esse eles voce essa num nem suas meu as minha numa pelos elas qual lhe deles essas esses pelas este dele tu te voces vos lhes meus minhas teu tua teus tuas nosso nossa nossos nossas dela').split(' '));

export function style(args) {
  const raiz = acharProjeto();
  const dir = join(raiz, 'samples');
  if (!existsSync(dir)) throw new Erro('Sem diretorio samples/.');
  const arquivos = readdirSync(dir).filter((f) => /\.(md|txt)$/i.test(f) && f !== 'LEIAME.md');
  if (!arquivos.length) throw new Erro('samples/ vazio. Coloque textos seus (.md ou .txt) e rode de novo.');

  const textos = arquivos.map((f) => {
    const raw = readFileSync(join(dir, f), 'utf8');
    return { arquivo: f, texto: frontmatter(raw).corpo.replace(/^#{1,6} .*$/gm, '').trim() };
  });
  const m = medir(textos.map((t) => t.texto).join('\n\n'));

  const bloco = `<!-- bookfw:metrica:inicio — gerado por \`bookfw style\` em ${hoje()} -->
## Metrica medida

Fonte: ${arquivos.length === 1 ? '1 amostra' : `${arquivos.length} amostras`} em \`samples/\` (${m.palavras} palavras).

| Medida | Valor | Como usar |
|---|---|---|
| Frase mediana | ${m.fraseMediana} palavras | alvo da frase padrao |
| Frase media | ${m.fraseMedia} palavras | — |
| Frases curtas (ate 6 palavras) | ${m.pctCurtas}% | ritmo de martelo; mantenha a proporcao |
| Frases longas (acima de 30) | ${m.pctLongas}% | respiro longo; nao ultrapasse |
| Desvio do tamanho de frase | ${m.desvio} | variacao alta = prosa com batida |
| Paragrafo mediano | ${m.paragrafoMediano} palavras | — |
| Paragrafos de uma frase so | ${m.pctParagrafoUnico}% | assinatura de enfase |
| Linhas de dialogo | ${m.pctDialogo}% dos paragrafos | proporcao dialogo/narracao |
| Perguntas | ${m.perguntas} por mil palavras | — |
| Primeira pessoa | ${m.primeiraPessoa} por mil palavras | — |

Palavras marcantes: ${m.marcantes.join(', ')}.

<!-- bookfw:metrica:fim -->`;

  const alvo = join(raiz, 'docs/style-card.md');
  const atual = existsSync(alvo) ? readFileSync(alvo, 'utf8') : `# Style card\n\n`;
  const novo = /<!-- bookfw:metrica:inicio/.test(atual)
    ? atual.replace(/<!-- bookfw:metrica:inicio[\s\S]*?<!-- bookfw:metrica:fim -->/, bloco)
    : `${atual.trimEnd()}\n\n${bloco}\n`;
  escrever(alvo, novo);

  if (args.json) { console.log(JSON.stringify(m, null, 2)); return; }
  console.log(`${c.green('style card atualizado')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  frase mediana ${m.fraseMediana} | paragrafo ${m.paragrafoMediano} | dialogo ${m.pctDialogo}% | ${m.palavras} palavras medidas`));
  console.log(c.dim('  a parte qualitativa e do agente book-euterpe — rode /bookfw:style'));
}

function medir(texto) {
  const t = texto.replace(/\r\n/g, '\n');
  const paras = t.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 1);
  const frases = t.split(/(?<=[.!?…])[\s\n]+|\n+/).map((s) => s.trim()).filter((s) => palavras(s) > 0);
  const tam = frases.map(palavras).sort((a, b) => a - b);
  const media = tam.reduce((a, b) => a + b, 0) / (tam.length || 1);
  const tamParas = paras.map(palavras).sort((a, b) => a - b);
  const total = palavras(t);
  const dialogo = paras.filter((p) => /^[—–-]\s|^["“]/.test(p)).length;
  const unicos = paras.filter((p) => p.split(/(?<=[.!?…])\s+/).filter((s) => s.trim()).length === 1).length;

  const freq = new Map();
  for (const w of (t.toLowerCase().match(/[\p{L}]{4,}/gu) || [])) {
    if (VAZIAS.has(w.normalize('NFD').replace(/\p{Diacritic}/gu, ''))) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const marcantes = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);

  const pct = (n, d) => Math.round((n / (d || 1)) * 100);
  const mil = (n) => Math.round((n / (total || 1)) * 1000);
  return {
    palavras: total,
    fraseMedia: media.toFixed(1),
    fraseMediana: tam[Math.floor(tam.length / 2)] || 0,
    desvio: Math.sqrt(tam.reduce((a, b) => a + (b - media) ** 2, 0) / (tam.length || 1)).toFixed(1),
    pctCurtas: pct(tam.filter((x) => x <= 6).length, tam.length),
    pctLongas: pct(tam.filter((x) => x > 30).length, tam.length),
    paragrafoMediano: tamParas[Math.floor(tamParas.length / 2)] || 0,
    pctParagrafoUnico: pct(unicos, paras.length),
    pctDialogo: pct(dialogo, paras.length),
    perguntas: mil((t.match(/\?/g) || []).length),
    primeiraPessoa: mil((t.match(/\b(eu|meu|minha|meus|minhas|mim|comigo)\b/gi) || []).length),
    marcantes,
  };
}
