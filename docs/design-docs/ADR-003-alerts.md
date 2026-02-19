---
title: "ADR-003: Alert and Notification System"
date: 2026-02-14
status: accepted
adr_number: "003"
tags: [adr, architecture, alerts, slack, notifications]
---

# ADR-003: Alert and Notification System

## Status
Accepted

## Context

The compound engineering loop requires human judgment at specific points: plan approval, error escalation, review triage, and completion notification. The requirements specify Slack as the alert channel.

The system must balance:
- **Timeliness**: Blocking tasks (plan approval) should reach the human quickly.
- **Noise reduction**: Status updates shouldn't create alert fatigue.
- **Actionability**: Alerts should include enough context and action buttons for the human to respond without switching to another tool.

## Decision: Webhook-First Architecture with Slack Socket Mode

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐
│  Orchestrator    │────>│  Alert Router    │────>│  Slack API    │
│  (emits events)  │     │                 │     │               │
└─────────────────┘     │  - Priority     │     │  - Webhooks   │
                        │  - Routing      │     │  - Messages   │
                        │  - Batching     │     │  - Actions    │
                        │  - Quiet hours  │     └───────┬───────┘
                        └─────────────────┘             │
                                                        │ (action callbacks)
                        ┌─────────────────┐             │
                        │  Action Handler │<────────────┘
                        │  (Socket Mode)  │
                        │                 │────> Orchestrator
                        └─────────────────┘     (processes decision)
```

**Why webhooks, not a full Slack bot?**

A Slack bot requires a persistent server process, OAuth app installation, and a public URL for event subscriptions. This is heavyweight for a developer tool that runs locally. Instead:

- **Outbound**: Use Slack Incoming Webhooks for message delivery. Simple, no server needed.
- **Inbound (actions)**: Use Slack Socket Mode. Socket Mode establishes a WebSocket connection from the client (Coda) to Slack -- no public URL required. When a user clicks an action button in Slack, the event arrives over the WebSocket.
- **Fallback**: If Socket Mode isn't available (e.g., the user hasn't set up a Slack app), alerts degrade to webhook-only (no action buttons, just text with instructions to approve via CLI or UI).

### Alert Types and Priority

| Alert Type | Priority | Channel | Batching |
|---|---|---|---|
| `approval_needed` (plan review) | P1 -- Immediate | Slack DM | None |
| `error_escalation` (agent failed after retries) | P1 -- Immediate | Slack DM | None |
| `execution_complete` (work phase done, PR ready) | P2 -- Standard | Slack DM or channel | 5-minute window |
| `review_complete` (review findings ready) | P2 -- Standard | Slack DM or channel | 5-minute window |
| `status_update` (step N of M complete) | P3 -- Low | Slack channel only | 15-minute digest |
| `compound_captured` (new solution documented) | P3 -- Low | Slack channel only | Daily digest |

### Routing Rules

Alerts are routed based on:
1. **Plan ownership**: The person who created the plan receives P1/P2 alerts for that plan.
2. **Team channel**: P3 alerts go to a configured team channel (e.g., `#coda-updates`).
3. **Escalation**: If a P1 alert goes unacknowledged for 15 minutes, escalate to a secondary recipient (configurable).

### Quiet Hours / Do Not Disturb

Configurable in `~/.coda/alerts.toml`:

```toml
[quiet_hours]
enabled = true
start = "22:00"
end = "08:00"
timezone = "Asia/Seoul"
behavior = "queue" # queue | suppress | downgrade
```

During quiet hours, P1 alerts are never fully suppressed -- they're queued and delivered immediately when quiet hours end.

### Message Format

Slack messages use Block Kit for rich formatting:

```
┌─────────────────────────────────────────┐
│ Plan Ready for Review                   │
│                                         │
│ **Add email notifications for comments**│
│                                         │
│ Plan: docs/plans/active/email-notifs.md │
│ Agent: Claude Code                      │
│ Research: 3 subagents completed         │
│                                         │
│ [Approve] [Request Changes] [View Plan] │
└─────────────────────────────────────────┘
```

## Consequences

- **Pro**: No server infrastructure required. Everything runs locally with outbound webhooks and Socket Mode.
- **Pro**: Graceful degradation: if Slack isn't configured, alerts appear in CLI output and UI notifications only.
- **Pro**: Batching reduces noise for non-blocking events.
- **Con**: Socket Mode requires a Slack app (not just a webhook URL). The setup is more involved than a simple webhook. Mitigation: provide a setup wizard (`coda init slack`) that walks through app creation.
- **Con**: Slack is a single channel. If the user wants email or Discord or other channels, we'd need additional adapters. Mitigation: the Alert Router is an internal abstraction -- adding channels means implementing a new adapter, not changing the routing logic.
