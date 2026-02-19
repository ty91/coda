---
title: "Trim coda ask help by removing validation rules and exit codes"
date: 2026-02-19
tags: [cli, ask-command, docs]
status: "active"
---

## Problem

`coda ask --help` included contract validation rules and exit-code tables that made help output verbose.

## Root Cause

Help text had accumulated deep operational detail while trying to make the contract self-contained.

## Solution

- Removed the `Validation rules` section from `coda ask` help output.
- Removed the `Exit codes` section from `coda ask` help output.
- Kept request payload example and command examples.

## Prevention

- Keep command help focused on usage-first content; move deeper behavior details to docs/tests.

## Related

- `apps/cli/src/main.ts`
