---
title: "macOS ask-arrival notifications for Tauri ask queue"
date: 2026-02-19
tags: [tauri, app, ask-queue, macos, notification, human-in-loop, milestone-1]
status: "active"
related_plan: "docs/plans/active/2026-02-19-feat-tauri-ask-macos-notification-plan.md"
---

## Problem

New `coda ask` sessions reached the Tauri runtime queue, but users had no OS-level signal when the app was not in focus.

## Root Cause

- Ask queue updates depended on polling UI state.
- No runtime event existed for "new ask inserted successfully."
- Notification plugin/capability wiring was missing.
- No dedupe contract existed for repeated `ask_id` delivery.

## Solution

- Added `ask_session_created` runtime event payload in `ask_runtime` and emit on successful insert only.
- Injected `AppHandle` into the ask socket server path so worker threads can emit events.
- Added Tauri notification plugin dependencies (Rust + TS) and capability permission (`notification:default`).
- Added `useAskNotifications` hook:
  - subscribe to `ask_session_created`,
  - macOS-only gating,
  - permission check/request flow,
  - `ask_id` dedupe in-memory set,
  - ellipsis preview from first question text,
  - action callback -> main window focus (`unminimize/show/setFocus`).
- Added regressions for notification send/dedupe/non-macOS no-op/permission denied no-op/focus action.

## Prevention

- Keep event-driven contracts in runtime boundary code (insert success emits once).
- Keep notification side effects in a dedicated hook with explicit platform and permission guards.
- Lock notification behavior with dedicated hook tests, not only app-shell tests.
- Keep `ask_id` as canonical dedupe key across runtime and frontend orchestration.

## Related

- `apps/app/src-tauri/src/ask_runtime.rs`
- `apps/app/src-tauri/src/ask_runtime_tests.rs`
- `apps/app/src-tauri/src/lib.rs`
- `apps/app/src-tauri/capabilities/default.json`
- `apps/app/src/useAskNotifications.ts`
- `apps/app/src/useAskNotifications.test.tsx`
- `packages/core/src/contracts.ts`
