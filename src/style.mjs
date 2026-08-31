/**
 * Metrica objetiva da voz do autor, medida sobre samples/. O que e contavel
 * sai daqui; o que e julgamento (o que o autor nunca faz, o que ele repete de
 * proposito) fica para o agente book-euterpe escrever no mesmo arquivo.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharProjeto, c, escrever, frontmatter, hoje, palavras, rel } from './core.mjs';

/**
 * Palavra funcional de portugues: artigo, preposicao, contracao, pronome,
 * conjuncao e as formas dos auxiliares que a prosa usa o tempo todo. Nao entra
 * em nenhuma das duas listas.
 *
 * Frequencia bruta em portugues devolve palavra funcional POR CONSTRUCAO — a
 * linha antiga de "palavras marcantes" saia com dez funcionais em doze. Ver
 * ADR-2026-08-31 sobre lexico do style card.
 */
const FUNCIONAIS = new Set((`
a o as os um uma uns umas
de do da dos das dum duma em no na nos nas num numa nuns numas
por pelo pela pelos pelas para pra com sem sob sobre ante apos ate entre contra desde perante tras
que quem qual quais cujo cuja cujos cujas onde quando como porque pois se senao mas ou nem e
eu tu ele ela nos vos eles elas voce voces me te lhe lhes mim ti si comigo contigo consigo conosco convosco
meu minha meus minhas teu tua teus tuas seu sua seus suas nosso nossa nossos nossas vosso vossa vossos vossas
dele dela deles delas nele nela neles nelas
este esta estes estas esse essa esses essas aquele aquela aqueles aquelas isto isso aquilo
neste nesta nestes nestas nesse nessa nesses nessas naquele naquela naquilo
disto disso daquilo deste desta desse dessa daquele daquela
sou es somos sao era eras eramos eram fui foi fomos foram sera serao seria seriam
seja sejam fosse fossem for forem sendo sido
estou estamos estao estava estavas estavam estive esteve estivemos estiveram
estara estarao estaria esteja estejam estivesse estivessem estando estado
tenho tem temos tinha tinhas tinham tive teve tivemos tiveram tera terao teria
tenha tenham tivesse tivessem tendo tido
hei ha havemos hao havia haviam houve houveram havera haveria haja houvesse havendo havido
vou vai vamos vao iam ira irao iria indo ido
posso pode podemos podem podia podiam pude poderia poderiam possa possam podendo
faco faz fazemos fazem fazia faziam fez fizeram fara faria faca facam fizesse fazendo feito
tudo todo toda todos todas algo alguem ninguem nada cada outro outra outros outras
mesmo mesma mesmos mesmas proprio propria proprios proprias tal tais
pouco pouca poucos poucas mais menos algum alguma alguns algumas nenhum nenhuma
qualquer quaisquer aqui ali agora hoje ontem amanha antes depois tambem sim nao bem mal
`).trim().split(/\s+/));

/**
 * Marcador de voz. Sair do lexico de conteudo nao e ser descartado: `apenas`,
 * `talvez` e `ainda` sao a hesitacao caracteristica do autor, e um agente que
 * escreve na voz dele precisa da TAXA, nao da posicao num ranking.
 */
const TIQUES = new Set((`
apenas so somente talvez quase ainda sempre nunca jamais
muito muita muitos muitas bastante tao demais
apesar embora porem contudo todavia entretanto alias enfim afinal
entao assim portanto logo inclusive sequer meramente tampouco sobretudo
`).trim().split(/\s+/));

/**
 * Adverbio em `-mente` exige quatro caracteres antes do sufixo. Sem isso o
 * substantivo `mente` — que na `metamorfose` e palavra da obra — era contado
 * como tique de voz.
 */
const ADVERBIO_MENTE = /.{4,}mente$/;

/** Abaixo disto a metrica sai, mas com ressalva: 92 palavras nao medem voz. */
const AMOSTRA_MINIMA = 1000;

const semAcento = (w) => w.normalize('NFD').replace(/\p{Diacritic}/gu, '');

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
${m.amostraCurta ? `
> **Amostra curta.** ${m.palavras} palavras esta abaixo de ${AMOSTRA_MINIMA}, e
> abaixo disso a metrica descreve estas paginas, nao a sua voz. Trate como
> indicio e acrescente texto em \`samples/\`.
` : ''}
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

Lexico da obra: ${m.conteudo.map((x) => x.palavra).join(', ') || '(amostra sem lexico recorrente)'}.

Tiques de voz: ${m.tiques.map((x) => `${x.palavra} ${x.mil}`).join(', ') || '(nenhum)'} — por mil palavras.

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
  console.log(c.dim(`  lexico: ${m.conteudo.slice(0, 6).map((x) => x.palavra).join(', ') || '(vazio)'}`));
  if (m.amostraCurta) {
    console.log(`  ${c.yellow('amostra curta')} ${m.palavras} palavras, abaixo de ${AMOSTRA_MINIMA} — a metrica descreve estas paginas, nao a sua voz`);
  }
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

  const { conteudo, tiques } = lexico(t, total);

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
    conteudo,
    tiques,
    amostraCurta: total < AMOSTRA_MINIMA,
  };
}

/**
 * Duas listas de naturezas diferentes: o que a obra fala (conteudo) e como o
 * autor hesita (tique). Uma linha so, ordenada por frequencia, misturava as
 * duas e perdia as duas.
 */
function lexico(t, total) {
  const conteudo = new Map();
  const tiques = new Map();
  for (const w of (t.toLowerCase().match(/[\p{L}]{2,}/gu) || [])) {
    const chave = semAcento(w);
    if (FUNCIONAIS.has(chave)) continue;
    if (TIQUES.has(chave) || ADVERBIO_MENTE.test(w)) { tiques.set(w, (tiques.get(w) || 0) + 1); continue; }
    if (w.length < 4) continue;
    conteudo.set(w, (conteudo.get(w) || 0) + 1);
  }

  // Plural e singular sao a mesma palavra, e so se funde quando as DUAS formas
  // ja aparecem no texto — assim "mes" nunca vira "me". Genero nao se dobra:
  // "silenciosa" contra "silencioso" pode ser escolha, e fundir apaga a escolha.
  const singular = (w) => w.replace(/(oes|aes|ais|eis|ns|s)$/,
    (m) => ({ oes: 'ao', aes: 'ao', ais: 'al', eis: 'el', ns: 'm' }[m] ?? ''));
  for (const [w, n] of [...conteudo]) {
    const s = singular(w);
    if (s === w || s.length < 4 || !conteudo.has(s)) continue;
    const m = conteudo.get(s);
    conteudo.delete(w);
    conteudo.delete(s);
    conteudo.set(n >= m ? w : s, n + m);
  }

  const porFrequencia = (mapa, quantos) => [...mapa.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, quantos);
  return {
    conteudo: porFrequencia(conteudo, 16).map(([palavra, n]) => ({ palavra, n })),
    tiques: porFrequencia(tiques, 10)
      .map(([palavra, n]) => ({ palavra, n, mil: Math.round((n / (total || 1)) * 1000 * 10) / 10 })),
  };
}
