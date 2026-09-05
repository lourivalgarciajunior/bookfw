---
status: done
date: 2026-09-05
req: "REQ-2026-09-05-bookfw-build-e-docx-emitem-o-divisor-de-parte-a-partir-do-ato"
branch: "feat/divisor-de-parte"
squad: ""
---

# Roadmap: o divisor de Parte, derivado do plano diretor

> Created: 2026-09-05 | Status: done

## Context

REQ: REQ-2026-09-05-bookfw-build-e-docx-emitem-o-divisor-de-parte-a-partir-do-ato

A estrutura em Partes vive no plano diretor e o `ato` vive no frontmatter; as
duas nao se encontram, e o manuscrito sai sem divisor. Decisao em
ADR-2026-09-05-o-divisor-de-parte-sai-da-tabela-estrutura-do-plano-diretor-casado-pelo-ato-do-capitulo.

## Acceptance Criteria

- [x] `partes(raiz)` le a tabela Estrutura; romano primeiro, ordem como reserva.
- [x] `build` e `docx` emitem o divisor; a saida conta as Partes.
- [x] Obra sem Estrutura ou sem `ato` segue igual, sem erro; ato orfao avisa.
- [x] `npm run check` verde; README e CHANGELOG; versao 0.6.0.

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Concluído
**Files affected:** este roadmap
**Actions:**
1. **Completude.** As superficies sao `core.mjs` (leitor), `build.mjs` e
   `docx.mjs` (as duas saidas). Fecha porque tudo que sai para leitura passa por
   uma das duas, e as duas compartilham `selecao()` — conferido por
   `grep -rn "capitulos(raiz)" src/`.
2. **Quem esvazia a wave sem quebrar regra.** (a) PD sem `## Estrutura`: nao
   emite e nao erra — e o comportamento de hoje, entao a ausencia nao regride
   nada. (b) `ato` preenchido com valor que a tabela nao tem: emitir divisor
   inventado seria pior que nao emitir, entao **avisa e nao emite**. (c) Tabela
   com romano fora de ordem: o casamento e pelo romano, nao pela posicao, entao
   a ordem das linhas nao muda o resultado — e a reserva por ordem so vale
   quando NENHUMA linha tem romano.
3. **Falsificacao nos dois sentidos.** Regredir para menos (nao emitir): o smoke
   que confere `## Parte I` no manuscrito pega. Regredir para mais (emitir
   divisor onde o ato nao mudou, ou repetir): o smoke conta as Partes na saida e
   confere que sao quatro para quatro atos, nao 23.
4. **Residual declarado.** O divisor nao gera sumario, nao numera pagina por
   Parte e nao muda o nivel de cabecalho dos capitulos. E um marco de leitura,
   nao uma reestruturacao do documento.

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao neste ML

**Gates da wave:**
```bash
grep -rn "capitulos(raiz)" src/ | grep -v core.mjs
node -e "import('./src/core.mjs').then(m=>process.exit(typeof m.planoDiretor==='function'?0:1))"
```

## Wave 1 — O leitor e as duas saidas
> Dependencies: ML-0A

### ML-1A — `partes(raiz)` em core.mjs
**Status:** ✅ Concluído
**Files affected:** `src/core.mjs`
**Actions:**
1. Achar a secao `## Estrutura` do PD e o bloco contiguo de linhas com barra.
2. Por linha: romano no inicio da primeira celula vira numero do ato; sem romano
   em nenhuma linha, a ordem decide. Titulo e a primeira celula limpa.
3. Devolver `Map<ato, {romano, titulo}>`; vazio quando nao ha tabela.
**Acceptance criteria:**
- [x] Le a tabela do PD de "Os Oito Modelos" e devolve quatro entradas

### ML-1B — `build` e `docx` emitem
**Status:** ✅ Concluído
**Files affected:** `src/build.mjs`, `src/docx.mjs`
**Actions:**
1. `build`: antes do primeiro capitulo de cada ato, `## Parte <romano> — <titulo>`;
   contar e imprimir; avisar ato orfao.
2. `docx`: pagina propria, romano acima e titulo abaixo, centralizados.
**Acceptance criteria:**
- [x] Quatro divisores para quatro atos, e a saida diz quatro

### ML-1C — Smoke, README, CHANGELOG, versao
**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`, `README.md`, `CHANGELOG.md`, `package.json`
**Actions:**
1. Casos: divisor presente, contagem na saida, obra sem Estrutura inalterada,
   ato orfao avisa.
2. README e CHANGELOG; versao 0.6.0.
**Acceptance criteria:**
- [x] `npm run check` verde
