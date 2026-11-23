---
status: Open
date: 2026-11-23
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-11-18-a-prosa-so-perde-os-titulos-que-o-bookfw-reemite-e-mantem-do-terceiro-nivel-para-baixo.md"
roadmap: "docs/roadmaps/wip/ROADMAP-2026-11-23-build-e-docx-preservam-as-linhas-de-dentro-dos-blocos-de-codigo.md"
---

# REQ: build e docx preservam as linhas de dentro dos blocos de codigo

> Date: 2026-11-23 | Status: Open

## Motivation

`bookfw build` e `bookfw docx` apagam de dentro de bloco de codigo cercado toda
linha que comeca com `# ` ou `## `. Medido em 2026-11-23 na obra
`pessoal/book/verde-nao-e-prova`, revisao 35: o cap. 4 tem, dentro de um bloco
```, a linha `# gate: nenhuma data em UTC na remessa` (comentario de shell), e o
manuscrito costurado e o DOCX saem com a linha em branco. A prosa logo abaixo
diz "Tres linhas... A segunda e o comentario". O cap. 29 perde o comentario do
`confere-agendador.sh` do mesmo jeito. A fonte do capitulo esta certa.

A causa e `TITULO_DE_ESTRUTURA` (`/^#{1,2} .*$/gm`) em `src/core.mjs`, aplicada
pela `prosaDe` e pela extracao da prosa por cena (`cenasDe`) ao texto inteiro,
sem saber que esta dentro de cerca. O mesmo vale para o comentario HTML, que sai
de dentro do bloco. Dentro de cerca nada e titulo nem nota de trabalho: e texto
literal, e o ADR-2026-11-18 ja diz que a prosa so perde os titulos que o bookfw
reemite.

## Acceptance Criteria

- [ ] AC1 — Linha `# ...` e `## ...` dentro de bloco cercado por ``` sai no manuscrito do `build`, igual a fonte.
- [ ] AC2 — O mesmo dentro de bloco cercado por `~~~`.
- [ ] AC3 — Vale nos dois caminhos: capitulo com contrato de cena (`cenasDe`) e capitulo sem contrato (`prosaDe`).
- [ ] AC4 — `# Titulo` do capitulo e `## Cena N` fora de cerca continuam saindo da prosa, como na 0.10.1.
- [ ] AC5 — Comentario HTML dentro de cerca sai literal; fora de cerca continua sumindo.
- [ ] AC6 — No DOCX, a linha `# ...` de dentro do bloco aparece no bloco de codigo.
- [ ] AC7 — `npm run check` passa, com teste de fumaca cobrindo AC1 a AC6, provado por mutacao (tirar a protecao de cerca faz o teste falhar).

## Negative scope — o que esta REQ NAO faz

- Nao muda o parser de Markdown do DOCX (`src/markdown.mjs`), que ja trata cerca.
- Nao trata cerca indentada de lista nem cerca de quatro crases; o reconhecimento de cerca e o mesmo do `src/markdown.mjs` (`^\s*(?:```|~~~)`).
- Nao mexe na extracao do titulo de fragmento (`fragmentos`, primeiro `# ` do corpo).
- Nao corrige o contrato ```cena com CRLF nem o `validate`.
- Nao regenera manuscrito de obra nenhuma.

## Linked ADR

ADR: docs/adr/ADR-2026-11-18-a-prosa-so-perde-os-titulos-que-o-bookfw-reemite-e-mantem-do-terceiro-nivel-para-baixo.md

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: docs/roadmaps/wip/ROADMAP-2026-11-23-build-e-docx-preservam-as-linhas-de-dentro-dos-blocos-de-codigo.md
