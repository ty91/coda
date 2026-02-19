---
title: "UI clickable controls pointer cursor consistency"
date: 2026-02-19
tags: [tauri, app, ui, cursor, affordance, regression]
status: "active"
---

## Problem

Several clickable controls in the Tauri app rendered with the default arrow cursor, so hover affordance was inconsistent across sidebar rows, find overlay actions, and ask queue actions.

## Root Cause

Pointer cursor styling was applied inconsistently. Some shared button classes had `cursor-pointer`, but other shared clickable primitives and component-local controls did not.

## Solution

- Added `cursor-pointer` to shared clickable sidebar class tokens in `apps/app/src/ui-classes.ts` (`sidebarIconButtonClass`, `sidebarSectionHeaderClass`, `treeRowClass`).
- Added explicit pointer cursor classes for ask queue clickable elements in `apps/app/src/components/AskInboxPanel.tsx` (radio labels/inputs and submit/cancel buttons).
- Added explicit pointer cursor classes for find overlay action buttons in `apps/app/src/components/DocViewerPanel.tsx`.
- Added regression assertions in:
  - `apps/app/src/ui-classes.test.ts`
  - `apps/app/src/components/AskInboxPanel.test.tsx`
  - `apps/app/src/App.test.tsx`

## Prevention

- Treat cursor affordance as part of interactive control contracts, not as optional visual polish.
- Keep shared clickable primitives in `ui-classes.ts` as the default source for cursor behavior.
- Add test assertions when clickable class contracts are introduced or changed.

## Related

- `apps/app/src/ui-classes.ts`
- `apps/app/src/components/AskInboxPanel.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/ui-classes.test.ts`
- `apps/app/src/components/AskInboxPanel.test.tsx`
- `apps/app/src/App.test.tsx`
