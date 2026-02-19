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

### TD-002: macOS Ask Notification Click-to-Focus Gap

- **Area**: Tauri app ask notification flow (macOS).
- **Problem**: Ask-arrival notifications are shown, but clicking the notification does not reliably bring the app window to the foreground.
- **Expected**: Clicking the ask notification should focus and foreground the main app window consistently.
- **Impact**: The human-in-the-loop response loop still requires manual app switching, reducing responsiveness.
- **Plan**: Investigate a reliable desktop-native focus path (plugin capability vs custom native integration), then reintroduce and verify click-to-focus behavior.
- **Status**: Open
