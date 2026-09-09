---
status: done
date: 2026-09-08
req: "REQ-2026-09-08-bookfw-docx-aplica-a-formatacao-do-markdown-em-vez-de-imprimir-o-marcador"
branch: "claude/adoring-feistel-db7193"
squad: ""
---

# Roadmap: o docx aplica o markdown em vez de imprimir o marcador

> Created: 2026-09-08 | Status: done

## Context

REQ: REQ-2026-09-08-bookfw-docx-aplica-a-formatacao-do-markdown-em-vez-de-imprimir-o-marcador

O DOCX que foi para revisor externo saiu com 952 asteriscos de negrito, 106 de
italico, 26 crases e o `>` de citacao no meio de frase — e com zero `<w:b/>`.
Causa em `src/docx.mjs:213` e `:224`. Decisao em
ADR-2026-09-08-o-docx-do-bookfw-interpreta-markdown-com-um-renderizador-proprio-de-bloco-e-de-trecho.

## Acceptance Criteria

- [x] `src/markdown.mjs` puro, com `trechos()` e `blocos()`; zero dependencia nova.
- [x] `docx.mjs` renderiza negrito, italico, monoespacado, citacao recuada,
      lista, tabela `<w:tbl>` e codigo cercado, em capitulo, front matter e apendice.
- [x] Separador `* * *` segue virando `❧`; marcador de citacao sai de todas as linhas.
- [x] Regressao que falha sem a correcao, conferida no XML.
- [x] `npm run check` verde; as duas obras reais regeradas com marcador zero e
      `<w:b/>` maior que zero; README, CHANGELOG e versao 0.7.0.

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model desta correcao
**Status:** ✅ Concluído
**Files affected:** este roadmap
**Actions:**
1. **Completude da superficie.** Tudo que escreve prosa no DOCX passa por
   `corpo(...)` em `src/docx.mjs`, chamado em tres lugares: front matter,
   prosa de capitulo e apendice. Conferido por
   `grep -n "replace(/\\n/g, ' ')" src/docx.mjs` — tres ocorrencias, linhas 148,
   213 e 224. O `build.mjs` fica fora de proposito: o manuscrito `.md` e
   markdown, e markdown nele nao e defeito.
2. **Quem esvazia a correcao sem quebrar regra.** (a) Apagar o marcador por
   regex e nao aplicar formatacao: a contagem de marcador daria zero e o texto
   teria perdido a enfase — por isso a verificacao conta tambem `<w:b/>` e
   `<w:i/>`. (b) Aplicar formatacao so no primeiro trecho do bloco: a contagem
   de marcador remanescente pega, porque os outros marcadores sobram. (c)
   Regredir o separador de cena: `* * *` lido como italico ou como lista
   deixaria o `❧` de sair — coberto por caso proprio no smoke.
3. **Falsificacao nos dois sentidos.** Para menos: o smoke confere `<w:b/>` e
   `<w:i/>` presentes no XML de um capitulo com marcacao. Para mais: confere que
   um paragrafo sem marcacao nenhuma continua saindo em um `TextRun` sem
   `<w:b/>`, e que o texto sem os marcadores e identico ao original — nada de
   comer caractere.
4. **Residual declarado.** Link, imagem, riscado, nota de rodape, HTML embutido
   e lista aninhada seguem saindo como texto. Nenhuma das duas obras usa —
   medido por varredura em `capitulos/`, `docs/front-matter.md` e
   `docs/apendice.md` das duas: zero ocorrencias de cada.

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao neste ML

---

## Wave 1 — O renderizador
> Dependencies: ML-0A.

### ML-1A — `src/markdown.mjs`, puro e sem OOXML
**Status:** ✅ Concluído
**Files affected:** `src/markdown.mjs` (novo)
**Actions:**
1. `trechos(texto)` devolve `[{ texto, negrito, italico, codigo }]`. Codigo
   entre crases primeiro, e sem enfase dentro. `**` e `*` com a regra de
   flanqueamento — o marcador de abertura nao pode ser seguido de espaco e o de
   fechamento nao pode ser precedido de espaco — para que `3 * 4` nao vire
   italico. Reentrante para negrito com italico dentro.
2. `blocos(texto)` percorre **linha a linha** e devolve
   `[{ tipo, ... }]` com `tipo` em `paragrafo | citacao | lista | numerada |
   codigo | tabela | titulo | separador`. Cerca de codigo (```) abre e fecha
   sem olhar linha em branco. Separador reconhece `* * *`, `***`, `---`.
   Citacao remove `^\s*>\s?` de **todas** as linhas e so entao junta.
3. Comentario de cabecalho no formato do repositorio: o que quebrou, e por que a
   funcao existe.

**Acceptance criteria:**
- [x] `node -e` sobre as duas funcoes devolve a estrutura esperada
- [x] Nenhum `import` de `docx` no modulo
**Validation:** `npm run lint`

### ML-1B — Cobertura de `markdown.mjs` no smoke
**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Actions:**
1. Casos de `trechos`: negrito, italico, codigo, negrito com italico dentro,
   marcador desemparelhado que fica como texto, `3 * 4` que nao vira italico, e
   o texto concatenado dos trechos igual ao original sem os marcadores.
2. Casos de `blocos`: citacao de duas linhas com hard-wrap, codigo cercado com
   linha em branco dentro, tabela, lista, lista numerada, titulo, e `* * *` como
   separador.
3. Estes casos rodam **sem** o pacote `docx` — sao funcao pura.

**Acceptance criteria:**
- [x] `npm test` verde, com os casos novos listados na saida
**Validation:** `npm test`

---

## Wave 2 — O papel
> Dependencies: ML-1A. Toca `src/docx.mjs`, que o ML-1A nao toca.

### ML-2A — `docx.mjs` renderiza os blocos e os trechos
**Status:** ✅ Concluído
**Files affected:** `src/docx.mjs`
**Actions:**
1. `runs(texto, base)` traduz `trechos()` em `TextRun`, com `bold`, `italics` e
   fonte monoespacada.
2. `paragrafos(texto, opts)` traduz `blocos()` em `Paragraph` e `Table`:
   paragrafo justificado; citacao com recuo dos dois lados e corpo menor; lista
   com marca e recuo; numerada com o numero do autor; codigo cercado em
   monoespacado com as quebras preservadas; tabela como `<w:tbl>` com cabecalho
   em negrito; titulo em negrito; separador como `❧`.
3. As tres chamadas de `bloco.replace(/\n/g, ' ')` — front matter, capitulo e
   apendice — passam a chamar `paragrafos()`.
4. O caso do separador sai do laco de capitulo e passa a viver no renderizador,
   sem mudar o que aparece no papel.

**Acceptance criteria:**
- [x] `grep -c "replace(/\\n/g, ' ')" src/docx.mjs` devolve zero
- [x] O rosto, o divisor de Parte, a ressalva e o rodape ficam como estao
**Validation:** `npm run lint && npm test`

### ML-2B — Regressao no XML gerado
**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Actions:**
1. Projeto descartavel com um capitulo que tem negrito, italico, codigo,
   citacao de duas linhas com hard-wrap, tabela, lista e `* * *`.
2. Extrai `word/document.xml` do DOCX gerado e confere: zero `**`, zero `*`
   solto no texto, zero crase, zero `>` de citacao, zero tubo de tabela.
3. E confere que a formatacao existe: `<w:b/>` presente, `<w:i/>` presente,
   fonte monoespacada presente, `<w:tbl>` presente. Sem este segundo par o teste
   passaria com um `replace` que so apaga marcador.

**Acceptance criteria:**
- [x] O caso falha com o `docx.mjs` anterior e passa com o novo
**Validation:** `npm test`

---

## Wave 3 — Prova nas obras reais
> Dependencies: ML-2A, ML-2B.

### ML-3A — Regerar os dois livros e contar
**Status:** ✅ Concluído
**Files affected:** nenhum do repositorio — e medicao
**Actions:**
1. `bookfw docx` em `C:\dev\pessoal\book\os-oito-modelos` e em
   `C:\dev\pessoal\book\metamorfose`, com o binario deste worktree.
2. Contar no texto extraido do `word/document.xml`: `**`, `*`, crase, `>` de
   citacao, tubo de tabela. Alvo: zero em cada.
3. Contar `<w:b/>`, `<w:i/>`, fonte monoespacada e `<w:tbl>`. Alvo: maior que
   zero onde a obra tem a marcacao correspondente.
4. Registrar os numeros de antes e de depois neste roadmap.

**Medicao registrada.** Mesma fonte, gerada com o `docx.mjs` anterior e com o
novo, e contada no texto extraido do `word/document.xml`:

| Marcador | Os Oito Modelos antes | depois | Metamorfose antes | depois |
|---|---|---|---|---|
| `**` de negrito | 970 | **0** | 12 | **0** |
| `*` de italico | 108 | **0** | 2 | **0** |
| crase de codigo | 26 | **0** | 0 | 0 |
| `>` de citacao | 10 linhas | **0** | 0 | 0 |
| `\|` de tabela | 17 linhas | **3** | 0 | 0 |
| `-` de lista | 16 linhas | **0** | 0 | 0 |
| `#` de titulo | 6 linhas | **0** | 0 | 0 |

Os 3 tubos que sobram nao sao marcador: sao o desenho do diagrama ASCII do
capitulo 10, e as tres corridas estao em Consolas — conferido no XML.

E a formatacao existe, que e a outra metade da prova:

| Formatacao aplicada | Os Oito Modelos antes | depois | Metamorfose antes | depois |
|---|---|---|---|---|
| `<w:b/>` | 0 | **544** | 0 | **6** |
| `<w:i/>` | 2 | **56** | 11 | **12** |
| corrida em Consolas | 0 | **25** | 0 | 0 |
| `<w:tbl>` | 0 | **17** | 0 | 0 |

**Nada foi comido no caminho.** A sequencia de palavras do DOCX, ignorando os
marcadores, e IDENTICA antes e depois nas duas obras — 38.257 palavras em "Os
Oito Modelos" e 22.209 em "Metamorfose".

**Ressalva.** "Os Oito Modelos" esta sendo editado agora: sete capitulos e o
apendice com alteracao nao commitada, da revisao 3. O DOCX regerado carrega esse
texto em andamento, e nao o congelado da revisao 2 — o nome do arquivo continua
sendo o da revisao registrada.

**Acceptance criteria:**
- [x] Marcador remanescente zero nas duas obras
- [x] Formatacao aplicada, e nao apenas marcador ausente
**Validation:** contagem sobre o XML, registrada aqui

### ML-3B — README, CHANGELOG e versao
**Status:** ✅ Concluído
**Files affected:** `README.md`, `CHANGELOG.md`, `package.json`
**Actions:**
1. README: uma linha sobre o que o `docx` entende de markdown, e o que nao
   entende.
2. CHANGELOG: secao `## 0.7.0` com a correcao e a contagem de antes.
3. `package.json` para `0.7.0`.

**Acceptance criteria:**
- [x] `npm run lint` passa a regra do changelog
**Validation:** `npm run check`
