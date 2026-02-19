---
title: "Rebalance docs viewer typography around 13px body text"
date: 2026-02-19
tags: [tauri, ui, docs-viewer, typography]
status: "active"
---

## Problem

After setting markdown body text to 13px, the rest of the docs viewer typography remained too compressed and no longer matched the new baseline.

## Root Cause

The previous broad downscale reduced headings, metadata, and find overlay text proportionally from a smaller baseline, so those values were not recalibrated after restoring body readability.

## Solution

Rebalanced non-body typography to align with a 13px body baseline:

- `apps/app/src/ui-classes.ts`
  - markdown `h1/h2/h3` -> `17/15/14px`
  - code block and `pre code` -> `12px`
  - inline code -> `0.92em` (approximately 12px)
- `apps/app/src/components/DocViewerPanel.tsx`
  - document title -> `18px`
  - metadata value/path -> `12px`
  - metadata label -> `10px`
  - find input -> `12px`
  - find button and counter -> `11px`
  - find label -> `10px`

## Prevention

- When changing docs viewer body size, immediately recalculate heading, code, metadata, and overlay scales against explicit px targets.
- Keep markdown typography and panel typography centralized so one pass can retune the full viewer.

## Related

- `apps/app/src/ui-classes.ts`
- `apps/app/src/components/DocViewerPanel.tsx`
- `docs/solutions/2026-02-19-doc-viewer-body-font-13px-adjustment.md`
