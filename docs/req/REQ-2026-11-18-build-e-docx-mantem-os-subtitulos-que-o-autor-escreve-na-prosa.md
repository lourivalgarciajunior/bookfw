---
status: Done
date: 2026-11-18
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-11-18-a-prosa-so-perde-os-titulos-que-o-bookfw-reemite-e-mantem-do-terceiro-nivel-para-baixo.md"
roadmap: "docs/roadmaps/done/ROADMAP-2026-11-18-build-e-docx-mantem-os-subtitulos-que-o-autor-escreve-na-prosa.md"
---

# REQ: build e docx mantem os subtitulos que o autor escreve na prosa

> Date: 2026-11-18 | Status: Done

## Motivation

O `bookfw build` e o `bookfw docx` apagam todo titulo de markdown que o autor
escreve dentro da prosa de um capitulo. Medido em 2026-11-18 na obra
`pessoal/book/os-oito-modelos`: os quatro subtitulos internos dos caps. 15, 16 e
19 (`### O grupo UB`, `### O que desapareceu, e quase ninguem reparou`,
`#### O codigo que aponta para o artigo`, `#### A DeRE, e por que ela nao e um
formulario`) nao estao no `manuscrito/*.md` nem no DOCX da revisao 11. No lugar
de cada um fica uma linha em branco. No cap. 15, sem o subtitulo, "essa nota
tecnica" passa a apontar a nota errada. A revisao editorial da obra
(`docs/canon/veredito-revisao-11-obra.md`, ajuste 13 e decisao 62) achou o
defeito; a obra contornou trocando os subtitulos por negrito.

A causa sao duas regex iguais em `src/core.mjs`: `prosaDe` e a extracao da
prosa de cada cena (`cenas`) fazem `.replace(/^#{1,6} .*$/gm, '')`. O que elas
precisam tirar e so a estrutura que o proprio bookfw gera e reemite: o `# Titulo`
do capitulo e o `## Secao N` de cada cena. O `docx` ja sabe desenhar bloco
`titulo` de qualquer nivel (`markdown.mjs`, `TITULO`; `docx.mjs`, `case
'titulo'`), e o manuscrito ja abre o capitulo com `## NN — titulo`, de modo que
`###` e `####` da prosa caem aninhados por baixo dele.

## Acceptance Criteria

- [x] AC1 — `###`, `####`, `#####` e `######` escritos na prosa de um capitulo saem no `manuscrito/*.md` do `bookfw build`, com o mesmo nivel e o mesmo texto.
- [x] AC2 — Os mesmos subtitulos saem no DOCX do `bookfw docx` como paragrafo de titulo (negrito), e nao somem.
- [x] AC3 — O `# Titulo` do capitulo e o `## Secao N` das cenas continuam fora do manuscrito e do DOCX, como hoje.
- [x] AC4 — Vale para capitulo com cenas (prosa extraida por cena) e para capitulo sem contrato de cena (`prosaDe`).
- [x] AC5 — A contagem de palavras de capitulo e de cena passa a incluir as palavras dos subtitulos mantidos, e nada mais muda: obra sem `###`/`####` na prosa produz manuscrito, contagem e `validate` identicos aos de antes.
- [x] AC6 — `npm run check` passa, com teste de fumaca cobrindo AC1, AC3 e AC4, provado por mutacao (voltar a regex antiga faz o teste falhar).

## Negative scope — o que esta REQ NAO faz

- Nao rebaixa nem renumera nivel de titulo: `###` sai `###`.
- Nao muda o estilo visual do titulo no DOCX (tamanho, fonte), que ja existe em `docx.mjs`.
- Nao poe subtitulo no sumario do DOCX nem no indice.
- Nao mexe no `brief` nem no `context`, que tambem usam `prosaDe`: eles passam a ver o subtitulo, o que e o certo, e nao ganham nada alem disso.
- Nao desfaz o contorno da obra os-oito-modelos (negrito); a volta ao subtitulo e decisao do autor.

## Linked ADR

ADR: docs/adr/ADR-2026-11-18-a-prosa-so-perde-os-titulos-que-o-bookfw-reemite-e-mantem-do-terceiro-nivel-para-baixo.md

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: docs/roadmaps/done/ROADMAP-2026-11-18-build-e-docx-mantem-os-subtitulos-que-o-autor-escreve-na-prosa.md
