---
title: "Tailwind CSS adoption for Tauri docs viewer UI"
date: 2026-02-18
tags: [tailwindcss, tauri, ui, styling, milestone-1]
status: "active"
related_plan: "docs/plans/completed/2026-02-18-feat-tailwindcss-ui-adoption-plan.md"
---

## Problem

The app frontend styling did not match architecture intent. UI used a large selector-based stylesheet and no Tailwind build integration.

## Root Cause

- Tailwind was specified in architecture but not implemented in `@coda/app`.
- Visual primitives and component styles were coupled to custom CSS class selectors.

## Solution

- Added Tailwind v4 toolchain in app package:
  - `tailwindcss`
  - `@tailwindcss/vite`
- Registered Tailwind plugin in `apps/app/vite.config.ts`.
- Converted CSS entrypoint to Tailwind import (`@import "tailwindcss"`).
- Replaced large selector stylesheet with minimal global layer + theme tokens in `apps/app/src/styles.css`:
  - color/radius/shadow/typography tokens via `@theme`
  - global base/background/keyframes only
- Added reusable utility composition constants in `apps/app/src/ui-classes.ts`.
- Migrated primary UI components to Tailwind utility classes:
  - `apps/app/src/App.tsx`
  - `apps/app/src/components/DocsSidebar.tsx`
  - `apps/app/src/components/DocViewerPanel.tsx`

## Prevention

- Keep global CSS limited to app-wide primitives (theme/base/background/animation).
- Keep component styling in TSX utility classes; avoid rebuilding selector-heavy style layers.
- Use shared class constants for repeated patterns (panel/header/button/tree/markdown) to reduce style drift.

## Related

- `docs/plans/completed/2026-02-18-feat-tailwindcss-ui-adoption-plan.md`
- `apps/app/src/styles.css`
- `apps/app/src/ui-classes.ts`
- `apps/app/src/App.tsx`
- `apps/app/src/components/DocsSidebar.tsx`
- `apps/app/src/components/DocViewerPanel.tsx`
