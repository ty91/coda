---
title: "ADR-004: Issue Tracker Integration"
date: 2026-02-14
status: accepted
adr_number: "004"
tags: [adr, architecture, issue-tracker, jira, linear, sync]
---

# ADR-004: Issue Tracker Integration

## Status
Accepted

## Context

Coda must integrate with external issue trackers (Jira and Linear initially) for bidirectional sync. Plans created in Coda should appear as issues in the tracker, and issues created in the tracker should be pullable into Coda as plans.

The challenge is that Jira and Linear have very different data models, APIs, and sync semantics. We need an abstraction that handles both without becoming a leaky lowest-common-denominator.

## Decision: Adapter Pattern with Event-Driven Sync

### Abstraction Layer

```
┌─────────────────────────────────────────────┐
│              Issue Tracker Bridge             │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │           Tracker Interface             │  │
│  │                                        │  │
│  │  createIssue(CodaIssue): TrackerRef    │  │
│  │  updateIssue(TrackerRef, CodaIssue)    │  │
│  │  getIssue(TrackerRef): CodaIssue       │  │
│  │  listIssues(filter): CodaIssue[]       │  │
│  │  onIssueChanged(cb): Unsubscribe       │  │
│  │  mapFields(CodaIssue): TrackerFields   │  │
│  └────────────────────────────────────────┘  │
│         ▲                    ▲                │
│         │                    │                │
│  ┌──────┴──────┐    ┌───────┴──────┐         │
│  │ JiraAdapter │    │LinearAdapter │         │
│  └─────────────┘    └──────────────┘         │
└─────────────────────────────────────────────┘
```

Each adapter implements the `TrackerInterface` and handles the specifics of its tracker's API.

### Coda's Internal Issue Model (CodaIssue)

```typescript
type CodaIssue = {
  id: string                    // Coda-internal ID
  title: string
  description: string           // Markdown body
  status: CodaStatus            // draft | planned | in_progress | review | done
  priority: 'p1' | 'p2' | 'p3'
  type: 'feature' | 'bug' | 'task' | 'debt'
  labels: string[]
  assignee?: string
  planRef?: string              // Path to associated plan in docs/plans/
  solutionRef?: string          // Path to associated solution in docs/solutions/
  trackerRefs: TrackerRef[]     // Links to external tracker issues
  created: string               // ISO 8601
  updated: string               // ISO 8601
}

type TrackerRef = {
  tracker: 'jira' | 'linear'
  externalId: string            // e.g., "PROJ-123" or Linear UUID
  externalUrl: string
  lastSyncedAt: string
  syncHash: string              // Hash of last synced state for conflict detection
}
```

### Field Mapping

| Coda Field | Jira Field | Linear Field |
|---|---|---|
| `title` | `summary` | `title` |
| `description` | `description` (Jira wiki -> markdown) | `description` (markdown native) |
| `status` | Custom status mapping (configurable) | Workflow state mapping (configurable) |
| `priority` | `priority` (P1->Highest, P2->High, P3->Medium) | `priority` (1->Urgent, 2->High, 3->Medium) |
| `type` | `issuetype` (configurable mapping) | `label` (configurable mapping) |
| `labels` | `labels` | `labels` |
| `planRef` | Custom field or comment link | Comment link |

Status mapping is configurable per-project because every team maps workflow states differently:

```yaml
# .coda/config.yaml
tracker:
  jira:
    project: PROJ
    status_map:
      draft: "To Do"
      planned: "To Do"
      in_progress: "In Progress"
      review: "In Review"
      done: "Done"
```

### Sync Strategy: Event-Driven with Polling Fallback

**Primary (when available)**: Jira webhooks / Linear webhooks. The tracker sends events when issues change. Coda receives them (via the same Socket Mode or local server used for Slack actions) and processes the delta.

**Fallback**: Polling on a configurable interval (default: 5 minutes). Query the tracker API for issues updated since the last sync timestamp.

**Why event-driven first?**
- Lower latency: changes appear in Coda within seconds.
- Lower API usage: no wasted polling requests when nothing changed.
- But webhooks require network reachability, which may not exist on a developer's laptop. Hence the polling fallback.

### Conflict Resolution

Bidirectional sync creates the possibility of conflicting edits. The strategy:

1. **Last-write-wins with hash check**: Each sync stores a `syncHash` (hash of the synced state). Before writing, compare the current remote state's hash to the stored hash. If they match, no conflict -- apply the update. If they differ, a conflict exists.
2. **Conflict behavior (configurable)**:
   - `coda_wins`: Coda's state overwrites the tracker. Use when Coda is the source of truth.
   - `tracker_wins`: The tracker's state overwrites Coda. Use when the tracker is the source of truth.
   - `manual`: Alert the user and let them resolve. Default for Milestone 3.
3. **Conflict scope**: Only field-level conflicts are tracked. If Coda changes `status` and Jira changes `labels`, there's no conflict -- both changes apply.

## Consequences

- **Pro**: Adapter pattern makes adding new trackers (GitHub Issues, Notion, etc.) a matter of implementing one interface.
- **Pro**: Coda's internal model is richer than any single tracker. We map down to tracker fields, not up from them.
- **Pro**: Event-driven sync is responsive; polling fallback means it always works.
- **Con**: Jira's API is notoriously complex (wiki markup, custom fields, workflow transitions). The Jira adapter will be the most maintenance-heavy component. Mitigation: scope Milestone 3 to a specific Jira project type (Scrum or Kanban, not both).
- **Con**: Bidirectional sync is inherently complex. Mitigation: start with unidirectional (Coda -> Tracker) in Milestone 3 and add reverse sync as a follow-up.
