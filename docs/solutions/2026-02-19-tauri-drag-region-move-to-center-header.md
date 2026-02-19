---
title: "Move Tauri drag region from doc viewer strip to center header strip"
date: 2026-02-19
tags: [tauri, macos, titlebar, drag-region, header]
status: "active"
---

## Problem

Window dragging worked on the sidebar top strip and doc viewer top strip, but not on the center header area where users click near the ask toggle.

## Root Cause

The app only marked two drag strips with `data-tauri-drag-region`: sidebar and doc viewer. The center header had no drag region, so mouse-down there never triggered `start_dragging`.

## Solution

- Added a dedicated center-header drag strip in `apps/app/src/App.tsx` (`center-header-drag-region`).
- Raised the ask toggle button above the strip with `relative z-10` so the button stays clickable.
- Removed `data-tauri-drag-region` from the doc viewer top strip in `apps/app/src/components/DocViewerPanel.tsx`.
- Updated regression coverage in `apps/app/src/App.test.tsx`:
  - sidebar strip is draggable,
  - center-header strip is draggable,
  - doc viewer strip is not draggable,
  - total draggable regions remain exactly two.

## Prevention

- Treat drag hit-target placement as user-flow driven (where users actually mouse-down), not just visual top padding placement.
- Keep app-level tests asserting exact draggable region locations to prevent silent regressions during layout refactors.

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
- `docs/solutions/2026-02-19-tauri-overlay-titlebar-drag-region.md`
