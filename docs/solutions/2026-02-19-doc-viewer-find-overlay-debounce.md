---
title: "Docs viewer find overlay placement and debounced matching"
date: 2026-02-19
tags: [tauri, app, docs-viewer, find, overlay, debounce, regression]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-fix-doc-viewer-find-overlay-debounce-plan.md"
---

## Problem

The docs viewer find bar opened in normal document flow and pushed content down, while each keystroke immediately re-ran in-document matching and highlight mutation.

## Root Cause

The find UI was rendered as a regular block in `DocViewerPanel` instead of an anchored overlay, and the app used a single query state for both input echo and search execution, so matching ran on every input change.

## Solution

- Repositioned the find UI in `apps/app/src/components/DocViewerPanel.tsx` to an absolute top-right overlay inside the reader container.
- Added responsive overlay sizing and preserved keyboard controls (`Enter`, `Shift+Enter`, `Esc`) without pushing reader layout.
- Split find state in `apps/app/src/App.tsx` into:
  - `findInputQuery` for immediate input value updates.
  - `findSearchQuery` for highlight execution.
- Added a 150ms debounce that updates `findSearchQuery` from `findInputQuery`.
- Added stale-navigation guard logic so next/previous navigation does not run against stale matches when the debounced query has not yet caught up.
- Extended `apps/app/src/App.test.tsx` with:
  - Overlay rendering signal assertions for find UI placement.
  - Debounce timing regression checks (`<150ms` remains `0/0`, then updates after delay).

## Prevention

- Keep input state and execution state separate for UI features that mutate large DOM regions.
- Keep overlay UI anchored to a stable container (`relative` parent + explicit `absolute` offsets) when layout shifts are not desired.
- Preserve find behavior regressions in app-level tests so future refactors cannot silently remove debounce or overlay positioning.

## Related

- `docs/plans/completed/2026-02-19-fix-doc-viewer-find-overlay-debounce-plan.md`
- `docs/solutions/2026-02-19-doc-viewer-cmd-f-in-document-find.md`
- `apps/app/src/App.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
