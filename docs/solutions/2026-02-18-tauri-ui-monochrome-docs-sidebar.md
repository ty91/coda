---
title: "Monochrome docs-tree sidebar refactor for Tauri docs viewer"
date: 2026-02-18
tags: [tauri, ui, docs-viewer, sidebar-tree, monochrome]
status: "active"
related_plan: "docs/plans/active/2026-02-18-feat-tauri-ui-modern-docs-sidebar-plan.md"
---

## Problem

The docs viewer UI looked like scaffold/demo output and used a flat document `<select>`, which made navigation across nested docs paths feel noisy and non-structural.

## Root Cause

The frontend rendered summaries as a single dropdown instead of a hierarchical model. Styling was inherited from an early colorful scaffold and lacked a cohesive visual token system.

## Solution

Implemented a focused UI refactor while preserving backend command boundaries:

- Added a tree model builder in `apps/app/src/docs-tree.ts` to convert `DocSummary[]` into section/folder/file nodes with stable keys.
- Refactored `apps/app/src/App.tsx` to keep data-fetch lifecycle unchanged while adding expansion-state control and auto-expansion for selected doc ancestors.
- Split presentation into dedicated components:
  - `apps/app/src/components/DocsSidebar.tsx`
  - `apps/app/src/components/DocViewerPanel.tsx`
- Replaced the previous colorful style layer with a monochrome design system in `apps/app/src/styles.css` (tokenized grays, responsive split layout, subtle motion, clearer hierarchy).
- Reworked frontend regression tests in `apps/app/src/App.test.tsx` for tree navigation, nested folder expansion, and hidden/template toggle behavior.

## Prevention

- Keep navigation transformation logic in a single utility (`docs-tree.ts`) so tree behavior is testable and does not leak into rendering components.
- Preserve data-loading hooks while refactoring visual structure; constrain risk to rendering and interaction layers.
- Keep test coverage aligned with user interaction model (tree + expand/collapse), not implementation details like dropdowns.

## Related

- `docs/plans/active/2026-02-18-feat-tauri-ui-modern-docs-sidebar-plan.md`
- `apps/app/src/App.tsx`
- `apps/app/src/docs-tree.ts`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/App.test.tsx`
