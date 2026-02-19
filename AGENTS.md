# Coda — Agent Instructions

Coda is an agentic software engineering system. CLI (TypeScript/Commander.js) + Tauri UI (React/TS + Rust) + Slack integration.

Status: Design phase. Zero application code. Milestone 1 targets a working compound loop.

## Rules

- Always search `docs/solutions/` before implementing. Reuse existing solutions.
- Always check `docs/plans/active/` for an existing plan before starting work.
- Run the compound step only when work yields reusable learning, root-cause fixes, prevention guidance, or architecture impact.
- If compound is needed, use the `compound` skill (`~/.codex/skills/compound`).
- Files: max 500 lines. Split if approaching limit.
- TypeScript: `type` over `interface`. No barrel files. Named exports only.
- Validate at boundaries. Trust typed data internally.
- Structured logging: `logger.info({ component, action, duration_ms })`.
- Comments in English.
- Package managers: pnpm (JS/TS), uv (Python).
- Frontmatter on all docs: at minimum `title` and `date`.

## Knowledge Map

| Path | What's There |
|---|---|
| `docs/PRD.md` | Product requirements — the source of truth for what to build |
| `docs/design-docs/core-beliefs.md` | Golden principles — never violate these |
| `docs/plans/active/` | Current plans — check before starting work |
| `docs/plans/completed/` | Past plans — reference for similar work |
| `docs/plans/tech-debt-tracker.md` | Tech debt tracker — reference for planned cleanup and follow-up refactors |
| `docs/solutions/` | Solved problems — search before implementing |
| `docs/brainstorms/` | Ideas and exploration |
| `docs/design-docs/` | Architecture decisions, ADRs, UX spec, design rationale |
| `docs/design-docs/design-tensions.md` | Resolved tensions between design approaches |
| `docs/references/` | External source materials and structured inputs |

## Architecture

Layers (enforce dependency direction):
Types → Config → Repo → Service → Runtime → UI

Cross-cutting (auth, connectors, telemetry) enters through Providers only.
Violation: move data access to the correct layer. UI → Service → Repo, never UI → Repo.

## Error Patterns

When lint or validation fails, fix the root cause:

- Missing frontmatter → Add `title` and `date` to YAML frontmatter block
- File too long → Split into focused modules, one concept per file
- Import direction violation → Route through the correct layer (see Architecture)
- Missing validation → Add boundary validation at IPC/CLI/API entry points

## Plan Format

Plans in `docs/plans/` use this frontmatter:

```yaml
---
title: "description"
date: YYYY-MM-DD
status: "draft"
tags: [relevant, tags]
---
```

Sections: Goal, Context, Prior Art, Approach (with steps), Validation, Risks, Progress Log.

## Solution Format

Solutions in `docs/solutions/` use this frontmatter:

```yaml
---
title: "description"
date: YYYY-MM-DD
tags: [relevant, tags]
status: "active"
---
```

Sections: Problem, Root Cause, Solution, Prevention, Related.

## Compound Step (When Needed)

Run compound only if at least one is true:

1. Non-trivial bug or root-cause fix was made.
2. A reusable pattern or decision emerged.
3. A new prevention strategy or checklist should be recorded.
4. Architecture or design docs should change.

Skip compound for low-signal work:

- Trivial wording or formatting-only edits.
- Routine mechanical updates with no reusable insight.
- One-off local chores without project-level learning.

When skipped, include a one-line reason in handoff.
