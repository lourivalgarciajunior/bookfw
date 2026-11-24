---
name: reference-fontes-tecnicas-folha-cnab
description: Como conferir saida de terminal, CNAB 240, trackfw, PowerShell e NTFS em obra tecnica (Verde nao e prova) — o que roda no rascunho, o que o hook bloqueia, fontes que abrem
metadata:
  type: reference
---

Levantado em 2026-11-24, revisao de verossimilhanca de `verde-nao-e-prova`.

## CNAB 240 (FEBRABAN)
- Guia Sicoob abre no WebFetch como PDF binario; extrair com `python -I -c "import pypdf"` (pdftoppm/poppler NAO esta instalado):
  `sicoob.com.br/documents/20128/1635942/Guia+de+importacao+de+arquivos+CNAB+240+Piloto.pdf`
- Segmento A: pos 14 = codigo do segmento; 94-101 = data do pagamento DDMMAAAA; 231-240 = ocorrencias de retorno.
  `BD` = inclusao efetuada com sucesso, agendada. Retorno CNAB nao tem texto literal ("AGENDADO").
- Sicredi e Banrisul: 403/404 no fetch.

## Rodar de verdade no scratchpad
- Hook do trackfw bloqueia `git add -A`, `git commit` cru e `git checkout -b` ate em pasta de rascunho fora do repo.
  Caminho que funciona: `trackfw branch new feat/<slug> --from HEAD` + `git add <caminho>` + `trackfw commit -m`.
- trackfw 11.8.1: `validate` manda `Error: N violation(s) found` para stderr e o resto para stdout; com avisos e sem
  violacao a ultima linha e `N warning(s)`; `req new` imprime 3 linhas (req, roadmap criado, link).
- PowerShell 5.1 roda por `powershell.exe -NoProfile -Command '...'` a partir do Git Bash; mensagem de `&&` sai em pt-BR.
- Python 3.12.4 + pytest 9.1.1 instalados; venv sem `tzdata` reproduz `ZoneInfoNotFoundError` no Windows.
- `date -d` do Git Bash ignora `TZ=America/Sao_Paulo`; para fuso use Python `zoneinfo`.
- Transicoes de horario de verao: varrer hora a hora com zoneinfo (fim aparece como sabado 23h padrao = domingo 0h).

Ver [[reference-fontes-verificacao]].
