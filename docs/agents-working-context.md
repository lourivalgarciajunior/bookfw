# agents-working-context

Estado de trabalho do bookfw para quem chegar depois. Uma entrada por frente,
a mais recente no topo.

## 2026-08-31 — `bookfw docx` (0.2.0)

**O que mudou.** A exportacao de versao de leitura em DOCX saiu de dentro dos
projetos de livro e virou comando do CLI.

- `src/docx.mjs` — novo. Monta o documento (A5, Georgia, rosto, front matter,
  capitulos, apendice, rodape numerado). Le o kanban pelo nucleo, nao por
  parser proprio.
- `src/build.mjs` — passou a exportar `CORTE_PADRAO`, `prosaFinal(cap)` e
  `selecao(raiz, minimo)`. **`build` e `docx` compartilham a selecao**: o
  gerador antigo relia o `.md` do manuscrito e recasava capitulo por numero
  via regex sobre o cabecalho, e um cabecalho fora do formato fazia o capitulo
  sair sem ato e sem ressalva, calado. Se um terceiro formato de saida
  aparecer (EPUB, PDF), ele consome `selecao` tambem.
- `package.json` — `docx` em `optionalDependencies`. O nucleo do bookfw
  continua com zero dependencia, e isso e proposital: `status` e `validate`
  nao podem depender de um gerador de OOXML.
- Os quatro `pessoal/book/*/tools/gerar-docx.mjs` foram removidos, e o script
  `docx` de cada livro chama `bookfw docx`. Os livros tambem deixaram de
  declarar `docx` em `dependencies` — quatro pins da mesma versao era a
  mesma doenca que a consolidacao curou.

**O que vigiar.** O modo de falha deste comando nao e o erro: e o capitulo nao
confirmado saindo com a mesma cara de um capitulo apurado. Por isso o comando
imprime `N capitulos, M com ressalva` — para o carimbo sumindo virar numero, e
nao descoberta na leitura do arquivo pronto. O `test/smoke.mjs` cobre as duas
formas de `verificar:` (inline e lista em bloco), a precedencia do
`origem: ESPECIME`, o texto configuravel em `ressalva_verificar`, o padrao
quando a chave nao existe, e o capitulo **sem** pendencia que tem de sair
limpo.

**Armadilha de teste, ja paga.** No Windows os templates chegam com CRLF. Um
helper de teste com `/^---\n/` nao casa, nao insere nada, e o teste passa a
medir um frontmatter vazio — verde por engano. O `fmAdd` do smoke usa
`/^---\r?\n/` e **lanca** se nao encontrar o frontmatter.

**Fora de escopo, de proposito.** EPUB, PDF, capa, ISBN e ficha catalografica.
O lugar existe (`src/epub.mjs` ao lado do `docx.mjs`), a entrega nao.

**Governanca.** ADR-2026-08-31-exportacao-docx-vira-comando-do-bookfw-…,
REQ-2026-08-31-bookfw-docx-…, ROADMAP homonimo. Este repo passou a ser
governado pelo trackfw nesta frente — antes dela nao havia `docs/adr` nem
`docs/req`.

**Divida conhecida.** `trackfw validate` reporta 12 violations que nao sao
deste repo: os hooks globais em `~/.claude`, `~/.codex`, `~/.gemini`,
`~/.cursor`, `~/.copilot` e `~/.kiro` apontam para scripts em
`~/.trackfw/scripts` sem bit de execucao (Windows). O remedio e global —
`trackfw update harness` —, e por isso nao foi rodado dentro desta frente.

## 2026-09-05 — `bookfw revisao`: a historia de leitura da obra (0.5.0)

**O que mudou.** Comando novo `bookfw revisao "o que mudou"` grava uma linha em
`docs/revisoes.md` (numero sequencial, data, capitulos por estado, palavras,
capitulos com `verificar:`, commit curto quando ha git, nota obrigatoria). O
registro e append-only; o proximo numero e o MAIOR existente + 1. `status`,
`build`, `docx` e `context` leem o registro e carimbam: rosto e rodape do DOCX,
`_Revisao N — data_` sob o titulo do manuscrito, e o nome do arquivo passa a
`<titulo> — revisao N.docx`. Sem revisao, `build` e `docx` avisam e seguem.

**Por que.** "Os Oito Modelos" foi ao revisor duas vezes em tres dias e os dois
DOCX tinham o mesmo nome. O commit nao e unidade de leitura e o `livro.yaml` e
invariante por decisao de obra — dai um registro proprio, e nao um campo nem uma
tag de git.

**Governanca.** ADR-2026-09-05-revisao-da-obra-…, REQ-2026-09-05-bookfw-revisao-…,
ROADMAP-2026-09-05-bookfw-revisao. Smoke cobre recusa sem nota, numeracao,
append-only com buraco, status, context, carimbo do build, aviso sem revisao,
e o nome do DOCX (quando o pacote `docx` esta instalado).

**Armadilha encontrada.** O `trackfw validate` deste repo reconhece a
referencia REQ→ADR pela linha do CORPO no formato `ADR: \`docs/adr/<arq>.md\``,
nao pelo frontmatter `adr:` — REQ com o frontmatter certo e o corpo em nome puro
gera "adr is not referenced by any REQ". O formato do corpo e caminho completo
em crase, como nos REQs de 2026-08-31.

## 2026-09-05 — o divisor de Parte, derivado do plano diretor (0.6.0)

**O que mudou.** `partes(raiz)` em `core.mjs` le a tabela de Partes do PD e
devolve `Map<ato, {romano, titulo}>`. `build` emite `## Parte I — <titulo>` e
`docx` emite uma pagina propria, quando o `ato` do capitulo muda. As duas saidas
contam os divisores; ato sem linha na tabela avisa e nao emite.

**Por que.** "Os Oito Modelos" anuncia quatro Partes, declara as quatro no PD,
tem `ato` nos 23 capitulos — e o manuscrito saia com zero divisores. A estrutura
existia dos dois lados e nao se encontrava.

**Armadilha achada pelo smoke, e vale para quem mexer nisso.** A primeira versao
procurava a SECAO `## Estrutura`. O template de plano diretor ja traz uma, com
coluna `Ato` e celulas `1`, `2a`, `2b`, `3` — entao toda obra recem-criada
ganhava um divisor "Parte II — 2a". A tabela passou a ser achada pelo
**cabecalho da primeira coluna** (`Parte`), que e a declaracao de que aquela
tabela nomeia Partes.

**Governanca.** ADR-2026-09-05-o-divisor-de-parte-…, REQ-2026-09-05-bookfw-build-e-docx-…,
ROADMAP-2026-09-05-divisor-de-parte.
