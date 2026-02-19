---
title: "Set Tauri window minimum size to 640x640"
date: 2026-02-19
tags: [tauri, window, desktop-only, ux]
status: "active"
---

## Problem

The app window could be resized too small, causing cramped sidebar/viewer layout.

## Root Cause

The Tauri window config defined initial width/height but had no minimum size constraints.

## Solution

- Added `minWidth: 640` and `minHeight: 640` in `apps/app/src-tauri/tauri.conf.json`.

## Prevention

- Define minimum window bounds in Tauri config whenever desktop layouts have fixed-density UI regions.

## Related

- `docs/solutions/2026-02-19-desktop-only-layout-breakpoint-removal.md`
