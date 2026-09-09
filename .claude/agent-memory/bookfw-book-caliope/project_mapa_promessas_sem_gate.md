---
name: mapa-promessas-sem-gate
description: O mapa "Onde cada promessa e plantada e paga" do sumario nao e conferido pelo bookfw validate — ele so conta se existe um paga: em algum lugar da obra
metadata:
  type: project
---

O `bookfw validate` fecha `7/7 promessas` olhando apenas se **existe** um
`paga: [Pn]` em algum contrato de cena da obra. Ele nao compara a tabela
`## Onde cada promessa e plantada e paga`, do sumario, com os campos
`promessas:`/`paga:` dos capitulos. O mapa envelhece em silencio a cada
capitulo reescrito. Medido em `os-oito-modelos` em 2026-09-08 (bookfw 0.6.0):
**tres das sete linhas** estavam erradas — P2 (nao registrava o replantio no
cap. 08), P3 (`paga 19` quando os contratos diziam 18, 19 e 21) e P4
(`plantada 02 | paga 11, 19` quando era plantada em 02 e 11 e paga em 12, 17
e 19) — com o validate em `OK`.

**Why:** o mapa e o unico lugar onde o autor le a estrutura de promessas de
uma vez, e e o que uma leitura critica confere primeiro. Mapa errado faz
promessa paga parecer nao paga, e manda o autor reabrir capitulo que esta
certo.

**How to apply:** ao mexer em promessa, levante os campos `promessas:` e
`paga:` de **todos** os capitulos antes de escrever o mapa — nao confie no
que a tabela ja diz, nem no `validate`. A regra de leitura: `promessas:`
planta (inclusive replantio, que entra na coluna Plantada), `paga:` paga.
Corrija o mapa contra os contratos, nunca o contrario. Ver
[[cena-parser-linha-unica]] para o outro ponto cego do mesmo parser.
