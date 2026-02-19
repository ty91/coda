---
title: "Add macOS HUD-style glass sidebar with switchable window material"
date: 2026-02-19
status: draft
tags: [tauri, macos, ui, vibrancy, sidebar, milestone-1]
milestone: M1
---

## Goal

Deliver a macOS-only glass experience for the documentation sidebar using `hudWindow` material by default, while keeping a single abstraction point so the material can be switched to `sidebar` later without refactoring UI code.

## Context

- The current sidebar already uses CSS-level translucency and blur (`apps/app/src/ui-classes.ts:1`, `apps/app/src/components/DocsSidebar.tsx:149`), but it does not use macOS native vibrancy materials.
- Tauri window configuration currently does not enable transparency or window effects (`apps/app/src-tauri/tauri.conf.json:1`).
- The app owner confirmed constraints for this work:
  - macOS-only usage.
  - No Mac App Store distribution constraints.
  - Baseline environment is macOS Tahoe 26.2 or newer.
- Prior art to preserve:
  - Tailwind v4 styling system and component composition conventions (`docs/solutions/2026-02-18-tailwindcss-tauri-ui-adoption.md:1`).
  - Existing docs-tree behavior and navigation continuity expectations (`docs/design-docs/ux-specification.md:547`).
- External research (official sources):
  - Tauri v2 config supports `transparent` and `windowEffects` on windows: https://v2.tauri.app/reference/config/#windowconfig
  - macOS transparency requires `app.macosPrivateApi`: https://v2.tauri.app/reference/config/#appconfig
  - `hudWindow` and `sidebar` are valid effect materials: https://docs.rs/tauri/latest/tauri/window/enum.Effect.html
  - Runtime effect application is available through JS API: https://v2.tauri.app/reference/javascript/api/namespacewindow/

## Approach

1. **Lock scope and define the material abstraction contract**
   - [x] Action: Record the initial target material as `hudWindow` and define a switchable material contract (`hudWindow | sidebar`) in one location.
   - [x] Action: Keep scope limited to UI shell and window-effect plumbing, with no CLI/core/Rust domain behavior changes.
   - [x] Deliverables: A single material selection source documented in code and progress log.
   - [x] Exit criteria: Changing from `hudWindow` to `sidebar` requires editing one value only.
2. **Enable macOS vibrancy prerequisites in Tauri config**
   - [x] Action: Update `apps/app/src-tauri/tauri.conf.json` to enable `app.macosPrivateApi`.
   - [x] Action: Make the main window transparent and define baseline `windowEffects` values compatible with macOS usage.
   - [x] Deliverables: Config changes that satisfy Tauri requirements for native visual effects.
   - [x] Exit criteria: App launches on macOS with no configuration errors related to transparency or effects.
3. **Implement runtime window-effect adapter for switchable material**
   - [x] Action: Add a small frontend adapter that applies Tauri window effects from the material contract at app startup.
   - [x] Action: Keep adapter surface minimal and isolated so future material additions do not leak into feature components.
   - [x] Deliverables: One dedicated effect application module and one call site in app bootstrap flow.
   - [x] Exit criteria: Material choice is decoupled from `App.tsx` and sidebar component markup.
4. **Tune sidebar visual layering for readability**
   - [x] Action: Refine sidebar panel classes to pair native vibrancy with CSS-level contrast controls (border, fill alpha, subtle overlay).
   - [x] Action: Keep content panel readability stable by avoiding over-transparency in document-reading regions.
   - [x] Deliverables: Updated class composition for sidebar and shell surfaces.
   - [x] Exit criteria: Sidebar has a clear glass look while markdown content remains easy to read.
5. **Add regression-focused tests for the abstraction boundary**
   - [x] Action: Add or update tests around material resolution and effect adapter invocation boundaries where feasible.
   - [x] Action: Keep behavior tests for docs tree interactions green and unchanged.
   - [x] Deliverables: Test coverage that detects accidental hardcoding of material choice.
   - [x] Exit criteria: Material switching path is protected by automated checks.
6. **Run full validation and complete compound step documentation**
   - [x] Action: Run repository validation gate and Tauri packaging checks.
   - [ ] Action: Perform manual macOS smoke checks for active/inactive window states and sidebar contrast.
   - [x] Action: Record the solved pattern and prevention guidance in `docs/solutions/`.
   - [x] Deliverables: Validation evidence and a linked solution note.
   - [ ] Exit criteria: All required checks pass and compound documentation is complete.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app tauri build`
- `pnpm --filter @coda/app tauri dev` (manual smoke)
- Manual checks in Tauri window:
  - Sidebar glass quality in focused and unfocused window states.
  - Readability of document viewer against translucent surroundings.
  - No interaction regressions in docs tree expand/collapse and selection flows.

## Progress Log

- 2026-02-19: Planning target confirmed as a macOS-only glass sidebar using `hudWindow` first, with explicit requirement to keep material selection abstracted for later switch to `sidebar`.
- 2026-02-19: Local context reviewed in current app shell/sidebar and Tauri config; prior Tailwind/UI solution notes checked for reuse.
- 2026-02-19: External Tauri references validated for `transparent`, `windowEffects`, `macOSPrivateApi`, and effect material options before drafting this plan.
- 2026-02-19: Added material abstraction module `apps/app/src/window-effects.ts` with `hudWindow | sidebar` contract and startup adapter call in `apps/app/src/main.tsx`; changing material now requires a single constant edit.
- 2026-02-19: Updated `apps/app/src-tauri/tauri.conf.json` with `app.macOSPrivateApi`, `transparent`, and baseline `windowEffects` (`hudWindow`, `active`, radius `14`).
- 2026-02-19: Tauri Rust dependency now enables `macos-private-api` feature in `apps/app/src-tauri/Cargo.toml` to support transparent window APIs on macOS.
- 2026-02-19: Tuned glass/readability layering by introducing `sidebarSurfaceClass`, updating sidebar section surfaces, and making global page background transparent for native vibrancy visibility.
- 2026-02-19: Added regression tests in `apps/app/src/window-effects.test.ts`; verified with `pnpm --filter @coda/app test`, `pnpm --filter @coda/app typecheck`, and `pnpm --filter @coda/app build`.
- 2026-02-19: Full gate passed: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm validate`, `pnpm --filter @coda/app tauri build`.
- 2026-02-19: `pnpm --filter @coda/app tauri dev` booted successfully (Vite + Rust app process start confirmed); in-window manual visual checks remain pending user-run verification.
- 2026-02-19: Compound step recorded in `docs/solutions/2026-02-19-tauri-macos-hudwindow-sidebar-glass.md`. Architecture docs unchanged (no layer boundary changes).
