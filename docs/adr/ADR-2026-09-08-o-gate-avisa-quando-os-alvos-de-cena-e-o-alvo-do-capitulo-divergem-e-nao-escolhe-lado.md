---
id: ADR-2026-09-08-o-gate-avisa-quando-os-alvos-de-cena-e-o-alvo-do-capitulo-divergem-e-nao-escolhe-lado
title: O gate avisa quando os alvos de cena e o alvo do capitulo divergem, e nao escolhe lado
status: Accepted
date: 2026-09-08
---

# ADR: O gate avisa quando os alvos de cena e o alvo do capitulo divergem, e nao escolhe lado

**Status:** Accepted
**Date:** 2026-09-08

## Contexto

Uma obra carrega dois orcamentos de palavras que ninguem confere um contra o
outro: `palavras_alvo` no frontmatter do capitulo, e `palavras_alvo` em cada
bloco ```cena. `validate` compara a prosa escrita com o primeiro e avisa "fora
da faixa" abaixo de 60% ou acima de 160%. Nada olha o segundo.

**A medida das tres obras reais, em 2026-09-08, e o que decide esta ADR:**

| Obra | Capitulos com cena | Divergentes acima de 10% | Razao mediana | Razao maxima |
|---|---|---|---|---|
| metamorfose | 17 | **0** | 1,00 | 1,03 |
| cris-e-cristina | 35 | **0** | 1,00 | 1,00 |
| os-oito-modelos | 23 | **22** | 1,54 | 1,96 |

O primeiro instinto foi ler isto como defeito sistemico do formato. **Nao e.**
Duas obras estao em 1,00 — em `metamorfose`, capitulo de 1.500 com cenas de
500, 500 e 500. A terceira e a excecao, e a excecao tem causa datada.

A `DEC-2026-09-05` daquela obra decidiu que `palavras_alvo` por capitulo
"deixa de ser 1.500 uniforme e passa a ser o peso declarado". Os alvos de
capitulo foram reescritos um a um. **Os alvos de cena, que o `sum
--materializar` gerou, ficaram onde estavam.** O capitulo 3 pede 1.450 e as
cenas dele prometem 700, 700 e 400. Nenhum comando, nenhum aviso, nenhuma
leitura notou por quatro dias.

O custo apareceu de forma cara. Uma revisao editorial mandou reduzir o capitulo
6 de 158% para 130% do alvo. A redacao cortou 255 palavras, chegou a 136% e
parou, porque cortar mais seria cortar conteudo com lastro em fonte primaria. O
capitulo nunca esteve inchado: o alvo e que era incompativel com o que as
proprias cenas dele declaram escrever. Discutiu-se percentual por duas passadas
inteiras sobre um numero que ninguem havia conferido.

## Decisao

**1. `validate` compara a soma dos alvos de cena com o alvo do capitulo, e
avisa quando divergem mais de 10%.**

A folga sai da medida, e a medida diz uma coisa que o instinto nao dizia:
**nenhuma folga entre 5% e 25% produz falso positivo nas obras sas.** A maior
razao em `metamorfose` e `cris-e-cristina` e 1,033. O criterio nao pode ser
"evitar falso positivo", porque qualquer valor da faixa o evita.

O que a folga escolhe, entao, e a sensibilidade:

| Folga | Avisa em os-oito-modelos | Falso positivo nas sas |
|---|---|---|
| 5% | 23 de 23 | 0 |
| **10%** | **22 de 23** | **0** |
| 15% | 21 de 23 | 0 |
| 20% | 21 de 23 | 0 |
| 25% | 19 de 23 | 0 |

**Dez por cento, por ser cerca de tres vezes a maior divergencia ja observada
numa obra sa.** Quem distribui cena a mao arredonda em centenas e nunca chega
la; a 5% o capitulo 18, que tem as cenas somando 0,92 do alvo, passaria a
avisar sem que nada esteja a deriva. A 15% ou 20% escapa o capitulo 16, que tem
1.950 no capitulo contra 2.150 nas cenas — duzentas palavras de defasagem real,
que e exatamente o tipo de coisa que esta regra existe para mostrar.

**2. E aviso, nao erro, e o gate nao escolhe lado.** Qual dos dois numeros esta
errado e decisao do autor: pode ser o alvo do capitulo, pode ser a distribuicao
das cenas. E o mesmo tratamento que o gate ja da a divergencia entre kanban e
sumario, pela mesma razao.

**3. A faixa de "fora do alvo" continua medindo contra o alvo do CAPITULO.**
Esta foi a pergunta mais dificil, e a resposta e nao por tres razoes. Onde a
obra esta sa, os dois numeros concordam e a escolha nao muda nada. Onde
divergem, preferir um em silencio **esconde a divergencia** — que e o defeito
real, nao um detalhe de qual base usar. E o alvo do capitulo e o numero que o
autor decidiu, por DEC; o alvo de cena e o que um gerador produziu. Preferir a
saida do gerador a decisao do autor e exatamente ao contrario.

## Alternativas consideradas

| Opcao | A favor | Contra | Por que nao |
|---|---|---|---|
| Faixa passa a usar a soma das cenas quando divergem | o capitulo 6 pararia de parecer inchado | troca um numero nao conferido por outro nao conferido, e apaga o sintoma | o gate existe para mostrar a contradicao, nao para resolve-la sozinho |
| Erro em vez de aviso | forca a correcao | reprovaria hoje 22 capitulos de uma obra em revisao, sem que nada esteja errado no texto | quem decide qual lado cede e o autor |
| Recalcular o alvo do capitulo a partir das cenas, no `sum` | os dois nunca mais divergem | destroi a decisao da DEC-2026-09-05, que foi deliberada e por capitulo | o alvo de capitulo passou a ser juizo editorial, e juizo nao se recalcula |
| Folga de 20% | menos ruido | escapa o capitulo 16, com 200 palavras de defasagem real, e nao reduz falso positivo nenhum — nao ha nenhum a reduzir | ganha nada e perde sensibilidade |

## Consequencias

- `metamorfose` e `cris-e-cristina` seguem com zero avisos novos. Nenhum falso
  positivo nas obras sas — a folga foi calibrada nelas.
- `os-oito-modelos` ganha 22 avisos, todos verdadeiros, e o autor decide se
  redistribui as cenas ou revisa os alvos de capitulo.
- O `status` passa a mostrar a divergencia junto do capitulo, porque e ali que o
  autor olha o progresso e e ali que o numero enganava.
- O que isto torna impossivel: reescrever alvo de capitulo em massa, como a
  DEC-2026-09-05 fez, sem que a defasagem apareca na proxima execucao do gate.

## Reversibilidade

Reversivel: e leitura e aviso, nao formato gravado. Nenhuma obra muda de
conteudo, e desligar a regra so devolve o silencio.
