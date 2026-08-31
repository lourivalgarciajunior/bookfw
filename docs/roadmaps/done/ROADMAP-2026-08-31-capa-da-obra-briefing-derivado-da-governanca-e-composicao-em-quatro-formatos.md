---
status: done
date: 2026-08-31
req: "REQ-2026-08-31-capa-da-obra-briefing-derivado-da-governanca-e-composicao-em-quatro-formatos"
squad: "bookfw"
---

# Roadmap: Capa da obra — briefing derivado da governanca e composicao em quatro formatos

> Created: 2026-08-31 | Status: wip

## Context

REQ: REQ-2026-08-31-capa-da-obra-briefing-derivado-da-governanca-e-composicao-em-quatro-formatos
ADR: ADR-2026-08-31-capa-como-svg-governado-pela-obra-com-resvg-como-dependencia-opcional

O fluxo termina no DOCX e a capa fica fora da governanca. O SVG e a fonte da
verdade; `@resvg/resvg-js` e opcional, no padrao ja usado pelo `docx`.

## Acceptance Criteria

- [x] `bookfw capa brief` deriva o briefing dos artefatos governados, com origem apontada
- [x] `bookfw capa` gera SVG sem dependencia nenhuma instalada
- [x] Arte em `capa/arte.*` e embutida; sem arte, capa tipografica; `--tipografica` forca
- [x] Quatro formatos: ebook, impressao com lombada, miniatura, svg
- [x] Sem o pacote opcional: entrega o SVG, avisa, nao quebra
- [x] `validate` avisa capitulo em pronto sem capa — aviso, nunca erro
- [x] `npm run check` limpo; livros reais sem regressao

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** done
**Files affected:** este arquivo

**1. Completude da enumeracao.**
Superficies que emitem ou emitirao o artefato "capa": (a) `src/capa.mjs`, novo;
(b) o `bin`, que roteia o comando; (c) o `validate`, que passa a olhar a
existencia da capa; (d) o `docx`, que um dia pode embutir a capa como primeira
pagina; (e) o `README` e o plugin, que ensinam o fluxo.

A lista foi verificada contra o repositorio e contra as quatro obras, nao contra
a REQ. `ls */tools/` nas quatro obras: vazio. `grep -rli capa` em `docs/`,
`*.md` e `livro.yaml` das quatro: um unico acerto, dentro de uma palavra maior
numa DEC do `o-arquivo`. **Nao existe gerador de capa copiado em lugar nenhum** —
diferente do `gerar-docx.mjs`, que ja estava em quatro copias divergentes quando
foi consolidado. A lista esta fechada porque o artefato ainda nao existe fora
daqui; e justamente por isso que a hora de traze-lo para dentro e agora.

Fora de escopo declarado: (d), embutir capa no DOCX. Nao entra nesta REQ.

**2. Modelo de ameaca — quem esvazia esta wave sem quebrar regra escrita.**
- Gerar um SVG sintaticamente valido que rasteriza para um retangulo vazio: o
  teste que so confere `existsSync` passa. *Contramedida:* os testes conferem
  conteudo — titulo e autor presentes no SVG, e dimensoes corretas por formato.
- Declarar a lombada como constante plausivel em vez de calcula-la: ninguem
  percebe ate a grafica recusar. *Contramedida:* teste com duas contagens de
  palavras diferentes exige lombadas diferentes.
- Silenciar a falta do `resvg` num `try/catch` vazio e sair com codigo 0 sem
  produzir PNG. *Contramedida:* teste que roda sem o pacote e exige o aviso com
  o comando de instalacao na saida.
- Embutir a arte com caminho relativo em vez de data URI: abre no navegador do
  autor e quebra em qualquer outra maquina. *Contramedida:* teste que o SVG nao
  contem `href="capa/`.

**3. Alvos de falseamento nos dois sentidos.**
- *Aviso de capa ausente:* se regredir para nao avisar, o livro fecha sem capa em
  silencio. Se regredir para o outro lado — virar erro, ou avisar em obra que
  ainda esta no capitulo 3 — o gate vira ruido e o autor para de ler os avisos,
  que e o custo que a auditoria ja diagnosticou uma vez.
- *Escolha entre arte e tipografia:* se regredir para ignorar a arte, o autor gera
  a imagem e ela nao aparece. Se regredir para o outro lado e exigir arte, a capa
  tipografica deixa de existir e volta o bloqueio de "pronto e sem capa".
- *Quebra de linha do titulo:* sem quebra, titulo longo vaza da capa. Com quebra
  agressiva demais, titulo curto sai picado em duas linhas sem motivo.

**4. Residual declarado.**
A largura do titulo e estimada por media de glifo, nao medida na fonte real:
titulo no limite pode precisar de ajuste manual no SVG. Aceito, declarado na
saida do comando, e com a saida natural registrada na ADR (navegador headless)
caso a estimativa se mostre insuficiente. Tratamento de imagem — filtro, mascara,
sombra composta — fica fora: para isso existe o SVG editavel.

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao escrita nesta ML

**Gates da wave:**
```bash
# A enumeracao afirma que nao existe gerador de capa fora do CLI. O gate
# verifica a afirmacao em vez de confiar nela: qualquer script de capa que
# apareca nas obras reprova a wave e obriga a reabrir a lista.
test -z "$(ls /c/dev/pessoal/book/*/tools/*capa* 2>/dev/null)"
```

## Wave 1 — Briefing (sem dependencia)
> Dependencies: Wave 0

### ML-1A — `bookfw capa brief` deriva o briefing da governanca
**Status:** done
**Files affected:** `src/capa.mjs`, `bin/bookfw.mjs`, `test/smoke.mjs`
**Actions:**
1. Ler `livro.yaml`, plano diretor em vigor, DECs, style card e canon.
2. Extrair premissa, tema, promessa ao leitor, desfecho e a secao "Nao vai ter"
   do PD; lexico marcante do bloco de metrica do style card; lugares do canon.
3. Escrever `capa/briefing.md` com cada bloco apontando a origem, um bloco de
   prompt pronto para colar e um bloco do que nao deve aparecer.
**Acceptance criteria:**
- [x] Cada bloco do briefing nomeia o arquivo de onde saiu
- [x] Roda em obra sem style card e sem canon, degradando o bloco correspondente
- [x] Smoke confere premissa, promessas e o bloco de prompt

## Wave 2 — Composicao
> Dependencies: Wave 1

### ML-2A — SVG da capa, zero dependencia
**Status:** done
**Files affected:** `src/capa.mjs`, `test/smoke.mjs`
**Actions:**
1. Layout: titulo, subtitulo, autor, hierarquia e cor derivada do genero.
2. Quebra de linha do titulo por estimativa de largura, declarada na saida.
3. Arte de `capa/arte.*` embutida em data URI; sem arte, capa tipografica.
**Acceptance criteria:**
- [x] SVG sai sem nenhuma dependencia instalada
- [x] Titulo e autor presentes no SVG gerado
- [x] Arte entra como data URI, nunca como caminho relativo
- [x] `--tipografica` ignora arte existente

### ML-2B — Rasterizacao e os quatro formatos
**Status:** done
**Files affected:** `src/capa.mjs`, `package.json`, `test/smoke.mjs`
**Actions:**
1. `@resvg/resvg-js` como `optionalDependencies`, carregado como o `docx` faz.
2. Formatos `ebook` (1600x2560), `impressao` (espalhada, sangria, lombada),
   `miniatura`, `svg`.
3. Lombada = paginas estimadas x espessura do papel; declarar as paginas.
**Acceptance criteria:**
- [x] Cada formato sai na dimensao correta, conferida no PNG
- [x] Duas contagens de palavras diferentes produzem lombadas diferentes
- [x] Sem o pacote: SVG entregue, aviso com o comando de instalacao, sem quebrar

## Wave 3 — Gate e documentacao
> Dependencies: Wave 2

### ML-3A — O gate enxerga a capa, e o fluxo passa a ensina-la
**Status:** done
**Files affected:** `src/validate.mjs`, `README.md`, `CHANGELOG.md`, `package.json`, plugin `bookfw`
**Actions:**
1. `validate` avisa capitulo em `pronto` sem capa. Aviso, nunca erro.
2. README, CHANGELOG, versao, e o plugin (`commands/`, `skills/`) ensinando o passo.
**Acceptance criteria:**
- [x] Obra sem capitulo em pronto nao recebe o aviso
- [x] `npm run check` limpo
- [x] Livros reais sem regressao de contagem nem de manuscrito
