---
title: "Set Tauri default window size to 1280x820"
date: 2026-02-19
tags: [tauri, window, sizing, defaults]
status: "active"
---

## Problem

The app launched with a default window size of `800x600`, which was smaller than the target working size for the current desktop workflow.

## Root Cause

- The base window configuration in `apps/app/src-tauri/tauri.conf.json` still used scaffold defaults (`width: 800`, `height: 600`).

## Solution

- Updated the Tauri main window defaults in `apps/app/src-tauri/tauri.conf.json`:
  - `width: 1280`
  - `height: 820`

## Prevention

- When desktop layout preferences are decided, update `tauri.conf.json` in the same change to avoid drifting from runtime expectations.
- Keep window defaults explicit in one place (`windows[0]`) and avoid duplicating sizing constants elsewhere.

## Related

- `apps/app/src-tauri/tauri.conf.json`
