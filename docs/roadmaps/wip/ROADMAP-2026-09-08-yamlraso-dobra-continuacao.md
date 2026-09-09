---
req: REQ-2026-09-08-yamlraso-dobra-linha-de-continuacao-em-vez-de-descartar-e-o-gate-acusa-a-linha-que-nao-da-para-interpretar
status: wip
date: 2026-09-08
---

# Roadmap: yamlRaso dobra continuacao, e o gate acusa o que sobra

> Created: 2026-09-08 | Status: wip

## Context

REQ: REQ-2026-09-08-yamlraso-dobra-linha-de-continuacao-em-vez-de-descartar-e-o-gate-acusa-a-linha-que-nao-da-para-interpretar

Decisao em ADR-2026-09-08-o-contrato-de-cena-dobra-a-linha-de-continuacao-e-o-que-nao-dobra-reprova-no-gate-em-vez-de-sumir.

## Acceptance Criteria

- [x] Continuacao dobra na chave escalar anterior, indentada ou nao.
- [x] Chave vazia seguida de texto vira escalar, nao lista vazia.
- [x] Lista em bloco, lista em linha, aspas e comentario sem regressao.
- [x] Linha orfa reprova no `bookfw validate`, com linha e texto.
- [x] Regressao em smoke.mjs provada por mutacao; `npm run check` verde.
- [x] Tres obras reais com contagem identica antes e depois.

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Onda 1 — a leitura

Os dois microlotes tocam `src/core.mjs`. **Sequenciais**, e a razao e o mesmo
arquivo e a mesma funcao.

### ML-1A — yamlRaso dobra a continuacao e reporta o que nao dobra

**Status:** ✅ Concluído

**Arquivos:** `src/core.mjs`

**Acoes exatas:**
1. `yamlRaso(texto, problemas)` ganha segundo parametro opcional — array onde
   ela empurra `{ linha, texto }` do que nao deu para interpretar. Sem o
   parametro, comportamento identico ao de hoje menos a perda.
2. Passar a rastrear a ultima chave lida e se ela e escalar ou lista.
3. Linha que nao casa `^chave:` e nao e `- item`:
   - ultima chave escalar com valor -> dobra, separada por um espaco;
   - ultima chave declarada vazia e ainda sem item de lista -> vira escalar
     com esse texto, no lugar da lista vazia de hoje;
   - sem chave anterior, ou lista ja com itens -> empurra em `problemas`.
4. Comentario `#` e linha em branco seguem ignorados, e nao entram em
   `problemas`.

**Criterio de aceite:** os quatro casos da tabela da REQ deixam de perder
texto; lista em bloco, lista em linha, aspas e comentario inalterados.

**Validacao:** `node -e` com os cinco casos da sonda de 2026-09-08, mais
`npm test`.

### ML-1B — os tres chamadores levam o array de problemas

**Status:** ✅ Concluído

**Arquivos:** `src/core.mjs`

**Acoes exatas:**
1. `frontmatter(raw, problemas)` e `cenasDe(corpo, problemas)` repassam.
2. `capitulos()` cria um array por arquivo, passa aos dois e anexa
   `cap.problemas`.
3. `lerConfig` idem, com o problema anotado no proprio retorno ou ignorado —
   decidir no lote e registrar a escolha no commit.

**Criterio de aceite:** `capitulos()` devolve `problemas` por capitulo, vazio
em todas as tres obras reais.

**Validacao:** `npm test`.

## Barreira

`npm run lint` e `npm test` verdes antes da onda 2.

## Onda 2 — o gate e a prova

### ML-2A — validate acusa o contrato que nao da para interpretar

**Status:** ✅ Concluído

**Arquivos:** `src/validate.mjs`

**Acoes exatas:** emitir um erro por item de `cap.problemas`, com caminho
relativo, numero da linha e o texto perdido. E erro, nao aviso: o proposito do
gate e nao deixar contrato quebrado passar.

**Criterio de aceite:** capitulo com linha orfa dentro de bloco de cena reprova
no `validate`, nomeando a linha.

**Validacao:** `npm test` e execucao manual num arquivo de sonda descartavel.

### ML-2B — teste de regressao, provado por mutacao

**Status:** ✅ Concluído

**Arquivos:** `test/smoke.mjs`

**Acoes exatas:** um caso por caminho de perda da tabela da REQ, mais os casos
de nao regressao (lista em bloco, lista em linha, aspas, comentario), mais o
caso do `validate` reprovando a linha orfa.

**Criterio de aceite:** **prova por mutacao** — revertida a mudanca do ML-1A,
os testes novos ficam vermelhos. Verde sem a mutacao nao basta.

**Validacao:** `npm test` com e sem a correcao.

### ML-2C — versao, changelog e as obras reais

**Status:** ✅ Concluído

**Arquivos:** `package.json`, `CHANGELOG.md`

**Acoes exatas:** subir a versao de patch e registrar a entrada. **Atencao:**
ha outra sessao trabalhando neste repositorio no exportador de DOCX, e os dois
lados mexem em `package.json`, `CHANGELOG.md` e `test/smoke.mjs` — conflito
esperado, e resolvido na juncao, nao evitado aqui.

**Criterio de aceite:** nas tres obras reais, `bookfw validate` e
`bookfw status` com contagem de capitulos, cenas e palavras identica a de
antes.

**Validacao:** `npm run lint`, `npm test`, e as duas execucoes por obra.
