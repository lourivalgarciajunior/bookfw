---
id: ADR-2026-09-08-o-contrato-de-cena-dobra-a-linha-de-continuacao-e-o-que-nao-dobra-reprova-no-gate-em-vez-de-sumir
title: O contrato de cena dobra a linha de continuacao, e o que nao dobra reprova no gate em vez de sumir
status: Accepted
date: 2026-09-08
---

# ADR: O contrato de cena dobra a linha de continuacao, e o que nao dobra reprova no gate em vez de sumir

**Status:** Accepted
**Date:** 2026-09-08

## Contexto

`yamlRaso` le chave e valor linha a linha. Linha que nao casa `^chave:` cai num
`continue` mudo. O texto some, `bookfw validate` fica verde e `bookfw status`
conta as cenas normalmente.

O formato empurra para o defeito, e e isso que torna a decisao necessaria. Os
capitulos sao hard-wrapped em 79 colunas; as linhas de contrato de cena das
obras reais chegam a **114**. Quebrar uma linha longa e o movimento natural de
qualquer pessoa e de qualquer agente que edite o arquivo — e e exatamente o
movimento que destroi o dado. Um formato em que a acao mais natural apaga
conteudo em silencio nao e um formato austero: e uma armadilha.

Apareceu assim, em 2026-09-08: uma agente escrevendo o capitulo 4 de
`os-oito-modelos` quebrou a `virada` da cena 4.2 em duas linhas, perdeu metade
do valor, e so descobriu porque foi reler o arquivo. O gate nao pegou.
Varredura nas tres obras reais no mesmo dia: nenhuma linha perdida hoje. E
armadilha latente, e a proxima vitima nao teria motivo para reler.

## Decisao

O contrato de cena — e todo o resto que `yamlRaso` le, incluindo frontmatter e
`livro.yaml` — passa a ter **semantica de continuacao**, e o gate passa a ter
**semantica de recusa**.

**1. Linha que nao e chave nem item de lista dobra na chave escalar anterior**,
separada por um espaco, indentada ou nao. Chave declarada sem valor seguida de
linha que nao e `- item` vira escalar dobrado, e nao lista vazia.

**2. O que nao da para dobrar reprova.** Bare line sem chave anterior, ou bare
line depois de uma lista ja iniciada, vira problema reportado com numero de
linha e texto, e o `bookfw validate` falha nele. Erro, nao aviso: o proposito do
gate e nao deixar contrato quebrado passar.

O principio, que vale alem deste caso: **em ferramenta de governanca, o custo
de recusar barulhento e sempre menor que o de aceitar em silencio.** Um erro
que aparece custa uma correcao; um dado que some custa a confianca em tudo o
que a ferramenta afirma depois.

## Alternativas consideradas

| Opcao | A favor | Contra | Por que nao |
|---|---|---|---|
| So recusar barulhento, sem dobrar | corrige o defeito real — a perda silenciosa — com a menor mudanca possivel | obriga o autor a manter linha de 114 colunas num arquivo de 79, ou a reescrever a frase para caber | resolve o sintoma e mantem a pressao que criou o defeito |
| So dobrar, sem recusar | gentil, e nada mais se perde | bare line orfa continua sem casa, e o gate continua achando que esta tudo bem | metade da lição: o dado para de sumir, mas o arquivo quebrado continua passando |
| Trocar por um parser YAML de verdade | correcao definitiva, semantica conhecida | dependencia nova num projeto que e zero-dependencia de proposito, para ler quinze campos rasos | o formato e raso porque a obra nao precisa de mais que isso |
| Reformatar os contratos por comando, para caberem em 79 | some com as linhas longas | nao impede que a proxima quebra aconteca na mao | trata a ocorrencia, nao a causa |

## Consequencias

- O contrato de cena passa a poder ser escrito com o mesmo hard-wrap do resto
  do arquivo. A tensao entre o formato e a convencao do repositorio acaba.
- `bookfw validate` ganha uma classe nova de reprovacao, e obra com contrato
  malformado que hoje passa vai passar a falhar. Nas tres obras reais, nenhuma:
  a varredura de 2026-09-08 nao achou linha orfa.
- `yamlRaso` ganha um segundo parametro opcional, e `frontmatter`, `cenasDe` e
  `capitulos` passam a repassa-lo. Chamador que nao passa nada continua
  funcionando como antes, menos a perda.
- O que isto torna impossivel: acrescentar campo ao contrato cujo valor **deva**
  ser interpretado linha a linha. Nao ha nenhum hoje, e a REQ declara que nao
  havera.

## Reversibilidade

Reversivel. E leitura, nao formato de arquivo gravado: os contratos existentes
continuam validos com ou sem a mudanca, e voltar atras so reintroduz a perda.
Nao ha migracao a desfazer.
