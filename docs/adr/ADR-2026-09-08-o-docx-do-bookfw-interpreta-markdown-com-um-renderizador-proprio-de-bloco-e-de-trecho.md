---
status: Accepted
date: 2026-09-08
author: "Lourival Garcia"
---

# ADR: O docx do bookfw interpreta markdown com um renderizador proprio de bloco e de trecho

> Date: 2026-09-08 | Status: Accepted

## Context

O `bookfw docx` monta cada bloco do capitulo num unico `TextRun`, com
`bloco.replace(/\n/g, ' ')` — `src/docx.mjs:213` e `src/docx.mjs:224`. Nada
interpreta markdown. O que o autor escreveu como marcacao chega ao papel como
texto.

A medida esta no arquivo que foi para a mao de um revisor tecnico externo,
`Os Oito Modelos da Reforma Tributaria — revisao 2.docx`, contada no texto
extraido de `word/document.xml`:

| Marcador | Ocorrencias |
|---|---|
| `**` de negrito | 952 (476 pares) |
| `*` de italico | 106 |
| crase de codigo | 26 |
| `>` de citacao | 10 linhas |
| `\|` de tabela | 16 linhas |
| `-` de lista | 16 linhas |
| `#` de titulo | 6 linhas |

E no mesmo arquivo: **zero** `<w:b/>`, **zero** `<w:i/>` de prosa, **zero**
`<w:tbl>`. Nao e que a formatacao esteja imperfeita — ela nao existe.

A troca da quebra de linha por espaco tem um efeito proprio, alem do marcador a
vista: o bloco de citacao com hard-wrap perde o marcador so da primeira linha
por acidente (ele nunca foi removido de nenhuma) e as linhas de continuacao
levam o `>` para o meio da frase. O revisor apagou varios desses a mao antes de
devolver o arquivo.

A mesma linha de codigo serve o front matter, os capitulos e o apendice, entao
o apendice de "Os Oito Modelos" — que e feito de tabela e de lista — sai como
paragrafo justificado de tubos.

## Decision

**O `docx` passa a interpretar markdown, com um renderizador escrito no proprio
bookfw, em `src/markdown.mjs`, e nao com uma dependencia de terceiro.** O
modulo e puro: nao conhece OOXML, nao importa `docx`, e devolve estrutura de
dados. O `docx.mjs` e quem traduz essa estrutura em `Paragraph`, `TextRun` e
`Table`.

Duas funcoes, e so duas:

- `blocos(texto)` — parte o texto em blocos tipados: `paragrafo`, `citacao`,
  `lista`, `numerada`, `codigo`, `tabela`, `titulo`, `separador`. A quebra e
  por linha, e nao por `split(/\n{2,}/)`, porque bloco de codigo cercado tem
  linha em branco dentro e o corte por linha em branco o parte no meio.
- `trechos(texto)` — parte uma linha ja limpa em trechos com `negrito`,
  `italico` e `codigo`. Reentrante, para `**negrito com *italico* dentro**`.

O marcador de citacao sai de **todas** as linhas do bloco, e so entao as linhas
sao juntadas — que e a ordem inversa da de hoje.

**Zero dependencia nova.** O bookfw so tem `docx` e `@resvg/resvg-js`, as duas
opcionais, e quem roda `status` ou `validate` nao carrega nenhuma. Um
interpretador de markdown de uso geral traz CommonMark inteiro — HTML embutido,
link de referencia, nota de rodape, tabela de definicao — para uma superficie
que e a de um livro em prosa.

**O escopo do markdown e o que as obras usam, medido, e nao o que a
especificacao permite.** Varredura em "Os Oito Modelos" e "Metamorfose":
zero link, zero imagem, zero riscado, zero enfase por sublinhado, zero lista
aninhada. Um marcador fora dessa lista fica como texto, do jeito que ja fica
hoje — o renderizador nao inventa formatacao que ninguem escreveu.

## Consequences

**Positivas.**

- O arquivo que vai para leitura passa a mostrar negrito, italico, citacao
  recuada, tabela de verdade e codigo em fonte monoespacada, em vez do
  marcador.
- Front matter, capitulos e apendice passam pelo mesmo renderizador. Hoje sao
  tres chamadas da mesma linha errada; passam a ser tres chamadas da mesma
  funcao certa.
- O modulo e puro, entao a regressao e testavel sem gerar arquivo: o smoke
  cobre `trechos` e `blocos` mesmo quando o pacote `docx` nao esta instalado.

**Negativas, e sao aceitas.**

- O bookfw passa a ter um interpretador de markdown para manter. E pequeno e o
  escopo esta declarado, mas e codigo que antes nao existia.
- Markdown fora do escopo declarado continua saindo como texto. E o
  comportamento de hoje para tudo; passa a ser o comportamento de hoje para
  pouco.
- Lista aninhada sai achatada em um nivel. As obras nao usam; se passarem a
  usar, o defeito aparece no papel e nao no gate.

## Alternatives Considered

**Uma dependencia de markdown — `marked`, `markdown-it`, `remark`.** Recusada:
o custo nao e o parser, e a arvore. Nenhuma delas emite OOXML, entao seria
preciso escrever o tradutor de AST para `docx` de qualquer jeito — o mesmo
trabalho, mais uma dependencia, e um vocabulario de nos muito maior do que o
que a obra usa.

**`docx-markdown`, `md-to-docx` e afins.** Recusada: substituiriam a montagem
do documento inteiro, e o `docx.mjs` nao monta so prosa — monta rosto, divisor
de Parte, carimbo de revisao, ressalva por capitulo, rodape com numero de
pagina. O markdown e o miolo do miolo.

**Limpar os marcadores com regex antes de escrever, sem aplicar formatacao.**
Recusada, e e a alternativa tentadora: some com os 952 asteriscos em uma linha
de codigo. Mas o autor escreveu `**natureza**` porque queria a enfase, e apagar
o marcador entrega um texto que perdeu a enfase sem avisar ninguem. A
verificacao desta mudanca por isso conta duas coisas, e nao uma: marcador
remanescente **zero** e `<w:b/>` **maior que zero**.

**Proibir markdown na prosa e cobrar no `validate`.** Recusada: a marcacao na
prosa e do autor e ja esta escrita em 23 capitulos. O gate existe para proteger
a governanca, nao para reeducar a escrita.
