---
title: "Tauri plan markdown viewer with safe file boundary"
date: 2026-02-18
tags: [tauri, plans, markdown, ui, safety]
status: "active"
related_plan: "docs/plans/completed/2026-02-18-feat-tauri-plan-markdown-viewer-plan.md"
---

## Problem

The Tauri app only showed a static placeholder and could not display plan markdown files for review.

## Root Cause

The scaffold had no plan IPC contract, no Rust-side plan file reader/parser, and no frontend markdown rendering path. Plan data remained inaccessible to the app.

## Solution

Implemented a viewer-first path for `docs/plans/active`:

- Added shared plan contracts in `packages/core/src/contracts.ts` (`PlanSummary`, `PlanDocument`, metadata fields).
- Added Rust module `apps/app/src-tauri/src/plan_viewer.rs` with Tauri commands:
  - `list_plan_summaries`
  - `get_plan_document`
- Added boundary validation in Rust:
  - YAML frontmatter parsing/required-field checks (`title`, `date`, `status`, `tags`)
  - path traversal rejection (allowlist constrained to `docs/plans/active`)
- Added Rust regression tests for:
  - valid parse
  - missing frontmatter field failure
  - traversal rejection
  - markdown-only listing
- Replaced placeholder UI in `apps/app/src/App.tsx` with:
  - plan selector
  - metadata display
  - rendered markdown content using `react-markdown` + `remark-gfm`
  - loading/empty/error states
- Kept annotation out of scope and added explicit future TODO in UI copy for M2.

## Prevention

- Keep plan contracts in `@coda/core` and reuse across IPC/frontend.
- Validate all plan file inputs at Rust boundary before rendering.
- Keep filesystem reads restricted to explicit allowlist roots.
- Preserve viewer-only scope until annotation plan is approved.

## Related

- `docs/plans/completed/2026-02-18-feat-tauri-plan-markdown-viewer-plan.md`
- `apps/app/src-tauri/src/plan_viewer.rs`
- `apps/app/src/App.tsx`
