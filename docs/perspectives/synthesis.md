# Perspective Synthesis: Coda

> Synthesizing insights from Harness Engineering, Compound Engineering, UX, and Technical Architecture perspectives.

**Date**: 2026-02-13
**Status**: Complete

---

## 1. Common Themes

These themes emerged independently across all four perspectives, signaling strong consensus.

### 1.1 Repository as the Single Source of Truth

All four perspectives converge on this: **the repository is not just where code lives — it's where all institutional knowledge lives.**

- **Harness**: "What Codex can't see doesn't exist." AGENTS.md as table of contents, not encyclopedia. Structured `docs/` directory with mechanical enforcement.
- **Compound**: CLAUDE.md + `docs/solutions/` as institutional memory. Every solved problem becomes searchable documentation.
- **UX**: Consistent vocabulary across surfaces. Plans, solutions, and brainstorms are first-class entities with stable IDs.
- **Architecture**: ADR-002 codifies this — files for knowledge (git-native, human-readable, agent-legible), SQLite for operational state.

**Consensus strength**: Unanimous. This is the foundational principle.

### 1.2 Plans as First-Class Artifacts

All perspectives agree that **plans, not code, are the primary artifact** of engineering work.

- **Harness**: Execution plans with progress logs, checked into the repo. Plans are versioned and co-located.
- **Compound**: "Plans are the new code." The plan document is the most important thing you produce. YAML frontmatter for discoverability.
- **UX**: Plan annotation is the highest-leverage human-in-the-loop interaction. Three-panel layout: outline, content, context.
- **Architecture**: Plan Manager with full lifecycle state machine (draft → review → approved → executing → completed). ADR-006 defines multi-channel approval.

**Consensus strength**: Unanimous. Plans are the unit of work, not individual code changes.

### 1.3 Progressive Disclosure

All perspectives advocate for **starting simple and revealing complexity as needed**.

- **Harness**: Agents start with AGENTS.md, learn the domain map, drill into specifics. Never load the full knowledge base.
- **Compound**: Stage progression (0→5). Meet users where they are. Don't assume Stage 5 readiness.
- **UX**: Zero-flag commands work out of the box. Progressive capability unlock based on usage milestones. Information hierarchy (decisions → health → active tasks → history → full logs).
- **Architecture**: Context loading strategy — always load entry point, task-relevant plans, search-based solutions, then on-demand.

**Consensus strength**: Unanimous. Overwhelm is the enemy.

### 1.4 Mechanical Enforcement Over Convention

Convention drifts. Code enforces.

- **Harness**: Custom linters with agent-readable remediation messages. Structural tests for dependency directions. CI jobs for doc validation.
- **Compound**: Review agents as mechanical enforcement. 14 specialized reviewers catching issues automatically. Promote soft rules to hard rules over time.
- **UX**: Convention over configuration for defaults, but mechanical safety nets (trust levels, quiet hours, interrupt budgets).
- **Architecture**: YAML frontmatter validation in CI. Dependency direction tests. Agent sandboxing enforced at orchestrator level.

**Consensus strength**: Unanimous. The disagreement is on *how* to enforce (see Tensions §2.3).

### 1.5 Humans Steer, Agents Execute

The role separation is clear across all perspectives.

- **Harness**: Humans prioritize work, translate feedback into acceptance criteria, validate outcomes. Never write code directly.
- **Compound**: 80/20 rule — 80% of human time on planning and review, 20% on work and compounding. Human role shifts from writing to directing.
- **UX**: The dashboard answers "What needs my attention right now?" Decisions first. The human is a decision-maker, not a code-writer.
- **Architecture**: Human-in-the-loop protocol with clear decision points. Auto-approve for low-risk scenarios; always require human judgment for high-risk ones.

**Consensus strength**: Unanimous.

### 1.6 The Compound Loop as Core Process

Plan → Work → Review → Compound is the rhythm of all work.

- **Harness**: Described as the feedback loop — self-validation, agent review, compound step encoding learnings back into the repo.
- **Compound**: Explicitly the four-step loop. The Compound step is "what separates Coda from every other tool."
- **UX**: CLI commands and UI views map directly to loop phases. Kanban columns map to loop stages.
- **Architecture**: CLI command structure mirrors the loop. ADR-005 organizes all commands around these phases.

**Consensus strength**: Unanimous. The loop is the system.

---

## 2. Tensions and Disagreements

These are the interesting friction points — areas where perspectives pull in different directions.

### 2.1 Human-Centric Review vs. Agent-to-Agent Review

**Compound's position**: Human triage of review findings. The `/triage` command presents findings one by one for human decision. "Have multiple agents review the output" but humans curate the findings. PR ownership stays with the person who initiated work.

**Harness's position**: Agent-to-agent review with minimal human involvement. "Humans may review pull requests, but aren't required to." The Ralph Wiggum Loop — agents iterate on feedback from other agents until all reviewers are satisfied.

**Why this matters**: This determines how much human attention review consumes. At scale, human review of every agent finding becomes the bottleneck.

**Recommended resolution**: This is a **stage-dependent tension**. Both approaches are correct in their context:
- **Stages 2-3**: Human triage is essential. Users are building trust and intuition. Coda should present findings for human curation (compound approach).
- **Stages 4-5**: Agent-to-agent review with human exception handling. P1 findings still escalate; P2/P3 findings are resolved agent-to-agent (harness approach).
- **Implementation**: The trust dial (from UX perspective) is the mechanism. As trust level increases, review authority shifts from human to agent.

### 2.2 CLAUDE.md: Growing Encyclopedia vs. Compact Table of Contents

**Compound's position**: CLAUDE.md is "the most important file." Add notes for every mistake, preference, and pattern. It grows organically as the system learns.

**Harness's position**: AGENTS.md (equivalent of CLAUDE.md) should be ~100 lines. "We tried the 'one big AGENTS.md' approach. It failed." Context is scarce; a giant file crowds out the task.

**Why this matters**: An entry point file that's too small misses critical context. One that's too large dilutes agent focus.

**Recommended resolution**: Adopt the **harness approach with compound's capture process**:
- CLAUDE.md stays at ~100-200 lines. It's a table of contents pointing to deeper docs.
- The compound step writes new knowledge to the appropriate location in `docs/` — not to CLAUDE.md itself.
- A doc-gardening agent monitors CLAUDE.md size. If it exceeds the threshold, it extracts content into dedicated doc files and replaces inline content with pointers.
- CLAUDE.md retains only: project overview, critical constraints, top-level conventions, and pointers to detailed docs.

### 2.3 Soft Enforcement (Skills/Instructions) vs. Hard Enforcement (Linters/CI)

**Compound's position**: Encode taste in skills, agent instructions, and CLAUDE.md. Skills are passive knowledge that agents draw on. Enforcement is through review agents that flag issues.

**Harness's position**: Encode taste in custom linters and CI jobs. Lint error messages are agent prompts — they inject remediation instructions into agent context. "When documentation falls short, we promote the rule into code."

**Why this matters**: Soft enforcement is faster to create but can be ignored. Hard enforcement is durable but takes more effort to build.

**Recommended resolution**: **Graduated enforcement** — start soft, promote to hard:
1. New patterns start as skill files or CLAUDE.md entries (soft).
2. When a soft pattern is violated 3+ times in reviews, Coda suggests promoting it to a lint rule (hard).
3. The lint rule includes an agent-readable error message with remediation (the harness pattern).
4. Track the "promotion pipeline" as a metric: how many soft rules graduated to hard rules this month?

### 2.4 Feature Velocity vs. System Investment (50/50 Rule)

**Harness's position**: Velocity first, especially early. "Corrections are cheap, and waiting is expensive." Minimal blocking merge gates. Short-lived PRs. Test flakes addressed with follow-up runs.

**Compound's position**: The 50/50 rule — 50% feature work, 50% system improvement. "Teams that invest in system improvement accelerate. Teams that don't plateau."

**Why this matters**: Over-investing in system improvement delays shipping. Under-investing causes acceleration to plateau.

**Recommended resolution**: **Maturity-dependent ratio**:
- **New project / greenfield (Milestone 1)**: 70/30 (feature/system). Get the basic loop working. Build just enough infrastructure to keep moving.
- **Growing project (Milestone 2)**: 60/40. Start investing more in review agents, documentation, cleanup.
- **Established project (Milestone 3+)**: 50/50. The compound effect is fully engaged. System investment has the highest ROI.
- Coda should track and display the current ratio in the dashboard and nudge when it drifts too far in either direction.

### 2.5 Comprehensive Architecture Documentation vs. UX Simplicity

**Architecture's position**: 7 detailed ADRs covering every major decision. Full state machine diagrams. Explicit schema definitions. Comprehensive component diagrams.

**UX's position**: Onboarding must deliver value in under 5 minutes. Maximum 3 questions during init. Smart defaults for everything. Progressive capability unlock.

**Why this matters**: The architecture demands structure that could overwhelm new users. The UX demands simplicity that could leave the system underspecified.

**Recommended resolution**: Both are right for their audience:
- **For the builder**: Architecture documentation is the blueprint. It stays comprehensive in `docs/design-docs/`. Agents reference it when building Coda.
- **For the user**: UX principles govern the experience. `coda init` asks 3 questions. Architecture is invisible until the user needs it.
- The bridge: The architecture is the *system's* knowledge. The UX is the *user's* experience. They don't conflict — they serve different audiences.

### 2.6 UI Scope: Mission Control vs. Lightweight Overlay

**UX's position**: Rich Tauri UI with dashboards, plan annotation, kanban boards, timeline views, session replay, decision logs. The UI is "mission control."

**Harness's position**: The CLI is the primary interface. The UI supplements but doesn't replace. Agents interact via CLI, not UI.

**Compound's position**: Mixed — the UI is important for human-in-the-loop tasks (plan annotation, review triage), but the CLI is where compound engineering happens.

**Recommended resolution**: **CLI-first, UI for oversight**:
- Every action available in the UI must also be available via CLI. The CLI is authoritative.
- The UI focuses on what CLI does poorly: visual comparison, spatial overview, multi-item triage, annotation.
- Milestone 1 UI is deliberately minimal: plan viewer, annotation, status dashboard. No kanban, no timeline, no session replay.
- Advanced UI features (timeline visualization, session replay) are Milestone 3 or later.

---

## 3. Surprising Insights

Ideas that emerged from a single perspective but deserve amplification across all.

### 3.1 Lint Error Messages as Agent Prompts (Harness)

When a lint rule fails, the error message should include remediation instructions written for agents, not just humans. Example:

```
ERROR: plans/ui/PlanEditor.tsx imports from plans/repo/PlanStore.ts
  UI layer cannot import directly from Repo layer.

  FIX: Move the data access logic to plans/service/PlanService.ts
  and import from there. UI -> Service -> Repo is the correct
  dependency direction.

  See: docs/design-docs/architecture-layers.md
```

This turns every lint failure into a self-correcting prompt. The agent reads the error, knows exactly what to do, and fixes it without human intervention. This is one of the highest-leverage patterns for agent-first development.

### 3.2 Compound Score (Compound)

Track the percentage of work cycles that include a compound step. A team running at 30% compound rate is leaving 70% of their learning on the table. This metric should be surfaced in the dashboard alongside velocity and quality metrics. It's the leading indicator of whether the system is getting smarter.

### 3.3 Interrupt Budget (UX)

No more than 3 P0 interrupts per hour. If the system generates more, something is wrong with plan granularity — surface a meta-alert suggesting the user give agents more autonomy. This insight reframes excessive human-in-the-loop as a system smell, not a feature.

### 3.4 Cost Visibility (UX)

Show daily API spend in the dashboard. Engineers who see cost make better decisions about parallelization. No other perspective mentioned cost, but it's a real constraint — running 14 parallel review agents on every PR isn't free. Making cost visible prevents surprise bills and encourages thoughtful agent usage.

### 3.5 The "Aha Moment" Is Overnight Work (UX)

The moment a user goes from skeptic to advocate is when they wake up to find an agent completed a task they started before bed. Coda should design for this: make it trivial to kick off work and close the laptop, and greet the user with a clear "While you were away..." summary in the morning.

### 3.6 Coda Should Build Coda (Compound)

The self-improving loop isn't aspirational — it's the litmus test. If Coda can't use its own compound loop to improve itself, the system is broken. Every bug found in Coda should be fixed through Coda's own workflow. Every new agent or skill should be planned, implemented, reviewed, and compounded using the existing system.

### 3.7 Doc Gardener as Continuous Process (Harness + Compound)

Both perspectives independently proposed a recurring agent that scans for stale documentation and opens fix-up PRs. This convergence is significant — documentation rot is the silent killer of agent-first systems. The doc gardener should be one of the first agents built, not an afterthought.

---

## 4. Cross-Cutting Concerns

Themes that span all perspectives and must be resolved holistically.

### 4.1 Knowledge Architecture Unification

The four perspectives use slightly different terminology and structures for the same concepts:

| Concept | Harness | Compound | UX | Architecture |
|---------|---------|----------|-----|--------------|
| Entry point | AGENTS.md | CLAUDE.md | — | CLAUDE.md + AGENTS.md |
| Plans | exec-plans/ | docs/plans/ | Plans view | docs/plans/{active,completed}/ |
| Solutions | (encoded in docs) | docs/solutions/ | — | docs/solutions/{category}/ |
| Quality tracking | docs/QUALITY_SCORE.md | — | Health signals | — |
| Tech debt | docs/exec-plans/tech-debt-tracker.md | — | — | docs/exec-plans/tech-debt-tracker.md |

**Resolution**: Unify into the architecture's directory structure (ADR-002), which is the most comprehensive. Adopt compound's YAML frontmatter standard for all documents. Add harness's quality scoring and tech debt tracking. Let the UX surface it all through appropriate views.

### 4.2 The Stage Progression Framework

Both compound (Stages 0-5) and harness (Autonomy Levels 1-4) define a progression framework. The UX perspective adds the trust dial (Levels 1-4). All three describe the same journey from supervised to autonomous.

**Resolution**: Merge into a single 6-stage framework (compound's is most comprehensive) with the trust dial (from UX) as the mechanism for moving between stages. The autonomy levels (from harness) define what the system allows at each stage.

### 4.3 Agent Model Routing

- **Requirements**: "Claude is good for most of the time, but Codex is better for coding, debugging, troubleshooting, and structured code reviews."
- **Architecture (ADR-001)**: Explicit routing table — planning/research/docs to Claude, coding/debugging/review to Codex.
- **Compound**: Doesn't differentiate by model — treats all agents as interchangeable workers.
- **Harness**: Built entirely on Codex; doesn't discuss multi-model routing.

**Resolution**: Follow the architecture's routing table. The orchestrator owns routing decisions. Make the routing configurable per-project so users can override defaults. Start with Claude-only in Milestone 1 (simpler), add Codex routing in Milestone 2.

### 4.4 Multi-Surface Consistency

The UX perspective is the only one that deeply addresses the CLI ↔ UI ↔ Slack experience. But it raises an important constraint that affects all perspectives: **every entity (plan, task, agent, decision) must have a stable ID that works across all surfaces**.

This means:
- Plans need IDs assigned at creation (not just file paths).
- Agent runs need IDs visible in CLI output, UI, and Slack messages.
- Decisions need IDs that work for `coda approve <id>` in CLI, action buttons in Slack, and approve buttons in UI.

The architecture's SQLite event log and the compound loop's YAML frontmatter both support this, but it needs to be a first-class design constraint from the start.

---

## 5. Priority Stack

Based on the synthesis, here is the recommended priority order for Milestone 1:

1. **Compound loop CLI commands** (`coda plan`, `coda work`, `coda review`, `coda compound`) — all perspectives agree this is the foundation.
2. **Repository knowledge structure** (`docs/plans/`, `docs/solutions/`, CLAUDE.md as map) — prerequisite for everything else.
3. **Plan annotation UI** (basic Tauri) — the highest-leverage human-in-the-loop interaction (compound + UX agree).
4. **Agent orchestrator** (Claude Code only, sequential) — get the basic routing working (architecture).
5. **Mechanical validation** (basic linters for doc structure, frontmatter validation) — prevents drift from day one (harness).
6. **Compound capture automation** — the compound step must work early or knowledge never accumulates (compound).

Items 7-8 (review agents, Codex integration) can wait for Milestone 2. The foundation must be solid first.

---

*This synthesis is itself a compound artifact — it captures the learnings from reading four detailed perspectives and should make the PRD creation easier and more coherent.*
