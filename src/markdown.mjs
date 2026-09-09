/**
 * O markdown que a prosa usa, lido como estrutura — nao como texto.
 *
 * Existe porque o `docx` mandava o bloco inteiro para um `TextRun` so, com
 * `bloco.replace(/\n/g, ' ')`, e o que o autor escreveu como marcacao chegava
 * ao papel como marcador. O arquivo que foi para um revisor tecnico externo,
 * `Os Oito Modelos da Reforma Tributaria — revisao 2.docx`, saiu com 952
 * asteriscos de negrito a vista, 106 de italico, 26 crases e o `>` de citacao
 * no meio de frase — e com zero `<w:b/>`. Ver ADR-2026-09-08.
 *
 * Nao conhece OOXML e nao importa `docx`: devolve dado, e quem desenha e o
 * `docx.mjs`. Por isso da para testar sem a dependencia opcional instalada.
 *
 * O escopo e o markdown que as obras usam, medido e nao imaginado — negrito,
 * italico, codigo, citacao, lista, lista numerada, tabela, titulo, bloco de
 * codigo cercado e separador de cena. Link, imagem, riscado, nota de rodape,
 * HTML embutido e lista aninhada seguem saindo como texto, que e o que ja
 * acontece hoje com tudo.
 */

/** `* * *`, `***`, `---` ou `___` sozinhos na linha: separador de cena. */
const SEPARADOR = /^\s*(?:(?:\*\s*){3,}|-{3,}|_{3,})\s*$/;
const CERCA = /^\s*(?:```|~~~)/;
const TITULO = /^\s*(#{1,6})\s+(.*)$/;
const CITACAO = /^\s*>/;
const TABELA = /^\s*\|/;
const ITEM = /^\s*[-+*]\s+/;
const NUMERO = /^\s*(\d{1,3})[.)]\s+/;
/** Linha de alinhamento de tabela: `|---|:--:|`. Nao e conteudo. */
const REGUA = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/**
 * Parte uma linha ja limpa em trechos com estilo.
 *
 * A regra de flanqueamento — marcador de abertura nao pode ser seguido de
 * espaco, o de fechamento nao pode ser precedido de espaco — e o que impede
 * `3 * 4 = 12` de virar italico e o que deixa o separador de cena passar
 * intacto se algum dia ele chegar aqui. Marcador desemparelhado fica como
 * texto: apagar o que nao se sabe formatar seria comer caractere do autor.
 *
 * Reentrante para `**negrito com *italico* dentro**`. Dentro de crase nao ha
 * enfase — codigo e literal.
 */
export function trechos(texto, estilo = {}) {
  const linha = String(texto ?? '');
  const saida = [];
  let buf = '';
  const soltar = () => {
    if (!buf) return;
    saida.push({ texto: buf, negrito: !!estilo.negrito, italico: !!estilo.italico, codigo: false });
    buf = '';
  };

  let i = 0;
  while (i < linha.length) {
    const resto = linha.slice(i);

    const cod = /^`([^`\n]+)`/.exec(resto);
    if (cod) {
      soltar();
      saida.push({ texto: cod[1], negrito: !!estilo.negrito, italico: !!estilo.italico, codigo: true });
      i += cod[0].length;
      continue;
    }

    if (!estilo.negrito) {
      const neg = /^\*\*(?=\S)([\s\S]*?)(?<=\S)\*\*/.exec(resto);
      if (neg) {
        soltar();
        saida.push(...trechos(neg[1], { ...estilo, negrito: true }));
        i += neg[0].length;
        continue;
      }
    }

    if (!estilo.italico) {
      const ita = /^\*(?=[^\s*])([^*\n]*?)(?<=\S)\*(?!\*)/.exec(resto);
      if (ita) {
        soltar();
        saida.push(...trechos(ita[1], { ...estilo, italico: true }));
        i += ita[0].length;
        continue;
      }
    }

    buf += linha[i];
    i++;
  }
  soltar();
  return saida;
}

/** Celulas de uma linha de tabela, sem os tubos das pontas. */
const celulas = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/**
 * Parte o texto em blocos tipados.
 *
 * A varredura e por linha, e nao por `split(/\n{2,}/)`: bloco de codigo
 * cercado tem linha em branco dentro, e o corte por linha em branco o parte no
 * meio — foi assim que o diagrama ASCII do capitulo 8 saiu em tres pedacos com
 * as cercas a vista.
 *
 * O tipo e decidido pela PRIMEIRA linha do bloco, nunca por uma linha de
 * continuacao. Num livro sobre reforma tributaria, uma linha de hard-wrap
 * comeca com "2033. O sistema..." com alguma frequencia, e ler isso como item
 * de lista numerada partiria o paragrafo no meio.
 */
export function blocos(texto) {
  const linhas = String(texto ?? '').replace(/\r\n/g, '\n').split('\n');
  const saida = [];
  let i = 0;

  while (i < linhas.length) {
    if (!linhas[i].trim()) { i++; continue; }

    // Cerca de codigo: consome ate a cerca de fechamento, linha em branco
    // inclusive. Sem fechamento, vai ate o fim do texto — que e o que o autor
    // ve no proprio editor.
    if (CERCA.test(linhas[i])) {
      const lingua = linhas[i].trim().replace(/^(?:```|~~~)/, '').trim();
      const corpo = [];
      i++;
      while (i < linhas.length && !CERCA.test(linhas[i])) { corpo.push(linhas[i]); i++; }
      i++;
      while (corpo.length && !corpo[corpo.length - 1].trim()) corpo.pop();
      saida.push({ tipo: 'codigo', lingua, linhas: corpo });
      continue;
    }

    // Daqui para baixo o bloco vai ate a proxima linha em branco.
    const grupo = [];
    while (i < linhas.length && linhas[i].trim() && !CERCA.test(linhas[i])) { grupo.push(linhas[i]); i++; }

    const primeira = grupo[0];

    if (grupo.length === 1 && SEPARADOR.test(primeira)) { saida.push({ tipo: 'separador' }); continue; }

    const tit = TITULO.exec(primeira);
    if (tit) {
      saida.push({ tipo: 'titulo', nivel: tit[1].length, texto: tit[2].trim() });
      // Titulo e de uma linha so; o resto do grupo e paragrafo.
      const resto = grupo.slice(1);
      if (resto.length) saida.push({ tipo: 'paragrafo', texto: resto.join(' ').replace(/\s+/g, ' ').trim() });
      continue;
    }

    // O marcador de citacao sai de TODAS as linhas, e so entao elas se juntam.
    // Na ordem inversa — juntar primeiro — o `>` das linhas de continuacao vai
    // parar no meio da frase, que e o que o revisor apagou a mao.
    if (CITACAO.test(primeira)) {
      const interno = grupo.map((l) => l.replace(/^\s*>\s?/, '')).join('\n');
      saida.push({ tipo: 'citacao', blocos: blocos(interno) });
      continue;
    }

    if (TABELA.test(primeira)) {
      const linhasTab = grupo.filter((l) => !REGUA.test(l)).map(celulas);
      const temRegua = grupo.some((l) => REGUA.test(l));
      saida.push({
        tipo: 'tabela',
        cabecalho: temRegua && linhasTab.length ? linhasTab[0] : null,
        linhas: temRegua ? linhasTab.slice(1) : linhasTab,
      });
      continue;
    }

    if (ITEM.test(primeira) || NUMERO.test(primeira)) {
      const numerada = !ITEM.test(primeira);
      const marcador = numerada ? NUMERO : ITEM;
      const itens = [];
      for (const l of grupo) {
        const abre = marcador.exec(l);
        // Linha sem marcador e continuacao do item anterior: nas duas obras a
        // lista vem com hard-wrap e recuo de dois espacos.
        if (!abre && itens.length) { itens[itens.length - 1].texto += ` ${l.trim()}`; continue; }
        itens.push({
          marca: numerada ? `${abre[1]}.` : '•',
          texto: l.replace(marcador, '').trim(),
        });
      }
      saida.push({ tipo: numerada ? 'numerada' : 'lista', itens });
      continue;
    }

    saida.push({ tipo: 'paragrafo', texto: grupo.join(' ').replace(/\s+/g, ' ').trim() });
  }

  return saida;
}
