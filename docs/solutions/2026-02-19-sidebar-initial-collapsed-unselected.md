---
title: "Start docs viewer with collapsed tree and no selected document"
date: 2026-02-19
tags: [tauri, ui, sidebar, docs-tree, reader]
status: "active"
---

## Problem

On app boot, the docs viewer auto-expanded sections and auto-selected the first document, so the reader never started in an empty state.

## Root Cause

- `loadDocSummaries` fallback logic always selected `summaries[0]` when no current selection existed.
- Tree initialization expanded sections by default through `defaultExpandedSectionKeys`.
- Reader panel rendered helper copy for unselected state, so the content region was not visually empty.

## Solution

- Changed summary load selection fallback to `null` (no implicit first-doc selection).
- Removed default section auto-expansion behavior; tree now starts collapsed unless user expands nodes.
- Kept ancestor auto-expand only for explicit document selection.
- Updated reader panel to render no status content when there is no selected document, no loading, and no error.
- Updated `App` tests to assert initial collapsed sections + no selected document and to select docs explicitly in interaction flows.

## Prevention

- Keep default selection behavior explicit in product requirements; avoid implicit `first item` fallbacks.
- Cover initial tree/reader state with regression tests when changing sidebar structure or selection lifecycle.

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/docs-tree.ts`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
