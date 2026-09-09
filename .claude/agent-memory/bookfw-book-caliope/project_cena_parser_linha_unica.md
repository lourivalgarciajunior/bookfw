---
name: cena-parser-linha-unica
description: O bloco ```cena do bookfw e lido linha a linha — valor quebrado em duas linhas e truncado em silencio, e o validate nao acusa
metadata:
  type: project
---

O parser do bloco ` ```cena ` do bookfw casa `chave: valor` **em uma unica
linha**. Valor continuado na linha seguinte (estilo YAML, com indentacao) e
descartado sem aviso: `bookfw validate` continua reportando `OK` e o
`bookfw brief` mostra o contrato truncado. Observado em 2026-09-08 ao editar
`virada:` do cap. 4 de `os-oito-modelos` (bookfw 0.6.0).

**Why:** contrato de cena truncado passa no gate e chega ao escritor
incompleto — a cena e escrita contra meio contrato, e o defeito so aparece na
leitura critica.

**How to apply:** ao editar contrato de cena, mantenha cada chave em uma linha
so, mesmo que ela estoure as 79 colunas do hard-wrap da prosa — as linhas do
bloco `cena` ja passam de 90 colunas na obra. Depois de editar, confira com
`bookfw brief <cap> --cena <id>` que o valor chegou inteiro. Candidato a
correcao no CLI: ou aceitar continuacao indentada, ou reprovar no validate.
