---
title: "Fix docs app shell to fixed 100vh with internal pane scrolling"
date: 2026-02-19
tags: [tauri, app, layout, docs-viewer, scrolling, regression]
status: "active"
---

## Problem

The Tauri docs app shell could still behave like a document-height layout instead of a fixed viewport shell. This made it harder to layer a fixed header above the content area.

## Root Cause

The root shell used `min-h-screen`, which allows growth beyond the viewport when descendants expand. The sidebar also relied on `max-h-[100vh]` + sticky behavior instead of explicit full-height pane constraints.

## Solution

- Updated `apps/app/src/App.tsx`:
  - Switched shell height from `min-h-screen` to `h-screen`.
  - Added `overflow-hidden` on the shell to keep scrolling inside panes.
- Updated `apps/app/src/components/DocsSidebar.tsx`:
  - Replaced sticky/max-height sizing with `h-full min-h-0 overflow-y-auto` for explicit internal scrolling.
- Added regression coverage in `apps/app/src/App.test.tsx`:
  - Verifies shell uses fixed viewport height (`h-screen`) and hidden outer overflow.
  - Verifies sidebar/viewer containers keep internal scroll classes.

## Prevention

- For fixed-header desktop shells, define viewport height at the shell (`h-screen`) and keep overflow local to panes.
- Prefer `h-full min-h-0 overflow-y-auto` on pane containers over sticky+max-height combinations when internal scrolling is required.

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/App.test.tsx`
