---
title: "Restore macOS window drag via title-bar drag region"
date: 2026-02-19
status: completed
tags: [tauri, macos, titlebar, drag-region, bugfix, milestone-1]
milestone: M1
---

## Goal

When the user drags the top title-bar area, the Tauri window moves reliably again on macOS, with no regression to docs navigation or layout.

## Context

- Current window config uses `hiddenTitle: true` + `titleBarStyle: "Overlay"` (`apps/app/src-tauri/tauri.conf.json:17`, `apps/app/src-tauri/tauri.conf.json:18`).
- Current React shell fills the top region but does not define a Tauri drag region (`apps/app/src/App.tsx:158`).
- Existing regression test currently asserts drag region is absent (`apps/app/src/App.test.tsx:147`), which likely codified the current broken behavior.
- Latest manual report: double-click on top bar still toggles maximize/restore, but drag-to-move still fails. This indicates native titlebar handling exists, while drag hit-target mapping in web content remains wrong.
- Prior title-bar cleanup intentionally removed extra overlay strip and kept single-layer shell (`docs/solutions/2026-02-19-tauri-macos-transparent-titlebar-hidden-title.md:23`).
- Official Tauri docs confirm custom/overlay title bars need explicit drag-region markup and caution around interactive children:
  - https://v2.tauri.app/learn/window-customization/
  - https://v2.tauri.app/reference/config/#titlebarstyle

## Prior Art

- `docs/solutions/2026-02-19-tauri-macos-transparent-titlebar-hidden-title.md`
- `docs/solutions/2026-02-19-tauri-docs-viewer-remove-mission-control-header.md`
- `docs/plans/active/2026-02-19-feat-tauri-macos-hudwindow-sidebar-glass-plan.md`

## Approach

1. **Reproduce and isolate the drag failure path**
   - [x] Action: Reproduce on macOS Tauri dev build and capture exact non-drag behavior by region (top-left controls area, top center, sidebar top, reader top).
   - [x] Action: Confirm whether failure is universal or limited to interactive descendants inside the title-bar overlay area.
   - [x] Deliverables: Short behavior matrix mapped to screen zones.
   - [x] Exit criteria: We can state the precise failing drag zones before changing code.

2. **Define root cause and fix contract**
   - [x] Action: Verify root cause against current layout/tests and Tauri drag-region rules (including direct-element requirement and no-drag handling for buttons/inputs).
   - [x] Action: Choose one explicit drag surface strategy (minimal top strip vs targeted non-interactive top-safe area) that preserves current visual design.
   - [x] Deliverables: Root-cause statement + chosen contract documented in this plan progress log.
   - [x] Exit criteria: One fix direction selected with clear drag/non-drag boundaries.

3. **Realign drag hit-targets to direct elements**
   - [x] Action: Replace container-level drag attributes with explicit top drag strips that users directly click/drag.
   - [x] Action: Keep interactive controls outside drag strip hit areas to avoid accidental drag on clicks.
   - [x] Deliverables: Dedicated sidebar/reader drag-strip markup with clear boundaries.
   - [x] Exit criteria: Drag starts reliably from strip areas while controls remain fully interactive.

4. **Update regression coverage for direct-hit drag placement**
   - [x] Action: Replace current drag-region assertions with tests that target dedicated drag strips.
   - [x] Action: Add a guard that fails if drag attributes are moved back to ineffective container-only placement.
   - [x] Deliverables: Updated tests in app UI test suite.
   - [x] Exit criteria: Tests encode direct-hit placement and prevent this regression pattern.

5. **Run full gate + manual verification and compound docs**
   - [x] Action: Run full repo gate (`pnpm validate`) and app checks.
   - [x] Action: Run Tauri manual smoke to confirm real window dragging in dev app.
   - [x] Action: Update solution/pattern/prevention doc with final direct-hit fix path.
   - [x] Deliverables: Validation evidence + refreshed solution note.
   - [x] Exit criteria: Gate green, manual drag confirmed, compounding docs complete.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test`
- `pnpm --filter @coda/app tauri dev` (manual drag smoke on macOS title-bar area)

## Risks

- Drag-region overlaps interactive controls, causing accidental window movement.
  - Mitigation: keep drag surface non-interactive and explicitly test control interactions.
- Visual regressions if a top strip reappears unexpectedly.
  - Mitigation: preserve single-layer shell; keep fix minimal and snapshot/assert structural expectations.
- Platform-specific behavior mismatch (macOS vs non-macOS).
  - Mitigation: scope manual validation to macOS now; avoid broad platform assumptions in code.

## Progress Log

- 2026-02-19: Planning target confirmed: investigate and fix inability to drag/move window via title bar.
- 2026-02-19: Checked active plans; no existing active plan specifically covers title-bar drag-region bug fix.
- 2026-02-19: Reviewed local context in `apps/app/src-tauri/tauri.conf.json`, `apps/app/src/App.tsx`, `apps/app/src/components/DocsSidebar.tsx`, `apps/app/src/components/DocViewerPanel.tsx`, and `apps/app/src/App.test.tsx`.
- 2026-02-19: Reviewed related prior-art solution notes for recent title-bar/layout changes.
- 2026-02-19: External research performed on official Tauri docs to confirm overlay-titlebar drag-region requirements; fix strategy will follow those constraints.
- 2026-02-19: Reproduced baseline behavior in tests (`pnpm --filter @coda/app test -- App.test.tsx`) and confirmed current suite asserts zero drag regions; with no `data-tauri-drag-region` in app shell/components, drag fails across top-center/sidebar-top/reader-top custom content zones.
- 2026-02-19: Root cause locked as missing explicit Tauri drag-region markup under `titleBarStyle: "Overlay"`; chosen fix contract is targeted non-interactive top-safe drag zones on existing sidebar/reader surface roots (no extra visual header layer).
- 2026-02-19: Implemented drag regions on existing top-safe surfaces in `apps/app/src/components/DocsSidebar.tsx` and `apps/app/src/components/DocViewerPanel.tsx`; no new visual title strip added.
- 2026-02-19: Updated `apps/app/src/App.test.tsx` regression to assert drag-region presence on sidebar/reader surfaces, keep interactive refresh control out of drag-region markup, and enforce exact drag-region count.
- 2026-02-19: Validation passed: `pnpm --filter @coda/app test -- App.test.tsx`, `pnpm --filter @coda/app lint`, `pnpm --filter @coda/app typecheck`, `pnpm --filter @coda/app build`, `pnpm validate`.
- 2026-02-19: Started `pnpm --filter @coda/app tauri dev` successfully (Vite + Rust app boot); direct manual drag confirmation remains pending user interaction in the running app window.
- 2026-02-19: Compound step documented in `docs/solutions/2026-02-19-tauri-overlay-titlebar-drag-region.md`.
- 2026-02-19: User-reported behavior update: title-bar double-click maximize/restore works, but drag-to-move still fails; this confirms native titlebar exists but drag hit-target placement is still incorrect.
- 2026-02-19: Reworked drag-region placement to direct-hit top strips (`data-tauri-drag-region`) in sidebar and reader panels; removed ineffective container-level drag attributes.
- 2026-02-19: Updated regression test to assert dedicated drag-strip elements and to guard against container-only drag attribute placement regressions.
- 2026-02-19: Targeted regression suite passed with new drag-strip checks: `pnpm --filter @coda/app test -- App.test.tsx`.
- 2026-02-19: Full gate re-run passed after direct-hit strip changes: `pnpm validate`.
- 2026-02-19: Manual Tauri smoke currently blocked by dev-server conflict while starting `pnpm --filter @coda/app tauri dev`: `Error: Port 1420 is already in use`.
- 2026-02-19: Additional root cause found in Tauri capability ACL: app used `core:default` only, but `start_dragging` is not included in `core:window:default`; drag-region behavior requires `core:window:allow-start-dragging`.
- 2026-02-19: Added `core:window:allow-start-dragging` to `apps/app/src-tauri/capabilities/default.json` and added regression test `apps/app/src/tauri-capabilities.test.ts`.
- 2026-02-19: Validation re-run after ACL fix passed: `pnpm validate`; Tauri dev app relaunched for manual drag verification.
- 2026-02-19: User manual verification confirmed: drag-to-move now works as expected in the Tauri app window.
