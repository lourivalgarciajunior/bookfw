---
status: done
date: 2026-09-13
req: "docs/req/REQ-2026-09-13-bookfw-pdf-gera-o-pdf-de-cada-docx-de-revisao-da-obra.md"
branch: "feat/bookfw-pdf-gera-o-pdf"
squad: ""
---

# Roadmap: bookfw pdf gera o PDF de cada DOCX de revisao da obra

> Created: 2026-09-13 | Status: done

## Context

REQ: docs/req/REQ-2026-09-13-bookfw-pdf-gera-o-pdf-de-cada-docx-de-revisao-da-obra.md

Decisao em ADR-2026-09-13-pdf-da-obra-sai-da-conversao-do-docx-de-cada-revisao-por-conversor-externo-detectado:
o PDF sai da conversao do DOCX de cada revisao, por LibreOffice ou Word (COM,
Windows), ou por conversor proprio informado. Pedido do autor em 2026-09-13
para a obra `pessoal/book/ninguem-nasce-santo` (revisoes 1 e 2).

Ambiente medido: Word 16 presente, LibreOffice e pandoc ausentes nesta maquina;
no CI Ubuntu nenhum dos dois. Por isso o smoke usa conversor de teste e a
conversao real e conferida na obra (ML-2C).

Arquivos compartilhados: `src/pdf.mjs` so no ML-1A; `bin/bookfw.mjs` so no
ML-1B; `test/smoke.mjs` so no ML-1C. 1B depende da exportacao de 1A e 1C dos
dois, entao a onda 1 e sequencial.

## Acceptance Criteria

- [x] Todo `<titulo> — revisao N.docx` de `manuscrito/` vira `<titulo> — revisao N.pdf`; trava `~$` e DOCX fora do padrao ficam fora.
- [x] `--revisao N`, `--forcar` e pulo do PDF atualizado.
- [x] Conversor por `--conversor`, `BOOKFW_PDF_CONVERSOR`, LibreOffice e Word; proprio chamado com `<entrada> <saida>`.
- [x] Sem conversor, erro com o que instalar; PDF validado por `%PDF`.
- [x] Nenhum caminho por shell; Word somente leitura e fechado em `finally`.
- [x] AJUDA, README, CHANGELOG 0.8.0, package.json 0.8.0.
- [x] Smoke com conversor de teste, provado por mutacao; `npm run check` verde; `trackfw validate` limpo.
- [x] Plugin `bookfw` documenta `/bookfw:pdf`, versao subida, gates verdes.
- [x] PDFs das revisoes 1 e 2 da obra gerados pelo comando e abertos.

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Concluído
**Files affected:** nenhum (analise)

**1. Completude da enumeracao.** Superficies que o comando toca: (a) leitura de
`manuscrito/` (selecao por nome); (b) escrita de `.pdf` ao lado do DOCX; (c)
execucao de processo externo (soffice, powershell/Word, executavel proprio);
(d) saida no terminal; (e) AJUDA do bin, que o lint cobra (regra 3); (f) plugin
`bookfw` em `plugin-skill`, que hoje nao tem `commands/pdf.md` nem menciona PDF
(`grep -rn "pdf" plugin-skill/plugins/bookfw` volta vazio). `grep -rn "\.pdf"
src bin` volta vazio: nenhum outro ponto do CLI emite PDF, entao nao ha emissor
concorrente. O `docx.mjs` monta o nome `<titulo> — revisao N.docx` na linha 360;
o `pdf` depende desse formato e o smoke fixa o casamento.

**2. Modelo de ameaca (quem esvazia esta onda sem quebrar regra escrita).**
- Teste que so confira "saiu um arquivo .pdf" passa com conversor quebrado que
  cria arquivo vazio. O comando valida `%PDF` e o smoke tem um conversor que
  escreve lixo e precisa reprovar.
- Teste que so rode sem arquivos de trava passa com a trava do Word entrando no
  lote. O smoke cria `~$...docx` de proposito.
- Nome de obra com travessao, acento ou aspas passado por shell quebra ou
  injeta. O comando nunca usa shell; o smoke usa titulo com travessao e acento.
- Word travado deixa `WINWORD.EXE` pendurado. `finally` com `Quit()`; o ML-3A
  confere o processo depois de uma falha provocada.

**3. Alvos de falsificacao nas duas direcoes.**
- Regressao por omissao: revisao que existe e nao vira PDF, ou `--revisao` que
  converte todas. Smoke conta os PDFs gerados.
- Regressao por excesso: trava ou DOCX sem numero convertido, ou PDF atualizado
  reconvertido sem `--forcar`. Smoke confere a ausencia e o contador de pulados.
- Validacao frouxa (aceita vazio) ou rigida demais (recusa PDF valido). Smoke
  com conversor que escreve `%PDF-1.4` e com um que escreve outra coisa.

**4. Residual declarado.** A conversao real (Word e LibreOffice) nao roda no CI;
e conferida na obra, abrindo o PDF. Revisao registrada sem DOCX nao ganha PDF.
Diferencas de paginacao entre Word e LibreOffice nao sao controladas. O comando
nao impede o autor de editar o PDF depois; o proximo `--forcar` sobrescreve.

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao neste ML

**Gates da wave:**
```bash
test -z "$(grep -rln '\.pdf' src bin)" && echo "nenhum emissor de PDF no CLI antes do ML-1A"
```

## Wave 1 — Implementation
> Dependencies: Wave 0. Sequencial (1B importa 1A; 1C exercita os dois).

### ML-1A — `src/pdf.mjs`
**Status:** ✅ Concluído
**Arquivos:** `src/pdf.mjs` (novo)
**Acoes:**
1. `revisoesComDocx(raiz)`: lista `manuscrito/`, casa `/^(?!~\$)(.+) — revisao (\d+)\.docx$/`, devolve `{ numero, docx, pdf }` ordenado por numero.
2. `resolverConversor(pedido)`: `pedido` de `--conversor` ou `BOOKFW_PDF_CONVERSOR`; sem pedido, `soffice` no PATH ou em `Program Files/LibreOffice/program/soffice.exe`, depois `word` se `process.platform === 'win32'`; caminho existente vira conversor proprio; nada disso, `Erro` com o que instalar.
3. Converter: proprio via `spawnSync(node|exe, [entrada, saida])`; soffice via `spawnSync(soffice, ['--headless','--convert-to','pdf','--outdir', dir, entrada])`; Word via `spawnSync('powershell', ['-NoProfile','-NonInteractive','-Command', SCRIPT])` com o lote em `BOOKFW_PDF_LOTE` (JSON), `Documents.Open(caminho, $false, $true)`, `ExportAsFixedFormat(saida, 17)`, `Close($false)` e `Quit()` em `finally`.
4. Validar cada saida (existe, >0 byte, comeca com `%PDF`); falha lista os arquivos.
5. `pdf(args)`: `--revisao`, `--forcar`, pulo por `mtime`, saida `pdf gerado <arquivo>` e `N convertidos | M ja atualizados | conversor X`.
**Aceite:** `node -e "import('./src/pdf.mjs')"` carrega; nenhum `shell: true` nem template com caminho em string de comando.

### ML-1B — rota e ajuda
**Status:** ✅ Concluído
**Arquivos:** `bin/bookfw.mjs`
**Acoes:** `import { pdf }`, `case 'pdf': await pdf(args)`, linhas na AJUDA para `bookfw pdf [--revisao N] [--forcar]` e `--conversor`.
**Aceite:** `npm run lint` verde (regra comando-sem-ajuda).

### ML-1C — regressao no smoke
**Status:** ✅ Concluído
**Arquivos:** `test/smoke.mjs`
**Acoes:** projeto com titulo acentuado e travessao, `manuscrito/` com DOCX de revisao 1 e 2, uma trava `~$` e um `— versao de leitura.docx`; conversor de teste `.mjs` que escreve `%PDF-1.4`. Conferir: dois PDFs e nenhum a mais; segunda execucao pula dois; `--revisao 1 --forcar` converte um; `--revisao 9` erro; sem DOCX de revisao erro; conversor que escreve lixo faz o comando falhar; `--conversor` inexistente erro.
**Aceite:** verde; com a validacao `%PDF` removida ou com a trava liberada, reprova (mutacao registrada no commit).

**Barreira da onda 1:**
```bash
npm run check && trackfw validate
```

## Wave 2 — Documentacao, release e obra
> Dependencies: Wave 1. 2A e 2B em repositorios diferentes, independentes; 2C depois de 2A no main.

### ML-2A — README, CHANGELOG, versao e contexto
**Status:** ✅ Concluído
**Arquivos:** `README.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`, `docs/agents-working-context.md`
**Acoes:** secao "O PDF das revisoes" no README e linha no Uso; `## 0.8.0 — 2026-09-13` em Adicionado; 0.7.2 → 0.8.0; entrada no contexto.
**Aceite:** lint (changelog da versao) verde.

### ML-2B — plugin `bookfw`
**Status:** ✅ Concluído
**Arquivos:** `plugin-skill/plugins/bookfw/commands/pdf.md` (novo), `plugin-skill/plugins/bookfw/skills/bookfw/SKILL.md`, `plugin-skill/plugins/bookfw/.claude-plugin/plugin.json`
**Acoes:** comando `/bookfw:pdf` delegando a Hermes; fluxo da skill com `bookfw pdf` depois do `docx`; versao 0.6.0 → 0.7.0; `npm run lint`, `claude plugin validate .`, `trackfw validate` no plugin-skill; commit e push; `claude plugin marketplace update indieexpert` e `claude plugin update bookfw@indieexpert`.
**Aceite:** gates verdes e cache com a versao nova.

### ML-2C — PDFs da obra
**Status:** ✅ Concluído
**Arquivos:** `pessoal/book/ninguem-nasce-santo/manuscrito/*.pdf` (outro repositorio)
**Acoes:** `bookfw pdf` na obra; abrir os dois PDFs e conferir rosto, carimbo da revisao, divisores de Parte e paginacao; comitar la.
**Aceite:** `Ninguém nasce santo — revisao 1.pdf` e `— revisao 2.pdf` abertos e corretos.
**Evidencia:** `bookfw pdf` → `2 convertido(s) | 0 ja atualizado(s) | conversor word`; rerun pula os dois. Revisao 1 com 105 paginas, revisao 2 com 107, A5 (420×595 pt), `%PDF-1.7`. Paginas renderizadas e abertas: rosto com carimbo e nota da revisao, divisor da Parte I, abertura do cap 1 com ressalva, a vinha (p. 99) e a ultima pagina (p. 107). Commit d6b7ef2 no repositorio da obra.

## Wave 3 — Red team
> Dependencies: Wave 2.

### ML-3A — tentativa de quebrar
**Status:** ✅ Concluído
**Arquivos:** nenhum (verificacao)
**Acoes:** DOCX aberto no Word durante a conversao; DOCX corrompido (conversor falha) e conferir que nao sobra `WINWORD.EXE`; caminho com aspas e `&`; `BOOKFW_PDF_CONVERSOR` apontando para arquivo inexistente.
**Aceite:** nenhum caso deixa processo pendurado, PDF parcial contado como gerado ou erro sem mensagem.
