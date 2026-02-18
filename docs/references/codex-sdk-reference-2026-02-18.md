---
title: "Codex SDK and automation reference (2026-02-18)"
date: 2026-02-18
type: reference
tags: [codex, codex-sdk, cli, automation, security, integrations]
sources:
  - https://developers.openai.com/codex/sdk
  - https://developers.openai.com/codex/noninteractive
  - https://developers.openai.com/codex/cli
  - https://developers.openai.com/codex/cli/features
  - https://developers.openai.com/codex/cli/reference
  - https://developers.openai.com/codex/config-basic
  - https://developers.openai.com/codex/config-advanced
  - https://developers.openai.com/codex/config-reference
  - https://developers.openai.com/codex/security
  - https://developers.openai.com/codex/auth
  - https://developers.openai.com/codex/rules
  - https://developers.openai.com/codex/mcp
  - https://developers.openai.com/codex/skills
  - https://developers.openai.com/codex/github-action
  - https://developers.openai.com/codex/guides/agents-sdk
  - https://developers.openai.com/codex/app-server
  - https://developers.openai.com/codex/models
  - https://developers.openai.com/codex/pricing
  - https://developers.openai.com/codex/changelog
  - https://developers.openai.com/codex/cloud/internet-access
  - https://developers.openai.com/codex/integrations/github
  - https://developers.openai.com/codex/integrations/slack
  - https://developers.openai.com/codex/integrations/linear
  - https://openai.com/index/codex-now-generally-available/
  - https://openai.com/index/introducing-the-codex-app/
---

# Codex SDK: comprehensive reference

## Scope and date

This document summarizes official Codex SDK and Codex automation surfaces as of **February 18, 2026**.

## What the Codex SDK is

Codex SDK is the programmatic interface for controlling local Codex agents from code.

- Package: `@openai/codex-sdk`
- Language: TypeScript (currently)
- Runtime requirement: Node.js 18+
- Core workflow:
  - `new Codex()`
  - `startThread()`
  - `thread.run(prompt)`
  - `resumeThread(threadId)` for continuation

The SDK is intended for:

- CI/CD automation
- internal engineering tooling
- embedding Codex in custom applications

## SDK vs other Codex automation options

Codex now has several automation layers. Practical split:

### 1. CLI non-interactive mode (`codex exec`)

Best for scriptable shell pipelines.

- Streams progress to `stderr`
- final message to `stdout`
- JSONL mode: `--json`
- schema-constrained output: `--output-schema`
- save final output: `--output-last-message`
- resumable: `codex exec resume --last` or by session id

### 2. Codex SDK (`@openai/codex-sdk`)

Best for application-level orchestration in TypeScript.

- thread lifecycle in code
- better fit than shelling out when embedding in services

### 3. Codex GitHub Action (`openai/codex-action@v1`)

Best for GitHub-native workflows.

- installs CLI
- runs `codex exec`
- supports patch/review workflow patterns inside Actions

### 4. Codex App Server

Best for deep product integrations.

- protocol with request/response/notification events
- open-source implementation available
- supports approvals, history, streamed events, auth in richer clients

### 5. Codex as MCP server (`codex mcp-server`)

Best for multi-agent setups where another agent framework calls Codex as a tool.

## Authentication model

From official docs:

- OpenAI auth supports two methods:
  - ChatGPT login (subscription-based usage)
  - API key login (usage-based access)
- Codex cloud requires ChatGPT login.
- CLI/IDE can use either.
- In `codex exec`, `CODEX_API_KEY` is supported for CI use.
- In managed environments, admins can enforce:
  - `forced_login_method = "chatgpt" | "api"`
  - optional forced ChatGPT workspace id

## Security model (important)

Core defaults and controls:

- Local default sandbox behavior is restrictive.
- Network is off by default in workspace-write flows unless enabled.
- Approval policy controls when Codex must stop for human confirmation.
- Sandbox mode controls file/network capabilities.

Key modes seen in docs:

- `read-only`
- `workspace-write`
- `danger-full-access` (explicitly high risk; use only in isolated environments)

Useful safety controls:

- Rules engine (`.rules`) for command-prefix allow/prompt/forbid behavior
- managed constraints via `requirements.toml` (policy bounds)
- environment filtering with `shell_environment_policy`
- optional OTel export with prompt redaction default behavior

Cloud internet access specifics:

- agent phase internet is blocked by default
- setup scripts can still access internet for dependency installation
- per-environment internet enabling/allowlisting is available
- prompt injection risk is explicitly called out in docs

## Configuration system

Primary files:

- user config: `~/.codex/config.toml`
- project config: `.codex/config.toml` (trusted projects only)
- optional system config: `/etc/codex/config.toml` (Unix)

Resolution precedence (high to low):

1. CLI flags and `--config`
2. selected profile (`--profile`)
3. project `.codex/config.toml` layers (nearest wins)
4. user config
5. system config
6. built-in defaults

Common high-value keys:

- `model`
- `approval_policy`
- `sandbox_mode`
- `web_search` (`cached` default, `live`, `disabled`)
- `model_reasoning_effort`
- `personality`
- `shell_environment_policy`
- `[features]` toggles

Advanced capabilities:

- profiles (`[profiles.<name>]`) for environment presets
- provider config (`model_provider`, `[model_providers.<id>]`)
- OSS/local provider mode via `--oss` (e.g., Ollama/LM Studio)
- MCP server definitions (`[mcp_servers.<id>]`)
- history persistence controls (`[history]`)
- optional OTel exporter configuration (`[otel]`)

## CLI capabilities relevant to SDK users

Even if using SDK, CLI behavior matters for ops parity:

- `codex` interactive TUI
- `codex exec` for unattended runs
- approval modes in-session (`/permissions`)
- model switching (`/model`)
- local code review (`/review`)
- cloud task flows (`codex cloud ...`)
- MCP management (`codex mcp ...`)
- feature flags (`codex features ...`)

Notable CLI safety tip from reference:

- avoid combining full automation with sandbox/approval bypass outside dedicated sandbox VMs

## MCP and Skills

MCP:

- Codex supports MCP in CLI and IDE extension.
- Can add stdio or streamable HTTP servers.
- Can mark server as required; startup failure can fail run.

Skills:

- Skill package = instructions + resources + optional scripts.
- explicit invocation (e.g., `/skills` or `$skill` mention)
- implicit invocation by description matching
- available across CLI/IDE/app

## Integrations

GitHub:

- `@codex review` in PR comments for cloud review workflow
- review behavior can be customized with repo `AGENTS.md` guidance
- docs note P0/P1 focus by default in GitHub review outputs

Slack:

- mention `@Codex` in thread/channel to start cloud task
- docs note thread context usage and policy/terms linkage

Linear:

- assign issue to Codex or mention `@Codex`
- Codex posts progress and completion summary with task link

## Models and pricing snapshot (date-sensitive)

As of 2026-02-18 docs:

- Codex docs recommend `gpt-5.3-codex` as primary coding model.
- `gpt-5.3-codex-spark` shown as faster preview option in some contexts.
- CLI/config examples still include `gpt-5.2`/`gpt-5-codex` variants.

Pricing/plan statements are volatile:

- Codex included in Plus/Pro/Business/Edu/Enterprise
- limited-time Free/Go messaging appears in current docs
- API and credits details should always be rechecked on pricing page before implementation or budgeting decisions

## Changelog status

Codex changelog currently includes entries through **February 18, 2026**.

## Implementation guidance for this repository (`coda`)

Given current architecture notes in this repo (CLI subprocess strategy), a pragmatic adoption path:

1. Keep subprocess-first integration (`codex exec`) for near-term reliability and language agnosticism.
2. Add SDK adapter only where typed event streams or thread lifecycle in-app become necessary.
3. Keep sandbox/approval defaults strict in local and CI workflows.
4. Add explicit `.codex/config.toml` and `AGENTS.md` project guidance early for predictable behavior.
5. Gate any `danger-full-access` usage behind isolated runners plus policy review.

## Quick command index

```bash
# Install CLI
npm i -g @openai/codex

# Non-interactive automation
codex exec --json "triage this repository"

# Resume previous non-interactive run
codex exec resume --last "continue"

# Install SDK (TypeScript)
npm install @openai/codex-sdk

# Minimal SDK usage sketch
# import { Codex } from "@openai/codex-sdk"
# const codex = new Codex()
# const thread = codex.startThread()
# const result = await thread.run("your task")
```

