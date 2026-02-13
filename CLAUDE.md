# Coda

Coda is an agentic software engineering system that fuses harness engineering with compound engineering. Humans steer, agents execute, every unit of work compounds into the next.

**Stack**: TypeScript CLI (Commander.js) + Tauri UI (React/TS + Rust) + Slack integration
**Status**: Design phase — docs and architecture defined, zero application code
**Package managers**: pnpm (JS/TS), uv (Python)

## The Compound Loop

Every unit of work follows: **Plan → Work → Review → Compound**.

- Plans: `docs/plans/active/` — check before starting new work
- Completed plans: `docs/plans/completed/` — reference for future planning
- Solutions: `docs/solutions/` — search before implementing (institutional memory)
- Brainstorms: `docs/brainstorms/` — capture fuzzy ideas before planning
- After completing work, always capture learnings via the compound step

## Project Status

Coda is bootstrapping itself. The first milestone is a working compound loop via CLI.

- PRD: `docs/PRD.md`
- Core beliefs: `docs/design-docs/core-beliefs.md`
- Architecture overview: `docs/design-docs/architecture-overview.md`
- UX specification: `docs/design-docs/ux-specification.md`

No application code exists yet. The next step is Milestone 1: CLI core + basic agent orchestration.

## Architecture

Target layers (dependency direction): Types → Config → Repo → Service → Runtime → UI
Cross-cutting concerns enter through Providers only.

When code exists, see ARCHITECTURE.md for the full domain map.

## Repository Knowledge

All project knowledge lives in `docs/`. Search there first.

| Directory | Contents |
|---|---|
| `docs/plans/active/` | Current execution plans |
| `docs/plans/completed/` | Past plans for reference |
| `docs/solutions/` | Institutional memory — solved problems and patterns |
| `docs/brainstorms/` | Captured ideation and exploration |
| `docs/design-docs/` | Architecture decisions, core beliefs, ADRs, UX spec, design rationale |
| `docs/references/` | External source materials and structured inputs |

Source documents:

- `docs/references/harness-engineering.md` — OpenAI's harness engineering philosophy
- `docs/references/compound-engineering.md` — Every.to's compound engineering guide
- `docs/references/requirements.md` — Initial requirements (superseded by PRD)

## Code Conventions

- TypeScript: prefer `type` over `interface`
- Files under 500 lines. Split when approaching limit.
- Validate at boundaries (IPC, CLI args, API responses). Trust typed data internally.
- Structured logging: `logger.info({ component, action, duration_ms })`
- No barrel files. Explicit named exports.
- One concept per file. Name files for what they contain.
- Comments in English.

## Document Conventions

All documents in `docs/` should include YAML frontmatter:

- Required: `title`, `date`
- Recommended: `tags`, `status`
- Plans need: `status` (draft | review | approved | executing | completed)

See `docs/plans/completed/docs-structure-plan.md` Section 6 for full frontmatter spec.

## Agent Workflow

1. Search `docs/solutions/` for relevant prior art before implementing
2. Check `docs/plans/active/` for an existing plan
3. Reference `docs/design-docs/core-beliefs.md` for golden principles
4. Run full validation before completing (when build pipeline exists)
5. Capture learnings — document solutions in `docs/solutions/`

## When Stuck

1. Search `docs/solutions/` — someone may have solved this
2. Check `docs/design-docs/` — there may be a design decision you're missing
3. Read `docs/design-docs/design-tensions.md` — resolved tensions between design approaches
4. If still stuck, escalate with a structured summary of what you tried

## Patterns

[Pointers added as patterns emerge from docs/solutions/]

## Common Mistakes

[Added by compound step as mistakes are discovered and documented]
