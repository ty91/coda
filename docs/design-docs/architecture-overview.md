---
title: Architecture Overview
date: 2026-02-14
status: draft
tags: [architecture, overview, technical]
---

# Coda -- Architecture Overview

> Extracted from the Technical Architecture document. ADR sections have been split into
> individual files under `docs/design-docs/`. This file covers the system overview,
> technology stack rationale, security considerations, and milestone mapping.

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

- **CLI <-> Orchestrator**: Direct function calls within the same Node.js process. The CLI is a thin shell over the orchestrator.
- **Tauri UI <-> Orchestrator**: Tauri IPC commands. The Rust backend invokes the orchestrator (either as a sidecar process or via a local HTTP API).
- **Orchestrator -> Agent Providers**: Subprocess spawning. Claude Code and Codex are invoked as CLI subprocesses with structured prompts piped in and results streamed back.
- **Orchestrator -> Alert System**: Fire-and-forget event emission. The alert system consumes events and decides routing independently.
- **Orchestrator <-> Issue Tracker**: Async adapter calls. The bridge polls or listens for events and applies bidirectional field mapping.

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
  │  Emits "plan_ready_for_review" event -> Slack notification
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
  │  Routes coding tasks -> Codex
  │  Routes general/research -> Claude Code
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
  │  Webhook callback -> Coda local server (or CLI polling)
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
- **Binary size**: ~5 MB vs ~150 MB. Coda is a developer tool -- lean installs matter.
- **Memory**: Uses the system webview (WebKit on macOS, WebView2 on Windows) instead of bundling Chromium.
- **Rust backend**: Gives us a performant sidecar that can handle file watching, subprocess management, and IPC without Node.js overhead.
- **Security**: Tauri's permission system restricts what the frontend can access (file system, shell, network). This aligns with our sandboxing requirements.

**Frontend**: React + TypeScript. This is the most agent-legible frontend stack. Agents produce high-quality React code reliably. We'll use Tailwind CSS for styling (atomic classes are easy for agents to compose).

**State management**: Zustand (lightweight, no boilerplate) for UI state. Server state (plans, agent runs) flows through Tauri IPC commands.

**Project scope model**: The Tauri app treats the active project as first-class runtime context.

- Registered projects are loaded from `~/.coda/config.toml` with optional local overrides in `.coda/config.toml`.
- Project registration is exposed via `register_project` IPC and persists new `[projects.<id>]` entries to `~/.coda/config.toml` with deterministic ordering and atomic replacement.
- Active project selection is persisted at `~/.coda/app-state.toml`.
- Docs IPC (`list_doc_summaries`, `get_doc_document`) resolves paths from the active project's root/docs paths, not from compile-time workspace assumptions.
- Docs watcher runs as active-project single watcher and emits project-scoped `docs_changed` events with `project_id`.

### Agent Runtime

Both Claude Code and Codex are invoked as **CLI subprocesses**. This is intentional:

- **No SDK lock-in**: We shell out to `claude` and `codex` binaries. If APIs change, we update the subprocess invocation, not deep library integrations.
- **Stream processing**: Both tools stream output to stdout. We parse this stream for progress events, errors, and results.
- **Isolation**: Each agent run is a separate process with its own working directory (git worktree). A hung agent can be killed cleanly.
- **Configuration**: Agent behavior is controlled via `CLAUDE.md`, `AGENTS.md`, and CLI flags -- all repository-local, all version-controlled.

### Storage: Local-First (File-Based + SQLite Hybrid)

See [ADR-007: Local-First Data Architecture](./ADR-007-storage.md) for the full rationale. Summary:

- **Plans, solutions, brainstorms**: Markdown files with YAML frontmatter in `docs/`. These are the system of record, version-controlled in git.
- **Agent run state, event log, search index**: SQLite database at `.coda/state.db`. This is local, ephemeral (can be rebuilt from files), and fast to query.
- **User preferences**: TOML config files at `~/.coda/` (global) and `.coda/config.toml` (per-project).

### Communication

| Path | Mechanism | Why |
|---|---|---|
| CLI <-> Orchestrator | In-process function calls | Same Node.js process; no serialization overhead |
| Tauri UI <-> Orchestrator | Tauri IPC (invoke commands) or local HTTP (localhost:PORT) | Tauri IPC is type-safe and fast; HTTP fallback enables the CLI to also serve UI data |
| Coda -> Slack | Outbound HTTPS webhooks | Simplest integration; no bot server to host |
| Slack -> Coda | Incoming webhook to local server (dev) or Slack socket mode | Socket mode avoids public URL requirement |
| Coda <-> Jira/Linear | REST API via adapter | Standard integration; supports polling and webhooks |

---

## Architecture Decision Records

The following ADRs cover the major architectural decisions in detail:

- [ADR-001: Agent Orchestration Strategy](./ADR-001-orchestration.md) -- Centralized orchestrator for task routing, scheduling, and state management.
- [ADR-002: Repository Knowledge Architecture](./ADR-002-knowledge.md) -- Repository as system of record with progressive disclosure.
- [ADR-003: Alert and Notification System](./ADR-003-alerts.md) -- Webhook-first architecture with Slack Socket Mode.
- [ADR-004: Issue Tracker Integration](./ADR-004-issue-tracker.md) -- Adapter pattern with event-driven sync for Jira/Linear.
- [ADR-005: CLI Architecture](./ADR-005-cli.md) -- Command groups mapping to the compound loop.
- [ADR-006: Human-in-the-Loop Protocol](./ADR-006-human-in-loop.md) -- State machine with multi-channel approval.
- [ADR-007: Local-First Data Architecture](./ADR-007-storage.md) -- Files for knowledge, SQLite for operational state.

---

## 3. Security Considerations

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
│     credential-store) -- preferred           │
│                                              │
│  2. Environment variables                    │
│     (CODA_SLACK_WEBHOOK, CODA_JIRA_TOKEN)    │
│                                              │
│  3. Encrypted config file                    │
│     (~/.coda/secrets.enc)                    │
│     Encrypted with a key derived from        │
│     system keychain                          │
│                                              │
│  NEVER in:                                   │
│  - .coda/config.toml (in repo)              │
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

## 4. Milestone Architecture Mapping

### Milestone 1: Basic Functionality

**Goal**: Working compound loop (plan -> work -> review -> compound) via Claude Code skills and subagents, with basic Tauri UI for docs viewing and plan annotation.

#### Components Needed

```
┌─────────────────┐     ┌──────────────────────────┐
│   Coda CLI       │     │   Tauri UI (basic)        │
│                 │     │                          │
│  - plan          │     │  - Docs viewer           │
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
- Basic Tauri UI: browse markdown docs, allow text annotations, show agent status.
- No SQLite yet -- file-based state is sufficient for single-user, single-agent.
- No Slack alerts -- CLI prompts only.
- No issue tracker -- plans are the work items.

**Architecture decisions active**: [ADR-002](./ADR-002-knowledge.md) (Knowledge), [ADR-005](./ADR-005-cli.md) (CLI, partial), [ADR-007](./ADR-007-storage.md) (Files only, no SQLite).

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
│   + Codex provider      │────>│  - Socket Mode   │
│   + Parallel execution  │     │  - Batching      │
│   + SQLite state        │     │  - Quiet hours   │
│   + Failure handling    │     └──────────────────┘
│   + Search index (FTS)  │
└─────────────────────────┘
```

**What's added**:
- Codex agent provider with task routing rules ([ADR-001](./ADR-001-orchestration.md) fully active).
- SQLite for agent run state, event log, and FTS index ([ADR-007](./ADR-007-storage.md) fully active).
- Slack alert system with webhooks and Socket Mode ([ADR-003](./ADR-003-alerts.md) active).
- Human-in-the-loop protocol with multi-channel approval ([ADR-006](./ADR-006-human-in-loop.md) active).
- Skill and hook systems ([ADR-005](./ADR-005-cli.md) fully active).
- Parallel agent execution (multiple review agents simultaneously).
- `coda lfg` end-to-end pipeline.

**Architecture decisions active**: All except [ADR-004](./ADR-004-issue-tracker.md) (Issue Tracker).

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
- Issue Tracker Bridge with Jira adapter ([ADR-004](./ADR-004-issue-tracker.md) active).
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
