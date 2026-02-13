---
title: "Devil's Advocate Review: docs/ Structure Plan"
date: 2026-02-13
tags: [docs-structure, review, bootstrap, knowledge-architecture]
category: "infrastructure/review"
status: "active"
---

# Devil's Advocate Review: docs/ Structure Plan

**Reviewer**: Devil's Advocate
**Date**: 2026-02-13
**Reviewed Document**: `docs/plans/active/docs-structure-plan.md`
**Verdict**: The plan is well-reasoned but over-built for its context. Approximately 40% of the bootstrap work should be deferred until there's a real reason to create it.

---

## Critical Issues

These must change. They will actively hurt the project if shipped as-is.

### 1. AGENTS.md should not exist at bootstrap

The plan creates AGENTS.md as a "Priority 1: Create Immediately" artifact. But Codex integration is explicitly **not in Milestone 1** (PRD Section 6: "What's explicitly NOT in Milestone 1: No Codex integration"). There are zero agents that will read AGENTS.md. Creating it now means:

- **Maintaining two entry-point files** that point to the same knowledge base, for an audience of zero.
- **Drift risk from day one.** CLAUDE.md will evolve as real work happens. AGENTS.md will sit untouched because nobody reads it. By the time Codex arrives in M2, AGENTS.md will be stale.
- **Wasted bootstrap effort.** The 80-120 lines of AGENTS.md content are 80-120 lines nobody will use for months.

**Fix**: Defer AGENTS.md to Milestone 2 when Codex integration actually ships. Write it then, informed by real agent behavior, not speculation about what Codex might want.

### 2. ARCHITECTURE.md has nothing to describe

The plan creates a root-level ARCHITECTURE.md with "domain map, layer rules, dependency directions." But there is **no code, no domains, no layers, and no dependencies**. The content would be entirely aspirational — describing a system that doesn't exist yet.

OpenAI created ARCHITECTURE.md to describe an existing codebase with a million lines of code. The harness article says: "Architecture documentation provides a top-level map of domains and package layering." Coda has no domains and no packages.

The plan's own CLAUDE.md template already contains the architecture summary ("Layers: Types -> Config -> Repo -> Service -> Runtime -> UI"). That's sufficient for now — it's 2 lines in CLAUDE.md, not a separate file.

**Fix**: Remove ARCHITECTURE.md from Priority 1. Add it to Priority 2 ("Create When Code Begins") — the first implementation plan should trigger its creation, because that's when there will actually be architecture to describe.

### 3. The frontmatter linter is a bootstrap trap

"Frontmatter linter: CI script validating frontmatter on all docs" is listed as Priority 1. But:

- There is **no CI pipeline** yet. Building a CI pipeline is a separate task.
- The linter validates documents that don't exist yet (solutions/, most of plans/).
- Building a custom linter before building the product is the definition of over-engineering.
- The 7 validation rules (Section 6) require parsing YAML, checking enums, validating ISO dates, resolving cross-references. That's a non-trivial script for a project with ~5 markdown files.

**Fix**: Replace the Phase 1 linter with a manual checklist in CLAUDE.md that says "all docs must have frontmatter with: title, date, tags, category, status." Let the first few documents be self-enforced. Build the actual linter when you have CI infrastructure and enough documents to justify automation (10+).

---

## Strong Concerns

These should change. They introduce real costs for speculative benefits.

### 4. Five required frontmatter fields on every document is premature

The plan requires `title`, `date`, `tags`, `category`, and `status` on every document. For a project with maybe 5-10 documents at bootstrap, this is overhead without payoff:

- **`tags`**: Useful for search when you have 100+ docs. With 5 docs, an agent can read them all faster than parsing tags.
- **`category`**: The directory structure already encodes the category. `docs/solutions/bugs/fix-x.md` doesn't need `category: "bugs/performance"` — the path IS the category.
- **`status`**: For plans, status matters. For a design doc like `core-beliefs.md`, what does status even mean? It's always "active."

**Recommendation**: Require only `title` and `date` at bootstrap. Add `tags` when docs exceed 20. Add `category` only for solutions (where subcategorization adds value beyond the directory path). Add `status` only for document types with real lifecycles (plans, brainstorms).

### 5. Solution subcategories (bugs/, patterns/, architecture/, debugging/) are premature

The plan creates four subcategories under `docs/solutions/` at bootstrap. All four will be empty. They'll stay empty until the compound step exists AND produces actual solutions. The compound step is part of Milestone 1's CLI (`coda compound`), which hasn't been built yet.

Meanwhile, the `solutions/index.md` is described as "auto-maintained" — but there's nothing to auto-maintain it. It will be manually maintained and immediately fall behind.

**Recommendation**: Start with a flat `docs/solutions/` directory. When the number of solutions exceeds 10-15, introduce subcategories based on the actual categories that emerged organically — not predicted ones. The "two-level nesting max" rule already prevents unbounded depth, so there's no risk in deferring.

### 6. Moving existing files creates unnecessary churn

The plan moves:
- `docs/PRD.md` -> `docs/product-specs/PRD.md`
- `docs/requirements.md` -> `docs/product-specs/requirements.md`
- `docs/harness-engineering.md` -> `docs/references/harness-engineering.md`
- `docs/compound-engineering.md` -> `docs/references/compound-engineering.md`

This breaks any existing references in `docs/perspectives/*` files (which reference these documents by path). The perspective documents explicitly reference `docs/harness-engineering.md` and `docs/compound-engineering.md`. Every broken reference is a paper cut.

More importantly: `product-specs/` and `references/` will each contain exactly 2 files. Two files don't need a directory. They need good names.

**Recommendation**: Leave existing files where they are until either (a) the directory has 5+ files, or (b) the reference format stabilizes. Don't reorganize for organizational purity.

### 7. Three plan templates are two too many

The plan creates `docs/plans/templates/new-feature.md` and `docs/plans/templates/new-cli-command.md` at bootstrap. But:

- The first real plan hasn't been written yet. How do you know what a good template looks like without experience?
- Templates created from theory are often wrong. Templates created from extracting patterns across 5+ real plans are useful.
- Two templates for a project with zero completed plans is pure speculation.

**Recommendation**: Create zero templates at bootstrap. After 3-5 plans are completed, extract common patterns into one template. Let templates emerge from practice, not prediction.

---

## Worth Considering

Provocative questions that may or may not need action.

### 8. Does progressive disclosure actually work for agents?

The plan's core architecture is progressive disclosure: CLAUDE.md -> ARCHITECTURE.md -> docs/ subdirectories. This is how humans navigate information hierarchies.

But agents don't navigate hierarchies. They grep. Claude Code's first instinct when looking for information is `Glob` and `Grep`, not "read CLAUDE.md, follow a link to ARCHITECTURE.md, follow another link to docs/design-docs/." The progressive disclosure model assumes agents behave like humans reading a wiki. They don't.

**Counter-argument**: CLAUDE.md is automatically injected into context, so agents DO read it first. But everything after that first injection is agent-driven search, not human-like link-following.

**Question**: Is the progressive disclosure hierarchy doing real work, or is it just good naming conventions and searchable content that matters?

### 9. "Docs are for agents, not humans" — this is false

The PRD says "Agent legibility is the goal." The plan optimizes for agent navigation. But:

- Humans read CLAUDE.md at the start of every session too — it's displayed in their terminal.
- Humans write plans and review them in the Tauri UI.
- The PRD's "Sam" persona (Product Manager) reads plans and provides feedback through the UI.
- The compound step's output is reviewed by humans before it's trusted.

The correct framing is: "Docs are for agents AND humans, with agent legibility as the tiebreaker when they conflict." The plan never acknowledges this dual audience, which risks creating documentation that's machine-optimized but human-hostile.

### 10. Is the CLAUDE.md / AGENTS.md split the right abstraction?

Even setting aside the "defer AGENTS.md" argument (Critical Issue #1), the conceptual split is questionable:

- Both files point to the same `docs/` knowledge base.
- Both contain the same architecture summary.
- Both contain the same build commands.
- Both link to the same solutions.

The difference is "tone" (conversational vs. direct) and "planning context" (Claude plans, Codex doesn't). But is tone-matching worth maintaining two files? Has anyone measured whether Codex performs better with a "direct, instruction-oriented" file vs. the exact same content in a "conversational" file? This feels like a hypothesis presented as a fact.

### 11. Convention over configuration — are we violating our own principle?

The PRD lists "Convention over configuration" as a core UX principle. But this plan is heavy on configuration:

- 5 required frontmatter fields (configuration)
- 7 validation rules (configuration)
- Separate entry point files for different agents (configuration)
- Category hierarchies with allowed enums (configuration)
- Two-level nesting rule (configuration)

Convention over configuration would look like: "Put files in docs/. Name them well. We'll figure out the rest." The plan is closer to "configuration over convention" — lots of rules before there's enough experience to know which rules matter.

### 12. What happens when someone adds a file that doesn't fit?

The plan has 8 directories in docs/. What happens when someone needs to add:
- A meeting notes file?
- An API changelog?
- A competitive analysis?
- A vendor evaluation?

The plan doesn't define a "miscellaneous" or "other" category. The two options are: (a) force it into an existing category where it doesn't belong, or (b) create a new directory, which requires updating CLAUDE.md, AGENTS.md, the frontmatter linter, and potentially the category enum.

This is a sign of over-classification. Flat structures with good naming handle uncategorized content naturally.

### 13. Will agents actually use `docs/solutions/` during planning?

The plan's compound loop (Section 12) says: "Agent searches docs/solutions/ for relevant prior art." This is the core claim — solutions compound into better plans.

But for this to work:
- The agent must know to search solutions (CLAUDE.md tells it to — OK).
- The search must return relevant results (with 5-10 solutions, there might not be anything relevant).
- The agent must successfully integrate the solution into its plan (this is an unproven behavior).

The critical question nobody has answered: **Has anyone tested whether Claude Code or Codex actually produces better plans when given a `docs/solutions/` directory to search?** If not, the entire compound loop substrate is an untested hypothesis.

---

## What I'd Do Instead

The plan has ~15 bootstrap files. Here's a minimum viable alternative with 4:

### Minimal Bootstrap (4 files)

```
your-project/
├── CLAUDE.md                    # THE entry point. ~100-150 lines. Everything an agent needs.
├── docs/
│   ├── plans/                   # Active and completed plans (flat, no subdirs)
│   │   └── (plans go here)
│   └── (everything else flat)   # Solutions, brainstorms, design docs — all in docs/
└── .coda/
    └── config.yaml              # Minimal project config
```

### Rules

1. **One entry point**: CLAUDE.md. No AGENTS.md, no ARCHITECTURE.md. Claude reads it; Codex reads it (rename to AGENTS.md at M2 if Codex truly needs something different).
2. **Flat docs/**: Good file naming replaces directories. `docs/solution-auth-token-refresh.md` is just as searchable as `docs/solutions/bugs/auth-token-refresh.md` and requires zero directory structure.
3. **No frontmatter requirement at bootstrap**: Optional frontmatter. When you have 20+ docs and need search, add a requirement then.
4. **No linter at bootstrap**: CLAUDE.md says "please add frontmatter." When you have CI and 10+ docs, automate enforcement.
5. **Plans get a directory**: The one directory that earns its existence — plans are the core artifact of the compound loop and they have a real lifecycle (active/completed).
6. **Grow structure from pain, not prediction**: When flat `docs/` becomes hard to navigate (probably around 15-20 files), add the first subdirectory. Let the taxonomy emerge from real content.

### Why this works

- **Zero wasted effort**: Every file created at bootstrap has immediate use.
- **Agents don't care about directories**: They care about content and searchability. `docs/solution-*.md` is greppable.
- **Lower maintenance burden**: One entry point file to maintain, not three.
- **Grows organically**: Structure is added in response to real pain, not anticipated pain.
- **Matches the project's actual maturity**: A zero-code project gets a zero-overhead knowledge structure.

### What you lose

- **No mechanical enforcement at bootstrap**: You rely on discipline until CI exists. This is fine because there are only 1-2 people working on this and they can self-enforce.
- **No frontmatter-based search**: You rely on grep and good naming. With 5-10 docs, this is actually faster than frontmatter search.
- **No compound loop substrate**: The structure doesn't pre-create the artifacts of a compound loop that doesn't exist yet. This is a feature, not a bug.

### What triggers growth

| Trigger | Action |
|---|---|
| >15 files in flat docs/ | Add first subdirectory based on largest cluster |
| >5 plans | Split plans/ into active/ and completed/ |
| >20 docs total | Require frontmatter with title + date |
| CI pipeline exists | Add frontmatter linter |
| Codex integration ships (M2) | Create AGENTS.md from real Codex behavior |
| >10 solutions | Add solution subcategories based on actual categories |
| Architecture exists | Create ARCHITECTURE.md from real code |

---

## Summary Scorecard

| Aspect of the Plan | Grade | Comment |
|---|---|---|
| Executive summary & framing | A | Clear, well-motivated, good synthesis |
| Tension resolution | A- | Thoughtful, fair to both perspectives |
| Directory structure design | B- | Good design, wrong timing. Over-built for bootstrap. |
| CLAUDE.md specification | A | The right content, the right size, the right growth rules |
| AGENTS.md specification | D | Should not exist yet. Codex is M2. |
| ARCHITECTURE.md | D | Nothing to describe. Premature. |
| Frontmatter standard | C+ | Good eventual standard, too heavy for 5-10 docs |
| Mechanical validation | C | Good rules, no enforcement infrastructure to run them |
| Bootstrap plan | C | Too many files. 15 bootstrap files for 0 code files. |
| Templates | C- | Templates from theory, not practice |
| Compound loop integration | B+ | Coherent vision, unproven mechanism |
| **Overall** | **B-** | Right ideas, wrong sequencing. Build half of this now, half when it's earned. |

---

## Final Word

This plan is a well-designed answer to the wrong question. The question isn't "What does Coda's ideal docs/ structure look like?" — it's "What's the minimum docs/ structure that lets the first unit of work go through the compound loop?" The plan answers the former. The bootstrap should answer the latter.

The harness engineering article itself says: "Early progress was slower than we expected, not because Codex was incapable, but because the environment was underspecified." True — but they're talking about a codebase with thousands of files and complex architecture. For Coda's bootstrap, the risk isn't under-specification. It's over-specification — building a knowledge architecture for a system that doesn't exist yet, and then spending more time maintaining the architecture than doing the work it's supposed to support.

Start minimal. Grow from pain. Trust that the compound loop, once running, will tell you exactly what structure it needs.
