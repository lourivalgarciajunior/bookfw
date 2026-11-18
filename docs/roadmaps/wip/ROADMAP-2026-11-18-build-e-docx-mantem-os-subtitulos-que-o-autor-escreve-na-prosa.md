---
status: wip
date: 2026-11-18
req: "docs/req/REQ-2026-11-18-build-e-docx-mantem-os-subtitulos-que-o-autor-escreve-na-prosa.md"
squad: ""
---

# Roadmap: build e docx mantem os subtitulos que o autor escreve na prosa

> Created: 2026-11-18 | Status: wip

## Context

REQ: docs/req/REQ-2026-11-18-build-e-docx-mantem-os-subtitulos-que-o-autor-escreve-na-prosa.md

Decisao em ADR-2026-11-18-a-prosa-so-perde-os-titulos-que-o-bookfw-reemite-e-mantem-do-terceiro-nivel-para-baixo.

## Acceptance Criteria

- [ ] `###` a `######` da prosa saem no manuscrito do `build`, com nivel e texto (AC1).
- [ ] Os mesmos saem no DOCX como titulo (AC2).
- [ ] `#` e `##` continuam fora (AC3), em capitulo com e sem cenas (AC4).
- [ ] Obra sem subtitulo identica a antes; com subtitulo, a contagem sobe so pelas palavras dele (AC5).
- [ ] `npm run check` verde, com teste provado por mutacao (AC6).

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Concluído
**Files affected:** este roadmap
**Actions:**
1. Enumeration completeness — `grep -rn "#{1,6}" src bin` em 2026-11-18 acha
   quatro lugares que tiram titulo de markdown: `src/core.mjs` l. 191 (prosa
   por cena) e l. 202 (`prosaDe`), `src/capa.mjs` l. 188 e `src/style.mjs`
   l. 79. Os dois do `core` alimentam `build`, `docx`, `status`, `validate`
   (contagem), `brief` e `context`. O da `capa` tira so o marcador `#` e mantem
   o texto (briefing de capa), e o do `style` limpa as amostras em `samples/`
   para medir a voz: nenhum dos dois e prosa de capitulo nem chega ao
   manuscrito. A lista de superficies desta REQ e fechada: os dois do `core`.
2. Threat model — quem esvazia isto sem quebrar regra escrita: um autor que
   escreve `## Algo` no meio da prosa achando que e subtitulo continua perdendo
   o texto em silencio, porque `##` segue reservado a cena (ADR). E um teste
   que so cobre `prosaDe` deixaria a extracao por cena (o caminho de toda obra
   com contrato) com a regex antiga.
3. Falsification targets — regride para o lado antigo: o `###` some do
   manuscrito (o teste procura o texto do subtitulo no `.md` do build).
   Regride para o lado oposto: o `## Secao N` ou o `# Titulo` aparecem no
   manuscrito (o teste procura "Secao 1" e o `# ` do capitulo e exige ausencia).
4. Declared residual — `##` escrito pelo autor no meio da prosa continua
   sumindo sem aviso; nao entra gate para isso nesta REQ. `style.mjs` e
   `capa.mjs` ficam como estao.
**Acceptance criteria:**
- [x] The four sections above answered with evidence, not a one-line assertion
- [x] No implementation line written for this ML

**Wave gates:**
```bash
grep -c "^#{1,6} \|#{1,6}" src/core.mjs
```

## Wave 1 — Implementation
> Dependencies: Wave 0. Um ML so: os dois pontos estao no mesmo arquivo, e o teste no mesmo smoke.

### ML-1A — prosa mantem `###` a `######`, por cena e por `prosaDe`
**Status:** 🔄 Em andamento
**Files affected:** `src/core.mjs`, `test/smoke.mjs`, `CHANGELOG.md`, `package.json`
**Actions:**
1. Em `src/core.mjs`, nas duas regex (`cenas`, l. ~191, e `prosaDe`, l. ~202),
   trocar `/^#{1,6} .*$/gm` por `/^#{1,2} .*$/gm`, e ajustar o comentario de
   `prosaDe` para dizer que so os titulos que o bookfw reemite saem.
2. Em `test/smoke.mjs`, um caso com um projeto de um capitulo com contrato de
   cena cuja prosa tem `### Subtitulo A` e `#### Subtitulo B`, e outro capitulo
   sem contrato com `### Subtitulo C`: `build` gera manuscrito com os tres, com
   o mesmo nivel; nao contem `## Secao` nem o `# ` do capitulo; e o `docx`
   (quando a dependencia `docx` existir) gera arquivo cujo texto contem os
   subtitulos.
3. Provar por mutacao: voltar a regex de um dos dois pontos e ver o teste
   falhar; restaurar.
4. `CHANGELOG.md` e `package.json`: versao 0.10.1, fix.
**Acceptance criteria:**
- [ ] AC1 a AC6 da REQ
- [ ] `npm run check` verde; mutacao registrada no commit
**Validation:**
```bash
npm run check
trackfw validate
```

**Wave gates:**
```bash
npm run check
```
