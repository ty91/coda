---
title: "Docs viewer Cmd+F find: top-right overlay + debounced matching"
date: 2026-02-19
status: draft
tags: [tauri, app, docs-viewer, find, ux, performance, milestone-1]
milestone: M1
---

## Goal

`Cmd+F`/`Ctrl+F`로 열린 문서 내 찾기 UI가 문서 뷰어 우측 상단에 absolute 오버레이로 표시되고, 입력 타이핑 중에는 디바운스 후에만 하이라이트/매치 계산이 실행되도록 변경한다.

## Context

- 현재 찾기 UI는 문서 뷰어 내부의 일반 flow 블록으로 렌더링되고 있어 상단 레이아웃을 밀어낸다 (`apps/app/src/components/DocViewerPanel.tsx:310`).
- 문서 뷰어 컨테이너는 이미 `relative`이며 상단 drag region도 absolute로 배치되어 있어, 같은 기준점에서 찾기 오버레이를 배치할 수 있다 (`apps/app/src/components/DocViewerPanel.tsx:295`, `apps/app/src/components/DocViewerPanel.tsx:298`).
- 현재 매치 하이라이트는 `findQuery` 변경마다 즉시 재계산되어 긴 문서에서 키 입력당 DOM 스캔/하이라이트가 발생한다 (`apps/app/src/components/DocViewerPanel.tsx:210`, `apps/app/src/components/DocViewerPanel.tsx:236`).
- `App`은 단일 `findQuery` 상태를 입력값/검색값으로 같이 사용하고 있어, 디바운스를 추가하려면 상태 책임 분리가 필요하다 (`apps/app/src/App.tsx:76`, `apps/app/src/App.tsx:418`).
- 회귀 테스트는 현재 Cmd/Ctrl+F 오픈 및 매치 네비게이션만 검증하며, 오버레이 위치나 디바운스 타이밍은 검증하지 않는다 (`apps/app/src/App.test.tsx:377`).
- 외부 리서치는 생략한다. 해당 변경은 로컬 UI 동작/성능 범위이며 현재 코드/문서 컨텍스트만으로 경로가 명확하다.

## Prior Art

- `docs/solutions/2026-02-19-doc-viewer-cmd-f-in-document-find.md`
- `docs/plans/completed/2026-02-19-feat-doc-viewer-cmd-f-find-plan.md`
- `docs/solutions/2026-02-19-doc-viewer-plannotator-layout-alignment.md`

## Approach

1. **동작 계약 고정 (오버레이 + 디바운스)**
   - [x] Action: 오버레이 기준점(뷰어 우상단), 반응형 동작(좁은 폭에서 wrap), 키보드 포커스/Enter/Escape 계약을 명확히 정의한다.
   - [x] Action: 디바운스 적용 범위를 정한다(입력값은 즉시 반영, 매치 계산은 150ms 지연 실행).
   - [x] Deliverables: 구현 가능한 상세 계약(배치, 지연, 예외 케이스).
   - [x] Exit criteria: 구현 전에 테스트 가능한 acceptance 조건이 문서화된다.

2. **찾기 UI를 우측 상단 absolute 오버레이로 재배치**
   - [x] Action: `DocViewerPanel`에서 찾기 컨테이너를 absolute top-right 오버레이로 이동하고, reader 본문과 시각 충돌이 없도록 spacing/z-index를 조정한다.
   - [x] Action: drag region 및 기존 header와 충돌하지 않도록 위치를 조정하고 모바일 레이아웃에서 가독성을 유지한다.
   - [x] Deliverables: 문서 뷰어 우상단 오버레이 find UI.
   - [x] Exit criteria: Cmd/Ctrl+F 시 find UI가 레이아웃 밀림 없이 우상단 오버레이로 표시된다.

3. **디바운스 검색 파이프라인 추가**
   - [x] Action: 입력 즉시 상태와 검색 실행 상태를 분리하고, 검색 실행 상태는 150ms 디바운스 타이머를 통해 갱신한다.
   - [x] Action: Enter/Shift+Enter 네비게이션과 close/reset 흐름이 디바운스 상태와 충돌하지 않도록 토큰/카운터 리셋 조건을 정리한다.
   - [x] Deliverables: 디바운스 적용된 매치 계산 흐름.
   - [x] Exit criteria: 연속 타이핑 시 매 키스트로크마다 하이라이트 재계산이 발생하지 않는다.

4. **회귀 테스트 보강**
   - [x] Action: 기존 find 테스트에 오버레이 렌더링 조건(클래스/배치 신호) 검증을 추가한다.
   - [x] Action: 디바운스 타이밍 회귀 테스트를 추가해 150ms 이전에는 매치 카운터가 갱신되지 않고, 지연 후 갱신됨을 검증한다.
   - [x] Deliverables: 오버레이/디바운스 회귀 테스트.
   - [x] Exit criteria: 오버레이 위치나 디바운스 로직이 깨지면 테스트가 실패한다.

5. **게이트 검증 + 컴파운드 문서화**
   - [ ] Action: 전체 게이트(`lint/typecheck/test/build/validate`)와 앱 대상 수동 스모크(Cmd/Ctrl+F, 타이핑, 네비게이션)를 수행한다.
   - [ ] Action: 적용 후 패턴/실수/예방 전략을 `docs/solutions/`에 기록하고 필요 시 관련 설계 문서를 갱신한다.
   - [ ] Deliverables: 통과 로그 + 신규 solution 문서.
   - [ ] Exit criteria: 자동/수동 검증 통과 및 재사용 가능한 학습 기록 완료.

## Interaction Contract

- Trigger: `Cmd+F`/`Ctrl+F`는 기존과 동일하게 find를 열고 입력에 포커스한다.
- Placement: find 컨테이너는 문서 뷰어 섹션 기준 `absolute` 우상단(`top/right`) 오버레이로 렌더링한다.
- Layout: 기본 데스크톱은 우상단 고정, 좁은 폭에서는 폭을 줄여 wrap되며 본문 레이아웃은 밀지 않는다.
- Search pipeline: 입력값은 즉시 반영하고, 하이라이트/매치 계산은 마지막 입력 후 150ms에 실행한다.
- Navigation: `Enter`/`Shift+Enter`는 next/previous를 유지하고, `Esc`는 find를 닫고 상태를 초기화한다.
- Empty/no-match: 기존 계약 유지(`0/0`, navigation disabled).

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test`
- `pnpm --filter @coda/app tauri dev` (manual smoke: Cmd/Ctrl+F overlay 위치, debounce 체감, Enter/Shift+Enter, Esc)

## Risks

- 오버레이가 상단 drag region 또는 reader 헤더와 겹쳐 클릭/포커스 이슈를 만들 수 있다.
  - Mitigation: 위치 오프셋과 z-index를 명시적으로 관리하고 회귀 테스트에서 노출 조건을 검증한다.
- 디바운스 지연값이 너무 길면 탐색 반응성이 나빠지고, 너무 짧으면 성능 개선 효과가 낮다.
  - Mitigation: 초기값을 보수적으로 설정하고 수동 스모크에서 체감 반응성을 확인한다.
- 디바운스 중 Enter 네비게이션 시 stale match를 참조할 수 있다.
  - Mitigation: 네비게이션 처리 시 최신 검색 상태와 토큰 처리 순서를 명확히 고정한다.

## Progress Log

- 2026-02-19: 계획 대상 확정. 문서 뷰어 find 동작에서 오버레이 위치 변경 + debounce 추가 요구를 확인했다.
- 2026-02-19: `docs/plans/active/` 확인 결과 동일 주제 active plan은 없음을 확인했다.
- 2026-02-19: `docs/solutions/2026-02-19-doc-viewer-cmd-f-in-document-find.md` 및 관련 완료 plan을 검토해 prior art를 확보했다.
- 2026-02-19: 코드 흐름(`apps/app/src/App.tsx`, `apps/app/src/components/DocViewerPanel.tsx`, `apps/app/src/App.test.tsx`)을 기준으로 구현/검증 단계를 작성했다.
- 2026-02-19: 디바운스 지연 시간 결정을 확정했다(150ms).
- 2026-02-19: Step 1 완료. 오버레이 배치/반응형/키보드/150ms debounce 계약을 `Interaction Contract`로 고정했다.
- 2026-02-19: Step 2 완료. `DocViewerPanel` find UI를 absolute 우상단 오버레이로 이동하고 mobile 폭 대응을 추가했으며 `pnpm --filter @coda/app test -- App.test.tsx`를 통과했다.
- 2026-02-19: Step 3 완료. `App`에 입력 상태(`findInputQuery`)와 검색 상태(`findSearchQuery`)를 분리하고 150ms debounce + stale navigation guard를 추가했으며 `pnpm --filter @coda/app test -- App.test.tsx`를 통과했다.
- 2026-02-19: Step 4 완료. `App.test.tsx`에 find overlay 렌더링 신호 검증과 150ms debounce 타이밍 회귀 테스트를 추가했고 `pnpm --filter @coda/app test -- App.test.tsx`를 통과했다.
