---
title: "Adjust docs viewer markdown body font size to 14px"
date: 2026-02-19
tags: [tauri, ui, docs-viewer, typography]
status: "active"
---

## Problem

After a broader typography downscale, markdown body text in the docs viewer became too small for comfortable reading.

## Root Cause

The previous change reduced the body baseline to `0.75rem` (12px at 16px root), which overshot the preferred readability target.

## Solution

- Updated markdown body baseline in `apps/app/src/ui-classes.ts`:
  - `text-[0.75rem]` -> `text-[0.875rem]` (14px at 16px root)
- Kept all other docs viewer typography values unchanged for this pass.

## Prevention

- Confirm body baseline in px-equivalent terms before applying global percentage reductions.
- Tune heading/code/meta sizes only after body readability baseline is accepted.

## Related

- `apps/app/src/ui-classes.ts`
- `docs/solutions/2026-02-19-doc-viewer-font-scale-reduction.md`
