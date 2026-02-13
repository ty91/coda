# Coda — Technical Architecture

> **Author**: Technical Architect perspective
> **Status**: Draft
> **Date**: 2026-02-13

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack Rationale](#2-technology-stack-rationale)
3. [ADR-001: Agent Orchestration Strategy](#3-adr-001-agent-orchestration-strategy)
4. [ADR-002: Repository Knowledge Architecture](#4-adr-002-repository-knowledge-architecture)
5. [ADR-003: Alert and Notification System](#5-adr-003-alert-and-notification-system)
6. [ADR-004: Issue Tracker Integration](#6-adr-004-issue-tracker-integration)
7. [ADR-005: CLI Architecture](#7-adr-005-cli-architecture)
8. [ADR-006: Human-in-the-Loop Protocol](#8-adr-006-human-in-the-loop-protocol)
9. [ADR-007: Local-First Data Architecture](#9-adr-007-local-first-data-architecture)
10. [Security Considerations](#10-security-considerations)
11. [Milestone Architecture Mapping](#11-milestone-architecture-mapping)

---

## 1. System Architecture Overview

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Interfaces                            │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐   │
│  │   Coda CLI   │    │            Coda Tauri UI                 │   │
│  │  (primary)   │    │  ┌────────────┐  ┌───────────────────┐  │   │
│  │              │    │  │  Web Front  │  │  Rust Sidecar     │  │   │
│  │  commands/   │    │  │  (React/TS) │  │  (Tauri backend)  │  │   │
│  │  skills/     │    │  └─────┬──────┘  └────────┬──────────┘  │   │
│  │  hooks/      │    │        └─────────┬────────┘             │   │
│  └──────┬───────┘    └──────────────────┼──────────────────────┘   │
│         │                               │                           │
└─────────┼───────────────────────────────┼───────────────────────────┘
          │          IPC (Tauri commands)  │
          │       ┌───────────────────────┘
          ▼       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Core Engine                                  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                  Agent Orchestrator                         │     │
│  │                                                            │     │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌────────┐  │     │
│  │  │  Router   │  │ Scheduler│  │  State Mgr  │  │ Runner │  │     │
│  │  └──────────┘  └──────────┘  └────────────┘  └────────┘  │     │
│  └───────┬──────────────────────────────┬─────────────────────┘     │
│          │                              │                           │
│  ┌───────▼──────────┐    ┌──────────────▼──────────────────┐       │
│  │  Plan Manager     │    │  Knowledge Index                │       │
│  │  (lifecycle/state)│    │  (repo docs, solutions, plans)  │       │
│  └──────────────────┘    └─────────────────────────────────┘       │
│                                                                     │
└──────────┬────────────────────────┬─────────────────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────────────────────┐
│   Agent Providers     │  │          External Integrations           │
│                       │  │                                          │
│  ┌─────────────────┐ │  │  ┌────────────┐  ┌───────────────────┐  │
│  │  Claude Code     │ │  │  │ Slack Alert│  │ Issue Tracker     │  │
│  │  (general tasks, │ │  │  │ System     │  │ Bridge            │  │
│  │   planning,      │ │  │  │            │  │ (Jira/Linear)     │  │
│  │   review)        │ │  │  └────────────┘  └───────────────────┘  │
│  ├─────────────────┤ │  │                                          │
│  │  Codex           │ │  └──────────────────────────────────────────┘
│  │  (coding,        │ │
│  │   debugging,     │ │
│  │   structured     │ │
│  │   review)        │ │
│  └─────────────────┘ │
└──────────────────────┘
```

### Core Components

| Component | Responsibility | Primary Interface |
|---|---|---|
| **Coda CLI** | Primary developer interface; issues commands, runs the compound loop (plan/work/review/compound) | Terminal, stdin/stdout, process exit codes |
| **Tauri UI** | Visual interface for plan annotation, approval workflows, agent monitoring, issue triage | Desktop window, Tauri IPC |
| **Agent Orchestrator** | Routes tasks to the right agent (Claude or Codex), manages execution state, handles failures | Internal API consumed by CLI and UI |
| **Alert System** | Delivers notifications for human-in-the-loop decisions via Slack | Outbound webhooks, Slack API |
| **Issue Tracker Bridge** | Bidirectional sync between Coda plans/todos and Jira/Linear | REST API adapters, event listeners |
| **Plan Manager** | Owns the plan lifecycle: draft, review, approved, executing, completed | File system + state machine |
| **Knowledge Index** | Makes repo docs, solutions, and past plans searchable for agent context loading | File system scan + lightweight index |

### Communication Patterns

- **CLI ↔ Orchestrator**: Direct function calls within the same Node.js process. The CLI is a thin shell over the orchestrator.
- **Tauri UI ↔ Orchestrator**: Tauri IPC commands. The Rust backend invokes the orchestrator (either as a sidecar process or via a local HTTP API).
- **Orchestrator → Agent Providers**: Subprocess spawning. Claude Code and Codex are invoked as CLI subprocesses with structured prompts piped in and results streamed back.
- **Orchestrator → Alert System**: Fire-and-forget event emission. The alert system consumes events and decides routing independently.
- **Orchestrator ↔ Issue Tracker**: Async adapter calls. The bridge polls or listens for events and applies bidirectional field mapping.

### Data Flow: Key Scenarios

#### Plan Creation

```
User (CLI or UI)
  │  "plan: Add email notifications for comments"
  ▼
CLI /workflows:plan command
  │  Parses intent, loads repo context from Knowledge Index
  ▼
Agent Orchestrator
  │  Routes to Claude Code (planning is a general task)
  │  Spawns parallel research subagents:
  │    - repo-research (codebase patterns)
  │    - framework-docs (external docs)
  │    - best-practices (industry standards)
  ▼
Claude Code returns structured plan
  │
  ▼
Plan Manager
  │  Writes plan to docs/plans/{slug}.md with YAML frontmatter
  │  Sets state: draft
  ▼
Alert System
  │  Emits "plan_ready_for_review" event → Slack notification
  ▼
User approves (CLI prompt / UI button / Slack action)
  │
  ▼
Plan Manager sets state: approved
```

#### Agent Execution (Work Phase)

```
User: /workflows:work
  ▼
CLI reads approved plan from docs/plans/
  ▼
Agent Orchestrator
  │  Determines task type from plan steps
  │  Routes coding tasks → Codex
  │  Routes general/research → Claude Code
  ▼
Runner
  │  Creates git worktree for isolation
  │  Executes plan steps sequentially
  │  After each step: run validations (tests, lint, typecheck)
  │  On failure: retry with error context, then escalate
  ▼
State Manager
  │  Persists progress to local state file
  │  Emits events: step_completed, step_failed, execution_complete
  ▼
Alert System routes events as configured
```

#### Alert Routing

```
Event (plan_ready, error, completion, approval_needed)
  ▼
Alert System
  │  Checks alert preferences (priority, quiet hours, routing rules)
  │  Determines channel: Slack DM, Slack channel, or suppressed
  ▼
Slack Webhook / Slack API
  │  Delivers formatted message with action buttons
  ▼
User interacts with Slack action
  │  Webhook callback → Coda local server (or CLI polling)
  ▼
Orchestrator processes the user's decision
```

---

## 2. Technology Stack Rationale

### CLI: TypeScript with Commander.js

**Decision**: TypeScript + Commander.js (not Rust, not Oclif)

| Factor | TypeScript + Commander | Rust CLI | Oclif |
|---|---|---|---|
| **Ecosystem alignment** | Claude Code is Node.js-based; same runtime means native interop | Different runtime; would need IPC | Also Node.js but heavier framework |
| **Development speed** | Fast iteration; the team and agents are productive in TS | Slower iteration; Rust compile times | Similar to Commander but more opinionated |
| **Agent legibility** | Agents (Claude, Codex) understand TS deeply | Agents handle Rust well but TS has more training data | Extra framework concepts to learn |
| **Plugin/skill loading** | Dynamic `import()` for skills; trivial | Requires compilation or WASM for plugins | Built-in plugin system but heavyweight |
| **Binary distribution** | Optional via `pkg` or `bun build --compile` | Native binary, zero runtime deps | Needs Node.js runtime |
| **Startup time** | ~100-200ms (acceptable for CLI) | ~5ms (faster) | ~300-500ms (slower) |

**Why not Rust for the CLI?** The harness engineering philosophy emphasizes "boring" technologies that agents can model well. While Rust would give better startup time and a self-contained binary, the cost is a split ecosystem: Tauri is already Rust (we get Rust there), but the orchestrator logic heavily interfaces with Claude Code and Codex (both Node.js tools). Keeping the CLI in TypeScript avoids a serialization boundary between the orchestrator and the CLI layer.

**Why not Oclif?** Oclif adds substantial framework overhead (class-based commands, lifecycle hooks, plugin registry). Commander.js is lighter, closer to the metal, and easier for agents to reason about. If we need Oclif-level features later (auto-generated help, plugin marketplace), we can migrate incrementally.

### UI: Tauri (Rust Backend + Web Frontend)

**Decision**: Tauri 2.x with React + TypeScript frontend

**Why Tauri over Electron?**
- **Binary size**: ~5 MB vs ~150 MB. Coda is a developer tool — lean installs matter.
- **Memory**: Uses the system webview (WebKit on macOS, WebView2 on Windows) instead of bundling Chromium.
- **Rust backend**: Gives us a performant sidecar that can handle file watching, subprocess management, and IPC without Node.js overhead.
- **Security**: Tauri's permission system restricts what the frontend can access (file system, shell, network). This aligns with our sandboxing requirements.

**Frontend**: React + TypeScript. This is the most agent-legible frontend stack. Agents produce high-quality React code reliably. We'll use Tailwind CSS for styling (atomic classes are easy for agents to compose).

**State management**: Zustand (lightweight, no boilerplate) for UI state. Server state (plans, agent runs) flows through Tauri IPC commands.

### Agent Runtime

Both Claude Code and Codex are invoked as **CLI subprocesses**. This is intentional:

- **No SDK lock-in**: We shell out to `claude` and `codex` binaries. If APIs change, we update the subprocess invocation, not deep library integrations.
- **Stream processing**: Both tools stream output to stdout. We parse this stream for progress events, errors, and results.
- **Isolation**: Each agent run is a separate process with its own working directory (git worktree). A hung agent can be killed cleanly.
- **Configuration**: Agent behavior is controlled via `CLAUDE.md`, `AGENTS.md`, and CLI flags — all repository-local, all version-controlled.

### Storage: Local-First (File-Based + SQLite Hybrid)

See [ADR-007](#9-adr-007-local-first-data-architecture) for the full rationale. Summary:

- **Plans, solutions, brainstorms**: Markdown files with YAML frontmatter in `docs/`. These are the system of record, version-controlled in git.
- **Agent run state, event log, search index**: SQLite database at `.coda/state.db`. This is local, ephemeral (can be rebuilt from files), and fast to query.
- **User preferences**: YAML/TOML config files at `~/.config/coda/` (global) and `.coda/config.yaml` (per-project).

### Communication

| Path | Mechanism | Why |
|---|---|---|
| CLI ↔ Orchestrator | In-process function calls | Same Node.js process; no serialization overhead |
| Tauri UI ↔ Orchestrator | Tauri IPC (invoke commands) or local HTTP (localhost:PORT) | Tauri IPC is type-safe and fast; HTTP fallback enables the CLI to also serve UI data |
| Coda → Slack | Outbound HTTPS webhooks | Simplest integration; no bot server to host |
| Slack → Coda | Incoming webhook to local server (dev) or Slack socket mode | Socket mode avoids public URL requirement |
| Coda ↔ Jira/Linear | REST API via adapter | Standard integration; supports polling and webhooks |

---

## 3. ADR-001: Agent Orchestration Strategy

### Status
Accepted

### Context

Coda manages two AI agent backends with different strengths:
- **Claude Code**: Excels at general reasoning, planning, research, code review, and communication tasks.
- **Codex**: Excels at coding, debugging, troubleshooting, and structured code reviews (per user preference in requirements).

The system needs to:
1. Route tasks to the appropriate agent based on task type.
2. Support parallel execution of independent subtasks (e.g., multiple review agents).
3. Handle agent failures gracefully (timeouts, errors, inconsistent output).
4. Allow the compound loop (plan → work → review → compound) to compose these agents.

### Options Considered

#### Option A: Centralized Orchestrator (chosen)

A single orchestrator component owns all task routing, scheduling, and state management. Agents are stateless workers invoked by the orchestrator.

```
                ┌───────────────────┐
                │   Orchestrator    │
                │                   │
                │  ┌─────────────┐  │
                │  │   Router    │  │   Routes by task type
                │  └──────┬──────┘  │
                │         │         │
                │  ┌──────▼──────┐  │
                │  │  Scheduler  │  │   Manages concurrency
                │  └──────┬──────┘  │
                │         │         │
                │  ┌──────▼──────┐  │
                │  │  State Mgr  │  │   Tracks progress
                │  └──────┬──────┘  │
                └─────────┼─────────┘
                    ┌─────┴─────┐
                    ▼           ▼
              ┌──────────┐ ┌──────────┐
              │  Claude   │ │  Codex   │
              │  Code     │ │          │
              └──────────┘ └──────────┘
```

#### Option B: Decentralized Peer Agents

Agents communicate directly with each other. Claude can delegate to Codex and vice versa. No central coordinator.

#### Option C: Hybrid (orchestrator + agent-to-agent)

A coordinator for high-level flow, but agents can spawn sub-agents directly (like Claude Code's existing subagent system).

### Decision

**Option A: Centralized Orchestrator** with a clean extension point for Option C in the future.

### Rationale

- **Predictability**: A centralized orchestrator makes the system debuggable. Every task routing decision is logged in one place. When something fails, there's one place to look.
- **Human oversight**: The compound engineering philosophy requires that plans are the unit of work. The orchestrator is where plan state lives. Decentralized agents would fragment plan state across processes.
- **Simplicity for Milestone 1**: A centralized model is simpler to build and test. We can introduce agent-to-agent delegation later without breaking the existing model.
- **Why not Option B**: Fully decentralized agents create coordination problems (deadlocks, redundant work, lost state). The harness engineering post explicitly warns that "corrections are cheap, and waiting is expensive" — but only when you can track what's happening.
- **Why not Option C immediately**: The hybrid model is the eventual target (Claude Code already does subagent spawning). But starting there adds complexity before we've validated the core loop. We'll migrate to Option C when we have enough usage data to know which agent-to-agent patterns are worth encoding.

### Task Routing Rules

```
Task Type           → Agent        Reasoning
────────────────────────────────────────────────────────
Planning            → Claude Code  Requires broad reasoning, research synthesis
Coding              → Codex        Specialized for implementation
Debugging           → Codex        Better at root cause analysis in code
Code Review         → Codex        Structured review is a Codex strength
General Research    → Claude Code  Broad knowledge, web search
Documentation       → Claude Code  Writing quality
Architecture        → Claude Code  Systems thinking
Test Writing        → Codex        Close to implementation
Brainstorming       → Claude Code  Creative, divergent thinking
```

These mappings are configurable per-project in `.coda/config.yaml` under `agent.routing`.

### Failure Handling

1. **Timeout**: Each agent invocation has a configurable timeout (default: 30 minutes for work tasks, 5 minutes for review). On timeout, the orchestrator kills the subprocess, logs the partial output, and emits an alert.
2. **Error exit**: If the agent process exits non-zero, the orchestrator captures stderr, logs it, and either retries (up to 2 retries for transient failures) or escalates to the human.
3. **Inconsistent output**: The orchestrator validates agent output against expected schemas (e.g., a plan must have YAML frontmatter, a review must have prioritized findings). Malformed output triggers a retry with explicit formatting instructions.
4. **Escalation**: After retries are exhausted, the orchestrator emits an `escalation_needed` alert and pauses the pipeline. The human can intervene via CLI, UI, or Slack.

### Consequences

- **Pro**: Clear debugging story. Every agent invocation is a logged subprocess with captured stdin/stdout/stderr.
- **Pro**: Easy to add new agent providers (e.g., a future GPT-5 agent) — implement the provider interface, add routing rules.
- **Con**: The orchestrator is a single point of failure. If it crashes, all in-flight agent runs are orphaned. Mitigation: persist run state to SQLite so runs can be resumed.
- **Con**: Centralized routing may become a bottleneck if task types proliferate. Mitigation: routing rules are data-driven (config file), not hard-coded.

---

## 4. ADR-002: Repository Knowledge Architecture

### Status
Accepted

### Context

The harness engineering philosophy is explicit: **"the repository is the system of record"** and **"what Codex can't see doesn't exist."** The compound engineering philosophy adds that **"each unit of work should make subsequent units easier."**

Coda must structure the repository so that:
1. Agents can navigate from a small entry point to deep context (progressive disclosure).
2. Plans, solutions, and brainstorms are first-class versioned artifacts.
3. The knowledge base is mechanically validated (linters, CI).
4. Solved problems are searchable and compound into future work.

### Decision

#### Entry Points: CLAUDE.md and AGENTS.md

```
CLAUDE.md    — Agent instructions, preferences, patterns, project context.
               Read by Claude Code at session start.
               ~100-200 lines max. Acts as table of contents.
               Points to deeper docs/ files for specifics.

AGENTS.md    — Agent-specific operating instructions for Codex.
               Same principle: short map, not encyclopedia.
```

Both files are maintained by Coda's compound step. When `/workflows:compound` runs, it may append new patterns to `CLAUDE.md` or create new doc files and add pointers.

#### Directory Structure

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

#### YAML Frontmatter Standard

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

#### Context Loading Strategy

When an agent starts a task, the orchestrator builds its context window:

1. **Always loaded**: `CLAUDE.md` or `AGENTS.md` (depending on agent).
2. **Task-relevant**: The plan being executed, plus any plans it references.
3. **Search-based**: Query the Knowledge Index for solutions matching the task's tags/category. Load top 3-5 most relevant solutions.
4. **On-demand**: The agent can request more context via tool calls (read files, search solutions).

This implements progressive disclosure: start small, go deeper only when needed.

#### Mechanical Validation

A CI job (`coda-docs-lint`) validates the knowledge base:

- All files in `docs/` have valid YAML frontmatter.
- All `related:` links resolve to existing files.
- No `status: active` docs older than 30 days without an update (staleness check).
- `index.md` files are up to date (list all files in their directory).
- `CLAUDE.md` stays under 200 lines.
- Solution categories match a defined taxonomy in `.coda/config.yaml`.

### Consequences

- **Pro**: Agents always have a consistent, structured knowledge base. The harness principle of "repository as system of record" is directly fulfilled.
- **Pro**: The compound step has a clear target: write solutions to `docs/solutions/`, update `CLAUDE.md`, and the system gets smarter.
- **Pro**: Mechanical validation catches rot early (stale docs, broken links, missing frontmatter).
- **Con**: Requires discipline to maintain. Mitigation: the compound step automates most knowledge capture, and a recurring doc-gardening task (inspired by harness engineering) scans for drift.
- **Con**: Frontmatter schema changes require migration. Mitigation: keep the schema minimal and additive.

---

## 5. ADR-003: Alert and Notification System

### Status
Accepted

### Context

The compound engineering loop requires human judgment at specific points: plan approval, error escalation, review triage, and completion notification. The requirements specify Slack as the alert channel.

The system must balance:
- **Timeliness**: Blocking tasks (plan approval) should reach the human quickly.
- **Noise reduction**: Status updates shouldn't create alert fatigue.
- **Actionability**: Alerts should include enough context and action buttons for the human to respond without switching to another tool.

### Decision: Webhook-First Architecture with Slack Socket Mode

#### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐
│  Orchestrator    │────▶│  Alert Router    │────▶│  Slack API    │
│  (emits events)  │     │                 │     │               │
└─────────────────┘     │  - Priority     │     │  - Webhooks   │
                        │  - Routing      │     │  - Messages   │
                        │  - Batching     │     │  - Actions    │
                        │  - Quiet hours  │     └───────┬───────┘
                        └─────────────────┘             │
                                                        │ (action callbacks)
                        ┌─────────────────┐             │
                        │  Action Handler │◀────────────┘
                        │  (Socket Mode)  │
                        │                 │────▶ Orchestrator
                        └─────────────────┘     (processes decision)
```

**Why webhooks, not a full Slack bot?**

A Slack bot requires a persistent server process, OAuth app installation, and a public URL for event subscriptions. This is heavyweight for a developer tool that runs locally. Instead:

- **Outbound**: Use Slack Incoming Webhooks for message delivery. Simple, no server needed.
- **Inbound (actions)**: Use Slack Socket Mode. Socket Mode establishes a WebSocket connection from the client (Coda) to Slack — no public URL required. When a user clicks an action button in Slack, the event arrives over the WebSocket.
- **Fallback**: If Socket Mode isn't available (e.g., the user hasn't set up a Slack app), alerts degrade to webhook-only (no action buttons, just text with instructions to approve via CLI or UI).

#### Alert Types and Priority

| Alert Type | Priority | Channel | Batching |
|---|---|---|---|
| `approval_needed` (plan review) | P1 — Immediate | Slack DM | None |
| `error_escalation` (agent failed after retries) | P1 — Immediate | Slack DM | None |
| `execution_complete` (work phase done, PR ready) | P2 — Standard | Slack DM or channel | 5-minute window |
| `review_complete` (review findings ready) | P2 — Standard | Slack DM or channel | 5-minute window |
| `status_update` (step N of M complete) | P3 — Low | Slack channel only | 15-minute digest |
| `compound_captured` (new solution documented) | P3 — Low | Slack channel only | Daily digest |

#### Routing Rules

Alerts are routed based on:
1. **Plan ownership**: The person who created the plan receives P1/P2 alerts for that plan.
2. **Team channel**: P3 alerts go to a configured team channel (e.g., `#coda-updates`).
3. **Escalation**: If a P1 alert goes unacknowledged for 15 minutes, escalate to a secondary recipient (configurable).

#### Quiet Hours / Do Not Disturb

Configurable in `~/.config/coda/alerts.yaml`:

```yaml
quiet_hours:
  enabled: true
  start: "22:00"
  end: "08:00"
  timezone: "Asia/Seoul"
  behavior: queue     # queue | suppress | downgrade
  # queue: hold alerts and deliver when quiet hours end
  # suppress: drop P3 alerts, queue P1/P2
  # downgrade: deliver P1 as P2 timing, suppress P3
```

During quiet hours, P1 alerts are never fully suppressed — they're queued and delivered immediately when quiet hours end.

#### Message Format

Slack messages use Block Kit for rich formatting:

```
┌─────────────────────────────────────────┐
│ 📋 Plan Ready for Review                │
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

### Consequences

- **Pro**: No server infrastructure required. Everything runs locally with outbound webhooks and Socket Mode.
- **Pro**: Graceful degradation: if Slack isn't configured, alerts appear in CLI output and UI notifications only.
- **Pro**: Batching reduces noise for non-blocking events.
- **Con**: Socket Mode requires a Slack app (not just a webhook URL). The setup is more involved than a simple webhook. Mitigation: provide a setup wizard (`coda init slack`) that walks through app creation.
- **Con**: Slack is a single channel. If the user wants email or Discord or other channels, we'd need additional adapters. Mitigation: the Alert Router is an internal abstraction — adding channels means implementing a new adapter, not changing the routing logic.

---

## 6. ADR-004: Issue Tracker Integration

### Status
Accepted

### Context

Coda must integrate with external issue trackers (Jira and Linear initially) for bidirectional sync. Plans created in Coda should appear as issues in the tracker, and issues created in the tracker should be pullable into Coda as plans.

The challenge is that Jira and Linear have very different data models, APIs, and sync semantics. We need an abstraction that handles both without becoming a leaky lowest-common-denominator.

### Decision: Adapter Pattern with Event-Driven Sync

#### Abstraction Layer

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

#### Coda's Internal Issue Model (CodaIssue)

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

#### Field Mapping

| Coda Field | Jira Field | Linear Field |
|---|---|---|
| `title` | `summary` | `title` |
| `description` | `description` (Jira wiki → markdown) | `description` (markdown native) |
| `status` | Custom status mapping (configurable) | Workflow state mapping (configurable) |
| `priority` | `priority` (P1→Highest, P2→High, P3→Medium) | `priority` (1→Urgent, 2→High, 3→Medium) |
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

#### Sync Strategy: Event-Driven with Polling Fallback

**Primary (when available)**: Jira webhooks / Linear webhooks. The tracker sends events when issues change. Coda receives them (via the same Socket Mode or local server used for Slack actions) and processes the delta.

**Fallback**: Polling on a configurable interval (default: 5 minutes). Query the tracker API for issues updated since the last sync timestamp.

**Why event-driven first?**
- Lower latency: changes appear in Coda within seconds.
- Lower API usage: no wasted polling requests when nothing changed.
- But webhooks require network reachability, which may not exist on a developer's laptop. Hence the polling fallback.

#### Conflict Resolution

Bidirectional sync creates the possibility of conflicting edits. The strategy:

1. **Last-write-wins with hash check**: Each sync stores a `syncHash` (hash of the synced state). Before writing, compare the current remote state's hash to the stored hash. If they match, no conflict — apply the update. If they differ, a conflict exists.
2. **Conflict behavior (configurable)**:
   - `coda_wins`: Coda's state overwrites the tracker. Use when Coda is the source of truth.
   - `tracker_wins`: The tracker's state overwrites Coda. Use when the tracker is the source of truth.
   - `manual`: Alert the user and let them resolve. Default for Milestone 3.
3. **Conflict scope**: Only field-level conflicts are tracked. If Coda changes `status` and Jira changes `labels`, there's no conflict — both changes apply.

### Consequences

- **Pro**: Adapter pattern makes adding new trackers (GitHub Issues, Notion, etc.) a matter of implementing one interface.
- **Pro**: Coda's internal model is richer than any single tracker. We map down to tracker fields, not up from them.
- **Pro**: Event-driven sync is responsive; polling fallback means it always works.
- **Con**: Jira's API is notoriously complex (wiki markup, custom fields, workflow transitions). The Jira adapter will be the most maintenance-heavy component. Mitigation: scope Milestone 3 to a specific Jira project type (Scrum or Kanban, not both).
- **Con**: Bidirectional sync is inherently complex. Mitigation: start with unidirectional (Coda → Tracker) in Milestone 3 and add reverse sync as a follow-up.

---

## 7. ADR-005: CLI Architecture

### Status
Accepted

### Context

The CLI is the primary interface for engineers interacting with Coda. It must support the compound engineering loop (plan → work → review → compound), be extensible with custom agents and skills, and integrate tightly with the agent orchestrator.

### Decision: Command Groups Mapping to the Compound Loop

#### Command Structure

```
coda
├── plan <description>         # /workflows:plan — create a plan
├── brainstorm <topic>         # /workflows:brainstorm — explore ideas
├── work                       # /workflows:work — execute approved plan
├── review [PR#]               # /workflows:review — multi-agent review
├── compound                   # /workflows:compound — document solution
├── lfg <description>          # Full pipeline: plan → work → review → compound
│
├── triage                     # Interactive finding triage
├── resolve                    # Auto-resolve triaged findings
│
├── status                     # Show current plan/agent status
├── plans                      # List plans (active, completed)
│   ├── list                   # List all plans
│   ├── show <id>              # Show plan details
│   ├── approve <id>           # Approve a plan
│   └── reject <id>            # Reject a plan with feedback
│
├── agents                     # Agent management
│   ├── list                   # List available agents
│   ├── status                 # Show running agents
│   └── kill <id>              # Stop a running agent
│
├── tracker                    # Issue tracker commands
│   ├── sync                   # Trigger manual sync
│   ├── link <plan> <issue>    # Link a plan to a tracker issue
│   └── status                 # Show sync status
│
├── config                     # Configuration management
│   ├── init                   # Initialize Coda in a project
│   ├── set <key> <value>      # Set config value
│   └── show                   # Show current config
│
├── alert                      # Alert management
│   ├── test                   # Send a test alert
│   └── config                 # Configure alert preferences
│
└── skill                      # Skill management
    ├── list                   # List available skills
    └── run <skill> [args]     # Run a specific skill
```

#### Plugin and Skill System

Skills are markdown files that define domain expertise. They live in:
1. `.coda/skills/` — project-specific skills
2. `~/.config/coda/skills/` — global user skills
3. Built-in skills shipped with Coda

A skill file:

```markdown
---
name: our-design-system
description: Design system patterns and conventions
triggers: [ui, design, component, styling]
---

# Our Design System

## Colors
- Primary: #4F46E5
...
```

The `triggers` field tells the orchestrator when to auto-load this skill into agent context. When a plan mentions "UI" or "component", the design system skill is automatically included.

#### Extension Points

1. **Custom agents**: Drop an agent definition (markdown with system prompt + tool permissions) into `.coda/agents/`. The orchestrator discovers and routes to them.
2. **Custom skills**: Drop a skill file into `.coda/skills/`. Loaded based on trigger matching or explicit invocation.
3. **Hooks**: Shell commands that run at lifecycle points (pre-plan, post-work, pre-review, post-compound). Defined in `.coda/config.yaml`:

```yaml
hooks:
  post-work:
    - command: "pnpm lint"
      on_failure: block    # block | warn | ignore
    - command: "pnpm typecheck"
      on_failure: block
  post-compound:
    - command: "pnpm run docs-lint"
      on_failure: warn
```

#### Configuration Layers

Configuration is resolved with precedence (highest first):
1. CLI flags (`--agent claude`)
2. Environment variables (`CODA_AGENT=claude`)
3. Project config (`.coda/config.yaml`)
4. User global config (`~/.config/coda/config.yaml`)
5. Built-in defaults

### Consequences

- **Pro**: Command structure mirrors the compound loop. New users can learn `coda plan`, `coda work`, `coda review`, `coda compound` and immediately be productive.
- **Pro**: Skill and hook systems allow deep customization without forking Coda.
- **Pro**: Configuration layering follows established CLI conventions (12-factor app style).
- **Con**: The command surface area is large. Mitigation: `coda lfg` is the "just do everything" command for users who don't want to learn subcommands.
- **Con**: Skill trigger matching could produce false positives (loading irrelevant skills). Mitigation: triggers are opt-in and can be tuned. The agent can also ignore irrelevant context.

---

## 8. ADR-006: Human-in-the-Loop Protocol

### Status
Accepted

### Context

The harness engineering philosophy is clear: **"Humans steer. Agents execute."** The compound engineering philosophy adds: **"Plan and review should comprise 80% of an engineer's time."** This means the system must have well-defined points where human judgment is required, and the protocol for obtaining that judgment must be frictionless.

### Decision: State Machine with Multi-Channel Approval

#### Plan Lifecycle State Machine

```
                    ┌──────────┐
         create     │          │
        ────────▶   │  draft   │
                    │          │
                    └────┬─────┘
                         │ submit for review
                         ▼
                    ┌──────────┐
                    │          │  ◀──── reject (with feedback)
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
         │         └────┬─────┘  error → review (re-plan)
         │              │ all steps done
         │              ▼
         │         ┌──────────┐
         │         │          │
         └────────▶│completed │
                   │          │
                   └──────────┘
```

Valid transitions:
- `draft` → `review` (plan submitted)
- `review` → `approved` (human approves)
- `review` → `draft` (human rejects with feedback; plan needs revision)
- `approved` → `executing` (work begins)
- `executing` → `completed` (all steps succeed)
- `executing` → `review` (error escalation; re-plan needed)
- Any state → `completed` (manual close by human)

#### Approval Channels

A human can approve/reject a plan through three channels:

1. **CLI prompt**: `coda plans approve <id>` or interactive prompt during `coda plan`.
2. **Tauri UI**: Dedicated plan review screen with diff view, annotation tools, and approve/reject buttons.
3. **Slack action**: Button in the Slack notification message (via Socket Mode callback).

All three channels converge on the same Plan Manager API. The first approval wins (no double-approval needed).

#### Decision Points Requiring Human Judgment

| Decision Point | Trigger | Default Behavior if No Response |
|---|---|---|
| Plan approval | Plan enters `review` state | Wait indefinitely (with escalation reminders) |
| Error escalation | Agent fails after retries | Wait indefinitely (with escalation reminders) |
| Review triage | Review findings generated | Auto-proceed if all findings are P3; wait for P1/P2 |
| Destructive action | Agent wants to delete/overwrite/force-push | Always block; require explicit human approval |
| Merge | PR ready to merge | Wait for human (never auto-merge without config) |

#### Timeout and Escalation

```yaml
# .coda/config.yaml
approval:
  timeout_minutes: 60          # Reminder after 60 min
  escalation_minutes: 240      # Escalate to secondary after 4 hours
  escalation_target: "@alice"  # Slack handle or Coda user
  auto_approve:
    p3_only_reviews: true      # Auto-approve reviews with only P3 findings
    plans_by: ["@self"]        # Auto-approve plans created by self (solo dev mode)
```

The escalation chain:
1. T+0: Alert sent to plan owner.
2. T+60min: Reminder sent to plan owner.
3. T+240min: Alert sent to escalation target.
4. T+480min: Second reminder to escalation target.

### Consequences

- **Pro**: Clear state machine makes plan lifecycle predictable and debuggable.
- **Pro**: Multi-channel approval reduces friction: approve from wherever you are (terminal, desktop, phone via Slack).
- **Pro**: Auto-approve for low-risk scenarios (P3-only reviews) respects "corrections are cheap" principle.
- **Con**: Three approval channels means three codepaths to maintain. Mitigation: all three call the same Plan Manager method; the channel-specific code is thin.
- **Con**: "Wait indefinitely" for critical approvals could block the pipeline. Mitigation: escalation chain ensures someone gets notified.

---

## 9. ADR-007: Local-First Data Architecture

### Status
Accepted

### Context

Coda stores several categories of data:
1. **Plans, solutions, brainstorms**: The knowledge base (long-lived, human-readable, version-controlled).
2. **Agent run state**: Which agent is running, what step it's on, stdout/stderr capture (ephemeral, machine-readable).
3. **Event log**: History of all orchestrator events for debugging (append-only, queryable).
4. **Search index**: Precomputed index over the knowledge base for fast context loading.
5. **User preferences**: Alert settings, agent routing overrides, quiet hours.

### Options Considered

#### Option A: Pure File-Based (Markdown + YAML)

Everything is a file. Agent state is a YAML file. Events are appended to a log file. Search is `grep`.

#### Option B: Pure SQLite

Everything is in a SQLite database. Plans are rows, not files. Solutions are rows.

#### Option C: Hybrid — Files for Knowledge, SQLite for State (chosen)

Knowledge base artifacts (plans, solutions, brainstorms) are markdown files with YAML frontmatter in `docs/`. Operational data (agent state, events, search index) is in SQLite.

### Decision

**Option C: Hybrid**

### Rationale

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

#### Schema (SQLite)

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

#### Multi-Device Considerations

Coda is local-first by design. For multi-device scenarios:

- **Knowledge base**: Already synced via git (push/pull).
- **SQLite state**: Not synced. Each device has its own `.coda/state.db`. This is acceptable because operational state (agent runs, events) is device-specific.
- **User preferences**: Global config at `~/.config/coda/` is not synced by default. Users can symlink or use dotfile managers if desired.
- **Future**: If cloud sync is needed (e.g., start a plan on laptop, approve on phone), we'd add an optional sync layer over the SQLite state. This is not in scope for Milestones 1-3.

### Consequences

- **Pro**: Knowledge artifacts are git-native, human-readable, and agent-legible.
- **Pro**: Operational data is fast to query and handles concurrency.
- **Pro**: The search index makes "find relevant solutions" fast without complex tooling.
- **Pro**: Rebuilding state from files means the SQLite database is a cache, not a source of truth. Losing it is inconvenient, not catastrophic.
- **Con**: Two storage systems to maintain. Mitigation: clear separation — files are for humans/agents/git, SQLite is for machines.
- **Con**: The FTS index must be kept in sync with file changes. Mitigation: rebuild index on `coda` startup (fast for typical repo sizes) or watch for file changes.

---

## 10. Security Considerations

### Agent Sandboxing

Agents (Claude Code, Codex) run as subprocesses with controlled permissions:

| Capability | Default | Configurable? |
|---|---|---|
| Read any file in repo | Allowed | No (required for function) |
| Write files in repo | Allowed | Yes (can restrict to specific dirs) |
| Execute shell commands | Allowed (with allowlist) | Yes (command allowlist in config) |
| Network access | Allowed (outbound only) | Yes (can restrict to specific hosts) |
| Read files outside repo | Denied | Yes (can allowlist paths) |
| Write files outside repo | Denied | No |
| Access `.env` / secrets | Denied (excluded from context) | No |
| `git push` | Denied (requires human) | Yes (can enable for trusted flows) |
| `git push --force` | Denied always | No |
| Delete branches | Denied (requires human) | Yes |
| Destructive commands (`rm -rf`, `reset --hard`) | Denied | Yes (can enable per-command) |

Agent sandboxing is enforced at two levels:
1. **Orchestrator level**: The orchestrator controls what tools/commands are available to the agent subprocess.
2. **Agent level**: Claude Code's permission system and Codex's sandbox provide additional guardrails.

### Secret Management

```
┌─────────────────────────────────────────────┐
│           Secret Storage Hierarchy           │
│                                              │
│  1. System keychain (macOS Keychain,         │
│     credential-store) — preferred            │
│                                              │
│  2. Environment variables                    │
│     (CODA_SLACK_WEBHOOK, CODA_JIRA_TOKEN)    │
│                                              │
│  3. Encrypted config file                    │
│     (~/.config/coda/secrets.enc)             │
│     Encrypted with a key derived from        │
│     system keychain                          │
│                                              │
│  NEVER in:                                   │
│  - .coda/config.yaml (in repo)              │
│  - CLAUDE.md / AGENTS.md                    │
│  - Any file tracked by git                  │
└─────────────────────────────────────────────┘
```

Secrets needed:
- Anthropic API key (for Claude Code)
- OpenAI API key (for Codex)
- Slack webhook URL / Slack app token
- Jira/Linear API tokens

The CLI's `coda config init` wizard guides users through setting up secrets in the system keychain.

### Production Access Boundaries

| Access Level | Allowed Actions | Use Case |
|---|---|---|
| **Read-only** | View logs, metrics, error tracking | Agent debugging (harness engineering pattern) |
| **Local write** | Modify files, run tests, create branches | Normal development |
| **Remote write** | Push branches, create PRs | Requires human approval |
| **Destructive** | Force push, delete branches, drop data | Always requires explicit human approval per action |

### Audit Logging

Every action taken by an agent or the orchestrator is logged to the `events` table in SQLite:

```json
{
  "timestamp": "2026-02-13T14:30:00Z",
  "event_type": "agent_command_executed",
  "source": "orchestrator",
  "agent_run_id": "run_abc123",
  "payload": {
    "command": "git commit -m 'feat: add email notifications'",
    "exit_code": 0,
    "duration_ms": 1200
  }
}
```

The audit log supports:
- Post-mortem debugging: "What did the agent do before the test broke?"
- Compliance: "Which agent modified this file and when?"
- Trust calibration: Review agent behavior patterns over time to tune permissions.

Logs are retained for 30 days locally (configurable). They are not sent to any external service.

---

## 11. Milestone Architecture Mapping

### Milestone 1: Basic Functionality

**Goal**: Working compound loop (plan → work → review → compound) via Claude Code skills and subagents, with basic Tauri UI for plan annotation.

#### Components Needed

```
┌─────────────────┐     ┌──────────────────────────┐
│   Coda CLI       │     │   Tauri UI (basic)        │
│                 │     │                          │
│  - plan          │     │  - Plan viewer           │
│  - work          │     │  - Plan annotation       │
│  - review        │     │  - Status dashboard      │
│  - compound      │     │                          │
│  - status        │     └──────────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   Agent Orchestrator     │
│   (basic)               │
│                         │
│   - Claude Code only    │
│   - Sequential execution│
│   - File-based state    │
└─────────────────────────┘
```

**What's minimal**:
- CLI with core compound loop commands (`plan`, `work`, `review`, `compound`).
- Agent orchestrator routing everything to Claude Code (Codex routing deferred).
- Plan Manager with file-based state (YAML frontmatter status field).
- Knowledge base structure (`docs/plans/`, `docs/solutions/`, `docs/brainstorms/`).
- Basic Tauri UI: display plans, allow text annotations, show agent status.
- No SQLite yet — file-based state is sufficient for single-user, single-agent.
- No Slack alerts — CLI prompts only.
- No issue tracker — plans are the work items.

**Architecture decisions active**: ADR-002 (Knowledge), ADR-005 (CLI, partial), ADR-007 (Files only, no SQLite).

### Milestone 2: CLI + Alert System

**Goal**: Full CLI with advanced commands, Codex integration, Slack alerts, and enhanced orchestration.

#### Components Added

```
┌─────────────────┐     ┌──────────────────────────┐
│   Coda CLI       │     │   Tauri UI (enhanced)     │
│   (full)        │     │                          │
│  + lfg           │     │  + Alert preferences UI  │
│  + triage        │     │  + Agent run history     │
│  + resolve       │     │  + Approval buttons      │
│  + agents mgmt   │     │                          │
│  + skill system  │     └──────────────────────────┘
│  + hooks         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐     ┌──────────────────┐
│   Agent Orchestrator     │     │   Alert System    │
│   (full)                │     │                  │
│                         │     │  - Slack webhooks │
│   + Codex provider      │────▶│  - Socket Mode   │
│   + Parallel execution  │     │  - Batching      │
│   + SQLite state        │     │  - Quiet hours   │
│   + Failure handling    │     └──────────────────┘
│   + Search index (FTS)  │
└─────────────────────────┘
```

**What's added**:
- Codex agent provider with task routing rules (ADR-001 fully active).
- SQLite for agent run state, event log, and FTS index (ADR-007 fully active).
- Slack alert system with webhooks and Socket Mode (ADR-003 active).
- Human-in-the-loop protocol with multi-channel approval (ADR-006 active).
- Skill and hook systems (ADR-005 fully active).
- Parallel agent execution (multiple review agents simultaneously).
- `coda lfg` end-to-end pipeline.

**Architecture decisions active**: All except ADR-004 (Issue Tracker).

### Milestone 3: Jira + Enhanced UI

**Goal**: Bidirectional issue tracker sync, full-featured Tauri UI for human-in-the-loop workflows.

#### Full System Architecture

```
┌─────────────────┐     ┌──────────────────────────────────┐
│   Coda CLI       │     │   Tauri UI (full)                 │
│   (full)        │     │                                  │
│  + tracker cmds  │     │  + Issue tracker dashboard       │
│                 │     │  + Bidirectional sync status     │
│                 │     │  + Rich plan editor              │
│                 │     │  + Review finding browser        │
│                 │     │  + Agent timeline visualization  │
└────────┬────────┘     └──────────────┬───────────────────┘
         │                             │
         ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Core Engine                           │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │ Agent Orchestrator│  │  Plan Manager              │   │
│  └──────────────────┘  └────────────────────────────┘   │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │ Knowledge Index   │  │  Alert System              │   │
│  └──────────────────┘  └────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Issue Tracker Bridge                    │   │
│  │  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Jira Adapter │  │Linear Adapter│              │   │
│  │  └──────────────┘  └──────────────┘              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**What's added**:
- Issue Tracker Bridge with Jira adapter (ADR-004 active).
- Linear adapter (same interface, different API mapping).
- Bidirectional sync with conflict resolution.
- Enhanced Tauri UI: issue tracker dashboard, rich plan editor with inline annotation, review finding browser with filtering/sorting, agent timeline visualization.
- `coda tracker` commands for manual sync control and linking.

**Architecture decisions active**: All ADRs fully active.

### Milestone Dependency Graph

```
Milestone 1 (Basic)
  │
  │  Adds: Codex, SQLite, Alerts, Skills, Hooks, Parallel execution
  │
  ▼
Milestone 2 (CLI + Alerts)
  │
  │  Adds: Issue Tracker Bridge, Enhanced UI
  │
  ▼
Milestone 3 (Jira + Enhanced UI)
```

Each milestone is independently shippable. Milestone 1 is a useful tool on its own (compound loop with Claude Code). Milestone 2 adds the "agent fleet" capabilities. Milestone 3 integrates with the existing engineering workflow (issue trackers).

---

## Appendix: Decision Log

| ADR | Decision | Key Tradeoff |
|---|---|---|
| ADR-001 | Centralized orchestrator | Simplicity and debuggability over agent autonomy |
| ADR-002 | Repository as knowledge system of record | Maintenance discipline over configuration simplicity |
| ADR-003 | Webhook + Socket Mode for Slack | No server infrastructure over richer bot capabilities |
| ADR-004 | Adapter pattern with event-driven sync | Abstraction overhead over direct integration speed |
| ADR-005 | Commander.js CLI mapping to compound loop | Learnability over minimal surface area |
| ADR-006 | State machine with multi-channel approval | Protocol complexity over single-channel simplicity |
| ADR-007 | Files for knowledge, SQLite for state | Two systems over one, gaining git-native knowledge |
