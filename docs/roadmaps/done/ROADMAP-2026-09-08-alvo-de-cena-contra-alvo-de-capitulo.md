---
req: "REQ-2026-09-08-validate-compara-a-soma-dos-alvos-de-cena-com-o-alvo-do-capitulo-e-avisa-a-divergencia"
status: done
date: 2026-09-08
branch: "fix/alvo-de-cena-contra-alvo-de-capitulo"
---

# Roadmap: alvo de cena contra alvo de capitulo

> Created: 2026-09-08 | Status: done

## Context

REQ: REQ-2026-09-08-validate-compara-a-soma-dos-alvos-de-cena-com-o-alvo-do-capitulo-e-avisa-a-divergencia

Decisao em ADR-2026-09-08-o-gate-avisa-quando-os-alvos-de-cena-e-o-alvo-do-capitulo-divergem-e-nao-escolhe-lado.

## Acceptance Criteria

- [x] `validate` avisa a divergencia acima de 10%, com os dois numeros.
- [x] Sem alvo, sem cena ou cena sem alvo nao avisa.
- [x] A faixa da prosa continua contra o alvo do capitulo.
- [x] `status` mostra a divergencia na linha do capitulo.
- [x] Regressao provada por mutacao; `npm run check` verde.
- [x] Obras reais: 0, 0 e 22 avisos, sem alterar nenhuma.

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Onda 1

### ML-1A — o calculo e o aviso no validate

**Status:** ✅ Concluído

**Arquivos:** `src/validate.mjs`

**Acoes:** somar `palavras_alvo` das cenas; comparar com `cap.fm.palavras_alvo`;
avisar fora de 10%, com os dois numeros e o caminho. Guardas: alvo ausente,
sem cena, soma zero.

**Aceite:** os tres guardas nao avisam; a divergencia avisa.

### ML-1B — a divergencia no status

**Status:** ✅ Concluído

**Arquivos:** `src/status.mjs`

**Acoes:** marcar na linha do capitulo quando divergir, curto, sem empurrar a
coluna de palavras.

**Aceite:** obra sa sai identica; obra defasada mostra a marca.

## Barreira

`npm run lint` e `npm test` verdes.

## Onda 2

### ML-2A — regressao provada por mutacao

**Status:** ✅ Concluído

**Arquivos:** `test/smoke.mjs`

**Acoes:** caso que diverge e avisa, com os dois numeros na mensagem; casos que
nao podem avisar (sem alvo, sem cena, cena sem alvo, dentro da folga); caso que
prova que a faixa da prosa nao mudou de base.

**Aceite:** revertido o ML-1A, os testes novos ficam vermelhos.

### ML-2B — versao, changelog e as tres obras

**Status:** ✅ Concluído

**Arquivos:** `package.json`, `CHANGELOG.md`

**Acoes:** subir patch e registrar. Conflito esperado com as outras sessoes.

**Aceite:** 0, 0 e 22 avisos nas obras reais, nenhuma alterada.
