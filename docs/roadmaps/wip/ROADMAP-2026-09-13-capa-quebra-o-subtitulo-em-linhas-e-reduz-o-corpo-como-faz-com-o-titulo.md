---
status: wip
date: 2026-09-13
req: "docs/req/REQ-2026-09-13-capa-quebra-o-subtitulo-em-linhas-e-reduz-o-corpo-como-faz-com-o-titulo.md"
branch: "fix/subtitulo-da-capa"
squad: ""
---

# Roadmap: Capa quebra o subtitulo em linhas e reduz o corpo como faz com o titulo

> Created: 2026-09-13 | Status: wip

## Context

REQ: docs/req/REQ-2026-09-13-capa-quebra-o-subtitulo-em-linhas-e-reduz-o-corpo-como-faz-com-o-titulo.md

Sem ADR novo: aplica ao subtitulo a decisao do
ADR-2026-08-31-capa-como-svg-governado-pela-obra-com-resvg-como-dependencia-opcional
(quebra por estimativa de largura, declarada na saida). Caso real que motivou:
capa de `pessoal/book/ninguem-nasce-santo`, corrigida a mao em 2026-09-13.

Ondas 1 e 2 tocam `src/capa.mjs` em mais de um ML: os MLs que dividem arquivo
sao sequenciais.

## Acceptance Criteria

- [ ] Subtitulo quebrado por `quebrar` na largura util do formato, em um `<text>` por linha, entrelinha 1,4 corpo.
- [ ] Corpo cede ate o piso quando o bloco nao cabe entre o fim do titulo e o fio inferior, ou passa de tres linhas.
- [ ] Aviso de quebra/reducao e aviso amarelo quando nem no piso cabe; codigo de saida inalterado.
- [ ] Subtitulo curto sai identico ao de hoje.
- [ ] Arte, veu, lombada e quarta capa inalterados.
- [ ] Regressao no smoke nos tres formatos, provada por mutacao.
- [ ] `npm run check` verde, `trackfw validate` limpo, versao 0.7.2 no package.json e no CHANGELOG.
- [ ] Capa de `ninguem-nasce-santo` regerada pelo comando e conferida a olho.

## Status Legend
⬜ Pendente · 🔄 Em andamento · ✅ Concluído · ❌ Bloqueado

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Concluído
**Files affected:** nenhum (analise)

**1. Completude da enumeracao.** `grep -rn "<text" src` acha seis emissores de
texto SVG, todos em `src/capa.mjs`: linhas do titulo (266), subtitulo (272),
autor (279), quarta capa em linhas (300), autor na quarta capa (305) e titulo
da lombada (333). Nenhum outro arquivo do CLI emite SVG. Fora do CLI:
`pessoal/book/*/tools` nao tem gerador de capa (os geradores por obra foram
removidos na consolidacao do 0.2.0); o plugin `plugin-skill/plugins/bookfw`
documenta avisos da capa, mas nao gera nada. Dos seis, so o subtitulo nao
passa por `quebrar`: titulo e quarta capa ja passam; autor, autor do verso e
lombada sao linha unica por desenho. A lista esta fechada.

**2. Modelo de ameaca (quem esvazia esta onda sem quebrar regra escrita).**
- Um teste que confira so a presenca de mais de um `<text>` passaria com a
  quebra errada (linha ainda larga demais). O teste mede a largura estimada de
  cada linha contra a util, e confere que nenhuma palavra sumiu.
- Um teste so no `ebook` passaria com a impressao quebrada, porque la a frente
  e deslocada por `x = xFrente`. O teste cobre os tres formatos e, na
  impressao, a linha contra a lombada.
- Reduzir o corpo sem piso "resolve" qualquer subtitulo em letra ilegivel e
  nunca avisa. O piso e fixo e o aviso amarelo e testado.
- Quebrar sempre, mesmo o subtitulo curto, muda capas ja aprovadas. O teste
  confere que o curto sai com o mesmo corpo e uma linha so.

**3. Alvos de falsificacao nas duas direcoes.**
- Regressao para o antigo (sem quebra): o teste do subtitulo longo reprova por
  largura acima da util (mutacao prevista no ML-1C).
- Regressao ao contrario (quebra agressiva demais, ou corpo reduzido sem
  necessidade): o teste do subtitulo curto reprova por corpo diferente ou por
  mais de uma linha.
- Bloco empurrado para cima do fio inferior ou do autor: o teste confere que a
  ultima linha fica acima de 72% da altura.

**4. Residual declarado.** A largura continua estimada (0.52 em por glifo), nao
medida na fonte: Georgia com muita letra larga ainda pode vazar alguns pixels;
o aviso manda conferir o SVG. Palavra unica mais larga que a util nao se
quebra: vira aviso amarelo. Autor, titulo da lombada e verso seguem sem
reducao propria (fora de escopo pela REQ).

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao neste ML

**Gates da wave:**
```bash
test "$(grep -rl '<text' src | wc -l)" -eq 1 && grep -c '<text' src/capa.mjs
```

## Wave 1 — Implementation
> Dependencies: Wave 0. MLs sequenciais: 1A e 1B dividem `src/capa.mjs`.

### ML-1A — composicao do subtitulo em linhas
**Status:** ⬜ Pendente
**Arquivos:** `src/capa.mjs`
**Acoes:**
1. Criar e exportar `ajustarSubtitulo(subtitulo, corpoInicial, larguraUtil, espaco, piso)`:
   quebra com `quebrar`; enquanto o bloco (`linhas * corpo * 1.4`) passar de
   `espaco` ou tiver mais de 3 linhas, e o corpo estiver acima do piso, reduz o
   corpo em 6% e quebra de novo. Devolve `{ corpo, linhas, reduzido, apertado }`;
   `apertado` tambem quando alguma linha estimada passa da largura util.
2. Em `svgFrente`, corpo inicial igual ao de hoje (`round(corpoTitulo * 0.34)`),
   primeira linha no mesmo `y` de hoje, demais a `1.4 * corpo`; `espaco` vai do
   topo da primeira linha a 72% da altura; piso em 2,5% da largura.
3. `svgFrente` passa a devolver `{ svg, subtitulo }`; `svgDaCapa` devolve
   `subtitulo` junto com `svg`.
**Aceite:** subtitulo curto gera SVG byte a byte igual ao atual; longo sai em
duas ou mais linhas dentro da util.

### ML-1B — aviso no comando
**Status:** ⬜ Pendente
**Arquivos:** `src/capa.mjs`
**Acoes:** apos compor, se algum formato devolveu subtitulo com mais de uma
linha ou reduzido, imprimir em dim `subtitulo em N linhas[, corpo reduzido
para caber] — a largura e estimada, nao medida na fonte; confira o SVG`; se
algum devolveu `apertado`, imprimir em amarelo `subtitulo longo demais`. Codigo
de saida inalterado.
**Aceite:** saida do caso real traz o aviso dim; subtitulo absurdo traz o amarelo.

### ML-1C — regressao no smoke
**Status:** ⬜ Pendente
**Arquivos:** `test/smoke.mjs`
**Acoes:** projeto com o subtitulo real no `livro.yaml`, `capa --formato
ebook,impressao,miniatura`; para cada SVG: linhas do subtitulo reconstroem o
texto inteiro, nenhuma estimada acima de 80% da largura da frente, ultima linha
acima de 72% da altura; na impressao, borda esquerda estimada de cada linha a
direita da lombada. Subtitulo curto: uma linha, corpo igual ao de antes.
Subtitulo absurdo: aviso amarelo e codigo 0.
**Aceite:** verde com o conserto; com o bloco do subtitulo revertido ao antigo,
o teste reprova (mutacao registrada no commit).

**Barreira da onda 1:**
```bash
npm run check && trackfw validate
```

## Wave 2 — Release e obra
> Dependencies: Wave 1.

### ML-2A — versao, CHANGELOG e contexto
**Status:** ⬜ Pendente
**Arquivos:** `package.json`, `package-lock.json`, `CHANGELOG.md`, `docs/agents-working-context.md`
**Acoes:** 0.7.1 → 0.7.2; entrada `## 0.7.2 — 2026-09-13` em "Corrigido" com o
caso medido; entrada no contexto de agentes.
**Aceite:** `node -p "require('./package.json').version"` imprime 0.7.2.

### ML-2B — capa real regerada
**Status:** ⬜ Pendente
**Arquivos:** `pessoal/book/ninguem-nasce-santo/capa/*` (outro repositorio)
**Acoes:** apos o merge em `main` (o `bookfw` global e link para esta arvore),
rodar `bookfw capa --tipografica --formato ebook,impressao,miniatura` na obra,
abrir os tres PNGs e comitar la.
**Aceite:** subtitulo em linhas dentro da frente nos tres PNGs, sem ajuste manual.

## Wave 3 — Red team
> Dependencies: Wave 2.

### ML-3A — tentativa de quebrar a composicao
**Status:** ⬜ Pendente
**Arquivos:** nenhum (verificacao)
**Acoes:** compor com subtitulo vazio, so espacos, com `&` e `<`, palavra unica
de 80 letras e 400 caracteres; conferir que nao ha excecao, que o XML continua
valido (escapado) e que os avisos aparecem onde devem.
**Aceite:** nenhum caso derruba o comando nem gera SVG invalido.
