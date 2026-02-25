# Open Invite AI Workflow (Automation)

This folder is the **self-contained operational source** for AI workflow automation.

## What belongs here
- Runtime automation policy
- Per-cycle execution checklist
- Status/event transition map
- Bootstrap/rollout implementation notes

## Files
- `policy.md` — operational policy used by automation
- `cycle-checklist.md` — deterministic every-cycle checklist
- `status-event-map.md` — event -> status transitions for coordinator logic
- `bootstrap.md` — bootstrap scope, constraints, and TODO wiring

## Proposal vs Automation
Project proposal docs may evolve independently. Automation should follow this folder's policy/contracts even if proposal docs drift.
