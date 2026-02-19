---
title: "Doc viewer container fills viewport top and bottom"
date: 2026-02-19
tags: [tauri, ui, docs-viewer, layout]
status: "active"
---

## Problem

The doc viewer surface did not visually fill the viewport height. A bottom gap remained, and the reader panel looked detached from the shell.

## Root Cause

The app shell used `items-start` and bottom padding on the main grid, so the right pane did not stretch to available vertical space. The viewer panel also lacked explicit full-height/scroll container behavior.

## Solution

- Updated `apps/app/src/App.tsx`:
  - Switched shell alignment from `items-start` to `items-stretch`.
  - Removed shell bottom padding (`pb-0`) to eliminate the viewport-bottom gap.
  - Added `min-h-0` on the right pane wrapper so child overflow rules can apply correctly.
- Updated `apps/app/src/components/DocViewerPanel.tsx`:
  - Added `h-full min-h-0 overflow-y-auto` on the viewer container so it stretches to pane height and scrolls internally.
- Added regression coverage in `apps/app/src/App.test.tsx` for stretch/full-height class presence.

## Prevention

- For split-pane layouts, set vertical stretch at the shell (`items-stretch`) and define full-height + overflow behavior at pane containers explicitly.
- When a pane must occupy full viewport height, avoid shell-level bottom padding unless intentionally reserved.

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
