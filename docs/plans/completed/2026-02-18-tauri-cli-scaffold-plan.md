---
title: "Simple Scaffold Plan: Tauri App + CLI Tool"
date: 2026-02-18
status: "completed"
tags: [scaffold, tauri, cli, milestone-1]
milestone: M1
---

## Goal

Ship a minimal but runnable Coda scaffold with:

- [x] A TypeScript CLI package (`coda`) with command wiring and help output.
- [x] A Tauri app package with React/TypeScript frontend and Rust backend shell.
- [x] Shared internal package(s) for types/config so architecture rules start clean.
- [x] A single full validation gate (`lint`, `typecheck`, `test` via Vitest, `build`) that passes in CI/local.

## Context

- Current repo status: design-first docs, almost zero application code.
- Milestone 1 in `docs/PRD.md` requires CLI + basic Tauri UI as core interfaces.
- `docs/design-docs/ADR-005-cli.md` defines command shape aligned to the compound loop.
- `docs/design-docs/architecture-overview.md` defines layer direction:
  Types -> Config -> Repo -> Service -> Runtime -> UI.
- Guardrails from `AGENTS.md`:
  - TypeScript `type` over `interface`
  - no barrel files
  - files under ~500 LOC
  - boundary validation at inputs

## Prior Art

- `docs/PRD.md` (Milestone 1 foundation scope and exclusions)
- `docs/design-docs/ADR-005-cli.md` (CLI command model)
- `docs/design-docs/architecture-overview.md` (stack + layering)
- `docs/plans/.template.md` (plan skeleton)
- `docs/solutions/` (no directly reusable scaffold solution yet)

## Approach

1. **Create workspace skeleton (no app logic yet)**
   - [x] Action: Create package folders: `apps/cli`, `apps/app`, `packages/core`.
   - [x] Action: Add root `package.json`, `pnpm-workspace.yaml`, and shared scripts.
   - [x] Deliverables: Add `.gitignore` and basic repo metadata needed for local/CI consistency.
   - [x] Exit criteria: `pnpm -r list` sees all three packages and installs cleanly.

2. **Set up shared TypeScript and lint/format baseline**
   - [x] Action: Add root `tsconfig.base.json` and package-level `tsconfig.json` files.
   - [x] Action: Add `oxlint`/`oxfmt` config with rules that enforce existing repo constraints.
   - [x] Action: Add Vitest config for TypeScript package testing.
   - [x] Deliverables: Add package scripts: `lint`, `typecheck`, `test`, `build`.
   - [x] Exit criteria: each package can run empty baseline commands without failure.

3. **Scaffold `packages/core` contracts first**
   - [x] Action: Add boundary-safe shared types and config schemas in `packages/core/src`.
   - [x] Deliverables: Export only named exports (no barrel files).
   - [x] Action: Add minimal unit tests for validation helpers if any parsing/validation is added.
   - [x] Exit criteria: both app packages can import `@coda/core` types successfully.

4. **Scaffold CLI package (`apps/cli`)**
   - [x] Action: Add Commander.js entrypoint wired to `coda` binary.
   - [x] Deliverables: Implement stub commands from ADR-005: `plan`, `work`, `review`, `compound`, `status`.
   - [x] Action: Implement deterministic output + exit codes for success/error paths.
   - [x] Action: Validate CLI input at command boundary before internal logic.
   - [x] Exit criteria: `coda --help` and `coda status` run successfully.

5. **Scaffold app package (`apps/app`)**
   - [x] Action: Initialize Tauri + React/TypeScript app with minimal shell UI.
   - [x] Deliverables: Add a simple health screen and a placeholder panel for plan/work state.
   - [x] Action: Add one typed Tauri command roundtrip (frontend invokes Rust command and renders response).
   - [x] Exit criteria: `tauri dev` launches and shows roundtrip data in UI.

6. **Enforce architecture boundaries**
   - [x] Action: Verify dependency direction: `packages/core` consumed by both apps; no cross-import between `apps/cli` and `apps/app`.
   - [x] Deliverables: Add lint/import rules or project references needed to prevent boundary drift.
   - [x] Exit criteria: boundary checks fail on invalid imports and pass on expected imports.

7. **Wire full validation gate**
   - [x] Action: Add root `validate` script: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
   - [x] Action: Ensure CI entrypoint runs the same `validate` command.
   - [x] Deliverables: Add smoke scripts for CLI and app startup/build checks.
   - [x] Exit criteria: full `pnpm validate` passes on a clean checkout.

8. **Complete compound step documentation**
   - [x] Action: Write solution note in `docs/solutions/` with scaffold issues, root causes, and prevention.
   - [x] Action: Record architecture-impacting decisions in `docs/design-docs/` if any changed.
   - [x] Deliverables: Move plan to `docs/plans/completed/` only after all exit criteria pass.
   - [x] Exit criteria: solution doc exists and plan status reflects actual completion state.

## Validation

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test` (Vitest)
- [x] `pnpm build`
- [x] `pnpm --filter @coda/cli exec node dist/main.js --help` (`pnpm exec coda` does not resolve workspace-local bins)
- [x] `pnpm --filter @coda/cli exec node dist/main.js status`
- [x] `pnpm --filter @coda/app tauri dev` (manual launch check)
- [x] `pnpm --filter @coda/app tauri build` (packaging check)
- [x] Keep this plan as `status: draft` until approved (applied during implementation).
- [x] Move to `docs/plans/completed/` when scaffold is done.

## Risks

1. **Tauri environment prerequisites missing on contributor machines**
   - Mitigation: document OS-level prerequisites early; fail fast in setup script.
2. **Workspace/tooling churn before product code starts**
   - Mitigation: keep baseline minimal; avoid premature plugins.
3. **Layer violations during fast bootstrap**
   - Mitigation: create shared contracts package first; review imports in each PR.
4. **Scope creep into Milestone 2 features**
   - Mitigation: enforce non-goals (no Slack, no Codex routing, no advanced orchestration).

## Progress Log

- 2026-02-18: Draft plan created from PRD M1 + ADR-005 + architecture constraints.
- 2026-02-18: Implemented workspace scaffold (`apps/cli`, `apps/app`, `packages/core`) with full validate gate and CI workflow.
- 2026-02-18: Added architecture boundary check script and passed `tauri build` packaging check (macOS `.app` target).
