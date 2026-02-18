---
title: "Tauri + CLI scaffold baseline for Milestone 1"
date: 2026-02-18
tags: [scaffold, tauri, cli, workspace, validation]
status: "active"
---

## Problem

The repository had design docs but no runnable application scaffold. Milestone 1 required a working CLI shell, desktop shell, shared core package, and one validation gate that can run locally and in CI.

## Root Cause

The codebase started in a documentation-only state with no workspace tooling, package graph, or runtime entrypoints. This made it impossible to execute the compound loop with real binaries.

## Solution

Implemented a monorepo scaffold with `pnpm` workspaces:

- `packages/core`: shared contracts and boundary validation helpers (`zod`) with Vitest regression tests.
- `apps/cli`: Commander-based `coda` command scaffold with stub commands (`plan`, `work`, `review`, `compound`, `status`), deterministic output, and explicit exit-code handling.
- `apps/desktop`: Tauri 2 + React/TypeScript shell with health screen, placeholder plan/work panel, and typed frontend-to-Rust command roundtrip (`get_health_message`).

Added project-wide quality gates and enforcement:

- Root scripts: `lint`, `typecheck`, `test`, `build`, `validate`.
- CI workflow: `.github/workflows/validate.yml` runs `pnpm validate`.
- Architecture boundary check: `tools/validate-boundaries.mjs` blocks cross-imports between `apps/cli` and `apps/desktop`.

Resolved scaffold-specific packaging issue:

- `tauri build` initially failed on DMG bundling (`failed to bundle project error running bundle_dmg.sh`).
- Updated `apps/desktop/src-tauri/tauri.conf.json` bundle target to `app` so packaging passes in this environment.

## Prevention

- Keep shared contracts in `packages/core` and consume via package imports only.
- Run `pnpm validate` before handoff; keep CI entrypoint identical to local gate.
- Keep desktop bundling target stable (`app`) unless DMG signing/notarization workflow is explicitly configured.
- For local CLI smoke checks, invoke built entrypoint (`node dist/main.js`) when workspace-local `pnpm exec` bin resolution is unavailable.

## Related

- `docs/plans/completed/2026-02-18-tauri-cli-scaffold-plan.md`
- `docs/design-docs/ADR-005-cli.md`
- `docs/design-docs/architecture-overview.md`
