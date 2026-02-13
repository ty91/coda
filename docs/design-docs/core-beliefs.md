---
title: "Core Beliefs — Coda's Golden Principles"
date: 2026-02-13
tags: [core-beliefs, principles, golden-rules, agent-first]
status: active
---

# Core Beliefs

These are Coda's golden principles — the invariants that guide all design decisions and code. Every feature, agent, and convention must satisfy these. When principles conflict, the resolution order is at the bottom of this document.

## From Harness Engineering

1. **Agent legibility is the goal.** Every aspect of the system — code, docs, logs, metrics — is optimized for agent navigation, not just human reading. If agents can't find it, it doesn't exist.
   - *Litmus test*: Can a new agent navigate from CLAUDE.md to understanding how X works, implement a change, validate it, and verify performance — without asking a human?

2. **The repository is the system of record.** All institutional knowledge lives in versioned, repo-local files. Knowledge in Slack threads, Google Docs, or people's heads is invisible to agents and therefore invisible to the system.

3. **Enforce invariants, not implementations.** Define what must be true (linters, tests, structural checks). Let agents choose how to satisfy those constraints. Freedom within boundaries.

4. **Lint error messages are agent prompts.** Every error includes remediation instructions written for agents to consume and act on. Not just "wrong" — "wrong, here's how to fix it."
   - *Example*: Bad: `Error: Layer violation detected`. Good: `ERROR: plans/ui/PlanEditor.tsx imports from plans/repo/PlanStore.ts — UI layer cannot import directly from Repo layer. FIX: Move data access to plans/service/PlanService.ts. See: docs/design-docs/architecture-overview.md`

5. **Entropy management is continuous.** Technical debt is a high-interest loan paid down in every PR, not a quarterly cleanup project.

## From Compound Engineering

6. **Every unit of work compounds.** Bug fixes capture prevention strategies. Patterns become skills. Solutions become searchable institutional memory. Nothing is done once and forgotten.

7. **The 50/50 rule.** Invest half of effort in system improvement. Review agents, skills, lint rules, and documentation are as important as features. System investment has exponential returns.
   - *Operationalized*: Classify work as feature vs. system improvement at planning time. Track the ratio explicitly.

8. **Commands compose agents; agents don't know about each other.** Orchestration lives in commands, not in agents. Each agent is a focused specialist. Commands wire them together.

9. **Plans are the new code.** The plan document is the primary artifact. It's reviewed, versioned, annotated, and referenceable. Code is an output of the plan, not the other way around.

10. **Teach the system, don't do the work.** Time spent improving agent context pays exponential dividends. Time spent typing code solves only the immediate task.

## From UX Design

11. **Frictionless by default.** Zero-flag commands work out of the box. Smart defaults everywhere. Progressive disclosure — complexity is hidden until needed.

12. **Ambient awareness.** The system comes to you (status bar, system tray, Slack digest). You don't have to actively monitor.

13. **Progressive trust.** Start supervised. Build a track record. Earn autonomy. Trust is given, never assumed.

14. **Respect attention.** Every notification costs focus. Batch, summarize, prioritize.

## From Architecture

15. **Local-first.** Plans and solutions are markdown files in git. Operational state is SQLite. No cloud dependency for core functionality.

16. **Extensible.** Custom agents, skills, and hooks are dropped into the project. The system discovers and integrates them.

17. **Secure by default.** Agents are sandboxed. Secrets never touch the repo. Destructive actions always require human approval.

18. **Independently shippable milestones.** Each milestone is a useful product on its own.

## The Core Constraint

> "Humans steer, agents execute, and every unit of work compounds into the next."

Every design decision must pass this test. If a feature doesn't satisfy this constraint, it doesn't belong in Coda.

## Resolution Order

When principles conflict:

1. **Safety first** — secure by default, human approval for destructive actions
2. **Agent legibility** — if agents can't use it, it fails the core constraint
3. **Compounding** — features that don't compound are one-time costs, not investments
4. **Simplicity** — frictionless defaults, convention over configuration
5. **Velocity** — fast iteration within the above constraints
