---
title: "Simple Scaffold Plan: Tauri App + CLI Tool"
date: 2026-02-18
status: "draft"
tags: [scaffold, tauri, cli, milestone-1]
milestone: M1
---

## Goal

Ship a minimal but runnable Coda scaffold with:

- [ ] A TypeScript CLI package (`coda`) with command wiring and help output.
- [ ] A Tauri desktop package with React/TypeScript frontend and Rust backend shell.
- [ ] Shared internal package(s) for types/config so architecture rules start clean.
- [ ] A single full validation gate (`lint`, `typecheck`, `test` via Vitest, `build`) that passes in CI/local.

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
   - [ ] Action: Create package folders: `apps/cli`, `apps/desktop`, `packages/core`.
   - [ ] Action: Add root `package.json`, `pnpm-workspace.yaml`, and shared scripts.
   - [ ] Deliverables: Add `.gitignore` and basic repo metadata needed for local/CI consistency.
   - [ ] Exit criteria: `pnpm -r list` sees all three packages and installs cleanly.

2. **Set up shared TypeScript and lint/format baseline**
   - [ ] Action: Add root `tsconfig.base.json` and package-level `tsconfig.json` files.
   - [ ] Action: Add `oxlint`/`oxfmt` config with rules that enforce existing repo constraints.
   - [ ] Action: Add Vitest config for TypeScript package testing.
   - [ ] Deliverables: Add package scripts: `lint`, `typecheck`, `test`, `build`.
   - [ ] Exit criteria: each package can run empty baseline commands without failure.

3. **Scaffold `packages/core` contracts first**
   - [ ] Action: Add boundary-safe shared types and config schemas in `packages/core/src`.
   - [ ] Deliverables: Export only named exports (no barrel files).
   - [ ] Action: Add minimal unit tests for validation helpers if any parsing/validation is added.
   - [ ] Exit criteria: both app packages can import `@coda/core` types successfully.

4. **Scaffold CLI package (`apps/cli`)**
   - [ ] Action: Add Commander.js entrypoint wired to `coda` binary.
   - [ ] Deliverables: Implement stub commands from ADR-005: `plan`, `work`, `review`, `compound`, `status`.
   - [ ] Action: Implement deterministic output + exit codes for success/error paths.
   - [ ] Action: Validate CLI input at command boundary before internal logic.
   - [ ] Exit criteria: `coda --help` and `coda status` run successfully.

5. **Scaffold desktop package (`apps/desktop`)**
   - [ ] Action: Initialize Tauri + React/TypeScript app with minimal shell UI.
   - [ ] Deliverables: Add a simple health screen and a placeholder panel for plan/work state.
   - [ ] Action: Add one typed Tauri command roundtrip (frontend invokes Rust command and renders response).
   - [ ] Exit criteria: `tauri dev` launches and shows roundtrip data in UI.

6. **Enforce architecture boundaries**
   - [ ] Action: Verify dependency direction: `packages/core` consumed by both apps; no cross-import between `apps/cli` and `apps/desktop`.
   - [ ] Deliverables: Add lint/import rules or project references needed to prevent boundary drift.
   - [ ] Exit criteria: boundary checks fail on invalid imports and pass on expected imports.

7. **Wire full validation gate**
   - [ ] Action: Add root `validate` script: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
   - [ ] Action: Ensure CI entrypoint runs the same `validate` command.
   - [ ] Deliverables: Add smoke scripts for CLI and desktop startup/build checks.
   - [ ] Exit criteria: full `pnpm validate` passes on a clean checkout.

8. **Complete compound step documentation**
   - [ ] Action: Write solution note in `docs/solutions/` with scaffold issues, root causes, and prevention.
   - [ ] Action: Record architecture-impacting decisions in `docs/design-docs/` if any changed.
   - [ ] Deliverables: Move plan to `docs/plans/completed/` only after all exit criteria pass.
   - [ ] Exit criteria: solution doc exists and plan status reflects actual completion state.

## Validation

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test` (Vitest)
- [ ] `pnpm build`
- [ ] `pnpm --filter @coda/cli exec coda --help`
- [ ] `pnpm --filter @coda/cli exec coda status`
- [ ] `pnpm --filter @coda/desktop tauri dev` (manual launch check)
- [ ] `pnpm --filter @coda/desktop tauri build` (packaging check)
- [ ] Keep this plan as `status: draft` until approved.
- [ ] Move to `docs/plans/completed/` when scaffold is done.

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
