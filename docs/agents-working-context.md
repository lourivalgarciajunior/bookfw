# agents-working-context

Estado de trabalho do bookfw para quem chegar depois. Uma entrada por frente,
a mais recente no topo.

## 2026-09-18 — referencia biblica, sumario, indice e pagina final (0.9.0)

**O que mudou.** `src/biblia.mjs` (lista de livros, `trechosDeReferencia`,
`problemasDeReferencia`) e `src/indice.mjs` (termos do canon por cena) sao
novos. O `docx.mjs` estiliza a referencia, gera sumario (TOC sobre campos TC),
indice (XE + INDEX) e a pagina final (secao com `vAlign bottom`), e troca o
paragrafo de quebra por `pageBreakBefore`. O `validate` cobra a referencia sem
livro. O `pdf.mjs` atualiza TOC e indice no Word antes de exportar.

**O que vigiar.** Campo do Word so na forma `fldChar`/`instrText`: o
`SimpleField` da biblioteca (`<w:fldSimple/>` vazio) fez o Word 16 embaralhar a
paginacao do livro inteiro, com o capitulo 18 na pagina 1. O numero de pagina
do sumario e do indice so existe depois do Word; pelo LibreOffice pode sair em
branco.

## 2026-09-13 — `bookfw pdf` (0.8.0)

**O que mudou.** `src/pdf.mjs` novo: `revisoesComDocx`, `resolverConversor`,
`pareceUmPdf` e `pdf(args)`. Le `manuscrito/` pelo nome que o `docx` da
(`<titulo> — revisao N.docx`, `docx.mjs` linha ~360) e converte por
LibreOffice, Word COM (Windows) ou conversor proprio. Rota e ajuda em
`bin/bookfw.mjs`; secao "O PDF das revisoes" no README.

**O que vigiar.** O casamento pelo nome e o contrato com o `docx`: se o nome do
DOCX mudar, o `pdf` para de achar as revisoes e diz que nao ha nenhuma. A
conversao real nao roda no CI (sem Word nem LibreOffice); o smoke usa conversor
proprio e a prova real e abrir o PDF da obra. O Word por COM depende da sessao
do usuario — em servico sem desktop ele falha, e o erro manda instalar o
LibreOffice.

## 2026-09-13 — subtitulo da capa em linhas (0.7.2)

**O que mudou.** `src/capa.mjs` ganhou `ajustarSubtitulo` (exportado, com a
constante `SUBTITULO`): o subtitulo usa `quebrar` na largura util do formato e
cede o corpo ate o piso de 2,5% da largura. `svgFrente` passou a devolver
`{ svg, subtitulo }`, e `svgDaCapa` repassa `subtitulo` — quem consumir
`svgDaCapa` direto continua lendo `.svg`. O aviso sai do que cada formato de
fato compos, e nao de simulacao no ebook como o do titulo.

**O que vigiar.** Tudo e estimativa de glifo: a prova do smoke e contra a
mesma estimativa, entao Georgia com muita letra larga ainda pode vazar alguns
pixels sem o teste perceber. O que pega isso e abrir o PNG. Autor, titulo da
lombada e quarta capa continuam sem reducao propria. Validado na capa real de
`pessoal/book/ninguem-nasce-santo`, que antes precisou de SVG corrigido a mao.

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

## 2026-09-08 — o docx aplica o markdown em vez de imprimir o marcador (0.7.0)

**O que mudou.** Novo `src/markdown.mjs`, puro e sem OOXML: `trechos()` parte a
linha em negrito, italico e codigo; `blocos()` parte o texto em paragrafo,
citacao, lista, numerada, codigo cercado, tabela, titulo e separador. O
`docx.mjs` traduz isso em `Paragraph`, `TextRun` e `Table`. As tres chamadas de
`bloco.replace(/\n/g, ' ')` — front matter, capitulo e apendice — sumiram.

**Por que.** O DOCX que foi para um revisor tecnico externo saiu com 970
asteriscos de negrito a vista, 108 de italico, 26 crases, 17 linhas de tabela em
tubos — e zero `<w:b/>`. E a citacao com hard-wrap levava o `>` das linhas de
continuacao para o meio da frase, porque as linhas eram juntadas ANTES de o
marcador ser removido. O revisor apagou varios a mao.

**A verificacao conta duas coisas, e nao uma.** Marcador remanescente zero E
formatacao aplicada maior que zero, no trecho que o autor marcou. So o primeiro
criterio passaria com um `replace` que apaga o marcador e entrega o texto sem a
enfase — que e a correcao errada, e a tentadora.

**Duas armadilhas achadas medindo.**

1. `blocos()` varre por LINHA, e nao por `split(/\n{2,}/)`: bloco de codigo
   cercado tem linha em branco dentro, e o corte por linha em branco partia o
   diagrama ASCII em tres pedacos com as cercas a vista.
2. O tipo do bloco sai da PRIMEIRA linha, nunca de uma linha de continuacao.
   Num livro sobre reforma tributaria o hard-wrap comeca com "2033. O sistema…"
   com frequencia, e ler isso como item de lista numerada partiria o paragrafo.

**Bug de teste achado no caminho, corrigido a parte.** Tres casos de promessa no
plano diretor casavam por string crua com `\n`; no Windows o PD nasce com CRLF,
o `replace` nao acontecia e o teste media um PD nunca editado. Estavam vermelhos
no `main`. Foi para mudanca propria — `test(smoke): a promessa P1 casa com CRLF`
—, porque bug de teste nao viaja de carona em correcao de produto.

**Governanca.** ADR-2026-09-08-o-docx-do-bookfw-interpreta-markdown-…,
REQ-2026-09-08-bookfw-docx-aplica-a-formatacao-do-markdown-…,
ROADMAP-2026-09-08-docx-markdown.

## 2026-11-12 — o `publish.yml` esta vermelho desde 20/09, e a causa e do lado da npm

**Registro escrito porque a prova EXPIRA.** A conclusao abaixo foi derivada dos logs
do Actions em 12/11/2026, e a retencao padrao e de **90 dias**: 20/09 + 90 ≈
**19/12/2026**. Depois disso nao ha como refazer esta derivacao, e o que resta e o
workflow vermelho sem explicacao.

### O que falhou

```
35533826397  att=3  20/09 16:54  404 Not Found + E404   <- o modo do `registry-url`
35534421834  att=2  20/09 17:05  ENEEDAUTH              } depois do fix que o tirou
35534682364         20/09 17:10  ENEEDAUTH              }
35535129035         20/09 17:18  ENEEDAUTH              }  (release v0.10.0)
```

4 runs, **4 failures**, todos em 20/09. Nenhum depois — e a `main` segue vermelha por
isso, sem relacao com o conteudo de nenhum commit posterior.

### O mecanismo: o npm parou na autenticacao SEM falar com o registry

```
npm notice total files: 33  ·  bookfw-0.10.0.tgz  ·  85.0 kB
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
```

🔴 **O discriminante e o CONTRASTE entre os runs, nao a ausencia de sinal:** o primeiro
imprimiu `404 Not Found - PUT https://registry.npmjs.org/bookfw`, que e **resposta do
registry**. Os tres ultimos nao imprimem nenhuma. Logo o npm **nao chegou a tentar a
troca OIDC** — ele decidiu que nao tinha credencial e parou antes.

### O lado do GitHub esta CORRETO, e isso foi medido na epoca

O commit `3a0c2cd` acrescentou um passo de diagnostico cujo proprio comentario dizia:
*"so ha duas causas possiveis: o runner nao recebeu as variaveis de OIDC (problema do
lado do GitHub) ou recebeu e o npm desistiu (problema do lado da npm). Este passo
separa as duas."* O log do run `35534682364` responde:

```
ACTIONS_ID_TOKEN_REQUEST_URL     presente: sim   (com a URL completa)
ACTIONS_ID_TOKEN_REQUEST_TOKEN   presente: sim   (***)
npm: 12.0.2
```

**Recebeu, e o npm desistiu.** A versao do npm fica eliminada por um segundo caminho,
independente do diagnostico: o npm 10 imprime `npm ERR!` e o 11+ imprime `npm error`,
e o log do publish diz `npm error` — logo o passo rodou o 12.0.2, nao o 10.9.8 que o
`setup-node` instala com o Node 22.

```
visibility=public  ·  id-token: write declarado no nivel do workflow
secrets=0, de proposito  ·  node v22.23.2 (>= 22.14.0)  ·  npm 12.0.2 (>= 11.5.1)
```

### 🔴 E a publicacao confiavel nunca funcionou uma vez

```
versoes no npm     ["0.8.0"]  — e so ela
publicada em       13/09 21:47 local  por lourivalgarciajunior
attestations       AUSENTE   ->  publicada com TOKEN, nao por OIDC
tags locais        v0.10.0 · v0.8.0 · v0.3.0      (v0.9.0 nunca existiu)
```

O repo diz **0.10.0**, o npm serve **0.8.0**, e a release `v0.10.0` existe no GitHub
desde 20/09. O vao de duas versoes e publico.

### A causa que resta, e o que NAO se le do repositorio

Sobra o lado da npm, e a unica peca que nao esta aqui e a linha de **Trusted
Publisher** em `npmjs.com/package/bookfw/access`. 🔴 **O comentario do proprio
`publish.yml` afirma que ela estava configurada** — *"duas execucoes seguidas com a
publicacao confiavel ja configurada na pagina do pacote"* —, mas isso e **afirmacao
num comentario, nao medicao**, e o `ENEEDAUTH` sem tentativa de troca e consistente
com ela estar ausente ou nao casar. O que conferir, campo a campo:

```
npmjs.com/package/bookfw/access -> Trusted Publisher -> GitHub Actions
  Organization or user   lourivalgarciajunior
  Repository             bookfw
  Workflow filename      publish.yml        <- so o nome, SEM .github/workflows/
  Environment            (em branco)
```

### 🔴 O achado de processo: a investigacao foi abandonada no meio

O `ecfdd59` removeu o diagnostico com a mensagem *"a pergunta dele ja foi
respondida"*. A pergunta **dele**, sim; o problema, nao. O workflow ficou vermelho, a
conclusao *"e do lado da npm"* nao foi escrita em lugar nenhum, e em 12/11 ela teve de
ser re-derivada de log — que e justamente o que esta entrada existe para evitar da
proxima vez.

**Nao ha correcao neste repositorio a fazer.** O proximo passo e na pagina do pacote,
que e conta e 2FA do usuario; depois dela, um `workflow_dispatch` publica a 0.10.0 —
e repare que o gate *"a tag casa com a version"* so roda no evento `release`, entao um
dispatch publica o que o `package.json` disser.
