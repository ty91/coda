---
title: "Doc viewer remove Document/Reader header chrome"
date: 2026-02-19
tags: [tauri, app, docs-viewer, ui, cleanup, regression]
status: "active"
---

## Problem

The document viewer still showed a static header block (`Document`, `Reader`) above content, adding non-essential chrome in the reading surface.

## Root Cause

`DocViewerPanel` rendered a fixed pane header by default, even though the panel already had clear structure via document title metadata and content.

## Solution

- Removed the static header render block from `apps/app/src/components/DocViewerPanel.tsx`.
- Removed now-unused header utility imports from `DocViewerPanel`.
- Updated `apps/app/src/App.test.tsx` to verify the `Reader` heading is absent and to resolve reader-surface lookup through the drag-region test id.
- Kept existing drag-region, loading/error, and find-overlay behaviors unchanged.

## Prevention

- Keep reader surface focused on document context and content first; avoid persistent decorative headings that duplicate nearby semantics.
- When removing fixed UI chrome, update accessibility/query anchors in tests to stable structural hooks (`data-testid` where already present).

## Related

- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
