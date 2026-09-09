---
name: obra-os-oito-modelos
description: Obra "Os Oito Modelos da Reforma Tributária" em C:\dev\pessoal\book\os-oito-modelos — qual arquivo manda no canon quando dois se contradizem
metadata:
  type: project
---

Não-ficção técnica sobre a reforma tributária brasileira para arquitetos de
software. 23 capítulos, branch de trabalho `revisao-3`.

**A cadeia de autoridade do canon, quando dois arquivos brigam:**

1. `docs/canon/fontes.md` — conferência em fonte primária, datada. É o topo.
2. `docs/apendice.md` — a lista viva de pendências, em três categorias
   (resolvido / norma que delega / aberto de verdade). O próprio livro declara,
   no capítulo 4, que "a lista completa está no apêndice".
3. Os capítulos.

**Why:** os capítulos 4, 5 e 23 repetem a lista de pendências do apêndice em
prosa, e essas três cópias envelhecem sem aviso. Em 2026-09-08 as três ainda
carregavam a lista anterior à conferência primária de 2026-09-02 — quatro itens
já resolvidos declarados como pendentes, no livro cujo dispositivo inteiro é
classificar afirmação por camada. `docs/canon/cronologia.md` sofre do mesmo mal:
ela se declara "a espinha da Parte II que nenhum capítulo pode contrariar" e
estava contradizendo o cap. 6.

**How to apply:** toda passada de continuidade nesta obra confere caps. 4, 5, 23
e `cronologia.md` contra `apendice.md` e `fontes.md`, mesmo quando o pedido é
sobre outro assunto. É onde a contradição se acumula. Ver
[[obra-os-oito-modelos-restricoes]].
