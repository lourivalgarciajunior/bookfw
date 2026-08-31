---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Exportacao DOCX vira comando do bookfw com docx como dependencia opcional

> Date: 2026-08-31 | Status: Accepted

## Context

O gerador de versao de leitura em DOCX nasceu dentro de um projeto de livro,
como `tools/gerar-docx.mjs`, e foi copiado para os quatro livros governados
pelo bookfw: `metamorfose`, `o-arquivo`, `o-boxeador-sonhador` e
`dois-regimes`. O cabecalho do proprio arquivo ja declarava a intencao:
"Generico: nada aqui e especifico de uma obra".

A copia cobrou o preco previsto. Em 2026-08-31 as quatro copias divergiram: a
do `dois-regimes` recebeu tres correcoes que as outras tres nao tem.

1. O YAML raso do gerador so entendia `chave: valor` na mesma linha. Um
   frontmatter com `verificar:` seguido de itens indentados nunca era
   capturado, e o carimbo de ressalva no DOCX nao disparava. O `dois-regimes`
   usa essa forma nos dez capitulos com pendencia de fonte.
2. O texto do carimbo era literal no codigo. Memoria e livro tecnico marcam a
   mesma duvida com palavras diferentes — "fatos ainda nao verificados pelo
   autor" nao serve para nao-ficcao tecnica, que precisa de "afirmacoes a
   conferir em fonte primaria antes de publicar".
3. Nao havia lugar para o que e do produto mas nao e capitulo: lista de
   pendencias, glossario, fontes. O `dois-regimes` passou a ter
   `docs/apendice.md`.

Nenhuma das tres correcoes e especifica de uma obra. As tres sao do gerador.
Enquanto ele viver copiado, toda correcao futura nasce com tres livros para
tras, e a divergencia so aparece quando alguem compara os arquivos a mao.

Um segundo fato pesa na decisao: as tres correcoes ja existem no bookfw, em
outro lugar. O `yamlRaso` de `src/core.mjs` entende lista em bloco desde
sempre, e o `frontmatter`/`capitulos` do core ja le o kanban inteiro. O
gerador copiado reimplementava, pior, o que o nucleo do CLI ja fazia.

## Decision

A exportacao de DOCX passa a ser `bookfw docx`, em `src/docx.mjs`, e usa o
nucleo do CLI — `acharProjeto`, `lerConfig`, `capitulos`, `yamlRaso` — em vez
de reimplementar leitura de YAML e varredura de kanban.

O pacote `docx` entra como **dependencia opcional** (`optionalDependencies`),
nao como dependencia direta:

- o bookfw e um CLI de governanca de texto, e o resto dele nao tem
  dependencia nenhuma — `src/core.mjs` diz isso na primeira linha. Tornar
  `docx` obrigatoria faria todo projeto de livro carregar um gerador de OOXML
  para rodar `validate` ou `status`;
- `optionalDependencies` mantem o `npm install` do bookfw verde quando o
  `docx` nao instala, e o comando explica o que falta em vez de estourar um
  `ERR_MODULE_NOT_FOUND`.

Os quatro `tools/gerar-docx.mjs` sao removidos, e o script `docx` do
`package.json` de cada livro passa a chamar `bookfw docx`.

## Consequences

Positivas:

- uma correcao no gerador vale para os quatro livros e para todo livro futuro,
  no mesmo movimento;
- o gerador passa a ler o kanban pelo mesmo codigo que o `build`, o `status` e
  o `validate` leem. Um capitulo so tem um significado dentro do bookfw;
- `bookfw build` deixa de terminar com "DOCX/EPUB e com o agente book-hermes"
  e passa a apontar para um comando que existe;
- o carimbo de ressalva vira contrato do framework, com texto configuravel em
  `livro.yaml`, e nao decisao de uma copia.

Negativas e aceitas:

- os livros passam a depender da versao do bookfw instalada. Um livro com
  bookfw velho perde as correcoes ate atualizar — e o preco normal de sair da
  copia para a dependencia;
- `optionalDependencies` significa que o erro de dependencia ausente so
  aparece em tempo de execucao do comando. Mitigado por uma mensagem que
  nomeia o pacote e o comando de instalacao;
- EPUB e PDF continuam fora. Este ADR abre o lugar para eles
  (`src/docx.mjs` ao lado de futuros `src/epub.mjs`), mas nao os entrega.

## Alternatives Considered

**Propagar as tres correcoes para os outros tres livros e registrar a divida.**
Rejeitada. Resolve o sintoma de hoje e mantem a causa: quatro copias, quatro
lugares para corrigir na proxima vez. O custo de fazer certo agora e um
arquivo novo e quatro remocoes.

**`docx` como dependencia direta do bookfw.** Rejeitada. Obriga quem so
governa texto a instalar um gerador de OOXML, e contraria a escolha de
dependencia zero que o nucleo declara.

**Um pacote separado, `bookfw-docx`, como plugin.** Rejeitada por ora. Nao ha
um segundo formato de saida nem um terceiro consumidor que justifique o custo
de publicar e versionar outro pacote. Se EPUB e PDF chegarem e a arvore de
dependencia incomodar, esta e a saida natural — e este ADR nao a fecha.
