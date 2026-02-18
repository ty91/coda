---
title: "Coda"
date: 2026-02-18
---

# Coda

Coda is an agentic software engineering system.  
Current state: Milestone 1 scaffold (CLI + app shell + shared core package).

## What Exists Today

- A TypeScript CLI scaffold at `apps/cli`.
- A Tauri + React app scaffold at `apps/app`.
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

Run app:

```bash
pnpm --filter @coda/app tauri dev
```

Build app bundle (`.app` on macOS in current config):

```bash
pnpm --filter @coda/app tauri build
```

## Project Layout

```text
apps/
  cli/        # Commander-based CLI scaffold
  app/        # Tauri backend + React frontend scaffold
packages/
  core/       # Shared contracts and validation helpers
docs/
  plans/      # Active and completed implementation plans
  solutions/  # Compound-step solution notes
```

## Current Scope

This scaffold is foundation-only. It does not implement full orchestration, Slack integration, or advanced workflow execution yet.
