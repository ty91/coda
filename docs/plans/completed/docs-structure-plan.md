---
title: "Unified docs/ Structure, CLAUDE.md, and AGENTS.md Plan"
date: 2026-02-13
tags: [docs-structure, claude-md, agents-md, knowledge-architecture, bootstrap]
category: "infrastructure/knowledge"
status: approved
---

# Unified docs/ Structure and CLAUDE.md Plan

**Author**: Product Manager (synthesis of Harness Engineer + Compound Engineer recommendations)
**Date**: 2026-02-13
**Status**: Final (v3 — incorporates devil's advocate + consistency reviewer feedback)

---

## 1. Executive Summary

Coda's repository knowledge architecture is the foundation that makes every other feature possible. This plan synthesizes recommendations from two engineering perspectives:

- **Harness Engineering** (OpenAI/Codex): progressive disclosure, mechanical enforcement, agent-legible structure, ~100-line entry files
- **Compound Engineering** (Every.to): compound loop artifacts, institutional memory, solution→skill pipeline, YAML frontmatter as index

The synthesis resolves six key tensions and produces a concrete, implementable specification. A devil's advocate review then challenged the bootstrap scope, resulting in a significantly leaner initial footprint.

**What we're building**: A repository knowledge structure where agents navigate from a compact entry point (CLAUDE.md) into structured knowledge directories (docs/). Every directory maps to a phase of the compound loop. Documents have machine-readable frontmatter. Conventions are enforced — softly at first, mechanically as CI matures.

**Core principle**: Start minimal. Grow from pain, not prediction. The structure designed here is the *target architecture* — what we're growing toward. The bootstrap (Section 8) creates only what's immediately useful.

**Why now**: The structure shapes how code is built. Creating it before code means the first unit of work goes through the compound loop. But "creating it" means the minimal scaffold, not the full vision.

---

## 2. Resolved Tensions

### Tension 1: CLAUDE.md Size — Growing Encyclopedia vs. Compact Map

| Perspective | Position |
|---|---|
| **Harness** | ~100 lines, table of contents only, changes rarely |
| **Compound** | "Most important file," grows with learnings, updated by compound step |
| **PRD Resolution** | ~100-200 lines, compound step writes to docs/, doc gardener enforces limit |

**Synthesis**: CLAUDE.md stays at **~100-200 lines**. It is a map, not a manual. The compound step writes new knowledge to `docs/solutions/`. CLAUDE.md receives pointer-only updates — a one-line link to a new solution or pattern — and only when the insight is high-frequency and high-impact (affects most agent sessions). A line-count check (manual at bootstrap, CI when pipeline exists) enforces the 200-line limit.

### Tension 2: Directory Structure

| Harness Unique | Compound Unique | Shared |
|---|---|---|
| `product-specs/`, `generated/`, `references/`, cross-cutting docs | `reviews/`, `research/`, solution subcategories | `plans/`, `solutions/`, `brainstorms/`, `design-docs/`, `perspectives/` |

**Synthesis**: Create shared directories at bootstrap. Defer unique directories until they earn their existence through real content (see Growth Triggers in Section 9).

**Devil's advocate correction**: Don't create empty directories with `.gitkeep` files. A directory earns creation when it has its first real file. The target structure is documented; the bootstrap is minimal.

### Tension 3: AGENTS.md vs. CLAUDE.md — Shared vs. Unique

Both perspectives agree these are different entry points to the same knowledge base.

**Synthesis**: CLAUDE.md is the **sole entry point at bootstrap**. AGENTS.md is deferred to Milestone 2 when Codex integration ships. Rationale: Codex is explicitly not in Milestone 1 (PRD Section 6). Creating AGENTS.md now means maintaining a file with zero readers that will be stale by the time Codex arrives.

**Target state (M2)**: AGENTS.md (~80-120 lines) tailored for Codex: direct/instructional tone, rule-based conventions, inline error remediation. Created from real Codex behavior, not speculation.

### Tension 4: Cross-Cutting docs/ Files

Harness recommends `QUALITY_SCORE.md`, `SECURITY.md`, `RELIABILITY.md`, `PLANS.md`, `DESIGN.md`.

**Synthesis**: Defer all cross-cutting docs until they describe real content. For a zero-code project, empty quality scores and reliability budgets are noise.

### Tension 5: Enforcement — Soft (Skills) vs. Hard (Linters)

**Synthesis**: **Graduated enforcement** as the PRD specifies:
1. New conventions start as CLAUDE.md entries or skill files (soft)
2. After 3+ review violations, compound step suggests promoting to a lint rule (hard)
3. Lint rules include agent-readable error messages with remediation instructions (harness pattern)

**Devil's advocate correction**: No custom linter at bootstrap. There's no CI pipeline yet. CLAUDE.md states the conventions; agents and humans self-enforce. Automate when CI exists AND there are 10+ documents to validate.

### Tension 6: todos/ Location

**Synthesis**: Todos are operational state, not knowledge. They belong in `.coda/` (eventually SQLite). `docs/` is for knowledge that compounds.

**Note**: ADR-002 (technical-architecture.md) places `todos/` at the repo root. That ADR should be updated to reflect this resolution.

### ADR-002 Reconciliation

The plan deviates from ADR-002 in several intentional ways. These are documented here so the ADR can be updated.

| ADR-002 Specification | Plan Decision | Rationale |
|---|---|---|
| `exec-plans/` as separate directory | Merged into `plans/` | Both perspectives used `plans/` with `active/` and `completed/`. `exec-plans/` is redundant — all plans are execution plans. `tech-debt-tracker.md` is deferred; when needed, it lives in `docs/plans/` or `docs/design-docs/`. |
| `todos/` at repo root | Moved to `.coda/` (SQLite) | Todos are operational state, not knowledge (see Tension 6). |
| `created` frontmatter field | Renamed to `date` | PRD Section 6 uses `date`. Plan follows the PRD. ADR-002 should update. |
| `confidence` in frontmatter | Added as optional field for solutions and plans | ADR-002 includes it; plan originally omitted it. Restored as recommended (useful for context loading). |
| `related` as single array | Split into `related_plans` and `related_solutions` | Typed arrays provide clearer intent and enable targeted validation (plan refs vs. solution refs). Improvement over ADR-002's untyped array. |

---

## 3. Target docs/ Directory Structure

This is the **target architecture** — what Coda's docs/ grows toward. Section 8 (Bootstrap) specifies what to create now.

```
your-project/
├── CLAUDE.md                         # Agent entry point (~100-200 lines)
├── ARCHITECTURE.md                   # Domain map, layer rules (created when code begins)
│
├── .coda/                            # Coda runtime configuration
│   ├── config.yaml                   # Project-level Coda configuration
│   ├── state.db                      # SQLite (gitignored, Milestone 2)
│   ├── skills/                       # Prescriptive knowledge — how to work (created before first impl)
│   │   ├── agent-native-architecture.md  # Built-in: agent-accessible system patterns
│   │   ├── testing-patterns.md           # Built-in: how Coda tests itself
│   │   └── compound-workflow.md          # Built-in: how the compound loop works
│   └── agents/                       # Custom agent definitions
│
├── docs/
│   ├── plans/                        # Plan → the primary work artifact
│   │   ├── active/                   # In-flight: draft/review/approved/executing
│   │   ├── completed/                # Done: kept for reference and future planning
│   │   └── templates/                # Reusable plan structures (from compound step)
│   │
│   ├── solutions/                    # Compound → institutional memory (flat at first)
│   │
│   ├── brainstorms/                  # Pre-plan → captured ideation
│   │
│   ├── design-docs/                  # Long-lived architectural documentation
│   │
│   ├── product-specs/                # What the product does (when 5+ PM artifacts)
│   ├── generated/                    # Auto-generated from code (when code exists)
│   ├── references/                   # LLM-formatted external docs (when curated)
│   ├── reviews/                      # Review findings archive (Milestone 2)
│   ├── research/                     # External research (when research begins)
│   │
│   └── perspectives/                 # Strategic perspective documents (existing)
│       ├── compound-engineering-perspective.md
│       ├── harness-engineering-perspective.md
│       ├── synthesis.md
│       ├── technical-architecture.md
│       └── ux-perspective.md
│
├── AGENTS.md                         # Codex entry point (Milestone 2)
└── .gitignore
```

### Directory Purpose Matrix

| Directory | Loop Phase | Who Writes | Who Reads | When Created |
|---|---|---|---|---|
| `plans/active/` | Plan | `coda plan` | `coda work`, agents | Bootstrap |
| `plans/completed/` | Archive | `coda work` | Planning agents | Bootstrap |
| `plans/templates/` | Compound | Compound step | `coda plan` | After 3+ completed plans |
| `solutions/` | Compound | `coda compound` | Planning agents | Bootstrap (flat) |
| `brainstorms/` | Pre-plan | `coda brainstorm` | Humans, agents | Bootstrap |
| `design-docs/` | Cross-cut | Humans + agents | Agents | Bootstrap |
| `product-specs/` | Cross-cut | Humans (PMs) | Planning agents | When 5+ specs |
| `generated/` | Post-build | CI/build scripts | Agents | When code exists |
| `references/` | Cross-cut | Humans (curated) | Agents | When first ref curated |
| `reviews/` | Review | Review agents | Compound step | Milestone 2 |
| `research/` | Cross-cut | Humans | Planning agents | When research starts |
| `perspectives/` | Design | Humans + agents | Design phase | Exists already |

### What's NOT in docs/

| Excluded | Why | Where Instead |
|---|---|---|
| Todos/triaged findings | Operational state | `.coda/` (SQLite) |
| Changelogs | Generated, not maintained | Auto-generated by CLI |
| Skills | Prescriptive (how to work), not historical | `.coda/skills/` |

---

## 4. CLAUDE.md Specification

### Purpose

CLAUDE.md is the entry point for Claude Code — and at bootstrap, the sole agent entry point. It's read at the start of every session. It must be compact enough to not crowd out the task but comprehensive enough to orient the agent.

Docs are for agents AND humans, with agent legibility as the tiebreaker when they conflict. CLAUDE.md is displayed in the human's terminal too — it should be readable by both audiences.

### Line Budget: 100-200 lines

| Section | Lines | Content |
|---|---|---|
| Project identity | 3-5 | What is Coda, what's the stack |
| Compound loop reference | 5-8 | The four phases, where artifacts live |
| Quick commands | 5-8 | Build, test, lint, validate |
| Architecture summary | 3-5 | Layer rule (inline, not a separate file until code exists) |
| Knowledge navigation | 10-15 | docs/ directory map with one-line descriptions |
| Code conventions | 10-15 | Top 10 conventions (the most-violated ones) |
| Pattern pointers | 5-10 | Links to top patterns in docs/solutions/ |
| Common mistakes | 5-10 | Top mistakes with links to solutions |
| Agent workflow | 5-8 | Search solutions → implement → test → compound |
| Document conventions | 3-5 | Frontmatter requirements and status values |
| **Total** | **~60-95** | Leaves headroom for organic growth to 200 |

### What CLAUDE.md Contains (Bootstrap Version)

```markdown
# Coda

Coda is an agentic software engineering system: CLI (TypeScript) + Tauri UI (React/TS + Rust) + Slack integration. Humans steer, agents execute, every unit of work compounds.

## The Compound Loop

Every unit of work follows: Plan → Work → Review → Compound.
- Plans: `docs/plans/active/` — check before starting new work
- Solutions: `docs/solutions/` — search before implementing
- Brainstorms: `docs/brainstorms/` — capture fuzzy ideas before planning
- After completing work, capture learnings via the compound step

## Commands

- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Full validation: `pnpm validate`

## Architecture

Layers (dependency direction): Types → Config → Repo → Service → Runtime → UI
Cross-cutting concerns enter through Providers only.

[When ARCHITECTURE.md exists, add: See ARCHITECTURE.md for full domain map.]

## Repository Knowledge

All project knowledge lives in `docs/`. Navigate there before asking.

| Directory | Contents |
|---|---|
| `docs/plans/active/` | Current execution plans |
| `docs/plans/completed/` | Past plans for reference |
| `docs/solutions/` | Institutional memory — past problems and solutions |
| `docs/brainstorms/` | Captured ideation and research before plans |
| `docs/design-docs/` | Architecture decisions and design rationale |
| `docs/perspectives/` | Multi-perspective design analysis |

## Code Conventions

- TypeScript: prefer `type` over `interface`
- Files under 500 lines. Split when approaching limit.
- Validate at boundaries (IPC, CLI args, API responses). Trust typed data internally.
- Structured logging: `logger.info({ component, action, duration_ms })`
- No barrel files. Explicit named exports.
- One concept per file. Name files for what they contain.
- Comments in English.
- Use pnpm (not npm/yarn).

## Document Conventions

All documents in `docs/` should include YAML frontmatter:
- Required: `title`, `date`
- Recommended: `tags`, `category`, `status`
- Status values by type:
  - Plans: draft | review | approved | executing | completed
  - Brainstorms: active | converted-to-plan | archived
  - Design docs: active | superseded | deprecated

## Patterns

[Pointers added as patterns emerge from docs/solutions/]

## Common Mistakes

[Added by compound step as mistakes are discovered and documented]

## Agent Workflow

1. Search `docs/solutions/` for relevant prior art before implementing
2. Check `docs/plans/active/` for an existing plan
3. Reference `.coda/skills/` for domain expertise (when skills exist)
4. Run `pnpm validate` before completing
5. Capture learnings in the compound step

## When Stuck

1. Search `docs/solutions/` — someone may have solved this
2. Check `docs/design-docs/` — there may be a design decision you're missing
3. If still stuck, escalate with a structured summary of what you tried
```

### What CLAUDE.md Does NOT Contain

- Full architectural documentation → ARCHITECTURE.md (when it exists)
- Design decisions → `docs/design-docs/`
- Past plans or progress → `docs/plans/`
- Past solutions → `docs/solutions/`
- Operational state → `.coda/`

### Growth Rules

1. The compound step writes new knowledge to `docs/solutions/`, NOT to CLAUDE.md
2. CLAUDE.md receives **pointer-only updates**: a one-line link to a new pattern or common mistake
3. Only high-frequency, high-impact patterns earn a line in CLAUDE.md (validated across 3+ work cycles)
4. 200-line limit enforced: manually at bootstrap, CI check when pipeline exists
5. If CLAUDE.md exceeds 200 lines: extract content to `docs/`, replace with pointers

---

## 5. AGENTS.md Specification (Milestone 2)

AGENTS.md is **deferred to Milestone 2** when Codex integration ships. Creating it now would mean maintaining a file with zero readers.

### Target State (M2)

| Aspect | CLAUDE.md | AGENTS.md |
|---|---|---|
| Target | Claude Code | Codex, generic agents |
| Tone | Conversational, principle-oriented | Direct, instruction-oriented |
| Planning context | Extensive (Claude does planning) | Minimal (Codex receives plans) |
| Conventions | Principle-based ("prefer X") | Rule-based ("always X, never Y") |
| Error guidance | Pointers to docs/ | Inline remediation |
| Updated by | Compound step (automated) | Humans only (stable) |
| Length | ~100-200 lines | ~80-120 lines |

Both files will point to the same `docs/` knowledge base. The compound step writes to `docs/solutions/`, which both entry files reference — new knowledge is immediately accessible to both Claude and Codex agents without updating either entry file. AGENTS.md will be written from real Codex behavior during M2, not from current speculation.

---

## 6. YAML Frontmatter Standard

### Bootstrap Requirements (Minimal)

At bootstrap, frontmatter is a **convention stated in CLAUDE.md**, not a CI-enforced rule.

**Required on all docs:**

```yaml
---
title: "Human-readable summary"
date: 2026-02-13
---
```

**Recommended (add when useful):**

```yaml
---
title: "Human-readable summary"
date: 2026-02-13
tags: [tag1, tag2, tag3]      # Recommended for search
category: "type/subtype"      # Recommended for classification (e.g., "features/notifications")
status: "active"              # Required for plans and brainstorms
---
```

### Full Standard (When CI Exists + 20 Docs)

When the project has CI infrastructure and 20+ documents, promote to required:

```yaml
---
title: "Human-readable summary"
date: 2026-02-13              # ISO 8601
tags: [tag1, tag2, tag3]      # Non-empty array
category: "type/subtype"      # Hierarchical, slash-separated
status: "active"              # Enum per document type
---
```

Note: `category` is listed as P1 in PRD Section 6. It's recommended (not required) at bootstrap because with few documents, directory structure provides sufficient categorization. It becomes required at the full standard level.

### Additional Fields by Document Type

These fields are defined now but only required when the respective doc types accumulate enough entries to need them.

#### Plans (`docs/plans/`)

```yaml
status: "draft"               # draft | review | approved | executing | completed
complexity: "medium"          # low | medium | high | epic
domain: "backend"             # frontend | backend | fullstack | infrastructure | docs
confidence: "high"            # low | medium | high (optional, for context loading)
related_plans: []
related_solutions: []
```

#### Solutions (`docs/solutions/`)

```yaml
severity: "P2"                # P1 | P2 | P3
confidence: "high"            # low | medium | high (for context loading filtering)
prevention: "lint-rule"       # lint-rule | review-agent | test | skill | manual
related_plans: []
related_solutions: []
reuse_count: 0
```

#### Brainstorms (`docs/brainstorms/`)

```yaml
status: "active"              # active | converted-to-plan | archived
outcome_plan: ""              # Plan ID if converted
```

#### Design Docs (`docs/design-docs/`)

```yaml
status: "active"              # active | superseded | deprecated
last_verified: 2026-02-13     # When code exists to verify against
```

### Documents Exempt from Frontmatter

- `index.md` files
- Files in `perspectives/` (existing, legacy format)
- `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md` (root-level entry points)

---

## 7. Mechanical Validation Rules

### Phase 1: Convention (Bootstrap — No CI)

At bootstrap, there is no CI pipeline. Validation is through conventions in CLAUDE.md and human/agent self-enforcement.

**Conventions to state in CLAUDE.md:**
- CLAUDE.md stays under 200 lines
- All docs include `title` and `date` frontmatter
- Plans include `status` frontmatter
- Files stay under 500 lines

### Phase 2: Basic CI (When Pipeline Exists)

When a CI pipeline is established (likely early Milestone 1), add these checks:

| Check | Rule | Error Message |
|---|---|---|
| CLAUDE.md line limit | ≤ 200 lines | `CLAUDE.md is {n} lines (max 200). Move detailed content to docs/.` |
| Frontmatter present | All docs in plans/, solutions/, design-docs/ have title + date | `{file} missing frontmatter. Required: title, date.` |
| Cross-link validation | Markdown links in CLAUDE.md resolve | `{file}:{line} links to {target} which does not exist.` |
| File size limit | Source files ≤ 500 lines | `{file} is {n} lines (max 500). Split into smaller modules.` |

### Phase 3: Full Validation (20+ Docs, Milestone 2)

| Check | Rule | Error Message |
|---|---|---|
| Full frontmatter | Required fields: title, date, tags, status | `{file} missing required field: {field}.` |
| Status enum | Status is valid for document type | `{file} has invalid status: {value}. Expected: [{valid}].` |
| Freshness | Design docs updated within 90 days if code changed | `{doc} not updated in {n} days but related code changed.` |
| Plan lifecycle | Active plans updated within 14 days | `{plan} active {n} days without update.` |
| Index completeness | index.md lists all files in directory | `{file} not in {dir}/index.md.` |
| AGENTS.md line limit | ≤ 120 lines | `AGENTS.md is {n} lines (max 120).` |

### Lint Error Messages as Agent Prompts

When CI checks exist, every error follows this pattern:

```
{LEVEL}: {what's wrong}
  {file}:{line} — {specific violation}

  FIX: {how to fix it — actionable steps}

  See: {link to relevant documentation}
```

This turns lint failures into self-correcting agent prompts.

---

## 8. Bootstrap Plan — What to Create NOW

Coda has zero application code. The bootstrap creates the **minimum viable scaffold** that lets the first unit of work go through the compound loop.

### Bootstrap Files (Create Immediately)

| # | File | Content | Why Now |
|---|---|---|---|
| 1 | `CLAUDE.md` | Per Section 4 bootstrap template | THE agent entry point. Without it, agents have no orientation. |
| 2 | `docs/plans/active/` | Directory (exists) | Plans are the primary work artifact. First plan goes here. |
| 3 | `docs/plans/completed/` | Empty directory | Completed plans need a home from day one. |
| 4 | `docs/solutions/` | Empty directory | CLAUDE.md points agents here. Must exist to search. |
| 5 | `docs/brainstorms/` | Empty directory | Brainstorm artifacts need a home. |
| 6 | `docs/design-docs/core-beliefs.md` | Agent-first operating principles from PRD Section 5 | The "golden principles" that guide all future code. |
| 7 | `.coda/config.yaml` | Minimal project config (project name) | Runtime configuration foundation. |

**Total: 7 items** (1 real file + 4 directories + 1 design doc + 1 config)

### What's NOT in Bootstrap (and Why)

| Deferred Item | Why Not Now | Growth Trigger |
|---|---|---|
| `AGENTS.md` | Codex is M2. Zero readers. | Codex integration ships |
| `ARCHITECTURE.md` | No code, no domains, no layers. CLAUDE.md has the 2-line summary. | First implementation plan defines real modules |
| `docs/plans/templates/` | Templates from theory are wrong. Extract from practice. | After 3-5 completed plans, extract common structure |
| `docs/solutions/` subcategories | Zero solutions. Flat directory is fine. | When 10+ solutions cluster into natural categories |
| `docs/design-docs/index.md` | Index of 1 file is overhead. | When design-docs/ has 5+ files |
| `docs/design-docs/architecture-layers.md` | No layers exist yet. | When first code defines module boundaries |
| `docs/product-specs/` | PRD.md works fine where it is. 2 files don't need a directory. | When 5+ product spec documents exist |
| `docs/generated/` | No code to generate from. | When first schemas/APIs exist |
| `docs/references/` | No curated references yet. | When first LLM-formatted reference is created |
| Frontmatter linter | No CI pipeline. Convention in CLAUDE.md suffices. | When CI pipeline exists AND 10+ docs |
| `.coda/skills/` (all 3 built-in) | No code to apply skills to. | Before first implementation plan (agent-native-architecture, testing-patterns, compound-workflow) |
| `docs/reviews/` | No review fleet. | Milestone 2 |
| `docs/research/` | Not critical. | When research starts |
| Cross-cutting docs | No content. | When content exists |
| Solution subcategories | No solutions. | When 10+ solutions cluster naturally |

### Existing Files — What Happens to Them

| Existing File | Action | Rationale |
|---|---|---|
| `docs/PRD.md` | **Leave in place** | Moving creates churn and breaks perspective references. Relocate when product-specs/ has 5+ files. |
| `docs/requirements.md` | **Leave in place** | Same rationale. |
| `docs/harness-engineering.md` | **Leave in place** | Source material. Relocate to references/ when that directory is created. |
| `docs/compound-engineering.md` | **Leave in place** | Same rationale. |
| `docs/perspectives/*` | **Leave in place** | Design phase artifacts. |
| `docs/plans/active/*.md` | **Keep** | Recommendation docs from this planning process. Move to completed/ when synthesis is done. |

---

## 9. Growth Triggers — When to Add What

The bootstrap is minimal. Structure grows in response to real need, not prediction. This table defines when each deferred item earns creation.

| Trigger | Action | Items Created |
|---|---|---|
| **First implementation plan** | Create ARCHITECTURE.md, `.coda/skills/` (all 3 built-in skills) | Architecture file, built-in skills |
| **CI pipeline exists** | Add basic validation checks | CLAUDE.md line limit, frontmatter presence, cross-link validation |
| **3-5 completed plans** | Extract plan template | `docs/plans/templates/plan.md` |
| **10+ documents total** | Require frontmatter: title + date + tags | Promote convention to CI check |
| **10+ solutions** | Add subcategories based on natural clusters | `docs/solutions/{category}/` dirs |
| **5+ design docs** | Add index | `docs/design-docs/index.md` |
| **5+ product specs** | Create directory, move PRD | `docs/product-specs/` |
| **First curated reference** | Create directory | `docs/references/` |
| **Code generates schemas** | Create directory | `docs/generated/` |
| **Codex integration (M2)** | Create from real behavior | `AGENTS.md` |
| **Review agent fleet (M2)** | Create directory | `docs/reviews/` |
| **50+ docs** | Build automated checks | Doc gardener, full frontmatter linter |
| **3+ similar solutions** | Offer skill creation | Compound→skill pipeline |
| **100+ docs** | Build search index | SQLite FTS over docs/ |

---

## 10. Solution Document Template

Every solution in `docs/solutions/` follows this structure. The frontmatter below shows the **full set** of fields from Section 6. At bootstrap, only `title` and `date` are required; the rest are recommended.

```markdown
---
title: "[descriptive title]"
date: YYYY-MM-DD
tags: [relevant, tags]
category: "bugs/performance"
status: "active"
severity: "P2"
confidence: "high"
prevention: "lint-rule"
related_plans: []
related_solutions: []
reuse_count: 0
---

## Problem

[What went wrong or needed to be solved. Include error messages, symptoms, affected areas.]

## Root Cause

[Why it happened — the insight that prevents recurrence.]

## Solution

[What was done. Code snippets, config changes, architectural decisions. Specific enough for an agent to replicate.]

## Prevention

[How to prevent this category of problem.]
- Lint rule: [if applicable]
- Review agent check: [if applicable]
- Test: [if applicable]
- Skill update: [if applicable]

## Related

- [Links to related solutions, plans, or external docs]
```

---

## 11. Plan Document Template

Every plan in `docs/plans/` follows this structure. The frontmatter below shows the **full set** of fields from Section 6. At bootstrap, only `title`, `date`, and `status` are required; the rest are recommended.

```markdown
---
title: "[feature/fix description]"
date: YYYY-MM-DD
tags: [relevant, tags]
category: "features/[domain]"
status: "draft"
complexity: "medium"
domain: "backend"
confidence: "high"
related_plans: []
related_solutions: []
---

## Goal

[One sentence: what does this plan achieve?]

## Context

[Why this work is needed. Link to relevant brainstorms, product specs, or design docs.]

## Prior Art

[Links to relevant solutions from docs/solutions/ that inform this plan.]

## Approach

### Step 1: [description]
- [ ] [specific task]
- [ ] [specific task]

### Step 2: [description]
- [ ] [specific task]

## Validation

[How to verify the plan succeeded.]
- [ ] Tests pass
- [ ] Lint passes
- [ ] [domain-specific checks]

## Risks

[Known risks and mitigations.]

## Progress Log

[Updated as work proceeds.]
- YYYY-MM-DD: [status update]
```

---

## 12. Compound Loop Feedback — How docs/ Enables Compounding

```
Plan phase
  │  Agent searches docs/solutions/ for relevant prior art
  │  Agent searches docs/plans/completed/ for similar past plans
  │  Agent loads relevant .coda/skills/ (when they exist)
  ▼
Work phase
  │  Agent references docs/solutions/ for conventions and patterns
  │  Agent references .coda/skills/ for domain expertise
  ▼
Review phase
  │  Review agents reference docs/solutions/ for known anti-patterns
  │  [M2+] Findings archived in docs/reviews/
  ▼
Compound phase
  │  New solution → docs/solutions/
  │  If reusable plan structure → docs/plans/templates/ (after 3+ plans)
  │  If high-impact pattern → one-line pointer in CLAUDE.md
  │  If 3+ similar solutions → .coda/skills/ update
  │  If 5+ review violations → suggest lint rule promotion
  ▼
Next Plan phase (more context than before)
```

This is the mechanism that makes Coda's docs/ structure more than file organization — it's the compound loop's substrate. The structure enables the loop; the loop fills the structure.

**Important caveat** (from devil's advocate review): Whether agents actually produce better plans when given `docs/solutions/` to search is an unproven hypothesis. The structure enables testing this hypothesis. Early compound cycles should explicitly measure whether prior solutions were referenced and whether they improved outcomes.

---

## 13. Devil's Advocate Feedback — What Changed

The original plan (v1) had ~15 bootstrap files. After devil's advocate review, v2 has 7 items (1 real content file, 4 directories, 1 design doc, 1 config). Key changes:

| v1 Decision | v2 Decision | Rationale |
|---|---|---|
| Create AGENTS.md at bootstrap | Defer to M2 | Zero readers until Codex ships |
| Create ARCHITECTURE.md at bootstrap | Defer until code exists | Nothing to describe; CLAUDE.md has the summary |
| Create frontmatter linter at bootstrap | Defer until CI exists + 10 docs | Over-engineering for ~5 files |
| 5 required frontmatter fields | 2 required (title, date), rest recommended | Convention over configuration at this scale |
| Solution subcategories (bugs/, patterns/, etc.) | Flat docs/solutions/ | No solutions to categorize; grow from natural clusters |
| Move existing files (PRD.md, etc.) | Leave in place | Avoids churn and broken references |
| 2 plan templates from theory | Zero templates | Extract from practice after 3-5 real plans |
| Create product-specs/ + references/ + generated/ | Defer all | 2 files don't need a directory |

The plan now separates **target architecture** (Section 3, what we grow toward) from **bootstrap** (Section 8, what we create now). The growth triggers (Section 9) define the specific conditions under which each piece of deferred structure gets created.

---

## 14. Consistency Review Feedback — What Changed (v2 → v3)

The consistency reviewer identified 3 significant inconsistencies and 4 minor items. All addressed in v3.

### Significant Issues Resolved

| Issue | Resolution |
|---|---|
| **exec-plans/ omission** — ADR-002 defines it, plan didn't mention it | Added ADR-002 Reconciliation table (Section 2). `plans/` intentionally subsumes exec-plans/. `tech-debt-tracker.md` deferred; when needed, lives in `docs/plans/` or `docs/design-docs/`. |
| **Frontmatter field mismatches** — `date` vs `created`, missing `confidence`, split `related` | Added ADR-002 Reconciliation table documenting all three deviations. Restored `confidence` as optional field for solutions and plans (Section 6). |
| **compound-workflow.md skill missing from timeline** | Added to growth triggers (Section 9): all 3 built-in skills created together before first implementation plan. Clarified in target directory tree (Section 3). |

### Minor Items Resolved

| Item | Resolution |
|---|---|
| "Feeds both simultaneously" misleading | Reworded Section 5 to clarify: compound step writes to `docs/solutions/`, which both entry files reference. Neither entry file is directly updated. |
| `product-specs/` frontmatter spec missing | Not a bootstrap directory in v2 (deferred until 5+ specs). No spec needed yet. |
| Phase 3 taxonomy in config.yaml | Note: `.coda/config.yaml` will need a `taxonomy` section before Phase 3 validation activates. This is a Milestone 2 concern. |
| `todos/` needs ADR-002 reference | Added note in Tension 6 that ADR-002 should be updated. Added to ADR-002 Reconciliation table. |

### Additional v2→v3 Fixes (from consistency reviewer's second pass)

| Issue | Resolution |
|---|---|
| `category` dropped from frontmatter (contradicts PRD P1) | Restored to recommended level and full standard. Added note explaining why it's recommended (not required) at bootstrap. |
| CLAUDE.md Repository Knowledge table missing `brainstorms/` | Added `docs/brainstorms/` row to the table. |
| Template frontmatter doesn't match spec | Templates now show **full** field set with note that only title/date are required at bootstrap. |
| Document Conventions missing brainstorm/design-doc statuses | Added status enum values for all three document types. |
| Budget table heading mismatch | Fixed "Frontmatter convention" → "Document conventions". |

### Suggestions Noted (Not Blocking)

The consistency reviewer made 7 suggestions. Key ones adopted:
- **Perspectives frontmatter**: Acknowledged as legacy format; low priority for indexing since they're design-phase artifacts.
- **`estimated_files` field**: Kept as optional. Documented as initial estimate, not validated.
- **Plan→solution traceability**: Not added to avoid frontmatter bloat at bootstrap. The reverse link (`related_plans` in solutions) provides traceability. Forward link can be added when compound step automation exists.
