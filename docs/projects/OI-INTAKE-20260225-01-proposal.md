# Proposal — OI-INTAKE-20260225-01

## Problem
Project cards on `/admin/projects` show incorrect transient styling after lane moves, and mobile lane transfer is currently non-functional.

## Proposed Plan
1. **Reproduce + isolate root causes**
   - Verify lane move state transition on desktop and mobile viewport.
   - Inspect className/style derivation after drag/drop completion.
2. **Fix visual state consistency**
   - Ensure style tokens are derived from canonical project/lane state after move.
   - Remove stale local state path causing temporary mismatch.
3. **Fix mobile lane transfer interaction**
   - Adjust DnD sensor/gesture configuration for touch devices.
   - Validate collision strategy and drop target activation on mobile.
4. **Regression coverage**
   - Add/update tests for desktop visual persistence and mobile lane move.
   - Add QA checklist notes for `/admin/projects` lane movement.

## Risks
- Mobile DnD behavior may depend on library constraints and require small UX fallback.
- Existing board state model may require broader refactor if style derives from multiple sources.

## Impact Estimate
- Scope: `medium-large`
- LOC: likely >100 across board UI, DnD config, and tests.

## Branching
- Change type prefix: `fix`
- Reserved branch: `fix/project-items-lane-behaviour-mobile-dnd`
- This same branch will be reused for implementation after approval.

## Approval Gate
Reply with `@clippy go` to authorize implementation orchestration.
