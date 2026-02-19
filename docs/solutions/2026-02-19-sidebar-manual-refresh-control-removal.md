---
title: "Remove manual refresh control from docs sidebar"
date: 2026-02-19
tags: [tauri, ui, sidebar, auto-refresh, cleanup]
status: "active"
---

## Problem

The docs sidebar still exposed a manual refresh button even though docs now auto-refresh on file changes.

## Root Cause

The refresh action remained from the older manual-reload flow and stayed wired through sidebar props/tests after auto-refresh shipped.

## Solution

- Removed the refresh icon button from `apps/app/src/components/DocsSidebar.tsx`.
- Removed now-unused `onRefresh` sidebar prop wiring from `apps/app/src/App.tsx`.
- Removed unused sidebar icon-button class export from `apps/app/src/ui-classes.ts`.
- Updated regression tests in `apps/app/src/App.test.tsx` to assert the refresh control is absent.

## Prevention

- When a background auto-refresh path becomes default UX, remove matching manual controls and keep an explicit absence test.

## Related

- `docs/solutions/2026-02-19-docs-viewer-auto-refresh-scroll-preserve.md`
- `docs/solutions/2026-02-19-lucide-icon-only-sidebar-refresh.md`
