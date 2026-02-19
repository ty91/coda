---
title: UX Specification
date: 2026-02-14
status: draft
tags: [ux, design, specification, cli, ui]
---

# UX Specification: Coda

> The best interface is one you forget you're using.

This document defines the user experience specification, interaction patterns, and design details for Coda -- an agentic software engineering system spanning CLI, Tauri desktop UI, and Slack-based alerts. It draws from the compound engineering loop (Plan -> Work -> Review -> Compound) and the harness engineering principle that **humans steer, agents execute**.

Coda's UX must solve a fundamentally new problem: how does a human maintain situational awareness and decision-making authority over a fleet of autonomous agents without becoming the bottleneck? The answer lives in three principles:

1. **Progressive disclosure everywhere** -- simple by default, powerful on demand.
2. **Ambient awareness over active monitoring** -- the system comes to you, not the other way around.
3. **Trust is earned incrementally** -- start supervised, graduate to autonomous.

For core UX principles and trust dial overview, see PRD Section 8.

---

## 1. CLI UX Design

The CLI is the primary surface for engineers at Stage 3+ of the compound engineering adoption ladder. It must feel like a natural extension of their shell workflow -- fast, predictable, composable.

### 1.1 Command Naming

Commands use a `coda <verb> [noun]` grammar. Verbs are real English actions, not jargon.

| Pattern | Example | Anti-pattern |
|---------|---------|--------------|
| `coda plan <description>` | Start the planning phase | `coda create-plan-document` |
| `coda work` | Execute the current plan | `coda execute-implementation` |
| `coda review <target>` | Review a PR or diff | `coda run-review-agents` |
| `coda compound` | Capture learnings | `coda generate-compound-doc` |
| `coda status` | Show agent fleet overview | `coda get-system-status` |
| `coda approve <id>` | Approve a pending decision | `coda send-approval-response` |
| `coda log <agent>` | Tail an agent's activity | `coda view-agent-log-output` |

**Subcommand grouping** for less common operations:

```
coda agent list          # List active agents
coda agent stop <id>     # Stop a specific agent
coda config set <k> <v>  # Set a configuration value
coda alert test          # Send a test Slack notification
```

**Design rules:**
- Top-level commands are the compound loop: `plan`, `work`, `review`, `compound`. These are sacred -- they map directly to the workflow.
- Never abbreviate in command names. `coda review`, not `coda rev`. Aliases handle brevity.
- Flags use `--long-form` by default, with `-s` short forms for the most common ones.
- Boolean flags are `--no-<flag>` to disable (e.g., `--no-color`), not `--skip-<flag>`.

### 1.2 Progressive Disclosure

```
# Simple: uses all defaults
coda plan "Add user notifications"

# Intermediate: override model, enable deep research
coda plan "Add user notifications" --depth deep

# Advanced: full control
coda plan "Add user notifications" \
  --depth deep \
  --agents 5 \
  --include-research external \
  --output docs/plans/notifications.md
```

The zero-flag invocation must always work and produce a sensible result. Power users discover flags through `--help`, shell completion, and the Tauri UI's command palette.

### 1.3 Output Formatting

**Principle: respect the terminal as a reading environment.**

Default output is structured for scanning, not reading. Use:
- **Color sparingly**: green for success, yellow for warnings, red for errors, dim for metadata. Never use color as the only signal -- always pair with text/symbols.
- **Indentation for hierarchy**, not ASCII boxes. Tables for tabular data only.
- **Progressive verbosity**: default is summary, `--verbose` adds detail, `--debug` adds everything.

**Agent activity output** uses a streaming format optimized for long-running tasks:

```
$ coda work

  Planning +  3 tasks identified

  > Task 1/3: Add notification service
    |-- Researching codebase patterns...
    |-- Found 3 similar services (auth, email, webhook)
    |-- Writing src/services/notification.ts
    |-- Writing tests...
    +-- Done (2m 14s)

  > Task 2/3: Add API endpoint              <-- currently active
    |-- Analyzing existing route patterns...
    +-- Writing src/routes/notifications.ts...

  o Task 3/3: Update UI components           <-- pending

  -----------------------------------------
  Elapsed: 4m 32s | Est. remaining: ~6m | 1/3 complete
```

**Key output rules:**
- Spinners for operations under 30 seconds. Progress bars for operations with known completion percentage.
- Always show elapsed time for operations over 5 seconds.
- Estimated time remaining uses a rolling average, never a countdown (countdowns that stall destroy trust).
- When an agent is thinking/planning, show what it's considering -- don't go silent.
- `Ctrl+C` always works. First press: graceful stop with checkpoint. Second press: immediate kill.

### 1.4 Error Messages

Bad:
```
Error: ENOENT: no such file or directory 'docs/plans/notifications.md'
```

Good:
```
  x Plan file not found: docs/plans/notifications.md

  This can happen when:
    - The plan hasn't been created yet -- run `coda plan` first
    - You're in the wrong directory -- expected project root

  Current directory: /Users/dev/other-project
  Closest match:    /Users/dev/coda/docs/plans/notifications.md
```

**Error message rules:**
- Always say what happened, why it likely happened, and what to do next.
- Include the actual values that failed (file paths, IDs, etc.).
- Suggest the most likely fix as a runnable command.
- Link to docs for complex issues: `See: https://coda.dev/docs/errors/E1234`
- Never show stack traces by default. `--debug` unlocks them.

### 1.5 Shell Completion & Help

- Ship completions for bash, zsh, and fish out of the box via `coda completion <shell>`.
- `coda --help` shows the compound loop commands first, then groups the rest.
- `coda <command> --help` shows usage, common examples, and related commands.
- Help text includes the "next step" hint: after `coda plan --help`, suggest `coda work --help`.

### 1.6 Aliases

```bash
alias cc='coda --dangerously-skip-permissions'  # Power user mode
alias cs='coda status'                           # Quick fleet check
alias ca='coda approve'                          # Quick approval
```

The CLI suggests aliases after repeated usage patterns: *"Tip: You've run `coda status` 12 times today. Add `alias cs='coda status'` to your shell profile?"* -- shown once, never nagged.

---

## 2. Tauri UI Design Principles

The Tauri UI is **mission control**, not an IDE. You are not writing code here. You are steering a fleet.

### 2.1 What Belongs in GUI vs CLI

| GUI (Tauri) | CLI |
|---|---|
| Plan annotation & approval | Plan creation & execution |
| Agent fleet dashboard | Starting/stopping individual agents |
| Issue tracking board (kanban/list) | Quick issue creation & status checks |
| Side-by-side diff review | Raw diff output |
| Alert history & management | Alert configuration |
| Visual timeline of agent activity | Tailing agent logs |
| Onboarding wizard | `coda init` |

**The line:** If the task requires *reading and comparing*, use the GUI. If it requires *commanding and composing*, use the CLI. The GUI is for oversight; the CLI is for action.

### 2.2 Plan Annotation UX

Plans are the most important artifact in compound engineering. The annotation UX must make reviewing plans feel effortless.

**Layout:**
- Left panel: plan outline (collapsible tree of sections).
- Center: plan content, rendered markdown, with inline annotation capability.
- Right panel: contextual info -- agent research findings, related code, prior solutions.

**Interaction patterns:**
- **Inline comments**: Click any line -> comment bubble appears. Type a note. This becomes an instruction for the agent.
- **Section approval**: Each plan section has a check/reject toggle. Approve sections individually or all at once.
- **Rejection with reason**: Reject always requires a text reason. "Why not?" is the most valuable feedback loop.
- **Suggested alternatives**: When rejecting, the UI offers "Replace with..." to propose an alternative approach inline.
- **Comment resolution**: Agent-addressed comments get a "Resolved" state. Unresolved comments block approval.

**Anti-patterns to avoid:**
- Don't require approval of every detail -- section-level is the right granularity.
- Don't force users into the UI for approval -- `coda approve <plan-id>` must work from CLI too.
- Don't show raw JSON plans. Always render to readable markdown.

### 2.3 Issue Tracking Views

Three views, one data model:

**Kanban** (default): Columns map to the compound loop stages -- `Planning` -> `In Progress` -> `In Review` -> `Compounding` -> `Done`. Cards show: title, assigned agent, elapsed time, priority badge.

**List view**: For bulk operations. Sortable by priority, agent, age, status. Multi-select for batch actions ("approve all P3 fixes").

**Detail view**: Full issue context -- the original requirement, agent's plan, implementation diff, review findings, compound learnings. Everything an approver needs in one screen.

### 2.4 Dashboard: Mission Control

The dashboard answers one question: **"What do I need to pay attention to right now?"**

```
+---------------------------------------------------------------+
|  CODA -- Mission Control                             Settings  |
+---------------------------------------------------------------+
|                                                                 |
|  [!] 2 decisions waiting          Fleet: 4 agents active       |
|  +----------------------------+    +----------------------------+
|  | Plan: Notification system  |    | Agent 1  ######--  Task 2/3|
|  | Waiting 12m -- Review ->   |    | Agent 2  ########- Review  |
|  |                            |    | Agent 3  ##------  Task 1/5|
|  | PR #47: Fix auth race      |    | Agent 4  idle              |
|  | Waiting 3m  -- Review ->   |    +----------------------------+
|  +----------------------------+                                 |
|                                                                 |
|  Recent Activity                                                |
|  ---------------------------------------------------            |
|  2m ago   Agent 2 opened PR #48 -- Add email service            |
|  8m ago   Agent 1 completed task: notification model            |
|  15m ago  Agent 3 started: refactor auth middleware              |
|  22m ago  You approved plan: user-preferences                   |
|                                                                 |
|  System Health                                                  |
|  ---------------------------------------------------            |
|  CI: passing  | Tests: 847/847 | Coverage: 82%                  |
|  API: 23ms    | Queue: 3 tasks | Cost today: $4.20              |
|                                                                 |
+---------------------------------------------------------------+
```

**Design principles:**
- **Decisions first**: Pending approvals are always at the top. They are the reason the UI exists.
- **Fleet status is ambient**: A glance tells you who's working, who's stuck, who's idle.
- **Activity feed is chronological**: Newest first. Show the last ~20 events. Filter by agent or type.
- **Health is a signal, not a dashboard**: Green/yellow/red. You only drill in when something's yellow or red.
- **Cost visibility**: Show daily spend. Engineers who see cost make better decisions about parallelization.

---

## 3. Human-in-the-Loop Interaction Patterns

The core tension: agents need human decisions to proceed, but humans need flow state to do good work. Every interruption has a cost. Every delayed decision has a cost. The UX must balance both.

### 3.1 Interrupt Classification

**Never interrupt for something that can wait.** Classify every human-in-the-loop moment:

| Level | Name | Behavior | Example |
|-------|------|----------|---------|
| P0 | **Blocking** | Agent is stopped. Alert immediately. | Plan approval needed, deployment gate |
| P1 | **Time-sensitive** | Agent continues other work, but this needs attention within ~30 min. | PR review ready, test failure on main |
| P2 | **Informational** | No action needed. Batched into summaries. | Task completed, compound doc created |

**Interrupt budget:** No more than 3 P0 interrupts per hour. If the system generates more, something is wrong with the plan granularity -- surface this as a meta-alert: *"You've had 5 blocking decisions in the last hour. Consider giving agents more autonomy for P2-level choices."*

### 3.2 Approval Workflows

**Plan approval:**
1. Agent creates plan -> notification sent (P0).
2. User reviews in Tauri UI or reads summary in CLI/Slack.
3. User approves (with optional notes), rejects (with required reason), or requests changes.
4. Agent proceeds, iterates, or re-plans accordingly.

**PR review:**
1. Agent opens PR, agent reviewers run in parallel -> human notified (P1).
2. Agent review findings are pre-triaged by priority.
3. Human reviews the review -- focusing on intent and business logic, not syntax.
4. Human approves, requests changes, or delegates to another agent review pass.

**Deployment gates:**
1. PR merged -> CI passes -> deployment ready notification (P0).
2. User confirms deploy or schedules it.
3. Post-deploy health check runs automatically -- user only alerted if something degrades.

### 3.3 Ambient Awareness

Users should know what their agents are doing without actively checking. This is achieved through:

- **Status bar in terminal**: A persistent one-liner showing fleet summary (e.g., `coda: 3 agents active | 1 decision waiting | CI passing`).
- **Tauri system tray**: Badge count for pending decisions. Hover for summary.
- **Slack digest**: Configurable periodic summary (default: every 2 hours when agents are active).
- **Sound cues (opt-in)**: Subtle audio for decision-needed events. Never for informational events.

### 3.4 Batch Decision-Making

When multiple decisions are pending, group them:

```
  3 decisions waiting -- review together?

  1. [Plan] Add caching layer          -- approve/reject
  2. [PR]   Fix N+1 in user query      -- approve/reject
  3. [Plan] Refactor auth middleware    -- approve/reject

  Actions: [Approve All] [Review Each] [Snooze 30m]
```

Batch mode reduces context switches. The "Approve All" option is available only when all items are P1 or lower -- P0 items always require individual review.

### 3.5 Trust Configuration

As users build confidence in agent output, the system should require fewer interruptions. This is configurable per agent, per project, and per decision type. For trust level definitions, see PRD Section 8.

Default: Level 1. Users explicitly opt into higher levels. The system never auto-escalates trust. Trust is given, never assumed.

**Trust evidence:** At each level, show the track record: *"This agent has completed 47 tasks with 0 rollbacks. Ready to move to Level 2?"*

---

## 4. Alert System UX (Slack Integration)

Slack is the remote control -- it lets you steer agents without opening a terminal or the Tauri UI. But Slack is also the most abused communication channel in modern engineering. Coda's Slack integration must be surgically precise.

### 4.1 Alert Fatigue Prevention

**Rules:**
- **Deduplicate**: If an agent retries and fails on the same issue, send one alert, not three.
- **Batch informational updates**: Group "task completed" notifications into a single message every 15 minutes.
- **Importance scoring**: Each alert has a computed score based on: blocking severity, time waiting, estimated human effort, and downstream impact.
- **Rate limiting**: Maximum 1 P0 alert per 10 minutes per project. If more occur, batch them into a single "multiple issues" alert.

### 4.2 Slack Message Design

**Plan approval notification:**

```
+---------------------------------------------+
|  Plan ready for review                       |
|                                              |
|  Project: coda                               |
|  Plan: Add notification service              |
|  Agent: agent-3                              |
|  Estimated effort: ~45 min agent time        |
|                                              |
|  Summary:                                    |
|  - Create NotificationService with           |
|    email + in-app channels                   |
|  - Add user preference model                 |
|  - Wire into existing event bus              |
|  - 12 new tests                              |
|                                              |
|  [Approve]  [Reject]  [View Full Plan]       |
|                                              |
|  Waiting 3m | 2 other decisions pending      |
+---------------------------------------------+
```

**Design principles for Slack messages:**
- **Include enough context to decide without switching tools.** The summary should be sufficient for 80% of approvals.
- **Action buttons are verbs**: "Approve", "Reject", "View Details" -- not "OK", "Cancel".
- **Thread for conversation**: Initial notification in channel, follow-up details in thread.
- **Metadata at the bottom**: Waiting time, related decisions, agent ID -- useful but not primary.
- **Never use @here or @channel**. Coda notifications are personal. If urgent, DM.

### 4.3 Escalation Patterns

When a decision is pending too long:

| Time | Action |
|------|--------|
| 0m | Initial notification in Slack channel |
| 15m | Thread reply: "Still waiting -- agent is paused on this." |
| 30m | DM to assigned reviewer with summary |
| 1h | DM: "This is blocking 2 downstream tasks. Quick approve or snooze?" |
| 2h | Agent reassigns to a different task; flags for next session |

**Critical:** Escalation never becomes aggressive. No red alerts, no ALL CAPS, no repeated DMs. The tone stays matter-of-fact. If a human isn't responding, the system adapts -- it doesn't nag.

### 4.4 Quiet Hours & Focus Mode

- **Quiet hours**: Configurable per-user schedule (e.g., 10pm-8am). During quiet hours, only P0 alerts send a DM. Everything else batches for morning delivery.
- **Focus mode**: Activated manually (`coda focus 2h`) or via Slack status. Suppresses all non-P0 alerts. Shows a summary when focus mode ends.
- **Weekend mode**: Default off on weekends unless agents are explicitly running. Configurable.

### 4.5 Alert Preferences

Granular control over what you hear about:

```toml
# .coda/alerts.toml
[defaults]
channel = "#coda-agents"
quiet_hours = "22:00-08:00"

[projects.coda]
plan_approval = "dm" # DM for plan approvals
pr_ready = "channel" # Channel for PR notifications
task_complete = "digest" # Batch into digest
failure = "dm" # DM for failures

[agents."agent-3"]
trust_level = 2 # Plan-approved
noise = "low" # Only failures and decisions
```

---

## 5. Agent Transparency & Trust Building

Agents that work in silence are agents that users don't trust. Transparency is not about verbosity -- it's about showing the right information at the right moment.

### 5.1 Show Your Work

Every agent action should be explainable at three levels of detail:

- **One-liner** (in status bar): `Agent 2: writing notification service`
- **Summary** (in dashboard): `Agent 2 researched 3 existing services, chose the event-bus pattern, and is implementing NotificationService with 4 methods`
- **Full trace** (in log view): Every file read, every decision made, every alternative considered

Users choose their depth. Default is summary.

### 5.2 Progress Indicators

| Situation | Indicator | Anti-pattern |
|-----------|-----------|--------------|
| Known steps (plan execution) | Step counter: `Task 2/5` | Percentage that jumps erratically |
| Unknown duration (research) | Elapsed time + what's happening | Spinning icon with no text |
| Waiting on external (CI, API) | "Waiting for CI... (2m elapsed)" | Silent pause |

**Never show fake progress.** If the agent doesn't know how long something will take, say so. A spinner with context ("Analyzing 47 files...") is better than a progress bar that lies.

### 5.3 Decision Explanations

When an agent makes a choice, it records why:

```
Decision: Use event-bus pattern for notifications
  Considered: direct service calls, message queue, event bus
  Chose event-bus because:
    - 3 existing services use this pattern (auth, email, webhook)
    - Decouples notification logic from triggering code
    - Matches architecture doc recommendation (ARCHITECTURE.md:L42)
  Trade-off: Slightly more complex than direct calls
```

This is available in the plan, in the PR description, and in the compound doc. Decisions are never black boxes.

### 5.4 Confidence Indicators

Agents should express uncertainty when it exists:

```
  > Implementing notification preferences
    [!] Low confidence: No existing pattern for user preferences found.
      Using a new preferences table -- review recommended.
```

Confidence levels: `High` (matches existing patterns), `Medium` (similar patterns found), `Low` (novel territory). Low-confidence work is automatically flagged for human review, regardless of trust level.

### 5.5 History & Audit Trail

Everything is logged and reviewable:

- **Timeline view** (Tauri UI): Chronological list of all agent actions with expandable detail.
- **Session replay**: Step through what an agent did, in order, with full context at each step.
- **Decision log**: Filterable list of all choices made across all agents.
- **Undo trail**: For every change, a path to reverse it (`git revert <sha>`, `coda rollback <action-id>`).

### 5.6 Error Recovery UX

When something goes wrong:

```
  x Agent 2 encountered an error

  What happened: Test suite failed after adding notification routes
  Impact: 3 tests in auth module broke (unrelated to notification work)

  Agent's assessment: Likely a pre-existing flake in auth tests.
  Confidence: Medium

  Options:
    1. [Retry] -- Re-run with fresh test environment
    2. [Skip & continue] -- Mark as known flake, continue work
    3. [Pause & investigate] -- Agent stops, opens detailed report
    4. [Rollback] -- Revert agent's changes, restore clean state

  What would you like to do? (1/2/3/4)
```

**Error recovery rules:**
- Never auto-retry more than once without telling the user.
- Always offer rollback as an option.
- Show the agent's own assessment -- it often knows what went wrong.
- Separate "agent did something wrong" from "environment is broken" -- the fix is different.

---

## 6. Cognitive Load Management

The biggest UX failure in developer tools is information overload. Coda's UX must aggressively manage cognitive load.

### 6.1 Information Hierarchy

At any moment, the user's mental model should be:

1. **What needs my attention right now?** -> Pending decisions (top of dashboard, Slack DMs)
2. **Is everything healthy?** -> Fleet status, CI status (glanceable)
3. **What's being worked on?** -> Active tasks (one scroll down)
4. **What happened recently?** -> Activity feed (two scrolls down)
5. **What's the full history?** -> Logs and audit trail (separate view)

Never show level 5 information at level 1 prominence.

### 6.2 Summary vs Detail

**Default to summaries everywhere:**

- PR review: "14 agents reviewed. 2 P1 findings, 5 P2, 7 P3." -> Click to expand.
- Agent activity: "Completed 3 tasks in 12 minutes." -> Click to see each task.
- Compound docs: "3 learnings captured from this session." -> Click to read them.

**Drill-down is always one click away.** Summaries link to detail. Detail links to raw data.

### 6.3 The Right Amount of Agent Output

Too noisy: Agent streams every file read, every git operation, every thought.
Too quiet: Agent runs for 10 minutes in silence, then dumps a result.

**The sweet spot:**
- Show phase transitions: "Planning -> Researching -> Implementing -> Testing"
- Show meaningful milestones: "Found 3 matching patterns", "Test suite passing"
- Suppress mechanical operations: File reads, git adds, linter runs -- unless they fail.
- Always show elapsed time and current phase.

Users can adjust the verbosity dial: `quiet -> normal -> verbose -> debug`.

### 6.4 Context Preservation

When a user switches between tasks, agents, or surfaces:

- **CLI sessions remember state**: `coda status` shows the last context you were in.
- **Tauri sidebar preserves navigation**: Switching to another view and back restores scroll position and expanded items.
- **Slack threads maintain context**: Every thread includes the original decision context, so you can pick up a 2-hour-old notification without confusion.
- **Cross-agent context**: When viewing Agent 2's work, show "related: Agent 1 is working on the same module" to prevent surprise conflicts.

---

## 7. Cross-Surface Seamless Experience

A user might start a plan in the CLI, review it in the Tauri UI, and approve it from Slack while walking the dog. This must feel like one continuous experience.

### 7.1 CLI -> UI -> Slack Handoff

Every entity in Coda (plan, task, PR, agent, decision) has a stable ID that works across all surfaces.

```
# CLI shows the plan
$ coda plan status
Plan: notification-service (plan-47)
Status: waiting for approval
View in UI: coda://plans/47
Approve: coda approve plan-47

# Tauri UI shows the same plan at coda://plans/47

# Slack notification includes the same ID and a deep link
```

**Deep linking rules:**
- Every Slack notification includes a "View in UI" button that opens the Tauri app to the exact view.
- Every Tauri view shows the equivalent CLI command at the bottom: `CLI: coda plan show plan-47`.
- Every CLI output for reviewable content includes: `Open in UI: coda://plans/47`.

### 7.2 Consistent Mental Model

Across all surfaces, the same concepts use the same names:
- "Plan" is always "Plan" (not "spec" in CLI and "blueprint" in UI).
- "Agent" is always "Agent" (not "worker" or "task runner").
- Status names are consistent: `planning`, `working`, `reviewing`, `compounding`, `done`.
- Color coding is consistent: green = success, yellow = needs attention, red = error.

### 7.3 Session Continuity

- CLI state is persisted to disk: `~/.coda/session.json`. Resume where you left off.
- Tauri UI connects to the same session state. Opening the UI shows what the CLI is doing.
- Closing the laptop doesn't stop agents. Reopening shows what happened while you were away, as a timeline: "While you were away: 2 tasks completed, 1 PR opened, 1 decision waiting."

---

## 8. Onboarding Experience

First impressions determine whether a user becomes an advocate or an uninstaller. Coda's onboarding must deliver value in under 5 minutes.

### 8.1 First-Time Setup

```
$ coda init

  Welcome to Coda.

  Let's set up your project in 3 steps:

  1. Project detection
     Done: Found: TypeScript project (pnpm, Vitest, ESLint)
     Done: Found: Git repository (main branch, 847 commits)

  2. Configuration
     -> Where should plans live? [docs/plans]
     -> Slack workspace for alerts? [skip for now]
     -> Default trust level? [supervised]

  3. First task (optional)
     -> Describe something to work on, or press Enter to skip:
     > "Add input validation to the signup form"

  Creating plan...

  Done: Coda is ready. Your first plan is waiting:
    coda plan show plan-1

  Next steps:
    - Review the plan: coda plan show plan-1
    - Approve and start: coda approve plan-1
    - Learn more: coda help
```

**Onboarding rules:**
- Maximum 3 questions during init. Defaults for everything.
- Detect project type, frameworks, and tools automatically.
- Offer a first task immediately -- nothing teaches like doing.
- Show "next steps" after every major action.

### 8.2 Progressive Capability Unlock

Don't show everything on day one. Reveal capabilities as users mature:

| Milestone | Unlocked Feature | Trigger |
|-----------|-----------------|---------|
| First plan approved | Plan annotation in UI | Automatic |
| 5 plans completed | "Suggest: try `--depth deep` for more thorough plans" | Tip |
| First PR merged | Agent review setup | Guided |
| 10 PRs merged | Trust level 2 offered | Prompt |
| First compound doc | Compound loop explained | Contextual |
| 20 tasks completed | Parallel execution suggested | Tip |

Tips are shown once and dismissed. They never nag. They appear at contextually relevant moments, not as a tutorial sequence.

### 8.3 The "Aha Moment"

The moment a user goes from skeptic to advocate is when they **wake up to find an agent completed a task they started before bed**. The overnight work pattern is Coda's "aha moment."

Design for this:
- Make it trivial to kick off a task and close the laptop.
- Morning summary: "While you were away..." with clear, scannable results.
- First overnight success should be celebrated subtly: "Your first overnight task completed successfully. The agent worked for 3h 47m."

### 8.4 Templates & Examples

Ship with starter templates for common workflows:

```
$ coda template list
  Available templates:
  - bugfix       -- Find, reproduce, fix, and verify a bug
  - feature      -- Plan, implement, review a new feature
  - refactor     -- Restructure code with safety checks
  - review       -- Multi-agent code review on a PR

$ coda template use bugfix
  Describe the bug: > "Users can't upload files over 10MB"

  Creating plan from bugfix template...
```

---

## 9. Wireframe Sketches

### 9.1 CLI Output: Running Agent

```
+--------------------------------------------------------------+
|  coda work -- notification-service (plan-47)                  |
+--------------------------------------------------------------+

  Phase: Implementation (2 of 4)

  Done  Task 1: Create notification model
    Created src/models/notification.ts (42 lines)
    Created src/models/__tests__/notification.test.ts (67 lines)
    Tests: 4/4 passing

  >  Task 2: Add notification service                   2m 14s
    |-- Analyzed existing services: auth, email, webhook
    |-- Using event-bus pattern (matches project conventions)
    |-- Writing src/services/notification-service.ts...
    |
    |  Decision: event-bus over direct calls
    |  Reason: 3/3 existing services use this pattern
    |

  o  Task 3: Add API routes
  o  Task 4: Update UI components

  -- Progress --------------------------------------------------
  [########------------]  37%  |  1/4 tasks  |  ~8m left

  Press [d] for detail | [s] to skip task | [q] to pause
```

### 9.2 Slack Notification: Plan Approval

```
+-------------------------------------------------+
|  Plan ready: Add notification service            |
|                                                  |
|  Agent: agent-3  |  Project: coda                |
|  Estimated: ~45 min agent time                   |
|                                                  |
|  What it does:                                   |
|  - NotificationService with email + in-app       |
|  - User preferences for notification channels    |
|  - Event-bus integration (matches auth pattern)   |
|  - 12 new tests across 3 files                   |
|                                                  |
|  Files affected:                                 |
|  + src/services/notification-service.ts (new)    |
|  + src/models/notification.ts (new)              |
|  ~ src/routes/index.ts (modified)                |
|  + tests (3 new files)                           |
|                                                  |
|  [Approve]  [Reject]  [Comment]                  |
|  [Full Plan]  [Snooze 30m]                       |
|                                                  |
|  Waiting 4m  |  1 other decision pending          |
+-------------------------------------------------+
```

### 9.3 Tauri UI: Dashboard Overview

```
+---------------------------------------------------------------------+
|  Coda                              Search    Settings          You   |
+-----------+---------------------------------------------------------+
|           |                                                          |
|  * Dash   |  [!] Needs Your Attention (2)                           |
|  Plans    |  +-----------------------------------------------------+|
|  Agents   |  |  Plan: Notification service              [Review ->] ||
|  Issues   |  |     Waiting 12m - Agent 3 - 4 tasks - ~45m est      ||
|  Reports  |  +-----------------------------------------------------+|
|  History  |  |  PR #47: Fix auth race condition         [Review ->] ||
|           |  |     Waiting 3m - 0 P1 / 2 P2 findings               ||
|           |  +-----------------------------------------------------+|
|           |                                                          |
|           |  Agent Fleet                                             |
|           |  +------------+------------------+----------+--------+  |
|           |  | Agent      | Task             | Progress | Time   |  |
|           |  +------------+------------------+----------+--------+  |
|           |  | * agent-1  | Refactor auth    | ####---- | 14m    |  |
|           |  | * agent-2  | Email service    | ######-- | 23m    |  |
|           |  | * agent-3  | Waiting...       | -------- | 12m    |  |
|           |  | o agent-4  | idle             |          |        |  |
|           |  +------------+------------------+----------+--------+  |
|           |                                                          |
|           |  Recent Activity                      Filter v   All v  |
|           |  ------------------------------------------------       |
|           |  2m   agent-2  Opened PR #48 -- Add email service       |
|           |  8m   agent-1  Completed: notification data model       |
|           |  15m  agent-3  Created plan: notification-service       |
|           |  22m  you      Approved plan: user-preferences          |
|           |  31m  agent-2  Resolved P1: SQL injection in search     |
|           |                                                          |
|           |  Health      CI pass | Tests 847/847 | Cost $4.20      |
|           |                                                          |
+-----------+---------------------------------------------------------+
```

### 9.4 Plan Annotation View

```
+---------------------------------------------------------------------+
|  Coda  >  Plans  >  notification-service (plan-47)       [Approve]   |
+-----------+------------------------------+--------------------------+
|           |                              |                          |
|  Outline  |  Plan Content                |  Context                 |
|           |                              |                          |
|  + Goals  |  ## 2. Implementation        |  Related code:           |
|  + Scope  |                              |                          |
|  ~ Impl   |  ### Notification Service    |  src/services/           |
|    |- Svc |                              |    auth-service.ts       |
|    |- Modl|  The service will use the    |    email-service.ts      |
|    |- API |  existing event-bus pattern  |    webhook-service.ts    |
|    +- UI  |  to decouple notification    |                          |
|  o Tests  |  dispatch from triggers.     |  All use EventBus.emit() |
|  o Rollout|                              |  pattern. See line 47 of |
|           |  Methods:                    |  auth-service.ts.        |
|  Legend:  |  - send(user, channel, msg)  |                          |
|  + Apprvd |  - getPreferences(user)      |  --------------------------
|  ~ Review |  - updatePreferences(...)    |                          |
|  o Pending|  - batchSend(users, msg)     |  Prior solutions:        |
|           |                              |                          |
|           |  > You (2m ago)              |  "Email notification     |
|           |  > "Should batchSend respect |   setup" -- solved 3 days|
|           |  >  rate limits per channel?"|   ago. Used event-bus +  |
|           |  >                           |   queue pattern.         |
|           |  > Agent 3 (1m ago)          |                          |
|           |  > "Yes -- I'll add per-     |  Agent research:         |
|           |  >  channel rate limiting    |  Analyzed 3 services,    |
|           |  >  with configurable        |  47 files. Event-bus has |
|           |  >  thresholds."             |  100% adoption rate in   |
|           |  >                           |  this codebase.          |
|           |  [Add comment...]            |                          |
|           |                              |                          |
+-----------+------------------------------+--------------------------+
|  + Goals  |  + Scope  |  _ Impl  |  _ Tests  |  _ Rollout           |
|                                                                      |
|  [Approve All]   [Reject with Reason]   [Request Changes]           |
+---------------------------------------------------------------------+
```

---

## 10. Design Anti-Patterns to Avoid

These are mistakes seen repeatedly in developer tools. Coda must not repeat them.

1. **The notification firehose.** Sending a Slack message for every agent action. Users mute the channel within a day. Instead: batch, summarize, prioritize.

2. **The false progress bar.** A progress indicator that jumps from 10% to 90% in one leap, then sits at 90% for 5 minutes. If you can't measure progress accurately, use a spinner with context instead.

3. **The mystery pause.** An agent goes silent for 2 minutes with no indication of what's happening. Always show current activity, even if it's "thinking about approach..."

4. **The approval gauntlet.** Requiring human sign-off on every minor decision. Plan-level approval is the right granularity -- not file-level, not line-level.

5. **The kitchen-sink dashboard.** Showing every possible metric on one screen. The dashboard should answer "what needs my attention?" and nothing else.

6. **The "are you sure?" cascade.** Confirm -> "Are you really sure?" -> "This action is irreversible, are you absolutely sure?" One clear confirmation with context is enough.

7. **The invisible error.** An agent fails, recovers, and never tells the user. All failures should be logged and surfaceable, even if the agent self-resolved.

8. **The context-free notification.** "PR #47 needs review" with no summary. Every notification must include enough context to act without switching tools.

9. **Configuration over convention.** Requiring users to set 20 config values before they can do anything. Ship smart defaults. Let power users customize later.

10. **The mode trap.** Making users switch between "plan mode" and "work mode" manually. The system should transition between phases naturally based on the workflow state.

---

*This document is a living artifact. As Coda's UX evolves through real usage, update it through the compound loop: capture what works, discard what doesn't, and let every interaction teach the system something new.*
