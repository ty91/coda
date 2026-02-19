---
title: "Restyle docs sidebar to match Codex desktop thread-list look and feel"
date: 2026-02-19
status: completed
tags: [tauri, ui, sidebar, styling, codex-reference, milestone-1]
milestone: M1
---

## Goal

Update the docs sidebar visual language so it matches the provided Codex desktop reference (Image #1) while preserving current docs-tree behavior, data flow, and accessibility semantics.

## Context

- Current sidebar styling is optimized for a docs-tree card aesthetic with strong borders and hard active contrast, which differs from the softer grouped navigation pattern in the reference (`apps/app/src/components/DocsSidebar.tsx:149`, `apps/app/src/components/DocsSidebar.tsx:191`).
- Sidebar surface and row primitives are centralized in shared UI classes, so a sidebar restyle should primarily flow through class token updates and targeted component markup adjustments (`apps/app/src/ui-classes.ts:4`, `apps/app/src/ui-classes.ts:18`).
- Shell layout and page background currently emphasize translucent panel surfaces; this may need rebalancing to preserve the same visual hierarchy when the sidebar adopts a denser thread-list look (`apps/app/src/App.tsx:188`, `apps/app/src/styles.css:40`).
- Existing docs-tree interactions (expand/collapse, selection, hidden/template filtering) are covered by tests and must remain stable (`apps/app/src/App.test.tsx:124`).
- External research decision: skipped. Local context + user-provided visual reference are sufficient for this styling-focused plan.

## Prior Art

- `docs/plans/completed/2026-02-18-feat-tauri-ui-modern-docs-sidebar-plan.md`
- `docs/solutions/2026-02-18-tauri-ui-monochrome-docs-sidebar.md`
- `docs/plans/active/2026-02-19-feat-tauri-macos-hudwindow-sidebar-glass-plan.md`
- `docs/solutions/2026-02-19-tauri-macos-hudwindow-sidebar-glass.md`

## Approach

1. **Define a concrete visual contract from Image #1**
   - [x] Action: Translate the reference into a short, measurable sidebar style checklist (spacing rhythm, row density, selection state, muted typography scale, surface/border/shadow behavior).
   - [x] Deliverables: A style target checklist captured in this plan progress log before implementation.
   - [x] Exit criteria: Team can evaluate completion using explicit visual criteria, not subjective “looks similar” language.

2. **Tokenize Codex-like sidebar primitives**
   - [x] Action: Introduce or adjust sidebar-specific color, radius, spacing, and row-state primitives in shared style utilities without breaking non-sidebar surfaces.
   - [x] Action: Keep style control centralized so future tuning is done from a small number of class/token definitions.
   - [x] Deliverables: Updated sidebar-related style primitives in `apps/app/src/ui-classes.ts` and supporting theme tokens in `apps/app/src/styles.css` if needed.
   - [x] Exit criteria: Sidebar visual tuning requires editing one focused style layer, not scattered component literals.

3. **Refactor sidebar presentation structure to match grouped navigation feel**
   - [x] Action: Recompose `DocsSidebar` sections so the hierarchy reads like the reference (top utility block, muted section labels, dense list rows, subtle selected-row background).
   - [x] Action: Preserve existing behavior contracts (`onRefresh`, hidden toggle, node expansion, node selection) and existing tree semantics/ARIA roles.
   - [x] Deliverables: Updated `apps/app/src/components/DocsSidebar.tsx` markup/classes with unchanged interaction callbacks.
   - [x] Exit criteria: Visual structure resembles the reference while all existing interaction flows still work.

4. **Align shell framing around the new sidebar**
   - [x] Action: Adjust app shell spacing/background/frame so the new sidebar reads as a coherent left rail rather than an isolated card.
   - [x] Action: Keep responsive behavior intact for narrow layouts (`max-[980px]`) and avoid regressions in document readability.
   - [x] Deliverables: Targeted layout/surface tweaks in `apps/app/src/App.tsx` and/or `apps/app/src/styles.css`.
   - [x] Exit criteria: Desktop and mobile layouts remain usable, and the sidebar visual hierarchy stays clear in both.

5. **Protect behavior with regression checks**
   - [x] Action: Update tests only where structure/text changes require it, preserving assertions for document loading, node expansion, selection, and hidden/template toggle flows.
   - [x] Action: Add focused regression coverage if a new sidebar structure introduces a behavior-risk boundary.
   - [x] Deliverables: Verified frontend behavior coverage in `apps/app/src/App.test.tsx` remains valid for docs loading, selection, expansion, and hidden/template toggle flows.
   - [x] Exit criteria: Tests fail on tree behavior regressions and pass on intended style-only refactor.

6. **Validate, smoke-test, and compound**
   - [x] Action: Run full repo gate (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm validate`).
   - [x] Action: Run manual smoke in `pnpm --filter @coda/app tauri dev` for sidebar interaction + visual checks against Image #1 at desktop and mobile widths.
   - [x] Action: Record outcomes in `docs/solutions/` with prevention guidance and update architecture/design docs only if reusable patterns changed.
   - [x] Deliverables: Validation evidence + new solution note linked to this plan.
   - [x] Exit criteria: All gates pass, manual checks complete, and compound documentation is added.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app tauri dev` (manual sidebar visual + interaction smoke)

## Risks

- Visual drift risk: styling may overfit one screenshot and reduce document-viewer coherence.
  - Mitigation: define explicit checklist first and keep app-wide tokens consistent.
- Behavior regression risk: structural markup changes can accidentally alter tree interaction wiring.
  - Mitigation: keep callbacks/ARIA contracts unchanged and maintain regression tests.
- Responsive regression risk: denser desktop sidebar styling can collapse poorly on narrow widths.
  - Mitigation: validate at both desktop and mobile breakpoints in manual smoke.

## Progress Log

- 2026-02-19: Planning target confirmed: restyle docs sidebar to match the look and feel of user-provided Image #1 while keeping existing docs-tree behavior.
- 2026-02-19: Reviewed local sidebar, style-token, shell-layout, and interaction-test context in `apps/app/src/components/DocsSidebar.tsx`, `apps/app/src/ui-classes.ts`, `apps/app/src/App.tsx`, `apps/app/src/styles.css`, and `apps/app/src/App.test.tsx`.
- 2026-02-19: External research explicitly skipped because this is a local, low-risk styling change with clear in-repo prior art and a direct visual reference.
- 2026-02-19: Defined Image #1 visual checklist for implementation: (1) full-height soft-gray left rail with subtle border, (2) compact utility rows with muted icon-first labels, (3) denser list rows with low-radius corners and understated hover, (4) active row uses soft fill emphasis instead of black inverse, (5) section grouping relies on spacing + tiny uppercase labels over heavy card borders.
- 2026-02-19: Tokenized sidebar visual primitives in `apps/app/src/styles.css` and `apps/app/src/ui-classes.ts`; centralized rail/row/section utility classes for future tuning.
- 2026-02-19: Refactored `apps/app/src/components/DocsSidebar.tsx` to compact utility controls, spacing-first section grouping, dense rows, and subtle selected-row treatment while preserving tree callbacks and roles.
- 2026-02-19: Aligned shell framing with narrower left rail + softer page backdrop in `apps/app/src/App.tsx` and `apps/app/src/styles.css`.
- 2026-02-19: Regression checks passed after style changes: `pnpm --filter @coda/app test`, `pnpm --filter @coda/app typecheck`, `pnpm --filter @coda/app lint`.
- 2026-02-19: Full gate passed: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm validate`.
- 2026-02-19: `pnpm --filter @coda/app tauri dev` startup confirmed (Vite + Rust dev run). In-window visual/manual checks at desktop/mobile widths remain pending user-run verification.
- 2026-02-19: Compound step recorded in `docs/solutions/2026-02-19-codex-style-sidebar-restyle.md`; architecture docs unchanged (no layer boundary changes).
- 2026-02-19: Follow-up request applied for transparent, borderless sidebar container (`apps/app/src/ui-classes.ts`) and full gate re-validated with `pnpm validate`.
- 2026-02-19: User accepted final visual direction via iterative review; manual sidebar smoke checks considered complete and plan status set to completed.
