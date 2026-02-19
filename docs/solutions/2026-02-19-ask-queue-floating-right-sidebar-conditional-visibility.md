---
title: "Ask queue right-floating sidebar with pending-only visibility"
date: 2026-02-19
tags: [tauri, app, ask-queue, sidebar, find-overlay, regression]
status: "active"
related_plan: "docs/plans/active/2026-02-19-feat-ask-queue-floating-right-sidebar-plan.md"
---

## Problem

Ask queue UI rendered inline below the reader and showed empty/loading/error states even when no actionable ask existed. This consumed reader space and violated the "show only when real ask exists" rule.

## Root Cause

`AskInboxPanel` owned queue polling but always rendered a root panel in Tauri mode, so empty queue state still produced visible UI. The find overlay used a fixed right offset that did not account for a right-side ask panel.

## Solution

- Changed `AskInboxPanel` to render `null` unless `sessions.length > 0`.
- Kept queue polling active even while hidden; on fetch failure, reset sessions to empty and log to console.
- Added `onPendingCountChange` callback + `className` prop so parent shell can react to pending ask presence.
- Moved ask panel to a right `fixed` floating sidebar in `App` and wired pending count state.
- Added dynamic find overlay right offset (`16px` default, `392px` with visible ask sidebar) via CSS variable in `DocViewerPanel`.
- Added regression tests for:
  - Ask panel hidden on empty queue and queue-load failure.
  - Ask panel reappears when pending ask arrives.
  - App-level hidden-by-default ask panel behavior.
  - Find overlay offset switching when ask sidebar is visible.

## Prevention

- Keep ask visibility rule explicit: no placeholder UI without actionable sessions.
- Drive cross-panel layout offsets from shared shell state (`pending ask count`) instead of hardcoded overlay positions.
- Lock both hidden/default and visible/offset cases with app-level tests.

## Related

- `apps/app/src/components/AskInboxPanel.tsx`
- `apps/app/src/App.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/components/AskInboxPanel.test.tsx`
- `apps/app/src/App.test.tsx`
- `docs/plans/active/2026-02-19-feat-ask-queue-floating-right-sidebar-plan.md`
