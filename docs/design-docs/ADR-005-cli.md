---
title: "ADR-005: CLI Architecture"
date: 2026-02-14
status: accepted
adr_number: "005"
tags: [adr, architecture, cli, commander, compound-loop]
---

# ADR-005: CLI Architecture

## Status
Accepted

## Context

The CLI is the primary interface for engineers interacting with Coda. It must support the compound engineering loop (plan -> work -> review -> compound), be extensible with custom agents and skills, and integrate tightly with the agent orchestrator.

## Decision: Command Groups Mapping to the Compound Loop

### Command Structure

```
coda
├── plan <description>         # /workflows:plan -- create a plan
├── brainstorm <topic>         # /workflows:brainstorm -- explore ideas
├── work                       # /workflows:work -- execute approved plan
├── review [PR#]               # /workflows:review -- multi-agent review
├── compound                   # /workflows:compound -- document solution
├── lfg <description>          # Full pipeline: plan -> work -> review -> compound
│
├── triage                     # Interactive finding triage
├── resolve                    # Auto-resolve triaged findings
│
├── status                     # Show current plan/agent status
├── plans                      # List plans (active, completed)
│   ├── list                   # List all plans
│   ├── show <id>              # Show plan details
│   ├── approve <id>           # Approve a plan
│   └── reject <id>            # Reject a plan with feedback
│
├── agents                     # Agent management
│   ├── list                   # List available agents
│   ├── status                 # Show running agents
│   └── kill <id>              # Stop a running agent
│
├── tracker                    # Issue tracker commands
│   ├── sync                   # Trigger manual sync
│   ├── link <plan> <issue>    # Link a plan to a tracker issue
│   └── status                 # Show sync status
│
├── config                     # Configuration management
│   ├── init                   # Initialize Coda in a project
│   ├── set <key> <value>      # Set config value
│   └── show                   # Show current config
│
├── alert                      # Alert management
│   ├── test                   # Send a test alert
│   └── config                 # Configure alert preferences
│
└── skill                      # Skill management
    ├── list                   # List available skills
    └── run <skill> [args]     # Run a specific skill
```

### Plugin and Skill System

Skills are markdown files that define domain expertise. They live in:
1. `.coda/skills/` -- project-specific skills
2. `~/.config/coda/skills/` -- global user skills
3. Built-in skills shipped with Coda

A skill file:

```markdown
---
name: our-design-system
description: Design system patterns and conventions
triggers: [ui, design, component, styling]
---

# Our Design System

## Colors
- Primary: #4F46E5
...
```

The `triggers` field tells the orchestrator when to auto-load this skill into agent context. When a plan mentions "UI" or "component", the design system skill is automatically included.

### Extension Points

1. **Custom agents**: Drop an agent definition (markdown with system prompt + tool permissions) into `.coda/agents/`. The orchestrator discovers and routes to them.
2. **Custom skills**: Drop a skill file into `.coda/skills/`. Loaded based on trigger matching or explicit invocation.
3. **Hooks**: Shell commands that run at lifecycle points (pre-plan, post-work, pre-review, post-compound). Defined in `.coda/config.yaml`:

```yaml
hooks:
  post-work:
    - command: "pnpm lint"
      on_failure: block    # block | warn | ignore
    - command: "pnpm typecheck"
      on_failure: block
  post-compound:
    - command: "pnpm run docs-lint"
      on_failure: warn
```

### Configuration Layers

Configuration is resolved with precedence (highest first):
1. CLI flags (`--agent claude`)
2. Environment variables (`CODA_AGENT=claude`)
3. Project config (`.coda/config.yaml`)
4. User global config (`~/.config/coda/config.yaml`)
5. Built-in defaults

## Consequences

- **Pro**: Command structure mirrors the compound loop. New users can learn `coda plan`, `coda work`, `coda review`, `coda compound` and immediately be productive.
- **Pro**: Skill and hook systems allow deep customization without forking Coda.
- **Pro**: Configuration layering follows established CLI conventions (12-factor app style).
- **Con**: The command surface area is large. Mitigation: `coda lfg` is the "just do everything" command for users who don't want to learn subcommands.
- **Con**: Skill trigger matching could produce false positives (loading irrelevant skills). Mitigation: triggers are opt-in and can be tuned. The agent can also ignore irrelevant context.
