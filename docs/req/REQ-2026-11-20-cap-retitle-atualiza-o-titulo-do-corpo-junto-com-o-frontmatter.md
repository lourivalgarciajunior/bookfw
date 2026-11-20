---
status: Done
date: 2026-11-20
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-11-20-o-retitle-troca-o-titulo-do-corpo-so-quando-ele-repete-o-titulo-antigo.md"
roadmap: "docs/roadmaps/done/ROADMAP-2026-11-20-cap-retitle-atualiza-o-titulo-do-corpo-junto-com-o-frontmatter.md"
---

# REQ: cap retitle atualiza o titulo do corpo junto com o frontmatter

> Date: 2026-11-20 | Status: Done

## Motivation

`bookfw cap retitle` renomeia o arquivo e reescreve `id` e `titulo` no
frontmatter, mas deixa o `# Titulo` do corpo com o titulo antigo. Medido em
2026-11-20 na obra `pessoal/book/verde-nao-e-prova`, duas vezes: o cap. 30
ficou com `# Vinte e uma horas em São Paulo` depois de retitulado para
"Vinte e uma horas em Arapongas", e o cap. 1 tinha ficado com `# Diga oi`.
A causa e `reescrever` em `src/cap.mjs`, que so faz replace dentro do
frontmatter.

## Acceptance Criteria

- [x] AC1 — Depois de `bookfw cap retitle <n> "Novo"`, o capitulo cujo corpo abre com `# <titulo antigo>` passa a abrir com `# Novo`.
- [x] AC2 — H1 cujo texto difere do titulo antigo nao e tocado, e a saida do comando diz que o titulo do corpo foi mantido.
- [x] AC3 — Linha `# <titulo antigo>` que nao e a primeira linha nao vazia do corpo (prosa, bloco de codigo) nao e tocada.
- [x] AC4 — Funciona com CRLF: arquivo com `\r\n` sai com o H1 trocado e as quebras preservadas.
- [x] AC5 — `cap renumber` continua sem mexer no corpo.
- [x] AC6 — `npm run check` passa, com teste de fumaca cobrindo AC1, AC2, AC3 e AC4, provado por mutacao (tirar a troca do H1 faz o teste falhar).

## Negative scope — o que esta REQ NAO faz

- Nao conserta capitulos ja retitulados antes desta versao (H1 velho que nao repete o titulo atual).
- Nao acrescenta gate no `validate` comparando H1 e frontmatter.
- Nao cria H1 em capitulo que nao tem.
- Nao muda `build`, `docx`, `brief` nem `context`.

## Linked ADR

ADR: docs/adr/ADR-2026-11-20-o-retitle-troca-o-titulo-do-corpo-so-quando-ele-repete-o-titulo-antigo.md

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: docs/roadmaps/done/ROADMAP-2026-11-20-cap-retitle-atualiza-o-titulo-do-corpo-junto-com-o-frontmatter.md
