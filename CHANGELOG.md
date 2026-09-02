# Changelog

## 0.4.4 — 2026-09-02

Tres defeitos achados compondo a capa de "Os Oito Modelos da Reforma
Tributaria" — o primeiro livro de nao-ficcao a passar pelo comando. Nenhum
deles aparecia na `metamorfose`, que tem titulo de uma palavra e genero de uma
palavra.

### Corrigido

- **Titulo longo crescia por cima da arte.** O corpo era fixo em 11.5% da
  largura e o bloco descia sem limite: o titulo saiu em quatro linhas sobre a
  imagem. Titulo longo e a norma em nao-ficcao, nao a excecao. Agora o corpo
  cede ate o bloco caber na faixa dele, a saida diz quando reduziu, e avisa
  quando nem no corpo minimo cabe — em vez de disfarcar.
- **A paleta errava o genero por uma letra.** `nao-ficcao tecnica` nao contem
  `tecnico`, entao o livro tecnico saia com o dourado do padrao em vez do azul.
  O casamento passou a ser pelo radical, e vale tambem para `memorias`,
  `romances` e `historias`.
- **Markdown ia impresso na quarta capa.** O texto vem do plano diretor, que usa
  negrito: a contracapa saiu com `**o que a transicao quebra no sistema**`
  literal, asterisco e tudo. Negrito, italico, codigo, titulo e citacao agora
  saem da marcacao e ficam so com o texto.

## 0.4.3 — 2026-09-02

### Adicionado

- **`capa_escurecer` no `livro.yaml`.** A calibragem do veu e da OBRA, nao da
  linha de comando. Sem lugar para grava-la, os arquivos compostos deixavam de
  ser regeneraveis: quem clonasse o repositorio e rodasse `bookfw capa` receberia
  os 42% de padrao e uma capa diferente da que o autor aprovou — o que impede
  trata-los como derivados e mante-los fora do git. Medido na `metamorfose`: com
  a chave gravada, a capa regenera com o mesmo hash sem nenhum flag.
  `--escurecer` continua valendo e tem precedencia; a saida diz de onde a
  calibragem veio, e valor invalido aponta a fonte certa.

## 0.4.2 — 2026-08-31

### Corrigido

- **O veu escuro sobre a arte deixou de ser fixo.** A composicao aplicava 42% de
  escurecimento sobre a arte para o titulo ler — calibragem certa para foto
  clara, e mortal para arte que ja nasce escura. Achado compondo a capa real da
  `metamorfose`: uma arte vetorial de linha teve a linha quase apagada, e num
  segundo conceito o escurecimento matou justamente o branco, que era o conceito
  inteiro. Agora `--escurecer` vai de 0 a 1, com 0.42 de padrao, e a saida diz
  quanto foi aplicado. Quem sabe quanto a arte aguenta e quem olha a capa.

## 0.4.1 — 2026-08-31

O bloco de metrica fechava com uma linha de "palavras marcantes". Medida na
`metamorfose`, ela entregava **dez palavras funcionais em doze**:

> estava, corpo, ainda, apenas, tinha, algo, cada, talvez, houve, naquele, vida, havia

O reparo que o sintoma sugere — ampliar a lista de palavras vazias — ataca o
lugar errado. **Frequencia bruta em portugues devolve palavra funcional por
construcao**, e nao ha lista de exclusao que resolva isso sem virar um dicionario
mantido a mao. O bloco entra em todo briefing de cena e, desde a 0.4.0, no
briefing de capa, onde deveria dizer de que a obra e feita para quem vai
desenhar. Ver ADR-2026-08-31 sobre lexico do style card.

### Corrigido

- **Duas listas em vez de uma.** *Lexico da obra* — substantivo, adjetivo e verbo
  recorrentes, depois de descontadas as palavras funcionais de portugues. Na
  `metamorfose` passa a ser `corpo, vida, consciencia, momento, casulo,
  fevereiro, forca, lado, tempo, lagarta, limite, sentido, mundo`. Casulo,
  lagarta, consciencia e limite sao a obra.
- **Tique de voz reportado com taxa.** `apenas`, `talvez` e `ainda` nao eram
  ruido: sao a hesitacao caracteristica do autor. Sair do lexico de conteudo nao
  e ser descartado — e ser reportado no lugar certo, com a unidade certa
  (`ainda 5.5, apenas 5.2, talvez 3.5` por mil palavras). Adverbio em `-mente`
  entra junto, exigindo quatro caracteres antes do sufixo: sem isso o
  substantivo `mente`, que na `metamorfose` e palavra da obra, virava tique.
- **Plural e singular contam junto**, e so quando as duas formas ja aparecem no
  texto — assim `mes` nunca vira `me`. Genero **nao** e dobrado: `silenciosa`
  contra `silencioso` pode ser escolha, e fundir apagaria a escolha.
- **Amostra abaixo de 1000 palavras e declarada**, no bloco e na saida do
  comando. `o-arquivo` tem 92 palavras em `samples/` e imprimia `sempre 54.3 por
  mil` com a mesma cara de autoridade que tem sobre 3433 palavras. Metrica sobre
  amostra insuficiente e pior que metrica ausente, porque parece medida.
- **`bookfw capa brief` acompanha o rotulo novo** e continua lendo o antigo. Esse
  bloco e lido por regex: trocar o rotulo sem o leitor acompanhar esvaziaria o
  briefing de capa sem erro nenhum.

### Residual declarado

Sem etiquetagem morfologica, verbo flexionado sobra no lexico de conteudo
(`parecia`). A lista de funcionais e so de portugues. A saida natural, se a
aproximacao nao bastar, esta registrada na ADR: TF-IDF contra corpus de
referencia — rejeitado agora por peso e manutencao.

## 0.4.0 — 2026-08-31

O fluxo terminava no DOCX de leitura. Entre o manuscrito pronto e o livro
publicado faltava a capa — o unico artefato que precisa de uma coisa que um CLI
Node de zero dependencia nao tem e nao vai ter: arte rasterizada. A resposta e a
mesma que o `brief` deu para a escrita: capa e um problema de briefing antes de
ser um problema de desenho. Ver ADR-2026-08-31 sobre capa como SVG governado.

### Adicionado

- **`bookfw capa brief`** — monta o pacote que vai para o gerador de imagem ou
  para o ilustrador, derivado do que ja esta governado: premissa, tema, promessa
  ao leitor, promessas numeradas, lugares do canon, lexico medido pelo `style` e
  a secao "Nao vai ter" do plano diretor. **Cada bloco aponta a origem**, para
  que linha errada se corrija na fonte e nao no briefing — senao a proxima
  geracao reescreve o conserto. Sai com um bloco de prompt pronto para colar e
  um bloco do que nao deve aparecer na arte.
- **`bookfw capa`** — compoe. Havendo `capa/arte.(png|jpg|webp)`, a arte e
  embutida **em data URI**, nunca por caminho relativo: SVG com `href="capa/..."`
  abre na maquina do autor e quebra em qualquer outra, inclusive na da grafica.
  Sem arte, a capa sai **tipografica**, com paleta derivada do genero — capa
  legitima, e o que desbloqueia o livro pronto sem ilustracao. `--tipografica`
  forca essa forma mesmo havendo arte.
- **Quatro formatos**, por `--formato`: `ebook` (1600x2560, padrao),
  `impressao` (capa espalhada 6x9 com sangria e lombada), `miniatura` e `svg`.
  **O SVG sai em todo formato**, nao so no ebook: e a fonte da verdade, e a capa
  de impressao e justamente a que mais precisa de ajuste fino.
- **Quarta capa com texto**, tirada da promessa ao leitor do plano diretor. Capa
  espalhada com verso em branco nao e entregavel.
- **Lombada calculada**, nao estimada de olho: paginas do corte x espessura do
  papel branco KDP. O comando declara quantas paginas assumiu.
- **`@resvg/resvg-js` como dependencia opcional**, no padrao do `docx`. Sem ele o
  comando entrega o SVG, avisa e diz o que instalar — degrada, nao quebra.
- **O gate enxerga a capa**: obra com capitulo em `pronto` e sem capa recebe
  aviso, nunca erro. So cobra depois do primeiro capitulo fechado — avisar antes
  da hora treina o autor a ignorar aviso.

### Residual declarado

A largura do titulo e estimada por media de glifo, nao medida na fonte real:
titulo no limite pode precisar de ajuste manual, e o comando avisa quando
quebrou em mais de uma linha em vez de esconder a estimativa. Tratamento de
imagem — filtro, mascara, sombra composta — fica fora: para isso existe o SVG.

## 0.3.0 — 2026-08-31

Blocos 4 e 5 da auditoria: o atrito diario do kanban, e a disciplina que o
bookfw cobrava das obras e nao cobrava de si.

### Adicionado

- **`cap move` aceita lista e faixa**: `bookfw cap move 8..12 pronto`,
  `bookfw cap move 1,5,9 revisao`. Fechar os dez capitulos em revisao de
  `metamorfose` eram dez comandos. Em lote, a guarda do `pronto` e conferida
  **antes** de mover qualquer um — um capitulo fechado no meio da faixa recusa o
  lote inteiro em vez de deixar metade movida.
- **`bookfw cap renumber <cap> <n>`** — troca o numero mexendo em nome de
  arquivo, `id` e `numero` do frontmatter ao mesmo tempo. Recusa numero ja
  ocupado: renumerar por cima trocaria dois textos de lugar sem dizer.
- **`bookfw cap retitle <cap> "Titulo"`** — troca o titulo e leva junto o slug do
  nome do arquivo e do `id`. Ate aqui, mudar o titulo no frontmatter deixava o
  arquivo preso ao nome antigo para sempre.
- **`npm run lint`** (`tools/lint.mjs`, zero dependencia) — sete regras, cada uma
  nascida de coisa que ja quebrou: template que nenhum comando le, placeholder
  que nada preenche, comando fora da ajuda, versao sem entrada no changelog,
  arquivo que o npm nao empacota, modulo orfao em `src/`, comando ausente do
  README. `npm run check` roda lint e smoke.
- **CI no GitHub Actions**, em Linux e Windows. O autor escreve no Windows e os
  bugs de CRLF e de nome de arquivo so aparecem la — o `cap renumber` recusou
  todo capitulo do disco por procurar `---
` num arquivo com `---

`.

### Corrigido

- **`CHANGELOG.md` nao ia no pacote.** Quem instalasse do registry nao tinha como
  saber o que mudou. Agora esta no `files`, e o lint cobra.

## 0.2.1 — 2026-08-31

Bloco 3 da auditoria: o sumario era governanca decorativa. O gate conferia que
o arquivo existia e nunca abria; o `context`, que existe para um agente retomar
a obra sem contexto nenhum, saia sem o outline. Os dois artefatos que o `init`
cria e ninguem lia — `cronologia.md` e `regras.md` — entram junto.

### Adicionado

- **O gate le a tabela do sumario e compara com o kanban**, nos dois sentidos:
  capitulo escrito que nao esta no sumario, e capitulo planejado que nunca foi
  materializado. Tambem acusa titulo que divergiu do outline. Sao **avisos**,
  nao erros: escrever e iterativo, e quem decide qual dos dois lados corrigir e
  o autor — o gate so tira a divergencia do silencio.
- **`bookfw context` passa a carregar sumario, cronologia, regras do mundo e o
  placar de promessas** (plantada / paga / nao plantada). Era o dump "para LLM"
  sem o documento que diz o que vem a seguir.

### Nota sobre lacuna de numeracao

Nao existe checagem de buraco na numeracao, e e deliberado: em `metamorfose` os
numeros 13 a 19 estao livres de proposito e documentados no sumario. Buraco so
significa alguma coisa **contra o plano** — e essa comparacao a checagem nova ja
faz. Um aviso de lacuna solto seria ruido em toda obra que corta capitulo.

Medido nas duas obras: `metamorfose` fica sem nenhum aviso novo (17 capitulos,
17 linhas de sumario, vao intencional respeitado); `o-arquivo` ganha quatro
avisos verdadeiros — os capitulos 07, 14, 25 e 26 foram escritos com o sumario
parado em tres linhas.

## 0.2.0 — 2026-08-31

A exportacao de DOCX vivia fora do CLI, copiada em quatro projetos de livro
como `tools/gerar-docx.mjs`. O cabecalho do proprio arquivo dizia "Generico:
nada aqui e especifico de uma obra" — e mesmo assim eram quatro copias. Elas
divergiram: tres correcoes existiam so em um dos livros. Esta versao traz o
gerador para dentro.

### Adicionado

- **`bookfw docx [--desde <estado>]`** — a versao de leitura do manuscrito:
  miolo A5, serifado, rosto, rodape numerado, sem marcacao de trabalho. Le o
  mesmo corte do `build`, direto do kanban.
- **Carimbo de ressalva com texto configuravel.** Capitulo com `verificar:`
  preenchido abre com uma ressalva em italico, e o texto sai de
  `ressalva_verificar` no `livro.yaml` — memoria e livro tecnico nao ressalvam
  com as mesmas palavras. Sem a chave, o padrao continua *Fatos ainda nao
  verificados pelo autor*. `origem: ESPECIME` tem precedencia.
- **`docs/apendice.md`** — renderizado no fim do livro, uma pagina por secao
  `## `, com o mesmo tratamento de `docs/front-matter.md`. Lugar para o que e
  do produto e nao e capitulo: lista de pendencias, glossario, fontes.
- **`docx` como `optionalDependencies`.** O nucleo do bookfw continua sem
  dependencia nenhuma; sem o pacote, so este comando falha, com mensagem que
  nomeia o que instalar. Resolve tambem a partir do `node_modules` da obra,
  para o CLI linkado enxergar o pacote que ja estava la.

### Corrigido

- **Capitulo com `verificar:` em lista em bloco saia sem carimbo.** A copia
  usava um parser de YAML proprio cuja regex exigia valor na mesma linha, entao
  `verificar:` seguido de itens indentados nunca era capturado. O capitulo
  chegava ao papel com a mesma cara de um capitulo conferido — que e
  exatamente o contrario do que o carimbo existe para fazer. O comando novo
  usa o `yamlRaso` do nucleo, que entende as duas formas.
- **Frontmatter perdido em silencio.** O gerador copiado relia o `.md` do
  manuscrito e recasava capitulo por numero, com regex sobre o cabecalho. Um
  cabecalho fora do formato e o capitulo saia sem ato e sem ressalva, sem erro
  e sem aviso. `build` e `docx` agora leem o kanban pela mesma funcao
  (`selecao`), e o casamento por numero deixou de existir.

### Mudado

- `bookfw build` terminava apontando para "o agente book-hermes" para DOCX e
  EPUB. Agora aponta para `bookfw docx`, que existe.

## 0.1.4 — 2026-08-31

O gate cobrava artefato que o CLI nao sabia produzir. Ficha de canon, cena a
partir da segunda e capitulo do sumario nasciam na mao — e ficha e cena sao
exatamente o que o `validate` reprova com **erro**. Esta versao fecha o
circuito: o gate agora nomeia o comando que resolve o que ele acabou de apontar.

### Adicionado

- **`bookfw canon new personagem|lugar "Nome"`** — cria a ficha a partir dos
  templates `personagem.md` e `lugar.md`, que existiam no disco e nenhum comando
  usava. Aceita `--apelidos`, `--papel`, `--resumo`, `--tipo`, e **recusa nome ou
  apelido que ja esteja no canon**, inclusive entre personagem e lugar: a cena
  declara os dois no mesmo espaco de nomes, e duas fichas do mesmo sujeito
  divergem em silencio.
- **`bookfw cena add <cap>`** — acrescenta contrato de cena ao capitulo. O id
  segue o esquema que o capitulo ja usa (`6.1` -> `6.2`, `6.A` -> `6.B`), aceita
  os campos por flag, avisa qual personagem ainda nao tem ficha e diz quais dos
  tres campos obrigatorios ficaram em branco. Mesma guarda do `cap move`:
  capitulo em `pronto` exige `--forcar`.
- **`bookfw sum --materializar`** — cria no kanban os capitulos da tabela do
  sumario. Eram 17 e 24 `cap new` digitados nas duas obras reais. Idempotente:
  capitulo que ja existe e pulado, entao rodar de novo depois de acrescentar
  linha so cria o que falta. `--simular` mostra sem escrever.

### Corrigido

- **Mensagem do gate passou a dar o comando.** `personagem "X" nao existe no
  canon` virou `rode: bookfw canon new personagem "X"`; o mesmo para lugar e
  para capitulo sem contrato de cena.

### Nota de leitura do sumario

A tabela e lida **por nome de coluna**, nao por posicao — as duas obras reais
tem colunas finais diferentes (`Palavras`, `Fonte`) — e so o bloco **contiguo**
de linhas com barra conta como tabela. Varrer o arquivo inteiro atras de linha
com barra misturava a tabela de capitulos com as outras do sumario: em
`o-arquivo`, "a mesma pergunta da pagina 1" virava um capitulo 1 fantasma e o
vao `04–06` virava um capitulo 406. Linha que nao vira capitulo e **reportada
como ignorada**, com o motivo, em vez de sumir.

## 0.1.3 — 2026-08-31

Quatro bugs achados na auditoria depois de escrever a primeira obra completa.
Tres deles faziam o gate mentir; um perdia texto. Cada um saiu com teste de
regressao — a suite nova, rodada contra o codigo da 0.1.2, reprova em oito
asserçoes e passa em todas as outras.

### Corrigido

- **Cabecalho no meio do capitulo cortava a prosa fora do manuscrito.** A prosa
  de uma cena era lida ate o proximo `## `, entao qualquer cabecalho escrito no
  meio do capitulo engolia o resto — em silencio. Pior: o `status` contava o
  texto inteiro e o `build` costurava so a primeira metade, de modo que a
  contagem confirmava um manuscrito que nao existia. Agora a prosa vai de um
  contrato de cena ao contrato seguinte, e nota de trabalho fica em comentario
  HTML, que sai dos dois.
- **Promessa com crase no texto sumia do gate.** Um filtro que existia para
  ignorar o exemplo do template descartava a linha inteira ao ver um acento
  grave. Promessa escrita como ``- P1 — o `arquivo` que nao apaga`` nao era
  cobrada, e a obra podia fechar com fio solto recebendo OK. Agora so bloco
  cercado e ignorado; crase no meio do texto e texto.
- **Plano diretor revisado era ignorado.** `promessas`, `status`, `context` e
  `sum` liam o **primeiro** PD do diretorio, que pela ordem de nome e o mais
  antigo. Revisar o plano desligava a cobranca de Chekhov sem avisar. Passa a
  valer o mais recente, e o `validate` diz qual e quando ha mais de um.
- **Capitulo em `bloqueado` sumia do manuscrito sem uma linha.** O `build` so
  olha a escada `backlog -> pronto`; capitulo com prosa fora dela desaparecia
  calado. Agora e nomeado na saida, e o resumo diz quantos de quantos entraram.

## 0.1.2 — 2026-08-30

### Corrigido

- **`cap move` reabria capitulo em `pronto` sem perguntar.** Apontar o fluxo de
  escrita para um capitulo fechado o devolvia para a bancada em silencio, e
  texto acabado voltava a ser rascunho sem ninguem ter decidido. Sair de
  `pronto` agora exige `--forcar`; todo o resto do kanban continua livre,
  inclusive o `revisao -> escrita` que e o "volta" de rotina da revisao.
- **`brief` avisa** quando o capitulo pedido esta em `pronto`. E leitura, entao
  nao recusa — mas o aviso sai antes de alguem escrever por cima.
- **A versao estava duplicada.** O CLI dizia 0.1.0 com o pacote em 0.1.1.
  Agora `bookfw version` le do `package.json`.

### Nota de teste

O helper do smoke capturava so o stdout, entao aviso em stderr passava
despercebido. Passou a juntar os dois.

## 0.1.1 — 2026-08-30

### Corrigido

- **`build` escrevia sempre no mesmo arquivo.** Conferir a versao fechada com
  `--desde pronto` sobrescrevia em silencio o manuscrito de trabalho por uma
  versao parcial, com o mesmo nome e a mesma cara. Agora e um arquivo por
  corte: o padrao mantem o nome limpo, os outros ganham sufixo (`-esboco`,
  `-pronto`).
- **Corte padrao do `build` passou de `esboco` para `revisao`.** `esboco` inclui
  capitulo sem prosa, o que so serve para conferencia interna — nao para o
  arquivo que as ferramentas de exportacao leem.

### Nota

O repositorio mudou de `trackfw_book` para `bookfw`, alinhando com o nome que o
CLI, o pacote e o plugin ja usavam.

## 0.1.0 — 2026-08-30

Primeira versão. Governança de obra longa: `DEC → PD → SUM → kanban de capítulos → manuscrito`.

### CLI `bookfw`

- `init` — cria o projeto do livro com `livro.yaml`, kanban, canon e `samples/`
- `dec`, `pd`, `sum` — cadeia de artefatos, com templates preenchíveis
- `cap new` / `cap move` — kanban de capítulos (`backlog`, `esboco`, `escrita`, `revisao`, `pronto`, `bloqueado`, `abandonado`)
- `brief` — o pacote do escritor: contrato da obra, style card, contrato da cena, fichas do canon em cena e a cauda do que já foi escrito
- `style` — métrica objetiva da voz do autor sobre `samples/`
- `validate` — gate de governança, com `--json`
- `status` e `context` — estado do kanban e dump para LLM
- `build` — costura o manuscrito a partir do kanban

### Decisões

- **Node zero-dep** em vez de Go: mesma linguagem das ferramentas do `plugin-skill`, sem cadeia de build.
- **Contrato de cena com os campos de roteiro** (`local`, `tempo`, `foco`, `personagens`, `objetivo`, `conflito`, `virada`, `saida`): adaptação para roteiro lê do contrato, não da prosa.
- **`pessoa_narrativa` na obra e `foco` na cena** são coisas diferentes: a primeira é gramatical e vale para o livro inteiro; a segunda é o personagem cuja cabeça o leitor ocupa.
