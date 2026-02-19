---
title: "Use Lucide folder icons for sidebar expand state"
date: 2026-02-19
tags: [tauri, ui, sidebar, lucide, tree]
status: "active"
---

## Problem

The docs sidebar tree used plain text markers (`v`, `>`) for expanded and collapsed folder state.

## Root Cause

- The tree row rendering logic in `DocsSidebar` still used legacy text glyphs.
- Icon adoption previously focused on the refresh control, not tree disclosure affordance.

## Solution

- Replaced folder and section toggle markers with Lucide `FolderOpen` and `Folder` icons.
- Kept icon rendering decorative (`aria-hidden`) and preserved existing `aria-expanded` behavior on toggle buttons.
- Applied the same icon treatment to both nested folder rows and top-level section headers for consistency.

## Prevention

- When introducing iconography, apply it consistently to equivalent controls in the same component.
- Keep state semantics on the button itself (`aria-expanded`) and avoid relying on icon-only meaning.

## Related

- `apps/app/src/components/DocsSidebar.tsx`
- `docs/solutions/2026-02-19-lucide-icon-only-sidebar-refresh.md`
