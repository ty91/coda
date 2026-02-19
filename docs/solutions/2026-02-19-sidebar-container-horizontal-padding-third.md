---
title: "Remove docs sidebar container horizontal padding"
date: 2026-02-19
tags: [tauri, app, sidebar, layout, spacing]
status: "active"
---

## Problem

The docs sidebar container still looked too wide after an earlier reduction.

## Root Cause

The sidebar root container in `DocsSidebar` still had horizontal padding (`px-1`, 4px), so the rail edges did not appear flush.

## Solution

- Updated `apps/app/src/components/DocsSidebar.tsx`.
- Changed sidebar container horizontal padding from `px-1` to `px-0`.
- Sidebar left and right container padding is now fully removed (4px -> 0px).

## Prevention

- Keep sidebar container spacing tokens explicit in component root classes so single-step density tuning stays low-risk.
- When spacing requests are ratio-based, convert to concrete Tailwind token values and verify both sides.

## Related

- `apps/app/src/components/DocsSidebar.tsx`
