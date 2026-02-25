# System Architect Refactor Review Job

## Purpose
Systematically improve codebase composability, reuse, and maintainability without slowing feature flow.

## Cadence
- Recommended: weekly deep review + optional mid-week quick pass.

## Inputs
- Recent merged/open PRs
- Duplicate code hotspots
- Domain boundary issues
- Runtime/test pain points

## Review Scope
1. Detect DRY violations across domains/services/components.
2. Identify composability opportunities (extract shared units, utility hooks/services).
3. Identify candidate generic components where behavior and shape align.
4. Flag architecture risks (tight coupling, leaky abstractions, brittle modules).

## Output Contract
- Architecture findings report:
  - hotspot
  - current duplication/risk
  - proposed target design
  - migration steps
  - risk/rollback notes
- Prioritized refactor backlog (P1/P2/P3)
- Optional implementation PR(s) for high-confidence, low-risk improvements

## Acceptance Criteria
- Findings are actionable and scoped.
- Proposed extractions include explicit adoption plan.
- Refactor recommendations preserve behavior and testability.

## Guardrails
- Avoid broad speculative rewrites.
- Keep refactors reversible and incremental.
- Require clear evidence before introducing new generic abstractions.
