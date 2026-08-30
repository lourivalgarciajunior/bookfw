# Changelog

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
