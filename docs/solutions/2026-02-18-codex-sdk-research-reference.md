---
title: "Codex SDK reference baseline for repository-local retrieval"
date: 2026-02-18
tags: [codex-sdk, documentation, references, compound]
status: "active"
---

## Problem

The repository had no consolidated, up-to-date Codex SDK reference document under `docs/references/`.

## Root Cause

Codex platform surfaces evolved across SDK, CLI, app server, MCP, and cloud integrations, but the repo still only contained older generic reference material.

## Solution

Added `docs/references/codex-sdk-reference-2026-02-18.md` with:

- current SDK entry points and runtime requirements
- auth, security, config, and sandbox controls
- automation options (`codex exec`, SDK, GitHub Action, app server, MCP server)
- integrations, model/pricing caveats, and date-scoped notes
- official OpenAI source links for future refreshes

## Prevention

- Refresh this reference when Codex changelog announces significant SDK/CLI changes.
- Keep date-scoped statements explicit for volatile topics (models, pricing, plan entitlements).
- Continue storing external platform research in `docs/references/` for agent discoverability.

## Related

- `docs/references/codex-sdk-reference-2026-02-18.md`
- `docs/PRD.md`
- `docs/design-docs/architecture-overview.md`

