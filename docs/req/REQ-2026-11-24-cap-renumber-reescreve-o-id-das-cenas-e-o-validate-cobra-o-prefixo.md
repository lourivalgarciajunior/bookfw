---
status: Done
date: 2026-11-24
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-11-24-o-renumber-reescreve-o-prefixo-do-id-de-cena-e-o-gate-reprova-prefixo-que-nao-bate-com-o-numero.md"
roadmap: "docs/roadmaps/done/ROADMAP-2026-11-24-cap-renumber-reescreve-o-id-das-cenas-e-o-validate-cobra-o-prefixo.md"
---

# REQ: cap renumber reescreve o id das cenas e o validate cobra o prefixo

> Date: 2026-11-24 | Status: Done

## Motivation

`bookfw cap renumber` muda `numero`, `id` do frontmatter e o nome do arquivo,
mas deixa o `id:` de cada contrato de cena com o numero velho. Medido em
2026-11-24 na obra `pessoal/book/verde-nao-e-prova`, revisao 40: a troca dos
caps. 15, 16 e 17 passou no `validate` e deixou o cap. 15 com cenas `16.1` e
`16.2`, o 16 com `17.1/17.2`, o 17 com `15.1/15.2`. `bookfw brief 15 --cena
15.2` nao acha a cena e entrega, sem avisar, a primeira do capitulo (`Cena
16.1 de 2`); `bookfw cena add 15` numeraria a proxima como `16.3`. O gate nao
viu, e o defeito so apareceu numa revisao editorial.

## Acceptance Criteria

- [x] AC1 — `renumber 5 9` num capitulo com cenas `5.1` e `5.2` deixa `9.1` e `9.2` nos contratos.
- [x] AC2 — A troca em tres passos por numero temporario (A→99, B→A, 99→B) deixa cada capitulo com o prefixo do proprio numero.
- [x] AC3 — Nada fora dos blocos ```cena muda: linha `id: 5.1` na prosa ou num bloco de codigo comum fica igual, e o `# Titulo` do corpo tambem.
- [x] AC4 — Id de cena sem a forma `<numero velho>.<resto>` (por exemplo `abertura`, ou `7.1` num capitulo 5) nao e reescrito.
- [x] AC5 — O `renumber` diz quantos ids de cena reescreveu.
- [x] AC6 — Contrato com CRLF tem o id reescrito e o `\r\n` preservado.
- [x] AC7 — `validate` reprova cena com id `<n>.<resto>` em que `<n>` difere do `numero`, citando o arquivo, o id e o prefixo esperado; id sem essa forma nao e cobrado.
- [x] AC8 — `npm run check` passa, com teste de fumaca cobrindo AC1 a AC7, provado por mutacao (tirar a reescrita do id faz o teste falhar; tirar a regra do gate tambem).

## Negative scope — o que esta REQ NAO faz

- Nao corrige os ids de obra nenhuma: os seis da `verde-nao-e-prova` sao corrigidos na propria obra.
- Nao muda o `cena add`, nem o formato do id, nem renumera as cenas dentro do capitulo (`9.1`, `9.2` continuam na ordem em que estao).
- Nao faz `cenasDe` ler contrato com CRLF.
- Nao cobra id de cena duplicado nem lacuna na sequencia.
- Nao mexe no `retitle`.
- Nao muda o `brief --cena` que cai na primeira cena sem avisar quando o id nao existe: e outro defeito, e fica como residual declarado no roadmap.

## Linked ADR

ADR: docs/adr/ADR-2026-11-24-o-renumber-reescreve-o-prefixo-do-id-de-cena-e-o-gate-reprova-prefixo-que-nao-bate-com-o-numero.md

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: docs/roadmaps/done/ROADMAP-2026-11-24-cap-renumber-reescreve-o-id-das-cenas-e-o-validate-cobra-o-prefixo.md
