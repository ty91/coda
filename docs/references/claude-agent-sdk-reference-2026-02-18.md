---
title: "Claude Agent SDK comprehensive implementation report (2026-02-18)"
date: 2026-02-18
type: reference
tags: [claude-agent-sdk, anthropic, agent-engineering, typescript, python, mcp, permissions]
sources:
  - https://platform.claude.com/docs/en/agent-sdk/overview
  - https://platform.claude.com/docs/en/agent-sdk/quickstart
  - https://platform.claude.com/docs/en/agent-sdk/typescript
  - https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview
  - https://platform.claude.com/docs/en/agent-sdk/python
  - https://platform.claude.com/docs/en/agent-sdk/migration-guide
  - https://platform.claude.com/docs/en/agent-sdk/permissions
  - https://platform.claude.com/docs/en/agent-sdk/hooks
  - https://platform.claude.com/docs/en/agent-sdk/sessions
  - https://platform.claude.com/docs/en/agent-sdk/mcp
  - https://platform.claude.com/docs/en/agent-sdk/subagents
  - https://platform.claude.com/docs/en/agent-sdk/structured-output
  - https://platform.claude.com/docs/en/agent-sdk/secure-deployment
  - https://github.com/anthropics/claude-agent-sdk-typescript
  - https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md
  - https://github.com/anthropics/claude-agent-sdk-python
  - https://github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md
  - https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  - https://pypi.org/project/claude-agent-sdk/
---

# Claude Agent SDK: implementation-ready report

## Scope and date

This report captures the Claude Agent SDK surface as verified on **February 18, 2026**.

Goal: enable immediate implementation planning and scaffolding without re-reading all upstream docs.

## Executive summary

Claude Agent SDK is the renamed and expanded Claude Code SDK. It provides programmatic access to Claude Code agent behavior (codebase reasoning, file edits, shell commands, tools, MCP, subagents, hooks, session controls).

For this repository (TypeScript-first CLI + Tauri + Slack), the most practical path is:

1. Start with **TypeScript stable API** (`query()` + options + permission controls).
2. Design abstractions so **TypeScript V2 preview** session APIs can be swapped in later.
3. Keep Python SDK optional for non-core automations.
4. Implement strict permission and hook policy from day 1.

## Current naming, packages, and versions

### Renaming status

- Product/docs naming: **Claude Agent SDK**.
- Migration doc states old package names are replaced.

### Package names

- TypeScript package: `@anthropic-ai/claude-agent-sdk`
- Python package: `claude-agent-sdk`

### Verified current versions (2026-02-18)

- npm latest: **0.2.45**
- PyPI latest: **0.1.37**
- TypeScript changelog 0.2.45 notes parity with Claude Code **2.1.44** and adds `task_started` system message.
- Python changelog 0.1.37 notes bundled Claude CLI **2.1.44**.

## Architecture mental model

The SDK orchestrates Claude through the Claude Code runtime/CLI with streamed messages.

Core execution model:

1. Client submits prompt + options.
2. Agent loop decides tool calls (Read/Edit/Write/Bash/MCP/etc.).
3. Permission engine + hooks mediate tool execution.
4. Streaming messages emit assistant/tool/system/result events.
5. Final result includes stop reason and usage/cost metadata.

Treat it as an agent runtime wrapper, not only a plain text completion SDK.

## TypeScript API surface (stable)

## Install/runtime

- Node.js 18+
- `npm install @anthropic-ai/claude-agent-sdk`

## Primary entrypoint

- `query({ prompt, options })` (docs show prompt + optional options; returns async stream object with helper methods).

## Important options to plan for

From TypeScript reference, high-impact option groups include:

- Session/identity: `cwd`, `sessionId`, `resume`, `continue`, `maxTurns`
- Prompting: `systemPrompt`, append system prompts, model selection
- Permissions: `permissionMode`, `allowedTools`, `disallowedTools`, permission prompt tool name
- Hooks: `hooks` matcher/event definitions
- MCP: `mcpServers`
- Subagents: `agents`, include/exclude restrictions
- Output: message/result streaming handlers and structured output controls
- Environment and process control: env vars, abort signal, executable path overrides
- File safety: file checkpointing controls

## Stream/result types you should expect

Plan parsing for at least:

- Assistant messages (text + tool use blocks)
- User/system messages
- Tool result messages
- Final result variants (`success`, `error`, `max_turns`, etc.)
- Newer system events such as `task_started` (0.2.45+)

## Runtime control methods to wire

The stream/query object supports advanced control methods (per docs/changelog), including:

- Interruption/close patterns
- Permission decision control during execution
- MCP status inspection and reconnection/toggling APIs (added in recent releases)

Design wrappers so these controls are first-class in your service layer.

## TypeScript V2 preview (important)

Anthropic documents a V2 preview API with explicit client/session concepts (e.g., `createSdkClient`, `createQuery`, `run`).

Implication:

- Build your local abstraction now (`AgentRuntime`, `AgentSession`, `AgentRun`) so migration from stable `query()` to V2 session primitives is low-risk.
- Avoid leaking vendor-native message types past your runtime boundary.

## Python API surface

## Install/runtime

- Python 3.10+
- `pip install claude-agent-sdk`
- Bundled Claude CLI by default; optional custom CLI path.

## Two operational modes

1. `query()` for one-shot independent interactions.
2. `ClaudeSDKClient` for continuous conversation and advanced controls.

## Python strengths worth noting

- In-process custom tools via SDK MCP server helpers.
- Python function-based hooks.
- Strong async iterator model for stream handling.
- Recent additions: `thinking` config and `effort` controls.

Use Python only where this repo needs Python-native execution; otherwise keep core runtime in TypeScript.

## Permissions model (must implement deliberately)

Docs define explicit permission modes:

- `default` (normal interactive approvals)
- `acceptEdits` (auto-approve file edit operations)
- `bypassPermissions` (auto-approve all tools; high risk)
- `plan` (no tool execution, planning-only)

Key behavior:

- Hooks still run and can deny operations even in permissive modes.
- Declarative allow/deny rules can short-circuit prompt-heavy flows.

Recommended baseline for this project:

1. Default to `plan` for planning workflows.
2. Use `default` for normal interactive coding.
3. Allow `acceptEdits` only in isolated workspaces.
4. Disallow `bypassPermissions` outside explicit sandbox/test environments.

## Hooks and lifecycle controls

Hook docs show event-driven extension points around tool use and subagent lifecycle.

Recent events/features (from changelogs/docs) include:

- `PermissionRequest`
- `Notification`
- `SubagentStart` / `SubagentStop`
- `TeammateIdle` / `TaskCompleted` (TypeScript additions)
- `PostToolUseFailure`

Practical use in this repo:

- Enforce shell command policy (`rm -rf`, git safety rules, network guards).
- Add audit logs per hook event.
- Inject additional context on denied operations.
- Gate risky tool calls by environment.

## Sessions and state management

Sessions docs include resume/fork/replay patterns.

Model your runtime to support:

- persistent `session_id`
- resume existing sessions
- optional branch/fork of session state
- replay for deterministic debugging

Checkpointing:

- SDK supports file checkpointing and rewinds (noted in changelogs/API).
- Use this for rollback flows in autonomous runs.

## MCP integration and tooling

MCP docs + SDK helpers support both external and in-process tool servers.

Patterns:

- Use SDK helper-defined tools for low-latency internal tools.
- Use external MCP servers for independent services.
- Mix both in one run.
- Parse MCP server status and reconnect/toggle on failures.

For this repository, place MCP adapters in a dedicated runtime provider package so UI/service layers are isolated from transport details.

## Subagents

Subagents docs describe specialized agents with their own instructions and tool constraints.

Common controls:

- file-based subagent definitions and/or runtime definitions
- scoped tools/permissions
- selective routing by task type

Guidance:

- Keep initial rollout single-agent.
- Add subagents only after baseline telemetry and permission policies are stable.

## Structured outputs

Structured output docs + changelog fixes indicate the feature is production-relevant but evolving.

Recommendation:

- Use structured outputs at strict boundaries only (e.g., plan schema, patch schema, review schema).
- Always keep fallback parsing for malformed/empty assistant messages.

## Migration notes from Claude Code SDK

Migration guide indicates rename-focused migration.

TypeScript migration core:

1. Replace old package dependency with `@anthropic-ai/claude-agent-sdk`.
2. Update imports.
3. Keep behavior mostly equivalent for baseline flows.

Python migration core:

1. Replace `claude-code-sdk` with `claude-agent-sdk`.
2. Update imports.
3. Validate options names and defaults in integration tests.

## Security and deployment posture

Secure deployment and permissions docs imply this default posture:

1. Treat SDK runners as privileged compute.
2. Isolate working directories per task.
3. Enforce declarative permission rules.
4. Keep hooks as defense-in-depth.
5. Restrict network and shell capabilities in production.
6. Log every tool invocation with session/run IDs.

## Implementation blueprint for this repository

This blueprint aligns to the documented architecture rule:
Types -> Config -> Repo -> Service -> Runtime -> UI

## Phase 0: boundary contracts

Define internal contracts (no vendor type leakage):

- `AgentRunRequest`
- `AgentRunEvent`
- `AgentRunResult`
- `AgentPermissionPolicy`
- `AgentSessionRef`

## Phase 1: runtime provider (TypeScript)

Create a runtime provider wrapping Claude Agent SDK:

- `startRun(request)`
- `streamEvents(runId)`
- `respondToPermission(runId, decision)`
- `resumeSession(sessionRef)`

Map raw SDK messages into stable internal event enums.

## Phase 2: policy + hooks package

Implement centralized policy logic:

- static allow/deny tool rules
- environment-aware mode selection (`plan/default/acceptEdits`)
- hook handlers for shell and file operations
- policy audit logs

## Phase 3: persistence and traceability

Persist:

- run metadata
- session IDs
- permission decisions
- tool execution log
- final result payload and stop reason

## Phase 4: UI + Slack integration

Expose runtime capabilities:

- stream tokens/messages
- show permission prompts
- show tool timeline
- approve/deny interactions
- resume prior run/session

## Phase 5: structured workflows

Add schema-bound flows:

- planning schema output
- code review schema output
- task handoff schema output

## Validation checklist before production use

1. Permission-deny path tested for Bash, Edit, Write, MCP tool calls.
2. Hook failure behavior tested (does run fail closed?).
3. Session resume tested across process restart.
4. Large-output command handling tested (memory behavior).
5. Structured-output failure fallback tested.
6. MCP server disconnect/reconnect tested.
7. Stop reason and cost accounting persisted.

## Known risks and mitigation

- Rapid SDK changes: pin versions and track changelog each upgrade.
- Message schema drift: normalize at runtime boundary.
- Permission bypass misuse: enforce environment-based hard block.
- Long-running subagents: enforce max turns/timeouts and cancellation.
- Tool output explosion: truncate and store full raw logs separately.

## Recommended immediate next implementation steps

1. Add TypeScript provider skeleton with event normalization.
2. Add permission policy module with default `plan/default` split.
3. Add integration test harness with mocked risky commands.
4. Add one end-to-end run path surfaced in CLI first, then UI.

## Source index

Primary documentation:

- https://platform.claude.com/docs/en/agent-sdk/overview
- https://platform.claude.com/docs/en/agent-sdk/quickstart
- https://platform.claude.com/docs/en/agent-sdk/typescript
- https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview
- https://platform.claude.com/docs/en/agent-sdk/python
- https://platform.claude.com/docs/en/agent-sdk/migration-guide
- https://platform.claude.com/docs/en/agent-sdk/permissions
- https://platform.claude.com/docs/en/agent-sdk/hooks
- https://platform.claude.com/docs/en/agent-sdk/sessions
- https://platform.claude.com/docs/en/agent-sdk/mcp
- https://platform.claude.com/docs/en/agent-sdk/subagents
- https://platform.claude.com/docs/en/agent-sdk/structured-output
- https://platform.claude.com/docs/en/agent-sdk/secure-deployment

Official repositories and package metadata:

- https://github.com/anthropics/claude-agent-sdk-typescript
- https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md
- https://github.com/anthropics/claude-agent-sdk-python
- https://github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md
- https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- https://pypi.org/project/claude-agent-sdk/
