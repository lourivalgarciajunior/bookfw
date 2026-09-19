---
status: Open
date: 2026-09-18
author: "Lourival Garcia"
adr: "docs/adr/ADR-2026-09-18-versao-de-leitura-com-referencia-biblica-estilizada-sem-pagina-em-branco-sumario-e-indice-por-campos-do-word.md"
roadmap: "docs/roadmaps/wip/ROADMAP-2026-09-18-bookfw-docx-estiliza-a-referencia-biblica-nao-deixa-pagina-em-branco-e-gera-sumario-e-indice.md"
---

# REQ: bookfw docx estiliza a referencia biblica, nao deixa pagina em branco e gera sumario e indice

> Date: 2026-09-18 | Status: Open

## Motivation

O autor pediu, em 2026-09-18, os passos 5, 7, 8 e 9 do plano
`docs/revisoes/R3-vladimir.md` da obra `ninguem-nasce-santo`:

- referencia biblica em italico e com letra menor;
- nenhuma pagina em branco no livro;
- indice;
- sumario.

Decisao em ADR-2026-09-18-versao-de-leitura-com-referencia-biblica-estilizada-sem-pagina-em-branco-sumario-e-indice-por-campos-do-word.

## Acceptance Criteria

- [ ] Com `referencia_biblica` no `livro.yaml`, o `docx` desenha a referencia `(Livro cap,vers)` em italico, no corpo de `referencia_biblica_corpo` (padrao 9 pt).
- [ ] Com `referencia_biblica`, o `validate` acusa referencia sem livro e, no modo `romano`, livro numerado em algarismo arabico.
- [ ] Sem `referencia_biblica`, nada muda no desenho nem no gate.
- [ ] Nenhum paragrafo so de quebra de pagina no DOCX; troca de Parte gera uma quebra so.
- [ ] Com `sumario: sim`, o DOCX traz uma pagina "Sumario" com campo `TOC` sobre Parte (nivel 1) e capitulo (nivel 2).
- [ ] Com `indice: personagens`, cada paragrafo com nome de ficha declarada na cena ganha uma marca `XE`, e o livro termina numa pagina "Indice" com campo `INDEX`; apelido so vale na cena que declara a ficha, termo mais longo primeiro, e `indice_excluir` e respeitado.
- [ ] O DOCX sai com `updateFields`; o `bookfw pdf` com Word atualiza sumario e indice antes de exportar; com outro conversor e campo presente, avisa.
- [ ] Com `docs/pagina-final.md`, o livro ganha, depois do ultimo capitulo, uma pagina com o titulo e as linhas alinhados a direita no pe da pagina, e o titulo entra no sumario.
- [ ] Regressao em `test/smoke.mjs` para os quatro pontos, provada por mutacao.
- [ ] `npm run check` verde; `trackfw validate` sem violacao; versao 0.9.0 no package.json e no CHANGELOG; README e AJUDA com as chaves novas.
- [ ] Plugin `bookfw` em `plugin-skill` documenta as chaves, com versao subida e gates rodados.
- [ ] Na obra `ninguem-nasce-santo`, revisao 3 gerada em DOCX e PDF, aberta e conferida: nenhuma pagina em branco, sumario e indice numerados, referencia em italico menor.

## Escopo negativo

- Nao reescreve a prosa das obras nem completa referencia sozinho.
- Nao pagina o livro no bookfw nem estima numero de pagina.
- Nao muda o `build` (markdown): sumario, indice e estilo sao da versao de leitura.
- Nao indexa lugar nem tema; so personagem do canon.
- Nao adiciona dependencia ao `package.json`.
- Nao publica release no GitHub nem no npm.

## Linked ADR
ADR: docs/adr/ADR-2026-09-18-versao-de-leitura-com-referencia-biblica-estilizada-sem-pagina-em-branco-sumario-e-indice-por-campos-do-word.md

## Blocked by ADRs
<!-- none -->

## Linked Roadmap
Roadmap: docs/roadmaps/wip/ROADMAP-2026-09-18-bookfw-docx-estiliza-a-referencia-biblica-nao-deixa-pagina-em-branco-e-gera-sumario-e-indice.md
