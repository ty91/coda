---
title: Design Tensions
date: 2026-02-14
status: draft
tags: [design, tensions, synthesis, architecture]
---

# Design Tensions

Supplementary tensions from the perspective synthesis that are not captured in PRD section 2.4. These inform architectural and UX decisions throughout development.

Source: `docs/perspectives/synthesis.md`

---

## 1. Architecture Documentation vs UX Simplicity

**Architecture wants** 7 detailed ADRs, full state machine diagrams, explicit schema definitions, comprehensive component diagrams.

**UX wants** onboarding that delivers value in under 5 minutes, maximum 3 questions during init, smart defaults for everything.

**Why it matters:** The architecture demands structure that could overwhelm new users. The UX demands simplicity that could leave the system underspecified.

**Resolution -- different audiences:**

- **For the builder:** Architecture documentation is the blueprint. It stays comprehensive in `docs/design-docs/`. Agents reference it when building Coda.
- **For the user:** UX principles govern the experience. `coda init` asks 3 questions. Architecture is invisible until the user needs it.
- The bridge: architecture is the *system's* knowledge; UX is the *user's* experience. They serve different audiences and do not conflict.

---

## 2. UI Scope: Mission Control vs Lightweight Overlay

**UX wants** rich Tauri UI with dashboards, plan annotation, kanban boards, timeline views, session replay, decision logs -- full "mission control."

**Harness wants** CLI as the primary interface. The UI supplements but does not replace. Agents interact via CLI, not UI.

**Compound wants** UI for human-in-the-loop tasks (plan annotation, review triage), but CLI is where compound engineering happens.

**Resolution -- CLI-first, UI for oversight:**

- Every action available in the UI must also be available via CLI. The CLI is authoritative.
- The UI focuses on what CLI does poorly: visual comparison, spatial overview, multi-item triage, annotation.
- Milestone 1 UI is deliberately minimal: plan viewer, annotation, status dashboard. No kanban, no timeline, no session replay.
- Advanced UI features (timeline visualization, session replay) are Milestone 3 or later.

---

## 3. Cross-Cutting Concerns

### 3.1 Knowledge Architecture Unification

The four perspectives use different terminology and structures for the same concepts:

| Concept | Harness | Compound | UX | Architecture |
|---|---|---|---|---|
| Entry point | AGENTS.md | CLAUDE.md | -- | CLAUDE.md + AGENTS.md |
| Plans | exec-plans/ | docs/plans/ | Plans view | docs/plans/{active,completed}/ |
| Solutions | (encoded in docs) | docs/solutions/ | -- | docs/solutions/{category}/ |
| Quality tracking | docs/QUALITY_SCORE.md | -- | Health signals | -- |
| Tech debt | docs/exec-plans/tech-debt-tracker.md | -- | -- | docs/exec-plans/tech-debt-tracker.md |

**Resolution:** Unify into the architecture's directory structure (ADR-002), which is the most comprehensive. Adopt compound's YAML frontmatter standard for all documents. Add harness's quality scoring and tech debt tracking. Let the UX surface it all through appropriate views.

### 3.2 Stage Progression Merging

Three perspectives independently define a progression framework:

- **Compound:** Stages 0-5 (most granular)
- **Harness:** Autonomy Levels 1-4
- **UX:** Trust dial Levels 1-4

All three describe the same journey from supervised to autonomous.

**Resolution:** Merge into a single 6-stage framework (compound's, as the most comprehensive) with the trust dial (from UX) as the mechanism for moving between stages. The autonomy levels (from harness) define what the system allows at each stage.
