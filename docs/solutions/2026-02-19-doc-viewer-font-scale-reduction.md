---
title: "Reduce docs viewer font scale by 20 percent"
date: 2026-02-19
tags: [tauri, ui, docs-viewer, typography]
status: "active"
---

## Problem

The docs viewer text scale felt too large across the reading surface, metadata card, and in-document find overlay.

## Root Cause

The previous typography tuning favored readability with larger sizes, but the resulting visual density exceeded the preferred compact reading scale for this workspace.

## Solution

Applied a 20 percent font-size reduction across docs viewer typography tokens:

- Updated markdown typography in `apps/app/src/ui-classes.ts`:
  - body `0.94rem` -> `0.75rem`
  - `h1` `1.5rem` -> `1.2rem`
  - `h2` `1.24rem` -> `0.99rem`
  - `h3` `1.02rem` -> `0.82rem`
  - code block and inline code sizes reduced proportionally
- Updated docs viewer-specific typography in `apps/app/src/components/DocViewerPanel.tsx`:
  - document title
  - metadata label/value/path code
  - find overlay label/input/buttons/counter

## Prevention

- Keep docs viewer typography centralized in `markdownContentClass` and a small set of `DocViewerPanel` classes so scale changes remain predictable.
- For future tuning, define and apply a single percent-based scaling target to avoid piecemeal adjustments.

## Related

- `apps/app/src/ui-classes.ts`
- `apps/app/src/components/DocViewerPanel.tsx`
