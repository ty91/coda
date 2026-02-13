---
title: "ADR-002: Repository Knowledge Architecture"
date: 2026-02-14
status: accepted
adr_number: "002"
tags: [adr, architecture, knowledge, repository, compound-loop]
---

# ADR-002: Repository Knowledge Architecture

## Status
Accepted

## Context

The harness engineering philosophy is explicit: **"the repository is the system of record"** and **"what Codex can't see doesn't exist."** The compound engineering philosophy adds that **"each unit of work should make subsequent units easier."**

Coda must structure the repository so that:
1. Agents can navigate from a small entry point to deep context (progressive disclosure).
2. Plans, solutions, and brainstorms are first-class versioned artifacts.
3. The knowledge base is mechanically validated (linters, CI).
4. Solved problems are searchable and compound into future work.

## Decision

### Entry Points: CLAUDE.md and AGENTS.md

```
CLAUDE.md    — Agent instructions, preferences, patterns, project context.
               Read by Claude Code at session start.
               ~100-200 lines max. Acts as table of contents.
               Points to deeper docs/ files for specifics.

AGENTS.md    — Agent-specific operating instructions for Codex.
               Same principle: short map, not encyclopedia.
```

Both files are maintained by Coda's compound step. When `/workflows:compound` runs, it may append new patterns to `CLAUDE.md` or create new doc files and add pointers.

### Directory Structure

```
your-project/
├── CLAUDE.md                    # Agent entry point (table of contents)
├── AGENTS.md                    # Codex-specific entry point
├── .coda/
│   ├── config.yaml              # Project-level Coda configuration
│   ├── state.db                 # SQLite: agent runs, events, search index
│   └── skills/                  # Project-specific custom skills
├── docs/
│   ├── brainstorms/             # /workflows:brainstorm output
│   │   └── {slug}.md            # YAML frontmatter + markdown
│   ├── plans/                   # /workflows:plan output
│   │   ├── active/              # Plans in draft/review/approved/executing
│   │   └── completed/           # Finished plans (archived)
│   ├── solutions/               # /workflows:compound output
│   │   ├── {category}/          # Organized by domain
│   │   │   └── {slug}.md        # YAML frontmatter + searchable content
│   │   └── index.md             # Solution catalog
│   ├── design-docs/             # Architecture and design decisions
│   │   └── index.md             # Design doc catalog
│   ├── exec-plans/              # Complex multi-step execution plans
│   │   ├── active/
│   │   ├── completed/
│   │   └── tech-debt-tracker.md
│   └── references/              # External docs cached for agent use
│       └── {tool}-llms.txt      # LLM-optimized reference docs
└── todos/                       # Triaged review findings
    └── {NNN}-{status}-{priority}-{slug}.md
```

### YAML Frontmatter Standard

Every document in the knowledge base uses YAML frontmatter for machine-readable metadata:

```yaml
---
title: "Fix N+1 query in comment loading"
category: performance
tags: [database, activerecord, n-plus-one]
created: 2026-02-13
status: active          # active | completed | superseded
confidence: high        # low | medium | high
related:
  - docs/solutions/performance/batch-loading-pattern.md
---
```

This frontmatter enables:
- The Knowledge Index to build a searchable catalog without parsing markdown bodies.
- Agents to filter by category, status, and confidence when loading context.
- CI linters to validate completeness (all required fields present, dates valid, links resolvable).

### Context Loading Strategy

When an agent starts a task, the orchestrator builds its context window:

1. **Always loaded**: `CLAUDE.md` or `AGENTS.md` (depending on agent).
2. **Task-relevant**: The plan being executed, plus any plans it references.
3. **Search-based**: Query the Knowledge Index for solutions matching the task's tags/category. Load top 3-5 most relevant solutions.
4. **On-demand**: The agent can request more context via tool calls (read files, search solutions).

This implements progressive disclosure: start small, go deeper only when needed.

### Mechanical Validation

A CI job (`coda-docs-lint`) validates the knowledge base:

- All files in `docs/` have valid YAML frontmatter.
- All `related:` links resolve to existing files.
- No `status: active` docs older than 30 days without an update (staleness check).
- `index.md` files are up to date (list all files in their directory).
- `CLAUDE.md` stays under 200 lines.
- Solution categories match a defined taxonomy in `.coda/config.yaml`.

## Consequences

- **Pro**: Agents always have a consistent, structured knowledge base. The harness principle of "repository as system of record" is directly fulfilled.
- **Pro**: The compound step has a clear target: write solutions to `docs/solutions/`, update `CLAUDE.md`, and the system gets smarter.
- **Pro**: Mechanical validation catches rot early (stale docs, broken links, missing frontmatter).
- **Con**: Requires discipline to maintain. Mitigation: the compound step automates most knowledge capture, and a recurring doc-gardening task (inspired by harness engineering) scans for drift.
- **Con**: Frontmatter schema changes require migration. Mitigation: keep the schema minimal and additive.
