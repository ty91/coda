---
title: "Header ask icon keeps sidebar-only path and blocks modal regressions"
date: 2026-02-19
tags: [tauri, app, ask-queue, sidebar, modal, regression, accessibility]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-fix-plan-header-ask-sidebar-list-plan.md"
---

## Problem

The app header ask icon needed a hard guarantee: click should only open/close the right ask sidebar list and must never reintroduce a modal path.

## Root Cause

The existing behavior was sidebar-based, but modal prohibition was not encoded as an explicit contract in docs/tests. This left room for future regressions when changing ask UI affordances.

## Solution

- Added an explicit interaction contract doc for header ask -> right sidebar only flow, including scenario matrix and forbidden outcomes.
- Strengthened semantics in UI:
  - ask toggle button now declares `aria-controls` and `aria-expanded`.
  - `AskInboxPanel` now exposes sidebar semantics (`role="complementary"`, panel id and aria label).
  - sidebar floating layout contract remains fixed (`right-4`, width `22.5rem`, `z-40`).
- Added regression checks:
  - App-level tests now assert sidebar rendering and modal absence (`queryByRole('dialog')`) on ask toggle flows.
  - AskInboxPanel test now verifies `isOpen=false` keeps panel hidden while pending-count synchronization still runs.

## Prevention

- Keep ask rendering path single-homed through `AskInboxPanel` from `App`.
- Treat modal absence as a first-class test assertion, not an implicit assumption.
- Keep accessibility wiring (`aria-controls`, `aria-expanded`, complementary role) in place so intent is visible in code review.

## Related

- `docs/design-docs/ask-sidebar-interaction-contract.md`
- `apps/app/src/App.tsx`
- `apps/app/src/components/AskInboxPanel.tsx`
- `apps/app/src/App.test.tsx`
- `apps/app/src/components/AskInboxPanel.test.tsx`
- `docs/plans/completed/2026-02-19-fix-plan-header-ask-sidebar-list-plan.md`
