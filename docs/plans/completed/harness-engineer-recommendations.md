# Harness Engineer Recommendations: docs/ Structure, CLAUDE.md, and AGENTS.md

**Author**: Harness Engineer
**Date**: 2026-02-13
**Status**: Draft — for synthesis with Compound Engineer recommendations
**Sources**: `docs/harness-engineering.md` (OpenAI), `docs/perspectives/harness-engineering-perspective.md`, `docs/PRD.md`

---

## 1. Recommended docs/ Directory Structure

### The OpenAI Structure (What They Actually Built)

OpenAI's Codex team converged on this structure after five months and ~1,500 PRs:

```
AGENTS.md                    # ~100 lines. Map, not manual.
ARCHITECTURE.md              # Domain map, package layering, dependency rules
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
    design-system-llms.txt   # LLM-formatted reference docs
    ...
  DESIGN.md
  FRONTEND.md
  PLANS.md
  PRODUCT_SENSE.md
  QUALITY_SCORE.md
  RELIABILITY.md
  SECURITY.md
```

### What Coda Should Adopt (and Why)

Coda's structure should closely mirror OpenAI's, with additions from the compound engineering philosophy. Here's my recommendation:

```
CLAUDE.md                      # Claude Code entry point (~100-200 lines)
AGENTS.md                      # Codex/generic agent entry point (~100 lines)
ARCHITECTURE.md                # Domain map, layers, dependency rules

docs/
  # === Knowledge Directories (the system of record) ===

  design-docs/
    index.md                   # Catalogue: title, status, verification date
    core-beliefs.md            # Agent-first operating principles
    architecture-layers.md     # Layer dependency rules (Types→Config→Repo→Service→Runtime→UI)
    ...

  plans/
    active/                    # In-flight plans with progress logs
    completed/                 # Archived plans with decision records
    templates/                 # Plan templates for common work types
    tech-debt-tracker.md       # Debt items: description, impact, cost, interest rate

  solutions/                   # Compound engineering addition — institutional memory
    index.md                   # Searchable catalogue by category/tag
    ...                        # Individual solution docs with YAML frontmatter

  product-specs/
    index.md
    ...

  generated/                   # Auto-generated from code — never hand-edited
    db-schema.md
    api-surface.md
    cli-commands.md

  references/                  # LLM-formatted external reference docs
    tauri-llms.txt
    claude-code-llms.txt
    ...

  brainstorms/                 # Lightweight research artifacts
    ...

  perspectives/                # Strategic perspective documents (design phase)
    ...

  # === Cross-Cutting Docs (top-level within docs/) ===

  DESIGN.md                    # Design system principles
  QUALITY_SCORE.md             # Per-domain, per-layer quality grades
  PLANS.md                     # Active plan index (auto-updated)
  RELIABILITY.md               # Performance budgets, SLAs
  SECURITY.md                  # Security model, threat boundaries
```

### Why Each Directory Exists

| Directory | Purpose | Who Writes | Who Reads |
|---|---|---|---|
| `design-docs/` | Architectural decisions, design rationale, core beliefs | Humans + agents during planning | Agents during implementation |
| `plans/` | Execution plans — the primary work artifact | `coda plan` command | `coda work` command, agents |
| `solutions/` | Institutional memory from compound step | `coda compound` subagents | Planning agents (context loading) |
| `product-specs/` | What the product does, user-facing behavior | Humans (PMs, designers) | Planning agents |
| `generated/` | Machine-generated docs from code analysis | CI/build scripts | Agents needing current schema/API info |
| `references/` | External documentation in LLM-friendly format | Humans (curated) | Agents needing framework/library context |
| `brainstorms/` | Fuzzy research before a plan crystallizes | `coda brainstorm` command | Humans + planning agents |
| `perspectives/` | Multi-perspective strategic analysis | Humans + agents | Design phase only (not runtime) |

### Critical Principle: Progressive Disclosure

This structure enables progressive disclosure, which is the single most important pattern from harness engineering:

1. Agent starts with CLAUDE.md/AGENTS.md (~100 lines) — the **map**
2. Agent navigates to ARCHITECTURE.md (~200-300 lines) — the **domain model**
3. Agent drills into the specific `docs/` subdirectory it needs — the **details**
4. Agent never loads the full knowledge base into context

The metaphor from the harness engineering article: "Give Codex a map, not a 1,000-page instruction manual." Context window is shelf space. Waste it and the agent loses the plot.

---

## 2. AGENTS.md Template

### Purpose

AGENTS.md is the entry point for Codex and other generic coding agents. It's the **table of contents** — roughly 100 lines that orient the agent and tell it where to look next.

### Template

```markdown
# Coda — Agent Guide

Coda is an agentic software engineering system: CLI (TypeScript) + Tauri UI (Rust/React) + Slack integration.

## Quick Reference

- **Language**: TypeScript (CLI, frontend), Rust (Tauri backend)
- **Package manager**: pnpm (TS), cargo (Rust)
- **Test runner**: vitest (TS), cargo test (Rust)
- **Lint**: eslint + custom architectural linters
- **Build**: `pnpm build` / `cargo build`
- **Full validation**: `pnpm validate` (runs lint, typecheck, test, structural checks)

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full domain map and layer rules.

Layers (dependency direction): Types → Config → Repo → Service → Runtime → UI
Cross-cutting concerns enter through Providers only.

## Repository Knowledge

All project knowledge lives in `docs/`. Navigate there before asking questions.

- `docs/design-docs/` — Architectural decisions and design rationale
- `docs/plans/active/` — Current execution plans (check before starting new work)
- `docs/solutions/` — Institutional memory: past problems and how they were solved
- `docs/generated/` — Auto-generated schema and API docs (always current)
- `docs/references/` — External framework docs in LLM format
- `docs/QUALITY_SCORE.md` — Current quality grades per domain
- `docs/RELIABILITY.md` — Performance budgets and SLAs

## Working Conventions

- Keep files under 500 lines. Split when approaching the limit.
- Validate at boundaries (IPC, CLI args, API responses). Trust typed data internally.
- Structured logging only: `logger.info({ component, action, duration_ms })`.
- No barrel files. Explicit named exports.
- One concept per file. Name files for what they contain.
- Run `pnpm validate` before opening a PR.

## Plans

Before implementing anything non-trivial, check `docs/plans/active/` for an existing plan.
New work should have a plan. See `docs/plans/templates/` for plan templates.

## When You're Stuck

1. Search `docs/solutions/` — someone may have solved this before.
2. Check `docs/design-docs/` — there may be a design decision you're missing.
3. Read the relevant `docs/references/` file for framework context.
4. If still stuck, escalate to a human with a structured summary of what you tried.
```

### Key Principles

1. **~100 lines max.** The moment it grows beyond this, the table-of-contents property breaks. Knowledge goes into `docs/`, not into AGENTS.md.
2. **Pointers, not content.** Every section says "look here for more" — it doesn't inline the content.
3. **Actionable.** An agent reading this should be able to start working within minutes.
4. **Stable.** AGENTS.md changes rarely. The docs it points to change frequently. This separation prevents rot.

---

## 3. CLAUDE.md Recommendations

### How CLAUDE.md Differs from AGENTS.md

| Aspect | CLAUDE.md | AGENTS.md |
|---|---|---|
| **Target** | Claude Code specifically | Any coding agent (Codex, etc.) |
| **Length** | ~100-200 lines | ~100 lines |
| **Tone** | Can reference Claude-specific capabilities (skills, subagents, hooks) | Generic agent conventions |
| **Updated by** | Compound step (automated) + humans | Humans only (high stability) |
| **Focus** | How to work *in this project with Claude* | How to work *in this project as any agent* |

### What CLAUDE.md Should Contain

1. **Project identity** (2-3 lines): What is Coda? What's the tech stack?
2. **Quick commands** (5-10 lines): Build, test, lint, validate — the commands Claude needs most.
3. **Architecture pointer** (3-5 lines): Link to ARCHITECTURE.md, mention the layer rule.
4. **Knowledge navigation** (10-15 lines): The `docs/` directory map with one-line descriptions.
5. **Working conventions** (10-15 lines): The rules that prevent the most common agent mistakes — file size limits, boundary validation, structured logging, naming conventions.
6. **Claude-specific guidance** (5-10 lines): Skills to use, how hooks work, subagent patterns.
7. **Anti-patterns** (5-10 lines): What NOT to do — no barrel files, no `console.log`, no magic strings.

### What CLAUDE.md Should NOT Contain

- Full architectural documentation (that's ARCHITECTURE.md)
- Design decisions (that's `docs/design-docs/`)
- Plans or progress (that's `docs/plans/`)
- Framework tutorials (that's `docs/references/`)
- Past solutions (that's `docs/solutions/`)

### The Compound Step Integration

The PRD specifies that the compound step can update CLAUDE.md. This is fine **with a constraint**: the compound step may only update the "Working conventions" section, and a doc gardener must enforce the line limit. If CLAUDE.md grows past 200 lines, it's a signal that content should be refactored into `docs/`.

This is a key tension the PRD identifies: harness engineering says ~100 lines and stable; compound engineering says it grows organically. **Coda's resolution**: CLAUDE.md stays compact, the compound step writes to `docs/solutions/`, and CLAUDE.md only gains a convention when it's been validated across multiple cycles.

---

## 4. Mechanical Validation Rules

### Why Mechanical Enforcement is Non-Negotiable

From the harness engineering article: "Documentation that isn't enforced decays." The perspective document adds: "Stale docs caused more agent errors than missing docs because the agent trusted them."

Enforcement is what distinguishes a knowledge base from a wiki graveyard.

### CI/Linter Checks to Implement

#### Phase 1 (Milestone 1 — implement now)

| Check | What It Validates | Error Message Pattern |
|---|---|---|
| **CLAUDE.md line limit** | ≤ 200 lines | `CLAUDE.md is {n} lines (max 200). Move detailed content to docs/. See docs/design-docs/progressive-disclosure.md` |
| **AGENTS.md line limit** | ≤ 120 lines | `AGENTS.md is {n} lines (max 120). It should be a table of contents, not an encyclopedia.` |
| **Frontmatter validation** | All docs in `plans/`, `solutions/`, `design-docs/` have required YAML frontmatter | `{file} is missing required frontmatter field: {field}. All knowledge docs require: title, date, status, tags.` |
| **Cross-link validation** | All markdown links in CLAUDE.md, AGENTS.md, ARCHITECTURE.md resolve | `{file}:{line} links to {target} which does not exist. Update or remove the link.` |
| **File size limit** | Source files ≤ 500 lines | `{file} is {n} lines (max 500). Split into smaller modules. See docs/design-docs/architecture-layers.md for guidance.` |
| **No console.log** | Structured logging only | `{file}:{line} uses console.log. Use structured logging: logger.info({ component: "...", action: "...", ... }). See docs/RELIABILITY.md#logging` |

#### Phase 2 (Milestone 2 — implement when docs have history)

| Check | What It Validates | Error Message Pattern |
|---|---|---|
| **Freshness check** | Design docs touched within 90 days if related code changed significantly | `{doc} hasn't been updated in {n} days but {code_files} have changed. Review and update or mark as deprecated.` |
| **Plan lifecycle** | Active plans have recent progress entries | `{plan} has been active for {n} days without a progress update. Update progress or move to completed/.` |
| **Quality score format** | QUALITY_SCORE.md has valid numeric grades per domain | `QUALITY_SCORE.md has invalid format for domain {domain}. Expected numeric grade (1-5).` |
| **Index completeness** | `design-docs/index.md` lists all files in `design-docs/` | `{file} exists in design-docs/ but is not listed in design-docs/index.md. Add it to the index.` |

### Lint Error Messages as Agent Prompts

This is one of the highest-leverage patterns from harness engineering. Every lint error should include:

1. **What's wrong** (the violation)
2. **How to fix it** (specific remediation steps)
3. **Where to learn more** (link to the relevant doc)

The error message is injected into the agent's context. A good error message eliminates one round-trip of agent confusion. Multiply that across hundreds of violations per day, and you've saved hours of agent time.

Example — bad:
```
Error: Layer violation detected
```

Example — good:
```
ERROR: plans/ui/PlanEditor.tsx imports from plans/repo/PlanStore.ts
  UI layer cannot import directly from Repo layer.

  FIX: Move the data access logic to plans/service/PlanService.ts
  and import from there. UI -> Service -> Repo is the correct
  dependency direction.

  See: docs/design-docs/architecture-layers.md
```

---

## 5. Anti-Patterns to Avoid

### Anti-Pattern 1: The One Big AGENTS.md

**Symptom**: AGENTS.md grows to 500+ lines. Every convention, every API detail, every style rule gets crammed in.

**Why it fails** (from the article):
- Context is scarce. A giant file crowds out the actual task.
- Too much guidance becomes non-guidance. When everything is "important," nothing is.
- It rots instantly. Nobody maintains a monolith. Agents can't tell what's still true.
- It's hard to verify. You can't lint a blob.

**Fix**: AGENTS.md is a table of contents. Maximum 120 lines. Everything else goes into `docs/`.

### Anti-Pattern 2: Knowledge Outside the Repo

**Symptom**: Architectural decisions live in Slack threads. Design rationale is in Google Docs. Conventions exist in people's heads.

**Why it fails**: "What Codex can't see doesn't exist." From the agent's perspective, knowledge in Slack, docs, or human memory is invisible. The agent will make different decisions because it doesn't have the context.

**Fix**: Every decision, convention, and design rationale must be in the repo. The test: "If a new agent joins with zero prior context, can it find this information?"

### Anti-Pattern 3: Stale Documentation

**Symptom**: `docs/design-docs/alert-system.md` describes an API that no longer exists. The agent trusts the doc and writes code against a ghost API.

**Why it fails**: Stale docs are worse than missing docs. Missing docs cause the agent to ask or investigate. Stale docs cause the agent to confidently produce wrong code.

**Fix**:
- Freshness checks in CI (Phase 2)
- Doc gardener agent on a recurring cadence
- `generated/` directory for auto-generated docs that are always current
- Every design doc has a `last-verified` date in frontmatter

### Anti-Pattern 4: Plans as Ephemeral Artifacts

**Symptom**: Plans exist in chat sessions or prompt history. They're not versioned, not reviewable, not referenceable. When the agent needs to check the original intent, it's gone.

**Why it fails**: Plans are the most important artifact in agent-assisted development. They capture intent, constraints, and decisions. Without versioned plans, agents can't check their work against the original intent, and humans can't audit what was decided.

**Fix**: Plans are first-class versioned artifacts in `docs/plans/`. Active plans are in `active/`, completed plans move to `completed/`. Plans have structured frontmatter and progress logs.

### Anti-Pattern 5: Manual Entropy Management

**Symptom**: The team schedules "cleanup Fridays" to address agent-generated slop. It takes 20% of the week and doesn't scale.

**Why it fails**: Agents replicate patterns — good and bad — with equal enthusiasm. Manual cleanup can't keep up with agent output velocity.

**Fix**: Continuous automated cleanup:
- Golden principles encoded in linters (not just docs)
- Recurring cleanup agents that scan for deviations
- Quality grades per domain with automated trend tracking
- Many small corrections, not periodic large refactors
- Technical debt as a "high-interest loan" — pay continuously

### Anti-Pattern 6: Human-Readable but Agent-Illegible

**Symptom**: Documentation is beautifully formatted for humans but agents can't extract actionable information. Flowcharts in images. Conventions in prose paragraphs. Decisions buried in narratives.

**Why it fails**: Agents parse structured data far better than prose. An agent reading "We generally prefer to keep things simple and use standard libraries when possible, though sometimes custom implementations make more sense" gets no actionable guidance. An agent reading a lint rule gets perfect guidance.

**Fix**:
- Prefer structured formats (tables, lists, code blocks) over prose
- Rules should be extractable: one rule per line, with clear yes/no criteria
- When possible, promote conventions from docs into lint rules
- YAML frontmatter for metadata, not inline prose descriptions

---

## 6. Bootstrap Considerations (Zero-Code Project)

### Coda's Current State

Coda has zero application code. It has:
- `docs/PRD.md` — comprehensive product requirements
- `docs/requirements.md` — initial requirements
- `docs/harness-engineering.md` — source article
- `docs/compound-engineering.md` — source article
- `docs/perspectives/` — five perspective documents
- `docs/plans/active/` — empty (this document will be the first)

### What to Create Now (Before Any Code)

The harness engineering article is explicit: "The initial scaffold — repository structure, CI configuration, formatting rules, package manager setup — was generated by Codex." The environment comes first. Code comes second.

#### Priority 1: Create Immediately

1. **CLAUDE.md** — The Claude Code entry point. Even with no code, this orients agents on the project's identity, goals, and where to find information.

2. **AGENTS.md** — The generic agent entry point. Same purpose, different audience.

3. **ARCHITECTURE.md** — The domain map. Even before code exists, the domain model can be defined (plans, alerts, agents, issues) and the layer architecture documented.

4. **docs/design-docs/core-beliefs.md** — Agent-first operating principles. These are the "golden principles" that every line of future code must satisfy.

5. **docs/design-docs/architecture-layers.md** — The layer dependency rules (Types → Config → Repo → Service → Runtime → UI). This is the single most important structural constraint.

6. **docs/plans/templates/** — Plan templates for the common work types Coda will encounter (feature, bugfix, refactor, infrastructure).

7. **Basic CI pipeline** — Even before code, set up:
   - CLAUDE.md / AGENTS.md line limit checks
   - Cross-link validation
   - Frontmatter validation for all docs
   - Markdown lint

#### Priority 2: Create When Code Begins

8. **Custom architectural linters** — Layer dependency enforcement, structured logging checks, file size limits.

9. **docs/generated/** — Auto-generated docs from the first schemas and APIs.

10. **docs/QUALITY_SCORE.md** — Quality grades per domain (starts as a template with zeroes).

11. **docs/RELIABILITY.md** — Performance budgets for key user flows.

#### Priority 3: Create When the Compound Loop Starts

12. **docs/solutions/** — Populated by the first compound steps.

13. **Doc gardener agent** — A recurring agent that validates freshness.

14. **Recurring cleanup agents** — Pattern deviation scanner, quality grade updater.

### The Bootstrap Paradox and How to Solve It

There's a chicken-and-egg problem: the harness is what makes agents effective, but the harness itself should be built by agents. OpenAI solved this by having the initial scaffold generated by the agent with human guidance.

For Coda, the resolution:
1. **Create the structural skeleton manually** (directory structure, empty templates, CI config) — this is scaffolding, not code.
2. **Have agents fill in the content** (CLAUDE.md content, ARCHITECTURE.md details, design docs, plan templates) — guided by the PRD and perspective documents.
3. **Once the skeleton has content, agents can navigate it** to implement the actual Coda application.

The investment is small (a few hours of scaffolding) but the payoff is large (every subsequent agent task is more effective).

---

## Summary: The Five Harness Engineering Commandments for Coda

1. **Map, not manual.** CLAUDE.md and AGENTS.md are tables of contents. ~100-200 lines max. Everything else lives in `docs/`.

2. **What isn't in the repo doesn't exist.** Every decision, convention, and design rationale must be in versioned, repo-local files. No Slack threads, no Google Docs, no head-knowledge.

3. **Enforce mechanically, not culturally.** Conventions in prose rot. Conventions in linters compound. Every rule worth following is worth enforcing in CI. Every lint error is an agent prompt.

4. **Progressive disclosure, not context dumping.** Agents navigate a knowledge hierarchy: entry point → domain map → specific docs. They never load everything at once.

5. **Continuous garbage collection, not periodic cleanup.** Automated cleanup agents, quality grades, freshness checks. Many small corrections > occasional large refactors. Technical debt is a high-interest loan.
