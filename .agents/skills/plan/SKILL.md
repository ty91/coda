---
name: plan
description: Create project plans from feature/bug inputs using the repo template and conventions
---

# Create Plan

Transform a feature request, bug report, or improvement idea into a concrete plan document.

## Priority

- If this skill conflicts with `AGENTS.md`, follow `AGENTS.md`.

## Inputs

- Preferred: explicit feature/bug description from user.
- If missing: ask for the description before proceeding.

## Workflow

### 1) Intake

1. Confirm the planning target (feature, bug, or refactor).
2. If the request is ambiguous, ask short clarification questions.
3. Do not proceed to research or drafting until the feature description is clear.

### 2) Local Context

1. Run local research in parallel tracks:
   - conventions track: project rules, docs conventions, repository standards
   - code-flow track: relevant modules, boundaries, data and execution flow
2. Check for existing active plans in `docs/plans/active/` on the same topic.
3. Search `docs/solutions/` for prior art before proposing steps.
4. Review relevant architecture and constraints in `docs/design-docs/`.

### 3) Research Decision + External Research

1. Decide whether external research is needed using intake + local findings.
2. Always run external research for high-risk topics (security, payments, external APIs, data privacy).
3. Skip external research when local context is strong and the path is clear.
4. Run external research when uncertainty is high or territory is unfamiliar.
5. Announce the decision briefly before continuing.

### 4) Consolidate Research

1. Capture local code references with file paths and line numbers when available.
2. Capture external references with URLs when external research was used.
3. Note related issues or PRs if found.
4. Capture relevant project conventions used to shape the plan.
5. Optionally summarize findings and ask user if anything is missing before drafting.

### 5) Draft Plan (Template Required)

1. Use `docs/plans/.template.md` as the base.
2. Keep frontmatter fields present:
   - `title`
   - `date`
   - `status` (default `draft` unless user asks otherwise)
   - `tags`
   - `milestone`
3. Fill all template sections:
   - Goal
   - Context
   - Approach
   - Validation
   - Progress Log
4. Keep action checkboxes in the plan unchecked (`- [ ]`) at planning time.

### 6) File Naming and Location

1. Output directory: `docs/plans/active/`
2. Filename format: `YYYY-MM-DD-<type>-<descriptive-name>-plan.md`
3. Use short, searchable names and kebab-case.
4. Use `<type>` aligned with work intent (for example `feat`, `fix`, `refactor`).

### 7) Final Plan QA

1. Check title is clear and searchable.
2. Check all template sections are complete.
3. Check acceptance criteria are measurable.
4. Check links and references resolve.
5. Check checkboxes intended for implementation remain unchecked.

### 8) Write and Confirm

1. Write the plan file to disk before presenting options.
2. Confirm exact output path in the response.
3. Include assumptions and unresolved questions at the end.

## Guardrails

- Planning only. Do not implement code in this workflow.
- Prefer root-cause steps over workaround steps.
- Keep the plan actionable and testable; avoid vague verbs.
