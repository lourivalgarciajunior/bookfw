---
status: done
date: 2026-08-31
req: "REQ-2026-08-31-lexico-do-style-card-mede-o-que-distingue-a-obra-nao-o-que-e-comum-em-portugues"
squad: "bookfw"
---

# Roadmap: Lexico do style card mede o que distingue a obra

> Created: 2026-08-31 | Status: wip

## Context

REQ: REQ-2026-08-31-lexico-do-style-card-mede-o-que-distingue-a-obra-nao-o-que-e-comum-em-portugues
ADR: ADR-2026-08-31-lexico-do-style-card-separa-conteudo-de-tique-de-voz-e-declara-amostra-insuficiente

Duas listas em vez de uma: lexico de conteudo e tique de voz com taxa. Amostra
curta declarada.

## Acceptance Criteria

- [x] Duas listas, com funcionais fora das duas
- [x] Tique com taxa por mil; `mente` substantivo preservado
- [x] Plural dobrado, genero nao
- [x] Amostra < 1000 palavras declarada no bloco e na saida
- [x] `capa brief` consome o lexico novo e le style card antigo sem quebrar
- [x] `npm run check` limpo; obras reais sem regressao

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** done
**Files affected:** este arquivo

**1. Completude da enumeracao.**
Quem produz o lexico: `src/style.mjs`. Quem consome: `src/capa.mjs` (regex
`Palavras marcantes:`) e, indiretamente, `src/brief.mjs` e `src/status.mjs`, que
despejam o `docs/style-card.md` inteiro sem interpretar. Verificado por
`grep -rn "marcantes\|style-card" src/ bin/` em vez de confiar na REQ: fora
esses, ninguem le o bloco. O plugin cita o comando, nao o formato.

O consumidor que importa e o `capa.mjs`, porque ele **le por regex**: mudar o
rotulo da linha sem mexer nele quebra o briefing de capa em silencio — o bloco
sai vazio e o comando nao reclama.

**2. Modelo de ameaca — quem esvazia esta wave sem quebrar regra escrita.**
- Trocar a lista de vazias por uma maior e chamar de duas listas: o teste que so
  confere "nao contem estava" passa. *Contramedida:* o teste exige `apenas` e
  `talvez` **presentes na lista de tiques com taxa**, nao apenas ausentes do
  conteudo.
- Mandar tudo que sobrou para "tiques": o conteudo fica limpo e a segunda lista
  vira lixeira. *Contramedida:* o teste exige que `corpo` esteja no conteudo e
  **nao** nos tiques.
- Deixar `capa.mjs` lendo o rotulo antigo e devolver bloco vazio sem erro.
  *Contramedida:* teste que gera style card novo e confere o briefing de capa
  com a palavra de conteudo dentro.
- Declarar amostra curta so no console, que ninguem le depois. *Contramedida:* a
  ressalva tem de estar no proprio bloco do style card.

**3. Alvos de falseamento nos dois sentidos.**
- *Lista de funcionais:* curta demais, volta o defeito de origem. Longa demais,
  come palavra de conteudo — `vida`, `corpo` e `tempo` sao substantivos comuns e
  candidatos naturais a uma lista de "palavras comuns" mal desenhada.
- *Dobra de plural:* sem ela, `corpo` e `corpos` competem e nenhum sobe. Com ela
  agressiva demais, `mes` vira `me` e o rotulo sai errado.
- *Ressalva de amostra:* sem ela, 92 palavras viram style card. Com limiar alto
  demais, obra em comeco recebe ressalva para sempre e para de ler o aviso.

**4. Residual declarado.**
Sem etiquetagem morfologica, verbo flexionado sobra no conteudo (`parecia`,
`sabendo`) e a separacao classe-a-classe fica aproximada. A lista de funcionais e
so de portugues. Os dois estao na ADR, com a saida registrada (TF-IDF contra
corpus) caso a aproximacao nao baste.

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao escrita nesta ML

**Gates da wave:**
```bash
# A enumeracao afirma que so o capa.mjs le o bloco por regex. O gate confere a
# afirmacao: qualquer outro leitor do rotulo reabre a lista.
test "$(grep -rl 'Palavras marcantes\|Lexico da obra' src/ | grep -v 'style.mjs\|capa.mjs' | wc -l)" -eq 0
```

## Wave 1 — Medida
> Dependencies: Wave 0

### ML-1A — Duas listas, dobra de plural e ressalva de amostra
**Status:** done
**Files affected:** `src/style.mjs`, `test/smoke.mjs`
**Actions:**
1. Lista de funcionais em pt-BR; lista de tiques; `-mente` com quatro caracteres
   antes do sufixo, para nao capturar o substantivo `mente`.
2. Dobra de plural por sufixo, so quando as duas formas existem. Genero nao.
3. Ressalva no bloco e aviso no comando abaixo de 1000 palavras.
**Acceptance criteria:**
- [x] `apenas` e `talvez` nos tiques com taxa; `corpo` no conteudo e fora deles
- [x] `mente` preservado como conteudo
- [x] Amostra curta declarada no bloco, nao so no console

### ML-1B — O consumidor acompanha
**Status:** done
**Files affected:** `src/capa.mjs`, `README.md`, `CHANGELOG.md`, `package.json`, `test/smoke.mjs`
**Actions:**
1. `capa.mjs` le o rotulo novo e continua aceitando o antigo.
2. README, changelog, versao.
**Acceptance criteria:**
- [x] Briefing de capa traz o lexico de conteudo
- [x] Style card no formato antigo nao quebra o briefing
- [x] `npm run check` limpo; obras reais sem regressao de contagem
