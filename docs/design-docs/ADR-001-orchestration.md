---
title: "ADR-001: Agent Orchestration Strategy"
date: 2026-02-14
status: accepted
adr_number: "001"
tags: [adr, architecture, orchestration, agents]
---

# ADR-001: Agent Orchestration Strategy

## Status
Accepted

## Context

Coda manages two AI agent backends with different strengths:
- **Claude Code**: Excels at general reasoning, planning, research, code review, and communication tasks.
- **Codex**: Excels at coding, debugging, troubleshooting, and structured code reviews (per user preference in requirements).

The system needs to:
1. Route tasks to the appropriate agent based on task type.
2. Support parallel execution of independent subtasks (e.g., multiple review agents).
3. Handle agent failures gracefully (timeouts, errors, inconsistent output).
4. Allow the compound loop (plan -> work -> review -> compound) to compose these agents.

## Options Considered

### Option A: Centralized Orchestrator (chosen)

A single orchestrator component owns all task routing, scheduling, and state management. Agents are stateless workers invoked by the orchestrator.

```
                ┌───────────────────┐
                │   Orchestrator    │
                │                   │
                │  ┌─────────────┐  │
                │  │   Router    │  │   Routes by task type
                │  └──────┬──────┘  │
                │         │         │
                │  ┌──────▼──────┐  │
                │  │  Scheduler  │  │   Manages concurrency
                │  └──────┬──────┘  │
                │         │         │
                │  ┌──────▼──────┐  │
                │  │  State Mgr  │  │   Tracks progress
                │  └──────┬──────┘  │
                └─────────┼─────────┘
                    ┌─────┴─────┐
                    ▼           ▼
              ┌──────────┐ ┌──────────┐
              │  Claude   │ │  Codex   │
              │  Code     │ │          │
              └──────────┘ └──────────┘
```

### Option B: Decentralized Peer Agents

Agents communicate directly with each other. Claude can delegate to Codex and vice versa. No central coordinator.

### Option C: Hybrid (orchestrator + agent-to-agent)

A coordinator for high-level flow, but agents can spawn sub-agents directly (like Claude Code's existing subagent system).

## Decision

**Option A: Centralized Orchestrator** with a clean extension point for Option C in the future.

## Rationale

- **Predictability**: A centralized orchestrator makes the system debuggable. Every task routing decision is logged in one place. When something fails, there's one place to look.
- **Human oversight**: The compound engineering philosophy requires that plans are the unit of work. The orchestrator is where plan state lives. Decentralized agents would fragment plan state across processes.
- **Simplicity for Milestone 1**: A centralized model is simpler to build and test. We can introduce agent-to-agent delegation later without breaking the existing model.
- **Why not Option B**: Fully decentralized agents create coordination problems (deadlocks, redundant work, lost state). The harness engineering post explicitly warns that "corrections are cheap, and waiting is expensive" -- but only when you can track what's happening.
- **Why not Option C immediately**: The hybrid model is the eventual target (Claude Code already does subagent spawning). But starting there adds complexity before we've validated the core loop. We'll migrate to Option C when we have enough usage data to know which agent-to-agent patterns are worth encoding.

## Task Routing Rules

```
Task Type           -> Agent        Reasoning
────────────────────────────────────────────────────────
Planning            -> Claude Code  Requires broad reasoning, research synthesis
Coding              -> Codex        Specialized for implementation
Debugging           -> Codex        Better at root cause analysis in code
Code Review         -> Codex        Structured review is a Codex strength
General Research    -> Claude Code  Broad knowledge, web search
Documentation       -> Claude Code  Writing quality
Architecture        -> Claude Code  Systems thinking
Test Writing        -> Codex        Close to implementation
Brainstorming       -> Claude Code  Creative, divergent thinking
```

These mappings are configurable per-project in `.coda/config.toml` under `agent.routing`.

## Failure Handling

1. **Timeout**: Each agent invocation has a configurable timeout (default: 30 minutes for work tasks, 5 minutes for review). On timeout, the orchestrator kills the subprocess, logs the partial output, and emits an alert.
2. **Error exit**: If the agent process exits non-zero, the orchestrator captures stderr, logs it, and either retries (up to 2 retries for transient failures) or escalates to the human.
3. **Inconsistent output**: The orchestrator validates agent output against expected schemas (e.g., a plan must have YAML frontmatter, a review must have prioritized findings). Malformed output triggers a retry with explicit formatting instructions.
4. **Escalation**: After retries are exhausted, the orchestrator emits an `escalation_needed` alert and pauses the pipeline. The human can intervene via CLI, UI, or Slack.

## Consequences

- **Pro**: Clear debugging story. Every agent invocation is a logged subprocess with captured stdin/stdout/stderr.
- **Pro**: Easy to add new agent providers (e.g., a future GPT-5 agent) -- implement the provider interface, add routing rules.
- **Con**: The orchestrator is a single point of failure. If it crashes, all in-flight agent runs are orphaned. Mitigation: persist run state to SQLite so runs can be resumed.
- **Con**: Centralized routing may become a bottleneck if task types proliferate. Mitigation: routing rules are data-driven (config file), not hard-coded.
