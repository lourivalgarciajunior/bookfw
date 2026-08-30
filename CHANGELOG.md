# Changelog

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
