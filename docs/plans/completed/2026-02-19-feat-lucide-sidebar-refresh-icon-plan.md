---
title: "Introduce Lucide icons and replace sidebar refresh text action with an icon control"
date: 2026-02-19
status: completed
tags: [tauri, ui, sidebar, icons, lucide, milestone-1]
milestone: M1
---

## Goal

Adopt `lucide-react` for the app UI and replace the sidebar "Refresh list" text utility action with an icon-only refresh control (visible text minimized), without changing existing docs loading behavior.

## Context

- The refresh action in the docs sidebar is currently text-heavy (`Refresh list` + `Run/Busy`) and not icon-based (`apps/app/src/components/DocsSidebar.tsx:163`).
- Product direction is now explicit: refresh control should be icon-only, with minimal visible text.
- Sidebar utility styling is centralized in shared class constants, so icon-button shape and spacing should be adjusted in one place (`apps/app/src/ui-classes.ts:7`).
- The app does not currently include an icon component library dependency in the frontend package (`apps/app/package.json:1`).
- Existing app tests cover docs loading, tree navigation, and hidden/template toggling, but do not explicitly protect refresh-control accessibility semantics (`apps/app/src/App.test.tsx:165`).
- External references (official):
  - Lucide React package guide confirms tree-shakable named component imports and `pnpm add lucide-react`: https://lucide.dev/guide/packages/lucide-react
  - Lucide accessibility guide documents icon/button labeling guidance for icon buttons: https://lucide.dev/guide/advanced/accessibility
  - MDN button accessibility guidance for icon-only buttons: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button

## Prior Art

- `docs/solutions/2026-02-19-codex-style-sidebar-restyle.md`
- `docs/plans/completed/2026-02-19-feat-sidebar-codex-look-and-feel-plan.md`
- `docs/plans/active/2026-02-19-feat-tauri-macos-hudwindow-sidebar-glass-plan.md`

## Approach

1. **Lock icon adoption scope and UX contract**
   - [x] Action: Confirm this change is limited to the app UI layer and lock an icon-only refresh contract (no visible label text; explicit accessible name via ARIA).
   - [x] Action: Select the Lucide refresh icon/state mapping (idle/loading/disabled) for the sidebar utility row with minimal in-row text.
   - [x] Deliverables: A clear refresh icon contract recorded in this plan's progress log.
   - [x] Exit criteria: One icon choice, icon-only presentation rule, and loading-state behavior are fixed before implementation starts.
2. **Add Lucide dependency with safe import conventions**
   - [x] Action: Add `lucide-react` to `@coda/app` using `pnpm`, and use named static imports only (no wildcard or dynamic icon loading for this scope).
   - [x] Deliverables: Updated dependency manifests/lockfile and a compile-ready icon import path.
   - [x] Exit criteria: The app builds with Lucide installed and only imported icons included in bundle output.
3. **Refactor sidebar refresh control to icon-first UI**
   - [x] Action: Replace the current refresh text pair in `DocsSidebar` with an icon-only button that still calls `onRefresh` and respects `listLoading` disabled state.
   - [x] Action: Preserve accessibility by giving the button an explicit accessible name and keeping icon markup decorative when inside the button label container.
   - [x] Deliverables: Updated `apps/app/src/components/DocsSidebar.tsx` and any needed utility class updates in `apps/app/src/ui-classes.ts`.
   - [x] Exit criteria: Keyboard and pointer users can trigger refresh; loading state remains clear with minimal visible text.
4. **Add regression coverage for icon-based refresh interaction**
   - [x] Action: Extend frontend tests to assert the refresh control is discoverable by accessible name and triggers a list reload when activated.
   - [x] Action: Add/adjust assertions for loading-disabled behavior if interaction timing can cause duplicate reload attempts.
   - [x] Deliverables: Updated tests in `apps/app/src/App.test.tsx` (or a focused sidebar test file if readability boundaries are exceeded).
   - [x] Exit criteria: Tests fail if refresh callback wiring or icon-button accessibility semantics regress.
5. **Run quality gates and manual smoke checks**
   - [x] Action: Run full repository gate plus app-level manual smoke in Tauri dev mode.
   - [x] Deliverables: Passing validation commands and manual confirmation that sidebar utility row remains visually balanced on desktop/mobile widths.
   - [x] Exit criteria: All gates pass and manual refresh interaction works without visual or accessibility regressions.
6. **Complete compound documentation**
   - [x] Action: Record the solved icon-in-sidebar pattern and prevention notes in `docs/solutions/`, including accessibility guardrails for future icon buttons.
   - [x] Deliverables: New solution note linked to this plan.
   - [x] Exit criteria: Compound step is complete and reusable guidance is documented.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app tauri dev` (manual sidebar refresh smoke on desktop/mobile breakpoints)

## Risks

- Icon-only discoverability risk if label semantics are weak.
  - Mitigation: Require explicit accessible naming and confirm keyboard/screen-reader discoverability in tests.
- Visual balance risk in the compact utility group if icon sizing does not match existing density.
  - Mitigation: Keep sizing tokens centralized in `ui-classes.ts` and verify desktop/mobile render during smoke checks.
- Scope creep risk from broad icon-library rollout beyond this targeted refresh control.
  - Mitigation: Keep this plan scoped to dependency introduction + sidebar refresh action only.

## Progress Log

- 2026-02-19: Planning target confirmed as "introduce Lucide icons and replace sidebar refresh function with an icon control."
- 2026-02-19: Checked active plans; no existing active plan was found for Lucide icon adoption or refresh-icon replacement in the sidebar.
- 2026-02-19: Reviewed local context in `apps/app/src/components/DocsSidebar.tsx`, `apps/app/src/ui-classes.ts`, `apps/app/src/App.tsx`, `apps/app/src/App.test.tsx`, and `apps/app/package.json`.
- 2026-02-19: External research performed (official Lucide + MDN) to lock installation, tree-shaking, and icon-button accessibility guidance before drafting this plan.
- 2026-02-19: UX direction updated by user to icon-only refresh control with minimized visible text; plan scope and approach updated accordingly.
- 2026-02-19: Added `lucide-react` to `@coda/app` and implemented static named icon import (`RefreshCw`) in the sidebar component.
- 2026-02-19: Replaced text-based refresh utility row with an icon-only refresh button in the sidebar header; loading now uses disabled state + spinning refresh icon and explicit ARIA label/title.
- 2026-02-19: Added refresh regression coverage in `apps/app/src/App.test.tsx` to assert accessible icon-button discovery and reload invocation on click.
- 2026-02-19: Targeted checks passed: `pnpm --filter @coda/app lint`, `pnpm --filter @coda/app typecheck`, `pnpm --filter @coda/app test`.
- 2026-02-19: Compound note added in `docs/solutions/2026-02-19-lucide-icon-only-sidebar-refresh.md` with pattern and prevention guidance.
- 2026-02-19: Full repository gate passed with `pnpm validate` (lint/typecheck/test/build all green).
- 2026-02-19: `pnpm --filter @coda/app tauri dev` failed before manual smoke because Vite could not start: `Error: Port 1420 is already in use`; manual in-window validation remains pending once the port conflict is resolved.
- 2026-02-19: Retried `pnpm --filter @coda/app tauri dev` after resolving transient port conflict; Vite/Tauri startup confirmed (`Local: http://localhost:1420/`, Rust app process launched). Visual in-window manual checks still require user confirmation.
- 2026-02-19: User confirmed plan completion for the Lucide refresh-icon rollout; manual visual checks accepted and plan archived to `docs/plans/completed/`.
