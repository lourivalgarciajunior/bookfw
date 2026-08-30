/**
 * Núcleo do bookfw: descoberta de projeto, frontmatter, blocos de cena,
 * kanban de capítulos. Zero dependências — só node:fs e node:path.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ESTADOS = ['backlog', 'esboco', 'escrita', 'revisao', 'pronto', 'bloqueado', 'abandonado'];
export const ESTADOS_ATIVOS = ['backlog', 'esboco', 'escrita', 'revisao', 'pronto'];

export const ROOT_CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATES = join(ROOT_CLI, 'templates');

export const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

export class Erro extends Error {}

/** Sobe até achar livro.yaml. Todo comando roda na raiz do projeto do livro. */
export function acharProjeto(from = process.cwd()) {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, 'livro.yaml'))) return dir;
    const pai = dirname(dir);
    if (pai === dir) throw new Erro('Nenhum projeto bookfw aqui. Rode `bookfw init "Titulo"` primeiro.');
    dir = pai;
  }
}

/** YAML raso — chave: valor, listas inline [a, b] e listas com hífen. */
export function yamlRaso(texto) {
  const campos = {};
  let chaveLista = null;
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(linha) || !linha.trim()) continue;
    const item = linha.match(/^\s+-\s+(.*)$/);
    if (item && chaveLista) { campos[chaveLista].push(limpa(item[1])); continue; }
    const m = linha.match(/^([A-Za-zÀ-ÿ0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const valor = m[2].trim();
    if (valor === '') { chaveLista = m[1]; campos[m[1]] = []; continue; }
    chaveLista = null;
    campos[m[1]] = valor.startsWith('[')
      ? valor.replace(/^\[(.*)\]$/s, '$1').split(',').map(limpa).filter(Boolean)
      : limpa(valor);
  }
  return campos;
}
const limpa = (v) => v.trim().replace(/^["'](.*)["']$/s, '$1');

/** Separa frontmatter YAML do corpo do markdown. */
export function frontmatter(raw) {
  const t = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (!t.startsWith('---\n')) return { fm: {}, corpo: t };
  const fim = t.indexOf('\n---', 3);
  if (fim === -1) return { fm: {}, corpo: t };
  return { fm: yamlRaso(t.slice(4, fim)), corpo: t.slice(fim + 4).replace(/^\n/, '') };
}

export function lerConfig(raiz) {
  return yamlRaso(readFileSync(join(raiz, 'livro.yaml'), 'utf8'));
}

export const slug = (s) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const hoje = () => new Date().toISOString().slice(0, 10);

export function template(nome, subs = {}) {
  let t = readFileSync(join(TEMPLATES, nome), 'utf8');
  for (const [k, v] of Object.entries(subs)) t = t.replaceAll(`{{${k}}}`, v);
  return t;
}

export function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo, 'utf8');
  return caminho;
}

export const rel = (raiz, p) => p.replace(raiz, '').replace(/^[\\/]/, '').replace(/\\/g, '/');

/** Todos os capítulos do kanban, com estado, frontmatter, cenas e prosa. */
export function capitulos(raiz) {
  const out = [];
  for (const estado of ESTADOS) {
    const dir = join(raiz, 'capitulos', estado);
    if (!existsSync(dir)) continue;
    for (const arq of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const caminho = join(dir, arq);
      const raw = readFileSync(caminho, 'utf8');
      const { fm, corpo } = frontmatter(raw);
      out.push({
        arquivo: arq, caminho, estado, fm, corpo, raw,
        numero: Number(fm.numero ?? (arq.match(/cap-(\d+)/)?.[1] ?? 0)),
        cenas: cenasDe(corpo),
        palavras: palavras(prosaDe(corpo)),
      });
    }
  }
  return out.sort((a, b) => a.numero - b.numero);
}

/**
 * Contrato de cena: bloco ```cena com YAML raso. Os campos são os mesmos que
 * um roteiro pede depois — local, tempo, personagens, objetivo, conflito,
 * virada — então a adaptação lê daqui sem reler a prosa.
 */
export function cenasDe(corpo) {
  const cenas = [];
  const re = /```cena\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(corpo))) {
    const dados = yamlRaso(m[1]);
    const depois = corpo.slice(m.index + m[0].length);
    const prosa = depois.split(/\n## |\n```cena/)[0].replace(/<!--[\s\S]*?-->/g, '');
    cenas.push({ ...dados, prosa: prosa.trim(), palavras: palavras(prosa) });
  }
  return cenas;
}

/** Prosa = corpo sem os blocos de contrato e sem os cabeçalhos. */
export function prosaDe(corpo) {
  return corpo
    .replace(/```cena\n[\s\S]*?```/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#{1,6} .*$/gm, '');
}

export const palavras = (t) => (t.trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length;

export function moverCapitulo(raiz, nome, destino) {
  if (!ESTADOS.includes(destino)) throw new Erro(`Estado "${destino}" nao existe. Use: ${ESTADOS.join(', ')}`);
  const alvo = capitulos(raiz).find((cap) =>
    cap.arquivo === nome || cap.arquivo === `${nome}.md` || cap.fm.id === nome || String(cap.numero) === String(nome));
  if (!alvo) throw new Erro(`Capitulo "${nome}" nao encontrado.`);
  const novoDir = join(raiz, 'capitulos', destino);
  mkdirSync(novoDir, { recursive: true });
  const novo = join(novoDir, alvo.arquivo);
  const atualizado = alvo.raw.replace(/^(estado:\s*).*$/m, `$1${destino}`);
  writeFileSync(alvo.caminho, atualizado, 'utf8');
  if (novo !== alvo.caminho) renameSync(alvo.caminho, novo);
  return { de: alvo.estado, para: destino, caminho: novo };
}

/** Arquivos de um diretório de artefato (dec/, plano-diretor/, sumario/). */
export function artefatos(raiz, sub) {
  const dir = join(raiz, 'docs', sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
    .map((f) => {
      const caminho = join(dir, f);
      const { fm, corpo } = frontmatter(readFileSync(caminho, 'utf8'));
      return { arquivo: f, caminho, fm, corpo };
    });
}

/** Canon: um arquivo por personagem/lugar, o nome canônico no frontmatter. */
export function canon(raiz) {
  const ler = (sub) => {
    const dir = join(raiz, 'docs', 'canon', sub);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
    return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
      const { fm, corpo } = frontmatter(readFileSync(join(dir, f), 'utf8'));
      return { arquivo: f, nome: fm.nome || basename(f, '.md'), apelidos: [].concat(fm.apelidos || []), fm, corpo };
    });
  };
  return { personagens: ler('personagens'), lugares: ler('lugares') };
}

/** Promessas do PD: linhas `- P1 — texto` na seção Promessas. */
export function promessas(raiz) {
  const pd = artefatos(raiz, 'plano-diretor')[0];
  if (!pd) return [];
  const sec = pd.corpo.split(/^## /m).find((s) => /^Promessas/i.test(s)) || '';
  return [...sec.matchAll(/^-[ \t]*(P\d+)[ \t]*[—–-][ \t]*(\S.*)$/gm)]
    .filter((m) => !m[0].includes(String.fromCharCode(96)))
    .map((m) => ({ id: m[1], texto: m[2].trim() }));
}
