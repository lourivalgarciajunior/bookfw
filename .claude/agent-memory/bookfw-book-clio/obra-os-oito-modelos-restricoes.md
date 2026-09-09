---
name: obra-os-oito-modelos-restricoes
description: Restrições duras ao editar a obra os-oito-modelos — data do split payment, imprensa, docs/dec, terminação de linha e hard-wrap
metadata:
  type: feedback
---

Ao editar `C:\dev\pessoal\book\os-oito-modelos`:

- **Nunca afirmar data de início do split payment**, e nunca citar declaração de
  autoridade, entrevista ou imprensa. Decisão do autor, firme.
- **Não tocar em `docs/dec/`** — é registro histórico; renumerar ou reescrever
  ali falsifica o que foi decidido e quando.
- **Preservar a terminação de linha arquivo a arquivo.** Em 2026-09-08, no
  branch `revisao-4`, todo o repositório está **uniformemente CRLF** —
  capítulos, canon, apêndice, sem um único LF solto e sem `.gitattributes`.
  Isso mudou: até `revisao-3` o repo era misto (`cap-04`, `cap-05`, `cap-13`,
  `apendice.md` e o sumário eram LF). Confira antes de editar em vez de
  assumir, e grave com `newline=''` em Python para não converter nada.
- **Hard-wrap de prosa em 79–80 colunas de caractere.** Medir com Python, não
  com `awk length()`: em git-bash o awk conta bytes, e cada acento vira 2 —
  gera dezenas de falsos positivos.

**Why:** o corte de conteúdo é declarado no livro e virou DEC invariante; o que
está fora dele envenena a régua de camadas que o livro inteiro usa. As
terminações mistas e a contagem por bytes já produziram ruído de diff que não é
mudança de conteúdo.

**How to apply:** vale para qualquer edição, inclusive de canon e apêndice.
Rodar `bookfw validate` ao fechar. Ver [[obra-os-oito-modelos]].
