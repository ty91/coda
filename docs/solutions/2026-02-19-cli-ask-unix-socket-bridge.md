---
title: "Bridge coda ask between CLI and Tauri via Unix socket"
date: 2026-02-19
tags: [cli, app, human-in-loop, ask-command, unix-socket, milestone-1]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-feat-cli-agent-ask-command-plan.md"
---

## Problem

`coda ask` needed to block in the CLI until a human answered multi-question prompts in the Tauri UI, while still returning a strict JSON response contract that agent subprocesses can parse reliably.

## Root Cause

The scaffold had no runtime bridge between CLI and app for transient ask sessions. Existing app commands only covered docs viewer functionality, and the CLI had no stdin-based structured ask command.

## Solution

- Added a stdin-only `coda ask` command in CLI with fixed exit-code semantics.
- Implemented a local Unix socket bridge at `~/.coda/runtime/ask.sock`.
- Added Tauri ask runtime state and commands:
  - `list_pending_ask_sessions`
  - `submit_ask_response`
- Added a dedicated ask queue UI panel that renders multi-question cards, supports automatic `Other` input, handles optional/required notes, and blocks submit/cancel on expired asks.
- Added regression coverage for:
  - CLI timeout/cancel/malformed-response/empty-stdin paths
  - Ask UI render and submit/cancel payload behavior
  - Soft-cap warning for asks with more than four questions
- Added a smoke script (`tools/ask-roundtrip-smoke.mjs`) to verify `ask -> submit -> unblock` roundtrip in headless environments.

## Prevention

- Keep ask request/response schemas validated at boundaries (`@coda/core` for CLI payload parsing and contract checks).
- Keep socket framing line-delimited JSON to simplify interop and failure diagnosis.
- Treat UI-specific affordances (`Other`, soft-cap warnings, required-note blocking) as explicit test contracts.
- Preserve deterministic exit codes so agent providers can branch behavior without brittle stderr parsing.

## Related

- `apps/cli/src/ask.ts`
- `apps/cli/src/ask.test.ts`
- `apps/app/src-tauri/src/ask_runtime.rs`
- `apps/app/src/components/AskInboxPanel.tsx`
- `apps/app/src/components/AskInboxPanel.test.tsx`
- `tools/ask-roundtrip-smoke.mjs`
- `docs/design-docs/ADR-006-human-in-loop.md`
