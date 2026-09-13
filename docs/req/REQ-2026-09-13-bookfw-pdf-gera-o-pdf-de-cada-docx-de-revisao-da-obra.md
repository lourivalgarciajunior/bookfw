---
status: Done
date: 2026-09-13
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-09-13-pdf-da-obra-sai-da-conversao-do-docx-de-cada-revisao-por-conversor-externo-detectado.md"
roadmap: "docs/roadmaps/done/ROADMAP-2026-09-13-bookfw-pdf-gera-o-pdf-de-cada-docx-de-revisao-da-obra.md"
---

# REQ: bookfw pdf gera o PDF de cada DOCX de revisao da obra

> Date: 2026-09-13 | Status: Open

## Motivation

O autor pediu o manuscrito em PDF para todos os arquivos de revisao da obra
`ninguem-nasce-santo` (revisao 1 e revisao 2, hoje so em DOCX) e que isso vire
funcionalidade do bookfw. PDF e o formato que abre igual em qualquer aparelho e
que o leitor nao edita sem querer; o DOCX de leitura continua sendo a fonte.

Decisao em ADR-2026-09-13-pdf-da-obra-sai-da-conversao-do-docx-de-cada-revisao-por-conversor-externo-detectado.

## Acceptance Criteria

- [x] `bookfw pdf` acha em `manuscrito/` todo arquivo `<titulo> — revisao N.docx` e gera `<titulo> — revisao N.pdf` ao lado.
- [x] Arquivo de trava do Word (`~$...`) e qualquer DOCX fora do padrao de revisao nao entram.
- [x] `--revisao N` converte so aquela revisao; revisao sem DOCX e erro que diz o que falta.
- [x] PDF mais novo que o DOCX e pulado e contado; `--forcar` converte de novo.
- [x] Conversor resolvido por `--conversor`, `BOOKFW_PDF_CONVERSOR`, LibreOffice e Word (Windows), nessa ordem; valor pode ser `soffice`, `word` ou caminho de executavel proprio chamado com `<entrada> <saida>`.
- [x] Sem conversor disponivel, erro com o que instalar; nenhum PDF parcial.
- [x] O PDF so conta como gerado se existir, nao estiver vazio e comecar com `%PDF`.
- [x] Nenhum caminho passa por shell; Word abre somente leitura e fecha em `finally`.
- [x] Saida diz quantos convertidos, quantos pulados e qual conversor.
- [x] `bookfw pdf` na AJUDA do bin e secao no README.
- [x] Regressao em `test/smoke.mjs` com conversor de teste, provada por mutacao.
- [x] `npm run check` verde; `trackfw validate` sem violacao; versao 0.8.0 no package.json e no CHANGELOG.
- [x] Plugin `bookfw` em `plugin-skill` documenta o comando (`commands/pdf.md` e fluxo na skill), com versao subida e gates rodados.
- [x] Na obra `ninguem-nasce-santo`, os PDFs das revisoes 1 e 2 gerados pelo comando, abertos e conferidos.

## Escopo negativo

- Nao gera PDF a partir do manuscrito nem da prosa atual.
- Nao reconstroi revisao antiga pelo commit.
- Nao muda o `bookfw docx` nem o nome dos DOCX.
- Nao converte a capa nem o briefing.
- Nao adiciona dependencia ao `package.json`.
- Nao publica release no GitHub nem no npm.

## Linked ADR
ADR: docs/adr/ADR-2026-09-13-pdf-da-obra-sai-da-conversao-do-docx-de-cada-revisao-por-conversor-externo-detectado.md

## Blocked by ADRs
<!-- none -->

## Linked Roadmap
Roadmap: docs/roadmaps/done/ROADMAP-2026-09-13-bookfw-pdf-gera-o-pdf-de-cada-docx-de-revisao-da-obra.md
