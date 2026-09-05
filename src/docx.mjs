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
import { Erro, acharProjeto, c, lerConfig, partes, rel } from './core.mjs';
import { carimbo, revisaoAtual } from './revisao.mjs';
import { CORTE_PADRAO, prosaFinal, selecao } from './build.mjs';

const A5 = { width: 8391, height: 11906 };
const MARGENS = { top: 1080, bottom: 1080, left: 1080, right: 1080 };
const SERIF = 'Georgia';

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
      return {
        titulo: titulo.trim(),
        blocos: resto.join('\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean),
      };
    });
}

export async function docx(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const minimo = args.desde || CORTE_PADRAO;
  const { caps } = selecao(raiz, minimo);

  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    PageBreak, Footer, PageNumber, SectionType, LineRuleType,
  } = await carregarDocx(raiz);

  const corpo = (t, opts = {}) => new Paragraph({
    spacing: { after: 160, line: 300, lineRule: LineRuleType.AUTO },
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
    children: [new TextRun({ text: t, font: SERIF, size: 21 })],
  });
  const quebra = () => new Paragraph({ children: [new PageBreak()] });
  const rubrica = (t, before) => new Paragraph({
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
  filhos.push(quebra());

  // ------------------------------------------- front matter editorial
  // O texto e da obra, nao do gerador — aviso de conteudo e nota de versao
  // mudam de livro para livro.
  for (const sec of secoes(join(raiz, 'docs', 'front-matter.md'))) {
    filhos.push(rubrica(sec.titulo, 1600));
    for (const b of sec.blocos) {
      filhos.push(corpo(b.replace(/\n/g, ' '), { alignment: AlignmentType.LEFT, spacing: { after: 200, line: 300 } }));
    }
    filhos.push(quebra());
  }

  // ------------------------------------------------------------- capitulos
  let comNota = 0;
  // A estrutura do plano diretor chegando ao papel: uma pagina por Parte,
  // antes do primeiro capitulo do ato. Ato sem linha na tabela nao inventa
  // titulo — fica sem divisor, e o build e quem avisa.
  const mapaPartes = partes(raiz);
  let atoAnterior = null;
  let divisores = 0;
  caps.forEach((cap, i) => {
    if (i > 0) filhos.push(quebra());
    const ato = Number(cap.fm.ato) || null;
    const parte = ato && ato !== atoAnterior ? mapaPartes.get(ato) : null;
    if (ato && ato !== atoAnterior) atoAnterior = ato;
    if (parte) {
      if (i > 0) filhos.push(quebra());
      filhos.push(new Paragraph({ spacing: { before: 3200 }, children: [] }));
      filhos.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 260 },
        children: [new TextRun({ text: `PARTE ${texto(parte.romano)}`, font: SERIF, size: 20, characterSpacing: 120, color: '888888' })],
      }));
      filhos.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: texto(parte.titulo), font: SERIF, size: 40 })],
      }));
      filhos.push(quebra());
      divisores++;
    }
    const nota = ressalva(cap.fm, cfg);
    if (nota) comNota++;

    filhos.push(new Paragraph({
      spacing: { before: 900, after: 60 }, alignment: AlignmentType.LEFT,
      children: [new TextRun({
        text: `capitulo ${String(cap.numero).padStart(2, '0')}${cap.fm.ato ? `  ·  ato ${texto(cap.fm.ato)}` : ''}`,
        font: SERIF, size: 18, allCaps: true, characterSpacing: 60, color: '888888',
      })],
    }));
    filhos.push(new Paragraph({
      heading: HeadingLevel.HEADING_1, spacing: { after: nota ? 140 : 500 }, alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: texto(cap.fm.titulo), font: SERIF, size: 34, color: '000000' })],
    }));
    if (nota) {
      filhos.push(new Paragraph({
        spacing: { after: 460 }, alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: nota, font: SERIF, size: 17, italics: true, color: 'AA5500' })],
      }));
    }

    for (const bloco of prosaFinal(cap).split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)) {
      if (/^\*\s*\*\s*\*$/.test(bloco)) {
        filhos.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 260, after: 260 },
          children: [new TextRun({ text: '❧', font: SERIF, size: 22, color: '999999' })],
        }));
        continue;
      }
      filhos.push(corpo(bloco.replace(/\n/g, ' ')));
    }
  });

  // ------------------------------------------------------------- apendice
  // Mesmo tratamento do front matter, no fim do livro. Serve para o que e do
  // produto mas nao e capitulo: lista de pendencias, glossario, fontes.
  for (const sec of secoes(join(raiz, 'docs', 'apendice.md'))) {
    filhos.push(quebra());
    filhos.push(rubrica(sec.titulo, 1200));
    for (const b of sec.blocos) {
      filhos.push(corpo(b.replace(/\n/g, ' '), { alignment: AlignmentType.LEFT, spacing: { after: 200, line: 300 } }));
    }
  }

  const doc = new Document({
    creator: texto(cfg.autor),
    title: texto(cfg.titulo),
    description: 'Versao de leitura — nao publicada.',
    sections: [{
      properties: { type: SectionType.CONTINUOUS, page: { size: A5, margin: MARGENS } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              ...(rev ? [new TextRun({ text: `revisao ${rev.numero}  ·  `, font: SERIF, size: 16, color: 'AAAAAA' })] : []),
              new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 18, color: '888888' }),
            ],
          })],
        }),
      },
      children: filhos,
    }],
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
  if (rev) console.log(c.dim(`  ${carimbo(rev).toLowerCase()} — ${rev.nota}`));
  else console.log(c.yellow('  sem revisao registrada — o arquivo saiu sem numero. bookfw revisao "o que mudou" antes de mandar a alguem'));
}
