---
status: wip
date: 2026-09-20
req: "docs/req/REQ-2026-09-20-bookfw-costura-fragmentos-entre-capitulos-no-build-e-no-docx-e-o-gate-cobra-posicao-id-unico-e-promessa-existente.md"
branch: "feat/fragmentos-no-build-no-docx-e-no-gate"
squad: ""
---

# Roadmap: fragmentos no build, no docx e no gate

> Created: 2026-09-20 | Status: wip

## Context

REQ: docs/req/REQ-2026-09-20-bookfw-costura-fragmentos-entre-capitulos-no-build-e-no-docx-e-o-gate-cobra-posicao-id-unico-e-promessa-existente.md

Decisao em ADR-2026-09-20-fragmento-e-um-artefato-da-obra-com-posicao-declarada-costurado-por-build-e-docx-e-cobrado-pelo-gate.

Medido antes, em `pessoal/book/sartre-exe`: 12 fragmentos em `docs/fragmentos/`,
zero emitidos pelo `build` e pelo `docx`. O DOCX da revisao 2 so saiu com eles
por injecao manual nos capitulos, revertida em seguida.

**Arquivos compartilhados.** `src/core.mjs` so no ML-1A. `src/build.mjs` no
ML-2A; `src/docx.mjs` no ML-2B, e ele importa de `build.mjs` — por isso a onda 2
e sequencial. `src/validate.mjs` e `src/status.mjs` nao se tocam: onda 3 e
paralela. `test/smoke.mjs` so no ML-4A, e por isso o teste e onda propria, e nao
um passo dentro de cada ML.

## Acceptance Criteria

Os da REQ (AC1 a AC12).

## Wave 0 — Threat model
> Dependencies: nenhuma.

### ML-0A — superficie nova e o que pode dar errado
**Status:** ✅ Concluído
**Arquivos:** nenhum (analise, registrada aqui)
**Acoes:** listar a entrada nova e a falha de cada caminho.
- Entrada nova: arquivos arbitrarios em `docs/fragmentos/*.md`, escritos a mao. Frontmatter passa pelo `yamlRaso`, que ja e tolerante e ja reporta linha solta.
- `depois_do_capitulo` com texto ("depois do capitulo 4") vira `NaN`. Nao pode virar posicao 0 nem derrubar o comando: e erro do gate, e o build ignora o fragmento e avisa.
- `id` ausente ou duplicado quebraria a ordem estavel de emissao. Erro do gate; o build desempata por nome de arquivo para nunca sair em ordem aleatoria.
- Dois fragmentos com o mesmo `depois_do_capitulo` sao legitimos (um capitulo pode ser seguido de dois documentos). Ordem entre eles: `id`, e nao a ordem do diretorio.
- Corpo sem `# Fxx — Titulo` deixaria o fragmento sem titulo. Nao e erro: o titulo cai para o `tipo`, e depois para o `id`.
- Fragmento apontando para capitulo abaixo do corte nao sai (AC5), entao um fragmento nunca vaza texto de um capitulo que o corte escondeu.
- Diretorio ausente e o caso comum. Nenhum caminho novo pode lancar quando `docs/fragmentos/` nao existe (AC12).

**Criterio:** esta lista existe e cada item vira um teste ou uma linha de codigo nos MLs seguintes.
**Validacao:** revisao visual deste bloco contra o codigo dos MLs 1A a 3B.

## Wave 1 — Nucleo
> Dependencies: Wave 0.

### ML-1A — `fragmentos(raiz)` no core
**Status:** ✅ Concluído
**Arquivos:** `src/core.mjs`
**Acoes:**
- Acrescentar `export function fragmentos(raiz)`: le `docs/fragmentos/*.md`, ignora `LEIAME.md` e qualquer arquivo sem frontmatter com `id`.
- Devolver, por fragmento: `{ arquivo, caminho, fm, id, depois, tipo, titulo, corpo, promessas, paga, problemas, palavras }`.
- `depois` = `Number(fm.depois_do_capitulo)`; `NaN` vira `null` (o gate cobra, o build ignora).
- `titulo` = texto depois do travessao no primeiro `# ...` do corpo; sem cabecalho, cai para `tipo`, depois para `id`.
- `corpo` = o que vem depois desse cabecalho, com comentario HTML removido, `.trim()`.
- Ordenar por `depois` e, no empate, por `id`.
- Diretorio ausente devolve `[]`.

**Criterio de aceite:** `node -e` na obra sartre-exe devolve 12 fragmentos, em ordem de capitulo, com titulo e corpo nao vazios; numa obra sem o diretorio devolve `[]`.
**Validacao:** `npm run lint` e `node -e "import('./src/core.mjs').then(m=>console.log(m.fragmentos(process.argv[1]).length))" <obra>`

## Wave 2 — Costura (sequencial: docx importa de build)
> Dependencies: Wave 1.

### ML-2A — `build` intercala fragmento
**Status:** ✅ Concluído
**Arquivos:** `src/build.mjs`
**Acoes:**
- Acrescentar `export function fragmentosEmitidos(raiz, caps)`: agrupa os fragmentos por `depois`, descartando os que apontam para capitulo fora de `caps` ou com `depois === null`. Devolve `Map<numeroDoCapitulo, fragmento[]>`. Fonte unica do build e do docx.
- No laco de capitulos, depois de empurrar a prosa, emitir cada fragmento daquele capitulo como `\n\n---\n\n### <titulo>\n\n<corpo>\n\n---\n`.
- Contar os emitidos e imprimir `N fragmento(s) intercalado(s)` quando houver.
- A contagem de palavras ja e feita sobre o texto final, entao AC3 sai de graca — confirmar, nao reescrever.

**Criterio de aceite:** na obra sartre-exe, `bookfw build` imprime `12 fragmento(s) intercalado(s)`, o `.md` contem `I am writing this page for no one`, e o total de palavras sobe de 52.545 para ~58.000.
**Validacao:** `cd <obra> && bookfw build && grep -c "^### " manuscrito/sartre-exe.md`

### ML-2B — `docx` emite os mesmos fragmentos
**Status:** ✅ Concluído
**Arquivos:** `src/docx.mjs`
**Acoes:**
- Importar `fragmentosEmitidos` de `build.mjs`.
- Depois da prosa de cada capitulo, para cada fragmento daquele capitulo: quebra de pagina, titulo centralizado em italico (SERIF, size 26), e o corpo por `paragrafos()` com fonte um ponto menor que a do capitulo.
- Com `sumario: sim`, o fragmento entra no sumario no mesmo nivel do capitulo.
- Nao marcar termos de indice no corpo do fragmento: indice e de cena, e fragmento nao tem cena.
- Contar e imprimir os emitidos na linha de resumo do comando.

**Criterio de aceite:** na obra sartre-exe, o DOCX gerado contem `I am writing this page for no one` e `ANEXO D`, sem nenhuma injecao manual nos capitulos.
**Validacao:** `cd <obra> && bookfw docx` e leitura do `word/document.xml` do zip procurando as duas cadeias.

## Wave 3 — Gate e painel (paralelo: arquivos distintos)
> Dependencies: Wave 2.

### ML-3A — `validate` cobra fragmento
**Status:** ✅ Concluído
**Arquivos:** `src/validate.mjs`
**Acoes:**
- Ler `fragmentos(raiz)`; sem fragmento, nenhum caminho novo executa.
- Erro: `id` ausente; `id` duplicado (dizer os dois arquivos).
- Erro: `depois_do_capitulo` ausente ou nao numerico; ou apontando para capitulo que nao existe no kanban (ignorando `abandonado`).
- Erro: promessa declarada que nao esta no plano diretor.
- Erro: campo `paga` presente — fragmento planta, nao paga (ADR).
- Erro: linha solta no frontmatter, com o mesmo texto que ja e usado para capitulo.
- Somar as promessas do fragmento ao conjunto `plantadas` da regra de Chekhov.

**Criterio de aceite:** obra com fragmento sem `id`, com `id` repetido, com posicao invalida, com promessa inexistente ou com `paga` reprova, uma mensagem por caso; a obra sartre-exe corrigida passa com zero violacoes.
**Validacao:** `cd <obra> && bookfw validate`

### ML-3B — `status` conta fragmento
**Status:** ✅ Concluído
**Arquivos:** `src/status.mjs`
**Acoes:**
- Na linha de cabecalho da governanca, acrescentar `| fragmentos N` quando houver algum.
- Na linha final de palavras, acrescentar `(+N em fragmentos)` quando houver.

**Criterio de aceite:** na obra sartre-exe, `bookfw status` mostra `fragmentos 12`; numa obra sem fragmentos a saida e byte a byte a de antes.
**Validacao:** `cd <obra> && bookfw status`

## Wave 4 — Teste, documentacao e versao
> Dependencies: Wave 3.

### ML-4A — fumaca dos fragmentos
**Status:** ⬜ Pendente
**Arquivos:** `test/smoke.mjs`
**Acoes:** acrescentar casos cobrindo AC2, AC5, AC6, AC7, AC8, AC9 e AC12, no padrao ja usado no arquivo (projeto temporario, comandos reais, assercao sobre a saida).

**Criterio de aceite:** `npm test` verde, com os casos novos falhando se qualquer um dos MLs 1A a 3B for revertido.
**Validacao:** `npm test`

### ML-4B — README, CHANGELOG e versao
**Status:** ⬜ Pendente
**Arquivos:** `README.md`, `CHANGELOG.md`, `package.json`, `templates/` (LEIAME de fragmentos, se couber)
**Acoes:** documentar a convencao de fragmento, registrar a entrada no CHANGELOG e subir a versao menor para `0.10.0`.

**Criterio de aceite:** `npm run check` verde e a convencao legivel por quem nunca viu a REQ.
**Validacao:** `npm run check`

## Wave 5 — Red team
> Dependencies: Wave 4.

### ML-5A — leitura adversarial antes de liberar
**Status:** ⬜ Pendente
**Arquivos:** nenhum (revisao)
**Acoes:** rodar a obra real de ponta a ponta (build, docx, pdf, validate, status), conferir que o repositorio da obra fica limpo, e confirmar AC12 numa obra sem fragmentos.

**Criterio de aceite:** obra sartre-exe sai com 12 fragmentos sem gambiarra; obra sem fragmentos inalterada; `trackfw validate` e `npm run check` verdes.
**Validacao:** `npm run check && trackfw validate`
