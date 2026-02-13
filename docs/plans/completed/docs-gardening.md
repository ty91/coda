---
title: Docs Gardening Plan v4
date: 2026-02-14
status: completed
tags: [docs, gardening, organization]
milestone: M0
---

# Docs Gardening Plan v4

## Guiding Principle

"Preserve the WHY (design rationale), drop the WHAT/HOW (implementation details)."

Filter: "Will an agent reading this in 3 months make a better decision, or just implement our current guess?"

## Proposed Directory Structure

```
docs/
├── PRD.md
├── brainstorms/
├── design-docs/
│   ├── index.md
│   ├── core-beliefs.md
│   ├── architecture-overview.md
│   ├── ux-specification.md
│   ├── agent-workflows.md
│   ├── compound-loop-design.md
│   ├── design-tensions.md
│   ├── ADR-001-orchestration.md
│   ├── ADR-002-knowledge.md
│   ├── ADR-003-alerts.md
│   ├── ADR-004-issue-tracker.md
│   ├── ADR-005-cli.md
│   ├── ADR-006-human-in-loop.md
│   └── ADR-007-storage.md
├── plans/
│   ├── active/
│   ├── completed/
│   │   ├── docs-structure-plan.md
│   │   ├── harness-engineer-recommendations.md
│   │   ├── everyto-engineer-recommendations.md
│   │   ├── devils-advocate-review.md
│   │   └── consistency-review.md
│   └── .template.md
├── references/
│   ├── harness-engineering.md
│   ├── compound-engineering.md
│   └── requirements.md
└── solutions/
    └── .template.md
```

## Execution Phases

### Phase 1: Move source docs to references/
1. Create docs/references/
2. Move docs/harness-engineering.md → docs/references/harness-engineering.md (trim noise, add frontmatter)
3. Move docs/compound-engineering.md → docs/references/compound-engineering.md (trim tangential sections, add frontmatter)
4. Move docs/requirements.md → docs/references/requirements.md (add frontmatter)

### Phase 2: Extract from perspectives/ into design-docs/
5. Extract 7 ADRs from technical-architecture.md → individual files
6. Create architecture-overview.md from remaining tech-arch content
7. Create ux-specification.md from ux-perspective.md (~90% preserved)
8. Create agent-workflows.md from harness perspective unique content (~150-180 lines)
9. Create compound-loop-design.md from compound perspective unique content (~80-100 lines)
10. Create design-tensions.md from synthesis.md unique content
11. Update core-beliefs.md with 4 extracted principles

### Phase 3: Delete perspectives/
12. Delete all 5 files + directory

### Phase 4: Create new files
13. Create design-docs/index.md
14. Create plans/.template.md
15. Create solutions/.template.md

### Phase 5: Fix frontmatter
16. Fix PRD.md, all plans/completed/ files, all new design-docs files

### Phase 6: Update CLAUDE.md
17. Update repository knowledge table, source docs, "when stuck" section

### Phase 7: Cleanup
18. Delete plans/completed/.gitkeep
19. Verify cross-references
20. Compound step: capture learnings
