# bookfw

Governança para escrever livros. Mesmo princípio do [trackfw](https://github.com/lourivalgarciajunior/trackfw-main) aplicado à obra longa: nada de prosa sem plano, nada de capítulo sem contrato, nada de promessa sem pagamento.

```
DEC  →  PD  →  SUM  →  backlog → esboco → escrita → revisao → pronto  →  manuscrito
```

## O problema que ele resolve

Escrever texto longo trava por três motivos, sempre os mesmos:

1. **Não se sabe para onde o texto vai** — o desfecho não foi escrito antes do capítulo 1.
2. **Cada sessão começa do zero** — releitura do que já existe consome a energia que era da escrita.
3. **O texto se contradiz** — o capítulo 20 esquece o que o capítulo 3 afirmou.

O bookfw ataca os três com artefatos, não com força de vontade: **plano diretor** com desfecho e promessas numeradas, **briefing de cena** que entrega o contexto mínimo e suficiente, e **canon** que registra todo fato afirmado.

Ninguém escreve um livro. Escreve-se uma cena por vez, com contrato declarado e contexto fechado.

## Instalação

Requer Node 22 ou superior. Sem dependências.

```bash
npm install -g bookfw
```

Ou, do repositório:

```bash
npm link
```

## Uso

```bash
bookfw init "Titulo da obra" --genero suspense --autor "Seu Nome"
bookfw style                       # mede sua voz sobre samples/
bookfw dec "Narracao em primeira pessoa no passado"
bookfw pd                          # plano diretor
bookfw sum                         # sumario derivado do plano diretor
bookfw cap new "Titulo do capitulo" --ato 1
bookfw cap move 1 esboco
bookfw cap move 1 escrita
bookfw brief 1 --cena 1.1          # o pacote que o escritor recebe
bookfw validate
bookfw cap move 1 revisao
bookfw cap move 1 pronto
bookfw build
```

Consulta: `bookfw status`, `bookfw context` (dump da governança formatado para LLM).

## Anatomia de um projeto

```
livro.yaml                      contrato invariante da obra
docs/dec/                       decisoes de obra (pessoa narrativa, tempo verbal, final)
docs/plano-diretor/             premissa, promessas numeradas, arco, desfecho
docs/sumario/                   capitulos com funcao no arco
docs/canon/personagens/         fichas
docs/canon/lugares/             fichas
docs/canon/cronologia.md        linha do tempo canonica
docs/canon/regras.md            o que e verdade nesta obra
docs/style-card.md              a voz do autor, medida e julgada
samples/                        textos ja escritos pelo autor
capitulos/<estado>/             o kanban
manuscrito/                     saida do build
```

## Contrato de cena

Cada capítulo carrega blocos de contrato, e a prosa vai logo abaixo de cada um:

````markdown
```cena
id: 6.1
local: UTI do hospital de referencia
tempo: 26 de fevereiro de 2023, comeco da manha
foco: Lourival
personagens: [Lourival]
objetivo: descobrir, sozinho, se esta melhorando
conflito: so tem os numeros do monitor e ninguem para traduzir
virada: percebe que passou a noite sem nenhum ajuste de emergencia
saida: entende que estabilidade nao e vitoria, e ausencia de piora
promessas: [P2]
paga: []
palavras_alvo: 1100
```
````

`objetivo`, `conflito` e `virada` são obrigatórios — cena sem os três é resumo, e o gate reprova.

São os mesmos campos que um roteiro pede depois. Adaptar a obra para cinema lê daqui, sem reler o livro.

## A guarda do pronto

Capitulo em `pronto` nao sai de la sem `--forcar`:

```bash
bookfw cap move 3 escrita             # recusa, e diz o porque
bookfw cap move 3 escrita --forcar    # reabre
```

Existe por um motivo pratico: apontar o fluxo de escrita para um capitulo
fechado o devolvia para a bancada em silencio. Todo o resto do kanban continua
livre — inclusive o `revisao -> escrita`, que e o "volta" de rotina da revisao.

## O gate

`bookfw validate` cobra:

- plano diretor e sumário existentes
- cena com objetivo, conflito e virada
- personagem de cena com ficha no canon
- foco declarado que existe no canon
- estado do arquivo coerente com o frontmatter
- limite de capítulos em escrita ao mesmo tempo
- numeração sem duplicata
- capítulo em revisão ou pronto com prosa de verdade, dentro da faixa de palavras
- **toda promessa do plano diretor plantada e paga**

## Style card

`bookfw style` mede sobre `samples/`: frase mediana, desvio, proporção de frase curta e longa, parágrafo mediano, proporção de diálogo, perguntas e primeira pessoa por mil palavras, léxico marcante. O bloco gerado não se edita à mão.

O julgamento — o que o autor faz de propósito, o que ele nunca faz — é escrito por cima, e o card inteiro entra em todo briefing de cena. É o que faz a primeira versão sair na voz do autor.

## Plugin do Claude Code

As skills, os subagents e os comandos vivem em [`plugin-skill`](https://github.com/lourivalgarciajunior/plugin-skill), no plugin `bookfw`:

```bash
claude plugin marketplace update indieexpert
claude plugin install bookfw@indieexpert
```

Os subagents são as Musas: Calíope (plano diretor), Melpômene (enredo e tensão), Erato (personagens), Tália (diálogo), Euterpe (voz), Clio (canon e continuidade), Urânia (pesquisa), Aristarco (revisão editorial) e Hermes (manuscrito e publicação).

Comandos: `/bookfw:init`, `:style`, `:dec`, `:pd`, `:sum`, `:draft`, `:canon`, `:review`, `:move`, `:status`, `:validate`, `:build`.

## Testes

```bash
npm test
```
