---
status: done
date: 2026-11-24
req: "docs/req/REQ-2026-11-24-cap-renumber-reescreve-o-id-das-cenas-e-o-validate-cobra-o-prefixo.md"
squad: ""
---

# Roadmap: cap renumber reescreve o id das cenas e o validate cobra o prefixo

> Created: 2026-11-24 | Status: done

## Context

REQ: docs/req/REQ-2026-11-24-cap-renumber-reescreve-o-id-das-cenas-e-o-validate-cobra-o-prefixo.md

Decisao em ADR-2026-11-24-o-renumber-reescreve-o-prefixo-do-id-de-cena-e-o-gate-reprova-prefixo-que-nao-bate-com-o-numero,
que revisa a frase do ADR-2026-11-20 sobre o `renumber` nao tocar o corpo.

O PR #7 (`chore/publish-log-detalhado`, so CI) continua aberto. Este fix sai em
branch propria a partir de `origin/main` e nao toca `.github/workflows/`.

## Acceptance Criteria

- [x] `renumber` reescreve o prefixo dos ids de cena, so dentro dos contratos (AC1, AC2, AC3, AC4, AC6).
- [x] `renumber` diz quantos ids reescreveu (AC5).
- [x] `validate` reprova prefixo desencontrado (AC7).
- [x] `npm run check` verde, com teste provado por mutacao nos dois lados (AC8).

## Status Legend
⬜ Pending · 🔄 In progress · ✅ Done · ❌ Blocked

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Done
**Files affected:** este roadmap
**Actions:**
1. Enumeration completeness — `grep -rn "writeFileSync" src` em 2026-11-24:
   reescrevem capitulo existente `src/cap.mjs` (`reescrever`, chamado por
   `renumber` e `retitle`), `src/cena.mjs` (anexa um bloco novo no fim, com
   id de `proximoId`) e `src/core.mjs:290` `moverCapitulo` (so `estado:`). O
   unico caminho que muda o `numero` de capitulo existente e `reescrever` com
   `numero` novo, logo e o unico que pode deixar o id de cena desencontrado.
   Quem consome o id de cena (`grep -rn "cena.id\|args.cena" src`):
   `brief.mjs:27` (acha a cena por id ou indice), `validate.mjs:112` (rotulo
   de mensagem) e `cena.mjs` `proximoId` (herda o prefixo da ultima cena). O
   `cena add` ja nasce com `<numero>.<n>`, entao so o `renumber` desencontra.
   Varredura das obras de `pessoal/book/*` no mesmo dia: seis ids
   desencontrados, todos na `verde-nao-e-prova`.
2. Threat model — quem esvazia isto sem quebrar regra escrita: um teste com
   capitulo de uma cena so, que nao prova a troca de todas; um teste que monta
   o capitulo com `\n` e nunca exercita CRLF; um teste que so confere o
   contrato e nao a prosa, deixando passar uma reescrita gulosa que troca
   `id: 5.1` tambem fora da cerca; e uma regra de gate que so avisa, que deixa
   o `validate` da obra verde com o `brief` errado (exatamente o caso medido).
3. Falsification targets — regride para o lado antigo: os ids ficam velhos (o
   teste exige `9.1` e `9.2` depois de `renumber 5 9`, e o gate exige erro
   para `7.1` num capitulo 5). Regride para o lado oposto: a reescrita toca o
   que nao devia — `id: 5.1` na prosa, num bloco ```text, o `# Titulo`, ou um
   id `7.1` que ja nao era do capitulo, ou um id `abertura` (o teste monta os
   cinco casos e exige que fiquem intactos); e o gate cobra id sem a forma
   `<n>.<resto>` (o teste monta `abertura` e exige zero erro dele).
4. Declared residual — o `brief --cena` com id inexistente continua caindo na
   primeira cena sem avisar; `cenasDe` continua sem ler contrato CRLF, entao o
   gate nao ve o id de contrato CRLF (o `renumber` reescreve mesmo assim); id
   duplicado e lacuna na sequencia nao sao cobrados; os seis ids da
   `verde-nao-e-prova` sao corrigidos na obra, fora deste repo.
**Acceptance criteria:**
- [x] The four sections above answered with evidence, not a one-line assertion
- [x] No implementation line written for this ML

**Wave gates:**
```bash
grep -c "reescrever(" src/cap.mjs
```

## Wave 1 — Implementation
> Dependencies: Wave 0. Um ML so: codigo, gate e teste mudam juntos, e o teste
> de mutacao depende do codigo.

### ML-1A — renumber leva o prefixo do id de cena, e o gate o cobra
**Status:** ✅ Done
**Files affected:** `src/cap.mjs`, `src/validate.mjs`, `test/smoke.mjs`, `CHANGELOG.md`, `package.json`, `package-lock.json`
**Actions:**
1. Em `src/cap.mjs`, `reescrever`: quando `numero` muda, no corpo, trocar so
   dentro de cada bloco ```cena (abertura `^```cena\r?$`, fecho `^```\r?$`)
   as linhas `^id:\s*<antigo>\.<resto>` por `id: <novo>.<resto>`, preservando
   o `\r`. Devolver quantas trocou.
2. Em `capRenumber`, imprimir `N id(s) de cena reescrito(s)` quando N > 0.
3. Em `src/validate.mjs`, no laco das cenas: se `cena.id` casa
   `^(\d+)\.(.+)$` e o grupo 1 difere de `cap.numero`, `erro(tag, ...)` com o
   id e o prefixo esperado.
4. Em `test/smoke.mjs`, no bloco do renumber: AC1 a AC7, incluindo a troca em
   tres passos por 99, o caso CRLF e os cinco casos que nao podem mudar.
   Achado na execucao: o template do `cap new` ja traz um contrato com
   `id: <n>.1` (em CRLF no Windows), entao o cap. 5 do teste tem tres ids
   com o prefixo 5, e o teste conta tres.
5. `CHANGELOG.md` com a 0.10.4 e `version` 0.10.4 em `package.json` (e no
   lock).
**Acceptance criteria:**
- [x] AC1 a AC7 cobertos por teste de fumaca (19 casos)
- [x] Mutacao: comentar a reescrita do id faz pelo menos o teste de AC1 falhar; comentar a regra do gate faz o teste de AC7 falhar (medido em 2026-11-24: 7 falhas sem a reescrita, AC1, AC2, AC5, AC6; 1 falha sem a regra, AC7)
- [x] `npm run check` verde

**Wave gates:**
```bash
npm run check
```
