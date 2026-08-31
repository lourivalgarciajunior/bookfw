---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-capa-como-svg-governado-pela-obra-com-resvg-como-dependencia-opcional"
roadmap: "ROADMAP-2026-08-31-capa-da-obra-briefing-derivado-da-governanca-e-composicao-em-quatro-formatos"
---

# REQ: Capa da obra — briefing derivado da governanca e composicao em quatro formatos

> Date: 2026-08-31 | Status: Open

## Motivation

O fluxo do bookfw termina no DOCX de leitura. Entre o manuscrito pronto e o
livro publicado falta a capa, e hoje ela e feita inteiramente fora da
governanca: o autor reescreve de memoria, a cada tentativa, o briefing que
descreve a obra para um gerador de imagem — premissa, tom, o que a historia
promete, o que ela deliberadamente nao faz. Todos esses dados ja estao
governados no plano diretor, nas DECs e no style card. Reescrever a mao e
convidar a capa a contradizer o livro.

`metamorfose` esta com 84% do alvo de palavras e nenhuma capa. Sao quatro obras
governadas, e a capa e a proxima coisa que cada uma vai precisar. Se ficar fora
do CLI, sera copiada de projeto em projeto e vai divergir — exatamente o que a
ADR do DOCX ja corrigiu uma vez.

## Acceptance Criteria

- [x] `bookfw capa brief` escreve `capa/briefing.md` com titulo, autor, genero,
      publico, premissa, tema, promessas, desfecho declarado, o que a obra nao
      faz, lexico marcante do style card e lugares do canon — cada bloco com a
      origem apontada, para que uma linha errada se corrija na fonte.
- [x] O briefing traz um bloco de prompt pronto para colar num gerador de
      imagem, e um bloco do que **nao** deve aparecer na arte.
- [x] `bookfw capa` gera o SVG sem nenhuma dependencia instalada.
- [x] Havendo `capa/arte.(png|jpg|jpeg|webp)`, a arte e embutida na composicao;
      nao havendo, a capa sai tipografica, com cor e peso derivados do genero.
      `--tipografica` forca a segunda forma mesmo com arte no lugar.
- [x] Quatro formatos: `ebook` (1600x2560, padrao), `impressao` (capa espalhada
      com verso, lombada e sangria), `miniatura` e `svg`. `--formato` escolhe;
      sem flag saem ebook e svg.
- [x] A lombada da capa de impressao e calculada a partir da contagem de
      palavras do corte, e o comando declara quantas paginas assumiu.
- [x] Sem `@resvg/resvg-js` instalado, o comando entrega o SVG, avisa e diz o
      que instalar — nao quebra e nao sai em silencio.
- [x] O titulo quebra em mais de uma linha quando nao cabe, e o comando avisa
      que a largura e estimada, nao medida.
- [x] `bookfw validate` avisa quando a obra tem capitulo em `pronto` e nenhuma
      capa — pendencia de publicacao, nunca erro.
- [x] Smoke cobre: SVG sem dependencia, arte embutida, capa tipografica, os
      quatro formatos, calculo de lombada, titulo longo e ausencia do pacote.
- [x] `npm run lint` continua limpo: comando na ajuda e no README, sem modulo
      orfao, changelog com a versao.

## Linked ADR

ADR: `docs/adr/ADR-2026-08-31-capa-como-svg-governado-pela-obra-com-resvg-como-dependencia-opcional.md`

## Blocked by ADRs

<!-- none -->

## Linked Roadmap

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-capa-da-obra-briefing-derivado-da-governanca-e-composicao-em-quatro-formatos.md`
