---
title: "Hide macOS title text with overlay title bar"
date: 2026-02-19
tags: [tauri, macos, titlebar, overlay, window]
status: "active"
---

## Problem

The app needed to keep native macOS controls, hide title text, and avoid the fully transparent title-bar look.

## Root Cause

The window used a transparent title style by default, which made the title area feel visually detached from app content.

## Solution

I updated `apps/app/src-tauri/tauri.conf.json` for the main window:

- `hiddenTitle: true` to hide the title text in the native title bar.
- `titleBarStyle: "Overlay"` to render title controls above app content.

I kept the React shell as a single layer and tuned layout instead of adding a separate top strip:

- `apps/app/src/App.tsx`: remove top padding on the shell container (`pt-0`) so surfaces can visually reach the title area.
- `apps/app/src/components/DocsSidebar.tsx`: add top-safe padding (`pt-11`) inside the sidebar container.
- `apps/app/src/components/DocViewerPanel.tsx`: add matching top-safe padding (`pt-11`) inside the reader panel.

This preserves native controls, hides title text, and avoids double-layer artifacts in the title region.

## Prevention

For macOS title-bar adjustments, start with native config (`hiddenTitle`, `titleBarStyle`) before adding extra app-layer overlays.

## Related

- `apps/app/src-tauri/tauri.conf.json`
- `apps/app/src/App.tsx`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
