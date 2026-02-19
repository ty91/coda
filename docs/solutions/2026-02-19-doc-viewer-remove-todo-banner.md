---
title: "Doc viewer remove temporary TODO banner"
date: 2026-02-19
tags: [tauri, app, docs-viewer, ui, cleanup, regression]
status: "active"
---

## Problem

The document viewer displayed a floating TODO banner (`TODO(M2): Add inline annotation...`) above real content, which was distracting during normal reading.

## Root Cause

A temporary implementation note was passed from `App.tsx` as runtime UI text and rendered in `DocViewerPanel.tsx` whenever a document was selected.

## Solution

- Removed the temporary TODO constant and prop wiring from `apps/app/src/App.tsx`.
- Removed banner prop and render block from `apps/app/src/components/DocViewerPanel.tsx`.
- Tightened panel status rendering to loading/error states only.
- Added regression assertion in `apps/app/src/App.test.tsx` to ensure the TODO banner does not appear after selecting a document.

## Prevention

- Keep internal roadmap/TODO notes in plans or solution docs, not end-user reader surfaces.
- If temporary UI placeholders are required, gate them behind explicit debug flags.

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
