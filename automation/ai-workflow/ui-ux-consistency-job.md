# UI/UX Consistency Review Job

## Purpose
Continuously reduce UI inconsistency and duplicated presentation logic across domains.

## Cadence
- Recommended: 2-3 times/week (or daily in heavy feature periods).

## Inputs
- Recent PR diffs / changed views
- Existing component inventory
- Known UX inconsistencies and design debt list

## Review Scope
1. Identify similar-looking components across domains.
2. Identify duplicated interaction patterns (forms, cards, lists, actions, empty states).
3. Identify styling drift (spacing, typography, iconography, state handling).
4. Propose consolidation into shared reusable components/primitives.

## Output Contract
- Ranked list of top consolidation opportunities (impact x effort)
- Proposed extraction plan (component names, props, migration sequence)
- Optional implementation PR(s) for low-risk opportunities
- Screenshot/evidence snapshots for before/after consistency

## Acceptance Criteria
- At least one concrete reuse win per run (or documented reason why none).
- No regression in behavior.
- Updated docs if new shared primitives/patterns are introduced.

## Guardrails
- Prefer incremental extraction over sweeping rewrites.
- Preserve domain semantics while unifying visual/interaction behavior.
- Avoid introducing overly abstract generic APIs without 2+ real call sites.
