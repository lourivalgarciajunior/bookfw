---
status: Accepted
date: 2026-11-24
author: "Lourival Garcia"
---

# ADR: o renumber reescreve o prefixo do id de cena e o gate reprova prefixo que nao bate com o numero

> Date: 2026-11-24 | Status: Accepted

## Context

O contrato de cena (bloco ```cena) tem um `id:` que, por convencao do
`bookfw cena add`, e `<numero do capitulo>.<n>`: `15.1`, `15.2`. O `bookfw
brief <cap> --cena <id>` acha a cena por esse id, e o `validate` o usa nas
mensagens.

O `bookfw cap renumber` muda `numero`, `id` do frontmatter e nome do arquivo,
mas nao toca o corpo — o ADR-2026-11-20 diz isso de proposito: "O `renumber`
nao muda titulo e por isso nao toca o corpo". O id de cena ficou de fora sem
que ninguem tivesse decidido.

Medido em 2026-11-24 na obra `pessoal/book/verde-nao-e-prova`: a troca dos
caps. 15, 16 e 17 (15→99, 16→15, 17→16, 99→17) passou no `validate` e deixou
os seis ids com a numeracao velha — o 15 com `16.1/16.2`, o 16 com `17.1/17.2`,
o 17 com `15.1/15.2`. `bookfw brief 15 --cena 15.2` nao acha a cena e,
sem avisar, entrega a primeira do capitulo (`Cena 16.1 de 2`, medido); e o
`bookfw cena add 15` continuaria a sequencia como `16.3`, porque o
`proximoId` herda o prefixo da ultima cena. O defeito so foi visto porque tres
leituras de revisao editorial abriram os contratos.

Varredura das obras desta maquina (`pessoal/book/*`) no mesmo dia: os seis ids
da `verde-nao-e-prova` sao os unicos com prefixo diferente do `numero`.

## Decision

1. O `renumber` reescreve, **so dentro dos blocos ```cena** do capitulo, toda
   linha `id: <antigo>.<resto>` em que `<antigo>` e o numero velho do
   capitulo, trocando o prefixo pelo numero novo. Prosa, frontmatter e blocos
   de codigo comuns nao sao tocados. Id em outro formato (sem ponto, ou com
   prefixo que ja nao era o numero velho) fica como esta.
2. O `validate` reprova (erro) a cena cujo `id` tem a forma `<n>.<resto>` com
   `<n>` diferente do `numero` do capitulo, dizendo o arquivo, o id e o
   prefixo esperado. Id que nao tem essa forma nao e cobrado.
3. O `renumber` diz, numa linha, quantos ids de cena reescreveu.

Isto revisa a frase do ADR-2026-11-20 sobre o corpo: o `renumber` continua sem
tocar o titulo nem a prosa, e passa a tocar o `id:` dos contratos.

## Consequences

- A troca em tres passos por numero temporario sai coerente sem passo manual:
  cada passo leva o prefixo junto.
- Obra que ja foi renumerada antes desta versao fica vermelha no `validate` ate
  os ids serem corrigidos — e isso e o objetivo: hoje so a `verde-nao-e-prova`.
- Id de cena com formato proprio do autor (`abertura`, `1`) nunca e reescrito
  nem cobrado.
- Contrato com CRLF continua fora do alcance de `cenasDe` (`/```cena\n/`), como
  ja estava; o `renumber` reescreve os dois finais de linha, mas o `validate`
  so ve o que `cenasDe` le.

## Alternatives Considered

| Opção | Por que não |
|---|---|
| So o gate, sem mexer no `renumber` | O comando continuaria deixando a incoerencia que ele existe para evitar |
| So o `renumber`, sem gate | Obra ja renumerada continuaria errada sem ninguem saber; foi o caso medido |
| Aviso em vez de erro | Id desencontrado quebra o `brief --cena`; aviso e o que se ignora, e o gate da obra ficaria verde com o brief errado |
| Reescrever qualquer `id:` com ponto, seja qual for o prefixo | Pega id que o autor numerou de outro jeito de proposito |
