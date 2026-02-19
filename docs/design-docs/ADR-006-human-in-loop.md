---
title: "ADR-006: Human-in-the-Loop Protocol"
date: 2026-02-14
status: accepted
adr_number: "006"
tags: [adr, architecture, human-in-loop, approval, state-machine]
---

# ADR-006: Human-in-the-Loop Protocol

## Status
Accepted

## Context

The harness engineering philosophy is clear: **"Humans steer. Agents execute."** The compound engineering philosophy adds: **"Plan and review should comprise 80% of an engineer's time."** This means the system must have well-defined points where human judgment is required, and the protocol for obtaining that judgment must be frictionless.

## Decision: State Machine with Multi-Channel Approval

### Plan Lifecycle State Machine

```
                    ┌──────────┐
         create     │          │
        ────────>   │  draft   │
                    │          │
                    └────┬─────┘
                         │ submit for review
                         ▼
                    ┌──────────┐
                    │          │  <──── reject (with feedback)
         ──────────│  review   │────────┐
         │         │          │        │
         │         └────┬─────┘        │
         │              │ approve      │
         │              ▼              │
         │         ┌──────────┐        │
         │         │          │        │
         │         │ approved  │        │
         │         │          │        │
         │         └────┬─────┘        │
         │              │ start work   │
         │              ▼              │
         │         ┌──────────┐        │
         │         │          │        │
         │         │executing │        │
         │         │          │────────┘
         │         └────┬─────┘  error -> review (re-plan)
         │              │ all steps done
         │              ▼
         │         ┌──────────┐
         │         │          │
         └────────>│completed │
                   │          │
                   └──────────┘
```

Valid transitions:
- `draft` -> `review` (plan submitted)
- `review` -> `approved` (human approves)
- `review` -> `draft` (human rejects with feedback; plan needs revision)
- `approved` -> `executing` (work begins)
- `executing` -> `completed` (all steps succeed)
- `executing` -> `review` (error escalation; re-plan needed)
- Any state -> `completed` (manual close by human)

### Approval Channels

A human can approve/reject a plan through three channels:

1. **CLI prompt**: `coda plans approve <id>` or interactive prompt during `coda plan`.
2. **Tauri UI**: Dedicated plan review screen with diff view, annotation tools, and approve/reject buttons.
3. **Slack action**: Button in the Slack notification message (via Socket Mode callback).

All three channels converge on the same Plan Manager API. The first approval wins (no double-approval needed).

### Agent Ask Channel (M1 Runtime Contract)

For interactive, non-plan decisions during agent execution, Coda now provides a dedicated `coda ask` channel:

1. The agent pipes a structured JSON request to `coda ask` over stdin.
2. The CLI forwards that request to the local Unix socket at `~/.coda/runtime/ask.sock`.
3. The Tauri backend exposes pending asks to the UI and accepts submit/cancel actions.
4. The UI returns a structured response over the same session, and the blocked CLI resumes immediately.

This keeps human-in-the-loop prompts in a single local trust boundary (CLI + desktop app), while preserving machine-parseable request/response contracts for agent subprocess orchestration.

### Decision Points Requiring Human Judgment

| Decision Point | Trigger | Default Behavior if No Response |
|---|---|---|
| Plan approval | Plan enters `review` state | Wait indefinitely (with escalation reminders) |
| Error escalation | Agent fails after retries | Wait indefinitely (with escalation reminders) |
| Review triage | Review findings generated | Auto-proceed if all findings are P3; wait for P1/P2 |
| Destructive action | Agent wants to delete/overwrite/force-push | Always block; require explicit human approval |
| Merge | PR ready to merge | Wait for human (never auto-merge without config) |

### Timeout and Escalation

```toml
# .coda/config.toml
[approval]
timeout_minutes = 60 # Reminder after 60 min
escalation_minutes = 240 # Escalate to secondary after 4 hours
escalation_target = "@alice" # Slack handle or Coda user

[approval.auto_approve]
p3_only_reviews = true # Auto-approve reviews with only P3 findings
plans_by = ["@self"] # Auto-approve plans created by self (solo dev mode)
```

The escalation chain:
1. T+0: Alert sent to plan owner.
2. T+60min: Reminder sent to plan owner.
3. T+240min: Alert sent to escalation target.
4. T+480min: Second reminder to escalation target.

## Consequences

- **Pro**: Clear state machine makes plan lifecycle predictable and debuggable.
- **Pro**: Multi-channel approval reduces friction: approve from wherever you are (terminal, desktop, phone via Slack).
- **Pro**: Auto-approve for low-risk scenarios (P3-only reviews) respects "corrections are cheap" principle.
- **Con**: Three approval channels means three codepaths to maintain. Mitigation: all three call the same Plan Manager method; the channel-specific code is thin.
- **Con**: "Wait indefinitely" for critical approvals could block the pipeline. Mitigation: escalation chain ensures someone gets notified.
