/**
 * CRAP — Change Risk Anti-Patterns.
 *
 *   CRAP(m) = comp(m)^2 * (1 - cov(m))^3 + comp(m)
 *
 * where `comp(m)` is the cyclomatic complexity of method `m` and `cov(m)` is its
 * test coverage expressed as a fraction in [0, 1]. A method that is both complex
 * and poorly covered is expensive and dangerous to change; that is precisely
 * what a high CRAP score flags.
 *
 * The conventional "crappy" threshold is 30. At 0% coverage the score reduces to
 * `comp^2 + comp`, so any method with complexity >= 6 that has no test crosses
 * the line, and a fully-covered method is always just `comp` (never crappy).
 */

export const DEFAULT_THRESHOLD = 30

/**
 * @param {number} complexity cyclomatic complexity (>= 1)
 * @param {number} coveragePercent 0..100
 * @returns {number}
 */
export function crapScore(complexity, coveragePercent) {
  const cov = Math.max(0, Math.min(100, coveragePercent)) / 100
  const uncovered = 1 - cov
  return complexity * complexity * uncovered * uncovered * uncovered + complexity
}

/**
 * The minimum coverage (as a percentage) at which a method of the given
 * complexity drops to or below the threshold. Returns null when complexity
 * alone already keeps it under the threshold (no coverage can help / none
 * needed) — i.e. when `comp <= threshold` is unreachable by coverage because
 * `comp` itself exceeds the threshold.
 *
 * Solving comp^2 * (1-cov)^3 + comp = threshold for cov:
 *   (1-cov)^3 = (threshold - comp) / comp^2
 */
export function coverageToReachThreshold(complexity, threshold = DEFAULT_THRESHOLD) {
  if (complexity <= 0) return 0
  if (complexity >= threshold) {
    // Even at 100% coverage the score is `complexity`, which is already over
    // the threshold. Coverage cannot save it — the method must be simplified.
    return null
  }
  const ratio = (threshold - complexity) / (complexity * complexity)
  const uncovered = Math.cbrt(ratio)
  const cov = 1 - uncovered
  return Math.max(0, Math.min(100, cov * 100))
}

/**
 * Combine per-function complexity with per-function coverage into scored rows.
 *
 * @param {import('./complexity.mjs').FunctionComplexity[]} functions
 * @param {(startLine: number, endLine: number) => import('./coverage.mjs').FunctionCoverage} coverageFor
 * @param {{ threshold?: number }} [options]
 */
export function scoreFunctions(functions, coverageFor, options = {}) {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  return functions.map((fn) => {
    const cov = coverageFor(fn.startLine, fn.endLine)
    const score = crapScore(fn.complexity, cov.coverage)
    return {
      ...fn,
      coverage: cov.coverage,
      hasCoverageData: cov.hasData,
      crap: score,
      over: score > threshold,
      coverageToPass: coverageToReachThreshold(fn.complexity, threshold),
    }
  })
}
