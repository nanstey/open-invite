#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeFunctionComplexities } from './lib/complexity.mjs'
import { findFileCoverage, functionCoverage, loadCoverage } from './lib/coverage.mjs'
import { DEFAULT_THRESHOLD, scoreFunctions } from './lib/crap.mjs'

const HELP = `crap — Change Risk Anti-Patterns report for changed files

USAGE
  node automation/crap/crap.mjs [options] <file|dir|glob> [...more]

  Reports the CRAP score of each function in the given files. CRAP combines
  cyclomatic complexity with test coverage:

      CRAP = comp^2 * (1 - coverage)^3 + comp

  High scores mark code that is both complex and under-tested — the code most
  risky to change and the best candidate for refactoring or added tests.

OPTIONS
  --coverage <path>   Path to Istanbul coverage-final.json
                      (default: coverage/coverage-final.json)
  --run-coverage      Run \`pnpm test --coverage\` first to (re)generate coverage.
  --threshold <n>     "Crappy" threshold (default: ${DEFAULT_THRESHOLD}).
  --all               Show every function, not only those over the threshold.
  --sort <crap|complexity|coverage>  Sort order (default: crap, descending).
  --json              Emit machine-readable JSON instead of a table.
  --fail-over <n>     Exit with code 1 if any function's CRAP exceeds n.
                      Use for CI / agent gating. Defaults to the threshold when
                      given as a bare flag.
  --no-color          Disable ANSI colors.
  -h, --help          Show this help.

EXAMPLES
  # Score the files an agent just modified (coverage must already exist):
  node automation/crap/crap.mjs services/eventService.ts domains/events/utils

  # Regenerate coverage, then score and fail if anything is crappy:
  node automation/crap/crap.mjs --run-coverage --fail-over services/*.ts

  # Whole-repo JSON report:
  node automation/crap/crap.mjs --all --json services lib domains pages
`

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])

function isTestFile(file) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || /(^|\/)__tests__\//.test(file)
}

function isSourceFile(file) {
  const ext = path.extname(file)
  if (!SOURCE_EXTENSIONS.has(ext)) return false
  return !isTestFile(file)
}

function collectFromDir(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectFromDir(full, out)
    else if (entry.isFile() && isSourceFile(full)) out.add(path.resolve(full))
  }
}

function expandTargets(patterns) {
  const files = new Set()
  for (const pattern of patterns) {
    const direct = path.resolve(pattern)
    if (fs.existsSync(direct)) {
      const stat = fs.statSync(direct)
      if (stat.isDirectory()) collectFromDir(direct, files)
      else if (isSourceFile(direct)) files.add(direct)
      continue
    }
    // Fall back to glob expansion for patterns like `services/*.ts`.
    let matched = []
    try {
      matched = fs.globSync ? fs.globSync(pattern) : []
    } catch {
      matched = []
    }
    for (const m of matched) {
      const resolved = path.resolve(m)
      if (!fs.existsSync(resolved)) continue
      if (fs.statSync(resolved).isDirectory()) collectFromDir(resolved, files)
      else if (isSourceFile(resolved)) files.add(resolved)
    }
  }
  return [...files].sort()
}

function parseArgs(argv) {
  const opts = {
    coverage: 'coverage/coverage-final.json',
    runCoverage: false,
    threshold: DEFAULT_THRESHOLD,
    all: false,
    sort: 'crap',
    json: false,
    failOver: null,
    color: process.stdout.isTTY,
    targets: [],
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--':
        // Bare separator (e.g. from `pnpm crap -- ...`); ignore.
        break
      case '-h':
      case '--help':
        opts.help = true
        break
      case '--coverage':
        opts.coverage = argv[++i]
        break
      case '--run-coverage':
        opts.runCoverage = true
        break
      case '--threshold':
        opts.threshold = Number(argv[++i])
        break
      case '--all':
        opts.all = true
        break
      case '--sort':
        opts.sort = argv[++i]
        break
      case '--json':
        opts.json = true
        break
      case '--no-color':
        opts.color = false
        break
      case '--fail-over': {
        const next = argv[i + 1]
        if (next !== undefined && /^-?\d+(\.\d+)?$/.test(next)) {
          opts.failOver = Number(next)
          i++
        } else {
          opts.failOver = opts.threshold
        }
        break
      }
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`)
          process.exit(2)
        }
        opts.targets.push(arg)
    }
  }
  return opts
}

function runCoverage() {
  console.error('Running `pnpm test --coverage` to generate coverage data…')
  const result = spawnSync('pnpm', ['test', '--coverage'], { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error('Coverage run did not complete successfully; scores may be incomplete.')
  }
}

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  bold: '\x1b[1m',
}
function paint(color, text, enabled) {
  return enabled ? `${COLORS[color]}${text}${COLORS.reset}` : text
}

function severityColor(row, threshold) {
  if (row.crap > threshold) return 'red'
  if (row.crap > threshold * 0.66) return 'yellow'
  return 'green'
}

function formatTable(rows, opts, coverageInfo) {
  const enabled = opts.color
  const lines = []
  const cwd = process.cwd()

  const grouped = new Map()
  for (const row of rows) {
    if (!grouped.has(row.file)) grouped.set(row.file, [])
    grouped.get(row.file).push(row)
  }

  for (const [file, fnRows] of grouped) {
    const rel = path.relative(cwd, file) || file
    lines.push(paint('bold', rel, enabled))
    const header = `  ${'CRAP'.padStart(8)}  ${'Cx'.padStart(4)}  ${'Cov%'.padStart(6)}  Function`
    lines.push(paint('dim', header, enabled))
    for (const row of fnRows) {
      const color = severityColor(row, opts.threshold)
      const crap = row.crap.toFixed(2).padStart(8)
      const cx = String(row.complexity).padStart(4)
      const cov = row.hasCoverageData ? `${row.coverage.toFixed(0)}%`.padStart(6) : 'n/a'.padStart(6)
      const flag = row.over ? paint('red', ' ⚠', enabled) : ''
      const name = `${row.name} ${paint('dim', `(${row.kind} @${row.startLine})`, enabled)}`
      lines.push(`  ${paint(color, crap, enabled)}  ${cx}  ${cov}  ${name}${flag}`)
    }
    lines.push('')
  }

  const over = rows.filter((r) => r.over)
  lines.push(
    paint(
      'bold',
      `${rows.length} function(s) scored — ${over.length} over threshold (${opts.threshold}).`,
      enabled,
    ),
  )
  if (!coverageInfo.ok) {
    lines.push(
      paint(
        'yellow',
        `⚠ No coverage data at ${path.relative(cwd, coverageInfo.path) || coverageInfo.path} — ` +
          `every function is scored as 0% covered. Run with --run-coverage or \`pnpm test --coverage\`.`,
        enabled,
      ),
    )
  }
  return lines.join('\n')
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help || opts.targets.length === 0) {
    console.log(HELP)
    process.exit(opts.help ? 0 : 2)
  }

  if (opts.runCoverage) runCoverage()

  const coverageInfo = loadCoverage(opts.coverage)

  const files = expandTargets(opts.targets)
  if (files.length === 0) {
    console.error('No matching source files found for the given targets.')
    process.exit(2)
  }

  const allRows = []
  for (const file of files) {
    let sourceText
    try {
      sourceText = fs.readFileSync(file, 'utf8')
    } catch (err) {
      console.error(`Skipping ${file}: ${err.message}`)
      continue
    }
    const functions = computeFunctionComplexities(sourceText, file)
    if (functions.length === 0) continue

    const fileCoverage = coverageInfo.ok ? findFileCoverage(coverageInfo.data, file) : null
    const coverageFor = (startLine, endLine) => functionCoverage(fileCoverage, startLine, endLine)

    const scored = scoreFunctions(functions, coverageFor, { threshold: opts.threshold })
    for (const row of scored) allRows.push({ ...row, file })
  }

  const sortKey = {
    crap: (a, b) => b.crap - a.crap,
    complexity: (a, b) => b.complexity - a.complexity,
    coverage: (a, b) => a.coverage - b.coverage,
  }[opts.sort] ?? ((a, b) => b.crap - a.crap)
  allRows.sort(sortKey)

  const visibleRows = opts.all ? allRows : allRows.filter((r) => r.over)

  if (opts.json) {
    const cwd = process.cwd()
    const output = {
      threshold: opts.threshold,
      coverage: { ok: coverageInfo.ok, path: coverageInfo.path, error: coverageInfo.error },
      summary: {
        functions: allRows.length,
        overThreshold: allRows.filter((r) => r.over).length,
        maxCrap: allRows.reduce((m, r) => Math.max(m, r.crap), 0),
      },
      functions: (opts.all ? allRows : visibleRows).map((r) => ({
        file: path.relative(cwd, r.file) || r.file,
        name: r.name,
        kind: r.kind,
        startLine: r.startLine,
        endLine: r.endLine,
        complexity: r.complexity,
        coverage: Number(r.coverage.toFixed(2)),
        hasCoverageData: r.hasCoverageData,
        crap: Number(r.crap.toFixed(2)),
        over: r.over,
        coverageToPass: r.coverageToPass === null ? null : Number(r.coverageToPass.toFixed(2)),
      })),
    }
    console.log(JSON.stringify(output, null, 2))
  } else {
    if (visibleRows.length === 0) {
      console.log(
        opts.color
          ? `${COLORS.green}✓ No functions over the CRAP threshold (${opts.threshold}).${COLORS.reset}`
          : `✓ No functions over the CRAP threshold (${opts.threshold}).`,
      )
      if (!coverageInfo.ok) {
        console.log(
          `⚠ Note: no coverage data found at ${opts.coverage}; scores assume 0% coverage.`,
        )
      }
    } else {
      console.log(formatTable(visibleRows, opts, coverageInfo))
    }
  }

  if (opts.failOver !== null) {
    const worst = allRows.reduce((m, r) => Math.max(m, r.crap), 0)
    if (worst > opts.failOver) {
      process.exitCode = 1
    }
  }
}

// Only run when invoked directly (not when imported by tests).
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  main()
}
