---
title: "Fix sidebar row spacing illusion caused by grid content stretching"
date: 2026-02-19
tags: [tauri, app, docs-viewer, sidebar, layout, grid, spacing]
status: "active"
---

## Problem

The docs sidebar looked like folder rows were spaced too far apart even after reducing row height and gap tokens.

## Root Cause

The sidebar and nav containers used CSS Grid with full-height constraints, so grid track distribution made sections appear vertically stretched when there was extra height.

## Solution

- Updated `apps/app/src/components/DocsSidebar.tsx`:
  - Added `content-start` to the sidebar grid container.
  - Added `content-start self-start` to the docs nav grid.
- Added regression assertions in `apps/app/src/App.test.tsx` to lock these layout classes.

## Prevention

- When a vertical navigation rail uses grid in a full-height pane, explicitly set `content-start` to avoid stretch-like spacing artifacts.
- Keep density tokens (row heights/gaps) separate from layout-flow controls (grid content alignment) in tests and reviews.

## Related

- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/App.test.tsx`
