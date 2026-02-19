---
title: "Restore markdown list markers in docs viewer"
date: 2026-02-19
tags: [tauri, docs-viewer, markdown, typography, bugfix]
status: "active"
related_plan: "docs/plans/completed/2026-02-19-fix-doc-viewer-markdown-list-markers-plan.md"
---

## Problem

Markdown unordered/ordered lists rendered without visible bullets or numbers in the docs viewer.

## Root Cause

Tailwind preflight resets `ol`/`ul` to `list-style: none`, and the viewer typography contract did not explicitly restore marker styles in `markdownContentClass`.

## Solution

- Updated `apps/app/src/ui-classes.ts` to restore markers for markdown lists:
  - `[&_ul]:list-disc`
  - `[&_ol]:list-decimal`
- Kept GFM task lists readable by suppressing duplicate markers:
  - `[&_ul.contains-task-list]:list-none`
  - `[&_li.task-list-item]:list-none`
- Added regression tests in `apps/app/src/ui-classes.test.ts` to enforce list-marker contract.

## Prevention

- For markdown typography changes, always check Tailwind preflight resets before assuming browser defaults.
- Keep list rendering rules inside `markdownContentClass` so docs viewer behavior remains centralized and testable.
- Add style-contract tests when a bug is rooted in utility-class composition rather than DOM structure.

## Related

- `apps/app/src/ui-classes.ts`
- `apps/app/src/ui-classes.test.ts`
- `docs/solutions/2026-02-19-doc-viewer-plannotator-layout-alignment.md`
