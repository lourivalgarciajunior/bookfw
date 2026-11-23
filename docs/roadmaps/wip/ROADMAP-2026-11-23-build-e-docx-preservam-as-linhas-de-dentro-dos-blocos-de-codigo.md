---
status: wip
date: 2026-11-23
req: "docs/req/REQ-2026-11-23-build-e-docx-preservam-as-linhas-de-dentro-dos-blocos-de-codigo.md"
squad: ""
---

# Roadmap: build e docx preservam as linhas de dentro dos blocos de codigo

> Created: 2026-11-23 | Status: wip

## Context

REQ: docs/req/REQ-2026-11-23-build-e-docx-preservam-as-linhas-de-dentro-dos-blocos-de-codigo.md

Aplica o ADR-2026-11-18-a-prosa-so-perde-os-titulos-que-o-bookfw-reemite-e-mantem-do-terceiro-nivel-para-baixo:
dentro de cerca de codigo nao ha titulo que o bookfw reemita. Sem ADR novo. Bug
concreto, medido na obra `pessoal/book/verde-nao-e-prova` (caps. 4 e 29).

## Acceptance Criteria

- [ ] `#`/`##` e comentario HTML dentro de cerca ``` e ~~~ saem literais no build, com e sem contrato de cena (AC1, AC2, AC3, AC5).
- [ ] `# Titulo` e `## Cena` fora de cerca continuam saindo (AC4).
- [ ] A linha aparece no bloco de codigo do DOCX (AC6).
- [ ] `npm run check` verde, com teste provado por mutacao (AC7).

## Status Legend
⬜ Pending · 🔄 In progress · ✅ Done · ❌ Blocked

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Done
**Files affected:** este roadmap
**Actions:**
1. Enumeration completeness — `grep -n "TITULO_DE_ESTRUTURA\|prosaDe(\|<!--\[" src/*.mjs`
   em 2026-11-23: a limpeza da prosa mora em dois lugares de `src/core.mjs`,
   a extracao por cena (`cenasDe`, linhas 190-192) e `prosaDe` (208-212).
   `prosaDe` alimenta `build` (via `prosaFinal`), `docx` (via `prosaFinal`),
   `brief` (cauda e contexto) e a contagem de palavras do `capitulos()`. O
   `fragmentos` (linha 494) e o `validate` (217) tambem tiram comentario HTML,
   mas estao fora do escopo da REQ. A lista dos caminhos da prosa e fechada.
2. Threat model — quem esvazia isto sem quebrar regra escrita: um teste que so
   monta capitulo com contrato de cena passa com `prosaDe` sem protecao; um
   teste que so usa ``` passa sem tratar ~~~; um teste que so confere a linha
   de dentro passa com a protecao vazando para fora e deixando o `# Titulo` do
   capitulo no manuscrito.
3. Falsification targets — regride para o lado antigo: a linha `# comentario`
   de dentro da cerca some (o teste exige a linha no manuscrito e no DOCX, nos
   dois caminhos, com ``` e ~~~). Regride para o lado oposto: `# Titulo` ou
   `## Cena 1` fora de cerca aparecem no manuscrito, ou o comentario HTML fora
   de cerca sobra (o teste exige que nao).
4. Declared residual — manuscritos e DOCX ja gerados continuam sem a linha ate
   o proximo `build`/`docx`; cerca nao fechada vale ate o fim do texto, como no
   `src/markdown.mjs`.
**Acceptance criteria:**
- [x] The four sections above answered with evidence, not a one-line assertion
- [x] No implementation line written for this ML

**Wave gates:**
```bash
grep -c "TITULO_DE_ESTRUTURA" src/core.mjs
```

## Wave 1 — Implementation
> Dependencies: Wave 0. Um ML so: codigo e teste mudam juntos, e o teste de
> mutacao depende do codigo.

### ML-1A — a limpeza da prosa para na cerca de codigo
**Status:** 🔄 In progress
**Files affected:** `src/core.mjs`, `test/smoke.mjs`, `CHANGELOG.md`, `package.json`, `package-lock.json`
**Actions:**
1. Em `src/core.mjs`, criar `foraDeCerca(texto, fn)`, que aplica `fn` so aos
   trechos fora de bloco cercado (`^\s*(?:```|~~~)`, o mesmo reconhecimento do
   `src/markdown.mjs`), mantendo as linhas da cerca e de dentro intactas.
2. Usar `foraDeCerca` para o comentario HTML e o `TITULO_DE_ESTRUTURA` em
   `cenasDe` e em `prosaDe`. O contrato ```cena continua saindo antes, como hoje.
3. Em `test/smoke.mjs`, bloco 0.10.3: capitulo com contrato e capitulo sem
   contrato, cada um com bloco ``` e ~~~ contendo `# comentario`, `## linha` e
   `<!-- literal -->`, e com `# Titulo`, `## Cena 1` e `<!-- nota -->` fora.
   Conferir manuscrito e DOCX nos dois sentidos.
4. Provar por mutacao: trocar `foraDeCerca(x, fn)` por `fn(x)` e ver o teste falhar.
5. Subir para 0.10.3 (`package.json`, `package-lock.json`) e registrar no `CHANGELOG.md`.
**Acceptance criteria:**
- [ ] AC1 a AC6 da REQ cobertos pelo teste novo
- [ ] Mutacao faz o teste falhar; sem ela, `npm run check` verde

**Wave gates:**
```bash
npm run check
trackfw validate
```
