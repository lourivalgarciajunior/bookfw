---
status: done
date: 2026-08-31
req: "REQ-2026-08-31-bookfw-docx-exportacao-de-versao-de-leitura-no-cli"
squad: "solo"
---

# Roadmap: bookfw docx — exportacao de versao de leitura no CLI

> Created: 2026-08-31 | Status: wip

## Context

Consolidar em `bookfw docx` o gerador de versao de leitura hoje copiado em
quatro projetos de livro, usando o nucleo do CLI em vez do parser de YAML
proprio que cada copia carrega.

REQ: REQ-2026-08-31-bookfw-docx-exportacao-de-versao-de-leitura-no-cli
ADR: ADR-2026-08-31-exportacao-docx-vira-comando-do-bookfw-com-docx-como-dependencia-opcional

## Acceptance Criteria

- [x] `bookfw docx` gera o DOCX com layout equivalente ao das copias atuais
- [x] `verificar:` inline e `verificar:` em lista em bloco disparam o carimbo
- [x] `ressalva_verificar` do `livro.yaml` define o texto do carimbo
- [x] `docs/apendice.md` sai no fim do livro, uma pagina por secao `## `
- [x] `docx` em `optionalDependencies`, com erro legivel quando ausente
- [x] os quatro `tools/gerar-docx.mjs` removidos
- [x] `node test/smoke.mjs` verde, com casos novos para as regras acima
- [x] DOCX da Metamorfose com carimbo nos 10 capitulos que tem `verificar:`

## Wave 0 — Threat Model
> Dependencies: none. Blocks all implementation.

### ML-0A — Threat model for this roadmap
**Status:** ✅ Concluído
**Files affected:** este roadmap

**Actions:**

1. **Completude da enumeracao.** A REQ nomeia quatro `tools/gerar-docx.mjs`.
   Verificado por busca no repositorio de obras, e nao pela lista da REQ:

   ```
   find /c/dev/pessoal/book -name 'gerar-docx.mjs' -not -path '*/node_modules/*'
   grep -rl 'Fatos ainda nao verificados' /c/dev/pessoal /c/dev/ferramentas
   grep -rn 'gerar-docx' /c/dev/pessoal/book/*/package.json
   ```

   Alem dos arquivos, a busca pelo literal do carimbo fecha a lista de quem
   emite o mesmo artefato — se houver um quinto emissor, ele contem essa
   string. Superficies enumeradas: os quatro `.mjs`, os quatro `scripts.docx`
   do `package.json`, os quatro `dependencies.docx`, e a linha final do
   `bookfw build` que hoje aponta para "o agente book-hermes".

2. **Modelo de ameaca — quem esvazia esta Wave 0 sem quebrar regra escrita.**
   O modo de falha desta entrega nao e o build vermelho, e o **carimbo que
   some em silencio**. Tres caminhos concretos:

   - `capitulos()` do core devolve `verificar` como **array** quando o campo e
     lista em bloco, e como **string** quando e inline. Um `ressalva()` que
     so faz `(fm.verificar || '').trim()` recebe `[]` de um capitulo sem
     itens e `['a','b']` de um com itens — e `[].trim` nao existe. O teste
     que so cobre a forma inline passa verde com a forma em bloco quebrada;
   - o casamento capitulo-do-manuscrito com capitulo-do-kanban e por
     **numero**, extraido de `## 08 — Titulo` por regex. Se a regex nao casar,
     `fm` vira `{}`, `ressalva()` devolve `null`, e o DOCX sai sem carimbo,
     sem erro e sem aviso;
   - um `livro.yaml` com `ressalva_verificar:` vazio faz `cfg.ressalva_verificar`
     virar `''`, e `'' || padrao` cai no padrao — aceitavel — mas um valor em
     lista em bloco viraria array e imprimiria `a,b` no papel.

   A defesa nao e revisao: e o comando **contar e dizer**. `bookfw docx`
   imprime `N capitulos, M com ressalva`, e o ML-4A confere M contra o
   `grep -c` do frontmatter. Numero contra numero, nao leitura.

3. **Alvos de falsificacao nos dois sentidos.**

   | Superficie | Regride para menos | Regride para mais |
   |---|---|---|
   | `ressalva()` | capitulo com `verificar:` sai sem carimbo — leitor trata suposicao como fato apurado | capitulo confirmado sai carimbado — o carimbo perde valor e o autor aprende a ignora-lo |
   | casamento por numero | `fm` vazio: sem carimbo e sem ato | numero errado: carimbo de outro capitulo |
   | `docs/apendice.md` | apendice nao sai — pendencia declarada some do papel | apendice sai no meio dos capitulos |
   | `optionalDependencies` | `validate`/`status` quebram junto com o `docx` | — |

   Os dois sentidos entram na suite: ha caso que exige carimbo presente e
   caso que exige carimbo ausente em capitulo sem `verificar:`.

4. **Residual declarado.** O comando nao confere se o texto do capitulo
   corresponde ao que `verificar:` descreve — ele carimba o capitulo, nao a
   frase. Nao ha checagem de fidelidade tipografica pixel a pixel entre a
   saida antiga e a nova; a equivalencia de layout e garantida por o codigo de
   montagem ser o mesmo, transplantado, e conferida por leitura do DOCX
   gerado. EPUB e PDF ficam fora, por escopo negativo da REQ.

**Acceptance criteria:**
- [x] As quatro secoes respondidas com evidencia
- [x] Nenhuma linha de implementacao escrita neste ML

**Gates da wave:**
```bash
# A lista de emissores do artefato esta fechada: nenhum gerador de DOCX fora
# dos quatro livros enumerados. Se este gate falhar, existe um quinto emissor.
test "$(find /c/dev/pessoal/book -name 'gerar-docx.mjs' -not -path '*/node_modules/*' | wc -l)" -eq 4
```

## Wave 1 — o comando no CLI
> Dependencies: Wave 0. ML unico — todos os arquivos sao do bookfw e o
> `bin/bookfw.mjs` e tocado junto com `src/docx.mjs`.

### ML-1A — `src/docx.mjs`, registro no CLI e dependencia opcional
**Status:** ✅ Concluído
**Files affected:**
- `src/docx.mjs` (novo)
- `bin/bookfw.mjs`
- `src/build.mjs`
- `package.json`
- `README.md`, `CHANGELOG.md`

**Actions:**
1. Criar `src/docx.mjs` exportando `docx(args)`, transplantando a montagem do
   documento da copia do `dois-regimes` (rosto, front matter, capitulos,
   apendice, rodape, A5/Georgia) sem alterar medidas nem cores.
2. Trocar o parser proprio pelo nucleo: `acharProjeto`, `lerConfig`,
   `capitulos` de `src/core.mjs`. Nada de `readdirSync` sobre `capitulos/` e
   nada de regex de YAML dentro do `docx.mjs`.
3. `ressalva(fm, cfg)` tem de aceitar `verificar` string **e** array, porque o
   `yamlRaso` do core devolve as duas formas. Normalizar com um helper que
   junta array em texto e devolve `''` para vazio.
4. `import('docx')` dinamico, com `catch` que lanca `Erro` nomeando o pacote e
   `npm i docx`. `docx` entra em `optionalDependencies` no `package.json`.
5. Registrar `case 'docx'` no `bin/bookfw.mjs` e a linha na `AJUDA`.
6. Trocar a ultima linha do `build.mjs` — hoje "DOCX/EPUB e com o agente
   book-hermes" — por um ponteiro para `bookfw docx`.
7. Atualizar `README.md` e `CHANGELOG.md`; subir a `version` do pacote.

**Acceptance criteria:**
- [x] `bookfw help` lista o comando
- [x] o CLI continua respondendo `status`/`validate` sem o `docx` instalado
- [x] `src/docx.mjs` nao varre `capitulos/` nem faz regex de YAML
- [x] `trackfw validate` sem violations novas

**Gates da wave:**
```bash
node bin/bookfw.mjs help | grep -q 'bookfw docx'
grep -q '"optionalDependencies"' package.json
```

## Wave 2 — a suite
> Dependencies: Wave 1. Sequencial: escreve sobre o comando do ML-1A.

### ML-2A — casos de smoke para o carimbo, o texto e o apendice
**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`

**Actions:**
1. Projeto descartavel com tres capitulos em `revisao`: um com `verificar:`
   inline, um com `verificar:` em lista em bloco, e um sem o campo.
2. Rodar `build` e `docx`, e conferir na saida `3 capitulos, 2 com ressalva` —
   o numero cobre presenca **e** ausencia num caso so.
3. Caso com `ressalva_verificar` no `livro.yaml`: extrair o `word/document.xml`
   do DOCX gerado e conferir que o texto configurado esta la e o padrao nao.
4. Caso com `docs/apendice.md`: conferir o titulo da secao no `document.xml`.
5. Caso `origem: ESPECIME DE FORMA`: tem precedencia sobre `verificar:`.
6. Se o `docx` nao estiver instalado no ambiente do teste, os casos que geram
   arquivo sao **pulados com aviso visivel**, nunca silenciosamente verdes.

**Acceptance criteria:**
- [x] `node test/smoke.mjs` termina com `OK.` e codigo 0
- [x] a suite falha se o carimbo parar de sair na forma de lista em bloco —
      verificado trocando `texto()` por uma versao que devolve `''` para
      array, o que reproduz o parser antigo: 4 casos vermelhos, entre eles
      `carimbo sai na forma inline e na forma de lista em bloco`

**Gates da wave:**
```bash
node test/smoke.mjs
```

## Wave 3 — migracao dos quatro livros
> Dependencies: Wave 2. Sequencial: so depois do comando testado.

### ML-3A — remover as copias e apontar os scripts para o CLI
**Status:** ✅ Concluído
**Files affected:**
- `pessoal/book/{metamorfose,o-arquivo,o-boxeador-sonhador,dois-regimes}/tools/gerar-docx.mjs` (removidos)
- `package.json` dos quatro livros

**Actions:**
1. `npm link` do bookfw, para os livros usarem a versao de trabalho.
2. Remover os quatro `tools/gerar-docx.mjs` e as pastas `tools/` que ficarem
   vazias.
3. Em cada `package.json`: `"docx": "bookfw docx"`.
4. Conferir livro a livro que `npm run docx` gera o arquivo.

**Acceptance criteria:**
- [x] `find /c/dev/pessoal/book -name gerar-docx.mjs` (fora de node_modules) vazio
- [x] os quatro `npm run docx` terminam com codigo 0

**Gates da wave:**
```bash
test -z "$(find /c/dev/pessoal/book -name 'gerar-docx.mjs' -not -path '*/node_modules/*')"
```

## Wave 4 — evidencia
> Dependencies: Wave 3.

### ML-4A — conferir o carimbo no DOCX da Metamorfose
**Status:** ✅ Concluído
**Files affected:** nenhum — so evidencia

**Actions:**
1. Regenerar o DOCX da Metamorfose pelo comando novo.
2. Contar no frontmatter os capitulos com `verificar:` preenchido.
3. Extrair `word/document.xml` do DOCX e contar as ocorrencias do carimbo.
4. Os dois numeros tem de bater, e bater com o `M` que o comando imprimiu.

**Acceptance criteria:**
- [x] capitulos com `verificar:` no kanban == carimbos no `document.xml` ==
      `M` impresso pelo comando
- [x] registrado neste roadmap o comando e o resultado, nao a afirmacao

**Evidencia — 2026-08-31.** Contagem feita nos quatro livros, e nao so na
Metamorfose, porque o mesmo comando passou a servir os quatro. O script le o
frontmatter dos capitulos em `revisao`/`pronto` de um lado e o
`word/document.xml` do DOCX gerado do outro, e compara numero com numero:

```
livro                  kanban  |  docx  |
metamorfose               10   |   10   |  OK
o-arquivo                  4   |    4   |  OK
o-boxeador-sonhador        0   |    0   |  OK
dois-regimes              10   |   10   |  OK
```

Os quatro batem tambem com o `M` que o proprio comando imprimiu
(`17 capitulos, 10 com ressalva`, `7 / 4`, `18 / 0`, `23 / 10`).

Leitura do DOCX da Metamorfose no capitulo 8, para conferir a ordem no papel:

```
"capitulo 08  ·  ato 2" / "O recuo" / "Fatos ainda nao verificados pelo autor" / "Eu tinha comecado a contar."
```

**Ressalva sobre a premissa da tarefa.** A tarefa dizia que o carimbo nao
aparecia na Metamorfose e que a correcao do parser de lista em bloco era o que
faltava para ele sair. Nao era: a Metamorfose usa `verificar:` **inline**, que
a regex antiga ja capturava — antes desta mudanca, `node tools/gerar-docx.mjs`
naquele projeto ja imprimia `17 capitulos, 10 com ressalva`. Quem usa lista em
bloco e o `dois-regimes`, que ja rodava a copia corrigida. O bug de lista em
bloco era real e esta corrigido, mas nenhum livro estava perdendo carimbo por
causa dele no dia desta entrega.

**Gates da wave:**
```bash
cd /c/dev/pessoal/book/metamorfose && npm run docx
```
