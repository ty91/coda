---
title: "macOS HUD vibrancy sidebar with switchable material adapter"
date: 2026-02-19
tags: [tauri, macos, ui, vibrancy, sidebar, hudwindow]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-feat-tauri-macos-hudwindow-sidebar-glass-plan.md"
---

## Problem

The docs sidebar looked translucent via CSS, but it did not use native macOS vibrancy. Material choice (`hudWindow` vs `sidebar`) was not abstracted, so future switching risked touching multiple UI files.

## Root Cause

- Tauri window config did not enable transparency or macOS private API requirements.
- No dedicated window-effects adapter existed in frontend bootstrap.
- Sidebar visual treatment relied only on CSS blur and alpha fills.

## Solution

- Enabled macOS vibrancy prerequisites in `apps/app/src-tauri/tauri.conf.json`:
  - `app.macOSPrivateApi: true`
  - `windows[0].transparent: true`
- Added `apps/app/src/window-effects.ts`:
  - `MacOsWindowMaterial` contract: `hudWindow | sidebar`
  - single default selector: `DEFAULT_MACOS_WINDOW_MATERIAL = 'hudWindow'`
  - runtime adapter to apply resolved effects via `getCurrentWindow().setEffects(...)`
  - single source of material/effect values (no duplicate effect in Tauri config)
- Hooked adapter in one bootstrap call site: `apps/app/src/main.tsx`.
- Tuned visual layering:
  - Added `sidebarSurfaceClass` in `apps/app/src/ui-classes.ts`
  - Applied sidebar-specific glass surface in `apps/app/src/components/DocsSidebar.tsx`
  - Made root background transparent in `apps/app/src/styles.css` so native vibrancy can be visible.
- Added regression tests in `apps/app/src/window-effects.test.ts` for:
  - default material resolution
  - `sidebar` resolution
  - runtime guard behavior
  - adapter invocation boundary

## Prevention

- Keep effect material selection in one module constant; do not hardcode effect strings in components.
- Keep window-effect runtime wiring in bootstrap only; avoid spreading Tauri window API usage across feature UI.
- When enabling macOS transparency, always pair config changes (`macOSPrivateApi`, `transparent`, `windowEffects`) with startup smoke (`tauri dev`) and packaging validation (`tauri build`).

## Related

- `docs/plans/completed/2026-02-19-feat-tauri-macos-hudwindow-sidebar-glass-plan.md`
- `apps/app/src-tauri/tauri.conf.json`
- `apps/app/src/window-effects.ts`
- `apps/app/src/window-effects.test.ts`
- `apps/app/src/main.tsx`
- `apps/app/src/ui-classes.ts`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/styles.css`
