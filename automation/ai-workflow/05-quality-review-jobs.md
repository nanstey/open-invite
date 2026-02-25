# Quality Review Jobs

## A) UI/UX Consistency Review
Purpose: reduce UI inconsistency and duplicated presentation logic across domains.

Cadence: 2-3x/week (or daily during heavy feature periods).

Outputs:
- ranked consolidation opportunities (impact x effort)
- extraction plan (component API + migration steps)
- optional low-risk implementation PRs

Guardrails:
- incremental extraction over sweeping rewrites
- preserve domain semantics while unifying behavior/style
- avoid speculative generic APIs without real call sites

## B) System Architect Refactor Review
Purpose: improve composability, reuse, and maintainability.

Cadence: weekly deep pass + optional mid-week quick pass.

Outputs:
- hotspot report (duplication/risk -> target design -> migration plan)
- prioritized refactor backlog (P1/P2/P3)
- optional high-confidence low-risk refactor PRs

Guardrails:
- no broad speculative rewrites
- keep changes reversible and incremental
- require evidence before introducing new generic abstractions
