---
title: "Remove mobile breakpoints from desktop-only app layout"
date: 2026-02-19
tags: [tauri, app, layout, desktop-only, cleanup]
status: "active"
---

## Problem

The app still contained `max-[980px]` responsive classes even though the product now runs in desktop-only mode.

## Root Cause

Earlier UI iterations kept mobile fallback classes in shell/sidebar/viewer components. Scope changed, but responsive modifiers remained.

## Solution

- Removed responsive breakpoint classes from `apps/app/src/App.tsx` shell and ask panel container.
- Removed responsive breakpoint classes from `apps/app/src/components/DocsSidebar.tsx`.
- Removed responsive breakpoint classes from `apps/app/src/components/DocViewerPanel.tsx`, including find overlay placement.

## Prevention

- When platform scope is desktop-only, avoid adding viewport-conditional utility classes unless a desktop resize requirement needs them.

## Related

- `docs/solutions/2026-02-19-codex-style-sidebar-restyle.md`
- `docs/solutions/2026-02-19-doc-viewer-auto-refresh-scroll-preserve.md`
