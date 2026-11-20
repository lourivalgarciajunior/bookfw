---
status: wip
date: 2026-11-20
req: "docs/req/REQ-2026-11-20-cap-retitle-atualiza-o-titulo-do-corpo-junto-com-o-frontmatter.md"
squad: ""
---

# Roadmap: cap retitle atualiza o titulo do corpo junto com o frontmatter

> Created: 2026-11-20 | Status: wip

## Context

REQ: docs/req/REQ-2026-11-20-cap-retitle-atualiza-o-titulo-do-corpo-junto-com-o-frontmatter.md

Decisao em ADR-2026-11-20-o-retitle-troca-o-titulo-do-corpo-so-quando-ele-repete-o-titulo-antigo.

O PR #7 (`chore/publish-log-detalhado`, so CI) continua aberto. Este fix sai
em branch propria a partir de `origin/main` e nao toca os arquivos dele
(`.github/workflows/`).

## Acceptance Criteria

- [ ] H1 do template trocado junto com o frontmatter (AC1).
- [ ] H1 personalizado mantido, com aviso (AC2); linha `#` fora da abertura intocada (AC3).
- [ ] CRLF preservado (AC4); `renumber` sem mexer no corpo (AC5).
- [ ] `npm run check` verde, com teste provado por mutacao (AC6).

## Status Legend
⬜ Pending · 🔄 In progress · ✅ Done · ❌ Blocked

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Done
**Files affected:** este roadmap
**Actions:**
1. Enumeration completeness — `grep -rn "writeFileSync" src` em 2026-11-20:
   quem reescreve arquivo de capitulo existente e `src/cap.mjs` (`reescrever`,
   chamado por `retitle` e `renumber`), `src/cena.mjs` (anexa bloco de cena no
   fim, nao toca titulo) e `src/core.mjs` `moverCapitulo` (so `estado:`).
   Quem cria capitulo com H1 e o template `templates/capitulo.md`
   (`# {{titulo}}`), via `cap new` e `sum --materializar` (`src/novo.mjs`), que
   nao reescreve arquivo existente. A lista e fechada: o unico caminho que muda
   titulo de capitulo existente e `reescrever` com `titulo` novo.
2. Threat model — quem esvazia isto sem quebrar regra escrita: um teste que so
   confere o frontmatter (o que ja existe) passa com a troca do H1 removida;
   e um teste que monta o capitulo com `\n` nunca exercita o CRLF do disco do
   autor no Windows, que e onde o defeito foi medido.
3. Falsification targets — regride para o lado antigo: o H1 fica velho (o
   teste exige `# O nome novo` no corpo). Regride para o lado oposto: o
   comando sobrescreve H1 personalizado ou uma linha `#` da prosa (o teste
   monta os dois casos e exige que fiquem intactos).
4. Declared residual — capitulos ja retitulados antes desta versao continuam
   com H1 velho; nao ha gate no `validate` para a divergencia H1 x
   frontmatter.
**Acceptance criteria:**
- [x] The four sections above answered with evidence, not a one-line assertion
- [x] No implementation line written for this ML

**Wave gates:**
```bash
grep -c "reescrever(" src/cap.mjs
```

## Wave 1 — Implementation
> Dependencies: Wave 0. Um ML so: codigo e teste mudam juntos, e o teste de
> mutacao depende do codigo.

### ML-1A — retitle troca o H1 que repete o titulo antigo
**Status:** 🔄 In progress
**Files affected:** `src/cap.mjs`, `test/smoke.mjs`, `CHANGELOG.md`, `package.json`, `package-lock.json`
**Actions:**
1. Em `src/cap.mjs`, `reescrever`: depois de montar o frontmatter, se o
   `titulo` mudou, trocar no resto do arquivo a primeira linha nao vazia
   quando ela for `# <titulo antigo>` (comparando sem espacos nas pontas),
   preservando o `\r` da linha. Devolver se o H1 foi `trocado`, `mantido`
   (existe e difere) ou `ausente`.
2. Em `capRetitle`, imprimir uma linha quando o H1 for `mantido`, com o texto
   que ficou.
3. Em `test/smoke.mjs`, no bloco do retitle: H1 do template trocado (AC1);
   H1 personalizado intacto e a saida com o aviso (AC2); linha
   `# <titulo antigo>` na prosa intacta (AC3); capitulo com CRLF trocado e com
   `\r\n` preservado (AC4); `renumber` sem tocar o corpo (AC5).
4. `CHANGELOG.md` com a 0.10.2 e `version` 0.10.2 em `package.json` (e no
   lock).
**Acceptance criteria:**
- [ ] AC1 a AC5 cobertos por teste de fumaca
- [ ] Mutacao: comentar a troca do H1 faz pelo menos o teste de AC1 falhar
- [ ] `npm run check` verde

**Wave gates:**
```bash
npm run check
```
