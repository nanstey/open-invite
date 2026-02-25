# Status Sync Event Map (Bootstrap Scaffold)

Source of truth: `automation/ai-workflow/01-policy.md`.

## Event -> Status transition map

| Event | From | To | Notes |
| --- | --- | --- | --- |
| `project_created` | `*` | `backlog` | Initial capture |
| `project_scoped_ready` | `backlog` | `on_deck` | Human marks ready |
| `proposal_started` | `on_deck` | `in_progress` | Proposal work starts |
| `proposal_waiting_review` | `in_progress` | `review` | Proposal PR waiting |
| `proposal_changes_requested` | `review` | `in_progress` | Resume proposal edits |
| `proposal_approved` | `review` | `in_progress` | Proposal merged, implementation starts immediately |
| `implementation_started` | `in_progress` | `in_progress` | Idempotent confirmation |
| `implementation_waiting_review` | `in_progress` | `review` | Impl PR waiting |
| `implementation_changes_requested` | `review` | `in_progress` | Resume implementation edits |
| `implementation_batch_pushed` | `in_progress` | `in_progress` | Address/defer batch done; summary posted |
| `implementation_rewaiting_review` | `in_progress` | `review` | Returned to waiting review after batch |
| `implementation_merged` | `review` | `completed` | Noel merge authority |

## Coordinator scaffold contract

Coordinator should apply transitions with:

- single-writer status updates (coordinator identity only),
- idempotent `(project_id, event_id, target_status)` writes,
- optimistic concurrency (`version` check),
- event-log-first ordering,
- reconciliation retry on sync mismatch.

## TODO implementation notes

- TODO: add `statusTransition(event, currentStatus)` module in coordinator package.
- TODO: define `sync_error` handling path in run metadata (without mutating project status enum).
- TODO: add JSON schema/validator for `links.proposal` and `links.implementation`.
- TODO: persist `last_applied_event_id` in project sync writes.
