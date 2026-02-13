---
title: "Compound Engineering Recommendations for Coda's docs/ Structure"
author: "Every.to Engineer"
perspective: "compound-engineering"
created: 2026-02-13
status: active
tags: [compound-engineering, docs-structure, claude-md, agents-md, knowledge-architecture]
---

# Compound Engineering Recommendations for Coda's docs/ Structure

> From the perspective of someone who ships products using the Plan → Work → Review → Compound loop daily, who built the compound-engineering-plugin (26 agents, 23 commands, 13 skills) and watched `docs/solutions/` grow to 200+ entries over six months.

---

## 1. Recommended docs/ Directory Structure

### The Principle

The directory structure must mirror the compound loop. Each phase produces artifacts, and each artifact has a home. If an artifact doesn't have a home, it won't get created. If it can't be found, it won't compound.

### Recommended Structure

```
docs/
├── plans/                    # /plan output — "plans are the new code"
│   ├── active/               # Currently being implemented
│   ├── completed/            # Done, kept for reference and future planning
│   └── templates/            # Reusable plan structures (compound output)
├── solutions/                # /compound output — institutional memory
│   ├── bugs/                 # Bug fixes with root causes and prevention
│   ├── patterns/             # Reusable patterns discovered across work
│   ├── architecture/         # Architectural decisions with reasoning
│   └── debugging/            # Debugging techniques that worked
├── brainstorms/              # /brainstorm output — captured ideation
├── design-docs/              # Long-lived architectural documentation
├── perspectives/             # Multi-perspective design documents (exists)
├── reviews/                  # Review findings and resolution records
└── research/                 # External research, user interviews, competitive analysis
```

### Why Each Directory Exists

**`docs/plans/`** — The most important directory. Plans are the primary artifact in compound engineering. They're versioned, reviewable, referenceable, and searchable. The `active/` and `completed/` split is critical: active plans are the current work queue; completed plans are the institutional memory of "how did we build X?"

**`docs/plans/templates/`** — This is where the compound step pays off for planning. When a complex plan succeeds, its structure becomes a template for similar future work. "Add a new CLI command" becomes a template after the third one.

**`docs/solutions/`** — The core of knowledge compounding. Every solved problem becomes searchable documentation. In our experience building Cora, by month four agents were finding relevant past solutions in ~80% of planning sessions. The subcategories (`bugs/`, `patterns/`, `architecture/`, `debugging/`) ensure solutions are findable by type, not just by tag search.

**`docs/brainstorms/`** — Where fuzzy ideas get captured before they become plans. The brainstorm-to-plan pipeline is important because it preserves the reasoning that led to a plan. Without it, plans appear fully-formed and the "why" is lost.

**`docs/design-docs/`** — Long-lived documents that describe how systems work, not how they were built. Design docs survive across many plan cycles. A design doc about "how auth works" is referenced by dozens of plans but outlives them all.

**`docs/reviews/`** — Review findings and their resolutions. This directory serves two purposes: (1) it tracks what was found and fixed, and (2) it feeds the compound step — recurring review findings should become lint rules or review agents.

**`docs/research/`** — External research, user interviews, competitive analysis. Structured for agent consumption (YAML frontmatter, clear sections, tagged insights). This feeds the planning phase.

### What NOT to Include

- **No `docs/todos/` in the directory itself.** Todos are operational state, not knowledge. They belong in `.coda/` (SQLite or flat files), not in `docs/`. The PRD already positions SQLite as operational storage.
- **No `docs/changelog/`.** Changelogs are generated from plans and PRs, not hand-maintained. The compound-engineering-plugin's `/changelog` command generates these.
- **No deeply nested hierarchies.** Two levels max (`solutions/bugs/`, not `solutions/bugs/performance/n-plus-one/`). Deep nesting makes things harder to find, not easier.

---

## 2. CLAUDE.md Template — The Compound Engineering Approach

### The Principle

CLAUDE.md is "the most important file" in compound engineering. The agent reads it at the start of every session. It shapes every interaction. But it must stay compact — it's a **map**, not an encyclopedia.

The tension: compound engineering wants to add a note for every mistake, preference, and pattern. But a 500-line CLAUDE.md drowns the agent in context. The resolution — which the PRD already captures — is that CLAUDE.md stays at ~100-200 lines and points to `docs/` for depth.

### Template

```markdown
# Coda

## What This Is

Coda is an agentic software engineering system. CLI (TypeScript) + Tauri UI (React/TS) + Slack integration.

## The Compound Loop

Every unit of work follows: Plan → Work → Review → Compound.
- Plans live in `docs/plans/active/`
- Solutions live in `docs/solutions/`
- Before starting work, search `docs/solutions/` for relevant prior art
- After completing work, run the compound step to capture learnings

## Architecture

[2-3 sentences on architecture + pointer to docs/design-docs/architecture.md]

## Code Conventions

[10-15 lines of concrete conventions — the ones that matter most]
- TypeScript: prefer `type` over `interface`
- [etc.]

## Patterns

[Pointers to docs/solutions/patterns/ for the 5-10 most important patterns]
- Error handling: see docs/solutions/patterns/error-handling.md
- Agent orchestration: see docs/solutions/patterns/agent-orchestration.md
- [etc.]

## Testing

[5-10 lines on testing approach + pointer to testing skill]

## Common Mistakes

[5-10 lines capturing the most impactful mistakes agents make]
- Do NOT [specific thing]. See docs/solutions/bugs/[specific-solution].md
- [etc.]

## Agent Workflow

- Always search docs/solutions/ before implementing
- Always run tests after changes
- Always capture learnings in the compound step
- Skill files are in .coda/skills/ — reference them for domain expertise

## Key Files

[Pointers to the 5-10 most important files for orientation]
```

### How CLAUDE.md Grows (and Stays Small)

The compound step is the mechanism for growth. After each work cycle:

1. **Capture the learning** in `docs/solutions/` (not in CLAUDE.md directly).
2. **If the learning is a pattern that affects every session**, add a one-line pointer in CLAUDE.md under the relevant section.
3. **If CLAUDE.md exceeds 200 lines**, the doc gardener agent flags it. Move detail to `docs/` and replace with a pointer.

The rule: **CLAUDE.md is write-once per session for pointers only.** New knowledge goes to `docs/solutions/`. Only high-frequency, high-impact patterns earn a line in CLAUDE.md.

### What Belongs in CLAUDE.md vs. docs/

| In CLAUDE.md | In docs/ |
|---|---|
| Project identity (what is this, what stack) | Full architecture documentation |
| Top 10 conventions (the ones agents violate most) | Complete style guide |
| Pointers to key patterns | Pattern definitions with examples |
| Top 5 common mistakes | Full bug post-mortems |
| Agent workflow instructions | Detailed workflow documentation |
| Key file map (5-10 entries) | Full codebase navigation guide |

---

## 3. AGENTS.md Recommendations — How It Differs from CLAUDE.md

### The Principle

AGENTS.md serves Codex (OpenAI's agent). Codex operates differently from Claude Code:
- Codex runs in sandboxed cloud environments, not locally
- Codex has a different context window and reasoning style
- Codex is optimized for coding/debugging tasks, not planning/research

AGENTS.md should be tailored for Codex's strengths and constraints while pointing to the same `docs/` knowledge base.

### Key Differences from CLAUDE.md

| Aspect | CLAUDE.md (for Claude Code) | AGENTS.md (for Codex) |
|---|---|---|
| **Tone** | Conversational, principle-oriented | Direct, instruction-oriented |
| **Planning context** | Extensive (Claude does planning + research) | Minimal (Codex receives plans, doesn't create them) |
| **Code conventions** | Principle-based ("prefer X over Y") | Rule-based ("always use X, never use Y") |
| **Error guidance** | "See docs/solutions/ for context" | "If you encounter X, do Y" — inline remediation |
| **Testing** | "Run tests and verify" | "Run `pnpm test` after every change. If tests fail, fix before proceeding." |
| **Length** | ~100-200 lines | ~80-150 lines (Codex benefits from brevity) |

### AGENTS.md Template

```markdown
# Coda — Agent Instructions

## Project

Coda: agentic software engineering system. TypeScript CLI + Tauri UI (React/TS + Rust).

## Build & Test

pnpm install
pnpm build
pnpm test
pnpm lint

## Rules

- Use `type` not `interface` for TypeScript type definitions
- [Concrete, actionable rules — no principles, just instructions]
- Every file under 500 lines. Split if needed.
- Comments in English only.

## Architecture

[Concise summary with file paths — Codex needs to know WHERE things are]
- CLI entry: src/cli/index.ts
- Agent orchestrator: src/core/orchestrator.ts
- [etc.]

## Patterns

Reference these docs when working in related areas:
- Error handling: docs/solutions/patterns/error-handling.md
- [etc.]

## Common Errors

[Inline remediation — don't make Codex search for answers]
- If you see "Cannot find module X": run `pnpm install` first
- If tests fail with "timeout": increase timeout in jest.config.ts
- [etc.]
```

### Shared Foundation

Both files point to the same `docs/` directory. The knowledge base is unified; only the entry point is different. This is critical — it means the compound step feeds both Claude and Codex simultaneously.

---

## 4. YAML Frontmatter Standard

### The Principle

Frontmatter isn't bureaucratic overhead — it's how future sessions find past work. Tags, categories, related plans — these are the indexes that make knowledge retrievable. Without frontmatter, `docs/solutions/` is just a pile of files.

### Required Fields (All Documents)

```yaml
---
title: "Human-readable summary of the document"
date: 2026-02-13
tags: [tag1, tag2, tag3]
category: "bugs/performance"  # hierarchical, slash-separated
status: "active"              # active | completed | superseded | stale
---
```

### Additional Fields by Document Type

#### Plans (`docs/plans/`)

```yaml
---
title: "Add email notification system"
date: 2026-02-13
tags: [notifications, email, user-engagement]
category: "features/notifications"
status: "active"               # draft | review | approved | executing | completed
complexity: "medium"           # low | medium | high | epic
domain: "backend"              # frontend | backend | fullstack | infrastructure | docs
estimated_files: 8
related_plans: ["plan-001", "plan-003"]
related_solutions: []
---
```

#### Solutions (`docs/solutions/`)

```yaml
---
title: "Fix N+1 query in comments loading"
date: 2026-02-13
tags: [performance, n-plus-one, database, eager-loading]
category: "bugs/performance"
status: "active"
severity: "P2"                 # P1 | P2 | P3
related_plans: ["plan-042"]
related_solutions: ["fix-n-plus-one-in-notifications"]
prevention: "lint-rule"        # lint-rule | review-agent | test | skill | manual
reuse_count: 0                 # auto-incremented when referenced
---
```

#### Brainstorms (`docs/brainstorms/`)

```yaml
---
title: "Notification system approaches"
date: 2026-02-13
tags: [notifications, brainstorm, architecture]
category: "features/notifications"
status: "active"               # active | converted-to-plan | archived
outcome_plan: ""               # plan ID if converted
---
```

### Frontmatter Validation

A CI-runnable linter should validate:
1. All required fields are present
2. `status` is a valid enum value
3. `tags` is a non-empty array
4. `date` is a valid ISO date
5. Referenced plans and solutions exist (no broken links)
6. `category` follows the hierarchical pattern

This linter is a "system improvement" investment — it takes an hour to build and prevents metadata rot forever.

---

## 5. docs/solutions/ Organization — The Heart of Knowledge Compounding

### The Principle

`docs/solutions/` is institutional memory. Every solved problem becomes searchable documentation. Future sessions find past solutions automatically. This is the single most important directory for the compound step.

### Category Structure

```
docs/solutions/
├── bugs/                      # Bug fixes with root causes
│   ├── performance/           # N+1 queries, memory leaks, slow queries
│   ├── security/              # Auth bypasses, injection fixes, CSRF
│   ├── data-integrity/        # Corrupt data, race conditions, transactions
│   └── ux/                    # UI bugs, accessibility, broken flows
├── patterns/                  # Reusable patterns discovered
│   ├── error-handling.md      # How we handle errors
│   ├── agent-orchestration.md # How we orchestrate agents
│   ├── testing-strategies.md  # Testing patterns that work
│   └── [domain]-patterns.md   # Domain-specific patterns
├── architecture/              # Architectural decisions
│   ├── adr-001-orchestration.md
│   ├── adr-002-knowledge.md
│   └── [etc.]
└── debugging/                 # Debugging techniques
    ├── agent-debugging.md
    ├── tauri-debugging.md
    └── [etc.]
```

### Solution Document Template

Every solution follows this structure (from compound-engineering-plugin):

```markdown
---
[YAML frontmatter as specified above]
---

## Problem

[What went wrong or what needed to be solved. Be specific — include error messages, symptoms, affected areas.]

## Root Cause

[Why it happened. Not just "what was broken" but "why was it broken." This is the insight that prevents recurrence.]

## Solution

[What was done to fix it. Include code snippets, configuration changes, or architectural decisions. Be specific enough that an agent could replicate the fix.]

## Prevention

[How to prevent this category of problem in the future. This is the compound payoff.]
- Lint rule: [if applicable]
- Review agent check: [if applicable]
- Test: [if applicable]
- Skill update: [if applicable]

## Related

- [Links to related solutions, plans, or external docs]
```

### Search Patterns

Solutions should be findable through multiple paths:
1. **Tag search**: "Find all solutions tagged `performance`"
2. **Category browse**: "Show all `bugs/security/` solutions"
3. **Full-text search**: "Find solutions mentioning `N+1`"
4. **Related graph**: "What other solutions relate to plan-042?"
5. **Prevention type**: "Show all solutions that resulted in lint rules"

The PRD's SQLite FTS5 index should index all solution documents with their frontmatter fields. This enables agents to search `docs/solutions/` during the planning phase.

### Compound Capture Automation

The compound step should run six parallel subagents (as specified in the compound-engineering-plugin):

1. **Context analyzer** — understands what problem was solved and why
2. **Solution extractor** — captures the specific fix and its reasoning
3. **Related docs finder** — links the new solution to existing knowledge
4. **Prevention strategist** — documents how to prevent recurrence
5. **Category classifier** — assigns tags and category for discoverability
6. **Documentation writer** — formats the final document with proper frontmatter

The human validates the output. The agent does the heavy lifting. This is "teach the system, don't do the work" in practice.

---

## 6. Skill File Organization

### The Principle

Skills are passive knowledge that agents draw on — they don't execute, they inform. They encode the team's "taste" — the preferences, conventions, and domain expertise that would otherwise live in senior engineers' heads.

### Where Skills Live

```
.coda/
├── skills/                    # User-created skill files
│   ├── design-system.md       # Colors, spacing, typography, components
│   ├── copy-voice.md          # Tone, word choices, examples
│   ├── testing-patterns.md    # How we test, what we mock, coverage
│   ├── error-handling.md      # Our error handling conventions
│   └── api-conventions.md     # API design patterns
└── agents/                    # User-created agent definitions
    └── [custom agents]
```

Skills live in `.coda/skills/`, NOT in `docs/`. This is deliberate:
- `docs/` is knowledge about what happened (historical, compound output)
- `.coda/skills/` is knowledge about how to work (prescriptive, agent instructions)

Skills are referenced by agents during work. Solutions are referenced during planning. Different purpose, different location.

### Skill File Format

```markdown
---
title: "Our Error Handling Patterns"
tags: [error-handling, conventions, typescript]
triggers: ["error", "exception", "catch", "try"]
created: 2026-02-13
updated: 2026-02-13
---

# Error Handling Patterns

## Principles
1. [Principle with rationale]
2. [Principle with rationale]

## Examples

### Good
[Concrete code example]

### Bad
[Concrete counter-example]

## Anti-Patterns
- [What NOT to do and why]
```

The `triggers` field is important — it enables automatic skill loading. When an agent encounters a plan mentioning "error handling," Coda auto-loads the relevant skill without the user having to specify it.

### The Compound → Skill Pipeline

This is one of the most powerful compound patterns:

1. You solve a problem and capture a solution in `docs/solutions/`
2. You solve a similar problem and capture another solution
3. After the third similar solution, the compound step offers: "You've documented this error handling pattern three times now. Create a skill?"
4. The agent extracts the common pattern into `.coda/skills/error-handling.md`
5. Future work cycles reference the skill automatically

This pipeline turns reactive knowledge (solutions) into proactive knowledge (skills). It's the mechanism by which the system teaches itself.

### Built-In Skills for Coda

Coda should ship with a small set of built-in skills:

1. **`agent-native-architecture`** — principles for building agent-accessible systems
2. **`testing-patterns`** — how Coda tests itself, what coverage to expect
3. **`compound-workflow`** — how the compound loop works, what each phase expects

These are the "starter culture" — they prime the system. User-created skills will quickly outnumber built-ins, and that's the goal.

---

## 7. Bootstrap Considerations — What to Create Now vs. Future

### The Principle

Coda has zero code. The docs/ structure should be created now, before code exists, because it shapes how the code is built. "Set up the knowledge architecture before you have knowledge to store" — this is directly from the compound-engineering-plugin's recommended priority order.

### Create Now (Before Any Code)

1. **`docs/` directory structure** — All directories as specified in Section 1. Empty directories with a `.gitkeep` are fine. The structure is the architecture.

2. **`CLAUDE.md`** — A skeleton using the template from Section 2. It won't have code conventions yet (no code exists), but it should have:
   - Project identity
   - The compound loop reference
   - Architecture pointers (even if the target docs don't exist yet)
   - Agent workflow instructions

3. **`AGENTS.md`** — A skeleton using the template from Section 3. Same rationale.

4. **YAML frontmatter linter** — A simple CI check that validates frontmatter on all markdown files in `docs/`. This is a system improvement investment that pays off from day one.

5. **`docs/plans/templates/`** — At least two templates:
   - `new-cli-command.md` — template for adding a CLI command
   - `new-feature.md` — general feature template

6. **First plan** — The very first thing Coda builds should go through the loop. `docs/plans/active/001-cli-foundation.md` should exist before any code is written.

### Create Soon (During Milestone 1)

7. **`docs/solutions/`** — Will start accumulating as soon as bugs are fixed and patterns emerge. The structure should be ready; the content will come.

8. **`.coda/skills/`** — Built-in skills (`agent-native-architecture`, `testing-patterns`) should ship with Milestone 1. User-created skills come in Milestone 2.

9. **`docs/design-docs/`** — Architecture design docs should be written as the architecture crystallizes. Not before — premature architecture docs are knowledge that rots.

### Create Later (Milestone 2+)

10. **Doc gardener agent** — Not needed until `docs/solutions/` has 50+ entries. Before that, manual curation suffices.

11. **Compound → Skill pipeline** — Requires enough solutions to detect patterns. Won't trigger until there are 3+ similar solutions.

12. **Review findings archive** — `docs/reviews/` won't have content until the review agent fleet exists (Milestone 2+).

13. **Research directory** — `docs/research/` is valuable but not critical for bootstrap. Add when user research begins.

---

## 8. How the Compound Step Feeds Back Into docs/

### The Feedback Loop

This is the mechanism that makes compound engineering actually compound. Without this feedback loop, you're just organizing files.

```
Plan phase
  │
  ├── Agent searches docs/solutions/ for relevant prior art
  ├── Agent searches docs/plans/completed/ for similar past plans
  ├── Agent loads relevant .coda/skills/
  │
  ▼
Work phase
  │
  ├── Agent references docs/solutions/patterns/ for conventions
  ├── Agent references .coda/skills/ for domain expertise
  │
  ▼
Review phase
  │
  ├── Review agents reference docs/solutions/ to check for known anti-patterns
  ├── Findings archived in docs/reviews/
  │
  ▼
Compound phase
  │
  ├── New solution written to docs/solutions/
  ├── If pattern emerges, skill created in .coda/skills/
  ├── If plan was novel, template created in docs/plans/templates/
  ├── CLAUDE.md updated with pointer (if high-impact)
  │
  ▼
Next Plan phase (cycle repeats, but now with more context)
```

### What Gets Deposited Where

| Compound Output | Destination | Condition |
|---|---|---|
| Bug fix with root cause | `docs/solutions/bugs/` | Always |
| Reusable pattern | `docs/solutions/patterns/` | When pattern is generalizable |
| Architectural decision | `docs/solutions/architecture/` | When decision affects system shape |
| Debugging technique | `docs/solutions/debugging/` | When technique is non-obvious |
| New convention | `.coda/skills/[relevant-skill].md` | After 3+ similar solutions |
| Plan template | `docs/plans/templates/` | When plan structure is reusable |
| CLAUDE.md update | `CLAUDE.md` | When insight affects every session |
| Lint rule suggestion | `.coda/linters/` or CI config | After 5+ review violations |

### The Compound Score

Track the percentage of work cycles that include a compound step. This is the leading indicator of whether the system is actually compounding:

- **< 30%**: The team is leaving most of their learning on the table
- **30-50%**: Good, but room for improvement
- **> 50%**: The system is actively compounding — expect accelerating velocity

The PRD already includes this metric with a target of > 50% by Milestone 3.

---

## 9. Key Synthesis Points for Product Manager

### Strongest Recommendations

1. **docs/ structure must mirror the compound loop.** Plans, solutions, brainstorms — each phase produces artifacts that have a specific home. This is non-negotiable for compounding to work.

2. **CLAUDE.md is a map, not an encyclopedia.** ~100-200 lines. Points to docs/. The compound step adds knowledge to `docs/solutions/`, not to CLAUDE.md. A doc gardener enforces the limit.

3. **YAML frontmatter is the index.** Every document gets frontmatter. Tags, categories, status, related docs. Without it, `docs/solutions/` is just a pile of files. The frontmatter linter should be a P1 for bootstrap.

4. **The compound step must be structurally encouraged.** Not blocked, not optional — structurally encouraged. Gate PR merges on a compound prompt. Auto-extract candidates. Track compound score. Make it take < 2 minutes.

5. **Skills and solutions serve different purposes.** Solutions are historical (what happened). Skills are prescriptive (how to work). They live in different places (`.coda/skills/` vs `docs/solutions/`). The pipeline between them (solution → pattern → skill) is the mechanism that turns reactive knowledge into proactive knowledge.

6. **Bootstrap docs/ structure before code.** The knowledge architecture shapes how code is built. Creating the structure first means the very first unit of work goes through the loop and compounds.

7. **Plans are first-class artifacts.** Versioned in git. Searchable by frontmatter. Referenceable by ID. Composable (parent + child plans). Templates for common types. This is "plans are the new code" made concrete.

### Where Compound Engineering Defers to Harness Engineering

- **Enforcement mechanisms.** Compound engineering encodes taste in skills and agent instructions (soft enforcement). Harness engineering encodes it in linters and CI (hard enforcement). Coda needs both — start soft, graduate to hard.
- **Agent-to-agent review at scale.** Compound engineering emphasizes human triage. Harness engineering pushes toward agent-to-agent resolution. The resolution is stage-dependent, as the PRD captures.
- **Entry file size.** Compound engineering's natural tendency is for CLAUDE.md to grow. Harness engineering's discipline keeps it compact. The harness approach is right here — CLAUDE.md stays short, docs/ holds the depth.

### Where Compound Engineering Adds Unique Value

- **The compound step itself.** This is the differentiator. No other tool systematically captures and categorizes learnings from each work cycle.
- **The 50/50 rule.** Explicit investment in system improvement. Review agents, skills, lint rules, and documentation are as important as features.
- **Stage progression framework.** Meeting users where they are and guiding them forward. The trust dial alone doesn't capture this — the compound engineering stages describe the full human journey.
- **"Teach the system, don't do the work."** This philosophy drives every design decision. Time spent improving agent context pays exponential dividends. Time spent typing code solves only the immediate task.
