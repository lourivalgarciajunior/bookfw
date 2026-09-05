---
status: Accepted
date: 2026-09-05
author: "Lourival Garcia"
---

# ADR: Revisao da obra e um registro append-only com numero e data, carimbado no manuscrito e no DOCX

> Date: 2026-09-05 | Status: Accepted

## Context

Um livro governado pelo bookfw sai para leitura de terceiros varias vezes antes
de fechar. "Os Oito Modelos da Reforma Tributaria" foi ao revisor tecnico duas
vezes em tres dias, e o segundo DOCX tinha o **mesmo nome de arquivo** do
primeiro: `<titulo> — versao de leitura.docx`. Quem recebeu nao tinha como saber
qual estava lendo, e quem mandou nao tinha como citar "a versao que voce leu"
sem descrever o conteudo.

O git guarda a historia do repositorio, mas o leitor nao recebe o repositorio:
recebe um arquivo. E o commit nao e unidade de leitura — houve dezesseis commits
entre as duas leituras, e nenhum deles e "a revisao 2".

Hoje o bookfw nao tem nocao de **revisao da obra**. `livro.yaml` e declarado
invariante ("mudar exige DEC"), e nao e lugar para um contador que avanca a cada
leitura. `build` e `docx` carimbam a data de geracao no console, e nada no
artefato.

## Decision

**A revisao da obra e um registro append-only em `docs/revisoes.md`, com
numero sequencial, data, contagem no momento e nota — e o numero e a data saem
carimbados em tudo o que vai para leitura.**

Um comando novo, `bookfw revisao "nota"`, acrescenta uma linha ao registro. O
numero e o proximo inteiro; a data e a de hoje; a contagem (capitulos por
estado, palavras, capitulos com ressalva) e lida do kanban na hora; a nota e do
autor e obrigatoria — revisao sem motivo escrito e revisao que ninguem sabe
distinguir da anterior. Se o projeto estiver num repositorio git, o commit curto
entra na linha, so leitura, sem criar tag nem commit.

**O que le o registro:**

- `status` mostra a revisao corrente numa linha, ou avisa que nao ha nenhuma;
- `build` escreve `_Revisao N — data_` sob o titulo do manuscrito;
- `docx` poe a revisao na pagina de rosto e no rodape, e o **nome do arquivo**
  passa a carregar `— revisao N`. Dois DOCX de revisoes diferentes nunca mais
  tem o mesmo nome;
- `context` inclui o registro, para um agente saber em que revisao a obra esta.

**O que o registro NAO e:** nao e versao semantica (o livro nao tem API), nao e
tag de git (o bookfw nao escreve no git de ninguem), e nao mora no `livro.yaml`
(que e invariante por decisao anterior). E a **historia de leitura** da obra, e
so isso.

## Consequences

**Positivas.**

- O leitor externo sabe o que esta lendo, pelo nome do arquivo e pela pagina de
  rosto — sem abrir o repositorio.
- O autor consegue dizer "isso mudou entre a revisao 2 e a 3" apontando para
  duas linhas de um arquivo, com a contagem de cada uma ao lado.
- O registro e markdown no repositorio da obra, entao vai no commit como todo
  `.md` autoral, e o git continua sendo a fonte.

**Negativas, e sao aceitas.**

- Mais um passo antes de mandar o arquivo: `bookfw revisao` e depois `bookfw
  docx`. O `docx` **avisa** quando nao ha revisao registrada, e nao bloqueia —
  gerar um rascunho para si mesmo nao deveria exigir cerimonia.
- O numero nao diz o tamanho da mudanca. E proposital: dizer isso e o papel da
  nota, e um esquema `maior.menor` para prosa seria numero com cara de rigor e
  sem o rigor.

## Alternatives Considered

**Tag de git por revisao.** Recusada: o bookfw nao toca no git de ninguem, e a
tag nao chega ao leitor — o DOCX chega. O registro le o commit corrente para
amarrar as duas historias, e para ai.

**Campo `revisao:` no `livro.yaml`.** Recusada: o manifesto e invariante por
decisao de obra, e um contador que avanca a cada leitura e o oposto de
invariante. Alem disso, um campo guarda so a revisao atual, e a pergunta que
importa e "o que mudou desde a que voce leu" — que precisa das anteriores.

**Versao semantica.** Recusada: `maior.menor.patch` promete uma semantica de
compatibilidade que nao existe em prosa. Numero inteiro e nota dizem o que
precisa ser dito.

**Data sozinha, sem numero.** Recusada: duas revisoes no mesmo dia aconteceram
neste livro, e teriam o mesmo nome.
