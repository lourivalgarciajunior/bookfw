---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Lexico do style card separa conteudo de tique de voz, e declara amostra insuficiente

> Date: 2026-08-31 | Status: Accepted

## Context

O `bookfw style` fecha o bloco de metrica com uma linha de "palavras marcantes":
as doze palavras mais frequentes de `samples/`, descontada uma lista curta de
palavras vazias. Medido na `metamorfose`, o resultado foi:

> estava, corpo, ainda, apenas, tinha, algo, cada, talvez, houve, naquele, vida, havia

Das doze, **duas** dizem alguma coisa sobre a obra. As outras dez sao verbo
auxiliar e adverbio — o que qualquer texto em portugues tem em cima.

O diagnostico obvio e "a lista de palavras vazias esta curta". Ele esta errado, e
seguir por ele e correr atras de prejuizo: **frequencia bruta em portugues
devolve palavra funcional por construcao**, e nao existe lista de exclusao que
resolva isso sem virar um dicionario mantido a mao. A contagem crua dos mesmos
3416 palavras confirma: as dez primeiras posicoes sao `como, estava, para,
corpo, quando, mais, ainda, apenas, tinha, algo`. O sinal existe, mas esta no
meio, nao no topo.

O custo nao e cosmetico. Esse bloco entra em **todo briefing de cena** e, desde a
0.4.0, no **briefing de capa** — onde ele deveria dizer ao gerador de imagem do
que o livro e feito. "estava, ainda, apenas, tinha" nao ajuda ninguem a desenhar
capa nenhuma.

Ha uma segunda observacao, de outra natureza. `apenas` (5,3 por mil), `ainda`
(5,6), `talvez` (3,5) **sao** marcadores de voz: sao a hesitacao caracteristica
do autor, e um agente que escreve na voz dele precisa saber a taxa. Eles nao sao
lixo — estao na lista errada.

E uma terceira, achada ao medir a segunda obra: `o-arquivo` tem **92 palavras**
em `samples/`. O bloco atual imprime `sempre 54,3 por mil` com a mesma cara de
autoridade que tem sobre 3416 palavras. Metrica sobre amostra insuficiente e pior
que metrica ausente, porque parece medida.

## Decision

**A frequencia bruta e substituida por duas listas de naturezas diferentes.**

1. **Lexico da obra** — substantivos, adjetivos e verbos recorrentes, depois de
   descontada uma lista de palavras **funcionais** (artigo, preposicao,
   contracao, pronome, conjuncao e os auxiliares ser/estar/ter/haver/ir/poder/
   fazer nas formas que aparecem em prosa). E o que o briefing de capa consome.
2. **Tiques de voz** — hedge, intensificador e conectivo, mais todo adverbio em
   `-mente`, reportados **com taxa por mil palavras**. E o que o agente de voz
   consome. Sair da primeira lista nao e ser descartado: e ser reportado no
   lugar certo, com a unidade certa.

**Plural e singular contam junto.** `corpo` e `corpos` sao a mesma palavra, e o
rotulo fica com a forma que o autor mais usa. Genero nao e dobrado — `silenciosa`
e `silencioso` podem ser escolha deliberada, e fundir seria apagar a escolha.

**Amostra abaixo de 1000 palavras e declarada.** O bloco sai com a ressalva no
corpo, e o comando avisa. Nao se recusa a medir — o autor pode estar comecando —
mas nao deixa o numero passar por medida firme.

## Consequences

Positivas:

- Medido na `metamorfose`, o lexico passa a ser `corpo, vida, consciencia,
  momento, fevereiro, casulo, tempo, forca, lado, lagarta, sentido, limite,
  parecia, mundo, silenciosa, pressao`. Casulo, lagarta, consciencia, limite e
  pressao sao a obra; o briefing de capa vira util no mesmo movimento.
- Os tiques ganham unidade comparavel entre obras do mesmo autor.
- A ressalva de amostra pequena impede que 92 palavras virem style card com cara
  de medicao.

Negativas e aceitas:

- A lista de funcionais e mantida a mao e e especifica de portugues. Obra em
  outra lingua sai com o lexico poluido. Aceito: o bookfw e uma ferramenta em
  pt-BR, e o dia em que isso mudar a lista vira arquivo por idioma.
- Sem etiquetagem morfologica, verbo flexionado sobra no lexico de conteudo
  (`parecia`, `sabendo`). Aceito: verbo e conteudo, e um classificador
  gramatical e uma dependencia inteira para ganhar pouco.
- A dobra de plural e por sufixo, nao por lema. Palavra que termina em `s` no
  singular pode ser fundida errado; o risco e baixo porque a fusao so acontece
  quando as duas formas ja existem no texto.

## Alternatives Considered

**Ampliar a lista de palavras vazias.** E o reparo que o sintoma sugere, e nao
funciona: a lista viraria um dicionario de funcionais mantido a mao — que e
metade desta decisao — sem resolver que `apenas` e `talvez` sao sinal, e nao
ruido. Rejeitado por atacar o sintoma.

**TF-IDF contra um corpus de referencia de portugues.** E a solucao correta do
ponto de vista estatistico: mede o que **distingue** este autor, nao o que e
comum. Custa um corpus embarcado, que e peso no pacote e um dado que envelhece e
precisa de manutencao para render pouco acima do que a separacao em duas listas
ja rende. Rejeitado por custo, e registrado como a saida natural se o lexico se
mostrar insuficiente na pratica.

**Etiquetagem morfologica para filtrar classe gramatical.** Resolveria o verbo
que sobra e a separacao adverbio/substantivo — o caso do substantivo `mente`
contra o sufixo `-mente`. Exige biblioteca de PLN, contra a regra de zero
dependencia do CLI. Rejeitado; o caso do `mente` e resolvido exigindo quatro
caracteres antes do sufixo.

**Deixar como esta e corrigir no briefing de capa.** Empurraria o problema para o
consumidor e deixaria o briefing de cena — que le o mesmo bloco desde a 0.1.0 —
com o defeito. Rejeitado: o erro e da medida, e e onde a medida mora que ele se
corrige.
