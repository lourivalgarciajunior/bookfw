---
status: Accepted
date: 2026-11-20
author: "Lourival Garcia"
---

# ADR: o retitle troca o titulo do corpo so quando ele repete o titulo antigo

> Date: 2026-11-20 | Status: Accepted

## Context

O capitulo nasce do template `templates/capitulo.md` com o titulo em dois
lugares: `titulo:` no frontmatter e `# {{titulo}}` na primeira linha do corpo.
O `bookfw cap retitle` existe para que nome de arquivo, `id`, `numero` e
`titulo` mudem juntos (0.3.0), mas `reescrever` em `src/cap.mjs` so reescreve o
frontmatter: o `#` do corpo fica com o titulo velho.

Medido em 2026-11-20 na obra `pessoal/book/verde-nao-e-prova`:
`bookfw cap retitle 30 "Vinte e uma horas em Arapongas"` renomeou o arquivo e
trocou o frontmatter, e a linha 12 continuou `# Vinte e uma horas em São Paulo`.
O mesmo tinha acontecido no cap. 1 da mesma obra (`# Diga oi`). Nos dois casos
o defeito so foi visto lendo o arquivo.

O `#` do corpo nao sai no manuscrito (o `build` reemite o titulo a partir do
frontmatter), mas e o que o autor le no editor, e o que o `brief` e o `context`
mostram ao agente que escreve.

## Decision

O `retitle` troca o primeiro `# ` do corpo **so quando** ele e a primeira linha
nao vazia depois do frontmatter **e** o texto dele, sem espacos nas pontas, e
igual ao titulo antigo do frontmatter. Em qualquer outro caso — `#` com texto
que o autor mudou, `#` mais abaixo, nenhum `#` — o corpo fica como esta e o
comando diz, numa linha, que manteve.

O `renumber` nao muda titulo e por isso nao toca o corpo.

## Consequences

- Capitulo nascido do template e nunca editado no H1 sai coerente do retitle,
  sem passo manual.
- H1 que o autor personalizou nunca e sobrescrito; o comando avisa, e o autor
  decide.
- Linha `# ` dentro da prosa ou de bloco de codigo nunca e tocada, porque so a
  primeira linha nao vazia do corpo e candidata.
- Capitulo ja retitulado antes desta versao, com H1 velho, nao e consertado
  retroativamente: o H1 dele nao repete o titulo atual do frontmatter, e um
  retitle novo so o troca se ele repetir o titulo de antes desse retitle.

## Alternatives Considered

| Opção | Por que não |
|---|---|
| Sempre trocar o primeiro `#` do corpo | Sobrescreve H1 que o autor escreveu de proposito |
| Trocar todo `# ` igual ao titulo antigo | Pega linha de prosa ou de codigo que por acaso repete o titulo |
| Nao trocar e so avisar | O caso comum (H1 do template) continua exigindo edicao manual, que foi o defeito |
| Gate no `validate` comparando H1 e frontmatter | Util, mas e outra REQ: aqui o defeito e o comando deixar a incoerencia, nao o gate deixar de ver |
