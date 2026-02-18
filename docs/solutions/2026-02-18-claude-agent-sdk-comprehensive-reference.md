---
title: "Claude Agent SDK comprehensive reference added"
date: 2026-02-18
tags: [claude-agent-sdk, documentation, references, compound]
status: "active"
---

## Problem

The repository lacked a comprehensive, implementation-ready Claude Agent SDK reference for immediate engineering use.

## Root Cause

Available knowledge was fragmented across many Anthropic docs pages, changelogs, and package registries, with ongoing 2025-2026 SDK changes.

## Solution

Added `docs/references/claude-agent-sdk-reference-2026-02-18.md` with:

- Current naming/package/version snapshot (TypeScript + Python)
- Core API surfaces and operational modes
- Permissions/hooks/sessions/MCP/subagents coverage
- Security/deployment posture and risk controls
- Concrete implementation blueprint aligned to repository architecture layers
- Validation checklist and immediate next steps
- Full source index linking to primary Anthropic docs and official repos

## Prevention

For SDK/platform research docs:

- Use only primary sources first (official docs + official repositories).
- Include exact as-of date and version snapshot.
- Include a direct implementation blueprint, not only feature summaries.
- Capture risks and validation gates in the same document.

## Related

- `docs/references/claude-agent-sdk-reference-2026-02-18.md`
