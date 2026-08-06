# CRAP tooling — Change Risk Anti-Patterns

The repo uses [`crap4ts`](https://www.npmjs.com/package/crap4ts) to score
functions by **CRAP** (Change Risk Anti-Patterns), so agents and humans can see
which code is risky to change and worth refactoring or covering with tests.

```
CRAP(m) = comp(m)² · (1 − coverage(m))³ + comp(m)
```

- `comp(m)` — cyclomatic complexity of function `m`.
- `coverage(m)` — its test coverage as a fraction in `[0, 1]`.

A function that is **both complex and under-tested** produces a high score. Two
facts make the number intuitive:

- At **100% coverage** the score is exactly `comp` — a well-tested function is
  never "crappy".
- At **0% coverage** the score is `comp² + comp`, so complexity alone quickly
  pushes an untested function over the threshold.

Configuration lives in [`crap4ts.config.ts`](../../crap4ts.config.ts): source
dirs (`domains`, `services`, `lib`, `pages`), the coverage file, a threshold of
`16`, and `line` coverage.

## Usage

CRAP needs coverage data. Generate it from the test suite first:

```bash
pnpm test:coverage        # writes coverage/coverage-final.json (vitest v8 provider)
```

Then score:

```bash
# Whole repo, per config
pnpm crap

# Only functions in files changed since the base branch — the agent workflow
pnpm crap:changed                       # = crap4ts --changed-since origin/main

# Specific files an agent just touched (see note below on --src vs --include)
pnpm crap --src . --include services/eventService.ts domains/events/**/*.ts

# Machine-readable output
pnpm crap --format json --top 20
```

Pass extra flags directly after `pnpm crap` — **do not** use a `--` separator
(crap4ts rejects the bare `--` that pnpm would inject).

> **Targeting specific files:** crap4ts's `--src` expects *directories* — a bare
> file path matches nothing. To score individual files, root at `--src .` and
> filter with `--include <path-or-glob...>`, or (preferred for agents) use
> `--changed-since <ref>`, which resolves changed files for you.

### Semi-automated remediation loop

Generate a fresh, ranked backlog and select one file for a remediation PR:

```bash
pnpm crap:backlog
# Restrict the selection to one file or folder when needed.
pnpm crap:backlog --target services/eventService.ts
pnpm crap:backlog --target domains/events
```

This refreshes coverage, runs `crap4ts`, and writes ignored artifacts to
`artifacts/crap/`:

- `backlog.json` / `backlog.md` — every file with a function above threshold.
- `next-target.json` / `next-target.md` — exactly one highest-risk file for the
  next PR.

From a clean, dedicated branch or worktree, run the checked-in Pi chain:

```text
/run-chain crap-remediation
# or, to constrain its first target:
/run-chain crap-remediation --target services/eventService.ts
```

The chain selects one file, plans and implements a narrow improvement, obtains
parallel correctness/metric/scope reviews, applies only accepted blocking fixes,
and opens a PR only after validation passes. It never merges. Do not run it from
`main`, a dirty worktree, or a branch that contains unrelated work.

### Suggested agent workflow

After modifying files, regenerate coverage and score just the changed files:

```bash
pnpm test:coverage
pnpm crap:changed          # non-zero exit if anything is over threshold
```

If a function is over threshold, either reduce its complexity (extract helpers,
flatten branching) or add tests to cover it. Use `crap4ts --breakdown` (JSON) to
see which constructs contribute the complexity, and `--strict` (threshold 8) to
tighten.

### Useful flags

`crap4ts --help` lists them all. The most relevant:

| Flag | Description |
| --- | --- |
| `--changed-since <ref>` / `--diff <ref>` | Only analyze files changed since a git ref. |
| `--src <paths...>` | Override the configured source paths (files or dirs). |
| `--threshold <n>` / `--strict` (8) / `--lenient` (30) | CRAP threshold. |
| `--coverage-metric <line\|branch>` | Coverage basis. |
| `--format <table\|json\|markdown>` | Output format. |
| `--top <n>` | Show the N worst functions. |
| `--breakdown [all\|exceeding]` | (JSON) show what contributes the complexity. |
| `-q, --quiet` | Exit code only, no output — for CI/agent gating. |

Note on granularity: `crap4ts` scores each **named function**, folding inline
callbacks into their enclosing function. That is cleaner but can dilute a
complex, uncovered callback into a better-covered parent — so a low score on a
large function is not a guarantee every branch inside it is tested.
