---
title: "Coda — Product Requirements Document"
date: 2026-02-13
status: draft
tags: [prd, product, requirements]
---

# Coda — Product Requirements Document

**Version**: 1.0
**Date**: 2026-02-13
**Status**: Draft for Review

---

## 1. Executive Summary

**Coda is an agentic software engineering system that replaces the human as the standalone developer.** It fuses harness engineering — building environments where AI agents do reliable work — with compound engineering — ensuring every unit of work makes the next one easier. The result is a system where humans feed ideas, requirements, and judgment, while agents plan, implement, review, and improve.

Coda spans three surfaces: a TypeScript CLI (the agent's primary interface), a Tauri desktop UI (the human's mission control), and a Slack integration (async notifications and approvals). Together, they form the harness that lets a solo developer or small team operate a fleet of AI agents at the productivity of a much larger organization.

The vision is simple: **humans steer, agents execute, and every unit of work compounds into the next.**

---

## 2. Vision & Philosophy

### 2.1 Harness Engineering Applied to Coda

Harness engineering, pioneered by OpenAI's Codex team, demonstrated that a team of three engineers can drive ~1,500 PRs and a million lines of code with zero manually-written lines. The key insight: **the engineer's job is no longer to write code, but to design environments, specify intent, and build feedback loops that allow agents to do reliable work.**

Applied to Coda, this means:
- **The repository is the system of record.** All knowledge — architecture, plans, conventions, decisions — lives in versioned, agent-readable files. What isn't in the repo doesn't exist.
- **Agent legibility is the goal.** The codebase is optimized for agents to navigate, not just humans. Boring technology wins. Self-describing directory structures. Structured logging.
- **Enforce invariants, not implementations.** Custom linters, structural tests, and CI jobs define what must be true. Within those boundaries, agents have freedom.
- **Feedback loops matter more than code quality.** A mediocre change with strong validation converges on quality. A brilliant change without feedback loops drifts into chaos.
- **Entropy management is continuous, not periodic.** Cleanup agents run daily, not quarterly. Technical debt is a high-interest loan paid down in every PR.

### 2.2 Compound Engineering Applied to Coda

Compound engineering, developed by Every.to's team building five products with primarily single-person engineering teams, demonstrated that the **Plan → Work → Review → Compound** loop makes each cycle of work faster than the last.

Applied to Coda, this means:
- **The Compound step is what separates Coda from every other tool.** Skip it and you're just using AI assistance. Execute it and you're building a system that gets smarter.
- **Plans are the new code.** The plan document is the most important artifact. Code is an output of the plan, not the other way around.
- **The 50/50 rule.** 50% of engineering time should go to features, 50% to system improvement (new agents, documentation, lint rules, skills). System investment has exponential returns.
- **Every unit of work makes subsequent work easier.** Bug fixes eliminate categories of future bugs. Patterns become tools. Solutions become searchable institutional memory.
- **Trust the process, build safety nets.** Don't compensate for distrust by manually reviewing every line. Build verification infrastructure that scales.

### 2.3 Where They Reinforce Each Other

| Harness Principle | Compound Principle | Reinforcement |
|---|---|---|
| Repo as system of record | docs/solutions/ as institutional memory | Both demand repo-local, versioned knowledge |
| Agent legibility | Make environments agent-native | Same goal: agents can navigate without human help |
| Enforce invariants via linters | Encode taste in skills and reviews | Soft rules (skills) graduate to hard rules (linters) |
| Agent-to-agent review loops | 14 specialized review agents | Specialized agents + iterative resolution |
| Progressive agent autonomy | Stage progression (0→5) | Merged into a single adoption framework |

### 2.4 Where They Tension and How Coda Resolves It

| Tension | Harness Says | Compound Says | Coda's Resolution |
|---|---|---|---|
| **Review ownership** | Agent-to-agent; humans optional | Human triage; agents propose, humans decide | Stage-dependent: human triage at Stages 2-3, agent-to-agent at Stages 4-5. The trust dial controls the transition. |
| **Entry file size** | ~100 lines; table of contents only | Grows organically with learnings | CLAUDE.md stays compact (~100-200 lines). Compound step writes to `docs/`, not to CLAUDE.md. A doc gardener enforces the limit. |
| **Enforcement style** | Hard (linters, CI, structural tests) | Soft (skills, agent instructions, review flags) | Graduated: start soft, promote to hard after repeated violations. "This pattern has been flagged 5 times. Create a lint rule?" |
| **Velocity vs. system investment** | Velocity first; corrections are cheap | 50/50 rule; system investment has exponential returns | Maturity-dependent: 70/30 for new projects, 50/50 for established ones. Dashboard tracks and nudges. |

### 2.5 Core Belief

> "Humans steer, agents execute, and every unit of work compounds into the next."

This is not a slogan — it's the design constraint that every feature must satisfy.

---

## 3. User Personas

### 3.1 Solo Developer

**Name**: Alex
**Context**: Building a SaaS product alone. Uses Claude Code and Codex today. Spends too much time on boilerplate, review, and debugging. Wants to ship faster without hiring.

**Goals**:
- Go from idea to merged PR with minimal manual coding.
- Build institutional knowledge so the system gets faster over time.
- Run agents overnight and review results in the morning.

**Pain points**:
- AI tools today don't compound. Each session starts from scratch.
- No way to orchestrate Claude and Codex together.
- Plans exist in their head, not in the repo.

**Stage**: Starts at Stage 2-3, targets Stage 4-5.

### 3.2 Tech Lead

**Name**: Jordan
**Context**: Leading a team of 3-5 engineers. Each engineer runs agents. Needs visibility into what agents are doing across the team. Wants to ensure architectural consistency.

**Goals**:
- Monitor a fleet of agents working on different features.
- Enforce architectural boundaries across agent-generated code.
- Review plans, not code. Approve at the right level of granularity.
- Track quality and technical debt across the codebase.

**Pain points**:
- No visibility into what agents are doing on teammates' machines.
- Architectural drift when multiple agents make independent decisions.
- Alert fatigue from too many notifications.

**Stage**: Operates at Stage 4-5.

### 3.3 Product Manager

**Name**: Sam
**Context**: Feeds ideas and requirements to the engineering team. Reviews output. Doesn't write code. Wants to understand progress and provide feedback on plans.

**Goals**:
- Submit ideas/tickets and see them become PRs.
- Review and annotate plans in a visual interface.
- Track progress without interrupting engineers.
- Approve features from Slack while on the go.

**Pain points**:
- Plans are invisible until a PR appears.
- No way to provide feedback on approach before implementation.
- Status updates require asking engineers directly.

**Stage**: Interacts with Coda through the UI and Slack, not the CLI.

### 3.4 The System Itself (Coda as Its Own User)

**Context**: Coda uses its own compound loop to improve itself. Every bug fixed in Coda goes through Coda's workflow. Every new agent or skill is planned, reviewed, and compounded using the existing system.

**Goals**:
- Self-improvement: each version of Coda is more capable than the last.
- Dog-fooding: Coda is the first user of every feature it ships.
- Compounding: Coda's own development creates the patterns and skills that make future development faster.

This persona is unique to Coda. It means every design decision must pass the test: "Can Coda use this to build itself?"

---

## 4. Problem Statement

### 4.1 Current Pain Points in AI-Assisted Development

1. **No compounding.** Each AI session starts fresh. The lessons from yesterday's bug fix don't improve today's feature work. Knowledge lives in the developer's head, not in the system.

2. **No orchestration.** Developers manually switch between Claude (good at reasoning) and Codex (good at coding). There's no unified system that routes tasks to the right agent automatically.

3. **No feedback loops.** Agents generate code, but there's no systematic validation — no automated review fleet, no performance budgets, no architectural checks. The human is the only quality gate.

4. **Plans are ephemeral.** AI-generated plans exist in chat sessions that vanish. They're not versioned, not reviewable, not referenceable. The most important artifact in agent-assisted development is the least durable.

5. **Alert fatigue or silence.** Either the system interrupts constantly (approve every file change) or it works in silence for 30 minutes and dumps a result. Neither respects human attention.

6. **No institutional memory.** When a team member (human or agent) solves a problem, the solution exists in a PR comment or chat thread. It's never captured in a searchable, reusable form.

### 4.2 Why Existing Tools Aren't Enough Alone

- **Claude Code**: Excellent reasoning and planning, but no built-in compound loop, no persistent knowledge architecture, no multi-agent orchestration.
- **Codex**: Excellent coding and debugging, but no planning framework, no review agent ecosystem, no human-in-the-loop UI.
- **Cursor**: Good inline assistance, but focused on the editor experience. No fleet management, no async workflow, no compound step.

Each tool addresses a piece. None provides the full harness + compound loop.

### 4.3 The Gap

No unified system exists for:
- The complete **Plan → Work → Review → Compound** cycle.
- **Multi-model orchestration** (routing tasks to the right AI).
- **Three-surface experience** (CLI + desktop UI + Slack) with consistent state.
- **Knowledge compounding** that makes each cycle faster than the last.
- **Progressive trust** that adapts to the user's maturity level.

Coda fills this gap.

---

## 5. Product Principles

### From Harness Engineering
- **Agent legibility**: Every aspect of the system — code, docs, logs, metrics — is optimized for agent navigation, not just human reading.
- **Repo as system of record**: All institutional knowledge lives in versioned, repo-local files. Nothing exists outside the repo for agents.
- **Enforce invariants, not implementations**: Define what must be true (linters, tests, structural checks). Let agents choose how to satisfy those constraints.
- **Lint error messages are agent prompts**: Every error includes remediation instructions written for agents to consume and act on.

### From Compound Engineering
- **Every unit compounds**: Bug fixes capture prevention strategies. Patterns become skills. Solutions become searchable memory. Nothing is done once and forgotten.
- **The 50/50 rule**: Invest half of effort in system improvement. Review agents, skills, lint rules, and documentation are as important as features.
- **Plans are the new code**: The plan document is the primary artifact. It's reviewed, versioned, annotated, and referenceable.
- **Teach the system, don't do the work**: Time spent improving agent context pays exponential dividends. Time spent typing code solves only the immediate task.

### From UX Design
- **Frictionless by default**: Zero-flag commands work out of the box. Smart defaults everywhere. Power users discover depth through `--help` and the UI.
- **Ambient awareness**: The system comes to you (status bar, system tray, Slack digest). You don't have to actively monitor.
- **Progressive trust**: Start supervised. Build a track record. Earn autonomy. Trust is given, never assumed.
- **Respect attention**: Every notification costs focus. Spend that budget wisely. Batch, summarize, prioritize.

### From Architecture
- **Local-first**: Plans and solutions are markdown files in git. Operational state is SQLite. No cloud dependency for core functionality.
- **Extensible**: Custom agents, skills, and hooks are dropped into the project. The system discovers and integrates them.
- **Secure by default**: Agents are sandboxed. Secrets never touch the repo. Destructive actions always require human approval.
- **Independently shippable milestones**: Each milestone is a useful product on its own.

---

## 6. Feature Requirements by Milestone

### Milestone 1: Foundation

**Goal**: A working compound loop (Plan → Work → Review → Compound) via CLI and basic UI, using Claude Code as the single agent backend.

**Outcome**: A solo developer can use Coda to plan a feature, have an agent implement it, review the output with basic agent reviewers, and capture learnings — all from a single tool.

#### CLI Core

| Feature | Description | Priority |
|---|---|---|
| `coda plan <description>` | Create a plan from a natural language description. Spawns research subagents to analyze the codebase, framework docs, and best practices. Outputs a structured plan to `docs/plans/`. | P1 |
| `coda work [plan-ref]` | Execute an approved plan. Creates a git worktree for isolation. Runs plan steps sequentially. Validates after each step (tests, lint, typecheck). | P1 |
| `coda review [pr-ref]` | Run 3-5 core review agents in parallel (security, performance, architecture, simplicity, agent-native). Output prioritized findings (P1/P2/P3). | P1 |
| `coda compound` | Capture learnings from completed work. Spawns extraction subagents to identify reusable patterns, root causes, and prevention strategies. Outputs to `docs/solutions/`. | P1 |
| `coda status` | Show current plan status, agent activity, and pending decisions. | P1 |
| `coda brainstorm <topic>` | Lightweight research and interactive Q&A for fuzzy requirements. Outputs to `docs/brainstorms/`. | P2 |
| `coda init` | Initialize Coda in a project. Detect project type, create `docs/` structure, generate initial CLAUDE.md. Max 3 questions. | P1 |

#### Agent Orchestration (Basic)

| Feature | Description | Priority |
|---|---|---|
| Claude Code integration | Invoke Claude Code as a subprocess for all task types. Stream output for progress reporting. | P1 |
| Sequential execution | Execute plan steps one at a time. Validate between steps. | P1 |
| Failure handling | Retry transient failures (up to 2 retries). Escalate persistent failures as CLI prompts. | P1 |
| Context loading | Load CLAUDE.md + relevant plan + top matching solutions into agent context for each task. | P1 |

#### Tauri UI (Basic)

| Feature | Description | Priority |
|---|---|---|
| Plan viewer | Display plans as rendered markdown. Show plan status and metadata. | P1 |
| Plan annotation | Inline comments on plan sections. Section-level approval/rejection. Rejection requires a text reason. | P1 |
| Status dashboard | Show agent activity, pending decisions, and basic health (CI status, test count). | P2 |
| Deep linking | Stable plan IDs. CLI outputs `Open in UI: coda://plans/{id}`. UI shows equivalent CLI command. | P2 |

#### Repository Knowledge Architecture

| Feature | Description | Priority |
|---|---|---|
| Directory structure | Create `docs/plans/`, `docs/solutions/`, `docs/brainstorms/`, `docs/design-docs/`. | P1 |
| YAML frontmatter standard | All knowledge documents use frontmatter: title, date, tags, category, status. | P1 |
| CLAUDE.md as map | ~100-200 lines. Points to detailed docs. Updated by compound step. | P1 |
| Basic doc validation | CI-runnable linter: valid frontmatter, resolvable links, CLAUDE.md under 200 lines. | P2 |

#### Skills and Subagents

| Feature | Description | Priority |
|---|---|---|
| Skill loading | Read markdown skill files from `.coda/skills/` and built-in skills. Auto-load based on trigger keywords in plans. | P2 |
| Built-in skills | Ship with: `agent-native-architecture`, `testing-patterns`. | P2 |

**What's explicitly NOT in Milestone 1**:
- No Codex integration (Claude Code only)
- No Slack alerts (CLI prompts only)
- No issue tracker integration
- No SQLite (file-based state only)
- No parallel agent execution (sequential only)
- No custom agent creation

---

### Milestone 2: Connected

**Goal**: Full CLI with plugin/skill system, Codex integration, Slack alerts, and enhanced agent orchestration. The system becomes "connected" — agents talk to each other, alerts reach you wherever you are.

**Outcome**: A developer can kick off work before bed, receive a Slack notification when a plan needs approval, approve from their phone, and wake up to a completed PR.

#### CLI Enhancement

| Feature | Description | Priority |
|---|---|---|
| `coda lfg <description>` | Full pipeline: plan → deepen → work → review → resolve → compound. Pauses for plan approval, then runs autonomously. | P1 |
| `coda triage` | Interactive triage of review findings. Present each finding with context; human approves, skips, or customizes. | P1 |
| `coda resolve` | Auto-resolve triaged findings. Each fix runs in isolation to avoid conflicts. | P1 |
| Skill system | User-creatable skills as markdown files with YAML frontmatter. Composable, versionable, discoverable. | P1 |
| Hook system | Shell commands at lifecycle points (pre-plan, post-work, pre-review, post-compound). Configurable on_failure behavior. | P2 |
| `coda agents list/status/kill` | Manage running agents. | P2 |
| Shell completions | Bash, zsh, fish completions out of the box. | P2 |

#### Agent Orchestration (Full)

| Feature | Description | Priority |
|---|---|---|
| Codex integration | Invoke Codex as a subprocess. Route coding/debugging/structured-review tasks to Codex, everything else to Claude. | P1 |
| Task routing | Configurable routing rules in `.coda/config.toml`. Default: planning/research → Claude, coding/debugging → Codex. | P1 |
| Parallel execution | Run multiple review agents simultaneously. Merge and deduplicate findings. | P1 |
| SQLite state | Agent run tracking, event log, FTS search index over docs/. Rebuild from files if lost. | P1 |
| Enhanced failure handling | Timeout management per task type. Output validation against expected schemas. Structured escalation. | P2 |

#### Slack Alert System

| Feature | Description | Priority |
|---|---|---|
| Webhook delivery | Outbound Slack messages for plan approvals, error escalation, completion notifications. | P1 |
| Action buttons | Approve/Reject/View buttons in Slack messages via Socket Mode. | P1 |
| Alert priority | P1 (immediate DM), P2 (standard, batched 5min), P3 (digest only). | P1 |
| Smart batching | Group informational updates into 15-minute digests. Deduplicate repeated failures. | P1 |
| Quiet hours | Configurable per-user schedule. P1 alerts queue for morning delivery; P3 alerts suppressed. | P2 |
| Escalation chain | Reminder at T+15min, DM at T+30min, escalation at T+1h. Tone stays matter-of-fact. | P2 |
| `coda init slack` | Setup wizard for Slack app configuration. | P2 |

#### Human-in-the-Loop Approval

| Feature | Description | Priority |
|---|---|---|
| Multi-channel approval | Approve plans via CLI, Tauri UI, or Slack action button. First approval wins. | P1 |
| Plan lifecycle state machine | draft → review → approved → executing → completed. Error → review for re-planning. | P1 |
| Auto-approve (configurable) | Auto-approve reviews with only P3 findings. Auto-approve plans by self (solo dev mode). | P2 |
| Escalation timeouts | Configurable reminder and escalation intervals. | P2 |

#### Agent Transparency and Progress

| Feature | Description | Priority |
|---|---|---|
| Streaming progress | Show phase transitions, meaningful milestones, elapsed time. Suppress mechanical operations. | P1 |
| Decision explanations | Agent records alternatives considered, choice made, and reasoning. Visible in plan, PR, and compound doc. | P1 |
| Confidence indicators | High/Medium/Low confidence flags. Low-confidence work auto-flagged for human review. | P2 |
| Error recovery UX | Structured error presentation with options: retry, skip, pause, rollback. | P2 |

#### Knowledge Compounding

| Feature | Description | Priority |
|---|---|---|
| Compound capture automation | 6 parallel subagents: context analyzer, solution extractor, related docs finder, prevention strategist, category classifier, documentation writer. | P1 |
| docs/solutions/ architecture | Categorized solution files with YAML frontmatter. Tags, related plans, severity, reuse count. | P1 |
| Compound score | Track % of work cycles with a compound step. Surface in dashboard. | P2 |
| Compound → Skill pipeline | After documenting a pattern 3+ times, offer to create a skill file. | P2 |
| Doc gardener agent | Recurring scan for stale documentation. Opens fix-up PRs. | P2 |

---

### Milestone 3: Integrated

**Goal**: Issue tracker integration, enhanced Tauri UI, and cross-surface seamless experience. Coda becomes the unified interface between ideas and shipped code.

**Outcome**: A product manager creates a ticket in Jira, an agent picks it up as a plan, implements it, reviews it, and the PM approves from the Tauri UI — all tracked bidirectionally.

#### Issue Tracker Integration

| Feature | Description | Priority |
|---|---|---|
| Jira adapter | Bidirectional sync between Coda plans and Jira issues. Configurable field mapping and status mapping. | P1 |
| Linear adapter | Same interface as Jira, different API mapping. | P2 |
| Event-driven sync | Primary: Jira/Linear webhooks. Fallback: polling on configurable interval. | P1 |
| Conflict resolution | Last-write-wins with hash check. Configurable: coda_wins, tracker_wins, manual. | P2 |
| `coda tracker sync/link/status` | Manual sync control, plan-to-issue linking, sync health. | P1 |

#### Enhanced Tauri UI

| Feature | Description | Priority |
|---|---|---|
| Issue tracking dashboard | Kanban view with columns mapping to compound loop stages. List view for bulk operations. | P1 |
| Rich plan editor | Three-panel layout: outline, content, context (related code + prior solutions + agent research). | P1 |
| Review finding browser | Filterable, sortable findings. Group by agent, priority, file. Batch approval/rejection. | P1 |
| Agent timeline visualization | Chronological view of all agent actions. Expandable detail at each step. | P2 |
| Session replay | Step through what an agent did, in order, with full context at each step. | P3 |

#### Cross-Surface Experience

| Feature | Description | Priority |
|---|---|---|
| CLI ↔ UI ↔ Slack handoff | Every entity has a stable ID across surfaces. Deep links from Slack → UI. CLI shows equivalent commands. | P1 |
| Session continuity | CLI state persisted. Tauri connects to same session. "While you were away..." summary. | P1 |
| Consistent vocabulary | Same words, colors, status names across all surfaces. | P1 |

#### Review Agent Ecosystem

| Feature | Description | Priority |
|---|---|---|
| Full review fleet | 14+ specialized agents: security-sentinel, performance-oracle, architecture-strategist, pattern-recognition-specialist, data-integrity-guardian, data-migration-expert, code-simplicity-reviewer, framework-specific reviewers, deployment-verification-agent, frontend-races-reviewer, agent-native-reviewer. | P2 |
| Review profiles | Configurable per-project. Always-on reviewers, conditional reviewers (by file pattern), disabled reviewers. | P2 |
| Custom review agent creation | Users define specialized reviewers as agent definition files in `.coda/agents/`. | P2 |

#### Self-Improvement Loop

| Feature | Description | Priority |
|---|---|---|
| Coda builds Coda | Coda's own development uses its compound loop. All bugs fixed through the workflow. | P1 |
| Agent/skill metrics | Track usage and value of each agent/skill. Flag unused agents for retirement. | P2 |
| Compound → Agent pipeline | When compound identifies recurring review gaps, offer to create a review agent. | P3 |
| Graduated enforcement | When a skill-based convention is violated repeatedly, suggest promoting it to a lint rule. | P3 |

---

## 7. Architecture Summary

### Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| CLI | TypeScript + Commander.js | Same runtime as Claude Code; fast iteration; deep agent training data |
| Tauri UI | Tauri 2.x (Rust backend + React/TS frontend) | ~5MB binary; system webview; Rust sidecar for performance |
| Frontend | React + TypeScript + Tailwind CSS + Zustand | Most agent-legible frontend stack; atomic CSS; lightweight state |
| Agent runtime | CLI subprocesses (claude, codex) | No SDK lock-in; stream processing; process isolation |
| Knowledge storage | Markdown files with YAML frontmatter in `docs/` | Git-native; human-readable; agent-legible |
| Operational storage | SQLite at `.coda/state.db` | Fast queries; concurrent writes; rebuildable from files |
| Configuration | TOML at `.coda/config.toml` + `~/.coda/config.toml` | Layered precedence; human and agent readable |
| Slack integration | Webhooks (outbound) + Socket Mode (inbound actions) | No server infrastructure; no public URL required |
| Issue tracker | Adapter pattern with REST API | Extensible to new trackers |

### Component Diagram

```
                        User Interfaces
┌──────────────┐    ┌──────────────────────────────────┐
│   Coda CLI   │    │         Coda Tauri UI             │
│  (primary)   │    │  React/TS frontend + Rust backend │
└──────┬───────┘    └─────────────────┬────────────────┘
       │                              │
       ▼          IPC / local HTTP    ▼
┌─────────────────────────────────────────────────────┐
│                    Core Engine                        │
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │            Agent Orchestrator                │     │
│  │  Router │ Scheduler │ State Mgr │ Runner    │     │
│  └──────────────────┬──────────────────────────┘     │
│                     │                                 │
│  ┌──────────────────┤──────────────────────┐         │
│  │  Plan Manager    │  Knowledge Index     │         │
│  │  (lifecycle)     │  (search, context)   │         │
│  └──────────────────┴──────────────────────┘         │
└──────────┬────────────────────┬───────────────────────┘
           │                    │
           ▼                    ▼
┌────────────────────┐  ┌─────────────────────────────┐
│  Agent Providers   │  │   External Integrations      │
│                    │  │                              │
│  ┌──────────────┐  │  │  ┌──────────┐ ┌───────────┐│
│  │ Claude Code  │  │  │  │  Slack   │ │ Jira /    ││
│  ├──────────────┤  │  │  │  Alerts  │ │ Linear    ││
│  │ Codex        │  │  │  └──────────┘ └───────────┘│
│  └──────────────┘  │  └─────────────────────────────┘
└────────────────────┘
```

### Key Architectural Decisions

| ADR | Decision | Tradeoff |
|---|---|---|
| ADR-001: Orchestration | Centralized orchestrator | Simplicity and debuggability over agent autonomy |
| ADR-002: Knowledge | Repo as system of record, files for knowledge | Maintenance discipline over configuration simplicity |
| ADR-003: Alerts | Webhooks + Socket Mode | No server infrastructure over richer bot capabilities |
| ADR-004: Issue Tracker | Adapter pattern with event-driven sync | Abstraction overhead over direct integration speed |
| ADR-005: CLI | Commander.js mapping to compound loop | Learnability over minimal surface area |
| ADR-006: Human-in-Loop | State machine with multi-channel approval | Protocol complexity over single-channel simplicity |
| ADR-007: Storage | Files for knowledge, SQLite for state | Two systems over one, gaining git-native knowledge |

Full ADR details: `docs/perspectives/technical-architecture.md`

---

## 8. UX Principles

### Core Principles

| Principle | Meaning |
|---|---|
| **Decisions first** | Pending human decisions are always the most prominent element on every surface |
| **Show, don't tell** | Demonstrate agent work through results, not narration |
| **One click to detail** | Summaries everywhere; detail on demand; raw data if needed |
| **Consistent vocabulary** | Same words, colors, concepts across CLI, UI, and Slack |
| **Earn trust incrementally** | Start supervised; build a track record; offer more autonomy |
| **Respect attention** | Every notification costs focus. Batch, summarize, prioritize |
| **Convention over configuration** | Work out of the box. Customize when ready |
| **Fail visibly** | Errors are first-class UI elements, not hidden log lines |

### The Three Surfaces

**CLI (primary interface for engineers)**: Fast, predictable, composable. Commands use `coda <verb> [noun]` grammar. Zero-flag invocations always work. Progressive disclosure through flags and `--help`.

**Tauri UI (visual oversight for humans)**: Mission control, not an IDE. Focuses on: plan annotation, agent fleet monitoring, issue tracking, and alert management. Answers "What needs my attention right now?"

**Slack (async notifications)**: The remote control. Approve plans from your phone. Structured messages with action buttons. Smart batching prevents alert fatigue. Quiet hours respected.

### The Trust Dial

| Level | Name | Behavior |
|---|---|---|
| 1 | Supervised | Approve every plan, every PR, every deploy |
| 2 | Plan-approved | Approve plans; agents auto-merge passing PRs |
| 3 | Outcome-reviewed | Agents plan and merge; human reviews weekly summary |
| 4 | Autonomous | Agents operate independently; human alerted only on failures |

Default: Level 1. Users opt into higher levels explicitly. The system never auto-escalates trust.

### Design Anti-Patterns to Avoid

1. **Notification firehose** — batch, summarize, prioritize instead.
2. **False progress bars** — use spinners with context if you can't measure accurately.
3. **Mystery pauses** — always show what the agent is doing.
4. **Approval gauntlet** — plan-level approval, not file-level or line-level.
5. **Kitchen-sink dashboard** — show only what needs attention.
6. **Context-free notifications** — every alert includes enough context to decide without switching tools.

Full UX specification: `docs/perspectives/ux-perspective.md`

---

## 9. The Compound Loop in Coda

### How Plan → Work → Review → Compound Manifests in Every Feature

The compound loop is fractal — it works at every scale, from a 5-minute bug fix to a multi-week feature.

| Phase | CLI | UI | Slack | What Happens |
|---|---|---|---|---|
| **Plan** | `coda plan` | Plan editor with annotation | Plan approval notification | Research agents analyze codebase. Structured plan written to `docs/plans/`. Human reviews and annotates. |
| **Work** | `coda work` | Progress tracker | Completion notification | Agent executes plan in isolated worktree. Validates after each step. Streams progress. |
| **Review** | `coda review` | Findings dashboard | Review summary | 3-14+ specialized agents review in parallel. Findings prioritized P1/P2/P3. Human triages. |
| **Compound** | `coda compound` | Solution capture form | — | 6 subagents extract reusable insights. Solution written to `docs/solutions/`. Skills updated. |

### How Coda's Own Development Follows This Loop

Coda's development is the first test case. Every feature in Coda is:
1. **Planned** using `coda plan`, with the plan stored in `docs/plans/`.
2. **Implemented** using `coda work`, with agents writing the code.
3. **Reviewed** using `coda review`, with specialized agents checking security, performance, and architecture.
4. **Compounded** using `coda compound`, with solutions captured in `docs/solutions/` — creating institutional memory about building agentic systems.

### The Self-Improving Nature

Each cycle deposits knowledge:
- A bug fix creates a solution document that prevents the same category of bug.
- A successful pattern becomes a skill file that agents reference automatically.
- A recurring review finding graduates from a soft convention to a hard lint rule.
- A complex plan becomes a template for similar future work.

The compound score tracks this: what percentage of work cycles include a compound step? Teams running below 30% are leaving most of their learning on the table.

---

## 10. Success Metrics

### Primary Metrics

| Metric | Definition | Target (Milestone 3) |
|---|---|---|
| **Idea-to-PR time** | Duration from plan creation to PR opened | < 2 hours for standard features |
| **Agent autonomy level** | % of work requiring human intervention | > 70% autonomous (Stages 4-5) |
| **Compound rate** | % of work cycles with a compound step | > 50% |
| **Knowledge reuse** | % of planning sessions that reference prior solutions | > 60% |

### Secondary Metrics

| Metric | Definition | Target |
|---|---|---|
| **Alert signal-to-noise** | % of alerts that result in a human action (not dismissed) | > 70% |
| **Plan approval time** | Median time from plan submission to approval | < 30 minutes |
| **Review agent coverage** | % of PRs reviewed by agent fleet | 100% |
| **Stage progression** | Users advancing from Stage 2 → Stage 3+ | > 50% within first month |
| **System investment ratio** | % of effort on system improvement vs. features | 40-50% for established projects |
| **Overnight success rate** | % of overnight agent runs that produce mergeable PRs | > 60% |

### Anti-Metrics (what we explicitly don't optimize for)

- **Lines of code**: More code is not better. Agent efficiency is measured by outcomes, not output volume.
- **Agent uptime**: Running agents longer isn't inherently valuable. Running them effectively is.
- **Number of agents**: More review agents doesn't mean better reviews. Specialize where it matters.

---

## 11. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Agent unreliability** — Claude/Codex produce incorrect or inconsistent output | High | High | Multi-layer validation: self-review, agent review fleet, automated tests, schema validation. Retry with explicit formatting instructions. Escalate to human after failures. |
| **Multi-model orchestration complexity** — routing logic becomes fragile as task types proliferate | Medium | Medium | Data-driven routing rules (config file, not code). Start with simple mapping, observe patterns, refine. Centralized orchestrator logs every routing decision for debugging. |
| **Context window management** — agents lose focus with too much or too little context | High | High | Progressive disclosure strategy. Knowledge Index for search-based context loading. CLAUDE.md as compact map. Monitor context utilization and tune. |
| **SQLite concurrency** — multiple agent processes writing simultaneously | Low | Medium | SQLite WAL mode handles this well. If needed, use a write queue. State is rebuildable from files. |
| **Tauri cross-platform issues** — WebView differences across OS | Medium | Medium | Scope Milestone 1 to macOS. Add Windows/Linux in later milestones. Use standard web APIs only. |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Learning curve** — users don't understand the compound loop | High | High | Onboarding delivers value in < 5 minutes. Templates for common workflows. Stage detection with contextual tips. The "aha moment" (overnight work) is designed-for. |
| **Alert fatigue** — too many notifications erode trust | Medium | High | Smart batching. Priority system. Quiet hours. Interrupt budget (max 3 P0/hour). Cost visibility. |
| **Trust gap** — users don't trust agents enough to delegate | High | Medium | Progressive trust dial (4 levels). Confidence indicators. Decision explanations. Track record display. Error recovery UX. Start at Level 1 (supervised) always. |
| **Compound step skipping** — users skip compounding because it feels like overhead | High | High | Gate PR merges on compound prompt. Auto-extract candidates. Compound score visibility. Gentle nudges. Make it take < 2 minutes. |

### Philosophy Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Over-automation** — agents make decisions that need human judgment | Medium | High | Clear escalation protocol. Destructive actions always require human. Low-confidence work auto-flagged. P1 findings always block. |
| **Losing human judgment** — humans become rubber-stamp approvers | Medium | Medium | Plan annotation encourages engagement. Three questions before approving ("What was the hardest decision? What alternatives were rejected? What are you least confident about?"). Review delta metric tracks whether human reviewers add value beyond agents. |
| **Knowledge rot** — docs/solutions/ becomes a graveyard of stale content | Medium | Medium | Doc gardener agent runs on recurring cadence. Freshness checks in CI. Confidence and date fields in frontmatter. Reuse count tracking. |
| **Agent-generated entropy** — agents replicate bad patterns as enthusiastically as good ones | High | Medium | Golden principles enforced via linters. Recurring cleanup agents. Quality score per domain. Pattern deviation scanner. Continuous small corrections over periodic large refactors. |

---

## 12. Open Questions

### Needs User Research

1. **Optimal compound step duration**: How long is too long for the compound step? If it takes > 5 minutes, will users skip it? Need to test with real users.

2. **Slack vs. other channels**: Is Slack the right async channel? Some teams use Discord, Teams, or email. Should we support multiple channels from the start, or validate with Slack first?

3. **Trust dial adoption**: How quickly do users move from Level 1 (supervised) to Level 2 (plan-approved)? What evidence convinces them? Need to instrument and observe.

4. **Plan granularity**: How detailed should plans be? Over-specified plans constrain agent creativity. Under-specified plans produce unexpected results. Need to find the sweet spot.

### Needs Prototyping

5. **Plan annotation UX**: The three-panel layout (outline / content / context) is a hypothesis. Does the right panel (related code + prior solutions) actually help approvers make better decisions? Build a prototype and test.

6. **CLI output format**: The streaming progress format (spinners, task counters, decision logs) needs real-world testing. How much output is too much? Where's the "sweet spot" between noisy and silent?

7. **Review agent count**: Starting with 3-5 review agents in Milestone 1. Is this enough to demonstrate value? Too many introduces noise. Need to calibrate through usage.

### Technical Unknowns

8. **Codex + Claude interop**: How well do Claude-generated plans translate to Codex implementation? Do we need a translation layer, or are structured plans sufficient?

9. **Slack Socket Mode reliability**: Socket Mode is simpler than hosting a bot server, but how reliable is the WebSocket connection for long-running local processes? Need a spike to validate.

10. **FTS performance**: How fast is SQLite FTS5 over hundreds of solution documents? At what point do we need a more sophisticated search (semantic embeddings)?

### Perspective Disagreements Needing User Input

11. **Feature velocity vs. system investment**: The 50/50 rule (compound) vs. velocity-first (harness). Should Coda enforce this ratio, merely suggest it, or leave it to users? Different user personas may have different preferences.

12. **Agent-to-agent merge authority**: Should agents ever auto-merge without human approval? Harness says yes (for routine changes). Compound says no (always human review). User research needed to determine comfort levels.

---

## 13. Appendices

### Appendix A: Perspective Documents

| Perspective | Author Role | Path |
|---|---|---|
| Harness Engineering | Harness Engineer | `docs/perspectives/harness-engineering-perspective.md` |
| Compound Engineering | Product Engineer (Every.to) | `docs/perspectives/compound-engineering-perspective.md` |
| UX Design | UX Specialist | `docs/perspectives/ux-perspective.md` |
| Technical Architecture | Technical Architect | `docs/perspectives/technical-architecture.md` |
| Synthesis | Product Manager | `docs/perspectives/synthesis.md` |

### Appendix B: Source Documents

| Document | Path |
|---|---|
| Requirements | `docs/requirements.md` |
| Harness Engineering (OpenAI) | `docs/harness-engineering.md` |
| Compound Engineering (Every.to) | `docs/compound-engineering.md` |

### Appendix C: Glossary

| Term | Definition |
|---|---|
| **Compound loop** | The four-phase cycle: Plan → Work → Review → Compound. The fundamental unit of work in Coda. |
| **Compound step** | The fourth phase of the loop where learnings are captured, categorized, and stored for future reference. |
| **Compound score** | Metric tracking the percentage of work cycles that include a compound step. |
| **Harness engineering** | Philosophy of building environments where AI agents can do reliable work at scale, with humans designing systems rather than writing code. |
| **Agent legibility** | The property of a codebase being navigable and understandable by AI agents, not just humans. |
| **Golden principles** | Core invariants encoded in linters and tests that keep a codebase consistent as agents generate code. |
| **Progressive disclosure** | Design pattern where complexity is hidden by default and revealed as needed. |
| **Trust dial** | Configurable trust level (1-4) that determines how much agent autonomy the user grants. |
| **Stage progression** | The 6-stage adoption framework (0: manual → 5: parallel cloud execution) describing how developers mature in AI-assisted development. |
| **Doc gardener** | A recurring agent that scans for stale or incorrect documentation and opens fix-up PRs. |
| **Ralph Wiggum Loop** | Pattern where an agent iterates on its own changes, requesting and addressing agent reviews in a loop until all reviewers are satisfied. |
| **50/50 rule** | Compound engineering principle that 50% of effort should go to system improvement, not just features. |
| **Plans are the new code** | Principle that the plan document is the primary artifact of engineering work, not the code it produces. |
| **AGENTS.md / CLAUDE.md** | Entry point files that orient agents. Act as a table of contents pointing to deeper documentation. |
| **Skill** | A markdown file defining domain expertise that agents reference during work. Passive knowledge, not executable. |
| **Review profile** | Configuration specifying which review agents run for a given project type. |
| **Interrupt budget** | UX constraint: no more than 3 P0 interrupts per hour before the system suggests reducing human-in-the-loop requirements. |
