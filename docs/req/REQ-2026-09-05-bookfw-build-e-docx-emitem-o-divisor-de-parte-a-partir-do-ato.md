---
status: Done
date: 2026-09-05
author: "Lourival Garcia"
adr: "ADR-2026-09-05-o-divisor-de-parte-sai-da-tabela-estrutura-do-plano-diretor-casado-pelo-ato-do-capitulo"
roadmap: "ROADMAP-2026-09-05-divisor-de-parte"
---

# REQ: bookfw build e docx emitem o divisor de Parte a partir do ato

> Date: 2026-09-05 | Status: Done
| Linear Issue:
| Jira Issue:

## Motivation

A estrutura em Partes que o autor declara no plano diretor nao chega ao leitor.
Em "Os Oito Modelos" o capitulo 1 anuncia quatro Partes, o PD nomeia as quatro,
os 23 capitulos tem `ato` preenchido — e o manuscrito sai com zero divisores. O
mapa existe so na introducao.

Os dois lados ja estao no disco; falta o `build` e o `docx` casarem um com o
outro. Decisao de desenho no ADR vinculado.

## Acceptance Criteria

- [x] `partes(raiz)` em `core.mjs` le a tabela `## Estrutura` do plano diretor e
      devolve, por numero de ato, o titulo da Parte.
- [x] O casamento e por algarismo romano no inicio da primeira celula; sem
      romano, pela ordem das linhas.
- [x] `build` emite `## Parte <romano> — <titulo>` antes do primeiro capitulo de
      cada ato, e a saida diz quantas Partes emitiu.
- [x] `docx` emite uma **pagina propria** por Parte, com o romano e o titulo,
      antes do primeiro capitulo do ato.
- [x] Sem `## Estrutura` no PD, ou sem `ato` nos capitulos, nada muda e nao ha
      erro.
- [x] Ato sem linha correspondente na tabela nao emite divisor e **avisa** —
      silencio ali esconde ato errado no frontmatter.
- [x] Smoke cobre: divisor no manuscrito, contagem na saida, obra sem Estrutura
      segue igual, ato orfao avisa.
- [x] README e CHANGELOG documentam; versao sobe para 0.6.0.

### Escopo negativo

Nao implementar: numeracao automatica de Parte que ignore o `ato`, titulo de
Parte no `livro.yaml` ou no frontmatter de capitulo, sumario automatico, e
qualquer mudanca no nivel de cabecalho dos capitulos no manuscrito.

## Linked ADR

ADR: `docs/adr/ADR-2026-09-05-o-divisor-de-parte-sai-da-tabela-estrutura-do-plano-diretor-casado-pelo-ato-do-capitulo.md`

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: `docs/roadmaps/done/ROADMAP-2026-09-05-divisor-de-parte.md`
