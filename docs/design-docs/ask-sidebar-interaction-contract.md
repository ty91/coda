---
title: "Ask header icon and right sidebar interaction contract"
date: 2026-02-19
status: draft
tags: [tauri, app, ask-queue, sidebar, modal, contract]
---

## Purpose

Define one interaction contract for the app header ask icon: it only toggles the right sidebar ask list. Modal rendering/open flows are forbidden.

## Non-negotiable Rules

1. Header ask icon click toggles `isAskPanelOpen` only.
2. Ask UI renders through `AskInboxPanel` only, in the right floating sidebar position.
3. Ask UI must not render any modal semantics (`role="dialog"` or modal wrapper state paths).

## Scenario Matrix

| Scenario | Trigger | Expected UI | Forbidden Outcome |
|---|---|---|---|
| Empty queue, closed panel | Click ask icon | Right sidebar opens with `No pending asks.` | Modal opens |
| Pending queue, closed panel | Click ask icon | Right sidebar opens with ask list | Modal opens |
| Panel already open | Click ask icon again | Right sidebar closes | Modal remains/opens |
| Keyboard ESC | Press `Escape` while panel open | Find overlay closes; ask sidebar state unchanged | Modal close handler runs |
| Focus transition | Move focus between reader/sidebar/header | Sidebar remains controlled only by explicit toggle/pending transition rules | Implicit modal focus trap |

## Testable Statements

- "When the header ask icon is clicked, only the right sidebar ask panel opens or closes."
- "After toggling ask open, no element with dialog role exists."
- "If modal code path is reintroduced, app-level tests must fail."

## Related

- `apps/app/src/App.tsx`
- `apps/app/src/components/AskInboxPanel.tsx`
- `apps/app/src/App.test.tsx`
