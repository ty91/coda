---
title: "Normalize DocsSidebar text to 13px font-normal"
date: 2026-02-19
tags: [tauri, app, ui, sidebar, typography, regression]
status: "active"
related_plan: "docs/plans/active/2026-02-19-fix-sidebar-text-13px-font-normal-plan.md"
---

## Problem

DocsSidebar typography used mixed size/weight tokens, so row labels and status copy rendered inconsistently instead of a single 13px `font-normal` baseline.

## Root Cause

Sidebar text styles were split across shared class tokens and component-level inline classes:

- `sidebarSectionHeaderClass` and `treeRowClass` used larger sizes with semi-bold/medium weight.
- `eyebrowClass` stayed on a smaller emphasized label style.
- `DocsSidebar` still had local overrides (`text-[0.84rem]`, `text-[0.92rem]`) that bypassed shared tokens.
- Regression tests covered spacing density but not typography contracts.

## Solution

- Updated sidebar typography tokens in `apps/app/src/ui-classes.ts`:
  - `sidebarSectionHeaderClass` -> `text-[0.8125rem] font-normal`
  - `treeRowClass` -> `text-[0.8125rem] font-normal`
  - `eyebrowClass` -> `text-[0.8125rem] font-normal`
  - Added `sidebarMessageTextClass` to keep DocsSidebar status text scoped at 13px without changing non-sidebar message text.
- Updated `apps/app/src/components/DocsSidebar.tsx` to consume sidebar-scoped message token and remove leftover inline size overrides.
- Added typography regression assertions in:
  - `apps/app/src/ui-classes.test.ts`
  - `apps/app/src/App.test.tsx`

## Prevention

- Keep DocsSidebar typography centralized in `ui-classes.ts`; avoid one-off text size classes in component markup.
- When typography requirements are explicit (`px` + weight), add test assertions for both values so visual regressions fail fast.
- Scope shared utility changes carefully to avoid accidental cross-panel style drift.

## Related

- `docs/plans/active/2026-02-19-fix-sidebar-text-13px-font-normal-plan.md`
- `apps/app/src/ui-classes.ts`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/ui-classes.test.ts`
- `apps/app/src/App.test.tsx`
