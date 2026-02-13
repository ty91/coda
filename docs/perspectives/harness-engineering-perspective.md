# Harness Engineering Perspective for Coda

> _"Humans steer. Agents execute."_
> -- OpenAI, Harness Engineering (2026)

This document is written from the perspective of someone who has lived the harness engineering philosophy -- building and shipping a product with zero lines of manually-written code, driving ~1,500 PRs with a small team, and learning the hard way what breaks when agents are your primary workforce. Coda sits at the intersection of harness engineering and compound engineering. This perspective lays out what that means concretely: how the repository should be structured, how agents should see the world, how feedback loops keep quality high, and how entropy gets managed before it kills you.

---

## 1. Repository as System of Record

### The lesson we learned the hard way

We tried the "one big AGENTS.md" approach. It failed. Context is a scarce resource -- a giant instruction file crowds out the task itself, the code, and the relevant docs. When everything is "important," nothing is. The agent pattern-matches locally instead of navigating intentionally. And the monolith rots instantly because nobody maintains it and agents can't tell what's still true.

### What Coda should do

**AGENTS.md is a table of contents, not an encyclopedia.** Keep it at ~100 lines. Its job is to orient the agent: here's the project, here's how it's organized, here's where to look next. Nothing more.

The real knowledge lives in a structured `docs/` directory:

```
AGENTS.md                    # ~100 lines. Map, not manual.
ARCHITECTURE.md              # Top-level domain map, package layering, dependency rules
docs/
  design-docs/
    index.md                 # Catalogue with verification status
    core-beliefs.md          # Agent-first operating principles
    ...
  exec-plans/
    active/                  # In-flight execution plans with progress logs
    completed/               # Archived plans with decision records
    tech-debt-tracker.md     # Known debt, graded, with remediation owners
  generated/
    db-schema.md             # Auto-generated from source of truth
    api-surface.md           # Auto-generated from route definitions
  product-specs/
    index.md
    ...
  references/
    claude-code-llms.txt     # Reference docs for agent consumption
    tauri-llms.txt
    ...
  perspectives/              # Strategic perspective documents (like this one)
  DESIGN.md
  QUALITY_SCORE.md           # Per-domain, per-layer quality grades
  PLANS.md                   # Active plan index
  RELIABILITY.md
  SECURITY.md
```

**Why this structure matters:** It enables progressive disclosure. An agent starts with AGENTS.md, learns the domain map from ARCHITECTURE.md, and drills into exactly the subdirectory it needs. It never loads the full knowledge base into context. It navigates.

This is the same principle that makes a well-organized library useful: you don't read every book, you read the catalog, find the shelf, and pull the specific volume. For agents, context window is shelf space. Waste it and the agent loses the plot.

### Mechanical enforcement

Documentation that isn't enforced decays. We learned this within weeks -- stale docs caused more agent errors than missing docs because the agent trusted them.

Coda needs:
- **CI jobs that validate cross-links.** If `ARCHITECTURE.md` references `docs/design-docs/core-beliefs.md` and that file doesn't exist, CI fails.
- **Freshness checks.** If a design doc hasn't been touched in 90 days but the code it describes has changed significantly, flag it.
- **Structure linters.** AGENTS.md must have specific sections. Exec plans must have required frontmatter (status, owner, last-updated). Quality scores must be numeric.
- **A doc-gardening agent.** This runs on a recurring cadence, diffs documentation against actual code behavior, and opens fix-up PRs for anything stale. Most of these PRs can be reviewed in under a minute and automerged.

The key insight: **the repository is not just where code lives -- it's where all institutional knowledge lives.** Anything that isn't in the repo doesn't exist to the agent. That Slack thread where you decided on the Tauri plugin architecture? If it's not in `docs/design-docs/`, the agent will make a different decision. As the harness engineering post puts it: _"What Codex can't see doesn't exist."_

---

## 2. Agent Legibility Strategy

### The principle

From the agent's point of view, anything it can't access in-context while running effectively doesn't exist. Knowledge in Google Docs, chat threads, or people's heads is invisible. Repository-local, versioned artifacts are all it can see.

This means Coda must be optimized first for **agent legibility** -- making the codebase inspectable and navigable by agents, not just humans.

### Codebase legibility

**Boring technology wins.** We found that technologies described as "boring" tend to be easier for agents to model -- composable, stable APIs, well-represented in training data. For Coda:
- TypeScript with strict mode. Agents reason well about typed code.
- Rust for the Tauri backend with clear module boundaries. Agents navigate module trees better than sprawling src directories.
- Explicit, named exports. No barrel files that obscure what lives where.
- One concept per file. If an agent needs to understand "how alerts work," it should find `src/alerts/` with files named for what they do, not `utils/helpers.ts` line 847.

**Self-describing code structure:**
- Directory names that match domain concepts (`alerts/`, `plans/`, `issues/`)
- Index files that serve as local AGENTS.md for each module
- Type definitions co-located with the code that uses them
- No magic. No implicit conventions that only make sense if you "just know."

### Observability legibility

This was one of our biggest unlocks. When we gave agents access to logs, metrics, and traces, prompts like "ensure startup < 800ms" became tractable. Before that, performance work required a human staring at dashboards.

For Coda, this means:
- **Local observability stack.** Each agent working in a worktree gets an ephemeral observability environment -- logs, metrics, traces -- that gets torn down when the task is complete.
- **Structured logging from day one.** Not `console.log("something happened")` but structured JSON logs with consistent fields (timestamp, level, component, action, duration_ms). Agents can query structured logs. They can't parse prose.
- **Agent-queryable metrics.** If Coda tracks "time to display plan" or "alert delivery latency," those metrics should be queryable by the agent via a simple API or CLI command (`coda metrics query startup_time_ms --last 5m`).
- **Trace correlation.** When an agent is debugging a slow operation, it needs to follow a trace from the CLI command through the Tauri IPC bridge to the backend service. Each span should have a human-readable (and agent-readable) name.

### UI legibility

Coda has a Tauri-based UI. Agents need to validate that UI works correctly. This requires:
- **Chrome DevTools Protocol integration.** The agent should be able to launch the app, take DOM snapshots, capture screenshots, and navigate programmatically. This is how we validated UI behavior -- the agent drives the app like a user.
- **Screenshot comparison.** Before/after screenshots for visual regression. The agent captures state, makes a change, captures again, and diffs.
- **Accessible DOM structure.** Semantic HTML, ARIA labels, data-testid attributes. These aren't just for human accessibility -- they're landmarks that agents use to understand what's on screen.

### The litmus test

Ask: "If a new agent joins the project with zero prior context, can it navigate from AGENTS.md to understanding how alerts work, implement a change, validate it with tests and screenshots, and verify performance hasn't regressed -- all without asking a human?" If the answer is no, something is illegible.

---

## 3. Feedback Loop Design

### Why feedback loops matter more than code quality

Here's the counterintuitive thing we learned: the quality of individual code changes matters less than the quality of the feedback loops that validate them. A mediocre change with strong validation is safer than a brilliant change with no tests.

Compound engineering codifies this as the main loop: **Plan -> Work -> Review -> Compound -> Repeat.** The harness engineering insight is that agents should own as much of this loop as possible, with humans intervening only for judgment calls.

### Self-validation loops

Every agent task in Coda should follow this pattern:

1. **Understand the current state.** Read the relevant code, tests, and docs. Query metrics if performance is involved.
2. **Make the change.**
3. **Validate the change against the plan.** Did the change do what was intended? Run the test suite. Check type safety. Run linters.
4. **Self-review.** The agent reviews its own diff. This catches obvious mistakes -- unused imports, forgotten error handling, inconsistencies with existing patterns.
5. **Request additional agent reviews.** Specialized reviewers (security, performance, architecture) examine the change in parallel.
6. **Iterate until all reviewers are satisfied.** This is the "Ralph Wiggum Loop" -- the agent keeps going until the feedback is clean.
7. **Escalate to human only when judgment is required.** Ambiguous requirements, taste calls, production impact decisions.

### Bug reproduction cycle

For bug fixes, the loop is tighter and more specific:

1. **Reproduce the bug.** The agent runs the app, triggers the failure, captures evidence (screenshot, log output, error trace).
2. **Record the failure.** Video recording or screenshot sequence showing the broken state.
3. **Implement the fix.**
4. **Validate the fix.** Same reproduction steps, now showing the correct behavior.
5. **Record the resolution.** Second recording demonstrating the fix.
6. **Open the PR with both recordings.** The reviewer (human or agent) can see before/after without running anything.

This cycle is powerful because it makes the agent's work **auditable**. A human can glance at two screenshots and know whether the fix works. That's leverage -- a 30-second human review replaces a 15-minute manual reproduction.

### Observability-driven prompts

One of our most effective patterns was embedding performance constraints directly into task prompts:

- "Ensure the plan editor renders in under 200ms"
- "Alert delivery latency must not exceed 1 second"
- "No Tauri IPC call should take longer than 500ms"

These work because the agent can query the observability stack, measure the actual value, compare it to the threshold, and iterate until it passes. Without the observability infrastructure, these prompts are wishful thinking. With it, they're enforceable contracts.

For Coda, every user-facing flow should have a performance budget documented in `docs/RELIABILITY.md` and queryable by agents.

### The compound step

This is what separates harness engineering from "just using AI to code." After every completed task, the agent (or human) asks:

- What worked? What didn't?
- Is there a reusable pattern here?
- Should this be a lint rule? A test? A doc update?
- Would the system catch this automatically next time?

The answers get encoded back into the repository -- as updated docs, new lint rules, additional test cases, or refined AGENTS.md pointers. Each cycle makes the next cycle better. This is the compound engineering philosophy in action: _"Every unit of work makes subsequent work easier."_

---

## 4. Architecture Enforcement

### Why agents need rigid architecture more than humans do

Here's something that surprised us: agents work better with stricter architectural constraints than most human teams would tolerate. Humans can navigate ambiguity -- they remember informal conventions, they check with teammates, they use judgment. Agents replicate whatever patterns they find in the codebase, including the bad ones.

Strict architecture isn't about limiting creativity. It's about making the right thing easy and the wrong thing mechanically impossible.

### Layered domain architecture for Coda

Coda should adopt a layered architecture with explicit dependency directions. Within each business domain (plans, alerts, issues, agents), code flows through fixed layers:

```
Types -> Config -> Repo -> Service -> Runtime -> UI
```

- **Types:** Pure type definitions. No imports from other layers.
- **Config:** Configuration schemas and defaults. Depends only on Types.
- **Repo:** Data access and persistence. Depends on Types and Config.
- **Service:** Business logic. Depends on Types, Config, and Repo.
- **Runtime:** Lifecycle management, IPC handlers, CLI command handlers. Depends on Service and below.
- **UI:** Tauri frontend components. Depends on Runtime (through IPC) and Types.

Cross-cutting concerns (authentication, telemetry, feature flags) enter through a single explicit interface: **Providers.** No sneaking database calls into UI components. No importing service logic into type definitions.

### Mechanical enforcement

These rules must be enforced by code, not by convention:

**Custom linters with agent-readable remediation:**
```
ERROR: plans/ui/PlanEditor.tsx imports from plans/repo/PlanStore.ts
  UI layer cannot import directly from Repo layer.

  FIX: Move the data access logic to plans/service/PlanService.ts
  and import from there. UI -> Service -> Repo is the correct
  dependency direction.

  See: docs/design-docs/architecture-layers.md
```

The error message isn't just for humans -- it's injected into the agent's context. The remediation instruction tells the agent exactly how to fix the violation. This is one of the highest-leverage patterns in harness engineering: **lint error messages are agent prompts.**

**Structural tests:**
- Dependency direction tests that scan imports and fail if any violate the layer ordering
- Package boundary tests that ensure no cross-domain imports except through defined interfaces
- File size limits (the ~500 line rule from CLAUDE.md) enforced as lint rules

**Taste invariants:**
- Structured logging: `logger.info({ component: "alerts", action: "delivered", duration_ms: 42 })` -- not `console.log("alert delivered")`
- Naming conventions: files named for what they contain (`PlanService.ts`, not `utils.ts`), types suffixed consistently (`PlanConfig`, `AlertEvent`)
- Schema validation at boundaries: all external data (IPC messages, CLI args, API responses) validated with a schema library at the point of entry -- "parse, don't validate"

### The philosophy: enforce invariants, not implementations

We don't prescribe _how_ an agent implements a feature. We prescribe _what constraints the implementation must satisfy._ The agent can choose its approach -- but the architecture tests, linters, and type system ensure it stays within bounds.

This mirrors how you'd lead a large platform organization: enforce boundaries centrally, allow autonomy locally. You care about correctness and structure. Within those guardrails, agents (like teams) have freedom.

---

## 5. Entropy Management & Garbage Collection

### The problem

This is the thing nobody warns you about. Agents replicate patterns. That's their superpower -- show them a pattern and they'll apply it consistently across the codebase. But it's also their weakness: **they replicate bad patterns with the same enthusiasm as good ones.**

We spent every Friday (20% of the week) cleaning up "AI slop." That didn't scale. At all.

What scales is treating entropy management as a continuous, automated process -- garbage collection, not spring cleaning.

### Golden principles

Coda needs a set of "golden principles" encoded directly in the repository (not just in AGENTS.md -- in linters, tests, and structural checks):

1. **Prefer shared utility packages over hand-rolled helpers.** If three agents independently implement retry logic, you now have three retry implementations to maintain. The golden principle says: check `src/utils/` first. If the utility exists, use it. If it doesn't and should, create it there.

2. **Validate at boundaries, trust internally.** Don't sprinkle validation throughout the codebase. Parse external data at entry points (CLI args, IPC messages, API responses) and trust the typed data downstream.

3. **One source of truth for each concept.** If "plan status" is defined in three places, agents will update one and miss the others. Types are defined once, in the Types layer, and imported everywhere.

4. **No dead code.** Unused exports, commented-out blocks, TODO-without-issue-link -- these confuse agents into thinking they're meaningful. Delete them.

### Recurring cleanup agents

Coda should run cleanup agents on a regular cadence (daily or per-PR):

- **Pattern deviation scanner.** Compares new code against golden principles. Opens PRs for deviations.
- **Quality grade updater.** Each domain and layer has a quality score in `docs/QUALITY_SCORE.md`. The scanner re-evaluates scores based on current code and updates the grades.
- **Dependency audit.** Checks for unused dependencies, circular imports, and layer violations that slipped through.
- **Doc-gardening agent.** Diffs documentation against code behavior. If `docs/design-docs/alert-system.md` describes an API that no longer exists, the gardener opens a fix-up PR.

Most cleanup PRs should be reviewable in under a minute. The goal is many small corrections, not occasional massive refactors.

### Technical debt as high-interest loan

We track technical debt explicitly in `docs/exec-plans/tech-debt-tracker.md`. Each item has:
- Description of the debt
- Impact score (how much it slows future work)
- Remediation cost (estimated effort to fix)
- Interest rate (how fast the debt compounds if left unfixed)

Agents can reference this tracker when planning work. If a feature touches an area with high debt, the plan should include debt reduction as part of the implementation -- not as a separate "refactoring sprint" that never happens.

The philosophy: **continuous small payments beat periodic large payments.** Pay down debt in every PR, not in dedicated cleanup sprints that get deprioritized.

---

## 6. Autonomy Ladder for Coda

### The progression

Coda itself should progress through increasing levels of agent autonomy. This maps directly to the project's milestones and the compound engineering adoption stages.

#### Level 1: Human-Directed Task Execution (Milestone 1)

Agents execute specific, well-scoped tasks given by humans. The human writes the plan, the agent implements it, the human reviews the PR.

**What Coda provides at this level:**
- Claude Code / Codex skills and subagents for task execution
- Basic Tauri UI for plan annotation and approval
- Human reviews every PR

**Autonomy characteristics:**
- Agent cannot merge without human approval
- Agent cannot modify architectural boundaries
- Agent follows explicit plans, doesn't create them
- All feedback loops are human-initiated

#### Level 2: Self-Validating (Milestone 2)

Agents validate their own work before presenting it for review. They run tests, check linters, query metrics, capture screenshots, and iterate until all automated checks pass.

**What Coda provides at this level:**
- CLI commands for agent self-validation (`coda validate`, `coda test`, `coda lint`)
- Alert system that notifies humans only when agent judgment is insufficient
- Observability stack for performance validation
- Agent-to-agent review capability

**Autonomy characteristics:**
- Agent iterates on its own changes until CI passes
- Agent requests specific agent reviews and addresses feedback
- Human review is still required for merge
- Agent can open PRs autonomously

#### Level 3: Self-Reviewing (Milestone 3)

Agents review each other's work. Multiple specialized reviewers (security, performance, architecture, domain-specific) examine changes in parallel and provide prioritized feedback. The originating agent addresses all findings.

**What Coda provides at this level:**
- Jira/Linear integration for issue tracking
- Specialized review agents (security-sentinel, performance-oracle, architecture-strategist pattern from compound engineering)
- Quality scoring system with automated grade updates
- Improved UI for human oversight of agent-to-agent reviews

**Autonomy characteristics:**
- Agent-to-agent review handles most feedback
- Human reviews focus on intent and business logic, not implementation details
- Agent can address P2/P3 findings without human approval
- P1 findings still require human decision

#### Level 4: Self-Merging (Future)

Agents can merge their own changes when all automated and agent reviews pass. Humans are notified but not required to approve routine changes. Humans retain veto power and are escalated for judgment calls.

**Autonomy characteristics:**
- Routine changes (bug fixes with tests, doc updates, dependency bumps) auto-merge after agent review
- Feature work requires human plan approval but can auto-merge after implementation
- Architectural changes always require human approval
- Production-impacting changes always require human approval

### When to escalate to humans

The autonomy ladder only works if escalation is well-defined. Agents should escalate when:

1. **Requirements are ambiguous.** "Make the UI better" -- better how? Escalate.
2. **Multiple valid approaches with different tradeoffs.** "We can use WebSockets or SSE for real-time alerts" -- escalate with a concise summary of tradeoffs.
3. **Production impact.** Any change that affects running systems or real users.
4. **Architectural boundary changes.** Adding a new layer, changing dependency directions, introducing a new cross-cutting concern.
5. **Security-sensitive changes.** Authentication, authorization, data handling.
6. **The agent is stuck.** After N iterations without progress, escalate rather than thrashing.

The alert system is the mechanism. When an agent needs human judgment, it creates an alert with:
- What decision is needed
- Options considered with tradeoffs
- Agent's recommendation (if it has one)
- Urgency level

The Tauri UI surfaces these alerts. The human makes the call. The agent proceeds.

---

## 7. Implications for Coda's Design

### What Coda needs to provide

Coda is not just a product -- it's infrastructure for harness engineering. The CLI, UI, and alert system together form the "harness" that lets humans steer and agents execute.

### CLI commands that support the harness workflow

The CLI is the agent's primary interface. Every capability an agent needs should be available as a CLI command:

**Repository knowledge:**
- `coda docs search <query>` -- Search the knowledge base
- `coda docs validate` -- Run all documentation linters and freshness checks
- `coda architecture check` -- Validate dependency directions and layer boundaries

**Feedback loops:**
- `coda validate` -- Run the full validation suite (tests, lint, typecheck, structural tests)
- `coda metrics query <metric> --threshold <value>` -- Query observability stack with pass/fail threshold
- `coda screenshot <url-or-route>` -- Capture UI screenshot for visual validation

**Plan management:**
- `coda plan create` -- Create an execution plan from a task description
- `coda plan status` -- Check progress of active plans
- `coda plan complete` -- Mark a plan as completed and trigger compound step

**Quality management:**
- `coda quality score <domain>` -- Get current quality grade for a domain
- `coda quality scan` -- Run the pattern deviation scanner
- `coda debt list` -- Show current technical debt items

**Agent coordination:**
- `coda alert create` -- Escalate to human with structured decision request
- `coda alert status` -- Check on pending human decisions
- `coda review request` -- Request agent review of current changes

### Tauri UI as the human steering interface

The UI is where humans exercise judgment. It should surface:

1. **Alert dashboard.** Pending decisions, prioritized by urgency. Each alert shows the agent's analysis and recommendation. The human approves, rejects, or provides guidance. This is the "human steering" mechanism.

2. **Plan annotation.** Humans review plans, add comments, approve or request changes. Plans are the primary artifact in compound engineering -- the UI should make them first-class citizens.

3. **Quality overview.** Per-domain, per-layer quality grades. Trend lines showing improvement or degradation. Links to specific debt items and remediation plans.

4. **Agent activity feed.** What agents are working on right now. Which PRs are open. What reviews are in progress. This is observability for the harness itself -- you need to see what your agents are doing.

5. **Issue tracking integration.** Jira/Linear issues linked to plans, linked to PRs, linked to quality scores. The full traceability chain from "user reported a bug" to "fix merged and validated."

### Alert system as escalation mechanism

The alert system is the pressure valve that makes autonomy safe. Without it, you either give agents too little freedom (bottleneck) or too much (chaos).

Alerts should be:
- **Structured.** Not free-text messages. Typed decision requests with options, tradeoffs, and recommendations.
- **Prioritized.** P1 (blocking -- agent can't proceed), P2 (important -- agent can proceed with default), P3 (informational -- agent has already decided, human can override).
- **Actionable.** Each alert has clear actions the human can take: approve, reject, choose option A/B/C, provide custom guidance.
- **Time-bounded.** P1 alerts should have SLAs. If a human doesn't respond within the window, the alert escalates (notification sound, email, etc.).

The progression is: agents work autonomously -> agent hits a judgment call -> agent creates an alert -> Tauri UI surfaces it -> human decides -> agent proceeds. This is the "human-in-the-loop" that Coda's requirements describe, but it's designed to minimize the loop's latency and maximize the human's leverage.

---

## What Matters Most

If I had to distill everything into three priorities for Coda, they would be:

1. **Repository as system of record.** Get this right first. Everything else depends on agents being able to navigate the codebase and its knowledge base without human hand-holding. AGENTS.md as table of contents. Structured docs. Mechanical enforcement of freshness and correctness.

2. **Feedback loops over code quality.** Build the validation infrastructure early. Tests, linters, structural checks, observability, screenshot comparison. A mediocre first implementation with strong feedback loops will converge on quality fast. A brilliant first implementation without feedback loops will drift into chaos.

3. **Continuous entropy management.** Don't let debt accumulate. Don't plan for refactoring sprints. Build the cleanup agents early, run them often, and treat every golden principle violation as a bug to be fixed in the current cycle, not a task for "later."

The harness engineer's job is to build the environment where agents can do reliable work. The compound engineer's insight is that each cycle should make the next cycle easier. Coda, as a system that fuses both philosophies, should embody these principles not just in its design but in its own development process. Build the harness. Let it compound.
