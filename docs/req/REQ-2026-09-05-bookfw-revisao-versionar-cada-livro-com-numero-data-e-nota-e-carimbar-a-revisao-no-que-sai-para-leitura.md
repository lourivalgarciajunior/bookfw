---
status: Done
date: 2026-09-05
author: "Lourival Garcia"
adr: "ADR-2026-09-05-revisao-da-obra-e-um-registro-append-only-com-numero-e-data-carimbado-no-manuscrito-e-no-docx"
roadmap: "ROADMAP-2026-09-05-bookfw-revisao"
---

# REQ: bookfw revisao — versionar cada livro com numero, data e nota, e carimbar a revisao no que sai para leitura

> Date: 2026-09-05 | Status: Done
| Linear Issue:
| Jira Issue:

## Motivation

Um livro vai a leitores externos varias vezes antes de fechar, e hoje o DOCX que
sai tem sempre o mesmo nome. "Os Oito Modelos" foi ao revisor duas vezes em
tres dias e ele nao tinha como saber qual arquivo era qual. O commit nao serve
de unidade de leitura — houve dezesseis entre as duas — e o `livro.yaml` e
invariante por decisao de obra, entao nao pode carregar um contador.

Falta ao bookfw a nocao de **revisao da obra**: um numero, uma data, uma nota,
a contagem daquele momento — e o carimbo disso em tudo o que sai para leitura.
A decisao de desenho esta no ADR vinculado.

## Acceptance Criteria

- [x] `bookfw revisao "nota"` acrescenta uma linha a `docs/revisoes.md` com
      numero sequencial, data de hoje, capitulos por estado, palavras,
      capitulos com `verificar:` e a nota. Sem nota, recusa com mensagem clara.
- [x] O arquivo e **append-only**: o comando nunca reescreve linha anterior, e
      o numero e sempre o maior existente mais um.
- [x] Se a raiz do projeto estiver num repositorio git, a linha carrega o commit
      curto; se nao estiver, sai sem ele e sem erro. O bookfw nao cria commit
      nem tag.
- [x] `bookfw status` mostra a revisao corrente (numero, data e nota) ou
      `revisao: nenhuma registrada`.
- [x] `bookfw build` escreve a revisao sob o titulo do manuscrito quando ela
      existe.
- [x] `bookfw docx` poe a revisao na pagina de rosto e no rodape, e o nome do
      arquivo passa a ser `<titulo> — revisao N.docx`. Sem revisao registrada,
      **avisa** e gera com o nome antigo.
- [x] `bookfw context` inclui o registro de revisoes.
- [x] `bookfw validate` nao muda de comportamento.
- [x] Smoke cobre: primeira revisao cria o arquivo; segunda acrescenta e numera
      2; sem nota recusa; `status` mostra; `build` carimba; nome do DOCX carrega
      o numero (quando o pacote docx estiver disponivel no teste).
- [x] README e AJUDA do CLI documentam o comando; CHANGELOG e `package.json`
      sobem para 0.5.0.

## Linked ADR

ADR: `docs/adr/ADR-2026-09-05-revisao-da-obra-e-um-registro-append-only-com-numero-e-data-carimbado-no-manuscrito-e-no-docx.md`

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: `docs/roadmaps/done/ROADMAP-2026-09-05-bookfw-revisao.md`
