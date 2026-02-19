---
title: "Tauri ask panel header icon toggle with visibility-bound find offset"
date: 2026-02-19
tags: [tauri, app, ask-queue, ui, header, toggle, lucide, find-overlay]
status: "active"
related_plan: "docs/plans/active/2026-02-19-feat-tauri-ask-panel-header-toggle-plan.md"
---

## Problem

The ask queue sidebar could only appear when pending asks existed and had no user-controlled hide/show switch. The center container header also lacked a dedicated ask control, so users could not collapse the panel while keeping pending asks queued.

## Root Cause

`App` computed ask visibility from `pendingAskCount > 0` only, and find overlay offset used the same pending-only condition. There was no independent UI state for "panel open vs closed" and no always-visible header affordance.

## Solution

- Added an always-visible center-header icon button using Lucide `MessageCircleQuestionMark` in `apps/app/src/App.tsx`.
- Introduced `isAskPanelOpen` state and derived visibility with `isAskPanelVisible = pendingAskCount > 0 && isAskPanelOpen`.
- Added pending transition recovery: when ask count changes `0 -> >0`, panel auto-opens.
- Updated find overlay offset logic to depend on real panel visibility (`isAskPanelVisible`) instead of pending count alone.
- Extended `AskInboxPanel` with `isOpen` prop to hide/show panel content while keeping polling and `onPendingCountChange` updates alive.
- Follow-up: removed the pending-based `disabled` gate so the header icon stays clickable at all times.
- Follow-up: when no pending ask exists, toggling open now renders the ask panel with an explicit empty state (`No pending asks.`) instead of remaining hidden.
- Added app-level regression coverage for:
  - header icon always visible + clickable with no pending asks,
  - toggle open/close behavior when pending asks exist,
  - find overlay right offset switching (`392px` vs `16px`) with panel visibility.

## Prevention

- Separate queue existence state from panel visibility state whenever floating utility panes are user-collapsible.
- Derive cross-surface layout offsets from the actual rendered visibility flag, not from data presence alone.
- Keep critical visibility contracts at app-level tests, not component-local tests only.

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/components/AskInboxPanel.tsx`
- `apps/app/src/App.test.tsx`
- `docs/plans/active/2026-02-19-feat-tauri-ask-panel-header-toggle-plan.md`
- `docs/solutions/2026-02-19-ask-queue-floating-right-sidebar-conditional-visibility.md`
