---
status: Open
date: 2026-09-13
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-08-31-capa-como-svg-governado-pela-obra-com-resvg-como-dependencia-opcional.md"
roadmap: "docs/roadmaps/done/ROADMAP-2026-09-13-capa-quebra-o-subtitulo-em-linhas-e-reduz-o-corpo-como-faz-com-o-titulo.md"
---

# REQ: Capa quebra o subtitulo em linhas e reduz o corpo como faz com o titulo

> Date: 2026-09-13 | Status: Open

## Motivation

`bookfw capa` quebra o titulo em linhas por estimativa de largura
(`ajustarTitulo`/`quebrar`, 0.52 em por glifo) e reduz o corpo ate o bloco
caber na faixa. O subtitulo (`cfg.subtitulo`) nao passa por nada disso: sai num
unico `<text>`, com corpo fixo em 34% do corpo do titulo, sem quebra, sem
reducao e sem aviso.

Caso real, em 2026-09-13, na obra `pessoal/book/ninguem-nasce-santo`, subtitulo
"o que Maria, José, Pedro, Paulo e outros fizeram quando a vida apertou" (70
caracteres):

- **ebook** (1600px, corpo 63): a linha estimada tem ~2290px contra 1280px de
  largura util e sai cortada nas duas bordas;
- **impressao**: a linha atravessa a lombada e sobrepoe o titulo da lombada;
- **miniatura**: mesma coisa em escala.

O comando saiu com codigo 0 e sem aviso nenhum. A capa so foi salva porque os
PNGs foram abertos antes da entrega; os tres SVGs foram corrigidos a mao na obra
(subtitulo em duas linhas, entrelinha de ~1,4 corpo), e qualquer `bookfw capa`
novo reintroduz o defeito.

## Acceptance Criteria

- [ ] O subtitulo passa pela mesma quebra por estimativa do titulo (`quebrar`),
      com a mesma largura util do formato (80% da largura da frente).
- [ ] O corpo do subtitulo cede ate um piso quando o bloco nao cabe na faixa
      entre o fim do titulo e o fio inferior (72% da altura), ou quando passa de
      tres linhas; abaixo do piso o comando nao disfarca.
- [ ] Cada linha do subtitulo vira um `<text>` proprio, com entrelinha de 1,4
      corpo, e a primeira linha continua logo abaixo do titulo como hoje.
- [ ] O comando avisa quando o subtitulo foi quebrado ou reduzido
      ("a largura e estimada; confira o SVG") e avisa em amarelo quando nem no
      piso ele cabe ("subtitulo longo demais"), sem mudar o codigo de saida.
- [ ] Subtitulo curto que ja cabia sai identico ao de hoje: uma linha, mesmo
      corpo, mesma posicao.
- [ ] Composicao com arte, veu, lombada e quarta capa continuam iguais.
- [ ] Regressao em `test/smoke.mjs`, provada por mutacao: capa com subtitulo
      longo em `ebook`, `impressao` e `miniatura`, nenhuma linha estimada acima
      da largura util, nenhuma palavra perdida, na impressao nenhuma linha
      invadindo a lombada, e o aviso quando nao cabe.
- [ ] `npm run check` verde e `trackfw validate` sem violacao.
- [ ] Versao 0.7.2 no `package.json` e no CHANGELOG.
- [ ] A capa de `ninguem-nasce-santo` regerada pelo comando, sem ajuste manual,
      com os PNGs conferidos a olho.

## Escopo negativo

- Nao mede largura real de fonte: continua estimativa, como o titulo (residual
  ja declarado no ADR da capa).
- Nao quebra nem reduz o nome do autor, o titulo da lombada nem a quarta capa.
- Nao muda paleta, fios, posicao do titulo nem calculo da lombada.
- Nao cria flag nova nem chave nova no `livro.yaml`.
- Nao publica release no GitHub nem no npm.

## Linked ADR
ADR: docs/adr/ADR-2026-08-31-capa-como-svg-governado-pela-obra-com-resvg-como-dependencia-opcional.md
<!-- sem ADR novo: o conserto aplica ao subtitulo a decisao ja tomada para o titulo (quebra por estimativa declarada) -->

## Blocked by ADRs
<!-- none -->

## Linked Roadmap
Roadmap: docs/roadmaps/done/ROADMAP-2026-09-13-capa-quebra-o-subtitulo-em-linhas-e-reduz-o-corpo-como-faz-com-o-titulo.md
