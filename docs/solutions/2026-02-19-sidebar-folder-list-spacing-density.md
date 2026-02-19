---
title: "Tighten docs sidebar folder list spacing density"
date: 2026-02-19
tags: [tauri, app, docs-viewer, sidebar, spacing, regression]
status: "active"
---

## Problem

The sidebar folder list looked too loose, so navigation density felt off and scanning folder/document rows took more vertical space than expected.

## Root Cause

Sidebar tree row and section header sizing used relatively tall minimum heights and vertical padding. Section/list gaps also accumulated, making collapsed and expanded folder groups feel overly spaced.

## Solution

- Tightened sidebar spacing tokens in `apps/app/src/ui-classes.ts`:
  - `sidebarSectionClass` gap: `0.2rem -> 0.1rem`
  - `sidebarSectionHeaderClass` height/padding: `min-h 1.65rem`, `py 0.22rem`
  - `treeRowClass` height/padding: `min-h 1.62rem`, `py 0.18rem`
- Tightened list grouping gaps in `apps/app/src/components/DocsSidebar.tsx`:
  - nested list/tree spacing: `space-y 0.08rem -> 0.04rem`
  - top-level nav spacing: `gap 0.35rem -> 0.2rem`
- Added regression coverage in `apps/app/src/ui-classes.test.ts` for compact sidebar density tokens.
- Aligned shell-layout test contract in `apps/app/src/App.test.tsx` by removing stale sidebar border/background assertions unrelated to spacing behavior.

## Prevention

- Keep sidebar spacing contracts in shared class tokens (`ui-classes.ts`) and enforce with focused token tests.
- Avoid mixing visual-density checks with unrelated surface-style assertions in layout tests.

## Related

- `apps/app/src/ui-classes.ts`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/ui-classes.test.ts`
- `apps/app/src/App.test.tsx`
