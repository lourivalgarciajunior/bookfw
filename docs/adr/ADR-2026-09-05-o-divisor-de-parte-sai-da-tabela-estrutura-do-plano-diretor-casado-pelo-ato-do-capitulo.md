---
status: Accepted
date: 2026-09-05
author: "Lourival Garcia"
---

# ADR: O divisor de Parte sai da tabela Estrutura do plano diretor, casado pelo ato do capitulo

> Date: 2026-09-05 | Status: Accepted

## Context

O frontmatter de capitulo tem `ato:` desde o inicio, e o `docx` ja o imprime na
linha de cabecalho ("capitulo 01 · ato 1"). O plano diretor declara a estrutura
da obra numa tabela `## Estrutura`, com uma linha por Parte — titulo, faixa de
capitulos, funcao e virada.

As duas coisas existem e nao se encontram. Em "Os Oito Modelos da Reforma
Tributaria" o resultado e concreto: o capitulo 1 anuncia quatro Partes, o PD
nomeia as quatro, os 23 capitulos tem `ato` preenchido — e o manuscrito sai com
**zero** divisores. A estrutura vive na cabeca do autor e na introducao; quem le
o arquivo nao a ve.

## Decision

**O divisor de Parte e derivado: o titulo sai da tabela `## Estrutura` do plano
diretor, e a posicao sai do `ato` do capitulo.** `build` e `docx` emitem o
divisor quando o ato muda entre um capitulo e o seguinte.

O casamento entre linha da tabela e numero do ato e por **algarismo romano no
inicio da primeira celula** (`I — A natureza do problema` vira ato 1). Sem
romano, vale a **ordem das linhas**: a primeira e o ato 1. Duas regras porque a
tabela e escrita a mao e o romano e convencao, nao obrigacao.

**Nada e obrigatorio.** Sem `## Estrutura` no PD, ou sem `ato` nos capitulos,
nao ha divisor e nao ha erro — a obra que nao usa Parte segue como hoje.

## Consequences

**Positivas.**

- A estrutura que o autor declarou no plano passa a chegar ao leitor, no
  manuscrito e no DOCX, sem ninguem redigitar nada.
- Uma fonte so. O titulo da Parte muda no PD e o manuscrito acompanha; nao ha
  copia no `livro.yaml` nem no frontmatter de capitulo para divergir.
- O `ato` deixa de ser metadado decorativo e passa a ter efeito visivel — o que
  tambem o torna conferivel: ato errado agora aparece.

**Negativas, e sao aceitas.**

- O `build` passa a depender do PD para uma decisao de formato. Ja dependia dele
  para as promessas do gate, entao a dependencia nao e nova; a superficie e.
- Se a tabela do PD for editada com a coluna de titulo em outra posicao, o
  divisor sai errado. A leitura e por nome de coluna quando ha cabecalho
  reconhecivel, e pela primeira celula quando nao ha — mesma escolha que
  `linhasDoSumario` ja faz, e pelo mesmo motivo.

## Alternatives Considered

**Campo `parte:` no frontmatter do capitulo.** Recusada: repete em 23 arquivos o
que o PD ja diz uma vez, e cria duas verdades para o mesmo titulo. O `ato` ja
diz a que Parte o capitulo pertence; o que faltava era o nome dela.

**Titulos de Parte no `livro.yaml`.** Recusada: o manifesto e invariante por
decisao de obra, e a estrutura da obra muda durante a escrita — foi o que o
proprio PD registrou ao ser revisado.

**Divisor escrito a mao no primeiro capitulo de cada Parte.** Recusada: e o que
acontece hoje por omissao, e nao aconteceu. Texto de estrutura escrito a mao
dentro da prosa entra no manuscrito, mas some do `status`, do `validate` e de
qualquer contagem — vira prosa disfarcada de estrutura.
