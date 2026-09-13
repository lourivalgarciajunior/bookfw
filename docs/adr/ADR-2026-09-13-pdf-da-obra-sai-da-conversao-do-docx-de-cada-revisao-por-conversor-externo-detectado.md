---
status: Accepted
date: 2026-09-13
author: "Lourival Garcia"
---

# ADR: PDF da obra sai da conversao do DOCX de cada revisao por conversor externo detectado

> Date: 2026-09-13 | Status: Accepted

## Context

O autor pediu, em 2026-09-13, o manuscrito em PDF para **todos os arquivos de
revisao** da obra `ninguem-nasce-santo` — hoje `manuscrito/Ninguém nasce santo —
revisao 1.docx` e `— revisao 2.docx` — e que isso vire funcionalidade do CLI.

Tres fatos pesam:

1. **A revisao antiga so existe como DOCX.** O registro `docs/revisoes.md` guarda
   numero, data, contagem e commit, mas a prosa ja mudou desde a revisao 1. Gerar
   o PDF da revisao 1 a partir do manuscrito atual produziria a revisao 2 com o
   nome da 1 — um arquivo que mente sobre o que o leitor leu.
2. **O DOCX ja e a versao de leitura aprovada**: miolo A5, rosto com carimbo,
   Partes, ressalvas. Um segundo desenho de pagina, em outro motor, divergiria
   dele na primeira correcao — a mesma doenca das copias do `gerar-docx.mjs`
   (ADR-2026-08-31 do docx).
3. **Nao existe motor de PDF embarcavel que leia DOCX em Node sem dependencia
   pesada.** Converter DOCX com fidelidade exige um processador de texto. Nesta
   maquina ha Microsoft Word 16 e nao ha LibreOffice nem pandoc; no CI (Ubuntu)
   nao ha nenhum dos dois.

## Decision

`bookfw pdf` converte **cada DOCX de revisao** em `manuscrito/` (arquivo que casa
`<titulo> — revisao N.docx`) num PDF de mesmo nome, ao lado dele. Nao gera DOCX e
nao le o manuscrito.

A conversao e feita por um **conversor externo**, resolvido nesta ordem:

1. `--conversor <valor>` ou a variavel `BOOKFW_PDF_CONVERSOR`;
2. LibreOffice (`soffice` no PATH ou no caminho padrao de instalacao);
3. Microsoft Word por automacao COM, so no Windows, via PowerShell.

`<valor>` aceita `soffice`, `word` ou o caminho de um executavel proprio, chamado
com `<entrada.docx> <saida.pdf>` (script `.mjs`/`.js` roda com o Node do CLI).
Esse terceiro caso existe para quem usa outro conversor e e o que torna o comando
testavel sem Word nem LibreOffice.

Regras:

- Por padrao converte **todas** as revisoes; `--revisao N` limita a uma.
- PDF mais novo que o DOCX e pulado; `--forcar` converte de novo.
- Arquivo de trava do Word (`~$...`) nunca entra.
- O PDF so conta como gerado se existir, nao estiver vazio e comecar com `%PDF`;
  caso contrario o comando falha dizendo qual arquivo.
- Caminho de arquivo nunca passa por shell: `spawnSync` com lista de argumentos,
  e para o Word o lote vai por variavel de ambiente em JSON.
- O Word abre o DOCX **somente leitura** — o autor pode estar com ele aberto — e
  e fechado num `finally`, com ou sem erro.

## Consequences

- O PDF e fiel ao DOCX aprovado, inclusive nas revisoes antigas, que continuam
  existindo como arquivo.
- O bookfw continua sem dependencia nova no `package.json`. O conversor e do
  sistema, como o `docx` e o `resvg` sao opcionais.
- O comando depende do ambiente: no CI e em maquina sem Word nem LibreOffice ele
  falha com a mensagem do que instalar. O smoke cobre a selecao, os nomes, o
  pulo, o `--revisao`, o `--forcar` e a validacao do `%PDF` com um conversor de
  teste; a conversao real e verificada na obra, abrindo o PDF.
- Revisao registrada que nao tem DOCX nao ganha PDF, e o comando diz quais
  faltam. Recuperar a prosa de uma revisao antiga pelo commit fica fora.

## Alternatives Considered

| Opcao | Por que nao |
|---|---|
| Gerar PDF nativo do manuscrito (pdfkit, pdf-lib) | Segundo desenho de pagina a manter em paralelo ao DOCX; e as revisoes antigas sairiam com a prosa atual |
| Reconstruir cada revisao pelo commit do registro e gerar dela | Exige worktree por revisao e reexecutar `docx` da epoca; caro, e o DOCX da epoca ja existe |
| Exigir LibreOffice | Nao esta instalado na maquina do autor, que tem Word |
| Gerar o PDF dentro do `bookfw docx` | Mistura um comando sem dependencia de sistema com um que depende; quem so quer DOCX passaria a precisar de conversor |
