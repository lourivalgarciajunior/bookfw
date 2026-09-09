---
name: projeto-os-oito-modelos
description: Obra "Os Oito Modelos da Reforma Tributária" em C:\dev\pessoal\book\os-oito-modelos — nao-ficcao tecnica, revisor tecnico externo no circuito, veredito da revisao 3 dado em 2026-09-08
metadata:
  type: project
---

Obra de nao-ficcao tecnica governada por bookfw, fora do repo do CLI:
`C:\dev\pessoal\book\os-oito-modelos`. 23 capitulos, alvo de 33 mil palavras,
terceira pessoa no presente. Autor: Lourival Garcia.

**Why:** o livro passa por um revisor tecnico externo (Andre Leal) que devolve
DOCX editado direto no corpo, sem controle de alteracoes. Cada rodada dele vira
um `docs/canon/plano-revisao-N.md` que registra o que foi aceito e o que foi
recusado com razao. Marca de revisor aplicada sem criterio ja introduziu erro de
gramatica no texto uma vez.

**How to apply:**
- Antes de qualquer leitura critica, ler `docs/canon/regras.md` — ele tem uma
  tabela de vocabulario invariante e uma lista "o que o livro nunca faz" que
  valem como contrato. Em particular: nunca "reter"/"retencao", nunca afirmar
  data de inicio do split payment, nunca citar declaracao de autoridade ou
  imprensa, nunca elogio de revisor no livro.
- As terminacoes de linha sao **mistas por arquivo** (uns LF, outros CRLF,
  cada um uniforme). Editar por bytes preservando a do arquivo.
- Nao ha hard-wrap de 79 uniforme no corpo herdado; wrap novo em 79.
- Fichas de lugar em `docs/canon/lugares/` estao **todas as sete vazias** por
  desenho — nao e pendencia, e o subsistema nunca foi usado. Ver o veredito da
  revisao 3.

**Veredito da revisao 3 (2026-09-08): volta.** Relatorio completo em
`docs/canon/veredito-revisao-3.md`, com doze itens em ordem de gravidade. As
decisoes editoriais que ja foram tomadas e nao devem ser relitigadas: na
contradicao "o livro cita artigo por numero e declara que nao cita", **a
declaracao cede, nao as citacoes**; o titulo do cap. 13 fica e quem muda e a
promessa P5 no plano diretor.
