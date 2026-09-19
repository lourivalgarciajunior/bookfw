/**
 * O indice de nomes da versao de leitura. Os termos saem do canon — o `nome`
 * e os `apelidos` de cada ficha de personagem — e o apelido so vale dentro da
 * cena que declara a ficha em `personagens:`. Ver ADR-2026-09-18.
 *
 * A cena resolve o homonimo sem pergunta nenhuma: "Jose" e Jose de Nazare no
 * capitulo que o declara e Jose do Egito no capitulo que declara o outro.
 * Buscar o nome no livro inteiro atribuiria a um as paginas do outro.
 */

const texto = (v) => (Array.isArray(v) ? v.join('; ') : String(v ?? '')).trim();
const lista = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[;,]/)).map((x) => String(x).trim()).filter(Boolean);
const chave = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * As fichas que entram no indice, por nome normalizado. So termo que comeca
 * com maiuscula vale: apelido descritivo ("o carpinteiro", "prima de Maria")
 * marcaria qualquer carpinteiro do livro.
 */
export function fichasDoIndice(personagens = [], excluir = []) {
  const fora = new Set(lista(excluir).map(chave));
  const mapa = new Map();
  for (const f of personagens) {
    const nome = texto(f.nome);
    if (!nome || fora.has(chave(nome))) continue;
    const termos = [nome, ...[].concat(f.apelidos || []).map(texto)]
      .filter((t) => /^\p{Lu}/u.test(t));
    mapa.set(chave(nome), { nome, termos: [...new Set(termos)] });
  }
  return mapa;
}

/**
 * Os termos de uma cena, do mais longo para o mais curto. Termo que duas
 * fichas declaradas na mesma cena compartilham e ambiguo e fica de fora.
 */
export function termosDaCena(fichas, personagens) {
  const donos = new Map();
  for (const p of lista(personagens)) {
    const f = fichas.get(chave(p));
    if (!f) continue;
    for (const t of f.termos) {
      if (!donos.has(t)) donos.set(t, new Set());
      donos.get(t).add(f.nome);
    }
  }
  return [...donos].filter(([, d]) => d.size === 1)
    .map(([termo, d]) => ({ termo, nome: [...d][0] }))
    .sort((a, b) => b.termo.length - a.termo.length);
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Onde marcar, num trecho: a posicao logo depois do termo, uma vez por nome.
 * O termo mais longo consome o trecho primeiro — "Maria Rita" nao deixa
 * "Maria" casar dentro dele. `vistos` e do paragrafo inteiro: o indice aponta
 * pagina, e dois pontos do mesmo paragrafo quase sempre caem na mesma.
 */
export function acharTermos(trecho, termos, vistos = new Set()) {
  let mascara = trecho;
  const out = [];
  for (const { termo, nome } of termos) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(termo)}(?![\\p{L}\\p{N}])`, 'gu');
    for (const m of mascara.matchAll(re)) {
      if (!vistos.has(nome)) {
        vistos.add(nome);
        out.push({ fim: m.index + m[0].length, nome });
      }
      mascara = mascara.slice(0, m.index) + '\u0000'.repeat(m[0].length) + mascara.slice(m.index + m[0].length);
    }
  }
  return out.sort((a, b) => a.fim - b.fim);
}

/** A instrucao do campo. Aspas e barra invertida quebrariam o campo. */
export const limparCampo = (s) => String(s).replace(/["\\]/g, '').trim();
export const campoXE = (nome) => `XE "${limparCampo(nome)}"`;
