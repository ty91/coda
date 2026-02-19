---
title: "Tech Debt Tracker"
date: 2026-02-19
status: active
tags: [tech-debt, docs-viewer, ui]
---

# Tech Debt Tracker

## Open Items

### TD-001: Find Overlay Scroll Coupling

- **Area**: Docs viewer find (`Cmd+F`)
- **Problem**: Find component still scrolls away with document content in current UI behavior.
- **Expected**: Find component should stay pinned in a stable on-screen position while reader content scrolls.
- **Impact**: Reduced usability during long-document search/navigation.
- **Plan**: Address in upcoming UI improvement pass.
- **Status**: Open
