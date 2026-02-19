---
title: "Sidebar selected document uses hover background without inset border"
date: 2026-02-19
tags: [tauri, app, sidebar, ui, selection, regression]
status: "active"
---

## Problem

The selected document row in the docs sidebar used an inset border/shadow style that looked visually heavier than hover state.

## Root Cause

Active-state class in `DocsSidebar` used `row-active` token plus inset shadow instead of reusing the row-hover background.

## Solution

- Updated selected document button class in `apps/app/src/components/DocsSidebar.tsx` to use the same background token as hover (`--color-coda-sidebar-row-hover`).
- Applied Tailwind important utility (`!bg-...`) so active background reliably overrides shared `treeRowClass` base `bg-transparent`.
- Removed inset border/shadow from selected doc style.
- Added regression assertion in `apps/app/src/App.test.tsx` to ensure selected row keeps hover background and does not include inset shadow class.

## Prevention

- Keep sidebar selection emphasis subtle and aligned with existing hover token unless a stronger affordance is explicitly requested.
- Preserve selection styling contracts in app-level sidebar interaction tests.

## Related

- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/App.test.tsx`
