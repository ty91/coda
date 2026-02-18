---
title: "Comprehensive docs viewer across docs/ with safe boundaries"
date: 2026-02-18
tags: [tauri, docs, markdown, ui, safety]
status: "active"
related_plan: "docs/plans/completed/2026-02-18-feat-comprehensive-docs-viewer-plan.md"
---

## Problem

The Tauri app could only list and render plan files from `docs/plans/active`. Users could not browse PRD, design docs, solutions, or references from the UI.

## Root Cause

The IPC contract, Rust file-reader commands, and React state were all specialized for plan-only IDs and metadata. Filesystem allowlisting was hard-coded to one directory.

## Solution

Implemented a docs-wide viewer path rooted at `docs/`:

- Replaced plan-specific shared contracts with docs contracts in `packages/core/src/contracts.ts` (`DocSummary`, `DocDocument`, `DocId`) including section/path context and hidden/template flags.
- Generalized Rust commands in `apps/app/src-tauri/src/plan_viewer.rs`:
  - `list_doc_summaries(include_hidden)`
  - `get_doc_document(doc_id)`
- Added recursive markdown discovery under `docs/` with canonical path checks to reject traversal/out-of-bound reads.
- Switched frontmatter policy to optional metadata fields (`title`, `date`, `status`, `milestone`, `tags`) while preserving explicit malformed-YAML errors with file path context.
- Updated `apps/app/src/App.tsx` from plan viewer to docs viewer:
  - docs-wide labels and load states
  - hidden/template toggle
  - section/path-aware selector labels
  - metadata rows rendered only when values exist
  - markdown rendering preserved via `react-markdown` + `remark-gfm`
- Added regression coverage:
  - Rust tests for recursive listing, optional metadata/templates, malformed frontmatter path errors, and traversal rejection.
  - Frontend tests for selection flow, list error state, and hidden/template filter behavior.

## Prevention

- Keep docs viewer IDs stable as docs-root relative paths (for example `plans/active/plan.md`) and validate them only at the Rust boundary.
- Treat metadata variability as a rendering concern, not a parse failure, except for malformed frontmatter syntax.
- Keep hidden/template policy explicit and user-controlled through a filter toggle.
- Use canonical path enforcement for both listing and direct document fetch commands.

## Related

- `docs/plans/active/2026-02-18-feat-comprehensive-docs-viewer-plan.md`
- `apps/app/src-tauri/src/plan_viewer.rs`
- `apps/app/src/App.tsx`
- `apps/app/src/App.test.tsx`
