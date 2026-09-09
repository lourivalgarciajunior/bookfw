---
status: In Progress
date: 2026-09-08
author: "Lourival Garcia"
adr: "ADR-2026-09-08-o-docx-do-bookfw-interpreta-markdown-com-um-renderizador-proprio-de-bloco-e-de-trecho"
roadmap: "ROADMAP-2026-09-08-docx-markdown"
---

# REQ: bookfw docx aplica a formatacao do markdown em vez de imprimir o marcador

> Date: 2026-09-08 | Status: In Progress
| Linear Issue:
| Jira Issue:

## Motivation

O DOCX que foi para um revisor tecnico externo,
`Os Oito Modelos da Reforma Tributaria — revisao 2.docx`, saiu com os
marcadores de markdown a vista: 952 asteriscos de negrito (476 pares), 106 de
italico, 26 crases, 10 linhas com `>` de citacao, 16 linhas de tabela em tubos e
16 de lista em hifen. No mesmo arquivo, zero `<w:b/>` e zero `<w:tbl>`.

A causa esta em `src/docx.mjs:213` e `src/docx.mjs:224`: o bloco inteiro vira um
`TextRun` so, via `bloco.replace(/\n/g, ' ')`. Alem do marcador a vista, a troca
da quebra por espaco leva o `>` das linhas de continuacao para o meio da frase —
o revisor apagou varios a mao antes de devolver o arquivo.

Decisao de desenho no ADR vinculado.

## Acceptance Criteria

- [ ] `src/markdown.mjs` expoe `trechos(texto)` — negrito, italico e codigo, com
      aninhamento de negrito com italico dentro — e `blocos(texto)` — paragrafo,
      citacao, lista, numerada, codigo cercado, tabela, titulo e separador.
- [ ] `blocos` parte por linha e nao por linha em branco: bloco de codigo
      cercado com linha em branco dentro sai inteiro.
- [ ] O marcador `>` sai de **todas** as linhas do bloco de citacao antes de as
      linhas serem juntadas, e nao so da primeira.
- [ ] O separador de cena `* * *` continua virando `❧` centralizado, e nao e
      lido como italico nem como lista.
- [ ] `docx.mjs` renderiza: negrito, italico, codigo em fonte monoespacada,
      citacao com recuo e corpo proprio, lista com marca e recuo, tabela como
      `<w:tbl>` de verdade, e bloco de codigo com as quebras preservadas.
- [ ] O mesmo renderizador serve front matter, capitulos e apendice — as tres
      chamadas de `bloco.replace(/\n/g, ' ')` somem.
- [ ] Smoke cobre `trechos` e `blocos` sem depender do pacote `docx`, e cobre o
      XML gerado quando o pacote existe.
- [ ] Teste de regressao que **falha sem a correcao**: um capitulo com negrito,
      italico, codigo e citacao de duas linhas, conferido no texto extraido do
      `word/document.xml` — zero marcador e `<w:b/>` presente.
- [ ] Zero dependencia nova: `docx` segue como unica dependencia opcional usada
      aqui.
- [ ] `npm run lint` e `npm test` verdes.
- [ ] Verificacao nas duas obras reais — `os-oito-modelos` e `metamorfose` —
      regeradas com `bookfw docx`, com contagem de marcador remanescente igual a
      zero e contagem de `<w:b/>` e `<w:i/>` maior que zero.
- [ ] README e CHANGELOG documentam; versao sobe para 0.7.0.

### Escopo negativo

Nao implementar: link, imagem, riscado, enfase por sublinhado, nota de rodape,
HTML embutido, lista aninhada em mais de um nivel, alinhamento de coluna de
tabela por `:---:`, e qualquer mudanca no `build` (o manuscrito `.md` continua
sendo markdown, e markdown nele nao e defeito). Nao apagar marcador sem aplicar
a formatacao correspondente. Nao trocar o corte de capitulos, o divisor de
Parte, o carimbo de revisao nem o nome do arquivo.

## Linked ADR

ADR: `docs/adr/ADR-2026-09-08-o-docx-do-bookfw-interpreta-markdown-com-um-renderizador-proprio-de-bloco-e-de-trecho.md`

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: `docs/roadmaps/wip/ROADMAP-2026-09-08-docx-markdown.md`
