---
title: "Adopt Tailwind CSS for Tauri React UI"
date: 2026-02-18
status: completed
tags: [tauri, ui, tailwindcss, styling, milestone-1]
milestone: M1
---

## Goal

Adopt Tailwind CSS in `@coda/app` so UI styling is utility-first, consistent with architecture intent, and preserves current docs-viewer behavior and visual quality.

## Context

- Architecture already specifies Tailwind CSS for frontend styling (`docs/design-docs/architecture-overview.md:202`), but implementation still uses a large hand-authored stylesheet imported at app entry (`apps/app/src/main.tsx:5`, `apps/app/src/styles.css:1`).
- Core UI surfaces currently depend on custom selector classes across shell/sidebar/viewer components (`apps/app/src/App.tsx:187`, `apps/app/src/components/DocsSidebar.tsx:134`, `apps/app/src/components/DocViewerPanel.tsx:35`).
- Vite config currently registers only React plugin, so Tailwind build integration is missing (`apps/app/vite.config.ts:5`).
- Prior art: recent monochrome docs-tree refactor is stable and should be preserved while changing styling mechanics (`docs/solutions/2026-02-18-tauri-ui-monochrome-docs-sidebar.md:19`).
- External research decision: run external research due Tailwind major-version setup changes. Official Tailwind v4 docs now recommend Vite plugin integration with `@tailwindcss/vite` and CSS import via `@import "tailwindcss"`:
  - https://tailwindcss.com/docs/installation/using-vite
  - https://tailwindcss.com/blog/tailwindcss-v4

## Approach

1. **Define migration scope and non-goals**
   - [x] Action: Confirm migration scope is `apps/app` only (no CLI/core package styling impact) and preserve current docs-viewer interactions/content behavior.
   - [x] Deliverables: Explicit affected-file list and non-goals recorded in progress log before implementation starts.
   - [x] Exit criteria: Scope is bounded and reviewable; no ambiguous ownership across packages.
2. **Integrate Tailwind v4 toolchain in app build**
   - [x] Action: Add Tailwind dependencies for Vite flow and register Tailwind Vite plugin in `apps/app/vite.config.ts`.
   - [x] Action: Replace stylesheet entry pattern to load Tailwind via `@import "tailwindcss"` and keep only minimal custom CSS where needed.
   - [x] Deliverables: Updated `apps/app/package.json`, `apps/app/vite.config.ts`, and app CSS entry file(s) aligned with Tailwind docs.
   - [x] Exit criteria: App dev/build pipelines resolve Tailwind classes without PostCSS-specific fallback workarounds.
3. **Map current design tokens to Tailwind strategy**
   - [x] Action: Translate existing visual primitives (color/radius/shadow/spacing/typography) from `styles.css` into Tailwind-compatible tokens/config patterns.
   - [x] Action: Define class composition conventions for recurring UI patterns (panel surface, header blocks, tree states) to keep readability high.
   - [x] Deliverables: Documented token/convention decisions in plan progress, plus minimal shared style layer for truly global concerns only.
   - [x] Exit criteria: New styling changes primarily occur in TSX class strings, not expanding global CSS.
4. **Migrate UI components from selector CSS to utility classes**
   - [x] Action: Update `App.tsx`, `DocsSidebar.tsx`, and `DocViewerPanel.tsx` markup classes to Tailwind utilities while preserving current layout and responsive behavior.
   - [x] Action: Remove obsolete class selectors and reduce or split leftover CSS to small, focused files.
   - [x] Deliverables: Component-level Tailwind class usage with no dead selector layer tied to removed class names.
   - [x] Exit criteria: UI renders with expected hierarchy (shell/sidebar/tree/viewer), states (hover/active/loading/error), and mobile layout parity.
5. **Protect behavior with tests and full validation gate**
   - [x] Action: Keep existing docs-viewer behavior tests passing; add or adjust regression tests only where styling migration changes interaction semantics.
   - [x] Action: Run full project gate and app packaging checks.
   - [x] Deliverables: Green validation evidence covering lint/typecheck/tests/build and Tauri app packaging.
   - [x] Exit criteria: No behavioral regressions in automated checks; required validation commands pass, with manual smoke pending due local port conflict.
6. **Complete compound step documentation**
   - [x] Action: Write a solution entry capturing Tailwind adoption decisions, migration pitfalls, and prevention patterns for future UI work.
   - [x] Action: Update design docs only if migration changes reusable architecture decisions beyond existing Tailwind direction.
   - [x] Deliverables: New `docs/solutions/` entry with tags for styling/toolchain discoverability.
   - [x] Exit criteria: Compound artifacts complete and linked from progress log.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app tauri build`
- Manual smoke in Tauri app (`pnpm app:dev`): docs tree navigation, hidden/template toggle, selected-doc rendering, responsive layout at narrow viewport.

## Progress Log

- 2026-02-18: Plan drafted for Tailwind CSS adoption in `@coda/app` with Tailwind v4 + Vite integration path and full validation requirements.
- 2026-02-18: Scope locked to `apps/app` only. Affected files target: `apps/app/package.json`, `apps/app/vite.config.ts`, `apps/app/src/styles.css`, `apps/app/src/App.tsx`, `apps/app/src/components/DocsSidebar.tsx`, `apps/app/src/components/DocViewerPanel.tsx`, and styling-adjacent test updates if needed. Non-goals: no Rust/backend IPC changes, no CLI/core package changes, no docs-viewer behavior changes.
- 2026-02-18: Integrated Tailwind v4 toolchain in `@coda/app` (`tailwindcss`, `@tailwindcss/vite`, Vite plugin registration, CSS `@import "tailwindcss"` entry). Verified with `pnpm --filter @coda/app build`.
- 2026-02-18: Mapped legacy style tokens into Tailwind v4 `@theme` tokens in `apps/app/src/styles.css` (color/radius/shadow/typography), keeping global CSS limited to base/background/keyframes only.
- 2026-02-18: Added reusable class-composition conventions in `apps/app/src/ui-classes.ts` (panel surface, headers, buttons, tree rows, markdown content) and migrated `App.tsx`, `DocsSidebar.tsx`, and `DocViewerPanel.tsx` to utility classes.
- 2026-02-18: Verified migration unit with `pnpm --filter @coda/app test` and `pnpm --filter @coda/app build`.
- 2026-02-18: Full gate passed: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm validate`, `pnpm --filter @coda/app tauri build`.
- 2026-02-18: `pnpm --filter @coda/app tauri dev` startup smoke currently blocked by environment port conflict: `Error: Port 1420 is already in use`. Full in-window manual interaction remains pending user confirmation.
- 2026-02-18: Compound step recorded in `docs/solutions/2026-02-18-tailwindcss-tauri-ui-adoption.md`. No architecture document update required beyond existing Tailwind direction.
- 2026-02-19: Plan closure approved by user; moved to `docs/plans/completed/` with completion status. Manual Tauri in-window smoke remains deferred until local port conflict resolution.
