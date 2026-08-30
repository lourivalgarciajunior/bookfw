/**
 * Gate de governanca da obra. Zero violacoes antes de fechar capitulo ou
 * commitar. As regras existem porque texto longo quebra sempre nos mesmos
 * lugares: cena sem conflito, personagem que muda de nome, promessa que o
 * desfecho nao paga.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { acharProjeto, artefatos, c, canon, capitulos, lerConfig, promessas, rel } from './core.mjs';

const OBRIGATORIOS = ['objetivo', 'conflito', 'virada'];

export function validate(args) {
  const raiz = acharProjeto();
  const cfg = lerConfig(raiz);
  const erros = [];
  const avisos = [];
  const erro = (onde, msg) => erros.push(`${onde}: ${msg}`);
  const aviso = (onde, msg) => avisos.push(`${onde}: ${msg}`);

  // ---- cadeia
  const decs = artefatos(raiz, 'dec');
  const pds = artefatos(raiz, 'plano-diretor');
  const sums = artefatos(raiz, 'sumario');
  if (!pds.length) erro('docs/plano-diretor', 'nenhum plano diretor — escrever capitulo sem PD e escrever no escuro');
  if (!decs.length) aviso('docs/dec', 'nenhuma DEC — POV, tempo verbal e tipo de final nao estao fixados');
  if (pds.length && !sums.length) erro('docs/sumario', 'plano diretor sem sumario — nao ha o que escrever cena a cena');

  const caps = capitulos(raiz);
  const cn = canon(raiz);
  const nomesCanon = new Set(
    [...cn.personagens, ...cn.lugares].flatMap((x) => [x.nome, ...x.apelidos]).map((n) => n.toLowerCase()),
  );
  const proms = promessas(raiz);
  const pagas = new Set();
  const plantadas = new Set();

  // ---- WIP
  const emEscrita = caps.filter((x) => x.estado === 'escrita');
  const wip = Number(cfg.wip_limit || 1);
  if (emEscrita.length > wip) {
    erro('capitulos/escrita', `${emEscrita.length} capitulos em escrita, limite e ${wip} — feche ou mova para bloqueado`);
  }

  // ---- numeracao
  const vistos = new Map();
  for (const cap of caps) {
    if (vistos.has(cap.numero)) erro(rel(raiz, cap.caminho), `numero ${cap.numero} duplicado com ${vistos.get(cap.numero)}`);
    else vistos.set(cap.numero, cap.arquivo);
  }

  // ---- capitulo a capitulo
  for (const cap of caps) {
    const onde = rel(raiz, cap.caminho);
    if (cap.estado === 'abandonado') continue;
    if (cap.fm.estado && cap.fm.estado !== cap.estado) {
      erro(onde, `frontmatter diz estado "${cap.fm.estado}" mas o arquivo esta em ${cap.estado}/`);
    }
    if (cap.estado !== 'backlog' && cap.cenas.length === 0) {
      erro(onde, 'sem contrato de cena — bloco ```cena e o que o escritor recebe de briefing');
    }
    cap.cenas.forEach((cena, i) => {
      const tag = `${onde} cena ${cena.id || i + 1}`;
      const emBranco = OBRIGATORIOS.filter((campo) => !cena[campo] || String(cena[campo]).trim() === '');
      if (emBranco.length && cap.estado === 'backlog') {
        // em backlog o contrato ainda esta em branco de proposito
        aviso(tag, `contrato em branco (${emBranco.join(', ')}) — preencha antes de mover para esboco`);
      } else {
        for (const campo of emBranco) erro(tag, `sem "${campo}" — cena sem ${campo} vira resumo, nao cena`);
      }
      for (const nome of [].concat(cena.personagens || [])) {
        if (nome && !nomesCanon.has(String(nome).toLowerCase())) {
          erro(tag, `personagem "${nome}" nao existe no canon — crie docs/canon/personagens/`);
        }
      }
      if (String(cena.local || '').trim() && !nomesCanon.has(String(cena.local).toLowerCase())) {
        aviso(tag, `local "${cena.local}" nao esta no canon`);
      }
      for (const p of [].concat(cena.promessas || [])) plantadas.add(p);
      for (const p of [].concat(cena.paga || [])) pagas.add(p);
      // foco = personagem cuja cabeca o leitor ocupa; nao confundir com a
      // pessoa narrativa, que e da obra inteira e mora no livro.yaml
      const foco = String(cena.foco || '').trim();
      if (foco && foco !== 'a definir') {
        if (!nomesCanon.has(foco.toLowerCase())) erro(tag, `foco "${foco}" nao existe no canon`);
        const focoCap = String(cap.fm.foco || '').trim();
        if (focoCap && focoCap !== 'a definir' && focoCap.toLowerCase() !== foco.toLowerCase()) {
          aviso(tag, `foco "${foco}" diferente do foco do capitulo ("${focoCap}") — troca de ponto de vista no meio do capitulo desorienta o leitor`);
        }
      }
    });

    if (['revisao', 'pronto'].includes(cap.estado)) {
      const alvo = Number(cap.fm.palavras_alvo || 0);
      if (alvo && (cap.palavras < alvo * 0.6 || cap.palavras > alvo * 1.6)) {
        aviso(onde, `${cap.palavras} palavras contra alvo ${alvo} — fora da faixa`);
      }
      if (cap.palavras < 200) erro(onde, `so ${cap.palavras} palavras de prosa — capitulo em ${cap.estado} sem texto escrito`);
    }
  }

  // ---- Chekhov: toda promessa do PD tem plantio e pagamento
  const fechado = caps.length > 0 && caps.every((x) => ['pronto', 'abandonado'].includes(x.estado));
  for (const p of proms) {
    if (!plantadas.has(p.id)) {
      (fechado ? erro : aviso)('plano-diretor', `promessa ${p.id} ("${p.texto}") nao aparece em nenhuma cena`);
    } else if (!pagas.has(p.id)) {
      (fechado ? erro : aviso)('plano-diretor', `promessa ${p.id} plantada e nunca paga — declare "paga: [${p.id}]" na cena de desfecho`);
    }
  }

  // ---- style card
  if (!existsSync(join(raiz, 'docs/style-card.md'))) {
    aviso('docs/style-card.md', 'sem style card — a primeira versao vai sair com voz de modelo, nao com a sua');
  }

  if (args.json) {
    console.log(JSON.stringify({ erros, avisos, capitulos: caps.length, promessas: proms.length }, null, 2));
    return erros.length ? 1 : 0;
  }

  console.log(`capitulos ${caps.length} | cenas ${caps.reduce((a, x) => a + x.cenas.length, 0)} | palavras ${caps.reduce((a, x) => a + x.palavras, 0)}`);
  for (const a of avisos) console.log(`  ${c.yellow('aviso')}  ${a}`);
  for (const e of erros) console.log(`  ${c.red('ERRO')}   ${e}`);
  if (erros.length) {
    console.log(`\n${erros.length} violacao(oes). Gate reprovado.`);
    return 1;
  }
  console.log(`\n${c.green('OK')}${avisos.length ? ` — ${avisos.length} aviso(s)` : ''}.`);
  return 0;
}
