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
  - https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md
  - https://github.com/openai/codex/blob/main/codex-rs/app-server/src/transport.rs
  - https://openai.com/index/unlocking-codex-for-building-and-coding-agents/
---

# Codex App Server: web research report

## Scope

This report summarizes official OpenAI information about Codex App Server as of **February 19, 2026**.

## What Codex App Server is

Codex App Server is a local server interface for Codex that exposes a bidirectional JSON-RPC protocol for rich client integrations.

OpenAI positions App Server for deep product integrations where SDK-only or MCP-only flows are not enough.

## Protocol and runtime model

From the official docs and open-source app-server README:

- Transport defaults to newline-delimited JSON messages over `stdin`/`stdout` (`stdio://`).
- WebSocket transport (`ws://IP:PORT`) exists but is explicitly marked experimental/unsupported in the README.
- Server launch: `codex app-server`.
- The connection requires an initialization handshake: `initialize` request followed by an `initialized` notification.
- Protocol schema is published and can be generated locally for typed clients (`generate-ts`, `generate-json-schema`).

The docs recommend SDK for straightforward automation, and App Server when you need low-level lifecycle and event control.

## Core concepts surfaced by the protocol

The protocol is organized around thread, turn, item, and tool operations.

Key method groups include:

- Thread lifecycle: `thread/start`, `thread/resume`, `thread/fork`, `thread/list`, `thread/read`, `thread/archive`, `thread/unarchive`, and related status notifications.
- Turn lifecycle: `turn/start`, `turn/steer`, `turn/interrupt`, and completion/status notifications.
- Command execution: `command/exec` for one-off command execution under server sandbox policy.
- Skills: `skills/list` and `skills/config/write` are available. `skills/remote/*` is marked under development and should not be used in production clients yet.
- Discovery/config: model listing, experimental-feature listing, collaboration-mode listing, and config read/write APIs.
- External context: MCP status/listing and MCP OAuth flows.

## Streamed output model

App Server streams typed notifications, not only a final text blob.

Documented output/event shapes include:

- `item/started` and `item/completed`,
- incremental deltas like `item/agentMessage/delta`,
- command execution and tool-progress events,
- turn lifecycle notifications such as `turn/started` and `turn/completed`.

This matters for UIs that need incremental rendering, audit timelines, or custom approval UX.

## `/v1/runs` clarification (important)

An earlier internal reference in this repository described App Server as exposing a stable OpenAPI route at `/v1/runs`.

Current public sources reviewed on **February 19, 2026** do not show `/v1/runs` as an app-server transport surface. The official App Server docs and open-source implementation describe JSON-RPC over `stdio://` (default) and experimental `ws://IP:PORT`.

Direct local CLI validation with `codex-cli 0.104.0` also rejects HTTP listeners. Exact error:

`unsupported --listen URL \`http://127.0.0.1:1234\`; expected \`stdio://\` or \`ws://IP:PORT\``

Practical implication: integrate against the JSON-RPC protocol and generated schemas, and treat any `/v1/runs` mention as stale until reconfirmed by an official source.

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

- `codex-rs/app-server`
- `codex-rs/app-server-protocol`

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

Start from the JSON-RPC handshake and the minimal flow (`initialize` → `thread/start` or `thread/resume` → `turn/start`), then layer optional methods (approvals, skills, MCP, config APIs) as product needs grow.
