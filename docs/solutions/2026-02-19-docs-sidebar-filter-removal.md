---
title: "Remove docs sidebar hidden/template filter UI and toggle flow"
date: 2026-02-19
tags: [tauri, ui, sidebar, docs-viewer, cleanup]
status: "active"
---

## Problem

The sidebar still rendered a hidden/template filter block. Product direction changed to remove this filter surface from the app.

## Root Cause

The hidden/template toggle was part of the original docs viewer scope and remained wired through sidebar props and app state.

## Solution

- Removed the filter block from `apps/app/src/components/DocsSidebar.tsx`.
- Removed hidden-filter state and toggle wiring from `apps/app/src/App.tsx`.
- Updated UI regression coverage in `apps/app/src/App.test.tsx` to assert the filter control is absent.
- Removed now-unused sidebar utility class exports in `apps/app/src/ui-classes.ts`.

## Prevention

- Treat sidebar controls as explicit product-scope items and keep a regression test for removed controls so they do not reappear accidentally.

## Related

- `docs/solutions/2026-02-18-comprehensive-docs-viewer.md`
- `docs/solutions/2026-02-19-codex-style-sidebar-restyle.md`
