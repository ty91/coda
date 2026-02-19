---
title: "앱 헤더 ask 아이콘: 모달 대신 우측 사이드바 질문 리스트로 재구현"
date: 2026-02-19
status: draft
tags: [tauri, app, ask-queue, ui, sidebar, modal, regression, milestone-1]
milestone: M1
---

## Goal

앱 헤더의 ask 아이콘 클릭 시 질문 UI가 모달로 열리지 않고, 우측 사이드바의 질문 리스트 컴포넌트로 일관되게 표시되도록 재구현한다. 완료 기준은 모달 경로 제거, 사이드바 토글 동작 보장, 회귀 테스트 추가, 전체 게이트 통과다.

## Context

- 현재 ask 토글 버튼은 중앙 헤더에 있으며 `isAskPanelOpen` 상태로 열고 닫는다 (`apps/app/src/App.tsx:462`, `apps/app/src/App.tsx:469`).
- ask UI는 우측 `fixed` 사이드바 위치에 렌더링되도록 이미 구성되어 있다 (`apps/app/src/App.tsx:506`).
- 질문 리스트 렌더링 책임은 `AskInboxPanel`이 가지고 있으며, 세션 질문/옵션/입력 필드를 직접 렌더링한다 (`apps/app/src/components/AskInboxPanel.tsx:340`).
- 앱 레벨 회귀 테스트는 ask 토글 버튼과 우측 사이드바 노출 계약을 이미 검증한다 (`apps/app/src/App.test.tsx:285`, `apps/app/src/App.test.tsx:516`).
- 과거 변경 이력상 ask UI는 "조건부 우측 사이드바"와 "헤더 토글" 계약으로 정리되어 있으므로, 이번 요청은 모달 경로 회귀를 차단하는 정합성 복구 작업으로 본다 (`docs/solutions/2026-02-19-ask-queue-floating-right-sidebar-conditional-visibility.md`, `docs/solutions/2026-02-19-tauri-ask-panel-header-toggle.md`).
- 아키텍처 경계는 UI -> Service -> Repo 방향을 유지해야 하므로, 이번 변경도 UI 상태/렌더링 계층에서 해결하고 데이터 접근 경로는 기존 `invoke` 계약을 유지한다 (`AGENTS.md`, `docs/design-docs/architecture-overview.md`).

## Prior Art

- `docs/plans/completed/2026-02-19-feat-ask-queue-floating-right-sidebar-plan.md`
- `docs/plans/completed/2026-02-19-feat-tauri-ask-panel-header-toggle-plan.md`
- `docs/solutions/2026-02-19-ask-queue-floating-right-sidebar-conditional-visibility.md`
- `docs/solutions/2026-02-19-tauri-ask-panel-header-toggle.md`

## Approach

1. **상호작용 계약 재고정 (Modal -> Sidebar)**
   - [x] Action: ask 아이콘 클릭의 단일 결과를 "우측 사이드바 질문 리스트 토글"로 고정하고, 모달 렌더링/오픈 경로를 금지 계약으로 명시한다.
   - [x] Action: 빈 큐, pending 큐, 재클릭(close), ESC/포커스 전환 시 기대 동작을 시나리오 표로 정리한다.
   - [x] Deliverables: 모달 금지 + 사이드바 토글 중심의 UI 계약 문서.
   - [x] Exit criteria: 팀이 "ask 아이콘 클릭 시 모달은 절대 열리지 않는다"를 테스트 가능한 문장으로 합의한다.

2. **헤더 ask 트리거와 우측 사이드바 렌더 경로 정리**
   - [ ] Action: 앱 헤더 ask 아이콘 이벤트를 기존 `isAskPanelOpen` 기반 사이드바 상태와 직접 연결하고, 모달 상태/컴포넌트 의존이 있다면 제거한다.
   - [ ] Action: 사이드바 위치/폭/z-index 계약을 유지해 문서 본문 흐름을 밀지 않도록 보장한다.
   - [ ] Deliverables: 모달 경로 없는 ask 헤더 토글 + 우측 사이드바 렌더링 경로.
   - [ ] Exit criteria: ask 아이콘 클릭 시 우측 사이드바만 열리고 닫히며, 모달 DOM이 생성되지 않는다.

3. **질문 리스트 컴포넌트 연결 일원화**
   - [ ] Action: 질문 리스트 UI는 `AskInboxPanel`(또는 추출된 동등 컴포넌트) 한 경로로만 렌더링되게 정리한다.
   - [ ] Action: 기존 polling, pending count 동기화, submit/cancel 동작을 유지하고 데이터 계약 회귀가 없도록 점검한다.
   - [ ] Deliverables: 단일 질문 리스트 렌더링 경로 + 기존 ask 런타임 계약 유지.
   - [ ] Exit criteria: 신규/기존 ask 세션에서 질문 표시 및 응답 제출이 기존과 동일하게 동작한다.

4. **회귀 테스트 확장**
   - [ ] Action: `App.test.tsx`에 ask 아이콘 클릭 후 "사이드바 렌더됨 + 모달 미존재"를 동시에 검증하는 케이스를 추가한다.
   - [ ] Action: 필요한 경우 `AskInboxPanel.test.tsx`에 사이드바 렌더링 조건(빈 큐/유입/토글) 회귀 케이스를 보강한다.
   - [ ] Deliverables: modal 회귀 차단 + sidebar 계약 보장 테스트.
   - [ ] Exit criteria: 모달이 다시 연결되면 테스트가 실패한다.

5. **게이트 검증 + 컴파운드 기록**
   - [ ] Action: lint/typecheck/tests/build/validate 전체 게이트를 실행하고, `tauri dev` 수동 스모크로 ask 아이콘 -> 우측 사이드바 질문 리스트 플로우를 확인한다.
   - [ ] Action: 완료 후 `docs/solutions/`에 문제/원인/예방 전략을 기록하고, 필요 시 디자인 문서를 갱신한다.
   - [ ] Deliverables: 통과 로그 + 신규 solution 문서.
   - [ ] Exit criteria: 게이트 통과와 함께 동일 회귀를 막는 재사용 가능한 지식이 남는다.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test -- App.test.tsx`
- `pnpm --filter @coda/app test -- AskInboxPanel.test.tsx`
- `pnpm --filter @coda/app tauri dev` (manual smoke: ask 아이콘 클릭 시 모달 미노출, 우측 사이드바 질문 리스트 노출/닫기, submit/cancel 정상)

## Progress Log

- 2026-02-19: planning target 확정. "앱 헤더 ask 아이콘 클릭 시 모달 대신 우측 사이드바 질문 리스트 노출" 요구를 수신했다.
- 2026-02-19: `docs/plans/active/`를 확인했고 동일 주제 active plan은 없음을 확인했다.
- 2026-02-19: prior art(`docs/solutions/2026-02-19-ask-queue-floating-right-sidebar-conditional-visibility.md`, `docs/solutions/2026-02-19-tauri-ask-panel-header-toggle.md`)와 현재 코드 경로(`apps/app/src/App.tsx`, `apps/app/src/components/AskInboxPanel.tsx`, `apps/app/src/App.test.tsx`)를 검토해 영향 범위를 정리했다.
- 2026-02-19: 외부 리서치는 생략했다. 로컬 코드와 기존 문서 컨텍스트만으로 구현 경로와 검증 전략이 충분히 명확하다고 판단했다.
- 2026-02-19: `coda ask --json`으로 사용자 확인 완료. 질문 리스트는 기존 `AskInboxPanel` 재사용, 대상 앱 헤더는 `App.tsx` 중앙 헤더로 확정했다.
- 2026-02-19: Step 1 완료. `docs/design-docs/ask-sidebar-interaction-contract.md`에 모달 금지/사이드바 토글 계약, 시나리오 표, 테스트 문장을 기록했다.

## Assumptions / Open Questions

- Assumption: 질문 리스트 컴포넌트는 기존 `AskInboxPanel` 경로를 재사용한다(사용자 확정).
- Assumption: 이번 범위는 ask UI 오픈 방식(모달 -> 우측 사이드바)과 회귀 테스트까지이며, ask payload 스키마 변경은 포함하지 않는다.
- Assumption: 앱 헤더 대상은 `apps/app/src/App.tsx` 중앙 헤더다(사용자 확정).
- Open question: 없음.
