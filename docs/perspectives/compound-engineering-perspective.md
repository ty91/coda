---
title: "Compound Engineering Perspective for Coda"
author: "Product Engineer, Every.to"
role: "Builder of Cora, architect of compound-engineering-plugin"
created: 2026-02-13
tags: [compound-engineering, coda, perspective, architecture]
---

# Compound Engineering Perspective for Coda

> Written from the perspective of someone who ships products using the Plan → Work → Review → Compound loop daily, who built Cora (an AI chief of staff) and the compound-engineering-plugin (26 agents, 23 commands, 13 skills).

---

## 1. The Compound Loop as First-Class Primitive

### The loop is not a suggestion — it is the system

The single most important architectural decision Coda can make is to embed Plan → Work → Review → Compound as the fundamental unit of work. Not as a guideline. Not as a "best practice" doc. As the **primitive** that every other feature is built on top of.

When I built Cora, every task — from a five-minute bugfix to a multi-day feature — passed through the loop. The loop is fractal: it works at the scale of a single function change and at the scale of a product launch. Coda should treat it the same way.

### Each phase as a CLI command and UI view

Every phase of the loop should be both a CLI command and a corresponding UI view in Coda's Tauri interface:

| Phase | CLI Command | UI View | Primary Actor |
|-------|-------------|---------|---------------|
| **Plan** | `coda plan <description>` | Plan editor with annotation, approval flow | Human + Agent |
| **Work** | `coda work [plan-ref]` | Progress tracker, worktree status, agent activity | Agent (human monitors) |
| **Review** | `coda review [pr-ref]` | Findings dashboard, priority triage, resolution tracking | Agent swarm + Human curation |
| **Compound** | `coda compound` | Solution capture form, knowledge graph view | Agent extraction + Human validation |

The UI isn't optional decoration — it's how Coda supports the human-in-the-loop tasks that the requirements document calls out. The plan annotation UI is Milestone 1 for a reason: plans are where human judgment has the highest leverage.

### The Compound step is what separates Coda from every other tool

This is the critical insight that I cannot overstate: **skip the Compound step and you're just using AI tools. Execute it and you're building a system that gets better.**

I've watched dozens of teams adopt the first three phases and plateau. They plan well, they let agents work, they review carefully — and six months later they're no faster than month one. The teams that compound are the ones shipping 10x more by month six, because every cycle deposits knowledge that the next cycle builds on.

### Enforcing the Compound step

Coda should make the Compound step **structurally unavoidable**, not merely encouraged:

1. **Gate PR merges on compound capture.** When a PR is merged, Coda should prompt: "What did this teach the system?" The prompt can be dismissed, but the dismissal is logged and visible in metrics.
2. **Auto-extract candidates.** After every review cycle, Coda should automatically identify compoundable insights: new patterns discovered, bugs that reveal missing lint rules, architectural decisions that should be documented. Present these as a checklist the user can confirm or skip.
3. **Compound score.** Track the ratio of work cycles that include a compound step. Surface this in the UI. A team running at 30% compound rate is leaving 70% of their learning on the table.
4. **Compound reminders.** If a user has completed 3+ work cycles without compounding, Coda surfaces a gentle nudge. Not a blocker — but visible.

### Plans as first-class artifacts

Plans are the new code. In the compound-engineering-plugin, `/workflows:plan` produces a structured document that gets versioned, reviewed, and referenced. Coda should go further:

- **Versioned.** Plans live in `docs/plans/` and are tracked in git. Every revision is a commit. Diffs between plan versions are meaningful.
- **Reviewable.** The Tauri UI should support plan annotation — comments on specific sections, approval/rejection workflows, inline questions. This is the Milestone 1 deliverable in the requirements.
- **Referenceable.** Plans should have stable IDs. Work items reference the plan they implement. Reviews reference the plan they validate against. Compound docs reference the plan that produced the insight.
- **Searchable.** YAML frontmatter with tags, status, complexity, domain area. Future planning sessions can find relevant past plans: "How did we handle auth last time?"
- **Composable.** Complex features should support plan hierarchies — a parent plan with child plans for sub-tasks. The compound-engineering-plugin's `/deepen-plan` (which spawns 40+ research agents) is the model here.

---

## 2. Plugin/Skill Architecture

### Lessons from the compound-engineering-plugin

The plugin ships 26 agents, 23 commands, and 13 skills. This wasn't designed top-down — it grew organically from real needs. But the taxonomy that emerged is instructive for Coda's architecture.

### Agent taxonomy

Agents are specialized workers with focused domains. Here's how I'd organize them for Coda:

**Review agents (the largest category, ~14 types):**
- Security (OWASP scanner, auth/authz checker)
- Performance (N+1 detector, caching analyzer, algorithmic complexity checker)
- Architecture (dependency direction validator, boundary checker, pattern recognizer)
- Data integrity (migration validator, transaction boundary checker)
- Quality (simplicity reviewer, framework-specific reviewers per language/stack)
- Deployment (pre-deploy checklist, rollback plan generator)
- Frontend (race condition detector, accessibility checker)
- Agent-native (ensures features are accessible to agents, not just humans)

Why so many review agents? Because review is where you catch problems cheaply. A single review agent tries to be good at everything and ends up mediocre at all of it. Fourteen specialized agents, running in parallel, each catch things the others miss. I've seen this in practice — when we added the `julik-frontend-races-reviewer` for Cora, it caught three race conditions in its first run that the generic reviewers had missed for weeks.

**Research agents:**
- Repo research analyst (codebase pattern discovery)
- Framework docs researcher (external documentation)
- Best practices researcher (industry standards)
- Spec flow analyzer (user flow and edge case analysis)

**Design agents:**
- Design iterator (screenshot → analyze → improve → repeat)
- Figma sync (compare implementation to mockup)
- Design implementation reviewer (visual bug detection)

**Workflow agents:**
- Plan orchestrator (coordinates research → planning pipeline)
- Work executor (manages worktree, tracks progress, runs validations)
- Compound extractor (analyzes completed work for reusable insights)

**Documentation agents:**
- Solution documenter (formats compound outputs)
- Doc gardener (scans for stale documentation, proposes updates)
- Changelog generator (produces release notes from merged PRs)

### Commands as workflow orchestrators

Commands are the verbs of the system. They orchestrate agents into workflows:

| Command | What it orchestrates |
|---------|---------------------|
| `coda brainstorm` | Lightweight research → interactive Q&A → captured ideation |
| `coda plan` | 3 parallel research agents → spec analysis → structured plan |
| `coda work` | Worktree setup → plan execution → validation → PR creation |
| `coda review` | 14+ parallel review agents → prioritized findings → triage |
| `coda compound` | 6 parallel extraction agents → tagged solution document |
| `coda lfg` | Full pipeline: plan → deepen → work → review → resolve → compound |

The key insight: **commands compose agents, but agents don't know about each other.** This keeps agents simple and reusable. The orchestration logic lives in the command, not in the agents.

### Skills as domain expertise on tap

Skills are passive knowledge that agents draw on — they don't execute, they inform. Examples from our plugin:

- `agent-native-architecture` — principles for building agent-accessible systems
- `our-design-system` — colors, spacing, typography, component patterns
- `our-copy-voice` — tone, word choices, examples of good/bad copy
- `testing-patterns` — how we structure tests, what we mock, coverage expectations

For Coda, skills should be:
- **User-creatable.** Users should be able to define skills as markdown files with YAML frontmatter. Drop a file in `skills/`, and it's available to all agents.
- **Composable.** An agent can reference multiple skills. A review agent might use both `security-patterns` and `our-api-conventions`.
- **Versionable.** Skills evolve. Yesterday's TypeScript conventions might change. Git tracks this.
- **Discoverable.** Skills should be tagged and indexed. When an agent is working on a frontend task, Coda should automatically surface relevant skills.

### User-created agents and skills that compound over time

This is where Coda differentiates from static tooling. The system should make it trivially easy to create new agents and skills from real work:

1. **Compound → Skill pipeline.** When the compound step captures a reusable pattern, offer to create a skill file from it. "You've documented this error handling pattern three times now. Create a skill?"
2. **Compound → Agent pipeline.** When the compound step identifies a recurring review gap, offer to create a review agent. "You keep catching N+1 queries in Rails controllers. Create a specialized reviewer?"
3. **Agent/skill metrics.** Track how often each agent/skill is used and what value it provides. Unused agents should be flagged for retirement. High-value agents should be promoted.

---

## 3. The 50/50 Rule Applied to Coda

### The ratio that makes compound engineering actually compound

50% feature work, 50% system improvement. This sounds radical to anyone raised on "ship features first." But I've lived this ratio building Cora, and the results are unambiguous: teams that invest in system improvement accelerate. Teams that don't plateau.

### How Coda should track and balance this ratio

**Classification at planning time.** When creating a plan, Coda should ask: "Is this feature work or system improvement?" Every work cycle gets tagged.

**Dashboard visibility.** The Tauri UI should show the current ratio over rolling windows (last week, last month, last quarter). When it drifts below 30% system improvement, surface a warning.

**System improvement suggestions.** After each compound step, Coda should suggest system improvement opportunities:
- "This review caught 3 security issues. Consider creating a security review agent."
- "This plan took 2 hours of research. Consider documenting the auth patterns as a skill."
- "Tests caught a regression. Consider adding a pre-commit lint rule."

### System improvement examples in Coda's context

| Category | Example | Compound Payoff |
|----------|---------|-----------------|
| New review agent | Rails N+1 detector | Catches N+1 queries automatically in every future PR |
| Documentation | Auth flow architecture doc | Every future auth-related plan starts from solid context |
| Test generator | API endpoint test scaffolder | New endpoints get baseline test coverage automatically |
| Lint rule | "No raw SQL in controllers" | Prevents entire category of mistakes |
| Skill file | "Our error handling patterns" | Agents produce consistent error handling without being told each time |
| Workflow command | "Deploy canary" | Standardizes safe deployment across the team |

### Why this ratio is critical for long-term velocity

The math is simple but counterintuitive. Say a review agent takes 2 hours to create (system improvement). It saves 15 minutes per PR review. After 8 PRs, it's paid for itself. After 100 PRs, it's saved 25 hours. That's the compound effect — small system investments yield exponential returns.

Feature work, by contrast, has linear returns. Building feature A doesn't make building feature B faster unless you compound the learnings.

---

## 4. Knowledge Compounding Strategy

### The knowledge architecture

Knowledge in Coda should live in a structured directory that mirrors how the compound loop produces it:

```
docs/
├── plans/              # /plan output — the most important artifact
│   ├── active/         # Currently being implemented
│   ├── completed/      # Done, kept for reference
│   └── templates/      # Reusable plan structures
├── solutions/          # /compound output — institutional memory
│   ├── bugs/           # Bug fixes and root causes
│   ├── patterns/       # Reusable patterns discovered
│   ├── architecture/   # Architectural decisions and reasoning
│   └── debugging/      # Debugging techniques that worked
├── brainstorms/        # /brainstorm output — captured ideation
├── reviews/            # Review findings and resolutions
└── exec-plans/         # Harness-style execution plans (see integration section)
    ├── active/
    ├── completed/
    └── tech-debt-tracker.md
```

### docs/solutions/ as institutional memory

Every solved problem becomes searchable documentation. This is the core of knowledge compounding. When building Cora, our `docs/solutions/` directory grew to 200+ entries over six months. By month four, agents were finding relevant past solutions in ~80% of planning sessions. New engineers (human or agent) could onboard by reading solutions instead of asking colleagues.

Each solution document follows a structure:

```yaml
---
title: "Fix N+1 query in comments loading"
date: 2026-02-13
tags: [performance, n+1, activerecord, eager-loading]
category: bugs/performance
related_plans: [plan-042, plan-067]
severity: P2
---

## Problem
Comments loading triggered N+1 queries when...

## Root Cause
The `has_many :comments` association wasn't eager-loaded in...

## Solution
Added `includes(:comments)` to the controller query...

## Prevention
Created lint rule `no-unbounded-association-loading` that...

## Related
- docs/solutions/patterns/eager-loading-conventions.md
- docs/solutions/bugs/similar-n+1-in-notifications.md
```

### YAML frontmatter for discoverability

Frontmatter isn't bureaucratic overhead — it's how future sessions find past work. Tags, categories, related plans, severity — these are the indexes that make knowledge retrievable.

**Required frontmatter fields:**
- `title` — human-readable summary
- `date` — when captured
- `tags` — free-form tags for search
- `category` — hierarchical category (e.g., `bugs/performance`)

**Optional but valuable:**
- `related_plans` — plans that produced this insight
- `related_solutions` — other solutions in the same space
- `severity` — how critical was the original issue
- `reuse_count` — how often this solution has been referenced (auto-tracked)

### Knowledge that compounds vs. knowledge that rots

Not all documentation is equal. Coda should distinguish between:

**Knowledge that compounds:**
- Architectural decisions with reasoning ("we chose X because Y")
- Bug root causes with prevention strategies
- Patterns extracted from multiple implementations
- Skill files that encode team taste

**Knowledge that rots:**
- Step-by-step tutorials for specific library versions
- Configuration values that change with infrastructure
- Meeting notes without extracted action items
- Undated "notes" without context

Coda should include a **doc gardener agent** (borrowed from the harness engineering approach) that periodically scans for stale knowledge. If a solution references a file that no longer exists, or a pattern that's been superseded, it flags the document for review or update.

---

## 5. Review Agent Ecosystem

### The 14 specialized reviewers and why each exists

Every reviewer exists because we learned the hard way that a generalist misses it. Here's the reasoning behind each:

| Agent | Why it exists | What a generalist misses |
|-------|--------------|-------------------------|
| **security-sentinel** | OWASP top 10 are pattern-matchable | Generalists focus on logic, not injection vectors |
| **performance-oracle** | N+1s and missing indexes are invisible to code review | You need to model query plans, not just read code |
| **architecture-strategist** | Dependency direction violations compound silently | Only caught when refactoring becomes painful |
| **pattern-recognition-specialist** | Anti-patterns spread through copy-paste | Need cross-file analysis, not line-by-line |
| **data-integrity-guardian** | Missing transactions cause data corruption | Requires understanding of concurrent access patterns |
| **data-migration-expert** | Bad migrations are irreversible in production | Need rollback planning, not just forward migration |
| **code-simplicity-reviewer** | Complexity creeps in through "just one more abstraction" | YAGNI enforcement requires stepping back from the code |
| **framework-specific reviewers** (3) | Each framework has idiomatic patterns | A Rails pattern that's correct is wrong in Express |
| **deployment-verification-agent** | Deploy checklists prevent outages | Code reviewers don't think about deploy ordering |
| **julik-frontend-races-reviewer** | UI race conditions are subtle | Need to model async event ordering |
| **agent-native-reviewer** | Features must be accessible to agents | Humans don't notice when a feature requires a UI click |

### Orchestration: running 14+ agents in parallel

The compound-engineering-plugin spawns all review agents simultaneously. Each agent receives the same diff and returns findings in a standard format. The orchestrator merges results and deduplicates.

For Coda, the orchestration should:

1. **Spawn all reviewers in parallel.** Don't wait for one to finish before starting the next.
2. **Merge findings by file and line.** Multiple agents might flag the same code. Group findings by location.
3. **Deduplicate.** If security-sentinel and architecture-strategist both flag the same issue, merge them.
4. **Priority-sort.** P1s at the top, P3s at the bottom. Within the same priority, group by agent category (security findings together, performance findings together).

### Priority system: P1 → P2 → P3

- **P1 (must fix):** Security vulnerabilities, data corruption risks, breaking changes without migration. These block merge.
- **P2 (should fix):** Performance issues, architectural violations, missing tests for critical paths. These should be addressed but can be deferred with justification.
- **P3 (nice to fix):** Style improvements, minor refactors, documentation gaps. These are optional.

### Triage workflow

The `/triage` command from the compound-engineering-plugin is essential. After the agent swarm produces findings, a human reviews them one by one:

1. **Present each finding** with context (which agent flagged it, why, severity).
2. **Human decides:** Approve (add to backlog), Skip (dismiss), Customize (change priority or details).
3. **Approved items** become work items with `status: ready`.
4. **Resolution** can be automated via `/resolve_pr_parallel` — each fix runs in isolation to avoid conflicts.

This is where Coda's Tauri UI adds real value. The triage workflow is inherently a human-in-the-loop task — exactly what the requirements call for.

### Customization for different project types

Not every project needs 14 reviewers. A Python data pipeline doesn't need `julik-frontend-races-reviewer`. A static site doesn't need `data-migration-expert`.

Coda should support **review profiles**:

```yaml
# .coda/review-profile.yaml
name: "python-api"
reviewers:
  always:
    - security-sentinel
    - performance-oracle
    - architecture-strategist
    - code-simplicity-reviewer
  when_files_match:
    - pattern: "migrations/**"
      add: [data-migration-expert, data-integrity-guardian]
    - pattern: "frontend/**"
      add: [julik-frontend-races-reviewer]
  disabled:
    - dhh-rails-reviewer
    - kieran-rails-reviewer
```

---

## 6. Stage Progression Framework

### The 6 stages

| Stage | Description | Human role | Agent role |
|-------|-------------|------------|------------|
| 0 | Manual development | Write all code | None |
| 1 | Chat-based assistance | Write code, use AI for reference | Smart search |
| 2 | Agentic tools, line-by-line review | Approve every change | Make changes, wait for approval |
| 3 | Plan-first, PR-only review | Create plans, review PRs | Research, implement, self-check |
| 4 | Idea to PR (single machine) | Describe features, review PRs | Plan, implement, review, PR |
| 5 | Parallel cloud execution | Direct fleet, review PRs | Full autonomy on multiple features |

### How Coda guides users through each transition

Coda shouldn't assume Stage 5 readiness. It should **meet users where they are** and guide them forward:

**Stage detection:** Coda observes user behavior and infers their current stage:
- Do they approve every file change? → Probably Stage 2.
- Do they create plans before work? → Probably Stage 3.
- Do they describe features and walk away? → Probably Stage 4.
- Do they run multiple features in parallel? → Probably Stage 5.

**Transition guidance:** When Coda detects a user is ready for the next stage, it suggests the transition:
- Stage 1→2: "You've been copy-pasting AI suggestions. Try letting the agent edit files directly — you can approve each change."
- Stage 2→3: "You've approved 50 changes today. Consider creating a plan and reviewing the PR instead of each change."
- Stage 3→4: "Your plans are detailed and your PRs rarely need fixes. Try describing the feature and letting the agent plan."
- Stage 4→5: "You're waiting for one agent to finish before starting the next. Try running multiple features in parallel."

### The critical Stage 2→3 transition

This is where most developers plateau, and it's where Coda should invest the most guidance. The mental model shift is profound: **stop watching the code being written and start reviewing the finished PR.**

This feels terrifying the first time. You're handing control to an agent and trusting that the plan + review system will catch problems. The compound-engineering-plugin handles this by:

1. Making plans extremely detailed (requirements, approach, edge cases, affected files).
2. Running automated review after implementation.
3. Showing the user that review agents catch issues they would have caught manually.
4. Building confidence through successful iterations.

Coda should do the same — and the Tauri UI should make the plan → PR → review flow feel natural and safe. Show the plan being executed. Show the review agents running. Show the findings. Build trust through transparency.

### Measuring and surfacing a user's current stage

Coda should track and display:
- **Approval rate:** How often does the user approve vs. reject agent changes?
- **Plan quality:** How often do plans need revision during implementation?
- **Review delta:** How much do human reviewers find beyond what agent reviewers caught?
- **Parallel factor:** How many concurrent work streams does the user manage?
- **Compound rate:** How often does the user complete the compound step?

These metrics, displayed in the Tauri dashboard, help users understand their own progression and identify what to work on next.

---

## 7. Self-Improving System Design

### Coda should use compound engineering to build itself

This is the meta-loop, and it's not optional — it's the ultimate test of whether the system works. If Coda can't use its own process to improve itself, something is broken.

When building Cora, we used the compound-engineering-plugin to build the compound-engineering-plugin. Every bug we found in the plugin was fixed using the plugin's own workflow. Every new agent we added was planned, implemented, reviewed, and compounded using the existing agents.

### The meta-loop in practice

```
1. Plan: "Add a TypeScript-specific review agent to Coda"
2. Work: Agent implements the new review agent
3. Review: Existing review agents review the new review agent's code
4. Compound: Document the pattern for creating new review agents
   → This compound document makes creating the NEXT review agent faster
```

### Capturing solutions from Coda's own development

Coda's `docs/solutions/` should include entries about building Coda itself:
- How agent orchestration was implemented
- What patterns work for parallel agent spawning
- How the Tauri UI communicates with the CLI backend
- What went wrong when review agents conflicted
- How the knowledge graph was structured

These aren't just historical records — they're the institutional memory that future Coda development builds on.

### Building Coda-specific review agents

As Coda's codebase grows, it should develop specialized reviewers for its own patterns:
- **Agent definition reviewer:** Checks that new agents follow the standard structure.
- **Skill file reviewer:** Validates YAML frontmatter, checks for broken references.
- **Command orchestration reviewer:** Ensures commands properly handle agent failures.
- **UI/CLI consistency reviewer:** Validates that CLI and Tauri UI expose the same capabilities.

### The "beliefs to let go" applied to building Coda

Building Coda itself requires the team to internalize the compound engineering beliefs:
- Don't hand-write Coda's code when agents can write it.
- Don't manually review every line when review agents can catch issues.
- Don't skip the compound step "because we're busy building."
- Don't treat plans as overhead — they're the most important artifact.
- Don't optimize for first-attempt perfection — optimize for fast iteration.

---

## 8. Integration Points with Harness Engineering

### Where compound and harness engineering reinforce each other

These two philosophies are more complementary than competitive. They attack the same problem (making agent-driven development effective) from different angles:

| Concept | Compound Engineering | Harness Engineering | Reinforcement |
|---------|---------------------|---------------------|---------------|
| **Knowledge management** | CLAUDE.md + docs/solutions/ | AGENTS.md as table of contents + docs/ as system of record | Both emphasize repository-local, versioned knowledge. Compound provides the capture process; harness provides the structural organization. |
| **Agent legibility** | "Make your environment agent-native" | "Agent legibility is the goal" — optimize for Codex's legibility | Same principle, different vocabulary. Coda should merge these into a unified "agent-native" framework. |
| **Architecture enforcement** | Taste extracted into skills and CLAUDE.md | Layered domain architecture with custom linters | Compound provides soft enforcement (conventions); harness provides hard enforcement (linters, CI). Coda needs both. |
| **Review** | 14 specialized review agents | Agent-to-agent review loops (Ralph Wiggum Loop) | Compound provides the agent taxonomy; harness provides the iteration loop. Coda should combine specialized agents with iterative resolution. |
| **Plans as artifacts** | docs/plans/ with YAML frontmatter | docs/exec-plans/ with progress and decision logs | Both treat plans as first-class. Coda should unify the format: compound's structure + harness's progress tracking. |
| **Entropy management** | 50/50 rule, compound step | Doc gardener agent, "golden principles," recurring cleanup | Compound prevents entropy through learning; harness catches entropy through automated cleanup. Coda needs both prevention and cleanup. |
| **Progressive disclosure** | Stage progression (0→5) | Progressive agent-native levels (1→4) | Both recognize that teams need gradual adoption. Coda should merge these into a single progression framework. |

### Where they might tension

**Human-centric review vs. agent-to-agent review:**
- Compound engineering emphasizes human triage of review findings. The `/triage` command presents findings one by one for human decision.
- Harness engineering pushes toward agent-to-agent review with minimal human involvement. "Humans may review pull requests, but aren't required to."
- **Resolution for Coda:** This is a stage-dependent tension. At Stages 2-3, human triage is appropriate — users are building trust. At Stages 4-5, agent-to-agent review with human exception handling is appropriate. Coda should adapt its review workflow to the user's stage.

**CLAUDE.md as encyclopedia vs. table of contents:**
- Compound engineering's CLAUDE.md tends to grow organically — add a note for every mistake, preference, and pattern.
- Harness engineering explicitly rejects the "one big AGENTS.md" approach in favor of a short pointer file.
- **Resolution for Coda:** Start with the harness approach. CLAUDE.md/AGENTS.md should be a concise map (~100 lines) pointing to detailed docs. The compound step should add knowledge to the right location in `docs/`, not to the root instruction file. A doc gardener agent should flag when the root file grows too large.

**Taste enforcement — soft vs. hard:**
- Compound engineering encodes taste in skills and agent instructions (soft enforcement).
- Harness engineering encodes taste in custom linters and CI (hard enforcement, with error messages designed for agent context).
- **Resolution for Coda:** Promote soft rules to hard rules. When a skill-based convention is violated repeatedly, Coda should suggest creating a lint rule. "This pattern has been flagged in 5 reviews. Create an automated check?" Start soft, graduate to hard as patterns stabilize.

**Feature velocity vs. system investment:**
- Compound engineering explicitly mandates the 50/50 rule.
- Harness engineering is more aggressive on velocity — "corrections are cheap, and waiting is expensive."
- **Resolution for Coda:** Both are right in their context. Early in a project (like harness's greenfield), velocity matters more. As a codebase matures (like compound's long-running products), system investment matters more. Coda should adjust the recommended ratio based on project maturity: 70/30 (feature/system) for new projects, 50/50 for established ones.

### The synthesis: what Coda uniquely offers

Coda's opportunity is to fuse these approaches into something neither could achieve alone:

1. **Compound's human-centric loop** provides the process for capturing and applying knowledge.
2. **Harness's infrastructure-first approach** provides the enforcement mechanisms that make knowledge durable.
3. **Compound's review agent taxonomy** provides the specialized analysis capabilities.
4. **Harness's agent-to-agent iteration loop** provides the resolution mechanism that scales.
5. **Compound's stage progression** provides the adoption framework.
6. **Harness's legibility-first architecture** provides the structural foundation that agents need.

The result is a system where:
- Every work cycle captures knowledge (compound).
- Knowledge is enforced mechanically (harness).
- Review is both specialized and iterative (compound agents + harness loops).
- Users are guided from manual to autonomous (compound stages).
- The codebase is optimized for agent understanding (harness legibility).
- And the whole system improves itself (both philosophies converge here).

---

## Summary: What I'd Build First

If I were starting Coda tomorrow, based on everything I've learned building Cora and the compound-engineering-plugin, here's the priority order:

1. **The loop as CLI commands** — `coda plan`, `coda work`, `coda review`, `coda compound`. Get the process working before anything else.
2. **Plan annotation UI** — The Tauri interface for reviewing and approving plans. This is the highest-leverage human-in-the-loop interaction.
3. **docs/ structure with YAML frontmatter** — Set up the knowledge architecture before you have knowledge to store. The compound step needs somewhere to put its output.
4. **3-5 core review agents** — Start with security, performance, architecture, simplicity, and agent-native. Add more as patterns emerge.
5. **Compound capture automation** — The six parallel subagents that extract, categorize, and store learnings from each work cycle.
6. **Stage detection and guidance** — Measure where users are and help them progress. The UI dashboard for progression metrics.
7. **Custom agent/skill creation** — Let users create their own agents and skills. This is where the system starts improving faster than you can improve it.
8. **Issue tracker integration** — Jira/Linear integration for surfacing review findings as trackable work items. This connects the compound loop to existing team workflows.

Each item compounds into the next. The CLI commands enable the plan UI. The plan UI enables the knowledge architecture. The knowledge architecture enables the review agents. The review agents enable the compound capture. And the compound capture makes everything else work better over time.

That's the whole point. **Make every unit of work make the next one easier.**
