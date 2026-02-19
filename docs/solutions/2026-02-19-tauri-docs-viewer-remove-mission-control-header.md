---
title: "Remove right-pane Mission Control header block from docs viewer"
date: 2026-02-19
tags: [tauri, ui, docs-viewer, cleanup]
status: "active"
---

## Problem

The right content pane showed a top dashboard-like block ("Coda Mission Control" + bridge status) that competed with document reading focus.

## Root Cause

The app root layout (`apps/app/src/App.tsx`) combined two concerns in the same pane:

- Document reading surface.
- App status/header controls.

This made the reader area start below an unrelated control block.

## Solution

- Removed the entire right-pane top header block from `apps/app/src/App.tsx`.
- Removed now-unused health-check UI state and command wiring (`get_health_message`) from the same component.
- Added a regression assertion in `apps/app/src/App.test.tsx` to ensure the "Coda Mission Control" heading is not rendered in the React UI.

## Prevention

- Keep `App.tsx` focused on navigation + selected document rendering.
- Place global/window status affordances outside the document reading pane when they are not directly tied to reading tasks.

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/App.test.tsx`
- `apps/app/src-tauri/tauri.conf.json`
