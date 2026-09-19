/**
 * A referencia biblica na prosa: reconhecer, para a versao de leitura desenhar
 * em italico e corpo menor, e cobrar, para o gate recusar a que chega sem
 * livro. Ver ADR-2026-09-18.
 *
 * O reconhecimento e pela lista fechada de livros, e nao por "numero, virgula,
 * numero": "(20,3-4)" pode ser qualquer coisa, "(Mateus 20,3-4)" nao. Por isso
 * o gate da referencia sem livro vem junto — sem ele, a referencia incompleta
 * sairia reta, sem estilo, e ninguem veria. Numa obra real, 143 de 238
 * referencias estavam assim, e ate a atribuicao automatica errou o livro de
 * dois capitulos inteiros.
 */

/** Livros com numero antes do nome: I Samuel, II Corintios, III Joao. */
export const NUMERADOS = [
  'Samuel', 'Reis', 'Crônicas', 'Macabeus', 'Coríntios', 'Tessalonicenses',
  'Timóteo', 'Pedro', 'João',
];

/**
 * Os 73 livros do canon catolico, nos nomes em portugues. Os sete
 * deuterocanonicos entram porque a lista serve a qualquer obra; quem decide se
 * a obra os cita e a DEC da obra, nao o reconhecedor.
 */
export const LIVROS = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes',
  'Rute', 'Samuel', 'Reis', 'Crônicas', 'Esdras', 'Neemias', 'Tobias', 'Judite',
  'Ester', 'Macabeus', 'Jó', 'Salmos', 'Salmo', 'Provérbios', 'Eclesiastes',
  'Cântico dos Cânticos', 'Cântico', 'Sabedoria', 'Eclesiástico', 'Isaías',
  'Jeremias', 'Lamentações', 'Baruc', 'Ezequiel', 'Daniel', 'Oseias', 'Oséias',
  'Joel', 'Amós', 'Abdias', 'Jonas', 'Miqueias', 'Miquéias', 'Naum', 'Habacuc',
  'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
  'Mateus', 'Marcos', 'Lucas', 'João', 'Atos dos Apóstolos', 'Atos', 'Romanos',
  'Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses',
  'Tessalonicenses', 'Timóteo', 'Tito', 'Filêmon', 'Hebreus', 'Tiago', 'Pedro',
  'Judas', 'Apocalipse',
];

// O nome mais longo primeiro: "Cântico dos Cânticos" antes de "Cântico".
const ALTERNATIVAS = [...LIVROS].sort((a, b) => b.length - a.length).join('|');

/**
 * Referencia entre parenteses: numeral opcional, livro, capitulo e o resto
 * ate o parentese que fecha. O unico parentese aceito dentro e o numero grego
 * do salmo — "(Salmo 139(138),13)" —, e por isso o miolo e `[^()]` ou
 * `(\d+)`: sem aninhamento livre, a regex nao retrocede em cascata.
 */
const REFERENCIA = new RegExp(
  `\\((?:(?:I{1,3}|[123]) )?(?:${ALTERNATIVAS}) \\d+(?:\\(\\d+\\))?,\\d(?:[^()\\n]|\\(\\d+\\))*\\)`,
  'gu',
);

/** "(20,3-4)", "(2,3.5)", "(21,15-17; 22,1)": capitulo e versiculo sem livro. */
const SEM_LIVRO = /\((\d{1,3}),\d{1,3}(?:[-–.,;]\s?\d{1,3})*\)/g;

/** Livro numerado em algarismo arabico: "1 Coríntios 6,1". */
const ARABICO = new RegExp(`\\b([123]) (${NUMERADOS.join('|')}) \\d+`, 'gu');

/**
 * Divide o texto em trechos, marcando as referencias. A concatenacao dos
 * trechos devolve o texto original, caractere por caractere.
 */
export function trechosDeReferencia(texto) {
  const saida = [];
  let i = 0;
  for (const m of texto.matchAll(REFERENCIA)) {
    if (m.index > i) saida.push({ texto: texto.slice(i, m.index), referencia: false });
    saida.push({ texto: m[0], referencia: true });
    i = m.index + m[0].length;
  }
  if (i < texto.length) saida.push({ texto: texto.slice(i), referencia: false });
  return saida;
}

/** O modo da obra, ou `null` com a regra desligada. */
export function modoDeReferencia(cfg = {}) {
  const v = String(cfg.referencia_biblica ?? '').trim().toLowerCase();
  if (!v || v === 'nao' || v === 'não' || v === 'false') return null;
  return v === 'romano' || v === 'arabico' ? v : 'invalido';
}

/**
 * O que o gate cobra numa prosa: referencia sem livro, e, no modo `romano`,
 * livro numerado em algarismo arabico. Devolve `{ linha, trecho, motivo }`.
 */
export function problemasDeReferencia(prosa, modo) {
  if (modo !== 'romano' && modo !== 'arabico') return [];
  const linhaDe = (idx) => prosa.slice(0, idx).split('\n').length;
  const out = [];
  for (const m of prosa.matchAll(SEM_LIVRO)) {
    out.push({ linha: linhaDe(m.index), trecho: m[0], motivo: 'referencia sem o livro' });
  }
  if (modo === 'romano') {
    const ROMANO = { 1: 'I', 2: 'II', 3: 'III' };
    for (const m of prosa.matchAll(ARABICO)) {
      out.push({ linha: linhaDe(m.index), trecho: m[0], motivo: `livro numerado em algarismo — escreva ${ROMANO[m[1]]} ${m[2]}` });
    }
  }
  return out.sort((a, b) => a.linha - b.linha);
}
