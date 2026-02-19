---
title: "Tauri ask panel 헤더 아이콘 토글 도입"
date: 2026-02-19
status: draft
tags: [tauri, app, ask-queue, ui, header, toggle, lucide, milestone-1]
milestone: M1
---

## Goal

Tauri 앱의 ask 패널을 중앙 컨테이너 헤더의 Lucide `message-circle-question-mark` 아이콘으로 열고 닫을 수 있게 만든다. 헤더 아이콘은 pending ask 유무와 무관하게 항상 노출되어야 하며, pending ask가 있을 때 사용자가 아이콘으로 패널 표시 상태를 제어할 수 있어야 한다. 패널 표시 상태에 맞춰 find 오버레이 위치도 일관되게 동작해야 한다.

## Context

- 현재 ask 패널 표시 조건은 `pendingAskCount > 0` 단일 조건이다 (`apps/app/src/App.tsx:87`, `apps/app/src/App.tsx:89`, `apps/app/src/App.tsx:471`). 사용자가 직접 닫을 수 있는 UI 상태가 없다.
- find 오버레이 우측 오프셋도 ask 표시 여부(`hasPendingAsks`)만 기준으로 계산된다 (`apps/app/src/App.tsx:90`, `apps/app/src/App.tsx:91`, `apps/app/src/App.tsx:92`).
- 중앙 컨테이너는 현재 `DocViewerPanel`만 렌더링하며 헤더 액션 영역이 별도로 없다 (`apps/app/src/App.tsx:448`, `apps/app/src/App.tsx:449`).
- ask 패널 자체는 `sessions.length === 0`일 때 `null`을 반환하는 계약으로 이미 고정되어 있다 (`apps/app/src/components/AskInboxPanel.tsx:320`, `apps/app/src/components/AskInboxPanel.tsx:321`).
- App 회귀 테스트는 현재 "pending ask가 있으면 ask 패널 노출"과 "find 오프셋 392px"만 검증한다 (`apps/app/src/App.test.tsx:473`, `apps/app/src/App.test.tsx:491`). 토글 동작 회귀를 막는 테스트가 없다.
- prior art:
  - `docs/solutions/2026-02-19-ask-queue-floating-right-sidebar-conditional-visibility.md`
  - `docs/plans/completed/2026-02-19-feat-ask-queue-floating-right-sidebar-plan.md`
  - `docs/solutions/2026-02-19-lucide-icon-only-sidebar-refresh.md`
- 외부 리서치는 생략한다. 로컬 코드/문서만으로 변경 경로가 명확하고, `lucide-react` 현재 버전에 `MessageCircleQuestionMark` 아이콘이 포함되어 있음을 로컬 타입 정의에서 확인했다 (`apps/app/node_modules/lucide-react/dynamicIconImports.d.ts:14867`).

## Approach

1. **토글 UX 계약과 상태 모델 고정**
   - [x] Action: ask 패널 최종 표시 조건을 `pendingAskCount > 0 && isAskPanelOpen`으로 정의하고, 헤더 토글 아이콘은 pending ask 유무와 무관하게 항상 렌더링되도록 계약을 명시한다.
   - [x] Action: 아이콘 버튼 접근성 계약(`aria-label`, pressed state, 키보드 포커스)을 고정한다.
   - [x] Deliverables: 구현 전에 확정된 표시/토글/접근성 규칙.
   - [x] Exit criteria: pending 상태 변화와 사용자 토글 입력이 충돌하지 않는 단일 상태 규칙이 문서화된다.

2. **중앙 컨테이너 헤더에 Lucide 토글 버튼 추가**
   - [x] Action: `App` 중앙 영역에 헤더 액션 컨테이너를 추가하고 Lucide `MessageCircleQuestionMark` 아이콘 버튼을 배치한다.
   - [x] Action: 기존 레이아웃(문서 뷰어, 드래그 영역, 모바일 브레이크포인트)과 시각 충돌이 없도록 간격/정렬을 조정한다.
   - [x] Deliverables: 중앙 컨테이너 헤더의 ask 토글 아이콘 UI.
   - [x] Exit criteria: 데스크톱/모바일에서 아이콘 버튼이 일관된 위치에 항상 보이고 클릭으로 토글 이벤트가 발생한다.

3. **ask 패널 노출 및 find 오버레이 오프셋 연동 리팩터링**
   - [ ] Action: ask 패널 렌더링 조건을 pending + 토글 상태로 변경하고, `AskInboxPanel`은 기존 polling/sessions 책임만 유지한다.
   - [ ] Action: find 오버레이 오프셋 계산을 "pending 존재"가 아닌 "실제 패널 표시 상태" 기준으로 변경한다.
   - [ ] Deliverables: 토글 가능한 ask 패널 노출 제어와 오프셋 동기화.
   - [ ] Exit criteria: 패널이 닫힌 상태에서는 pending ask가 있어도 패널/오프셋이 숨김 상태를 유지하고, 다시 열면 즉시 복구된다.

4. **회귀 테스트 확장**
   - [ ] Action: `App.test.tsx`에 헤더 아이콘 노출, 클릭 토글(open/close), 토글 상태에 따른 ask 패널 DOM 및 find 오프셋 변화를 검증하는 케이스를 추가한다.
   - [ ] Action: 기존 ask 패널 가시성 테스트와 충돌하지 않도록 fixture/기대값을 정리한다.
   - [ ] Deliverables: 토글 계약 회귀 테스트.
   - [ ] Exit criteria: 토글 동작, 접근성 이름, 오프셋 규칙이 깨지면 테스트가 실패한다.

5. **전체 게이트 및 컴파운드 기록**
   - [ ] Action: lint/typecheck/test/build/validate 전체 게이트와 Tauri 수동 스모크를 실행한다.
   - [ ] Action: 변경 결과와 예방 패턴을 `docs/solutions/`에 기록하고 아키텍처 영향 여부를 확인한다.
   - [ ] Deliverables: 통과 로그와 신규 solution 문서.
   - [ ] Exit criteria: 전체 게이트 통과 + 후속 ask UI 변경에 재사용 가능한 지식이 남는다.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test -- App.test.tsx`
- `pnpm --filter @coda/app test -- AskInboxPanel.test.tsx`
- `pnpm --filter @coda/app tauri dev` (manual smoke: 헤더 아이콘 토글, ask 패널 show/hide, find 오버레이 오프셋 동기화)

## Progress Log

- 2026-02-19: planning target 확정. "중앙 컨테이너 헤더 아이콘 클릭으로 ask 패널 토글" 요구를 확인했다.
- 2026-02-19: `docs/plans/active/` 확인 결과 동일 주제 active plan은 없었다.
- 2026-02-19: `docs/solutions/` prior art와 앱 코드(`App.tsx`, `AskInboxPanel.tsx`, `App.test.tsx`)를 검토해 상태/레이아웃/테스트 영향 범위를 정리했다.
- 2026-02-19: 외부 리서치는 생략했다. 로컬 컨텍스트가 충분하고, Lucide 아이콘 availability는 로컬 타입 정의에서 확인했다.
- 2026-02-19: 사용자 결정 반영. 헤더 ask 토글 아이콘은 pending ask 유무와 무관하게 항상 노출하는 정책으로 확정했다.
- 2026-02-19: Step 1 완료. 상태 모델을 `showAskPanel = pendingAskCount > 0 && isAskPanelOpen`으로 고정했고, 아이콘 버튼은 항상 렌더링 + `aria-label`/`aria-pressed`를 갖는 토글 계약으로 확정했다. `isAskPanelOpen` 기본값은 `true`, pending ask가 `0 -> >0`으로 전환되면 자동 open 복귀로 정의했다.
- 2026-02-19: Step 2 완료. `apps/app/src/App.tsx` 중앙 컨테이너에 헤더 액션 행을 추가하고 Lucide `MessageCircleQuestionMark` 아이콘 버튼(`data-testid=\"ask-panel-toggle-button\"`)을 배치했다. 아이콘 버튼은 항상 렌더링되며 `aria-label`/`aria-pressed` 기반 토글 입력이 동작한다.
