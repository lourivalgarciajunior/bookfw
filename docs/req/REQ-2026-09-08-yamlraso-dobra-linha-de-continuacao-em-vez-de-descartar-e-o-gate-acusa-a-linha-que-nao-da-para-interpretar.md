---
status: Open
date: 2026-09-08
author: "Lourival Garcia"
adr: "ADR-2026-09-08-o-contrato-de-cena-dobra-a-linha-de-continuacao-e-o-que-nao-dobra-reprova-no-gate-em-vez-de-sumir"
roadmap: "docs/roadmaps/wip/ROADMAP-2026-09-08-yamlraso-dobra-continuacao.md"
---

# REQ: yamlRaso dobra linha de continuacao em vez de descartar, e o gate acusa a linha que nao da para interpretar

> Date: 2026-09-08 | Status: Open

## Motivation

`yamlRaso` (src/core.mjs) le chave e valor linha a linha. Linha que nao casa
`^chave:` cai num `continue` mudo: o texto desaparece, `bookfw validate`
continua verde e `bookfw status` conta as cenas normalmente. Ninguem e avisado.

Quatro caminhos de perda, todos reproduzidos em 2026-09-08 antes de escrever
esta REQ:

| Entrada | Saida hoje | O que se perde |
|---|---|---|
| `virada: texto` + linha indentada de continuacao | `virada` fica so com a primeira parte | o resto da frase |
| `virada:` + linha indentada sem `- ` | `virada` vira `[]` | a frase inteira, e o campo troca de tipo |
| `virada: texto` + continuacao **nao** indentada | so a primeira parte | o resto da frase |
| continuacao contendo `:` | so a primeira parte | o resto da frase |

O formato empurra para o defeito. Os capitulos sao hard-wrapped em 79 colunas
e as linhas de contrato de cena das obras reais chegam a **114 colunas** — a
quebra e o que qualquer pessoa, ou qualquer agente, faz. Foi assim que apareceu:
uma agente escrevendo o capitulo 4 de `os-oito-modelos` quebrou a `virada` da
cena 4.2, perdeu metade do valor, e so percebeu porque foi reler o arquivo. O
gate nao pegou.

Varredura nas tres obras reais (`os-oito-modelos`, `metamorfose`,
`cris-e-cristina`) em 2026-09-08: **nenhuma linha perdida hoje**. E armadilha
latente, nao perda em curso — o que muda a urgencia, nao a natureza.

`yamlRaso` tem tres chamadores, e o defeito atinge os tres: `frontmatter` (de
capitulo e de DEC), `lerConfig` (`livro.yaml`) e `cenasDe` (contrato de cena).

## Acceptance Criteria

- [ ] Linha de continuacao — indentada ou nao — que siga uma chave escalar e
      **dobrada** no valor dessa chave, separada por um espaco.
- [ ] Chave declarada sem valor, seguida de linha que **nao** e `- item`, produz
      escalar dobrado, e nao lista vazia.
- [ ] Chave declarada sem valor, seguida de `- item`, continua produzindo lista.
      Sem regressao: lista em bloco, lista em linha `[a, b, c]`, valor entre
      aspas e comentario `#` seguem como estao.
- [ ] Linha que nao da para interpretar — bare line sem chave escalar anterior,
      ou bare line depois de uma lista ja iniciada — nao e mais descartada em
      silencio: vira problema reportado, com numero da linha e o texto.
- [ ] `bookfw validate` **acusa** esse problema e falha. O gate que existe para
      pegar contrato quebrado passa a pegar contrato quebrado.
- [ ] Teste de regressao em `test/smoke.mjs` para cada um dos quatro caminhos
      da tabela acima, provado por mutacao: com a correcao revertida, vermelho.
- [ ] `npm run lint` e `npm test` verdes.
- [ ] Nas tres obras reais, `bookfw validate` e `bookfw status` antes e depois:
      contagem de capitulos, cenas e palavras **identica**. Diferenca significa
      contrato que ja estava truncado, e ai o achado e outro e precisa ser dito.

## Escopo negativo — o que nao se implementa

- Nao vira parser YAML de verdade. Nada de ancora, tag, documento multiplo,
  escalar literal `|`, aspas com escape ou aninhamento. O formato e raso de
  proposito e continua raso.
- Nao se mexe no hard-wrap dos capitulos nem se cria comando para reformatar
  contrato de cena.
- Nao se altera o conjunto de campos obrigatorios do contrato (`objetivo`,
  `conflito`, `virada`).

## Linked ADR

ADR: `docs/adr/ADR-2026-09-08-o-contrato-de-cena-dobra-a-linha-de-continuacao-e-o-que-nao-dobra-reprova-no-gate-em-vez-de-sumir.md`

## Linked Roadmap

Roadmap: docs/roadmaps/wip/ROADMAP-2026-09-08-yamlraso-dobra-continuacao.md
