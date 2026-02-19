---
title: "Clarify coda ask help with request contract and exit semantics"
date: 2026-02-19
tags: [cli, ask-command, docs, validation]
status: "active"
---

## Problem

The `coda ask --help` output only showed minimal examples and did not explain the request payload shape or key validation constraints.

## Root Cause

The command help text focused on command flags and omitted the shared request contract that is enforced at runtime.

## Solution

- Expanded `coda ask` help text in `apps/cli/src/main.ts` to include:
  - A concrete stdin JSON payload example.
  - Validation rules for question count, option count, id format/uniqueness, and field lengths.
  - The `(Recommended)` label suffix rule.
  - Clear exit-code meanings.
  - Practical command examples with `--json` and `--timeout-ms`.

## Prevention

- Keep CLI help text aligned with `@coda/core` boundary validators whenever contract rules change.
- Prefer explicit, runnable examples over placeholders in command help.

## Related

- `apps/cli/src/main.ts`
- `packages/core/src/validation.ts`
