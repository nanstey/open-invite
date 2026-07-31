import fs from 'node:fs'
import path from 'node:path'

/**
 * Reads Istanbul-format coverage (`coverage-final.json`, as emitted by the
 * vitest v8 provider with the `json` reporter) and derives per-function line
 * coverage.
 *
 * The CRAP score needs *method-level* coverage, so for each function we look at
 * the statements whose location falls inside the function's line range and
 * report the fraction that were executed at least once. Files absent from the
 * coverage report are treated as fully uncovered (0%) — that is the correct
 * signal for source that no test ever exercises.
 */

/** @typedef {{ covered: boolean, hasData: boolean, coverage: number }} FunctionCoverage */

/**
 * @param {string} coveragePath absolute or cwd-relative path to coverage-final.json
 * @returns {{ ok: boolean, data: Record<string, any>, path: string, error?: string }}
 */
export function loadCoverage(coveragePath) {
  const resolved = path.resolve(coveragePath)
  if (!fs.existsSync(resolved)) {
    return { ok: false, data: {}, path: resolved, error: 'not found' }
  }
  try {
    const raw = fs.readFileSync(resolved, 'utf8')
    return { ok: true, data: JSON.parse(raw), path: resolved }
  } catch (err) {
    return { ok: false, data: {}, path: resolved, error: String(err?.message ? err.message : err) }
  }
}

/**
 * Find the coverage entry for a source file. Istanbul keys entries by absolute
 * path; we match on the resolved absolute path, falling back to a suffix match
 * so the tool is robust to differing path roots (CI vs. local checkout).
 *
 * @param {Record<string, any>} coverageData
 * @param {string} filePath
 */
export function findFileCoverage(coverageData, filePath) {
  const absolute = path.resolve(filePath)
  if (coverageData[absolute]) return coverageData[absolute]

  const toPosix = (p) => p.split(path.sep).join('/')
  const absNorm = toPosix(absolute)

  // The tail we try to match by is the path as the caller gave it (relative
  // paths like `services/eventService.ts` are ideal); if an absolute path was
  // passed we fall back to its basename. Matching on a path suffix makes the
  // lookup robust when the coverage report was produced under a different
  // checkout root (e.g. CI) than the one the tool runs in.
  const rawTail = toPosix(path.isAbsolute(filePath) ? path.basename(filePath) : filePath).replace(
    /^\.\//,
    '',
  )

  const endsWithSegments = (full, tail) => full === tail || full.endsWith(`/${tail}`)

  let best = null
  for (const key of Object.keys(coverageData)) {
    const keyNorm = toPosix(path.resolve(key))
    if (keyNorm === absNorm) return coverageData[key]
    if (endsWithSegments(keyNorm, rawTail)) {
      // Prefer the longest key so a more specific path wins over a short tail.
      if (!best || keyNorm.length > best.len) best = { entry: coverageData[key], len: keyNorm.length }
    }
  }
  return best ? best.entry : null
}

/**
 * Compute line/statement coverage for a single function, defined by its 1-based
 * start and end lines, from one file's Istanbul coverage entry.
 *
 * @param {any} fileCoverage Istanbul entry ({ statementMap, s, fnMap, f, ... })
 * @param {number} startLine 1-based
 * @param {number} endLine 1-based
 * @returns {FunctionCoverage}
 */
export function functionCoverage(fileCoverage, startLine, endLine) {
  if (!fileCoverage) return { covered: false, hasData: false, coverage: 0 }

  const statementMap = fileCoverage.statementMap ?? {}
  const s = fileCoverage.s ?? {}

  let total = 0
  let covered = 0
  for (const id of Object.keys(statementMap)) {
    const loc = statementMap[id]
    const line = loc?.start ? loc.start.line : undefined
    if (line === undefined) continue
    if (line >= startLine && line <= endLine) {
      total += 1
      if ((s[id] ?? 0) > 0) covered += 1
    }
  }

  if (total === 0) {
    // No statements attributed to the range (e.g. a one-line arrow whose body
    // is a single expression counted at the outer scope). Fall back to whether
    // any function declared on the start line was entered.
    const entered = functionEntered(fileCoverage, startLine)
    if (entered === null) return { covered: false, hasData: false, coverage: 0 }
    return { covered: entered, hasData: true, coverage: entered ? 100 : 0 }
  }

  return { covered: covered > 0, hasData: true, coverage: (covered / total) * 100 }
}

/**
 * Whether any function whose declaration begins on `startLine` was entered at
 * least once. Returns null when there is no matching fnMap entry.
 */
function functionEntered(fileCoverage, startLine) {
  const fnMap = fileCoverage.fnMap ?? {}
  const f = fileCoverage.f ?? {}
  let found = null
  for (const id of Object.keys(fnMap)) {
    const decl = fnMap[id].decl ?? fnMap[id].loc
    const line = decl?.start ? decl.start.line : undefined
    if (line === startLine) {
      found = (found ?? false) || (f[id] ?? 0) > 0
    }
  }
  return found
}
