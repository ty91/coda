---
title: "Tauri docs viewer right chat panel UI via compound component slots"
date: 2026-02-19
tags: [tauri, app, docs-viewer, chat-panel, ui, compound-component, regression]
status: "active"
---

## Problem

The Tauri docs viewer center area rendered only a single reader panel, so there was no stable right-side surface for future document chat UX. This made it hard to reserve layout space and protect ask/find interactions while introducing chat UI.

## Root Cause

The center container in `App` had a single-panel structure and no reusable chat component boundary. Without a slot-based component, chat UI would likely become a one-off block in `App`, increasing coupling and making future expansion harder.

## Solution

- Added `ChatPanel` compound component in `apps/app/src/components/ChatPanel.tsx` with slot API:
  - `ChatPanel.Root`
  - `ChatPanel.Header`
  - `ChatPanel.Messages`
  - `ChatPanel.Composer`
- Integrated chat panel into `apps/app/src/App.tsx` as a persistent right column next to `DocViewerPanel` using a fixed 320px width in the center content grid.
- Kept scope UI-only: message list and composer are mock/placeholder-based; send/IPC/state-machine wiring is intentionally disabled.
- Preserved existing ask/find contract:
  - ask panel remains floating right sidebar behavior,
  - find overlay right offset remains `16px` default and `392px` when ask panel is visible.
- Added/updated regression tests:
  - `apps/app/src/components/ChatPanel.test.tsx` for compound slot composition and empty state,
  - `apps/app/src/App.test.tsx` for chat panel rendering, viewer coexistence, and ask/find non-regression.

## Prevention

- Keep chat UI composition in dedicated slots instead of embedding one large block in `App`.
- Treat overlay offsets (`16px`/`392px`) as an interaction contract and guard them with app-level tests.
- For fixed-shell layouts, keep scrolling inside panel bodies (`DocViewerPanel`, `ChatPanel.Messages`) and avoid outer shell scrolling regressions.
- Enforce milestone scope boundaries: UI placeholder first, transport/IPC wiring in follow-up work.

## Related

- `apps/app/src/components/ChatPanel.tsx`
- `apps/app/src/components/ChatPanel.test.tsx`
- `apps/app/src/App.tsx`
- `apps/app/src/App.test.tsx`
- `docs/plans/completed/2026-02-19-feat-tauri-doc-viewer-right-chat-panel-ui-plan.md`
