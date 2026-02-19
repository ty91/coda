---
title: "Docs viewer auto-refresh with in-place scroll preservation"
date: 2026-02-19
tags: [tauri, docs-viewer, file-watch, auto-refresh, ux]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-feat-docs-viewer-auto-refresh-plan.md"
---

## Problem

The docs viewer needed automatic refresh when files under `docs/` changed, but the first refresh behavior reset the reading position to the top.

## Root Cause

- The app re-fetched the selected document through the same loading path used for initial selection.
- That path toggled `documentLoading`, which unmounted/remounted reader content and reset scroll position.
- No regression test protected "keep current document visible during auto-refresh fetch" behavior.

## Solution

- Added Rust-side docs watcher (`notify`) to emit `docs_changed` events for markdown changes under `docs/`.
- Added frontend `docs_changed` subscription and queued reload flow in `apps/app/src/App.tsx`.
- Split selected-document fetch behavior into two modes:
  - Normal load (`preserveView: false`): show loading state.
  - Auto-refresh load (`preserveView: true`): keep current reader content mounted while fetching updated markdown.
- Kept selection safety checks: clear selection on confirmed removal, reload only when selected doc appears in changed IDs.
- Added regression coverage to verify the reader stays visible while auto-refresh fetch is in flight.

## Prevention

- For background refresh flows, avoid sharing the same loading state path as first-load UX unless remount/scroll reset is acceptable.
- Encode "background refresh should not clear current content" as a test expectation.
- Keep watcher events coalesced and payload-driven so refresh logic remains deterministic.

## Related

- `docs/plans/completed/2026-02-19-feat-docs-viewer-auto-refresh-plan.md`
- `apps/app/src-tauri/src/docs_watcher.rs`
- `apps/app/src/App.tsx`
- `apps/app/src/App.test.tsx`
