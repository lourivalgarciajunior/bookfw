---
status: Done
date: 2026-09-20
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-09-20-fragmento-e-um-artefato-da-obra-com-posicao-declarada-costurado-por-build-e-docx-e-cobrado-pelo-gate.md"
roadmap: "docs/roadmaps/done/ROADMAP-2026-09-20-fragmentos-no-build-no-docx-e-no-gate.md"
---

# REQ: bookfw costura fragmentos entre capitulos no build e no docx, e o gate cobra posicao, id unico e promessa existente

> Date: 2026-09-20 | Status: Done

## Motivation

`bookfw build` e `bookfw docx` costuram apenas os capitulos do kanban. Obra que
intercala documento sem narrador entre capitulos nao tem onde guardar esse texto
de modo que ele saia no manuscrito.

Medido em 2026-09-20 na obra `pessoal/book/sartre-exe`: 12 fragmentos em
`docs/fragmentos/`, ignorados pelo `docx`. Para gerar o DOCX da revisao 2 (301
paginas) foi preciso injetar o corpo de cada fragmento no fim do capitulo
anterior, gerar, e reverter com `git checkout -- capitulos/`. Sem a reversao, 12
capitulos ficam com texto que nao e deles, e o `status` conta palavras de
documento como palavras de prosa.

## Acceptance Criteria

- [x] AC1 — Fragmento e lido de `docs/fragmentos/*.md` com frontmatter `id`, `depois_do_capitulo`, `tipo` e `promessas`. Diretorio ausente nao e erro e nao gera aviso.
- [x] AC2 — `bookfw build` intercala o corpo do fragmento depois do capitulo indicado, com separador proprio, e imprime quantos fragmentos emitiu.
- [x] AC3 — A contagem de palavras e de paginas do `build` inclui o corpo dos fragmentos emitidos.
- [x] AC4 — `bookfw docx` emite os mesmos fragmentos, em pagina propria, com titulo em italico e corpo um ponto menor que o do capitulo, lendo a mesma selecao do `build`.
- [x] AC5 — Fragmento cujo `depois_do_capitulo` aponta para capitulo abaixo do corte nao e emitido por nenhum dos dois.
- [x] AC6 — `bookfw validate` reprova (erro) fragmento com `depois_do_capitulo` ausente, nao numerico, ou apontando para capitulo que nao existe no kanban.
- [x] AC7 — `bookfw validate` reprova (erro) `id` duplicado entre fragmentos, e reprova `id` ausente.
- [x] AC8 — `bookfw validate` reprova (erro) promessa declarada em fragmento que nao existe no plano diretor, e aceita a mesma promessa declarada em cena.
- [x] AC9 — Promessa declarada em fragmento conta como PLANTADA na regra de Chekhov. Fragmento nao paga promessa: campo `paga` em fragmento e erro.
- [x] AC10 — `bookfw status` mostra a contagem de fragmentos ao lado da de capitulos.
- [x] AC11 — `npm run lint` e `npm test` passam, com teste de fumaca cobrindo AC2, AC5, AC6, AC7, AC8 e AC9.
- [x] AC12 — Obra sem `docs/fragmentos/` produz build, docx, validate e status identicos aos de antes desta REQ.

## Negative scope — o que esta REQ NAO faz

- Nao cria comando `bookfw fragmento new`. O arquivo e escrito a mao ou pelo agente; criar comando antes de a convencao assentar e adivinhar o formato.
- Nao migra fragmento ja injetado dentro de capitulo. Quem fez a gambiarra move a mao.
- Nao mexe no `bookfw pdf`: ele converte o DOCX, entao herda os fragmentos de graca.
- Nao mexe no divisor de Parte, nem no bug do ato `2a`/`2b` (`Number('2a')` e NaN, e o divisor nao sai). Fica registrado aqui e vira REQ propria.
- Nao acrescenta fragmento ao `bookfw context` nem ao `brief`.
- Nao versiona fragmento no kanban, nem lhe da estado.

## Linked ADR

ADR: docs/adr/ADR-2026-09-20-fragmento-e-um-artefato-da-obra-com-posicao-declarada-costurado-por-build-e-docx-e-cobrado-pelo-gate.md

## Blocked by ADRs

<!-- none -->

## Linked Roadmap

Roadmap: docs/roadmaps/done/ROADMAP-2026-09-20-fragmentos-no-build-no-docx-e-no-gate.md
