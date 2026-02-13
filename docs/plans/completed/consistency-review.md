---
title: "Consistency Review — Unified docs/ Structure Plan (v2)"
date: 2026-02-13
tags: [review, consistency, docs-structure, knowledge-architecture]
status: "active"
---

# Consistency Review — Unified docs/ Structure Plan (v2)

**Reviewer**: Consistency Reviewer
**Date**: 2026-02-13
**Plan reviewed**: `docs/plans/active/docs-structure-plan.md` (v2)
**Reference documents**:
- `docs/PRD.md` (Sections 2.4, 6)
- `docs/perspectives/synthesis.md` (Sections 2.2, 4.1)
- `docs/perspectives/technical-architecture.md` (ADR-002)

**Note**: This is the v2 review. The plan was significantly restructured after devil's advocate feedback. It now separates "target architecture" from "bootstrap" and introduces growth triggers.

---

## Consistent ✓

### 1. CLAUDE.md line budget — all sources agree

v2 specifies ~100-200 lines with Phase 2 CI limit ≤ 200. Template content is ~78 lines, leaving headroom. Matches PRD, synthesis, and ADR-002 unanimously.

### 2. Core P1 directory structure matches PRD Section 6

PRD Section 6 P1 specifies: `docs/plans/`, `docs/solutions/`, `docs/brainstorms/`, `docs/design-docs/`.

v2 bootstrap creates all four. Additional directories (product-specs/, generated/, references/, reviews/, research/) are in the target architecture but properly deferred via growth triggers. This is consistent with the PRD and strengthened by the devil's advocate deferral approach.

### 3. Plan lifecycle states match ADR-006

v2 plan statuses: `draft | review | approved | executing | completed`. Matches the PRD's state machine exactly.

### 4. Graduated enforcement matches PRD Section 2.4

v2 Tension 5 resolves as: soft (CLAUDE.md conventions) → hard (CI checks) with the additional devil's advocate guardrail of not creating a linter before CI exists. The PRD says "start soft, promote to hard after repeated violations." Consistent.

### 5. AGENTS.md deferral is consistent with PRD Milestone 1 scope

PRD Section 6 Milestone 1 explicitly states: "No Codex integration (Claude Code only)." Deferring AGENTS.md until Codex arrives in M2 is well-reasoned and avoids maintaining a file with zero readers. Consistent with PRD scope.

### 6. Compound loop coverage (Section 12) spans all four phases

Plan → Work → Review → Compound are all mapped to directory actions. The Directory Purpose Matrix (Section 3) assigns each directory a loop phase. The devil's advocate caveat about measuring whether agents actually use prior solutions is a good addition that doesn't break consistency.

### 7. Target architecture vs. bootstrap separation is internally consistent

Section 3 (target) shows the full eventual structure. Section 8 (bootstrap) creates only 7 items. Section 9 (growth triggers) defines specific conditions for creating each deferred item. All three sections agree on what exists when.

Spot checks:
- plans/templates/: target shows it, bootstrap defers it, trigger = "3-5 completed plans" ✓
- ARCHITECTURE.md: target shows it, bootstrap defers it, trigger = "first implementation plan" ✓
- product-specs/: target shows it, bootstrap defers it, trigger = "5+ specs" ✓
- AGENTS.md: target shows it, bootstrap defers it, trigger = "Codex integration (M2)" ✓

### 8. Existing files left in place — avoids churn

v2 correctly leaves PRD.md, requirements.md, source articles, and perspectives in their current locations. This avoids broken cross-references between perspective documents. Consistent with the devil's advocate principle of not creating work for organization's sake.

---

## Inconsistent ✗

### 1. `category` field dropped from frontmatter — contradicts PRD P1

**PRD Section 6** (line 247):
> "YAML frontmatter standard | All knowledge documents use frontmatter: title, date, tags, **category**, status. | P1"

v2 bootstrap requires only: `title`, `date`
v2 full standard (Phase 3) requires: `title`, `date`, `tags`, `status`

**`category` is absent from both levels.** The PRD marks it as part of the P1 frontmatter standard. ADR-002 uses it for agent context filtering (line 427): "Agents to filter by category, status, and confidence when loading context."

Ironically, **the plan's own frontmatter includes `category: "infrastructure/knowledge"`** (line 5) — a field the plan doesn't define as part of any standard.

**Action needed**: Either:
- (a) Add `category` to the recommended or full-standard fields and explain its format, or
- (b) Explicitly note the deviation from the PRD and explain why category was dropped (e.g., "category is encoded in the directory path, making a frontmatter field redundant")

### 2. `exec-plans/` still absent — unresolved from v1

**ADR-002** (tech-arch lines 398-401):
```
├── exec-plans/              # Complex multi-step execution plans
│   ├── active/
│   ├── completed/
│   └── tech-debt-tracker.md
```

**Synthesis Section 4.1** references: `docs/exec-plans/tech-debt-tracker.md`

v2 still doesn't mention exec-plans/ — not in the target structure (Section 3), not in bootstrap (Section 8), not in growth triggers (Section 9), not in the deferred items table (Section 8). It's silently absent.

**Action needed**: Add a one-line resolution. If plans/ subsumes exec-plans/, say so. If tech-debt-tracker.md moves elsewhere (design-docs?), say where. The implementer will read ADR-002 and wonder where exec-plans/ went.

### 3. Solution template frontmatter doesn't match Section 6 spec

**Section 6** (lines 354-362) defines solution fields:
```yaml
severity: "P2"
prevention: "lint-rule"
related_plans: []
related_solutions: []
reuse_count: 0
```

**Section 10** solution template (lines 517-523) shows:
```yaml
title: "[descriptive title]"
date: YYYY-MM-DD
tags: [relevant, tags]
status: "active"
severity: "P2"
prevention: "lint-rule"
```

The template **omits** `related_plans`, `related_solutions`, and `reuse_count`. An implementer following the template will produce solutions that don't match the Section 6 spec.

**Action needed**: Either add the missing fields to the template, or note that the template shows a minimal version and the full field set is in Section 6.

### 4. Plan template frontmatter doesn't match Section 6 spec

**Section 6** (lines 347-352) defines plan fields:
```yaml
status: "draft"
complexity: "medium"
domain: "backend"
related_plans: []
related_solutions: []
```

**Section 11** plan template (lines 557-562) shows:
```yaml
title: "[feature/fix description]"
date: YYYY-MM-DD
status: "draft"
tags: [relevant, tags]
```

The template **omits** `complexity`, `domain`, `related_plans`, and `related_solutions`. Same issue as solutions — the template and spec don't align.

**Action needed**: Reconcile. Either expand the template or note it's minimal.

### 5. CLAUDE.md "Document Conventions" only mentions plan status — incomplete

**CLAUDE.md template** (lines 233-238):
```
## Document Conventions

All documents in `docs/` should include YAML frontmatter:
- Required: `title`, `date`
- Recommended: `tags`, `status`
- Plans also need: `status` (draft/review/approved/executing/completed)
```

But **Section 6 also defines status enums for**:
- Brainstorms: `active | converted-to-plan | archived`
- Design docs: `active | superseded | deprecated`

CLAUDE.md tells agents only plans need status. An agent creating a brainstorm or design doc won't know it also needs a status field with a specific enum.

**Action needed**: Either list all document types that need status, or generalize: "Plans, brainstorms, and design docs also need: `status` (see Section 6 for valid values per type)."

### 6. CLAUDE.md Repository Knowledge table omits `brainstorms/`

**CLAUDE.md Compound Loop section** (line 192):
```
- Brainstorms: `docs/brainstorms/` — capture fuzzy ideas before planning
```

**CLAUDE.md Repository Knowledge table** (lines 214-220):
```
| `docs/plans/active/` | Current execution plans |
| `docs/plans/completed/` | Past plans for reference |
| `docs/solutions/` | Institutional memory |
| `docs/design-docs/` | Architecture decisions |
| `docs/perspectives/` | Multi-perspective design analysis |
```

Brainstorms are mentioned above in the Compound Loop section but **missing from the Repository Knowledge table**. Perspectives are in the table but brainstorms aren't — despite brainstorms being a bootstrap directory and perspectives being legacy. An agent scanning the table won't see brainstorms as a directory to navigate.

**Action needed**: Add `brainstorms/` to the Repository Knowledge table.

### 7. `confidence` field still absent — ADR-002 depends on it

**ADR-002** (line 419):
```yaml
confidence: high        # low | medium | high
```

**ADR-002** (line 427):
> "Agents to filter by category, status, and confidence when loading context."

v2 doesn't include `confidence` in any frontmatter spec. The context loading strategy in ADR-002 explicitly filters by confidence. Without this field, agents can't distinguish high-confidence solutions from speculative ones.

**Action needed**: Add to the "Additional Fields by Document Type" for solutions (at minimum), or note it's deferred with a rationale.

### 8. AGENTS.md "feeds both simultaneously" — misleading wording carried forward

**Section 5** (line 297):
> "The compound step feeds both simultaneously."

**Section 5 table** (line 294):
```
| Updated by | Compound step (automated) | Humans only (stable) |
```

The table says the compound step updates CLAUDE.md but NOT AGENTS.md. The paragraph says it "feeds both." The intended meaning is that `docs/solutions/` is accessible to both agents — but this is confusing. v1 flagged this and it's unchanged.

**Action needed**: Reword to: "The compound step writes to `docs/solutions/`, which both entry files point to. New knowledge is accessible to both agents without modifying AGENTS.md directly."

---

## V1 Issues Resolved ✓

1. **compound-workflow.md skill** — v2 removed specific skill names from the directory tree and CLAUDE.md template. Skills are deferred with a growth trigger ("Before first implementation plan"). Resolved cleanly.

2. **Bootstrap over-specification** — v2 properly separates target architecture (Section 3) from bootstrap (Section 8). Empty directories with `.gitkeep` removed. Growth triggers (Section 9) define when each piece is created. Well resolved.

3. **Plan template estimated_files** — v2 plan template (Section 11) removed `estimated_files` from its frontmatter example. Though it still appears in Section 6's plan-specific fields, the template no longer shows it prominently. Partially resolved.

---

## New Suggestions (v2-specific)

### 1. CLAUDE.md budget table section name vs. template mismatch

The budget table (line 177) lists a section called "Frontmatter convention (3-5 lines)." The actual CLAUDE.md template uses "Document Conventions." Minor naming inconsistency — align the budget table to match the template heading.

### 2. `todos/` relocation should reference ADR-002

Tension 6 (line 81) moves todos to `.coda/`. ADR-002 places them at repo root. The resolution is sound but doesn't mention that ADR-002 will need updating. Add a note.

### 3. `related` field structure should be documented as a deviation from ADR-002

ADR-002 uses a single `related` array. The plan uses typed `related_plans`/`related_solutions`. This is a reasonable refinement but an undocumented deviation.

### 4. `created` (ADR-002) vs. `date` (plan) — note the rename

The plan follows the PRD's `date`. ADR-002 uses `created`. Note the deviation so ADR-002 can be updated.

---

## Summary

v2 is a significant improvement over v1. The target/bootstrap separation, growth triggers, and leaner bootstrap are all internally consistent and well-reasoned.

**Most significant issues** (should fix before implementation):

1. **`category` dropped from frontmatter** — contradicts PRD P1, and the plan's own frontmatter uses it. Either add it back or explicitly explain the omission.
2. **`exec-plans/` still silently absent** — ADR-002 defines it, synthesis references it, the plan ignores it. One sentence resolving this is all that's needed.
3. **Template/spec frontmatter mismatches** — Sections 10-11 templates don't include all fields defined in Section 6. Implementers will follow the templates.
4. **CLAUDE.md brainstorms/ missing from table** — a bootstrap directory omitted from the knowledge navigation table.

**Minor items** (nice to fix, not blocking):

5. CLAUDE.md Document Conventions should mention brainstorm/design-doc status
6. `confidence` field deferred without explanation
7. AGENTS.md "feeds both" wording is misleading
8. Budget table section name doesn't match template heading

None are plan-breaking, but items 1-4 will cause confusion during implementation if left unaddressed.
