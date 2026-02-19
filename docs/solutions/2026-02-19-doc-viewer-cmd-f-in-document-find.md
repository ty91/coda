---
title: "Cmd+F in-document find for docs viewer body + frontmatter metadata"
date: 2026-02-19
tags: [tauri, app, docs-viewer, keyboard-shortcut, find, regression]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-feat-doc-viewer-cmd-f-find-plan.md"
---

## Problem

The docs viewer had no in-document find flow, so users could not quickly locate text with `Cmd+F` / `Ctrl+F` while reading markdown docs.

## Root Cause

The reader surface had no keyboard shortcut boundary, no query/match navigation state, and no rendering path to discover/highlight matches across the currently selected document content.

## Solution

- Added app-level find state and shortcut handling in `apps/app/src/App.tsx`:
  - open/close/query state
  - match count + active index state
  - `Cmd+F` / `Ctrl+F` open behavior
  - `Enter` / `Shift+Enter` navigation and `Esc` close behavior
- Implemented reader-scoped DOM matching and highlight traversal in `apps/app/src/components/DocViewerPanel.tsx`:
  - case-insensitive text-node matching
  - scope includes metadata rows and markdown body for the selected document
  - active-match indicator + scroll-into-view navigation
- Added compact find UI controls in the reader:
  - query input
  - prev/next buttons
  - `current/total` counter
  - close action
- Extended regression tests in `apps/app/src/App.test.tsx` for:
  - shortcut-triggered open/focus
  - match counter/navigation updates
  - no-match disabled state
  - find-state reset when switching documents

## Prevention

- Keep find behavior scoped to the current reader article to avoid sidebar/global false matches.
- Treat navigation request tokens as edge-triggered events; guard against reprocessing the same token to prevent infinite next/previous loops.
- Keep shortcut handling at app boundary and rendering/match logic at viewer boundary to avoid state drift.
- Keep find regressions in `App.test.tsx` so shortcut wiring and match traversal break loudly during CI.

## Related

- `docs/plans/completed/2026-02-19-feat-doc-viewer-cmd-f-find-plan.md`
- `apps/app/src/App.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
