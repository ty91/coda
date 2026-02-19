---
title: "Restore macOS window dragging with explicit overlay title-bar drag regions"
date: 2026-02-19
tags: [tauri, macos, titlebar, drag-region, docs-viewer]
status: "active"
---

## Problem

After switching to an overlay macOS title bar, users could no longer drag the window from the app's top area.

## Root Cause

The window was configured with `titleBarStyle: "Overlay"` and `hiddenTitle: true`, but the React UI defined no `data-tauri-drag-region`.
Under Tauri overlay/custom title bar behavior, dragging only works in elements explicitly marked as drag regions.
An existing test also asserted that no drag region should exist, which locked in the broken state.

## Solution

- Added `data-tauri-drag-region` to the existing top-safe container surfaces:
  - `apps/app/src/components/DocsSidebar.tsx`
  - `apps/app/src/components/DocViewerPanel.tsx`
- Kept the single-layer shell design and avoided adding a separate visual title strip.
- Updated regression coverage in `apps/app/src/App.test.tsx`:
  - Assert sidebar and reader surfaces are marked as drag regions.
  - Assert interactive controls (for example, refresh button) are not marked as drag regions.
  - Assert exactly two drag-region elements are rendered.

## Prevention

- For any Tauri window using overlay/custom title bars, treat drag-region markup as a required checklist item.
- Keep at least one UI test that fails if drag-region attributes are removed.
- Prefer adding drag regions on existing non-interactive top-safe containers before introducing new overlay layers.

## Related

- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
- `apps/app/src-tauri/tauri.conf.json`
- `docs/solutions/2026-02-19-tauri-macos-transparent-titlebar-hidden-title.md`
