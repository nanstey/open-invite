# Browser Validation Runbook (Agent-driven)

This runbook defines how an agent validates Open Invite app behavior through browser interaction.

## Purpose
- Confirm UI/UX behavior for changed flows.
- Reproduce PR comment issues and verify fixes.
- Collect concise evidence for PR updates.

## Validation modes
1. **Smoke mode (default):**
   - app boots
   - key route loads
   - no blocking console/runtime errors
2. **Targeted mode:**
   - only affected route/components from current diff
3. **Regression mode (when requested):**
   - expanded path checks for related feature areas

## Per-cycle browser checklist
- Start app in dev/preview target for current branch/worktree.
- Open app in browser session tied to that branch context.
- Execute affected flows from PR scope.
- Capture evidence:
  - pass/fail notes
  - minimal screenshots when useful
  - concise reproduction steps for failures
- Feed findings back into remediation batch or PR summary comment.

## Interaction policy
- Prefer deterministic, scriptable steps over ad-hoc clicking.
- Keep one browser validation context per branch/worktree to avoid mix-ups.
- Re-run only affected flows after remediation; avoid full-suite reruns unless needed.

## Output contract for PR updates
When browser validation is run, include in summary:
- routes/flows tested
- result per flow (pass/fail)
- known gaps/deferred checks
- follow-up action if failing
