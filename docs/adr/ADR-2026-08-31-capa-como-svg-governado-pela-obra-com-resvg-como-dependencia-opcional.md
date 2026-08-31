---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Capa como SVG governado pela obra, com resvg como dependencia opcional

> Date: 2026-08-31 | Status: Accepted

## Context

O bookfw leva a obra do plano diretor ao DOCX de leitura. O que falta entre o
manuscrito pronto e o livro publicado e a capa — e a capa e o unico artefato do
fluxo que precisa de uma coisa que o CLI nao tem e nao vai ter: arte
rasterizada. Nenhum gerador de imagem cabe num CLI Node de zero dependencia.

Duas observacoes decidem o desenho.

A primeira: **capa e um problema de briefing antes de ser um problema de
desenho**. O `bookfw brief` ja provou a tese na escrita — ninguem escreve uma
cena relendo o livro inteiro, escreve-se com o pacote minimo e suficiente na
mesa. Uma capa tem o mesmo problema e a mesma solucao. Premissa, tema, genero,
promessas, o que a obra deliberadamente nao faz, o lexico marcante medido pelo
`style card`, os lugares do canon: tudo isso ja esta governado e e exatamente o
que um gerador de imagem ou um ilustrador humano precisa receber. Hoje o autor
reescreve esse briefing na mao, de memoria, cada vez.

A segunda: **a arte e a tipografia sao coisas separadas, e so a segunda e
determinista**. A ilustracao vem de fora — Midjourney, DALL-E, um ilustrador,
uma foto do proprio autor. Titulo, autor, hierarquia, cor, lombada e medidas de
sangria nao: sao calculaveis a partir do que ja esta no `livro.yaml` e na
contagem de palavras. Uma capa que so tem tipografia e uma capa legitima —
muita nao-ficcao publica assim — e e o que da para entregar sem depender de
nada externo.

Ha ainda uma restricao de formato. O autor pediu quatro saidas: ebook
1600x2560, capa espalhada de impressao com sangria e lombada, miniatura para
mandar ao leitor-teste junto com o DOCX, e o SVG editavel para ajuste posterior
em Illustrator ou Figma.

## Decision

**O SVG e a fonte da verdade da capa. PNG e derivado.**

O CLI gera SVG com zero dependencia — e um dos quatro formatos pedidos, abre em
qualquer editor vetorial, e versiona em texto no git junto com a obra. Todo o
resto (ebook, impressao, miniatura) e o mesmo SVG rasterizado em medida
diferente.

**A rasterizacao usa `@resvg/resvg-js` como dependencia opcional**, no mesmo
padrao ja estabelecido pelo `docx` na ADR-2026-08-31 sobre exportacao. Medido
nesta maquina antes de decidir: renderiza texto com Georgia resolvendo fonte do
sistema, e renderiza `<image>` com raster embutido em data URI — que e como a
arte do autor entra na composicao. Sem o pacote, `bookfw capa` continua
entregando o SVG e diz o que instalar; o resto do CLI nao ganha dependencia
nenhuma.

**O comando se divide em dois passos, espelhando o `brief`:**

- `bookfw capa brief` — monta o briefing da capa a partir da governanca da
  obra. E o pacote que vai para o gerador de imagem ou para o ilustrador.
- `bookfw capa` — compoe. Se houver arte em `capa/arte.*`, usa; se nao houver,
  cai na capa tipografica. A composicao, as medidas e a lombada sao do CLI nos
  dois casos.

**A lombada sai da contagem de palavras**, que o `build` ja calcula: paginas
estimadas x espessura do papel. Numero de paginas e o unico dado da capa de
impressao que nao esta no `livro.yaml`, e ele ja e derivavel do manuscrito.

## Consequences

Positivas:

- O briefing de capa deixa de ser reescrito de memoria a cada tentativa, e passa
  a ser derivado dos mesmos artefatos que o gate ja cobra. Capa que contradiz a
  obra vira uma coisa dificil de fazer por acidente.
- O SVG versiona em texto. O diff de uma mudanca de capa e legivel, e a capa
  entra no mesmo repositorio da obra, sob o mesmo historico.
- Sem o pacote opcional instalado, o comando ainda entrega alguma coisa util.
  Degrada, nao quebra.
- A capa tipografica da um resultado publicavel sem nada externo, o que remove o
  bloqueio de "o livro esta pronto e nao tem capa".

Negativas e aceitas:

- Composicao em SVG nao e um editor de imagem. Sombra complexa, mascara,
  tratamento de foto e filtro ficam fora do escopo — quem precisa disso exporta
  o SVG e termina no Illustrator, que e um dos formatos pedidos justamente por
  isso.
- `@resvg/resvg-js` e binario nativo. Numa plataforma sem prebuild, a instalacao
  falha — e por isso que ela e opcional e que o SVG e a fonte da verdade.
- A quebra de linha do titulo no SVG e calculada por estimativa de largura de
  glifo, nao por metrica real de fonte. Titulo muito longo pode precisar de
  ajuste manual. O comando declara a estimativa em vez de esconde-la.

## Alternatives Considered

**Gerar PNG direto, sem SVG intermediario.** Exigiria canvas ou sharp como
dependencia obrigatoria, mataria o formato editavel que o autor pediu, e tiraria
a capa do controle de versao em texto. Rejeitado.

**Compor em HTML e imprimir com um navegador headless.** Daria tipografia muito
melhor — quebra de linha real, fontes web, CSS de verdade. Custa Playwright ou
Puppeteer, que sao centenas de megabytes de navegador para desenhar um
retangulo com duas linhas de texto. Rejeitado pelo peso, mas e a saida natural
se a estimativa de largura de glifo se mostrar insuficiente na pratica.

**`sharp` em vez de `@resvg/resvg-js`.** Faz o servico e e mais conhecido, mas e
uma biblioteca de processamento de imagem inteira para usar so o conversor de
SVG. O `resvg-js` e exatamente o escopo necessario e menor. Rejeitado por
excesso.

**Deixar a capa fora do bookfw.** Foi o estado ate aqui, e e o mesmo erro que a
ADR do DOCX ja corrigiu uma vez: o que fica fora do CLI e copiado de livro em
livro e diverge. Com quatro obras governadas, a capa seguiria o mesmo caminho
do `gerar-docx.mjs`. Rejeitado.
