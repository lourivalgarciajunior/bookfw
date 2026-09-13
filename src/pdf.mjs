/**
 * PDF das revisoes. Cada `<titulo> — revisao N.docx` de `manuscrito/` vira um
 * PDF de mesmo nome, ao lado dele.
 *
 * O PDF sai do DOCX, e nao do manuscrito, por dois motivos. O DOCX e a versao
 * de leitura aprovada — rosto, carimbo, Partes, ressalvas —, e um segundo
 * desenho de pagina divergiria dele na primeira correcao. E a revisao antiga so
 * existe como DOCX: gerar da prosa atual daria a revisao nova com o nome da
 * velha. Ver ADR-2026-09-13 do pdf.
 *
 * Nao ha motor que leia DOCX com fidelidade dentro do Node sem dependencia
 * pesada, entao a conversao e de um processador de texto do sistema:
 * LibreOffice, Word por automacao COM no Windows, ou um conversor proprio
 * chamado com `<entrada.docx> <saida.pdf>`. Nenhum caminho passa por shell.
 */
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Erro, acharProjeto, c, rel } from './core.mjs';
import { lerRevisoes } from './revisao.mjs';

/** O nome que o `docx` da a um arquivo de revisao. Trava do Word (`~$`) fica fora. */
const REVISAO_DOCX = /^(?!~\$)(.+) — revisao (\d+)\.docx$/;

/** Uma conversao nao pode travar o comando para sempre: Word parado em dialogo e o caso real. */
const TEMPO_POR_ARQUIVO = 180000;

const SOFFICE_PADRAO = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
];

/** Os DOCX de revisao da obra, do mais antigo ao mais novo, com o PDF que cada um gera. */
export function revisoesComDocx(raiz) {
  const dir = join(raiz, 'manuscrito');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((arquivo) => ({ arquivo, m: arquivo.normalize('NFC').match(REVISAO_DOCX) }))
    .filter((x) => x.m)
    .map(({ arquivo, m }) => ({
      numero: Number(m[2]),
      docx: join(dir, arquivo),
      pdf: join(dir, arquivo.replace(/\.docx$/, '.pdf')),
    }))
    .sort((a, b) => a.numero - b.numero);
}

function noPath(nome) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [nome], { encoding: 'utf8', windowsHide: true });
  return r.status === 0 ? r.stdout.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || null : null;
}

const sofficeInstalado = () => noPath('soffice') || SOFFICE_PADRAO.find((p) => existsSync(p)) || null;

/**
 * Quem converte. `pedido` vem de `--conversor` ou de `BOOKFW_PDF_CONVERSOR`;
 * sem pedido, LibreOffice se estiver instalado, depois Word no Windows.
 */
export function resolverConversor(pedido, plataforma = process.platform) {
  if (pedido === 'word') {
    if (plataforma !== 'win32') throw new Erro('O conversor word e a automacao COM do Microsoft Word, e so existe no Windows.');
    return { tipo: 'word', rotulo: 'word' };
  }
  if (pedido === 'soffice') {
    const exe = sofficeInstalado();
    if (!exe) throw new Erro('LibreOffice nao encontrado: `soffice` nao esta no PATH nem no caminho padrao de instalacao.');
    return { tipo: 'soffice', exe, rotulo: 'soffice' };
  }
  if (pedido) {
    const exe = resolve(pedido);
    if (!existsSync(exe)) {
      throw new Erro(`O conversor "${pedido}" nao existe. Use soffice, word ou o caminho de um executavel que receba <entrada.docx> <saida.pdf>.`);
    }
    return { tipo: 'proprio', exe, rotulo: pedido };
  }
  const exe = sofficeInstalado();
  if (exe) return { tipo: 'soffice', exe, rotulo: 'soffice' };
  if (plataforma === 'win32') return { tipo: 'word', rotulo: 'word' };
  throw new Erro([
    'Nenhum conversor de DOCX para PDF encontrado.',
    '       Instale o LibreOffice (o comando procura `soffice`), ou informe um conversor:',
    '         bookfw pdf --conversor /caminho/do/conversor   (recebe <entrada.docx> <saida.pdf>)',
  ].join('\n'));
}

/** PDF de verdade comeca com `%PDF-`. Arquivo vazio ou texto qualquer nao conta como gerado. */
export function pareceUmPdf(caminho) {
  if (!existsSync(caminho) || statSync(caminho).size < 5) return false;
  const fd = openSync(caminho, 'r');
  try {
    const cabeca = Buffer.alloc(5);
    readSync(fd, cabeca, 0, 5, 0);
    return cabeca.toString('latin1') === '%PDF-';
  } finally {
    closeSync(fd);
  }
}

const motivo = (r) => (r.error ? r.error.message : (r.stderr || r.stdout || `saiu com ${r.status}`).trim().split(/\r?\n/).pop());

function converterProprio(conv, lote) {
  const erros = new Map();
  const script = /\.(mjs|cjs|js)$/i.test(conv.exe);
  for (const { docx, pdf } of lote) {
    const r = spawnSync(script ? process.execPath : conv.exe, script ? [conv.exe, docx, pdf] : [docx, pdf],
      { encoding: 'utf8', timeout: TEMPO_POR_ARQUIVO, windowsHide: true });
    if (r.error || r.status !== 0) erros.set(pdf, motivo(r));
  }
  return erros;
}

function converterSoffice(conv, lote) {
  const erros = new Map();
  for (const { docx, pdf } of lote) {
    // O LibreOffice escolhe o nome da saida: a base do DOCX com .pdf, na pasta
    // de `--outdir`. E exatamente o nome que o `pdf` quer.
    const r = spawnSync(conv.exe, ['--headless', '--convert-to', 'pdf', '--outdir', dirname(docx), docx],
      { encoding: 'utf8', timeout: TEMPO_POR_ARQUIVO, windowsHide: true });
    if (r.error || r.status !== 0) erros.set(pdf, motivo(r));
  }
  return erros;
}

/**
 * Word por COM, um processo so para o lote. O lote vai por variavel de ambiente
 * em JSON e o script por `-EncodedCommand`: caminho com travessao, acento ou
 * aspas nunca e interpolado em linha de comando. O documento abre SOMENTE
 * LEITURA — o autor pode estar com ele aberto — e o Word fecha em `finally`.
 * A resposta volta por indice, porque o stdout do PowerShell 5.1 nao e UTF-8.
 */
const SCRIPT_WORD = [
  "$ErrorActionPreference = 'Stop'",
  '$lote = @($env:BOOKFW_PDF_LOTE | ConvertFrom-Json)',
  '$word = $null',
  'try {',
  '  $word = New-Object -ComObject Word.Application',
  '  $word.Visible = $false',
  '  $word.DisplayAlerts = 0',
  '  for ($i = 0; $i -lt $lote.Count; $i++) {',
  '    $doc = $null',
  '    try {',
  '      $doc = $word.Documents.Open($lote[$i].docx, $false, $true, $false)',
  '      $doc.ExportAsFixedFormat($lote[$i].pdf, 17)',
  "      Write-Output ('ok|' + $i)",
  '    } catch {',
  "      Write-Output ('erro|' + $i + '|' + $_.Exception.Message)",
  '    } finally {',
  '      if ($doc) { $doc.Close($false) }',
  '    }',
  '  }',
  '} finally {',
  '  if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }',
  '}',
].join('\n');

function converterWord(lote) {
  const r = spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', Buffer.from(SCRIPT_WORD, 'utf16le').toString('base64'),
  ], {
    encoding: 'utf8',
    timeout: TEMPO_POR_ARQUIVO * lote.length,
    windowsHide: true,
    env: { ...process.env, BOOKFW_PDF_LOTE: JSON.stringify(lote.map(({ docx, pdf }) => ({ docx, pdf }))) },
  });
  const erros = new Map();
  const respondidos = new Set();
  for (const linha of String(r.stdout || '').split(/\r?\n/)) {
    const [estado, indice, ...msg] = linha.trim().split('|');
    const item = lote[Number(indice)];
    if (!item || !['ok', 'erro'].includes(estado)) continue;
    respondidos.add(item.pdf);
    if (estado === 'erro') erros.set(item.pdf, msg.join('|') || 'o Word recusou o documento');
  }
  if (r.error || r.status !== 0) {
    const geral = r.error ? r.error.message : `o Word nao abriu (${motivo(r)}) — instale o LibreOffice ou confira o Microsoft Word`;
    for (const { pdf } of lote) if (!respondidos.has(pdf)) erros.set(pdf, geral);
  }
  return erros;
}

function converter(conv, lote) {
  if (conv.tipo === 'word') return converterWord(lote);
  if (conv.tipo === 'soffice') return converterSoffice(conv, lote);
  return converterProprio(conv, lote);
}

export async function pdf(args) {
  const raiz = acharProjeto();
  const todas = revisoesComDocx(raiz);
  if (!todas.length) {
    throw new Erro([
      'Nenhum DOCX de revisao em manuscrito/ — o PDF sai dele.',
      '       Registre a revisao e gere o arquivo antes:  bookfw revisao "o que mudou"  e  bookfw docx',
    ].join('\n'));
  }

  let alvo = todas;
  if (args.revisao !== undefined) {
    const n = Number(args.revisao);
    alvo = todas.filter((x) => x.numero === n);
    if (!alvo.length) {
      throw new Erro(`A revisao ${args.revisao} nao tem DOCX em manuscrito/. Com DOCX: ${todas.map((x) => x.numero).join(', ')}.`);
    }
  }

  const atualizado = (x) => existsSync(x.pdf) && statSync(x.pdf).mtimeMs >= statSync(x.docx).mtimeMs;
  const pendentes = args.forcar ? alvo : alvo.filter((x) => !atualizado(x));
  const pulados = alvo.length - pendentes.length;

  let conv = null;
  if (pendentes.length) {
    const pedido = typeof args.conversor === 'string' ? args.conversor : (process.env.BOOKFW_PDF_CONVERSOR || '');
    conv = resolverConversor(pedido);

    // PDF antigo que o conversor nao tocou continuaria "valido": so conta o
    // que nasceu ou mudou nesta execucao.
    const antes = new Map(pendentes.map((x) => [x.pdf, existsSync(x.pdf) ? statSync(x.pdf).mtimeMs : null]));
    const erros = converter(conv, pendentes);
    const falhas = [];
    for (const x of pendentes) {
      const novo = pareceUmPdf(x.pdf) && statSync(x.pdf).mtimeMs !== antes.get(x.pdf);
      if (novo) console.log(`${c.green('pdf gerado')}  ${rel(raiz, x.pdf)}`);
      else falhas.push(`${rel(raiz, x.docx)}${erros.get(x.pdf) ? ` — ${erros.get(x.pdf)}` : ' — o conversor nao produziu um PDF'}`);
    }
    if (falhas.length) {
      throw new Erro(`${falhas.length} PDF nao gerado por ${conv.rotulo}:\n${falhas.map((f) => `       ${f}`).join('\n')}`);
    }
  }

  console.log(c.dim(`  ${pendentes.length} convertido(s) | ${pulados} ja atualizado(s)${conv ? ` | conversor ${conv.rotulo}` : ''}`));

  // So a revisao corrente pode ganhar DOCX agora; a antiga sem arquivo fica sem PDF.
  if (args.revisao === undefined) {
    const comDocx = new Set(todas.map((x) => x.numero));
    const sem = lerRevisoes(raiz).map((r) => r.numero).filter((n) => !comDocx.has(n));
    if (sem.length) console.log(c.dim(`  revisao ${sem.join(', ')} registrada sem DOCX em manuscrito/ — sem PDF`));
  }
}
