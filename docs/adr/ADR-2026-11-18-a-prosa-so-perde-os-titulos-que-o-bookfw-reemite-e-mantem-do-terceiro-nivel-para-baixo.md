---
status: Accepted
date: 2026-11-18
author: "Lourival Garcia"
---

# ADR: a prosa so perde os titulos que o bookfw reemite, e mantem do terceiro nivel para baixo

> Date: 2026-11-18 | Status: Accepted

## Context

O arquivo de capitulo mistura dois tipos de titulo. Um e estrutura do proprio
bookfw: o `# Titulo` do capitulo, que o `build` e o `docx` reemitem a partir do
frontmatter, e o `## Secao N` que separa as cenas, trocado por `* * *` na
costura. O outro e do autor: subtitulos dentro da prosa (`###`, `####`).

`prosaDe` e a extracao da prosa de cada cena, em `src/core.mjs`, tratam os dois
iguais e apagam `^#{1,6} .*$`. O efeito foi medido na obra
`pessoal/book/os-oito-modelos`, revisao 11: quatro subtitulos dos caps. 15, 16 e
19 sumiram do manuscrito e do DOCX, sem aviso, e o autor so soube pela revisao
editorial.

## Decision

A prosa perde **so** os niveis 1 e 2 (`^#{1,2} .*$`). Do `###` ao `######`, o
titulo fica no texto, com o nivel e o texto que o autor escreveu:

- no `build`, o capitulo abre com `## NN — titulo`, entao o `###` da prosa cai
  aninhado por baixo dele, sem renumerar;
- no `docx`, `markdown.mjs` ja reconhece titulo de qualquer nivel e o `docx.mjs`
  ja o desenha (`case 'titulo'`) — nada novo a desenhar.

A contagem de palavras usa a mesma prosa, entao passa a contar as palavras do
subtitulo mantido. E texto que o leitor le.

## Consequences

- Obra sem subtitulo na prosa: manuscrito, DOCX, contagem e `validate`
  identicos aos de antes.
- Obra com subtitulo: ganha o subtitulo de volta, e a contagem sobe pelas
  palavras dele.
- `brief` e `context`, que tambem usam `prosaDe`, passam a ver o subtitulo.
- Um `##` escrito pelo autor no meio da prosa continua sumindo, como hoje: e o
  nivel que o bookfw reserva para a cena. Isso fica dito aqui, e nao muda.

## Alternatives Considered

| Opcao | Por que nao |
|---|---|
| Rebaixar o subtitulo um nivel (`###` -> `####`) | o build ja aninha certo sob o `##` do capitulo; rebaixar so muda o que o autor escreveu |
| Converter o subtitulo em paragrafo em negrito | perde a semantica de titulo no DOCX, que ja sabe desenha-la |
| Manter como esta e documentar "nao use ###" | o defeito e silencioso: quem usa so descobre lendo o DOCX |
