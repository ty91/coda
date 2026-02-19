---
title: "Codex-style sidebar restyle for docs tree navigation"
date: 2026-02-19
tags: [tauri, ui, sidebar, styling, docs-viewer]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-feat-sidebar-codex-look-and-feel-plan.md"
---

## Problem

The docs sidebar still looked like a bordered card list, not like the compact, soft-gray thread rail style in the user-provided Codex reference.

## Root Cause

- Sidebar surface and row states were tuned for high-contrast card sections.
- Tree rows used strong borders/dividers and black inverse selection, which diverged from the reference's softer selected-row treatment.
- Shell framing and background contrast made the sidebar read as a floating panel instead of a left rail.

## Solution

- Added sidebar-specific visual tokens in `apps/app/src/styles.css` for rail, row hover/active, line, and muted label colors.
- Introduced shared sidebar primitives in `apps/app/src/ui-classes.ts`:
  - `sidebarUtilityGroupClass`
  - `sidebarUtilityButtonClass`
  - `sidebarSectionClass`
  - `sidebarSectionHeaderClass`
  - updated `sidebarSurfaceClass` and `treeRowClass`
- Refactored `apps/app/src/components/DocsSidebar.tsx` to:
  - use a compact utility block (refresh + hidden toggle)
  - switch tree rows to denser rounded list rows
  - move selected-row emphasis from black inverse to subtle filled state
  - replace heavy section cards/dividers with spacing-first grouping
- Rebalanced shell framing in `apps/app/src/App.tsx` and softened global background in `apps/app/src/styles.css` so the sidebar reads as a cohesive rail.
- Preserved existing docs-tree behavior and test contracts; added explicit checkbox `aria-label` to keep the hidden-toggle interaction reliably queryable.

## Prevention

- Keep sidebar look-and-feel knobs centralized in `ui-classes.ts` + theme tokens; avoid scattering per-component hex values.
- For screenshot-matching restyles, define a concrete visual checklist first (density, selection, grouping, tone) before changing markup.
- Preserve behavior-first tests while restyling; if an accessibility query breaks, fix semantics (`aria-label`, roles, labels) rather than weakening tests.

## Related

- `docs/plans/completed/2026-02-19-feat-sidebar-codex-look-and-feel-plan.md`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/ui-classes.ts`
- `apps/app/src/styles.css`
- `apps/app/src/App.tsx`
- `apps/app/src/App.test.tsx`
