---
title: "ADR-007: Local-First Data Architecture"
date: 2026-02-14
status: accepted
adr_number: "007"
tags: [adr, architecture, storage, sqlite, local-first]
---

# ADR-007: Local-First Data Architecture

## Status
Accepted

## Context

Coda stores several categories of data:
1. **Plans, solutions, brainstorms**: The knowledge base (long-lived, human-readable, version-controlled).
2. **Agent run state**: Which agent is running, what step it's on, stdout/stderr capture (ephemeral, machine-readable).
3. **Event log**: History of all orchestrator events for debugging (append-only, queryable).
4. **Search index**: Precomputed index over the knowledge base for fast context loading.
5. **User preferences**: Alert settings, agent routing overrides, quiet hours.

## Options Considered

### Option A: Pure File-Based (Markdown + YAML)

Everything is a file. Agent state is a YAML file. Events are appended to a log file. Search is `grep`.

### Option B: Pure SQLite

Everything is in a SQLite database. Plans are rows, not files. Solutions are rows.

### Option C: Hybrid -- Files for Knowledge, SQLite for State (chosen)

Knowledge base artifacts (plans, solutions, brainstorms) are markdown files with YAML frontmatter in `docs/`. Operational data (agent state, events, search index) is in SQLite.

## Decision

**Option C: Hybrid**

## Rationale

**Why files for knowledge?**
- **Git-native**: Plans and solutions must be version-controlled. They're reviewed in PRs, diffed, and annotated. Files in `docs/` do this naturally.
- **Agent-legible**: Agents read files. Asking an agent to query a database for context adds friction and tool complexity.
- **Human-readable**: A developer can browse `docs/plans/` in their editor or on GitHub. No tooling required.
- **Compound-friendly**: The compound step writes a new solution file. This is simpler than inserting a row and harder to accidentally break.

**Why SQLite for operational data?**
- **Query patterns**: "Show me all agent runs in the last hour" or "find all events for plan X" require indexed queries. File-based storage would require scanning and parsing every file.
- **Concurrency**: Multiple agent processes may write state simultaneously. SQLite handles concurrent writes with WAL mode.
- **Ephemeral by design**: If `.coda/state.db` is deleted, it can be rebuilt from the file-based knowledge base. No data loss.
- **Performance**: The search index over `docs/` is a pre-computed table in SQLite. Searching solutions by tag or category is a fast indexed query, not a file system scan.

**Why not pure SQLite?**
- Plans in a database aren't diffable in git. You lose the "repository as system of record" principle.
- Agents would need database tools to read plans, adding complexity.
- The compound engineering vision of `docs/solutions/` as "institutional knowledge" requires human-browsable files.

### Schema (SQLite)

```sql
-- Agent run tracking
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  agent_type TEXT NOT NULL,       -- 'claude' | 'codex'
  task_type TEXT NOT NULL,        -- 'plan' | 'work' | 'review' | 'compound'
  status TEXT NOT NULL,           -- 'running' | 'completed' | 'failed' | 'timeout'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  exit_code INTEGER,
  stdout_path TEXT,               -- Path to captured stdout file
  stderr_path TEXT,               -- Path to captured stderr file
  metadata TEXT                   -- JSON blob for extensible data
);

-- Event log
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,       -- 'plan_created' | 'plan_approved' | 'agent_started' | ...
  source TEXT NOT NULL,           -- 'orchestrator' | 'cli' | 'ui' | 'slack'
  plan_id TEXT,
  agent_run_id TEXT,
  payload TEXT,                   -- JSON blob
  FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id)
);

-- Knowledge base search index (rebuilt from files)
CREATE VIRTUAL TABLE docs_fts USING fts5(
  path,
  title,
  category,
  tags,
  content,
  tokenize='porter'
);

-- Tracker sync state
CREATE TABLE tracker_sync (
  coda_id TEXT NOT NULL,
  tracker TEXT NOT NULL,           -- 'jira' | 'linear'
  external_id TEXT NOT NULL,
  external_url TEXT,
  last_synced_at TEXT,
  sync_hash TEXT,
  PRIMARY KEY (coda_id, tracker)
);
```

### Multi-Device Considerations

Coda is local-first by design. For multi-device scenarios:

- **Knowledge base**: Already synced via git (push/pull).
- **SQLite state**: Not synced. Each device has its own `.coda/state.db`. This is acceptable because operational state (agent runs, events) is device-specific.
- **User preferences**: Global config at `~/.config/coda/` is not synced by default. Users can symlink or use dotfile managers if desired.
- **Future**: If cloud sync is needed (e.g., start a plan on laptop, approve on phone), we'd add an optional sync layer over the SQLite state. This is not in scope for Milestones 1-3.

## Consequences

- **Pro**: Knowledge artifacts are git-native, human-readable, and agent-legible.
- **Pro**: Operational data is fast to query and handles concurrency.
- **Pro**: The search index makes "find relevant solutions" fast without complex tooling.
- **Pro**: Rebuilding state from files means the SQLite database is a cache, not a source of truth. Losing it is inconvenient, not catastrophic.
- **Con**: Two storage systems to maintain. Mitigation: clear separation -- files are for humans/agents/git, SQLite is for machines.
- **Con**: The FTS index must be kept in sync with file changes. Mitigation: rebuild index on `coda` startup (fast for typical repo sizes) or watch for file changes.
