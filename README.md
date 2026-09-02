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
bookfw sum --materializar          # a tabela do sumario vira kanban
bookfw canon new personagem "Marta" --apelidos "Dona Marta"
bookfw cena add 1 --local Cozinha --objetivo "atender antes que desliguem"
bookfw cap move 1 esboco
bookfw cap move 2..5 escrita        # lista e faixa tambem valem
bookfw cap renumber 5 9             # arquivo e frontmatter juntos
bookfw cap retitle 9 "O nome novo"
bookfw brief 1 --cena 1.1          # o pacote que o escritor recebe
bookfw validate
bookfw cap move 1 revisao
bookfw cap move 1 pronto
bookfw build
bookfw docx                        # a versao que vai para a mao do leitor
bookfw capa brief                  # o briefing que vai para o gerador de imagem
bookfw capa --formato ebook,impressao
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
capa/                           briefing, arte do autor e a capa composta
manuscrito/                     saida do build e do docx
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

**Onde a prosa de uma cena começa e termina:** do fim do contrato dela até o
contrato seguinte. Cabeçalho não interrompe prosa — ele é estrutura de trabalho
e não entra no manuscrito. Nota, dúvida e pendência vão em comentário HTML
(`<!-- ... -->`), que sai da contagem e do manuscrito.

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

Com mais de um plano diretor em `docs/plano-diretor/`, **vale o mais recente** —
e o gate diz qual, para a escolha não ser silenciosa.

O gate também **lê a tabela do sumário e compara com o kanban**, nos dois
sentidos: capítulo escrito que não está no outline, capítulo planejado que nunca
foi materializado, título que divergiu. São avisos — escrever é iterativo, e
quem decide qual lado corrigir é o autor.

Não há checagem de buraco na numeração, de propósito: buraco só significa algo
contra o plano, e essa comparação já é feita. Numeração com vão declarado no
sumário passa limpa.

Quando reprova, o gate **dá o comando que resolve**: personagem sem ficha vira
`bookfw canon new personagem "X"`, capítulo sem contrato vira `bookfw cena add 3`.
Regra da casa: o gate não cobra artefato que o CLI não saiba criar.

## Do sumário para o kanban

`bookfw sum --materializar` lê a tabela do sumário e cria os capítulos em
`backlog/`. É idempotente — capítulo que já existe é pulado —, então acrescentar
linha ao sumário e rodar de novo cria só o que falta. `--simular` mostra antes.

A tabela é lida **por nome de coluna**, não por posição: obras diferentes trocam
a coluna final. Linha que não vira capítulo — um vão como `| 04–06 | a escrever |`
— é reportada como ignorada, com o motivo. Nada some calado.

## O manuscrito

`bookfw build` costura a partir de `revisao` (ou do que `--desde` mandar) e diz
quantos capítulos de quantos entraram. Capítulo com prosa que ficou de fora da
escada — em `bloqueado` — é **nomeado na saída**: buraco no manuscrito não sai
calado.

## A versão de leitura

`bookfw docx` produz o arquivo que vai para a mão de quem lê: miolo A5,
serifado, rosto, rodapé numerado, sem nenhuma marcação de trabalho. Lê o mesmo
corte que o `build` — `--desde` vale igual, e o padrão é o mesmo — direto do
kanban, então não depende de o `build` ter rodado antes.

Duas páginas editoriais entram se existirem, uma página por seção `## `:
`docs/front-matter.md` antes do primeiro capítulo, `docs/apendice.md` depois do
último. O texto é da obra — aviso de conteúdo, nota de versão, glossário,
fontes.

**Capítulo não confirmado sai carimbado.** Se o frontmatter tem `verificar:`
preenchido — na mesma linha ou em lista abaixo —, o capítulo abre com uma
ressalva em itálico, para que suposição não passe por apuração. O texto do
carimbo sai de `ressalva_verificar` no `livro.yaml`; sem ele, o padrão é
*Fatos ainda nao verificados pelo autor*. Memória e livro técnico não ressalvam
com as mesmas palavras:

```yaml
ressalva_verificar: Afirmacoes a conferir em fonte primaria antes de publicar
```

`origem:` contendo `ESPECIME` carimba mais forte, e tem precedência. A saída
diz **quantos capítulos foram carimbados** — carimbo que some vira número, não
descoberta na leitura do arquivo pronto.

O pacote `docx` é dependência **opcional**: o resto do bookfw não tem
dependência nenhuma, e quem só governa texto não precisa carregar um gerador de
OOXML para rodar `status` ou `validate`. Sem ele, só este comando falha, e a
mensagem diz o que instalar.

## A capa

O fluxo termina no livro publicado, e a capa é o único artefato que precisa de
uma coisa que o CLI não tem: arte rasterizada. A resposta é a mesma que o `brief`
deu para a escrita — **capa é um problema de briefing antes de ser um problema
de desenho**.

```bash
bookfw capa brief     # capa/briefing.md, derivado da obra
# gere a arte, salve como capa/arte.png
bookfw capa --formato ebook,impressao,miniatura
```

`capa brief` monta o pacote a partir do que já está governado: premissa, tema,
promessa ao leitor, promessas numeradas, lugares do canon, léxico medido pelo
`style` e a seção "Não vai ter" do plano diretor. **Cada bloco aponta a origem**
— linha errada se corrige na fonte, não no briefing, senão a próxima geração
reescreve o conserto. Sai com prompt pronto para colar e com o que **não** deve
aparecer na arte.

`capa` compõe. Com `capa/arte.png` no lugar, a arte entra **em data URI** —
nunca por caminho relativo, que abriria na sua máquina e quebraria na da
gráfica. Sem arte, a capa sai **tipográfica**, com paleta derivada do gênero:
capa legítima, e o que desbloqueia o livro pronto sem ilustração.
`--tipografica` força essa forma mesmo havendo arte.

| Formato | O que é |
|---|---|
| `ebook` | 1600×2560, o padrão de Kindle, Kobo e Google Play |
| `impressao` | capa espalhada 6×9 com verso, lombada e sangria |
| `miniatura` | para mandar junto com o DOCX a quem vai ler e opinar |
| `svg` | só o vetor, sem rasterizar |

**O SVG sai em todo formato**, não só no ebook: é a fonte da verdade, versiona
em texto no git, e a capa de impressão é justamente a que mais precisa de ajuste
fino. A lombada é calculada da contagem de palavras, e o comando declara quantas
páginas assumiu. A quarta capa recebe a promessa ao leitor do plano diretor —
capa espalhada com verso em branco não é entregável.

Sobre a arte entra um véu escuro, para o título ler. Ele é calibrado para foto
clara e **apaga arte que já nasce escura** — `--escurecer 0.05` quase não
escurece, `--escurecer 0` não põe véu nenhum. A saída diz quanto aplicou e de onde.

Grave a calibragem em `capa_escurecer`, no `livro.yaml`: ela é **da obra**, não do
comando. É o que torna as capas compostas descartáveis — com a chave no lugar,
`bookfw capa` sem flag nenhum regenera a mesma capa, e os arquivos gerados podem
ficar no `.gitignore` ao lado do DOCX.

O PNG precisa de `@resvg/resvg-js`, dependência **opcional**. Sem ele o comando
entrega o SVG, avisa e diz o que instalar.

> A largura do título é estimada por média de glifo, não medida na fonte real.
> Título no limite pode precisar de ajuste manual — o comando avisa quando
> quebrou em mais de uma linha, em vez de esconder a estimativa.

## Style card

`bookfw style` mede sobre `samples/`: frase mediana, desvio, proporção de frase
curta e longa, parágrafo mediano, proporção de diálogo, perguntas e primeira
pessoa por mil palavras.

O léxico sai em **duas listas**, porque são coisas diferentes. *Léxico da obra* —
substantivo, adjetivo e verbo recorrentes, descontadas as palavras funcionais —
é do que o livro é feito, e é o que o briefing de capa consome. *Tiques de voz* —
hedge, intensificador e advérbio em `-mente` — vêm **com taxa por mil palavras**,
porque `apenas` e `talvez` não são ruído: são a hesitação característica do autor.

> Frequência bruta em português devolve palavra funcional por construção. A lista
> antiga entregava dez funcionais em doze. Ampliar a lista de exclusão atacaria o
> sintoma; a medida é que estava errada.

Amostra abaixo de 1000 palavras sai com ressalva no próprio bloco. Métrica sobre
amostra insuficiente é pior que métrica ausente, porque parece medida. O bloco gerado não se edita à mão.

O julgamento — o que o autor faz de propósito, o que ele nunca faz — é escrito por cima, e o card inteiro entra em todo briefing de cena. É o que faz a primeira versão sair na voz do autor.

## Plugin do Claude Code

As skills, os subagents e os comandos vivem em [`plugin-skill`](https://github.com/lourivalgarciajunior/plugin-skill), no plugin `bookfw`:

```bash
claude plugin marketplace update indieexpert
claude plugin install bookfw@indieexpert
```

Os subagents são as Musas: Calíope (plano diretor), Melpômene (enredo e tensão), Erato (personagens), Tália (diálogo), Euterpe (voz), Clio (canon e continuidade), Urânia (pesquisa), Aristarco (revisão editorial) e Hermes (manuscrito e publicação).

Comandos: `/bookfw:init`, `:style`, `:dec`, `:pd`, `:sum`, `:draft`, `:canon`, `:review`, `:move`, `:status`, `:validate`, `:build`.

## Testes e lint

```bash
npm run check
```

`npm test` é o smoke: cria projetos descartáveis, percorre o fluxo inteiro e
confere que o gate reprova o que tem de reprovar. `npm run lint` é o gate do
próprio repositório — template que nenhum comando lê, placeholder que nada
preenche, comando fora da ajuda ou do README, versão sem entrada no changelog,
arquivo que o npm não empacota, módulo órfão em `src/`. Cada regra nasceu de
alguma coisa que já quebrou.

O CI roda os dois em Linux e Windows. O autor escreve no Windows, e é lá que
aparecem os bugs de CRLF e de nome de arquivo.
