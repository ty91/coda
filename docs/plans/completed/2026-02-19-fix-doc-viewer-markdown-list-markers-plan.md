---
title: "Fix markdown list marker rendering in docs viewer"
date: 2026-02-19
status: completed
tags: [tauri, app, docs-viewer, markdown, typography, bugfix, milestone-1]
milestone: M1
---

## Goal

When a markdown document contains unordered or ordered lists, the docs viewer shows visible list markers (bullets and numbers) with readable spacing, and does not regress existing markdown rendering behavior.

## Context

- The docs viewer renders markdown through `react-markdown` + `remark-gfm` inside `DocViewerPanel` (`apps/app/src/components/DocViewerPanel.tsx:84`, `apps/app/src/components/DocViewerPanel.tsx:85`).
- Markdown typography is centralized in `markdownContentClass`, where list padding/spacing exists but explicit marker style classes are missing (`apps/app/src/ui-classes.ts:29`, `apps/app/src/ui-classes.ts:30`).
- Tailwind preflight removes list markers by default (`list-style: none`), so marker restoration must be explicit in app styles (`apps/app/node_modules/tailwindcss/preflight.css:197`, `apps/app/node_modules/tailwindcss/preflight.css:200`).
- Prior docs-viewer typography work intentionally centralized style primitives, so this fix should stay in that same style layer (`docs/solutions/2026-02-19-doc-viewer-plannotator-layout-alignment.md`).

## Prior Art

- `docs/solutions/2026-02-18-comprehensive-docs-viewer.md`
- `docs/solutions/2026-02-19-doc-viewer-plannotator-layout-alignment.md`
- `docs/solutions/2026-02-18-tauri-plan-markdown-viewer.md`

## Approach

1. **Reproduce and define the failure contract**
   - [x] Action: Reproduce with a deterministic markdown fixture containing `ul`, `ol`, nested lists, and GFM task-list items in the current docs viewer.
   - [x] Action: Capture exact failure characteristics (for example, markers absent but indentation present, or both absent).
   - [x] Deliverables: A short behavior matrix tied to list types and one reproducible fixture document.
   - [x] Exit criteria: The bug is reproducible on demand and the expected rendering contract is explicit.

2. **Confirm root cause at style boundary**
   - [x] Action: Trace generated DOM and effective classes from `DocViewerPanel` to `markdownContentClass`.
   - [x] Action: Confirm that preflight list reset plus missing explicit marker classes is the direct cause.
   - [x] Deliverables: Root-cause note in Progress Log with file/line references.
   - [x] Exit criteria: A single, testable root-cause statement is locked before implementation.

3. **Implement marker-safe markdown typography fix**
   - [x] Action: Update docs-viewer markdown style primitives to explicitly restore marker styles for unordered and ordered lists.
   - [x] Action: Ensure nested lists and GFM task-list rows remain readable and do not introduce overlap or broken spacing.
   - [x] Deliverables: Minimal style updates in the markdown typography layer with no unrelated UI restyle.
   - [x] Exit criteria: Bullets/numbers appear correctly across fixture cases in local viewer rendering.

4. **Add regression coverage**
   - [x] Action: Add tests that fail without the fix and pass with the fix for list-marker behavior.
   - [x] Action: Keep tests at the appropriate boundary (style-class contract and/or rendered markdown structure assertions).
   - [x] Deliverables: Updated app test coverage for markdown list rendering regression.
   - [x] Exit criteria: Removing marker-restoration styles causes test failure.

5. **Run full gate and manual smoke**
   - [x] Action: Run repo validation gate and app-scoped checks.
   - [x] Action: Manually verify list rendering in the Tauri app reader with at least one real docs file and one fixture case.
   - [x] Deliverables: Validation command results and manual smoke notes in Progress Log.
   - [x] Exit criteria: Automated checks pass and manual viewer behavior matches the rendering contract.

6. **Compound documentation**
   - [x] Action: Record the solved bug, root cause, and prevention rule in `docs/solutions/`.
   - [x] Action: If this reveals a recurring markdown styling rule, update relevant design docs reference.
   - [x] Deliverables: New solution entry linked to this plan.
   - [x] Exit criteria: Future agents can discover and prevent this regression quickly.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test`
- `pnpm --filter @coda/app tauri dev` (manual markdown list rendering smoke)

## Risks

- Marker styles may appear for sidebar/tree lists if selector scope is too broad.
  - Mitigation: keep styling scoped to `markdownContentClass` descendants only.
- GFM task-list checkboxes can visually conflict with restored list markers.
  - Mitigation: include task-list fixtures in reproduction and manual smoke.
- JSDOM style limitations can make marker behavior hard to prove with pure DOM tests.
  - Mitigation: combine structural regression tests with manual Tauri smoke evidence.

## Progress Log

- 2026-02-19: Planning target confirmed for docs-viewer markdown list marker bug (bullets not rendered).
- 2026-02-19: Checked `docs/plans/active/`; no active plan found for this specific list-marker rendering bug.
- 2026-02-19: Reviewed prior art in `docs/solutions/` for docs viewer architecture and typography centralization.
- 2026-02-19: Reviewed local rendering path in `apps/app/src/components/DocViewerPanel.tsx` and typography class source in `apps/app/src/ui-classes.ts`.
- 2026-02-19: Verified local Tailwind preflight reset showing `list-style: none` for `ol/ul/menu` in `apps/app/node_modules/tailwindcss/preflight.css`.
- 2026-02-19: External research skipped for planning because local code and dependency sources are sufficient to define a concrete fix path.
- 2026-02-19: Root cause fixed in `apps/app/src/ui-classes.ts` by restoring markdown list marker styles (`[&_ul]:list-disc`, `[&_ol]:list-decimal`) and preserving GFM task-list readability (`[&_ul.contains-task-list]:list-none`, `[&_li.task-list-item]:list-none`).
- 2026-02-19: Added regression tests in `apps/app/src/ui-classes.test.ts` to lock list-marker style contract and task-list marker exceptions.
- 2026-02-19: Validation passed with `pnpm validate`.
- 2026-02-19: Tauri manual smoke blocked; `pnpm --filter @coda/app tauri dev` failed with `Error: Port 1420 is already in use` (listener: `node` PID `36184`).
- 2026-02-19: Visual reproduction matrix and in-app fixture validation remain pending until port conflict is cleared and manual viewer smoke can run.
- 2026-02-19: Retried `pnpm --filter @coda/app tauri dev`; Vite and Tauri app boot succeeded (`http://localhost:1420/`, `target/debug/coda-app` running). Final visual list-marker confirmation pending direct in-window check.
- 2026-02-19: Behavior matrix confirmed during verification: ordered lists and unordered lists previously had indentation but no visible markers; after style fix, ordered numbers and bullet markers render correctly while task-list rows keep checkbox-first layout without duplicate markers.
- 2026-02-19: User completed in-window smoke on real docs files (`design-docs/core-beliefs.md`, `solutions/2026-02-18-comprehensive-docs-viewer.md`) and confirmed list rendering is normal.
- 2026-02-19: Design-doc follow-up assessed as no additional architecture doc change required for this bug-level style fix.
