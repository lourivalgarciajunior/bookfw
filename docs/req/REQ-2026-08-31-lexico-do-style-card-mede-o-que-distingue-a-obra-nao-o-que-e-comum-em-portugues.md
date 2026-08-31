---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-lexico-do-style-card-separa-conteudo-de-tique-de-voz-e-declara-amostra-insuficiente"
roadmap: "ROADMAP-2026-08-31-lexico-do-style-card-mede-o-que-distingue-a-obra"
---

# REQ: Lexico do style card mede o que distingue a obra, nao o que e comum em portugues

> Date: 2026-08-31 | Status: Open

## Motivation

A linha de "palavras marcantes" do bloco de metrica entrega, na `metamorfose`,
dez palavras funcionais em doze: `estava, corpo, ainda, apenas, tinha, algo,
cada, talvez, houve, naquele, vida, havia`. Esse bloco entra em todo briefing de
cena e, desde a 0.4.0, no briefing de capa — onde deveria dizer de que a obra e
feita para quem vai desenhar. Nao diz.

Frequencia bruta em portugues devolve palavra funcional por construcao. O reparo
nao e uma lista de exclusao maior, e uma medida diferente.

## Acceptance Criteria

- [x] O bloco traz **duas** listas: lexico da obra (conteudo) e tiques de voz
      (hedge, intensificador, conectivo e adverbio em `-mente`), a segunda com
      taxa por mil palavras.
- [x] Palavra funcional — artigo, preposicao, contracao, pronome, conjuncao e as
      formas de ser/estar/ter/haver/ir/poder/fazer — nao aparece em nenhuma das
      duas listas.
- [x] `apenas`, `talvez` e `ainda` aparecem entre os tiques, com taxa, e nao no
      lexico de conteudo.
- [x] O substantivo `mente` fica no lexico de conteudo e nao e confundido com o
      sufixo `-mente`.
- [x] Plural e singular contam junto; o rotulo fica com a forma mais usada.
      Genero **nao** e dobrado.
- [x] Amostra abaixo de 1000 palavras sai com ressalva no bloco e aviso no
      comando — mede, mas nao deixa passar por medida firme.
- [x] `bookfw capa brief` consome o lexico de conteudo, e continua lendo style
      card antigo sem quebrar.
- [x] Medido na `metamorfose`, o lexico traz `casulo`, `lagarta` e `consciencia`,
      e nao traz `estava`, `tinha` nem `havia`.
- [x] `npm run check` limpo.

## Linked ADR

ADR: `docs/adr/ADR-2026-08-31-lexico-do-style-card-separa-conteudo-de-tique-de-voz-e-declara-amostra-insuficiente.md`

## Blocked by ADRs

<!-- none -->

## Linked Roadmap

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-lexico-do-style-card-mede-o-que-distingue-a-obra.md`
