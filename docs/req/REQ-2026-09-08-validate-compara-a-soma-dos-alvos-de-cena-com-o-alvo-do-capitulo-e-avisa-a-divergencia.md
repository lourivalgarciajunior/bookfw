---
status: Done
date: 2026-09-08
author: "Lourival Garcia"
adr: "ADR-2026-09-08-o-gate-avisa-quando-os-alvos-de-cena-e-o-alvo-do-capitulo-divergem-e-nao-escolhe-lado"
roadmap: "docs/roadmaps/wip/ROADMAP-2026-09-08-alvo-de-cena-contra-alvo-de-capitulo.md"
---

# REQ: validate compara a soma dos alvos de cena com o alvo do capitulo e avisa a divergencia

> Date: 2026-09-08 | Status: Done

## Motivation

Ha dois orcamentos de palavras por capitulo — `palavras_alvo` no frontmatter e
`palavras_alvo` em cada bloco de cena — e nada confere um contra o outro. Em
`os-oito-modelos`, 22 dos 23 capitulos tem os dois divergindo mais de 10%, com
mediana de 1,54 e maximo de 1,96, e o gate passa em silencio. `metamorfose` e
`cris-e-cristina` estao em 1,00, com maximo de 1,033: nao e defeito do formato,
e defasagem daquela obra, causada pela DEC-2026-09-05, que reescreveu os alvos
de capitulo e deixou os das cenas para tras.

O custo ja foi pago: uma revisao editorial mandou reduzir um capitulo de 158%
para 130% do alvo; a redacao cortou 255 palavras, chegou a 136% e parou, porque
o resto seria conteudo lastreado. O capitulo nunca esteve inchado — o alvo e
que era incompativel com o que as cenas dele declaram escrever.

## Acceptance Criteria

- [x] `validate` soma os `palavras_alvo` das cenas e compara com o do capitulo.
- [x] Aviso — nao erro — quando a razao sai da faixa de 10%, dizendo **os dois
      numeros** e sugerindo o que fazer, no estilo das outras mensagens.
- [x] Capitulo sem alvo, sem cena, ou com cena sem alvo nao avisa: falta de
      declaracao nao e divergencia.
- [x] Capitulo em `abandonado` continua fora do gate, como ja esta.
- [x] `status` mostra a divergencia na linha do capitulo — e onde o autor olha.
- [x] A faixa de "fora do alvo" **continua medindo contra o alvo do capitulo**.
- [x] Regressao em `test/smoke.mjs`, provada por mutacao.
- [x] `npm run lint` e `npm test` verdes.
- [x] Nas obras reais: `metamorfose` e `cris-e-cristina` com **zero** avisos
      novos; `os-oito-modelos` com **22**. Nenhuma obra alterada.

## Escopo negativo

- Nao corrige alvo de obra nenhuma, nem oferece comando para redistribuir cena.
- Nao muda a faixa de 60% a 160% da prosa contra o alvo do capitulo.
- Nao recalcula o alvo do capitulo a partir das cenas no `sum`.
- Nao transforma o aviso em erro, agora nem sob bandeira.

## Linked ADR

ADR: `docs/adr/ADR-2026-09-08-o-gate-avisa-quando-os-alvos-de-cena-e-o-alvo-do-capitulo-divergem-e-nao-escolhe-lado.md`

## Linked Roadmap

Roadmap: `docs/roadmaps/backlog/docs/roadmaps/wip/ROADMAP-2026-09-08-alvo-de-cena-contra-alvo-de-capitulo.md`
