---
title: Agent Workflows
date: 2026-02-14
status: draft
tags: [agents, workflows, harness-engineering, operations]
---

# Agent Workflows

Operational patterns for agent execution, validation, and human interaction. These
encode the *why* behind each workflow -- design rationale that should survive even as
specific tooling evolves.

Source: `docs/perspectives/harness-engineering-perspective.md`

---

## 1. Self-Validation Loop

A seven-step protocol that makes agents self-correcting before any human sees their
work, reducing human review to judgment calls rather than mechanical checking.

1. **Understand current state.** Read relevant code, tests, docs, and metrics. Acting
   without understanding the baseline produces conflicts and regressions.
2. **Make the change.**
3. **Validate against the plan.** Run the full automated suite. The question is not
   "does it compile?" but "does it satisfy what was intended?"
4. **Self-review the diff.** Catches obvious mistakes (unused imports, forgotten error
   handling, pattern inconsistencies). Cheap and eliminates noise from later stages.
5. **Request specialized agent reviews.** Security, performance, and architecture
   reviewers examine the change in parallel to avoid sequential bottlenecks.
6. **Iterate until reviewers are satisfied.** Keep going until feedback is clean,
   avoiding the anti-pattern of shipping with known comments unresolved.
7. **Escalate to human only for judgment.** Ambiguous requirements, taste calls,
   production impact. Everything else resolves without human involvement.

A mediocre change with strong validation converges on quality faster than a brilliant
change with no feedback loop. Validation is part of the work itself, not a gate after it.

---

## 2. Bug Reproduction Cycle

A six-step evidence-based loop that makes agent bug fixes *auditable* -- a human can
verify correctness in seconds rather than minutes.

1. **Reproduce the bug.** Trigger the failure, capture evidence (logs, traces, screenshots).
2. **Record the failure state.** Preserve what "broken" looks like before any changes.
3. **Implement the fix.**
4. **Validate the fix.** Same reproduction steps, now showing correct behavior.
5. **Record the resolution.** A second record demonstrating the fixed state.
6. **Include both records in the PR.** Before/after evidence a reviewer evaluates at a glance.

This converts a 15-minute manual reproduction into a 30-second visual review. The
human's role shifts from "can I reproduce this?" to "does this look right?" The
recordings also serve as regression documentation if the bug recurs.

---

## 3. Observability-Driven Prompts

Embed performance constraints directly in task prompts so agents can self-verify
against measurable thresholds.

Without queryable metrics, performance prompts are aspirational. When agents can query
actual measurements, compare to thresholds, and iterate until they pass, the same
prompts become enforceable contracts. This closes the feedback loop *within* the agent's
execution -- no human needed to judge whether performance regressed.

Every user-facing flow should have a documented performance budget that agents can query.

---

## 4. Programmatic UI Validation

UI correctness cannot be verified through unit tests alone. Visual regressions,
interaction bugs, and layout problems are visible only when the application is rendered
and interacted with. Agents that can launch the app, navigate programmatically, capture
state, and compare before/after results validate UI changes with the same rigor they
apply to backend logic.

This is not about replacing human visual review -- it gives agents the ability to catch
obvious regressions before a human ever looks. The DOM must use semantic markup and
testable landmarks so agents can reliably identify and interact with UI elements.

---

## 5. Agent-Queryable Observability

Dashboards designed for humans are insufficient for agents. An agent cannot "look at a
graph." Observability data must be available through programmatic interfaces --
structured logs, queryable metrics, correlated traces -- so agents incorporate real
measurements into decisions without human intermediation.

When agents have access to logs, metrics, and traces, prompts like "ensure startup
stays under budget" become tractable. Without it, performance work requires a human
staring at dashboards.

---

## 6. Alert SLAs Prevent Human Bottleneck

Without response time bounds on alerts, agents that need human input block indefinitely.
The human does not realize an agent is waiting; the agent cannot proceed. Result: wasted
capacity and delayed delivery.

Time-bounded alerts with progressive escalation ensure human attention is directed where
needed *when* needed. The goal is not to pressure faster responses but to make the cost
of delayed decisions visible so the system can adapt (e.g., queue alternative work).

---

## 7. Escalation Criteria

Without explicit criteria, agents either escalate too often (noise) or too rarely
(silent bad decisions). Six conditions define when agents stop and request human judgment:

1. **Ambiguous requirements.** Multiple valid interpretations; agent cannot determine
   which is intended.
2. **Multiple valid approaches with different tradeoffs.** Agent can articulate options
   but selecting between them requires product or business judgment.
3. **Production impact.** Any change affecting running systems or real users.
4. **Architectural boundary changes.** Adding layers, changing dependency directions,
   introducing cross-cutting concerns -- these alter system-wide invariants.
5. **Security-sensitive changes.** Authentication, authorization, and data handling
   carry risk that exceeds what automation should absorb alone.
6. **Agent is stuck.** After repeated iterations without progress, escalate rather than
   thrash. Continued attempts waste compute and may introduce new problems.

Escalation is the pressure valve that makes autonomy safe. The criteria define the
boundary between "proceed with confidence" and "ask for help," making it inspectable
and tunable over time.

---

## 8. Cleanup Agent Taxonomy

Entropy management requires four specialized cleanup agents running on a regular cadence
(daily or per-PR), producing many small corrections instead of occasional massive
refactors.

- **Pattern deviation scanner.** Flags code that diverges from golden principles. Agents
  replicate bad patterns as enthusiastically as good ones; a scanner catches drift
  *before* it propagates into copies that are expensive to fix.

- **Quality grade updater.** Re-evaluates per-domain, per-layer quality scores against
  current code. Manually maintained grades go stale immediately; automated scoring keeps
  the quality map honest so improvement work targets accurate data.

- **Dependency audit.** Catches unused dependencies, circular imports, and layer
  violations that slipped through primary checks. Dependency health degrades silently;
  individual violations compound into tangled graphs that make changes unpredictable.

- **Doc gardener.** Diffs documentation against code behavior and opens fix-up PRs.
  Stale docs cause *more* agent errors than missing docs because agents trust what they
  read. Regular gardening keeps the documentation agents rely on accurate.

Periodic cleanup sprints get deprioritized and entropy compounds until cleanup becomes
a crisis. Continuous small corrections keep the codebase in steady state.

---

## 9. Technical Debt Tracker

Debt tracked as a structured, queryable artifact lets agents factor it into planning.
Each item carries four fields:

- **Description.** What the debt is and where it lives.
- **Impact score.** How much it slows future work in the affected area.
- **Remediation cost.** Estimated effort to eliminate, enabling investment/benefit tradeoffs.
- **Interest rate.** How fast the debt compounds if unfixed. High-interest debt spreads
  as other code adapts to work around it, creating secondary debt.

Without structured tracking, debt is invisible to agents or vague ("refactor X someday").
These fields make debt *actionable*: an agent planning work in a high-debt area can
include remediation in the implementation rather than deferring to a cleanup sprint.
The interest rate field is key -- it distinguishes stable debt (can wait) from debt that
is actively getting worse (fix now).

Philosophy: continuous small payments beat periodic large payments.
