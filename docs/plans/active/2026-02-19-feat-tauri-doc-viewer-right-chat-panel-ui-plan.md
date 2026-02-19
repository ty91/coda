---
title: "Tauri 문서 뷰어 우측 채팅 패널 UI 추가 (React compound component pattern)"
date: 2026-02-19
status: draft
tags: [tauri, app, docs-viewer, chat-panel, ui, compound-component, milestone-1]
milestone: M1
---

## Goal

Tauri 앱의 문서 뷰어 컨테이너 우측에 간단한 채팅 패널 UI를 추가한다. 이번 범위는 UI 구조와 레이아웃만 포함하며, 실제 채팅 전송/IPC/백엔드 연동은 포함하지 않는다. 구현은 React compound component pattern으로 구성해 이후 기능 확장 시 재사용 가능한 컴포넌트 경계를 확보한다.

## Context

- 현재 중앙 컨테이너는 헤더 아래에 `DocViewerPanel` 단일 패널만 렌더링한다 (`apps/app/src/App.tsx:675`, `apps/app/src/App.tsx:723`). 우측 보조 패널을 수용하는 내부 2열 레이아웃이 없다.
- 앱 셸은 `h-screen` + `overflow-hidden` 고정 구조를 사용하고 내부 패널 스크롤로 동작한다 (`apps/app/src/App.tsx:131`, `apps/app/src/App.tsx:133`, `docs/solutions/2026-02-19-fixed-100vh-shell-internal-pane-scroll.md:18`). 채팅 패널도 동일한 스크롤 원칙을 따라야 한다.
- `DocViewerPanel`에는 우측 상단 고정 find 오버레이가 있고, ask 패널 표시 상태에 따라 우측 오프셋이 바뀐다 (`apps/app/src/components/DocViewerPanel.tsx:299`, `apps/app/src/components/DocViewerPanel.tsx:310`, `apps/app/src/App.tsx:127`). 뷰어 우측에 신규 패널을 추가해도 기존 find/ask 상호작용 계약은 유지되어야 한다.
- ask UI는 헤더 아이콘으로 우측 floating sidebar를 토글하는 계약이 이미 존재한다 (`docs/design-docs/ask-sidebar-interaction-contract.md:10`, `docs/design-docs/ask-sidebar-interaction-contract.md:15`, `apps/app/src/App.tsx:745`). 이번 변경은 이 계약을 깨지 않는 선에서 문서 뷰어 내부 우측 패널만 추가해야 한다.
- Milestone 1 UI는 기능 최소화가 원칙이므로, 채팅 패널도 placeholder 중심의 경량 UI로 제한하는 것이 안전하다 (`docs/design-docs/design-tensions.md:44`, `docs/design-docs/architecture-overview.md:353`).
- prior art:
  - `docs/solutions/2026-02-19-doc-viewer-plannotator-layout-alignment.md`
  - `docs/solutions/2026-02-19-fixed-100vh-shell-internal-pane-scroll.md`
  - `docs/solutions/2026-02-19-ask-queue-floating-right-sidebar-conditional-visibility.md`
  - `docs/solutions/2026-02-19-tauri-ask-panel-header-toggle.md`
- 외부 리서치는 생략한다. 로컬 코드/문서 컨텍스트만으로 구현 경로와 제약이 충분히 명확하다.

## Approach

1. **채팅 패널 UI 계약과 레이아웃 경계 확정**
   - [x] Action: 채팅 패널을 "문서 뷰어 우측의 보조 UI"로 정의하고, 기능 범위를 정적 메시지 목록/입력 박스 placeholder 수준으로 고정한다.
   - [x] Action: 중앙 컨테이너 내부를 `viewer + chat panel` 2열로 재구성할 때, 기존 헤더 드래그 영역/ask floating sidebar/find overlay 동작을 변경하지 않는 레이아웃 계약을 명시한다.
   - [x] Deliverables: 구현 전 확정된 범위(비기능), 레이아웃 스펙(폭/스크롤/고정 요소 충돌 규칙).
   - [x] Exit criteria: 팀이 동일하게 이해할 수 있는 "UI-only" 계약과 비회귀 조건이 문서화된다.

2. **React compound component pattern 기반 `ChatPanel` 컴포넌트 추가**
   - [x] Action: `apps/app/src/components/`에 `ChatPanel` 컴포넌트를 추가하고 `ChatPanel.Root`, `ChatPanel.Header`, `ChatPanel.Messages`, `ChatPanel.Composer`(또는 동등 구조)로 역할을 분리한다.
   - [x] Action: 초기 상태는 mock/정적 데이터 기반으로 구성하고, IPC/상태 머신/실제 전송 로직은 연결하지 않는다.
   - [x] Deliverables: 독립 렌더 가능한 채팅 패널 UI 컴포넌트와 compound component API.
   - [x] Exit criteria: `App`에서 하위 슬롯을 조합해 패널을 표현할 수 있고, 단일 거대 컴포넌트로 회귀하지 않는다.

3. **`App` 중앙 레이아웃에 우측 채팅 패널 통합**
   - [x] Action: `apps/app/src/App.tsx`에서 `DocViewerPanel` 단일 배치를 2열 구조로 바꾸고, 좌측 문서 뷰어 가독성을 유지하는 우측 패널 폭을 적용한다.
   - [x] Action: 기존 ask 토글 및 find 오버레이 오프셋 계약(`16px`/`392px`)이 유지되는지 확인하고, 필요 시 최소 조정만 수행한다.
   - [x] Deliverables: 문서 뷰어 우측에 항상 보이는 채팅 패널 UI와 안정적인 내부 스크롤 레이아웃.
   - [x] Exit criteria: 문서 선택/읽기/찾기/ask 토글 기존 동작을 유지하면서 채팅 패널이 시각적으로 통합된다.

4. **회귀 테스트 추가 및 업데이트**
   - [ ] Action: `apps/app/src/App.test.tsx`에 채팅 패널 기본 렌더, 뷰어와의 공존, ask/find 기존 계약 유지 여부를 검증하는 케이스를 추가한다.
   - [ ] Action: 필요하면 `ChatPanel` 전용 컴포넌트 테스트를 추가해 compound slot 구조가 깨질 때 테스트가 실패하도록 고정한다.
   - [ ] Deliverables: 레이아웃/구조 회귀를 막는 테스트 커버리지.
   - [ ] Exit criteria: 채팅 패널 추가 이후 기존 핵심 UX 계약(문서 읽기, find, ask sidebar)이 테스트로 보호된다.

5. **검증 게이트 및 컴파운드 기록**
   - [ ] Action: 전체 품질 게이트(lint/typecheck/test/build/validate)와 Tauri 수동 스모크를 실행한다.
   - [ ] Action: 변경에서 재사용 가능한 UI 패턴(React compound component 적용 방식, 레이아웃 예방 규칙)을 `docs/solutions/`에 기록하고 아키텍처 문서 업데이트 필요성을 평가한다.
   - [ ] Deliverables: 통과 로그, 수동 확인 결과, 신규 solution 문서(필요 시).
   - [ ] Exit criteria: 자동/수동 검증 근거가 남고, 후속 채팅 기능 구현에 재사용 가능한 기준이 축적된다.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test -- App.test.tsx`
- `pnpm --filter @coda/app test -- ChatPanel.test.tsx` (신규 테스트 파일 생성 시)
- `pnpm --filter @coda/app tauri dev` (manual smoke: 문서 뷰어 + 우측 채팅 패널 공존, Cmd+F 오버레이, ask 패널 토글 충돌 없음 확인)

## Step 1 Contract Notes

- 이번 변경의 채팅 패널은 UI-only 범위이며, IPC 호출, ask 큐 연동, 메시지 전송, 상태 머신, 네트워크 요청을 포함하지 않는다.
- 중앙 컨테이너 콘텐츠 영역은 2열(`viewer + chat panel`) 구조로 구성한다. 좌측 뷰어는 `minmax(0,1fr)`로 유연하게 유지하고, 우측 채팅 패널은 읽기 경험을 해치지 않는 고정 폭(약 320px)을 사용한다.
- 스크롤 규칙은 기존 쉘 계약을 유지한다. 외부 쉘은 `h-screen + overflow-hidden`을 유지하고, 스크롤은 각 내부 패널(`DocViewerPanel`/`ChatPanel.Messages`)에서만 발생한다.
- 고정 요소 충돌 규칙은 기존 계약을 우선한다. ask 패널은 기존처럼 우측 `fixed` floating sidebar로 유지하고, find overlay 우측 오프셋은 ask 패널 실제 가시 상태 기준 `16px`/`392px` 계약을 그대로 유지한다.
- 드래그 영역 계약은 유지한다. 중앙 헤더 드래그 스트립은 변경하지 않고, 신규 채팅 패널은 별도 드래그 영역을 추가하지 않는다.

## Progress Log

- 2026-02-19: 요청 범위를 확인했다. 문서 뷰어 우측에 채팅 기능 없는 UI 패널을 추가하고 React compound component pattern을 적용하는 것이 목표다.
- 2026-02-19: `docs/plans/active/`를 확인했고 동일 주제의 active plan은 없었다.
- 2026-02-19: `docs/solutions/` prior art와 현재 코드(`apps/app/src/App.tsx`, `apps/app/src/components/DocViewerPanel.tsx`, `apps/app/src/App.test.tsx`)를 검토해 레이아웃/회귀 포인트를 정리했다.
- 2026-02-19: 외부 리서치는 생략했다. 로컬 컨텍스트만으로 구현 경로가 충분히 명확하다.
- 2026-02-19: 본 계획 문서를 `docs/plans/active/2026-02-19-feat-tauri-doc-viewer-right-chat-panel-ui-plan.md`에 초안(draft)으로 작성했다.
- 2026-02-19: Step 1 완료. 채팅 패널 UI-only 범위, 2열 레이아웃 규칙, 내부 스크롤/고정 오버레이 비회귀 계약을 문서화했다.
- 2026-02-19: Step 2 완료. `ChatPanel` compound component(`Root/Header/Messages/Composer`)와 전용 컴포넌트 테스트를 추가했다.
- 2026-02-19: Step 3 완료. `App` 중앙 콘텐츠를 뷰어+채팅 2열로 통합했고, ask 패널 토글에 따른 find 오버레이 오프셋(`16px`/`392px`) 계약을 유지했다.
