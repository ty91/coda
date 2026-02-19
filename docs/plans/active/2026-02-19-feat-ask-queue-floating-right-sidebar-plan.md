---
title: "Ask queue 우측 플로팅 사이드바 전환 및 조건부 노출"
date: 2026-02-19
status: draft
tags: [tauri, app, ask-queue, sidebar, ui, milestone-1]
milestone: M1
---

## Goal

`Ask Queue` UI를 문서 본문 아래 인라인 패널에서 우측 플로팅 사이드바로 전환하고, 실제 pending ask 항목이 1개 이상일 때만 화면에 노출되도록 변경한다. 완료 후에는 ask가 없을 때 문서 읽기 레이아웃이 ask 패널 존재를 전혀 드러내지 않아야 하며, ask가 노출된 동안 find 오버레이는 ask 사이드바를 피해서 좌측으로 밀려야 한다.

## Context

- 현재 앱 레이아웃은 `DocViewerPanel` 아래에 `AskInboxPanel`을 인라인으로 렌더링하므로 ask UI가 문서 흐름 안쪽에 배치된다 (`apps/app/src/App.tsx:443`, `apps/app/src/App.tsx:465`).
- `AskInboxPanel`은 Tauri 환경이면 항상 루트 `<section>`을 렌더링하고, 빈 큐일 때도 "No pending asks." 문구를 노출한다 (`apps/app/src/components/AskInboxPanel.tsx:313`, `apps/app/src/components/AskInboxPanel.tsx:327`).
- `AskInboxPanel`은 ask 로드 에러도 패널 내부 텍스트로 표시하므로, "아이템이 있을 때만 노출" 원칙을 적용하려면 에러 표현 경로도 재정의가 필요하다 (`apps/app/src/components/AskInboxPanel.tsx:324`).
- ask 세션 수집은 1초 폴링 기반이며, 노출 조건을 바꿔도 새 ask 감지는 계속 유지되어야 한다 (`apps/app/src/components/AskInboxPanel.tsx:5`, `apps/app/src/components/AskInboxPanel.tsx:185`).
- 문서 찾기 오버레이가 이미 우측 상단 `fixed` 배치를 사용하므로, ask 플로팅 사이드바와의 z-index/위치 충돌을 피해야 한다 (`apps/app/src/components/DocViewerPanel.tsx:314`).
- 기존 ask solution은 "전용 ask queue 패널"을 기준으로 작성되어 있어 이번 변경은 follow-up UI refinement로 분리 관리하는 것이 안전하다 (`docs/solutions/2026-02-19-cli-ask-unix-socket-bridge.md:24`).
- 외부 리서치는 생략한다. 이번 변경은 로컬 컴포넌트 구조/스타일/테스트 범위에서 경로가 명확하다.

## Prior Art

- `docs/solutions/2026-02-19-cli-ask-unix-socket-bridge.md`
- `docs/solutions/2026-02-19-doc-viewer-find-overlay-debounce.md`
- `docs/plans/active/2026-02-19-feat-cli-agent-ask-command-plan.md`

## Approach

1. **노출/배치 계약 고정**
   - [x] Action: Ask 사이드바 노출 조건을 "실제 pending ask 1개 이상"으로 명시하고, 빈 큐/초기 로딩/일시 에러 상태에서는 패널을 렌더링하지 않는 원칙을 확정한다.
   - [x] Action: 데스크톱(우측 고정 플로팅)과 모바일(좁은 폭 대응) 배치 계약, 그리고 ask 노출 시 find 오버레이를 좌측으로 이동시키는 offset 계약을 정의한다.
   - [x] Deliverables: 테스트 가능한 UI 계약(visibility, placement, stacking, responsive).
   - [x] Exit criteria: 구현 전에 노출 조건, find 좌측 밀림 규칙, 배치 충돌 처리 기준이 문서화된다.

2. **Ask 패널 렌더링 조건 리팩터링**
   - [ ] Action: `AskInboxPanel` 내부 렌더링을 조건부로 바꿔 ask 항목이 없을 때는 시각 요소를 렌더링하지 않도록 조정한다(빈 큐/로딩/일시 에러 모두 미노출).
   - [ ] Action: 노출 여부와 무관하게 폴링 루프 및 draft/note 상태 동기화가 ask 신규 유입 시 즉시 복구되도록 보장한다.
   - [ ] Deliverables: 빈 큐에서 `null` 렌더링되는 ask 패널과 유지된 ask 세션 처리 로직.
   - [ ] Exit criteria: pending=0 상태에서 Ask UI DOM이 사라지고, pending>0으로 전환되면 자동으로 재노출된다.

3. **앱 셸 우측 플로팅 사이드바 적용**
   - [ ] Action: `App` 레이아웃에서 ask 패널을 인라인 흐름에서 분리하고 우측 플로팅 사이드바 포지션으로 이동한다.
   - [ ] Action: 기존 reader/drag-region/find overlay와 상호작용 충돌이 없도록 위치/폭/여백/stacking을 조정하고, ask 표시 중 find 오버레이의 우측 기준점을 좌측으로 이동시킨다.
   - [ ] Deliverables: 우측 플로팅 ask 사이드바 UI와 레이아웃 영향 제거.
   - [ ] Exit criteria: ask 패널 표시 여부가 문서 본문 폭/세로 흐름을 밀지 않고 독립적으로 동작하며, ask 표시 시 find 오버레이가 겹치지 않는다.

4. **회귀 테스트 갱신**
   - [ ] Action: `AskInboxPanel` 테스트를 "빈 큐 문구 노출"에서 "빈 큐/로딩/에러 미노출" 계약으로 전환하고, pending 발생 시 렌더링 복귀를 검증한다.
   - [ ] Action: `App` 수준 테스트에 플로팅 배치 신호(클래스/위치), 기본 미노출 동작, ask 표시 시 find 오버레이 좌측 이동 신호를 추가한다.
   - [ ] Deliverables: ask visibility + floating placement 회귀 테스트.
   - [ ] Exit criteria: 노출 조건 또는 배치가 회귀하면 테스트가 실패한다.

5. **게이트 검증 및 컴파운드 기록**
   - [ ] Action: lint/typecheck/test/build/validate 전체 게이트를 실행하고 수동 Tauri 스모크(ask 생성→노출→submit/cancel→자동 숨김)를 수행한다.
   - [ ] Action: 변경 패턴/실수/예방 전략을 `docs/solutions/`에 기록하고, 아키텍처 영향이 있으면 관련 설계 문서를 갱신한다.
   - [ ] Deliverables: 통과 로그, 수동 검증 결과, 신규 solution 문서.
   - [ ] Exit criteria: 전체 게이트 통과 + 후속 ask UI 변경에 재사용 가능한 지식이 남는다.

## UI Contract

- **Visibility**
  - Ask 패널은 `pending ask count > 0`일 때만 렌더링한다.
  - `pending ask count = 0`이면 빈 상태/로딩/에러 메시지 없이 패널 자체를 렌더링하지 않는다.
- **Placement**
  - 데스크톱: Ask 패널은 우측 `fixed` 플로팅 사이드바로 노출한다.
  - 모바일/좁은 폭: 우측 고정이 어려운 경우 폭과 오프셋을 줄여 화면 내부에서 접근 가능하게 유지한다.
- **Find offset**
  - Ask 패널이 노출되면 find 오버레이의 우측 기준점을 Ask 사이드바 폭 + 안전 여백만큼 좌측으로 이동한다.
  - Ask 패널이 숨겨지면 find 오버레이는 기존 우측 기준점으로 복귀한다.
- **Stacking**
  - Ask 사이드바와 find 오버레이는 서로 클릭 영역을 침범하지 않는다.
  - 두 요소는 문서 본문 레이아웃(가로 폭/세로 흐름)을 밀지 않는다.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test -- AskInboxPanel.test.tsx`
- `pnpm --filter @coda/app test -- App.test.tsx`
- `pnpm --filter @coda/app tauri dev` (manual smoke: pending ask 있을 때만 우측 플로팅 노출, submit/cancel 후 자동 숨김, find overlay 충돌 확인)

## Risks

- 노출 조건 리팩터링 중 폴링/동기화 루프가 렌더링 생명주기에 묶이면 신규 ask를 늦게 감지할 수 있다.
  - Mitigation: 폴링은 유지하고 렌더링만 조건부로 분리하며, pending 전환 회귀 테스트를 추가한다.
- 우측 플로팅 사이드바가 find 오버레이와 겹치면 입력 포커스/클릭 충돌이 발생할 수 있다.
  - Mitigation: ask 표시 여부에 따라 find 오버레이 우측 오프셋을 동적으로 이동시키고 수동 스모크에 동시 사용 시나리오를 포함한다.
- 모바일에서 고정 우측 패널이 가독성/터치 접근성을 해칠 수 있다.
  - Mitigation: 브레이크포인트 대응 규칙을 명확히 두고 좁은 폭에서 폭/위치 조정을 검증한다.
- ask 로드 에러를 완전히 숨기면 운영 이슈를 사용자가 바로 인지하지 못할 수 있다.
  - Mitigation: UI 패널은 숨기되, 개발자 콘솔/로거에 에러를 남겨 디버깅 가능성을 유지한다.

## Progress Log

- 2026-02-19: 계획 대상 확정. ask queue를 우측 플로팅 사이드바로 전환하고 pending ask가 있을 때만 노출하는 요구를 확인했다.
- 2026-02-19: `docs/plans/active/` 확인. ask 주제의 active plan(`2026-02-19-feat-cli-agent-ask-command-plan.md`)은 존재하지만 범위가 CLI-브리지 전체이므로 본 요청은 UI refinement follow-up으로 분리 계획한다.
- 2026-02-19: `docs/solutions/` prior art(`cli-ask-unix-socket-bridge`, `doc-viewer-find-overlay-debounce`)와 앱 코드(`App.tsx`, `AskInboxPanel.tsx`, `DocViewerPanel.tsx`)를 검토해 구현 경로를 확정했다.
- 2026-02-19: 외부 리서치는 생략했다. 로컬 코드/문서 컨텍스트만으로 변경 경로와 검증 전략이 충분히 명확하다.
- 2026-02-19: 요구사항 확정. ask가 표시되면 find 오버레이는 좌측으로 밀려야 하며, 실제 ask 아이템이 있을 때만 ask 패널을 노출한다(빈 큐/로딩/일시 에러는 미노출).
- 2026-02-19: Step 1 완료. `UI Contract` 섹션에 노출/배치/find offset/stacking 계약을 고정하고 Step 1 체크박스를 완료 처리했다.
