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

## Technical Triage (dev squad)

### Likely files/components to update
- `domains/feedback/components/ProjectsKanbanBoard.tsx`
- `domains/feedback/components/projects/KanbanColumn.tsx`
- `domains/feedback/components/projects/ProjectCard.tsx`
- `domains/feedback/projectTypes.ts`
- `services/feedbackProjectService.ts`

### New services/APIs expected
- No new backend API expected.
- Possible small front-end DnD helper for touch sensor tuning.

### Test plan additions
- Extend `services/feedbackProjectService.test.ts` for move determinism.
- Add/extend component tests for:
  - desktop lane move visual consistency
  - mobile/touch lane transfer
- Manual QA checklist for `/admin/projects` desktop + mobile drag behavior.

### Execution slicing
- Slice 1: reproduce + root cause notes.
- Slice 2: desktop visual consistency fix.
- Slice 3: mobile DnD/touch fix.
- Slice 4: tests + QA evidence artifact.

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
