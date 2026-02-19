---
title: "Restore macOS window dragging with explicit overlay title-bar drag regions"
date: 2026-02-19
tags: [tauri, macos, titlebar, drag-region, docs-viewer]
status: "active"
---

## Problem

After switching to an overlay macOS title bar, users could no longer drag the window from the app's top area.

## Root Cause

The window was configured with `titleBarStyle: "Overlay"` and `hiddenTitle: true`, so drag behavior depended on explicit web-content drag regions.
Initial patching added `data-tauri-drag-region` to large container elements only, but users mostly mouse-down on child content. In practice, container-only placement did not provide reliable drag hit targets.
Manual symptom confirmed this: top-bar double-click maximize/restore still worked, but drag-to-move did not.
Additionally, app capability ACL only included `core:default`; `core:window:default` does not include `start_dragging`, so drag-region-triggered drag could still be blocked by permission.

## Solution

- Removed container-level drag attributes from sidebar/reader root containers.
- Added dedicated direct-hit top drag strips (`data-tauri-drag-region`) in the existing safe top area for:
  - `apps/app/src/components/DocsSidebar.tsx` (`sidebar-drag-region`)
  - `apps/app/src/components/DocViewerPanel.tsx` (`viewer-drag-region`)
- Kept the single-layer shell design and used absolute strips in existing top padding, so no extra visual title strip was introduced.
- Added Tauri ACL permission for drag start command:
  - `apps/app/src-tauri/capabilities/default.json`: `core:window:allow-start-dragging`
- Updated regression coverage in `apps/app/src/App.test.tsx`:
  - Assert dedicated drag-strip elements are marked as drag regions.
  - Assert sidebar and reader containers are not drag regions (guard against ineffective container-only placement).
  - Assert interactive controls (for example, refresh button) are not marked as drag regions.
  - Assert exactly two drag-region elements are rendered.
- Added regression coverage in `apps/app/src/tauri-capabilities.test.ts`:
  - Assert default capability includes `core:window:allow-start-dragging`.

## Prevention

- For any Tauri window using overlay/custom title bars, treat drag-region markup as a required checklist item.
- Keep at least one UI test that fails if drag-region attributes are removed or moved to container-only placement.
- Prefer dedicated, directly-clickable non-interactive drag strips over broad container-level attributes.

## Related

- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
- `apps/app/src/tauri-capabilities.test.ts`
- `apps/app/src-tauri/capabilities/default.json`
- `apps/app/src-tauri/tauri.conf.json`
- `docs/solutions/2026-02-19-tauri-macos-transparent-titlebar-hidden-title.md`
