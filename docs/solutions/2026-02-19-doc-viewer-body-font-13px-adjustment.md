---
title: "Adjust docs viewer markdown body font size to 13px"
date: 2026-02-19
tags: [tauri, ui, docs-viewer, typography]
status: "active"
---

## Problem

The 14px markdown body baseline still felt larger than desired for current docs viewer density.

## Root Cause

Body baseline was set to `0.875rem` (14px at 16px root), but the preferred target is `13px`.

## Solution

- Updated docs viewer markdown body baseline in `apps/app/src/ui-classes.ts`:
  - `text-[0.875rem]` -> `text-[0.8125rem]` (13px at 16px root)
- Kept all other typography tokens unchanged.

## Prevention

- Confirm target in px first, then convert to `rem` once for implementation.
- Limit typography tweak scope to requested target area unless explicitly expanded.

## Related

- `apps/app/src/ui-classes.ts`
- `docs/solutions/2026-02-19-doc-viewer-body-font-14px-adjustment.md`
