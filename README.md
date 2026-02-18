---
title: "Coda"
date: 2026-02-18
---

# Coda

Coda is an agentic software engineering system.  
Current state: Milestone 1 scaffold (CLI + desktop shell + shared core package).

## What Exists Today

- A TypeScript CLI scaffold at `apps/cli`.
- A Tauri + React desktop scaffold at `apps/desktop`.
- A shared package for contracts and validation at `packages/core`.
- A full validation gate: lint, typecheck, test, and build.

## Prerequisites

- Node.js 22+
- `pnpm` 10+
- Rust toolchain (`rustc`, `cargo`)
- Tauri system prerequisites for your OS

## Quick Start

```bash
pnpm install
pnpm validate
```

Run CLI scaffold commands:

```bash
pnpm --filter @coda/cli build
pnpm --filter @coda/cli exec node dist/main.js --help
pnpm --filter @coda/cli exec node dist/main.js status
```

Run desktop app:

```bash
pnpm --filter @coda/desktop tauri dev
```

Build desktop bundle (`.app` on macOS in current config):

```bash
pnpm --filter @coda/desktop tauri build
```

## Project Layout

```text
apps/
  cli/        # Commander-based CLI scaffold
  desktop/    # Tauri backend + React frontend scaffold
packages/
  core/       # Shared contracts and validation helpers
docs/
  plans/      # Active and completed implementation plans
  solutions/  # Compound-step solution notes
```

## Current Scope

This scaffold is foundation-only. It does not implement full orchestration, Slack integration, or advanced workflow execution yet.
