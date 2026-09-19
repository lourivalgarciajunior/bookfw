/**
 * Versao de leitura do manuscrito, em DOCX. Miolo A5, serifado, sem marcacao
 * de trabalho: e o arquivo que vai para a mao de quem le, nao para a bancada.
 *
 * Nasceu como `tools/gerar-docx.mjs` dentro de um projeto de livro e foi
 * copiado para os quatro. Nada nele era de uma obra so — titulo, autor e
 * genero sempre sairam do `livro.yaml`, e as paginas de abertura de
 * `docs/front-matter.md`. As copias divergiram, e correcao passou a nascer com
 * tres livros para tras. Ver ADR-2026-08-31.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { Erro, acharProjeto, c, canon, lerConfig, partes, rel } from './core.mjs';
import { modoDeReferencia, trechosDeReferencia } from './biblia.mjs';
import { acharTermos, campoXE, fichasDoIndice, limparCampo, termosDaCena } from './indice.mjs';
import { carimbo, revisaoAtual } from './revisao.mjs';
import { CORTE_PADRAO, prosaFinal, selecao } from './build.mjs';
import { blocos, trechos } from './markdown.mjs';

const A5 = { width: 8391, height: 11906 };
const MARGENS = { top: 1080, bottom: 1080, left: 1080, right: 1080 };
const SERIF = 'Georgia';
const MONO = 'Consolas';

const ESPECIME = 'ESPECIME DE FORMA — inventado inteiro, para ser substituido';
const RESSALVA_PADRAO = 'Fatos ainda nao verificados pelo autor';

/**
 * O `yamlRaso` devolve string quando a chave tem valor na propria linha e
 * array quando ela abre lista em bloco. As duas formas dizem a mesma coisa.
 * O gerador copiado so entendia a primeira — sua regex exigia valor na linha —
 * entao capitulo com `verificar:` em lista saia do papel sem carimbo nenhum,
 * com a mesma cara de capitulo conferido.
 */
const texto = (v) => (Array.isArray(v) ? v.join('; ') : String(v ?? '')).trim();

/**
 * O carimbo de ressalva do capitulo, ou `null` se ele nao pede nenhum.
 *
 * Duas obras marcam a mesma duvida com palavras diferentes: uma diz
 * `origem: ESPECIME DE FORMA`, outra so preenche `verificar:`. As duas querem
 * dizer "este capitulo nao esta confirmado", e no papel isso precisa aparecer.
 * O texto do segundo caso sai do `livro.yaml` porque memoria e livro tecnico
 * nao ressalvam com as mesmas palavras: "fatos ainda nao verificados pelo
 * autor" nao serve para nao-ficcao com fonte primaria.
 */
export function ressalva(fm = {}, cfg = {}) {
  if (/ESPECIME/i.test(texto(fm.origem))) return ESPECIME;
  if (texto(fm.verificar)) return texto(cfg.ressalva_verificar) || RESSALVA_PADRAO;
  return null;
}

/**
 * `docx` e dependencia opcional: o resto do bookfw nao tem dependencia
 * nenhuma, e quem so governa texto nao precisa carregar um gerador de OOXML
 * para rodar `status` ou `validate`.
 *
 * A segunda tentativa resolve a partir do projeto do livro. Com o CLI linkado
 * ou global, `import('docx')` parte da pasta do bookfw e nao enxerga o
 * `node_modules` da obra — que e onde o pacote ja estava instalado nos quatro
 * livros antes desta mudanca.
 */
async function carregarDocx(raiz) {
  const normalizar = (m) => (m && m.Document ? m : m?.default);
  try {
    const m = normalizar(await import('docx'));
    if (m?.Document) return m;
  } catch { /* tenta o projeto do livro */ }
  try {
    const req = createRequire(pathToFileURL(join(raiz, 'package.json')));
    const m = normalizar(req('docx'));
    if (m?.Document) return m;
  } catch { /* cai na mensagem abaixo */ }
  throw new Erro(
    '`bookfw docx` precisa do pacote `docx`, que e uma dependencia opcional.\n'
    + '       Instale na raiz do projeto do livro:  npm i docx',
  );
}

/** Uma pagina por secao `## ` — o formato do front matter e do apendice. */
function secoes(caminho) {
  if (!existsSync(caminho)) return [];
  return readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n').split(/^## /m).slice(1)
    .map((sec) => {
      const [titulo, ...resto] = sec.split('\n');
      return { titulo: titulo.trim(), texto: resto.join('\n') };
    });
}

export async function docx(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const minimo = args.desde || CORTE_PADRAO;
  const { caps } = selecao(raiz, minimo);

  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Footer, PageNumber, SectionType, LineRuleType,
    Table, TableRow, TableCell, WidthType, BorderStyle,
    TableOfContents, VerticalAlignSection, XmlComponent, XmlAttributeComponent,
  } = await carregarDocx(raiz);

  // Campo do Word na forma que o proprio Word grava: inicio, instrucao, fim.
  // O `SimpleField` da biblioteca sai como `<w:fldSimple/>` vazio, e o Word 16,
  // ao abrir, embaralha a paginacao do livro inteiro: o PDF saiu com o
  // capitulo 18 na pagina 1 e o rosto na 58. Medido em 2026-09-18.
  class AtribFld extends XmlAttributeComponent { xmlKeys = { tipo: 'w:fldCharType', sujo: 'w:dirty' }; }
  class AtribEspaco extends XmlAttributeComponent { xmlKeys = { espaco: 'xml:space' }; }
  class Fld extends XmlComponent {
    constructor(tipo, sujo) { super('w:fldChar'); this.root.push(new AtribFld({ tipo, sujo })); }
  }
  class Instr extends XmlComponent {
    constructor(t) { super('w:instrText'); this.root.push(new AtribEspaco({ espaco: 'preserve' })); this.root.push(t); }
  }
  const corridaDe = (filho) => new TextRun({ children: [filho] });
  /** Campo sem resultado (XE, TC) ou com resultado a calcular (INDEX). */
  const campo = (instr, { resultado = false } = {}) => [
    corridaDe(new Fld('begin', resultado || undefined)),
    corridaDe(new Instr(` ${instr} `)),
    ...(resultado ? [corridaDe(new Fld('separate'))] : []),
    corridaDe(new Fld('end')),
  ];

  // ------------------------------------------------- o que a obra liga
  // Tudo pelo livro.yaml; obra sem nenhuma destas chaves sai como antes.
  const sim = (v) => /^(sim|true|yes)$/i.test(texto(v));
  const modoRef = modoDeReferencia(cfg);
  const refLigada = modoRef === 'romano' || modoRef === 'arabico';
  // Em pontos no livro.yaml; o OOXML conta em meios-pontos.
  const corpoRef = Math.round(Number(cfg.referencia_biblica_corpo || 9) * 2) || 18;
  const comSumario = sim(cfg.sumario);
  const comIndice = texto(cfg.indice).toLowerCase() === 'personagens';
  const fichas = comIndice ? fichasDoIndice(canon(raiz).personagens, cfg.indice_excluir) : new Map();

  // Sumario e indice sao campos do Word: o numero de pagina so existe depois
  // que alguem pagina o texto. O TOC le campos TC, e nao os titulos, para a
  // entrada sair em texto limpo, sem herdar corpo e caixa do divisor.
  const entradaSumario = (t, nivel) => campo(`TC "${limparCampo(t)}" \\f S \\l ${nivel}`);
  let entradas = 0;
  let marcasIndice = 0;

  // ------------------------------------------------- markdown no papel
  // O `markdown.mjs` diz o que o texto e; daqui para baixo e so desenho. A
  // separacao existe para o parser ser testavel sem o pacote `docx`, que e
  // dependencia opcional — antes desta mudanca nao havia parser nenhum e o
  // bloco inteiro ia para um `TextRun` so, com o marcador a vista.

  /**
   * Trechos com estilo viram `TextRun`. Codigo troca de fonte, nao de corpo.
   * A referencia biblica, com a regra ligada, sai em italico e corpo menor.
   * Com `termos`, o nome do canon ganha a marca do indice logo depois dele.
   */
  const runs = (t, base = {}, termos = null) => {
    const fonte = base.font || SERIF;
    const tam = base.size || 21;
    const vistos = new Set();
    const lista = [];
    for (const x of trechos(t)) {
      const pedacos = refLigada && !x.codigo ? trechosDeReferencia(x.texto) : [{ texto: x.texto, referencia: false }];
      for (const p of pedacos) {
        const corrida = (text) => new TextRun({
          text,
          font: x.codigo ? MONO : fonte,
          size: x.codigo ? tam - 2 : (p.referencia ? Math.min(corpoRef, tam) : tam),
          bold: x.negrito || base.negrito || undefined,
          italics: x.italico || base.italico || p.referencia || undefined,
          color: base.color,
        });
        const marcas = termos?.length && !p.referencia && !x.codigo ? acharTermos(p.texto, termos, vistos) : [];
        let i = 0;
        for (const m of marcas) {
          lista.push(corrida(p.texto.slice(i, m.fim)), ...campo(campoXE(m.nome)));
          marcasIndice++;
          i = m.fim;
        }
        if (i < p.texto.length) lista.push(corrida(p.texto.slice(i)));
      }
    }
    // Paragrafo sem nenhum run e paragrafo invalido no OOXML.
    return lista.length ? lista : [new TextRun({ text: '', font: fonte, size: tam })];
  };

  const BORDA = { style: BorderStyle.SINGLE, size: 2, color: 'BBBBBB' };

  /** Um bloco tipado vira um ou mais filhos da secao. */
  function desenhar(bloco, opts, saida) {
    const cit = !!opts.citacao;
    const base = cit ? { font: SERIF, size: 20 } : { font: SERIF, size: 21 };
    const recuo = cit ? { left: 460, right: 400 } : undefined;
    const alinhamento = cit ? AlignmentType.LEFT : (opts.alignment || AlignmentType.JUSTIFIED);

    switch (bloco.tipo) {
      case 'separador':
        saida.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 260, after: 260 },
          children: [new TextRun({ text: '❧', font: SERIF, size: 22, color: '999999' })],
        }));
        break;

      // A citacao se distingue por recuo dos dois lados e corpo menor — nao
      // por um `>` sobrando no meio da frase, que era o que saia quando as
      // linhas eram juntadas antes de o marcador ser removido.
      case 'citacao':
        for (const dentro of bloco.blocos) desenhar(dentro, { ...opts, citacao: true }, saida);
        break;

      case 'titulo':
        saida.push(new Paragraph({
          alignment: AlignmentType.LEFT, spacing: { before: 340, after: 140 },
          children: runs(bloco.texto, { font: SERIF, size: bloco.nivel <= 3 ? 24 : 22, negrito: true }),
        }));
        break;

      case 'lista':
      case 'numerada':
        bloco.itens.forEach((it, i) => saida.push(new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: i ? 0 : 120, after: 100, line: 300, lineRule: LineRuleType.AUTO },
          indent: { left: (recuo?.left || 0) + 460, hanging: 260, right: recuo?.right },
          children: [
            new TextRun({ text: `${it.marca}  `, font: base.font, size: base.size }),
            ...runs(it.texto, base, opts.termos),
          ],
        })));
        break;

      // Diagrama ASCII so e diagrama com as quebras e os espacos onde estao.
      case 'codigo':
        saida.push(new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 220, after: 220, line: 240, lineRule: LineRuleType.AUTO },
          indent: { left: (recuo?.left || 0) + 240 },
          children: bloco.linhas.length
            ? bloco.linhas.map((l, i) => new TextRun({ text: l, font: MONO, size: 17, break: i ? 1 : 0 }))
            : [new TextRun({ text: '', font: MONO, size: 17 })],
        }));
        break;

      case 'tabela': {
        const colunas = Math.max(bloco.cabecalho?.length || 0, ...bloco.linhas.map((l) => l.length), 1);
        const encher = (l) => [...l, ...Array(Math.max(0, colunas - l.length)).fill('')];
        const fila = (celulas, negrito) => new TableRow({
          tableHeader: negrito || undefined,
          children: encher(celulas).map((c) => new TableCell({
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 0, line: 260, lineRule: LineRuleType.AUTO },
              children: runs(c, { font: SERIF, size: 17, negrito }),
            })],
          })),
        });
        saida.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: BORDA, bottom: BORDA, left: BORDA, right: BORDA,
            insideHorizontal: BORDA, insideVertical: BORDA,
          },
          rows: [
            ...(bloco.cabecalho ? [fila(bloco.cabecalho, true)] : []),
            ...bloco.linhas.map((l) => fila(l, false)),
          ],
        }));
        // Duas tabelas coladas o Word funde numa so.
        saida.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
        break;
      }

      default:
        saida.push(new Paragraph({
          alignment: alinhamento,
          spacing: cit
            ? { before: 200, after: 200, line: 280, lineRule: LineRuleType.AUTO }
            : { after: opts.after ?? 160, line: 300, lineRule: LineRuleType.AUTO },
          indent: recuo,
          children: runs(bloco.texto, base, opts.termos),
        }));
    }
  }

  /** O texto de uma secao inteira, ja em filhos de documento. */
  const paragrafos = (texto, opts = {}) => {
    const saida = [];
    for (const b of blocos(texto)) desenhar(b, opts, saida);
    return saida;
  };

  // A pagina nova e propriedade do primeiro paragrafo dela (`pageBreakBefore`),
  // e nunca um paragrafo so de quebra. O paragrafo de quebra deixava pagina em
  // branco em dois casos, medidos no PDF de uma obra de 107 paginas: duas
  // quebras seguidas antes de cada divisor de Parte, e o capitulo que termina
  // rente ao pe da pagina, empurrando o paragrafo da quebra sozinho para a
  // pagina seguinte, onde ele quebra de novo.
  // A excecao e o primeiro paragrafo de uma secao que ja abre pagina nova.
  const rubrica = (t, before, quebra = true) => new Paragraph({
    pageBreakBefore: quebra || undefined,
    spacing: { before, after: 300 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: t, font: SERIF, size: 22, allCaps: true, characterSpacing: 40, color: '666666' })],
  });

  const filhos = [];

  // ---------------------------------------------------------------- rosto
  filhos.push(new Paragraph({ spacing: { before: 2600 }, children: [] }));
  filhos.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: texto(cfg.titulo).toUpperCase(), font: SERIF, size: 52, characterSpacing: 80 })],
  }));
  filhos.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 900 },
    children: [new TextRun({ text: texto(cfg.genero), font: SERIF, size: 20, italics: true, color: '666666' })],
  }));
  filhos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: texto(cfg.autor), font: SERIF, size: 24 })],
  }));
  // A revisao no rosto e a resposta a pergunta que o leitor externo faz
  // primeiro: "e este que eu ja li?". Le o registro; nunca calcula.
  const rev = revisaoAtual(raiz);
  if (rev) {
    filhos.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 400 },
      children: [new TextRun({ text: texto(carimbo(rev)), font: SERIF, size: 19, color: '888888', characterSpacing: 30 })],
    }));
    filhos.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 80 },
      children: [new TextRun({ text: texto(rev.nota), font: SERIF, size: 17, italics: true, color: '888888' })],
    }));
  }

  // ------------------------------------------- front matter editorial
  // O texto e da obra, nao do gerador — aviso de conteudo e nota de versao
  // mudam de livro para livro.
  for (const sec of secoes(join(raiz, 'docs', 'front-matter.md'))) {
    filhos.push(rubrica(sec.titulo, 1600));
    filhos.push(...paragrafos(sec.texto, { alignment: AlignmentType.LEFT, after: 200 }));
  }

  // --------------------------------------------------------------- sumario
  if (comSumario) {
    filhos.push(rubrica('Sumário', 1200));
    filhos.push(new TableOfContents('Sumário', { tcFieldIdentifier: 'S', tcFieldLevelRange: '1-2' }));
  }

  // ------------------------------------------------------------- capitulos
  let comNota = 0;
  // A estrutura do plano diretor chegando ao papel: uma pagina por Parte,
  // antes do primeiro capitulo do ato. Ato sem linha na tabela nao inventa
  // titulo — fica sem divisor, e o build e quem avisa.
  const mapaPartes = partes(raiz);
  let atoAnterior = null;
  let divisores = 0;
  caps.forEach((cap) => {
    const ato = Number(cap.fm.ato) || null;
    const parte = ato && ato !== atoAnterior ? mapaPartes.get(ato) : null;
    if (ato && ato !== atoAnterior) atoAnterior = ato;
    if (parte) {
      filhos.push(new Paragraph({ pageBreakBefore: true, spacing: { before: 3200 }, children: [] }));
      filhos.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 260 },
        children: [new TextRun({ text: `PARTE ${texto(parte.romano)}`, font: SERIF, size: 20, characterSpacing: 120, color: '888888' })],
      }));
      filhos.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          ...(comSumario ? entradaSumario(`Parte ${texto(parte.romano)} — ${texto(parte.titulo)}`, 1) : []),
          new TextRun({ text: texto(parte.titulo), font: SERIF, size: 40 }),
        ],
      }));
      if (comSumario) entradas++;
      divisores++;
    }
    const nota = ressalva(cap.fm, cfg);
    if (nota) comNota++;

    filhos.push(new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 900, after: 60 }, alignment: AlignmentType.LEFT,
      children: [new TextRun({
        text: `capitulo ${String(cap.numero).padStart(2, '0')}${cap.fm.ato ? `  ·  ato ${texto(cap.fm.ato)}` : ''}`,
        font: SERIF, size: 18, allCaps: true, characterSpacing: 60, color: '888888',
      })],
    }));
    filhos.push(new Paragraph({
      heading: HeadingLevel.HEADING_1, spacing: { after: nota ? 140 : 500 }, alignment: AlignmentType.LEFT,
      children: [
        ...(comSumario ? entradaSumario(`${cap.numero}. ${texto(cap.fm.titulo)}`, divisores ? 2 : 1) : []),
        new TextRun({ text: texto(cap.fm.titulo), font: SERIF, size: 34, color: '000000' }),
      ],
    }));
    if (comSumario) entradas++;
    if (nota) {
      filhos.push(new Paragraph({
        spacing: { after: 460 }, alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: nota, font: SERIF, size: 17, italics: true, color: 'AA5500' })],
      }));
    }

    // Com indice, a prosa sai cena a cena: cada cena marca so os nomes das
    // fichas que ela declara. O separador e o mesmo que o `prosaFinal` poe.
    const cenas = cap.cenas.filter((s) => s.prosa);
    if (comIndice && cenas.length) {
      cenas.forEach((s, k) => {
        if (k) filhos.push(...paragrafos('* * *'));
        filhos.push(...paragrafos(s.prosa, { termos: termosDaCena(fichas, s.personagens) }));
      });
    } else {
      filhos.push(...paragrafos(prosaFinal(cap)));
    }
  });

  // ---------------------------------------------------------- pagina final
  // Uma pagina depois do ultimo capitulo, com titulo e linhas no pe, a
  // direita. O pe vem da secao com alinhamento vertical inferior, e nao de
  // espaco estimado, que erraria com o tamanho do texto.
  const final = secoes(join(raiz, 'docs', 'pagina-final.md'))[0];
  const paginaFinal = [];
  if (final) {
    paginaFinal.push(new Paragraph({
      alignment: AlignmentType.RIGHT, spacing: { after: 260 },
      children: [
        ...(comSumario ? entradaSumario(final.titulo, divisores ? 2 : 1) : []),
        new TextRun({ text: final.titulo, font: SERIF, size: 26, italics: true }),
      ],
    }));
    if (comSumario) entradas++;
    for (const linha of final.texto.split('\n').map((l) => l.trim()).filter(Boolean)) {
      paginaFinal.push(new Paragraph({
        alignment: AlignmentType.RIGHT, spacing: { after: 40, line: 280, lineRule: LineRuleType.AUTO },
        children: runs(linha, { font: SERIF, size: 21 }),
      }));
    }
  }

  // Apendice e indice fecham o livro. Com pagina final, abrem secao propria,
  // que ja comeca em pagina nova: a primeira rubrica nao quebra de novo.
  const fim = [];
  const quebraFim = () => !(final && fim.length === 0);

  // ------------------------------------------------------------- apendice
  // Mesmo tratamento do front matter, no fim do livro. Serve para o que e do
  // produto mas nao e capitulo: lista de pendencias, glossario, fontes.
  for (const sec of secoes(join(raiz, 'docs', 'apendice.md'))) {
    fim.push(rubrica(sec.titulo, 1200, quebraFim()));
    fim.push(...paragrafos(sec.texto, { alignment: AlignmentType.LEFT, after: 200 }));
  }

  // ---------------------------------------------------------------- indice
  // Sem nenhuma marca, o Word imprimiria "Nenhuma entrada de indice remissivo
  // foi encontrada" numa pagina propria: melhor nao ter pagina, e avisar.
  if (comIndice && marcasIndice) {
    fim.push(rubrica('Índice', 1200, quebraFim()));
    fim.push(new Paragraph({ children: campo('INDEX \\h "A" \\c "1" \\z "1046"', { resultado: true }) }));
  }

  // O rodape e o mesmo em todas as secoes; cada uma recebe o seu, porque secao
  // sem rodape declarado depende de heranca que nem todo leitor de DOCX faz.
  const rodape = () => ({
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          ...(rev ? [new TextRun({ text: `revisao ${rev.numero}  ·  `, font: SERIF, size: 16, color: 'AAAAAA' })] : []),
          new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 18, color: '888888' }),
        ],
      })],
    }),
  });
  const pagina = { size: A5, margin: MARGENS };
  const secoesDoc = [{ properties: { type: SectionType.CONTINUOUS, page: pagina }, footers: rodape(), children: filhos }];
  if (final) {
    secoesDoc.push({
      properties: { type: SectionType.NEXT_PAGE, page: pagina, verticalAlign: VerticalAlignSection.BOTTOM },
      footers: rodape(), children: paginaFinal,
    });
    if (fim.length) secoesDoc.push({ properties: { type: SectionType.NEXT_PAGE, page: pagina }, footers: rodape(), children: fim });
  } else {
    filhos.push(...fim);
  }

  // TOC e INDEX usam os estilos "toc N" e "index N" do Word, que por padrao
  // herdam a fonte do documento: sem isto, sumario e indice sairiam em Calibri
  // no meio de um livro em Georgia.
  const estilo = (id, name, run, paragraph) => ({ id, name, basedOn: 'Normal', next: 'Normal', run: { font: SERIF, ...run }, paragraph });
  const doc = new Document({
    creator: texto(cfg.autor),
    title: texto(cfg.titulo),
    description: 'Versao de leitura — nao publicada.',
    features: comSumario || comIndice ? { updateFields: true } : undefined,
    styles: {
      default: { document: { run: { font: SERIF, size: 21 } } },
      paragraphStyles: [
        estilo('TOC1', 'toc 1', { size: 21, bold: true }, { spacing: { before: 200, after: 60 } }),
        estilo('TOC2', 'toc 2', { size: 20 }, { spacing: { after: 40 }, indent: { left: 280 } }),
        estilo('Index1', 'index 1', { size: 19 }, { spacing: { after: 20 } }),
        estilo('IndexHeading', 'index heading', { size: 22, bold: true }, { spacing: { before: 200, after: 60 } }),
      ],
    },
    sections: secoesDoc,
  });

  // O nome carrega a revisao: dois DOCX de revisoes diferentes nunca mais tem
  // o mesmo nome. Sem revisao registrada, sai com o nome antigo e AVISA — nao
  // bloqueia, porque rascunho para uso proprio nao deveria exigir cerimonia.
  const nome = rev
    ? `${texto(cfg.titulo) || 'manuscrito'} — revisao ${rev.numero}.docx`
    : `${texto(cfg.titulo) || 'manuscrito'} — versao de leitura.docx`;
  const alvo = join(raiz, 'manuscrito', nome);
  mkdirSync(join(raiz, 'manuscrito'), { recursive: true });
  // O leitor costuma estar com o arquivo anterior aberto no Word quando pede
  // a versao nova. No Windows isso e EBUSY, e o stack trace cru nao ajuda
  // ninguem a entender que basta fechar o documento.
  try {
    writeFileSync(alvo, await Packer.toBuffer(doc));
  } catch (e) {
    if (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES') {
      throw new Erro([
        `${rel(raiz, alvo)} esta aberto em outro programa.`,
        '       Feche o arquivo (Word costuma ser o culpado) e rode de novo.',
      ].join(String.fromCharCode(10)));
    }
    throw e;
  }

  // A contagem nao e enfeite: e o unico jeito de o carimbo sumindo virar
  // numero em vez de descoberta na leitura do arquivo pronto.
  console.log(`${c.green('docx gerado')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  corte: ${minimo} ou adiante | ${caps.length} capitulos, ${comNota} com ressalva`));
  if (divisores) console.log(c.dim(`  ${divisores} divisor(es) de Parte, do plano diretor`));
  if (refLigada) console.log(c.dim(`  referencia biblica em italico, corpo ${corpoRef / 2} pt`));
  if (comSumario) console.log(c.dim(`  sumario com ${entradas} entrada(s)`));
  if (comIndice && marcasIndice) console.log(c.dim(`  indice com ${marcasIndice} marca(s) de ${fichas.size} ficha(s)`));
  if (comIndice && !marcasIndice) console.log(c.yellow(`  indice ligado e nenhum nome encontrado (${fichas.size} ficha(s) no canon) — saiu sem pagina de indice. As cenas declaram as fichas em personagens:?`));
  if (final) console.log(c.dim(`  pagina final: "${final.titulo}"`));
  if (comSumario || comIndice) console.log(c.dim('  sumario e indice ganham numero de pagina quando o Word atualiza os campos (bookfw pdf faz isso)'));
  if (rev) console.log(c.dim(`  ${carimbo(rev).toLowerCase()} — ${rev.nota}`));
  else console.log(c.yellow('  sem revisao registrada — o arquivo saiu sem numero. bookfw revisao "o que mudou" antes de mandar a alguem'));
}
