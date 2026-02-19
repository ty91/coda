---
title: "Remove coda ask id option and keep ask_id runtime-generated"
date: 2026-02-19
tags: [cli, ask-command, contracts]
status: "active"
---

## Problem

`coda ask` exposed `--id`, which let callers override `ask_id`. We wanted the CLI surface to be simpler and avoid user-controlled correlation ids.

## Root Cause

The initial ask command shipped with an optional correlation-id flag for debugging and manual tracing.

## Solution

- Removed `--id` from `coda ask` command options/help text in `apps/cli/src/main.ts`.
- Removed `id` parsing and validation from `apps/cli/src/ask.ts`.
- Kept `ask_id` generation internal (`ask-${Date.now()}-${randomBytes(...)}`) for every request.

## Prevention

- Keep CLI ask options minimal: only transport/runtime behavior flags (`--json`, `--timeout-ms`).
- When adding new flags, require a clear operator need and update help contract docs in the same change.

## Related

- `apps/cli/src/main.ts`
- `apps/cli/src/ask.ts`
