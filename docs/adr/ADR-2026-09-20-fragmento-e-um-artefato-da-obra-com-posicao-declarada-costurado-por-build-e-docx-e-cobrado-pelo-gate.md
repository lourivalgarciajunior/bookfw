---
status: Accepted
date: 2026-09-20
author: "Lourival Garcia"
---

# ADR: Fragmento e um artefato da obra, com posicao declarada, costurado por build e docx e cobrado pelo gate

> Date: 2026-09-20 | Status: Accepted

## Context

O kanban do bookfw costura capitulos. Toda obra que quis intercalar documento
sem narrador entre capitulos — relatorio, log, memorando, transcricao, no
espirito de lore de Dark Souls — ficou sem lugar para pendurar esse texto.

Medido em 2026-09-20, na obra `pessoal/book/sartre-exe` (Sartre.EXE, 38
capitulos, revisao 2): os 12 fragmentos viviam em `docs/fragmentos/`, com
frontmatter proprio, e o `bookfw docx` os ignorava. Para gerar o DOCX da
revisao 2 foi preciso injetar o corpo de cada fragmento no fim do capitulo
anterior, rodar `bookfw docx`, e reverter com `git checkout -- capitulos/`.
O arquivo de leitura ficou certo e o repositorio ficou momentaneamente errado,
com 12 capitulos carregando texto que nao e deles.

As tres saidas possiveis eram: (a) fragmento vira capitulo do kanban; (b)
fragmento vira cena do capitulo anterior; (c) fragmento vira artefato proprio.

(a) quebra a contagem: um fragmento de 300 palavras entre os capitulos 4 e 5
passaria a ser o capitulo 5, renumerando a obra inteira, e entraria no
`wip_limit`, no alvo de palavras por capitulo e na faixa de "fora do alvo".

(b) quebra o contrato de cena: o `validate` cobra `objetivo`, `conflito` e
`virada`, e um memorando de 1988 nao tem nenhum dos tres. Preencher esses
campos para um documento seria escrever mentira no contrato para calar o gate.

## Decision

**Fragmento e um artefato da obra, e nao um capitulo nem uma cena.**

Mora em `docs/fragmentos/`, um arquivo por fragmento, com frontmatter:

```yaml
id: F01                     # obrigatorio, unico na obra
depois_do_capitulo: 4       # obrigatorio — a posicao, como numero
tipo: boletim trimestral    # livre, descritivo
promessas: [P1]             # opcional, mesma semantica da cena
```

O corpo do arquivo comeca com `# F01 — Titulo`; o que entra no manuscrito e o
que vem depois desse titulo, com comentario HTML removido, do mesmo jeito que a
prosa de capitulo.

**O `build` e o `docx` intercalam o fragmento depois do capitulo indicado**, com
um separador proprio — no markdown, uma regra horizontal e um `### Titulo`; no
DOCX, pagina propria, titulo em italico e corpo um ponto menor, para que o
leitor veja documento e nao capitulo. Ambos leem a mesma funcao, pelo mesmo
motivo que `selecao` ja e compartilhada: gerador duplicado defasa.

**Fragmento posicionado depois de capitulo que esta abaixo do corte nao sai.**
O corte e do manuscrito inteiro, e um documento solto sem o capitulo que o
precede nao e leitura, e ruido.

**O gate cobra tres coisas**, e so tres: posicao apontando para capitulo que
existe (erro), `id` duplicado (erro), e promessa declarada que nao esta no plano
diretor (erro). Promessa declarada em fragmento conta como plantio para a regra
de Chekhov, igual a cena — um fio pode ser plantado num documento e pago numa
cena, e e exatamente assim que a obra que motivou este ADR funciona.

**Fragmento nao paga promessa.** So planta. Pagar e o desfecho de um fio
narrativo e acontece em cena; um documento pode abrir a pergunta, nao fecha-la.

## Consequences

- Obra sem `docs/fragmentos/` continua saindo como sempre saiu. O diretorio
  ausente nao e erro e nao gera aviso.
- `bookfw status` passa a contar fragmentos ao lado dos capitulos, e a contagem
  de palavras do `build` passa a incluir o corpo dos fragmentos emitidos.
- A numeracao de capitulos nao muda. Fragmento nao tem numero de capitulo, nao
  entra no `wip_limit` e nao tem estado de kanban: ou existe, ou nao existe.
- O `id` nao precisa ser `F<numero>`; o gate so exige unicidade. A convencao
  `F01` fica documentada no README como convencao, nao como regra.
- Quem ja tem fragmento injetado no capitulo (a gambiarra descrita acima) nao e
  migrado automaticamente. O texto continua no capitulo e continua saindo; nada
  quebra, e o autor move quando quiser.
- Passa a existir um lugar onde escrever texto que o `validate` nao cobra por
  objetivo, conflito e virada. E o custo aceito: o preco de recusar (b).

## Alternatives Considered

| Opcao | A favor | Contra | Por que nao |
|---|---|---|---|
| Fragmento como capitulo do kanban | Zero codigo novo no build e no docx | Renumera a obra, entra no wip_limit e na faixa de alvo | Um documento de 300 palavras viraria "capitulo 5 fora do alvo" |
| Fragmento como cena do capitulo anterior | Ja sai no manuscrito hoje | O contrato de cena cobra objetivo, conflito e virada | Obrigaria a escrever mentira no contrato para calar o gate |
| Campo `posicao` em texto livre ("depois do capitulo 4") | Le bonito no arquivo | Exige interpretar portugues para achar o numero | `depois_do_capitulo: 4` e a mesma informacao sem ambiguidade; o texto livre fica no `tipo` |
| Fragmento tambem pagando promessa | Simetria com a cena | Documento nao fecha fio; fecharia promessa sem cena | Deixaria a regra de Chekhov passar com o fio aberto |
