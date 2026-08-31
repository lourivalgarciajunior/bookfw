---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-exportacao-docx-vira-comando-do-bookfw-com-docx-como-dependencia-opcional"
roadmap: "ROADMAP-2026-08-31-bookfw-docx-exportacao-de-versao-de-leitura-no-cli"
---

# REQ: bookfw docx — exportacao de versao de leitura no CLI

> Date: 2026-08-31 | Status: Done
| Linear Issue: 
| Jira Issue: 

## Motivation

O gerador de versao de leitura em DOCX esta copiado em quatro projetos de
livro (`metamorfose`, `o-arquivo`, `o-boxeador-sonhador`, `dois-regimes`), e as
copias ja divergiram: tres correcoes vivem so no `dois-regimes`. O arquivo
nunca teve nada de especifico de uma obra — o cabecalho dele diz isso na
quinta linha. Enquanto a exportacao viver fora do CLI, toda correcao futura
nasce com tres livros para tras.

O bookfw ja tem, em `src/core.mjs`, tudo que o gerador reimplementava pior:
leitura de YAML raso com lista em bloco, separacao de frontmatter, varredura
do kanban de capitulos. O gerador precisa passar a usar esse nucleo.

## Acceptance Criteria

- [ ] `bookfw docx` existe, aparece no `--help` e gera o DOCX na raiz do
      projeto de livro, com o mesmo layout da versao atual (A5, Georgia,
      rosto, front matter, capitulos, rodape com numero de pagina).
- [ ] O comando usa `acharProjeto`, `lerConfig` e `capitulos` de
      `src/core.mjs` — nao reimplementa parser de YAML nem varredura de
      kanban.
- [ ] Frontmatter com `verificar:` em **lista em bloco** dispara o carimbo de
      ressalva, e frontmatter com `verificar:` **inline** continua disparando.
- [ ] O texto do carimbo sai de `ressalva_verificar` no `livro.yaml`, com
      "Fatos ainda nao verificados pelo autor" como padrao quando a chave nao
      existe.
- [ ] `origem:` contendo `ESPECIME` continua produzindo o carimbo de especime,
      e tem precedencia sobre o de `verificar:`.
- [ ] `docs/apendice.md`, quando existe, e renderizado no fim do livro com o
      mesmo tratamento do front matter: uma pagina por secao `## `.
- [ ] `docx` esta em `optionalDependencies`; com o pacote ausente o comando
      falha com mensagem que nomeia o pacote e o comando de instalacao, e o
      resto do CLI continua funcionando.
- [ ] `--desde <estado>` escolhe o corte de capitulos, com a mesma semantica
      e o mesmo padrao do `bookfw build`, e os dois comandos leem o kanban
      pela mesma funcao — o DOCX nao pode carimbar um capitulo que o
      manuscrito nao tem, nem depender de `bookfw build` ter rodado antes.
- [ ] Os quatro `tools/gerar-docx.mjs` foram removidos e o script `docx` do
      `package.json` de cada livro chama `bookfw docx`.
- [ ] `node test/smoke.mjs` passa, com casos novos cobrindo as duas formas de
      `verificar:`, o texto configuravel e o apendice.
- [ ] O DOCX da Metamorfose regenerado pelo comando novo tem o carimbo nos 10
      capitulos com `verificar:`, conferido no texto extraido do arquivo.

## Negative scope

Nao entra nesta REQ:

- EPUB e PDF. O ADR abre o lugar, esta REQ nao entrega;
- capa, ISBN, ficha catalografica ou qualquer preparo de publicacao;
- mudanca no layout tipografico. A saida nova tem de ser equivalente a atual;
- mudanca no formato do frontmatter dos capitulos ou no `bookfw validate`.
  O gerador le o que ja existe; nao passa a cobrar `verificar:` de ninguem;
- migracao dos livros para uma versao publicada no npm. A instalacao local
  via `npm link` e o alvo desta entrega.

## Linked ADR
ADR: `docs/adr/ADR-2026-08-31-exportacao-docx-vira-comando-do-bookfw-com-docx-como-dependencia-opcional.md`

## Blocked by ADRs
<!-- none -->

## Linked Roadmap
Roadmap: ROADMAP-2026-08-31-bookfw-docx-exportacao-de-versao-de-leitura-no-cli
