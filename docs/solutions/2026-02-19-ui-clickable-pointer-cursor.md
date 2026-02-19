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

- Centralized cursor policy in `apps/app/src/styles.css` with a base-layer interactive selector:
  - `button`, button-like roles, links, radio/checkbox/button inputs, and labels now default to pointer when enabled.
- Removed duplicated per-component cursor classes from:
  - `apps/app/src/ui-classes.ts`
  - `apps/app/src/components/AskInboxPanel.tsx`
  - `apps/app/src/components/DocViewerPanel.tsx`
- Replaced class-level cursor regression checks with stylesheet contract coverage in `apps/app/src/styles.test.ts`.

## Prevention

- Treat cursor affordance as part of interactive control contracts, not as optional visual polish.
- Keep default interactive cursor behavior centralized in base styles, and use component classes only for explicit exceptions.
- Add or update stylesheet-level contract tests when global interaction selectors change.

## Related

- `apps/app/src/styles.css`
- `apps/app/src/styles.test.ts`
- `apps/app/src/ui-classes.ts`
- `apps/app/src/components/AskInboxPanel.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
