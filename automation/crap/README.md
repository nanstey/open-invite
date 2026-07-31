# CRAP tooling — Change Risk Anti-Patterns

`automation/crap` scores individual functions by **CRAP** (Change Risk
Anti-Patterns) so agents and humans can quickly see which code is risky to
change and worth refactoring or covering with tests.

```
CRAP(m) = comp(m)² · (1 − coverage(m))³ + comp(m)
```

- `comp(m)` — cyclomatic complexity of function `m`.
- `coverage(m)` — its test coverage as a fraction in `[0, 1]`.

A function that is **both complex and under-tested** produces a high score.
Two facts make the number intuitive:

- At **100% coverage** the score is exactly `comp` — a well-tested function is
  never "crappy".
- At **0% coverage** the score is `comp² + comp` — so any untested function
  with complexity ≥ 6 crosses the conventional **threshold of 30**.

## Why it's built this way

- **Complexity** is computed directly from the TypeScript AST
  (`lib/complexity.mjs`), independent of tests. That means it works on *any*
  file — including source that no test ever imports, which is exactly the code
  most likely to be dangerous. The counting rules match ESLint's built-in
  `complexity` rule (+1 each for `if`, ternary, each `case`, `for`/`for-in`/
  `for-of`, `while`, `do`, `catch`, and `&&` / `||` / `??`).
- **Coverage** is read from the Istanbul-format `coverage/coverage-final.json`
  emitted by Vitest's v8 provider (`lib/coverage.mjs`). Per-function coverage is
  the fraction of statements inside the function's line range that executed at
  least once. Files missing from the report are treated as 0% covered.

Because complexity and coverage are matched per function by source location,
the tool can be pointed at just the files an agent touched — no need to analyze
the whole repo.

## Usage

```bash
# Score specific files (coverage must already exist — see below)
pnpm crap services/eventService.ts domains/events/utils

# Regenerate coverage first, then score, and exit non-zero if anything is crappy
pnpm crap -- --run-coverage --fail-over services

# Machine-readable output for agents / CI
pnpm crap -- --json services lib domains pages
```

`pnpm crap` forwards to `node automation/crap/crap.mjs`. When passing flags
through `pnpm`, separate them with `--` as shown.

### Coverage data

The score needs coverage. Generate it once per run of the test suite:

```bash
pnpm test:coverage      # writes coverage/coverage-final.json
```

Then any number of `pnpm crap <files>` invocations reuse that report. Or pass
`--run-coverage` to have the tool regenerate it first. Without a coverage file
every function is scored as 0% covered (and the tool warns you).

### Options

| Flag | Description |
| --- | --- |
| `--coverage <path>` | Path to `coverage-final.json` (default `coverage/coverage-final.json`). |
| `--run-coverage` | Run `pnpm test --coverage` before scoring. |
| `--threshold <n>` | "Crappy" threshold (default `30`). |
| `--all` | Show every function, not only those over the threshold. |
| `--sort <crap\|complexity\|coverage>` | Sort order (default `crap`, descending). |
| `--json` | Emit JSON instead of a table. |
| `--fail-over [n]` | Exit `1` if any function's CRAP exceeds `n` (defaults to the threshold). |
| `--no-color` | Disable ANSI colors. |

Targets may be files, directories (scanned recursively for source files,
skipping tests), or globs like `services/*.ts`.

### Reading the output

```
services/eventService.ts
      CRAP    Cx    Cov%  Function
     90.00     9      0%  forEach() callback (arrow @380) ⚠
```

`Cx` is complexity, `Cov%` is the function's coverage, and `⚠` marks scores
over the threshold. In JSON mode each function also reports `coverageToPass`:
the coverage percentage that would bring it under the threshold, or `null` when
the complexity is so high that no amount of testing helps and the function must
be simplified.

## Suggested agent workflow

After modifying files, run the tool on just those files to check whether the
change introduced (or sits on) a high-risk hotspot:

```bash
pnpm test:coverage
pnpm crap -- --fail-over $(git diff --name-only --diff-filter=d HEAD | grep -E '\.(ts|tsx)$')
```

If a function is over threshold, either reduce its complexity (extract
helpers, flatten branching) or add tests to cover it.

## Tests

Core logic (complexity counting, the CRAP formula, coverage parsing) is covered
by `lib/crap.test.ts`, run as part of `pnpm test`.
