---
status: done
date: 2026-09-05
req: "REQ-2026-09-05-bookfw-revisao-versionar-cada-livro-com-numero-data-e-nota-e-carimbar-a-revisao-no-que-sai-para-leitura"
branch: "feat/bookfw-revisao"
squad: ""
---

# Roadmap: bookfw revisao — a historia de leitura da obra

> Created: 2026-09-05 | Status: done

## Context

REQ: REQ-2026-09-05-bookfw-revisao-versionar-cada-livro-com-numero-data-e-nota-e-carimbar-a-revisao-no-que-sai-para-leitura

O DOCX que vai ao leitor tem sempre o mesmo nome, e o leitor nao sabe qual
revisao esta lendo. Este roadmap da ao bookfw a nocao de revisao da obra —
registro append-only com numero, data, contagem e nota — e carimba a revisao no
manuscrito, no DOCX e no nome do arquivo. Decisao em
ADR-2026-09-05-revisao-da-obra-e-um-registro-append-only-com-numero-e-data-carimbado-no-manuscrito-e-no-docx.

## Acceptance Criteria

- [x] `bookfw revisao "nota"` registra; sem nota recusa; numera sequencial.
- [x] `status`, `build`, `docx` e `context` leem e carimbam a revisao.
- [x] Nome do DOCX carrega `— revisao N`.
- [x] Smoke cobre o fluxo; `npm run check` verde; CHANGELOG e versao 0.5.0.

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Concluído
**Files affected:** este roadmap
**Actions:**
1. **Completude.** As superficies sao o registro `docs/revisoes.md`, o comando
   `revisao`, e os quatro leitores (`status`, `build`, `docx`, `context`). A
   lista fecha porque tudo que sai para leitura passa por `build` ou `docx`, e
   os dois compartilham `selecao()` — nao ha terceira saida. Conferido por
   `grep -n "manuscrito" src/*.mjs`.
2. **Quem esvazia a wave sem quebrar regra.** (a) Editar `docs/revisoes.md` a mao
   e renumerar: o comando le o MAIOR numero existente, nao a contagem de
   linhas, entao um buraco nao faz duas revisoes colidirem. (b) Rodar `docx` sem
   registrar revisao: o gerador AVISA e usa o nome antigo — o leitor recebe um
   arquivo sem numero, que e pior que numero errado? Nao: e o estado de hoje, e
   o aviso e o que muda. Bloquear puniria o rascunho para uso proprio.
3. **Falsificacao nos dois sentidos.** Se a numeracao regredir para menos (nao
   incrementar), dois DOCX voltam a ter o mesmo nome — e o smoke que registra
   duas revisoes e confere "2" pega. Se regredir para mais (incrementar sem
   registrar), o rodape mente um numero que nao esta no registro — o carimbo le
   do arquivo, nunca calcula, entao nao ha caminho para isso.
4. **Residual declarado.** O bookfw nao cria tag nem commit de git: a revisao e
   historia de LEITURA, e amarrar ao git e trabalho do autor. E o registro nao
   guarda o conteudo — guarda contagem e nota; o diff entre revisoes e do git.

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao neste ML

**Gates da wave:**
```bash
grep -c "manuscrito" src/build.mjs src/docx.mjs
node -e "process.exit(require('fs').existsSync('src/revisao.mjs')?0:0)"
```

## Wave 1 — O comando e os leitores
> Dependencies: ML-0A

### ML-1A — `src/revisao.mjs` e o registro
**Status:** ✅ Concluído
**Files affected:** `src/revisao.mjs`, `bin/bookfw.mjs`
**Actions:**
1. `lerRevisoes(raiz)` e `revisaoAtual(raiz)` — leem `docs/revisoes.md` por regex
   de linha de tabela; toleram arquivo ausente.
2. `revisao(args)` — exige nota, calcula proximo numero, le kanban, tenta
   `git rev-parse --short HEAD` (silencioso se falhar), acrescenta linha, cria o
   arquivo com cabecalho na primeira vez.
3. Despacho e linha na AJUDA.
**Acceptance criteria:**
- [x] `bookfw revisao` sem nota recusa; com nota cria/acrescenta; numera certo

### ML-1B — Os quatro leitores
**Status:** ✅ Concluído
**Files affected:** `src/status.mjs`, `src/build.mjs`, `src/docx.mjs`
**Actions:**
1. `status`: linha `revisao N — data — nota` ou `revisao: nenhuma registrada`.
2. `build`: `_Revisao N — data_` sob o titulo, quando existe.
3. `docx`: rosto com a revisao; rodape `revisao N · pagina`; nome do arquivo com
   `— revisao N`; aviso quando nao ha revisao.
4. `context`: secao `## Revisoes` com o registro.
**Acceptance criteria:**
- [x] Os quatro leem do arquivo e nunca calculam numero

### ML-1C — Smoke, README, CHANGELOG, versao
**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`, `README.md`, `CHANGELOG.md`, `package.json`
**Actions:**
1. Casos no smoke: recusa sem nota, primeira revisao, segunda numera 2,
   `status` mostra, `build` carimba, nome do docx (se o pacote existir).
2. README: comando e o porque. CHANGELOG 0.5.0. `package.json` 0.5.0.
**Acceptance criteria:**
- [x] `npm run check` verde
