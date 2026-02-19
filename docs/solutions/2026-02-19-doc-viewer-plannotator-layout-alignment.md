---
title: "Doc viewer typography/layout alignment to Plannotator reading surface"
date: 2026-02-19
tags: [tauri, ui, docs-viewer, markdown, monochrome]
status: "active"
---

## Problem

The markdown reader panel in the Tauri app felt denser and less document-focused than the Plannotator viewer, so long-form reading comfort and visual rhythm were behind the reference experience.

## Root Cause

The viewer surface used a compact card layout and minimal markdown element-level typography tuning. It did not mirror Plannotator's centered reading column, larger content spacing, and heading/body scale hierarchy.

## Solution

Updated the docs viewer presentation while preserving monochrome black-and-white styling:

- Refined `apps/app/src/components/DocViewerPanel.tsx` to use a centered reading card (`max-w-[832px]`) with larger responsive padding, closer to Plannotator's document area geometry.
- Converted metadata chips into a compact metadata card block with clearer label/value alignment, matching document-reader semantics instead of dashboard chip density.
- Upgraded markdown typography tokens in `apps/app/src/ui-classes.ts`:
  - Heading scale and spacing hierarchy (`h1/h2/h3`).
  - Paragraph and list rhythm tuned for long-form reading.
  - Blockquote, table, code block, and inline code treatments aligned to a reader-first structure.
  - Link underline and divider styling kept grayscale to maintain monochrome direction.

## Prevention

- Keep markdown viewer style primitives centralized in `markdownContentClass` to avoid drift across components.
- When matching external prior art (Plannotator), port layout/typography behavior first, then adapt color tokens to local design constraints.
- Prefer read-surface usability metrics (line length, rhythm, heading hierarchy) over decorative surface variation for docs-focused screens.

## Related

- `apps/app/src/components/DocViewerPanel.tsx`
- `apps/app/src/ui-classes.ts`
