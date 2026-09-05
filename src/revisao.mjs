/**
 * Revisao da obra: a HISTORIA DE LEITURA do livro.
 *
 * Um livro sai para leitores externos varias vezes antes de fechar, e o DOCX
 * saia sempre com o mesmo nome — quem recebeu nao sabia qual estava lendo, e
 * quem mandou nao tinha como dizer "a versao que voce leu" sem descrever o
 * conteudo. O commit nao serve de unidade de leitura (houve dezesseis entre
 * duas leituras do mesmo livro), e o `livro.yaml` e invariante por decisao de
 * obra, entao nao pode carregar um contador.
 *
 * A revisao e um registro APPEND-ONLY em `docs/revisoes.md`: numero
 * sequencial, data, contagem daquele momento, commit curto quando ha git, e a
 * nota do autor. Quem le o registro — `status`, `build`, `docx`, `context` —
 * carimba a revisao no que sai. Ninguem calcula numero: le do arquivo.
 *
 * O que isto NAO e: nao e versao semantica (prosa nao tem API), nao e tag de
 * git (o bookfw nao escreve no git de ninguem), e nao mora no manifesto.
 */
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ESTADOS_ATIVOS, Erro, acharProjeto, c, capitulos, escrever, hoje, rel } from './core.mjs';

/** Caminho relativo do registro, com barra normal: e o que aparece em mensagem e no `context`. */
export const ARQUIVO = 'docs/revisoes.md';

const CABECALHO = `# Revisoes da obra

Cada linha e uma revisao que saiu para leitura. O registro e **append-only**: uma
revisao nunca se edita — registra-se a proxima. O numero e o carimbo que vai no
manuscrito, na pagina de rosto e no nome do DOCX; a nota diz o que mudou desde a
anterior, e e por ela que um leitor externo descobre se precisa reler.

| # | Data | Capitulos | Palavras | Ressalvas | Commit | Nota |
|---|---|---|---|---|---|---|
`;

/** As revisoes registradas, da mais antiga para a mais nova. Vazio se nao ha arquivo. */
export function lerRevisoes(raiz) {
  const caminho = join(raiz, ARQUIVO);
  if (!existsSync(caminho)) return [];
  const out = [];
  for (const linha of readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    // So linha de dado da tabela: numero na primeira celula. Cabecalho e
    // separador nao casam, e prosa fora da tabela e ignorada.
    const m = linha.match(/^\|\s*(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*(.*?)\s*\|\s*$/);
    if (!m) continue;
    out.push({
      numero: Number(m[1]), data: m[2], capitulos: m[3].trim(), palavras: Number(m[4].replace(/\D/g, '')) || 0,
      ressalvas: m[5].trim(), commit: m[6].trim() || null, nota: m[7].trim(),
    });
  }
  return out.sort((a, b) => a.numero - b.numero);
}

/** A revisao corrente — a de maior numero — ou null. */
export function revisaoAtual(raiz) {
  const todas = lerRevisoes(raiz);
  return todas.length ? todas[todas.length - 1] : null;
}

/** "Revisao 3 — 2026-09-05", pronto para carimbo. */
export const carimbo = (r) => (r ? `Revisao ${r.numero} — ${r.data}` : '');

/** Commit curto do repositorio que contem a raiz, ou null. So leitura, nunca escreve. */
export function commitAtual(raiz) {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: raiz, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Celula de tabela: barra e quebra de linha quebrariam a linha do registro. */
const celula = (s) => String(s).replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim();

export function revisao(args) {
  const raiz = acharProjeto();
  const nota = args._.join(' ').trim();
  // Revisao sem motivo escrito e revisao que ninguem distingue da anterior — e
  // a nota e o unico campo que o autor preenche; o resto o comando le.
  if (!nota) {
    throw new Erro([
      'A revisao precisa de uma nota: o que mudou desde a anterior.',
      '       bookfw revisao "aplica a segunda leitura do revisor; cap. 16 reescrito"',
    ].join('\n'));
  }

  const caps = capitulos(raiz);
  const anteriores = lerRevisoes(raiz);
  // O proximo numero e o MAIOR existente mais um — nao a contagem de linhas.
  // Um buraco no registro (linha apagada a mao) nao pode fazer duas revisoes
  // colidirem no mesmo numero.
  const numero = anteriores.length ? anteriores[anteriores.length - 1].numero + 1 : 1;

  const porEstado = ESTADOS_ATIVOS
    .map((e) => [e, caps.filter((x) => x.estado === e).length])
    .filter(([, n]) => n > 0)
    .map(([e, n]) => `${n} ${e}`)
    .join(', ') || '0';
  const palavras = caps.reduce((a, x) => a + x.palavras, 0);
  const ressalvas = caps.filter((x) => [].concat(x.fm.verificar || []).length).length;
  const commit = commitAtual(raiz);

  const caminho = join(raiz, ARQUIVO);
  if (!existsSync(caminho)) escrever(caminho, CABECALHO);
  const linha = `| ${numero} | ${hoje()} | ${celula(porEstado)} | ${palavras} | ${ressalvas} | ${commit ?? ''} | ${celula(nota)} |\n`;
  appendFileSync(caminho, linha, 'utf8');

  console.log(`${c.green(`revisao ${numero} registrada`)}  ${rel(raiz, caminho)}`);
  console.log(c.dim(`  ${hoje()} | ${porEstado} | ${palavras} palavras | ${ressalvas} com ressalva${commit ? ` | commit ${commit}` : ''}`));
  console.log(c.dim(`  nota: ${nota}`));
  console.log(c.dim('  agora: bookfw docx — o arquivo sai com o numero da revisao no nome'));
  return { numero, caminho };
}
