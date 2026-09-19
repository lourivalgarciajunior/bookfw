---
status: wip
date: 2026-09-18
req: "docs/req/REQ-2026-09-18-bookfw-docx-estiliza-a-referencia-biblica-nao-deixa-pagina-em-branco-e-gera-sumario-e-indice.md"
branch: "feat/bookfw-docx-estiliza-a-referencia-biblica"
squad: ""
---

# Roadmap: bookfw docx referencia biblica, sem pagina em branco, sumario e indice

> Created: 2026-09-18 | Status: wip

## Context

REQ: docs/req/REQ-2026-09-18-bookfw-docx-estiliza-a-referencia-biblica-nao-deixa-pagina-em-branco-e-gera-sumario-e-indice.md

Decisao em ADR-2026-09-18-versao-de-leitura-com-referencia-biblica-estilizada-sem-pagina-em-branco-sumario-e-indice-por-campos-do-word.
Pedido do autor em 2026-09-18, passos 5, 7, 8 e 9 do plano R3 da obra
`pessoal/book/ninguem-nasce-santo`.

Medido antes: o PDF da revisao 2 (107 paginas) tem as paginas 29, 52, 76 e 102
vazias. A biblioteca `docx` 9.7.1 exporta `SimpleField`, `TableOfContents` e
`pageBreakBefore`.

Arquivos compartilhados: `src/docx.mjs` e tocado por 1B, 1C e 1D, e por isso a
onda 1 e sequencial. `test/smoke.mjs` so no ML-2A.

## Acceptance Criteria

Os da REQ.

## Wave 0 — Threat model
> Dependencies: nenhuma.

### ML-0A — superficie e risco
**Status:** ✅ Concluído
**Arquivos:** nenhum (analise)
**Acoes:** listar entradas novas e o que pode dar errado.
- `livro.yaml` ganha chaves novas, lidas por `yamlRaso`. Valor desconhecido nao pode derrubar o comando: `referencia_biblica` diferente de `romano` ou `arabico` desliga a regra e avisa.
- O termo do indice vai dentro de uma instrucao de campo (`XE "Nome"`). Aspas ou barra invertida no nome quebrariam o campo. O termo e saneado: sai `"` e `\`.
- O script do Word ganha `TablesOfContents.Update` e `Indexes.Update` no documento aberto somente leitura, e nunca salva. Nada de caminho novo passa por shell.
- A regex de referencia roda em toda a prosa. Ela e ancorada no parentese e na lista fechada de livros, sem retrocesso catastrofico.
**Aceite:** riscos listados com mitigacao no ML que implementa.

## Wave 1 — Implementacao
> Dependencies: Wave 0. Sequencial (ver Context).

### ML-1A — `src/biblia.mjs` e o gate
**Status:** ✅ Concluído
**Arquivos:** `src/biblia.mjs` (novo), `src/validate.mjs`
**Acoes:**
1. Lista dos livros em portugues e `trechosDeReferencia(texto)`, que divide o texto em `{ texto, referencia }`.
2. `problemasDeReferencia(prosa, modo)`, que devolve a referencia sem livro e, no modo `romano`, o livro numerado em algarismo arabico.
3. O `validate` chama o item 2 por capitulo quando `referencia_biblica` esta ligada.
**Aceite:** "(20,3-4)" e "(1 Coríntios 6,1)" viram violacao no modo romano; "(II Coríntios 4,7)", "(Salmo 139(138),13)" e "(Cântico dos Cânticos 2,7; 3,5)" passam.

### ML-1B — quebra de pagina sem paragrafo proprio
**Status:** ✅ Concluído
**Arquivos:** `src/docx.mjs`
**Acoes:** trocar os `quebra()` por `pageBreakBefore` no primeiro paragrafo de cada pagina nova (front matter, divisor de Parte, capitulo, apendice).
**Aceite:** zero `<w:br w:type="page"/>` no documento; o rosto, cada secao, cada divisor e cada capitulo abrem pagina.

### ML-1C — referencia estilizada e sumario
**Status:** 🔄 Em andamento
**Arquivos:** `src/docx.mjs`
**Acoes:** `runs()` divide o trecho pela referencia e aplica italico e o corpo configurado. Com `sumario: sim`, entra uma pagina "Sumario" com `TableOfContents` (nivel 1-2) depois do front matter; a Parte vira titulo de nivel 1 e o capitulo, de nivel 2. `features.updateFields`.
**Aceite:** a corrida da referencia tem `<w:i/>` e o `w:sz` configurado; o documento tem um `TOC` e as Partes em `Heading1`.

### ML-1D — indice
**Status:** ⬜ Pendente
**Arquivos:** `src/docx.mjs`
**Acoes:** com `indice: personagens`, a prosa e desenhada cena a cena, e cada cena recebe os termos das fichas que declara. Cada paragrafo ganha um `XE` por ficha encontrada, e o livro termina numa pagina "Indice" com `INDEX \h "A" \c "1" \z "1046"`.
**Aceite:** a marca aparece no paragrafo certo, o apelido fora da cena que o declara nao marca, e `indice_excluir` e respeitado.

### ML-1E — Word atualiza os campos
**Status:** ⬜ Pendente
**Arquivos:** `src/pdf.mjs`
**Acoes:** o script do Word atualiza o sumario, depois o indice, depois o numero de pagina do sumario, antes do `ExportAsFixedFormat`. Com outro conversor e a obra com `sumario` ou `indice`, o comando avisa.
**Aceite:** no PDF real, o sumario e o indice tem numero de pagina.

### ML-1F — pagina final
**Status:** ⬜ Pendente
**Arquivos:** `src/docx.mjs`
**Acoes:** `docs/pagina-final.md` (secao `## Titulo` e linhas) vira, depois do ultimo capitulo, uma secao do Word com `verticalAlign: bottom`, rodape igual, titulo de nivel 2 e cada linha alinhada a direita.
**Aceite:** o documento tem a segunda secao com alinhamento vertical inferior, e o titulo aparece no sumario do PDF.

## Wave 2 — Testes, docs e versao
> Dependencies: Wave 1.

### ML-2A — regressao
**Status:** ⬜ Pendente
**Arquivos:** `test/smoke.mjs`
**Acoes:** casos para o gate, o desenho da referencia, a quebra de pagina, o sumario e o indice, incluindo o homonimo resolvido pela cena. Prova por mutacao: desligar cada ponto derruba o teste dele.
**Aceite:** `npm run check` verde; cada mutacao produz falha.

### ML-2B — docs e versao
**Status:** ⬜ Pendente
**Arquivos:** `README.md`, `CHANGELOG.md`, `bin/bookfw.mjs` (AJUDA), `package.json`, `package-lock.json`, `docs/agents-working-context.md`
**Acoes:** documentar as chaves `referencia_biblica`, `referencia_biblica_corpo`, `sumario`, `indice`, `indice_excluir`; versao 0.9.0.
**Aceite:** lint verde (README cita as chaves), versao 0.9.0 nos dois lugares.

### ML-2C — plugin
**Status:** ⬜ Pendente
**Arquivos:** `plugin-skill/plugins/bookfw/agents/book-hermes.md`, `skills/bookfw/SKILL.md`, `.claude-plugin/plugin.json`
**Acoes:** Hermes e a skill citam as chaves novas; versao 0.7.0 → 0.8.0; gates e publicacao no marketplace.
**Aceite:** gates verdes e cache com a versao nova.

### ML-2D — obra
**Status:** ⬜ Pendente
**Arquivos:** `pessoal/book/ninguem-nasce-santo/livro.yaml`, `manuscrito/` (outro repositorio)
**Acoes:** ligar as chaves; `bookfw validate`; `bookfw revisao`; `bookfw docx`; `bookfw pdf`; abrir o PDF.
**Aceite:** nenhuma pagina vazia; sumario e indice com numero; referencia em italico menor.

## Wave 3 — Red team
> Dependencies: Wave 2.

### ML-3A — tentativa de quebrar
**Status:** ⬜ Pendente
**Arquivos:** nenhum (verificacao)
**Acoes:** nome de ficha com aspas; valor invalido em `referencia_biblica`; capitulo terminando rente ao pe da pagina; obra sem Partes com sumario; indice sem nenhuma ficha declarada.
**Aceite:** nenhum caso derruba o comando, gera pagina vazia ou campo quebrado.
