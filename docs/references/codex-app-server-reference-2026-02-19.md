---
title: "Codex App Server reference (2026-02-19)"
date: 2026-02-19
type: reference
tags: [codex, app-server, protocol, integration, openai]
sources:
  - https://developers.openai.com/codex/app-server
  - https://developers.openai.com/codex/cli/reference
  - https://developers.openai.com/codex/changelog
  - https://developers.openai.com/codex/open-source
  - https://openai.com/index/unlocking-codex-for-building-and-coding-agents/
---

# Codex App Server: web research report

## Scope

This report summarizes official OpenAI information about Codex App Server as of **February 19, 2026**.

## What Codex App Server is

Codex App Server is a local server interface for Codex that exposes:

- a stable OpenAPI route (`/v1/runs`) for basic programmatic execution,
- and an experimental JSON-RPC protocol for richer client integrations.

OpenAI positions App Server for deep product integrations where SDK-only or MCP-only flows are not enough.

## Protocol and runtime model

From the App Server docs:

- Transport: newline-delimited JSON messages over `stdin`/`stdout`.
- Server launch: `codex app-server`.
- Protocol schema is published for typed client generation.
- OpenAPI spec is also published for `/v1/runs` clients.

The docs recommend SDK for straightforward automation, and App Server when you need low-level lifecycle and event control.

## Core concepts surfaced by the protocol

The protocol is organized around session, thread, turn, and tool operations.

Key method groups include:

- Session/config: `session/configure`, `session/read`, `session/write`, plus app-level config read/write.
- Thread lifecycle: list/read/archive/unarchive/history access.
- Turn lifecycle: start, cancel, stream, summary/url reads, and resume flows.
- Human approval: `approval/request`.
- Discovery: tools, skills, templates, registry, and experimental-feature listing.
- External context: MCP tool/prompt/resource listing and resource reads.

The docs also call out command deduping behavior and distinct approval IDs to reduce approval ambiguity in integrations.

## Streamed output model

App Server streams typed output items rather than only a final text blob.

Documented output/event shapes include:

- `output_text` and `reasoning_text`,
- reasoning-effort metadata,
- command execution begin/end events.

This matters for UIs that need incremental rendering, audit timelines, or custom approval UX.

## Stability status (important)

From the CLI reference, the App Server protocol is currently marked **experimental** and may change across releases.

Practical implication: pin Codex versions, track changelog updates, and treat protocol integration as a versioned dependency.

## Recent App Server changes from official changelog

### February 18, 2026 (CLI `0.104.0`)

- Added notifications for thread archive/unarchive actions.
- Added distinct command approval IDs when command deduping is enabled.

### February 11, 2026 (CLI `0.99.0`)

- Added dedicated turn-steering API endpoint.
- Added experimental-feature listing endpoint.
- Added `thread/resume_agent` for interrupted loop continuation.
- Added app-state settings for notification control.

### February 4, 2026 (CLI `0.96.0`)

- Added asynchronous `thread/compact` endpoint.
- Added WebSocket `codex.rate_limits` event.

## Open-source status and artifact locations

OpenAI's open-source page states Codex App and most of Codex CLI are open source in `openai/codex`.

App Server-related components are listed as:

- `apps/app-server`
- `packages/app-server-protocol`

OpenAI directs bug reports and feature requests through GitHub Issues on that repository.

## Architectural direction from OpenAI engineering post

In OpenAI's February 4, 2026 engineering write-up, App Server is described as a first-class integration protocol introduced after limits were found with pure SDK and pure MCP approaches.

Interpretation: OpenAI is converging on App Server as the primary boundary for advanced Codex client integrations that need approvals, persistence, and richer eventing.

## Integration guidance for Coda

For Coda-like orchestration clients, App Server appears strongest when you need:

- explicit approval handshakes,
- event-level streaming and observability,
- resumable thread/turn lifecycle control,
- typed protocol contracts generated from official schemas.

Use `/v1/runs` for minimal execution integration, then adopt JSON-RPC methods selectively where richer control is required.
