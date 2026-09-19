---
status: Accepted
date: 2026-09-18
author: "Lourival Garcia"
---

# ADR: Versao de leitura com referencia biblica estilizada, sem pagina em branco, sumario e indice por campos do Word

> Date: 2026-09-18 | Status: Accepted

## Context

A revisao 2 de `ninguem-nasce-santo` foi lida por um formador (Vladimir), e o
autor pediu, em 2026-09-18, quatro coisas para a versao de leitura:

1. **Referencia biblica em italico e com letra menor que o texto.** O markdown
   da obra marca italico, mas nao tem como marcar tamanho de letra.
2. **Nenhuma pagina em branco.** O PDF da revisao 2, com 107 paginas, tem quatro
   paginas vazias: 29, 52, 76 e 102. Medido com PyMuPDF.
   - As tres primeiras vem antes de cada divisor de Parte. O `docx.mjs` empurra
     uma quebra antes de todo capitulo que nao e o primeiro, e outra antes do
     divisor. Sao duas quebras seguidas, e entre elas fica uma pagina vazia.
   - A pagina 102 vem da quebra feita com paragrafo proprio (`PageBreak` num
     paragrafo). Quando o capitulo 17 termina rente ao pe da pagina 101, o
     paragrafo da quebra cai sozinho na pagina seguinte e quebra de novo.
3. **Sumario**, com o numero de pagina de cada Parte e de cada capitulo.
4. **Indice**, com os nomes de pessoas e as paginas onde aparecem.

Numero de pagina so existe depois que o texto e paginado, e quem pagina e o
programa que abre o DOCX (Word ou LibreOffice). O `docx.mjs` nao pagina.

## Decision

1. **A referencia e reconhecida pela lista de livros da Biblia**, em
   `src/biblia.mjs`, e desenhada em italico, com corpo menor. A regra liga
   pela chave `referencia_biblica` do `livro.yaml`:
   - `romano` exige numeral romano nos livros numerados (II Coríntios).
   - `arabico` aceita o algarismo arabico.
   - O corpo vem de `referencia_biblica_corpo`, em pontos; o padrao e 9, contra
     os 10,5 do texto.
   - Com a chave ligada, o `validate` acusa, como violacao, referencia sem
     livro ("(20,3-4)") e, no modo `romano`, livro numerado com algarismo
     arabico.
2. **A quebra de pagina vira propriedade do primeiro paragrafo da pagina nova**
   (`pageBreakBefore`), e nao um paragrafo proprio. Cada pagina nova pede uma
   quebra so, e quebra no inicio de pagina nao gera pagina vazia.
3. **Sumario e indice saem como campos do Word.**
   - O sumario usa `TOC` sobre os titulos: a Parte e titulo de nivel 1 e o
     capitulo, de nivel 2.
   - O indice usa uma marca `XE` em cada paragrafo onde o nome aparece, e um
     campo `INDEX` numa pagina propria no fim do livro.
   - O DOCX sai marcado para o Word atualizar os campos ao abrir.
   - O `bookfw pdf` com Word atualiza sumario e indice antes de exportar, na
     copia aberta somente leitura.
   - Liga pelas chaves `sumario: sim` e `indice: personagens` do `livro.yaml`.
4. **O indice sai do canon, e o nome e resolvido pela cena.**
   - Os termos sao o `nome` e os `apelidos` de cada ficha de personagem, so os
     que comecam com letra maiuscula.
   - Um apelido so vale dentro da cena que declara a ficha em `personagens:`.
     Isso resolve "Jose" (de Nazare, no cap. 2, e do Egito, no cap. 9) sem
     pergunta nenhuma.
   - O termo mais longo casa primeiro ("Maria Rita" antes de "Maria").
   - `indice_excluir` tira fichas do indice (o leitor, Jesus).
5. **Pagina final.** `docs/pagina-final.md`, quando existe, vira uma pagina
   propria depois do ultimo capitulo: titulo e texto alinhados a direita, no
   pe da pagina. O pe vem de uma secao do Word com alinhamento vertical
   inferior, e nao de espaco estimado, que erraria com o tamanho do texto.
   Cada linha do arquivo e uma linha na pagina, e o titulo entra no sumario.
   Pedido do autor em 2026-09-18: um "mini capitulo bonus" depois do desfecho.

## Consequences

- O PDF feito pelo Word sai com sumario e indice numerados.
- Pelo LibreOffice, os campos podem sair sem numero. O `bookfw pdf` avisa quando
  o conversor nao e o Word e a obra tem sumario ou indice.
- A referencia so e reconhecida com o livro nomeado. Por isso o gate da
  referencia sem livro vem junto: sem ele, a referencia incompleta sairia reta,
  sem estilo, e ninguem veria.
- Nome citado fora de cena, ou numa cena que nao declara a ficha, nao entra no
  indice. O efeito e o mesmo da regra que ja existe ("personagem citado em cena
  existe no canon").
- Obra sem nenhuma das chaves sai como antes, exceto a pagina em branco, que
  some para todas.

## Alternatives Considered

| Opcao | Por que nao |
|---|---|
| Marcar cada referencia a mao no markdown (`{ref ...}`) | 238 marcas numa obra so, e o texto fica poluido para quem escreve. |
| Calcular as paginas do sumario no proprio bookfw | So o programa que pagina sabe onde cada titulo cai; qualquer estimativa erra. |
| Sumario escrito sem numero de pagina | O autor pediu sumario de livro, e a versao de leitura ja sai em PDF pelo Word, que numera. |
| Indice por busca do nome em todo o livro, sem olhar a cena | Atribui a Jose de Nazare as paginas de Jose do Egito. |
