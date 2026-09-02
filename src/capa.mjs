/**
 * Capa da obra. Dois passos, espelhando o que o `brief` faz com a cena:
 *
 *   bookfw capa brief   monta o pacote que vai para o gerador de imagem
 *   bookfw capa         compoe o SVG, e rasteriza se o resvg estiver instalado
 *
 * O SVG e a fonte da verdade. PNG e derivado dele, em medida diferente. Ver
 * ADR-2026-08-31 sobre capa como SVG governado pela obra.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { Erro, acharProjeto, c, canon, capitulos, escrever, hoje, lerConfig, planoDiretor, promessas, rel } from './core.mjs';

/** Secao `## Titulo` do corpo de um artefato, sem o cabecalho. */
export function secao(corpo, nome) {
  const partes = String(corpo || '').split(/^## /m);
  const achada = partes.find((s) => new RegExp(`^${nome}`, 'i').test(s));
  if (!achada) return '';
  return achada.replace(/^.*\n/, '').trim();
}

/**
 * Lexico de conteudo medido pelo `bookfw style`. Aceita o rotulo antigo
 * ("Palavras marcantes") porque style card gerado antes da 0.4.1 continua no
 * disco das obras — e este bloco e lido por regex, entao o rotulo trocado sem
 * o leitor acompanhar esvazia o briefing de capa sem erro nenhum.
 */
function marcantes(raiz) {
  const sc = join(raiz, 'docs/style-card.md');
  if (!existsSync(sc)) return [];
  const m = readFileSync(sc, 'utf8').match(/(?:Lexico da obra|L[eé]xico da obra|Palavras marcantes):\s*([^\n.]+)/i);
  return m ? m[1].split(',').map((x) => x.trim()).filter(Boolean) : [];
}

/** A arte que o autor deixou em capa/. Formato raster que o resvg embute. */
export function arteDe(raiz) {
  const dir = join(raiz, 'capa');
  if (!existsSync(dir)) return null;
  const arq = readdirSync(dir).find((f) => /^arte\.(png|jpe?g|webp)$/i.test(f));
  return arq ? join(dir, arq) : null;
}

export function capaBrief(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const pd = planoDiretor(raiz);
  if (!pd) throw new Erro('Nenhum plano diretor. A capa sai da obra, e a obra comeca no PD.');

  const proms = promessas(raiz);
  const cn = canon(raiz);
  const lexico = marcantes(raiz);
  const caps = capitulos(raiz);
  const palavras = caps.reduce((a, x) => a + x.palavras, 0);

  // Cada bloco aponta a origem: linha errada no briefing se corrige na fonte,
  // nao no briefing — senao o proximo `capa brief` reescreve o conserto.
  const bloco = (titulo, origem, texto) =>
    `## ${titulo}\n_fonte: ${origem}_\n\n${texto || '(vazio — preencha na fonte)'}\n`;

  const naoVaiTer = secao(pd.corpo, 'Nao vai ter') || secao(pd.corpo, 'Não vai ter');
  const out = [
    `# Briefing de capa — ${cfg.titulo}`,
    `_gerado por \`bookfw capa brief\` em ${hoje()}. Nao edite: regere._\n`,
    `Autor: ${cfg.autor} | genero: ${cfg.genero} | publico: ${cfg.publico || 'a definir'}`,
    `Estado: ${caps.length} capitulos, ${palavras} palavras${cfg.palavras_alvo ? ` de ${cfg.palavras_alvo}` : ''}.\n`,
    bloco('Premissa', rel(raiz, pd.caminho), secao(pd.corpo, 'Premissa')),
    bloco('Tema', rel(raiz, pd.caminho), secao(pd.corpo, 'Tema')),
    bloco('Promessa ao leitor', rel(raiz, pd.caminho), secao(pd.corpo, 'Promessa')),
    bloco('Desfecho — para o designer, nao para a capa', rel(raiz, pd.caminho), secao(pd.corpo, 'Desfecho')),
  ];

  if (proms.length) {
    out.push(bloco('Promessas numeradas', rel(raiz, pd.caminho),
      proms.map((p) => `- ${p.id} — ${p.texto}`).join('\n')));
  }
  if (cn.lugares.length) {
    out.push(bloco('Lugares do canon', 'docs/canon/lugares/',
      cn.lugares.map((l) => `- ${l.nome}${l.fm.tipo ? ` (${l.fm.tipo})` : ''}: ${(l.fm.resumo || '').slice(0, 160)}`).join('\n')));
  }
  if (lexico.length) {
    out.push(bloco('Lexico marcante da obra', 'docs/style-card.md (medido)', lexico.join(', ')));
  }

  // O que NAO pode aparecer vale tanto quanto o que deve: a secao "Nao vai ter"
  // do PD e exatamente o freio que a capa tambem precisa respeitar.
  out.push(bloco('O que a obra deliberadamente NAO faz', rel(raiz, pd.caminho), naoVaiTer));

  out.push(`## Prompt para gerador de imagem
_cole num gerador de imagem; ajuste o estilo, nunca o conteudo_

\`\`\`
Capa de livro. Genero: ${cfg.genero}. Publico: ${cfg.publico || 'adulto'}.
${resumo(secao(pd.corpo, 'Premissa'))}
Tom: ${resumo(secao(pd.corpo, 'Tema'), 200)}
${cn.lugares.length ? `Ambientacao possivel: ${cn.lugares.map((l) => l.nome).join('; ')}.` : ''}
Composicao com espaco livre no terco superior para o titulo e na base para o
nome do autor. Sem texto na imagem — a tipografia entra depois.
${naoVaiTer ? `Evitar: ${resumo(naoVaiTer, 200)}` : ''}
\`\`\`

## O que NAO deve aparecer na arte

- Texto de qualquer tipo. Titulo e autor sao compostos pelo \`bookfw capa\`.
- Rosto reconhecivel de pessoa real, salvo consentimento registrado em DEC.
- Elemento que contradiga o canon ou a secao "Nao vai ter" acima.
- Detalhe que entregue o desfecho.

## Depois

\`\`\`bash
# salve a arte escolhida como capa/arte.png (ou .jpg)
bookfw capa                    # compoe titulo e autor sobre a arte
bookfw capa --tipografica      # sem arte nenhuma, so tipografia
\`\`\`
`);

  const alvo = join(raiz, 'capa', 'briefing.md');
  escrever(alvo, out.join('\n'));
  console.log(`${c.green('briefing de capa gerado')}  ${rel(raiz, alvo)}`);
  const faltando = [
    !secao(pd.corpo, 'Premissa') && 'premissa',
    !naoVaiTer && '"Nao vai ter"',
    !lexico.length && 'lexico medido (rode `bookfw style`)',
    !cn.lugares.length && 'lugares no canon',
  ].filter(Boolean);
  if (faltando.length) console.log(c.dim(`  sem ${faltando.join(', ')} — o briefing sai mais fraco`));
  if (args.json) console.log(JSON.stringify({ arquivo: rel(raiz, alvo), promessas: proms.length, lugares: cn.lugares.length }, null, 2));
}

// ---------------------------------------------------------------------------
// Composicao
// ---------------------------------------------------------------------------

/** Ebook: o padrao de Kindle, Kobo e Google Play. Os outros derivam dele. */
const EBOOK = { largura: 1600, altura: 2560 };
const MINIATURA = { largura: 400, altura: 640 };

/** Impressao: 6x9 polegadas a 300 dpi, sangria de 0.125in, papel branco KDP. */
const DPI = 300;
const TRIM = { largura: 6 * DPI, altura: 9 * DPI };
const SANGRIA = Math.round(0.125 * DPI);
const ESPESSURA_PAGINA = 0.002252 * DPI; // polegada por pagina, papel branco
const PALAVRAS_POR_PAGINA = 250;

/**
 * Paleta por genero. Nao e decoracao: e a primeira leitura que a estante faz da
 * obra, e errar o genero na cor custa o leitor que teria gostado do livro.
 */
const PALETAS = {
  memoria: { fundo: '#1c1a17', texto: '#efe9df', realce: '#c8a86b' },
  suspense: { fundo: '#0f1115', texto: '#e9ecf1', realce: '#8f2d2d' },
  romance: { fundo: '#2a1a22', texto: '#f6ecef', realce: '#c98da5' },
  aventura: { fundo: '#14211f', texto: '#eef3ef', realce: '#c9873f' },
  historia: { fundo: '#1b1814', texto: '#f0e8da', realce: '#9a7b46' },
  tecnico: { fundo: '#101418', texto: '#e6edf3', realce: '#4c8fbd' },
  padrao: { fundo: '#17181b', texto: '#eceae6', realce: '#a08a5e' },
};
const paletaDe = (genero) => {
  const g = String(genero || '').toLowerCase();
  return PALETAS[Object.keys(PALETAS).find((k) => g.includes(k))] || PALETAS.padrao;
};

/** Veu escuro sobre a arte, para o titulo ler. Certo para foto; demais para arte escura. */
const ESCURECER_PADRAO = 0.42;

const escapar = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Quebra por ESTIMATIVA de largura: 0.52 em por glifo numa serifada, media
 * grosseira. Nao e metrica de fonte — o comando declara isso em vez de deixar
 * o autor descobrir com o titulo vazando da capa. Ver residual na ADR.
 */
export function quebrar(titulo, tamanho, larguraUtil) {
  const porGlifo = tamanho * 0.52;
  const cabem = Math.max(6, Math.floor(larguraUtil / porGlifo));
  const linhas = [];
  let atual = '';
  for (const palavra of String(titulo).split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length > cabem && atual) { linhas.push(atual); atual = palavra; } else atual = tentativa;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Paginas estimadas do corte — o mesmo calculo que o `build` ja imprime. */
export function paginasDe(palavras) {
  return Math.max(24, Math.ceil(palavras / PALAVRAS_POR_PAGINA));
}

/** Lombada em pixels a 300 dpi. Papel branco KDP: 0.002252in por pagina. */
export function lombadaDe(paginas) {
  return Math.round(paginas * ESPESSURA_PAGINA);
}

function svgFrente({ largura, altura, cfg, arte, paleta, escurecer = ESCURECER_PADRAO, x = 0 }) {
  const p = [];
  const margem = Math.round(largura * 0.1);
  const util = largura - margem * 2;

  if (arte) {
    // data URI, nunca caminho relativo: SVG com href para capa/arte.png abre na
    // maquina do autor e quebra em qualquer outra, inclusive na da grafica.
    p.push(`<image x="${x}" y="0" width="${largura}" height="${altura}" preserveAspectRatio="xMidYMid slice" href="${arte}"/>`);
    // O veu existe para o titulo ler sobre foto clara. Fixo em 0.42 ele apaga
    // arte que ja nasce escura: numa arte vetorial de linha, a linha sumiu.
    // Quem sabe quanto a arte aguenta e quem olha a capa — dai o `--escurecer`.
    if (escurecer > 0) {
      p.push(`<rect x="${x}" y="0" width="${largura}" height="${altura}" fill="${paleta.fundo}" opacity="${escurecer}"/>`);
    }
  } else {
    p.push(`<rect x="${x}" y="0" width="${largura}" height="${altura}" fill="${paleta.fundo}"/>`);
    p.push(`<rect x="${x + margem}" y="${Math.round(altura * 0.14)}" width="${util}" height="2" fill="${paleta.realce}"/>`);
    p.push(`<rect x="${x + margem}" y="${Math.round(altura * 0.72)}" width="${util}" height="2" fill="${paleta.realce}"/>`);
  }

  const corpoTitulo = Math.round(largura * 0.115);
  const linhas = quebrar(cfg.titulo, corpoTitulo, util);
  const topo = Math.round(altura * 0.24);
  linhas.forEach((linha, i) => {
    p.push(`<text x="${x + largura / 2}" y="${topo + i * corpoTitulo * 1.18}" font-family="Georgia, 'Times New Roman', serif"`
      + ` font-size="${corpoTitulo}" fill="${paleta.texto}" text-anchor="middle">${escapar(linha)}</text>`);
  });

  if (cfg.subtitulo) {
    const corpo = Math.round(corpoTitulo * 0.34);
    p.push(`<text x="${x + largura / 2}" y="${topo + linhas.length * corpoTitulo * 1.18 + corpo * 1.6}"`
      + ` font-family="Georgia, 'Times New Roman', serif" font-size="${corpo}" fill="${paleta.realce}"`
      + ` text-anchor="middle">${escapar(cfg.subtitulo)}</text>`);
  }

  if (cfg.autor && cfg.autor !== 'a definir') {
    const corpo = Math.round(largura * 0.045);
    p.push(`<text x="${x + largura / 2}" y="${Math.round(altura * 0.88)}" font-family="Georgia, 'Times New Roman', serif"`
      + ` font-size="${corpo}" fill="${paleta.texto}" letter-spacing="${corpo * 0.08}"`
      + ` text-anchor="middle">${escapar(cfg.autor.toUpperCase())}</text>`);
  }
  return p.join('\n  ');
}

/**
 * Quarta capa: e onde o leitor decide comprar, entao nao pode sair em branco.
 * O texto e a promessa ao leitor declarada no plano diretor — o mesmo contrato
 * que o gate cobra do livro, agora dito para quem ainda nao leu.
 */
function svgVerso({ largura, altura, paleta, blurb, autor }) {
  const p = [`<rect x="0" y="0" width="${largura}" height="${altura}" fill="${paleta.fundo}"/>`];
  if (!blurb) return p.join('\n  ');
  const margem = Math.round(largura * 0.12);
  const util = largura - margem * 2;
  const corpo = Math.round(largura * 0.038);
  const linhas = quebrar(blurb, corpo, util).slice(0, 18);
  const topo = Math.round(altura * 0.3);
  linhas.forEach((linha, i) => {
    p.push(`<text x="${margem}" y="${topo + i * corpo * 1.6}" font-family="Georgia, 'Times New Roman', serif"`
      + ` font-size="${corpo}" fill="${paleta.texto}" opacity="0.92">${escapar(linha)}</text>`);
  });
  p.push(`<rect x="${margem}" y="${topo + linhas.length * corpo * 1.6 + corpo}" width="${Math.round(util * 0.25)}" height="2" fill="${paleta.realce}"/>`);
  if (autor && autor !== 'a definir') {
    p.push(`<text x="${margem}" y="${topo + linhas.length * corpo * 1.6 + corpo * 3.2}" font-family="Georgia, serif"`
      + ` font-size="${corpo}" fill="${paleta.realce}">${escapar(autor)}</text>`);
  }
  return p.join('\n  ');
}

export function svgDaCapa({ formato, cfg, arte, palavras, blurb, escurecer = ESCURECER_PADRAO }) {
  const paleta = paletaDe(cfg.genero);
  const abre = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

  if (formato === 'impressao') {
    // Capa espalhada: verso + lombada + frente, com sangria em volta de tudo.
    const paginas = paginasDe(palavras);
    const lombada = lombadaDe(paginas);
    const w = TRIM.largura * 2 + lombada + SANGRIA * 2;
    const h = TRIM.altura + SANGRIA * 2;
    const xFrente = SANGRIA + TRIM.largura + lombada;
    // 0.62 da largura da lombada: a 0.42 o titulo saia com 25px numa lombada de
    // 59, ilegivel na prateleira. O limite e caber na lombada, nao ser discreto.
    const corpoLombada = Math.round(lombada * 0.62);
    return { paginas, lombada, largura: w, altura: h, svg: [
      abre(w, h),
      `  <rect width="${w}" height="${h}" fill="${paleta.fundo}"/>`,
      `  <g transform="translate(0,${SANGRIA})">`,
      `  <g transform="translate(${SANGRIA},0)">${svgVerso({ largura: TRIM.largura, altura: TRIM.altura, paleta, blurb, autor: cfg.autor })}</g>`,
      `  ${svgFrente({ largura: TRIM.largura, altura: TRIM.altura, cfg, arte, paleta, escurecer, x: xFrente })}`,
      // lombada: so entra texto se houver espaco de sobra para ele ser legivel
      lombada > 40
        ? `  <text x="${SANGRIA + TRIM.largura + lombada / 2}" y="${TRIM.altura / 2}" font-family="Georgia, serif"`
          + ` font-size="${corpoLombada}" fill="${paleta.texto}" text-anchor="middle"`
          + ` transform="rotate(90 ${SANGRIA + TRIM.largura + lombada / 2} ${TRIM.altura / 2})">${escapar(cfg.titulo)}</text>`
        : '',
      `  </g>`,
      '</svg>',
    ].filter(Boolean).join('\n') };
  }

  const dim = formato === 'miniatura' ? MINIATURA : EBOOK;
  return { largura: dim.largura, altura: dim.altura, svg: [
    abre(dim.largura, dim.altura),
    `  ${svgFrente({ largura: dim.largura, altura: dim.altura, cfg, arte, paleta, escurecer })}`,
    '</svg>',
  ].join('\n') };
}

/**
 * `@resvg/resvg-js` e opcional, no mesmo padrao do `docx`: o SVG e a fonte da
 * verdade e sai sem dependencia nenhuma. A segunda tentativa resolve a partir
 * do projeto do livro — com o CLI linkado, `import()` parte da pasta do bookfw
 * e nao enxerga o `node_modules` da obra.
 */
async function carregarResvg(raiz) {
  const normalizar = (m) => (m && m.Resvg ? m : m?.default);
  try {
    const m = normalizar(await import('@resvg/resvg-js'));
    if (m?.Resvg) return m.Resvg;
  } catch { /* tenta o projeto do livro */ }
  try {
    const req = createRequire(pathToFileURL(join(raiz, 'package.json')));
    const m = normalizar(req('@resvg/resvg-js'));
    if (m?.Resvg) return m.Resvg;
  } catch { /* sem rasterizador: o SVG ja saiu */ }
  return null;
}

const FORMATOS = ['ebook', 'impressao', 'miniatura', 'svg'];

export async function capa(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const caps = capitulos(raiz);
  const palavras = caps.reduce((a, x) => a + x.palavras, 0);

  // `svg` e apelido de "ebook sem rasterizar": o SVG sai em todo formato, e
  // seria estranho ele ser o unico formato que nao tem forma propria.
  const pedidos = [...new Set((args.formato ? String(args.formato).split(',') : ['ebook'])
    .map((x) => x.trim()).map((x) => (x === 'svg' ? 'ebook' : x)))];
  for (const f of pedidos) if (!FORMATOS.includes(f)) throw new Erro(`--formato deve ser um de ${FORMATOS.join(', ')}`);
  const soSvg = Boolean(args.formato) && String(args.formato).split(',').every((x) => x.trim() === 'svg');

  // A calibragem do veu e da OBRA, nao da linha de comando: sem lugar para
  // grava-la, os arquivos compostos deixam de ser regeneraveis — quem clonasse
  // o repositorio e rodasse `bookfw capa` receberia os 42% e uma capa errada.
  // Mesmo padrao do `ressalva_verificar` que o docx ja le do livro.yaml.
  const daObra = cfg.capa_escurecer;
  const bruto = args.escurecer ?? (daObra === undefined || daObra === '' ? ESCURECER_PADRAO : daObra);
  const escurecer = Number(bruto);
  if (!Number.isFinite(escurecer) || escurecer < 0 || escurecer > 1) {
    const origem = args.escurecer !== undefined ? 'Veio de --escurecer.' : 'Veio de capa_escurecer no livro.yaml.';
    throw new Erro([
      `"${bruto}" nao serve para escurecer: vai de 0 a 1.`,
      '       0 nao escurece nada; 0.42 e o padrao, calibrado para foto clara.',
      `       ${origem}`,
    ].join('\n'));
  }

  // Sem arte, capa tipografica: o autor com o livro pronto e sem ilustracao nao
  // pode ficar bloqueado. `--tipografica` forca isso mesmo havendo arte.
  const arquivoArte = args.tipografica ? null : arteDe(raiz);
  let arte = null;
  if (arquivoArte) {
    const ext = arquivoArte.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    arte = `data:${mime};base64,${readFileSync(arquivoArte).toString('base64')}`;
  }

  // A quarta capa sai da promessa ao leitor do PD; sem PD, sai vazia em vez de
  // inventada — capa que promete o que o livro nao promete e pior que capa lisa.
  const pd = planoDiretor(raiz);
  const blurb = pd ? (resumo(secao(pd.corpo, 'Promessa'), 900) || resumo(secao(pd.corpo, 'Premissa'), 900)) : '';

  const base = cfg.slug || 'capa';
  const Resvg = soSvg ? null : await carregarResvg(raiz);
  const gerados = [];
  let avisoLombada = '';

  // O SVG sai sempre, em todo formato: e a fonte da verdade, e e a capa de
  // impressao — a que mais precisa de ajuste fino — que antes so tinha PNG.
  for (const formato of pedidos) {
    const r = svgDaCapa({ formato, cfg, arte, palavras, blurb, escurecer });
    if (formato === 'impressao') avisoLombada = `${r.paginas} paginas estimadas, lombada de ${r.lombada}px (${(r.lombada / DPI).toFixed(3)}in)`;
    gerados.push(escrever(join(raiz, 'capa', `${base}-${formato}.svg`), r.svg));
    if (!Resvg) continue;
    const png = new Resvg(r.svg, { fitTo: { mode: 'width', value: r.largura }, font: { loadSystemFonts: true } })
      .render().asPng();
    gerados.push(escrever(join(raiz, 'capa', `${base}-${formato}.png`), png));
  }

  console.log(`${c.green('capa gerada')}  ${gerados.map((g) => rel(raiz, g)).join(', ')}`);
  const origemVeu = args.escurecer !== undefined ? '--escurecer' : (daObra !== undefined && daObra !== '' ? 'livro.yaml' : 'padrao');
  console.log(c.dim(`  ${arquivoArte ? `arte: ${rel(raiz, arquivoArte)} escurecida ${Math.round(escurecer * 100)}% (${origemVeu})` : 'tipografica, sem arte'} | genero ${cfg.genero || 'padrao'}`));
  if (avisoLombada) console.log(c.dim(`  ${avisoLombada}`));

  const linhas = quebrar(cfg.titulo, 100, 100 - 100 * 0.2);
  if (linhas.length > 1) {
    console.log(c.dim(`  titulo quebrado em ${linhas.length} linhas — a largura e estimada, nao medida na fonte; confira o SVG`));
  }
  if (!Resvg && !soSvg) {
    console.log(`  ${c.yellow('sem rasterizador')} o SVG saiu; PNG precisa do pacote opcional.`);
    console.log(c.dim('  instale na raiz do projeto do livro:  npm i @resvg/resvg-js'));
  }
  if (!arquivoArte && !args.tipografica) {
    console.log(c.dim('  para usar ilustracao: `bookfw capa brief`, gere a arte e salve em capa/arte.png'));
  }
}

/**
 * Aparo para caber no prompt. Secao em lista vira itens separados por ponto e
 * virgula, cortando em item inteiro: aparar lista como se fosse paragrafo
 * entregava "Cronologia embaralhada — a ordem e a dos dias, e essa e a forca d…"
 * ao gerador de imagem, que e uma instrucao pela metade.
 */
function resumo(texto, limite = 320) {
  const t = String(texto || '').trim();
  if (!t) return '';
  const itens = t.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim());
  if (itens.length) {
    const cabem = [];
    for (const item of itens) {
      if (cabem.join('; ').length + item.length + 2 > limite) break;
      cabem.push(item.replace(/\.$/, ''));
    }
    return (cabem.length ? cabem : [itens[0].slice(0, limite)]).join('; ');
  }
  const primeiro = t.split(/\n{2,}/)[0].replace(/\s+/g, ' ').trim();
  return primeiro.length > limite ? `${primeiro.slice(0, limite - 1).trimEnd()}…` : primeiro;
}
