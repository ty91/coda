---
title: "Lucide icon-only refresh control for docs sidebar"
date: 2026-02-19
tags: [tauri, ui, sidebar, lucide, accessibility]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-feat-lucide-sidebar-refresh-icon-plan.md"
---

## Problem

The sidebar refresh action used visible text (`Refresh list`, `Run/Busy`) that did not match the requested icon-only utility pattern.

## Root Cause

- No icon library dependency was installed in `@coda/app`.
- Sidebar utility controls were designed as text rows only.
- No regression test protected refresh-button accessibility semantics.

## Solution

- Added `lucide-react` to `@coda/app` and imported `RefreshCw` with static named import.
- Replaced the refresh text row in `apps/app/src/components/DocsSidebar.tsx` with an icon-only button in the sidebar header.
- Added `sidebarIconButtonClass` in `apps/app/src/ui-classes.ts` to centralize icon-button density and state styling.
- Preserved accessibility with explicit `aria-label`/`title` and decorative icon markup (`aria-hidden`).
- Preserved loading semantics with disabled state and spinning icon while reload is in progress.
- Added regression coverage in `apps/app/src/App.test.tsx` for refresh button discovery and reload invocation.

## Prevention

- For icon-only controls, require an explicit accessible name and keep the icon decorative.
- Keep icon-button sizing/tone in shared UI class constants instead of inline class strings.
- Add interaction tests when replacing visible text actions with icon-only controls.

## Related

- `docs/plans/completed/2026-02-19-feat-lucide-sidebar-refresh-icon-plan.md`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/ui-classes.ts`
- `apps/app/src/App.test.tsx`
