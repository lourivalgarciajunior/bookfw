/**
 * Fichas do canon. O gate reprova cena com personagem sem ficha, entao criar
 * ficha tem de ser um comando — antes disto o CLI cobrava um artefato que ele
 * mesmo nao sabia produzir, e toda ficha nascia na mao.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharProjeto, c, canon, escrever, rel, slug, template } from './core.mjs';

const TIPOS = {
  personagem: { dir: 'personagens', arquivo: 'personagem.md' },
  lugar: { dir: 'lugares', arquivo: 'lugar.md' },
};
// plural tambem serve: o diretorio se chama personagens/, e digitar o nome do
// diretorio e o erro que qualquer um comete uma vez.
const APELIDOS_TIPO = { personagens: 'personagem', lugares: 'lugar' };

export function canonNew(args) {
  const raiz = acharProjeto();
  const pedido = String(args._.shift() || '').toLowerCase();
  const tipo = TIPOS[pedido] ? pedido : APELIDOS_TIPO[pedido];
  if (!tipo) throw new Erro(`Uso: bookfw canon new personagem|lugar "Nome"`);

  const nome = args._.join(' ').trim();
  if (!nome) throw new Erro(`Uso: bookfw canon new ${tipo} "Nome"`);
  if (nome.includes(':')) throw new Erro('Nome com ":" — o NTFS trunca o arquivo para 0 byte. Use travessao ou hifen.');

  const apelidos = String(args.apelidos || '').split(',').map((x) => x.trim()).filter(Boolean);

  // Nome repetido e o comeco de toda contradicao de canon: duas fichas do mesmo
  // sujeito divergem em silencio. Vale para apelido tambem, e entre personagem
  // e lugar — a cena declara os dois no mesmo espaco de nomes.
  const cn = canon(raiz);
  const usados = new Map();
  for (const [rotulo, lista] of [['personagem', cn.personagens], ['lugar', cn.lugares]]) {
    for (const ficha of lista) {
      for (const n of [ficha.nome, ...ficha.apelidos]) usados.set(String(n).toLowerCase(), { rotulo, ficha });
    }
  }
  for (const n of [nome, ...apelidos]) {
    const choque = usados.get(n.toLowerCase());
    if (choque) {
      throw new Erro(`"${n}" ja esta no canon como ${choque.rotulo} em ${choque.ficha.arquivo}.\n`
        + `       Dois nomes iguais divergem em silencio — edite a ficha existente ou escolha outro nome.`);
    }
  }

  const { dir, arquivo } = TIPOS[tipo];
  const caminho = join(raiz, 'docs', 'canon', dir, `${slug(nome)}.md`);
  if (existsSync(caminho)) throw new Erro(`${rel(raiz, caminho)} ja existe.`);

  const subs = tipo === 'personagem'
    ? { nome, apelidos: `[${apelidos.join(', ')}]`, papel: args.papel || '', resumo: args.resumo || '' }
    : { nome, tipo: args.tipo || '', resumo: args.resumo || '' };
  escrever(caminho, template(arquivo, subs));

  console.log(`${c.green(`Ficha de ${tipo} criada`)}  ${rel(raiz, caminho)}`);
  console.log(c.dim('  preencha com /bookfw:canon — o agente book-clio conduz'));
}
