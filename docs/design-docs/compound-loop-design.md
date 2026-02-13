---
title: Compound Loop Design
date: 2026-02-14
status: draft
tags: [compound-engineering, compound-loop, knowledge-management]
---

# Compound Loop Design

Design rationale for compound loop behaviors that shape how Coda enforces learning, structures review, and guides users toward greater agent autonomy. This document captures the "why" behind four key design areas extracted from the compound engineering perspective.

These four areas are interconnected. Compound step enforcement (1) feeds the specialized review roster (2) by surfacing recurring gaps. The review ecosystem builds the safety nets that make the Stage 2-to-3 transition (3) possible. And behavioral stage inference (4) ensures the system adapts its guidance to each user's actual readiness rather than imposing a fixed progression.

## 1. Compound Step Enforcement

The compound step is where learning happens. Without structural enforcement, teams consistently skip it under delivery pressure and plateau within months. Four complementary strategies ensure compounding remains part of the workflow rather than an afterthought.

**Gate merges on compound capture.** Merge is the natural moment when developers feel "done." Prompting for a compound insight at merge time catches learning at peak freshness. The prompt can be dismissed, but the dismissal is logged. This makes skipping a conscious, visible choice rather than a silent default.

**Auto-extract candidates.** Developers often fail to recognize compoundable insights in their own work. After each review cycle, the system should identify candidates automatically: new patterns, bugs that reveal missing lint rules, architectural decisions worth documenting. Presenting these as a confirmation checklist reduces the cognitive cost of compounding from "think of what to capture" to "confirm or skip."

**Compound score tracking.** What gets measured gets managed. A visible ratio of compound-inclusive cycles to total cycles gives teams a feedback signal on their own learning discipline. Teams below 30% are leaving the majority of their institutional learning uncaptured.

**Gentle reminders after idle streaks.** If several work cycles pass without compounding, a nudge makes the gap visible. Not a blocker, because forced compounding produces low-quality artifacts, but visible enough to prevent extended drift.

These strategies form a gradient from soft (reminders) to structural (merge gates). The system should apply all four simultaneously because they reinforce each other: auto-extraction makes gate prompts easier to answer, and the compound score motivates engagement with reminders.

The key design tension is between friction and quality. Blocking merges entirely on compound capture would maximize capture rate but breed resentment and low-quality entries. Allowing silent skips would minimize friction but produce near-zero compounding. The chosen approach -- visible, logged dismissal -- threads the needle: the system expresses its expectation without becoming an obstacle.

The compound step should also be fast. If it takes more than two minutes, users will treat it as overhead rather than investment. Auto-extraction is the primary lever for keeping it fast: present pre-identified insights for confirmation rather than asking users to generate insights from scratch.

## 2. Specialized Review Over Generalism

A single generalist reviewer tries to be good at everything and ends up mediocre at all of it. The case for specialized review agents is grounded in what categories of issues generalists systematically miss.

**Why specialization beats generalism.** Each review domain requires a different mental model. Security review requires modeling injection vectors and trust boundaries. Performance review requires reasoning about query plans and algorithmic complexity. Architecture review requires tracking dependency direction across files. A generalist reviewer context-switches between these models on every file, losing depth. A specialist holds one model and applies it thoroughly. This is not just a theoretical preference -- it is an empirical observation from running both approaches on the same codebase.

**What generalists miss.** Generalists focus on local code correctness and miss systemic concerns:
- Security issues like injection vectors, because generalists focus on logic flow
- Performance problems like N+1 queries, because you need to model query plans, not just read code
- Architectural drift like dependency direction violations, because these compound silently and only surface during painful refactors
- Cross-file anti-patterns that spread through copy-paste, because generalists review line-by-line
- Concurrency issues like frontend race conditions, because modeling async event ordering requires dedicated attention

**When to add a new reviewer.** A new specialist reviewer is justified when a category of issue has been caught manually more than once. The existence of repeated manual catches proves both that the category matters and that existing reviewers miss it. In practice, the frontend race condition reviewer caught three issues in its first run that generic reviewers had missed for weeks.

The implication for Coda is that the review agent roster should grow organically from real gaps, not from a top-down taxonomy. Start with a small core set. When the compound step repeatedly captures the same category of missed issue, that is the signal to create a new specialist. This connects compound enforcement (Section 1) directly to review ecosystem growth -- the compound step feeds the review roster.

## 3. The Stage 2 to 3 Transition

Of all stage transitions, moving from Stage 2 (approve every change) to Stage 3 (review PRs, not individual edits) is where most developers plateau. This is the single highest-leverage point in the adoption curve. This transition deserves disproportionate design investment because it represents a fundamental shift in mental model.

**The mental model shift.** Stage 2 developers watch code being written. Stage 3 developers review finished PRs. The shift is from "supervise the process" to "evaluate the outcome." This feels deeply uncomfortable because it requires trusting that the combination of a detailed plan and automated review will catch problems that line-by-line watching would have caught.

**Why it feels terrifying.** Developers have spent their careers building intuition through reading code as it is written. Letting go of that real-time feedback loop triggers loss of control anxiety. The fear is rational: without sufficient safety nets, delegating does lose information. The system must acknowledge this fear by providing genuinely adequate safety nets before asking users to change their behavior.

**Trust-building strategies.** Trust must be earned through demonstrated reliability, not argued into existence:

1. **Plan detail as proxy for control.** Plans must be detailed enough (requirements, approach, edge cases, affected files) that the developer can reason about correctness at the plan level, without needing to watch each line.
2. **Automated review as safety net.** Review agents run after implementation, providing a verification layer that exists independently of human attention.
3. **Visible catches.** The system explicitly shows when review agents catch issues that would have been caught manually. This demonstrates that the safety net works, not in the abstract, but on the developer's own code.
4. **Iteration over persuasion.** Confidence builds through successful iterations. Each cycle where the plan-plus-review workflow catches what matters makes the next delegation easier.

The UI should make the plan-to-PR-to-review flow feel transparent and safe. Showing the plan being executed, the review agents running, and the findings as they appear builds the ambient awareness that replaces line-by-line watching.

This transition is also where the compound step proves its value most clearly. A developer at Stage 2 who sees the system catching and documenting real issues through automated review -- and who sees those learnings reused in subsequent cycles -- develops the evidence-based confidence needed to let go of line-by-line oversight. The compound loop does not just capture knowledge; it builds the trust that enables higher stages of autonomy.

## 4. Behavioral Stage Inference

Rather than asking users to self-declare their stage or following rigid rules, the system should infer a user's current stage from their observable behavior patterns.

**Why behavior over declaration.** Users self-assess poorly. A developer who says "I trust agents" but approves every file change is behaviorally at Stage 2, not Stage 4. Observable behavior is a more reliable signal than stated preference because it reflects actual comfort level, not aspirational identity. The gap between stated and revealed preference is especially wide in areas involving trust and control.

**Why behavior over rigid rules.** Specific threshold rules (e.g., "approved 50 changes = Stage 2") are brittle heuristics that will need constant tuning. The underlying principle is more durable: infer the stage from the pattern of interaction, not from counting specific events. A user who creates plans before work is demonstrating Stage 3 behavior. A user who describes features and walks away is demonstrating Stage 4 behavior. The behavioral signal is richer and more adaptive than any metric threshold.

**Design implication.** Stage detection should be a continuous inference from interaction patterns, not a state machine triggered by specific counts. This keeps the detection logic resilient as workflows evolve and avoids the failure mode where users game metrics to unlock capabilities they are not ready for.

**Relationship to transition guidance.** Behavioral inference enables contextual nudges. When the system observes Stage 2 behavior (approving every change), it can suggest the Stage 3 workflow (create a plan and review the PR instead). The suggestion is grounded in what the user is actually doing, not in an arbitrary timeline. This makes guidance feel relevant rather than prescriptive.

**Why this matters for Coda's adoption curve.** Most developer tools assume a single mode of use. Coda spans six stages of human-agent collaboration, and users move through them at their own pace. Behavioral inference is what allows a single system to serve a Stage 2 developer who needs reassurance and a Stage 4 developer who needs to be left alone -- without requiring either to configure their experience manually. The system watches, infers, and adapts.
