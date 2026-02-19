---
title: "Docs 사이드바 텍스트를 13px + font-normal로 통일"
date: 2026-02-19
status: draft
tags: [tauri, app, ui, sidebar, typography, regression, milestone-1]
milestone: M1
---

## Goal

문서 탐색용 사이드바의 텍스트를 13px(`0.8125rem`)과 `font-normal`로 통일한다. 완료 시 폴더/문서 행, 섹션 헤더, 보조 문구(loading/empty/error 포함)의 타이포그래피가 동일한 기준을 따르고, 회귀 테스트로 고정된다.

## Context

- 현재 사이드바 공용 토큰에서 텍스트 크기/굵기가 분산되어 있다. 섹션 헤더는 `text-[0.72rem] font-semibold`, 트리 행은 `text-[0.86rem] font-medium`이다 (`apps/app/src/ui-classes.ts:10`, `apps/app/src/ui-classes.ts:24`).
- 사이드바 컴포넌트 내부에도 개별 폰트 지정이 남아 있다. 문서 제목 span이 `text-[0.84rem]`을 직접 사용한다 (`apps/app/src/components/DocsSidebar.tsx:103`).
- 헤더 라벨 `Workspace`는 `eyebrowClass`를 통해 `text-[0.72rem] font-semibold`을 사용 중이며, 사이드바 메시지 문구는 `text-[0.92rem]` 기반 클래스다 (`apps/app/src/ui-classes.ts:14`, `apps/app/src/ui-classes.ts:16`, `apps/app/src/components/DocsSidebar.tsx:153`, `apps/app/src/components/DocsSidebar.tsx:156`).
- 현재 테스트는 사이드바 간격(density) 중심이라 타이포그래피 계약을 직접 보호하지 못한다 (`apps/app/src/ui-classes.test.ts:21`).
- 아키텍처 원칙상 UI 시각 규칙은 UI 레이어에서 해결하고 데이터 접근 경계는 유지해야 한다 (`AGENTS.md`, `docs/design-docs/core-beliefs.md`).
- 외부 리서치 결정: 생략. 로컬 UI 토큰/컴포넌트/회귀 테스트 컨텍스트만으로 변경 경로가 명확한 저위험 스타일 조정이다.

## Prior Art

- `docs/solutions/2026-02-19-sidebar-folder-list-spacing-density.md`
- `docs/solutions/2026-02-19-codex-style-sidebar-restyle.md`
- `docs/solutions/2026-02-19-doc-viewer-body-font-13px-adjustment.md`

## Approach

1. **타이포그래피 적용 범위 계약 확정**
   - [x] Action: "사이드바 텍스트" 범위를 `DocsSidebar` 문서 트리(섹션/폴더/문서), 상단 라벨, 상태 문구(loading/empty/error)로 명시하고 제외 대상(예: 아이콘 크기)은 분리한다.
   - [x] Deliverables: 13px + `font-normal` 적용 대상/비대상 표.
   - [x] Exit criteria: 구현/테스트가 동일 범위를 기준으로 평가 가능하다.

2. **공용 UI 클래스 토큰을 13px + font-normal 기준으로 재정렬**
   - [x] Action: `apps/app/src/ui-classes.ts`의 사이드바 관련 클래스(`sidebarSectionHeaderClass`, `treeRowClass`, `eyebrowClass`, `messageTextClass` 계열)를 13px(`text-[0.8125rem]`) + `font-normal` 기준으로 정리한다.
   - [x] Action: 의미상 굵기 강조가 꼭 필요한 예외가 있다면 근거를 남기고 최소화한다.
   - [x] Deliverables: 사이드바 텍스트 토큰 일원화.
   - [x] Exit criteria: 사이드바 텍스트 클래스에서 `font-medium`/`font-semibold` 의존이 제거되거나 명시적 예외로 한정된다.

3. **컴포넌트 내 인라인 텍스트 클래스 정합성 정리**
   - [x] Action: `apps/app/src/components/DocsSidebar.tsx`의 직접 지정 타이포그래피(예: 문서 제목 span 등)를 공용 토큰 기준과 맞춘다.
   - [x] Action: 선택/hover/active 시각 상태는 유지하되 폰트 크기·굵기만 요청값으로 통일한다.
   - [x] Deliverables: 컴포넌트 내부 하드코딩 타이포그래피 최소화.
   - [x] Exit criteria: 사이드바 DOM에서 텍스트 크기/굵기 불일치가 남지 않는다.

4. **회귀 테스트 추가/보강**
   - [ ] Action: `apps/app/src/ui-classes.test.ts`에 사이드바 타이포그래피 계약(13px, `font-normal`) 검증을 추가한다.
   - [ ] Action: 필요 시 `apps/app/src/App.test.tsx`에서 핵심 사이드바 버튼 클래스 계약을 보강해 UI 클래스 변경 누락을 탐지한다.
   - [ ] Deliverables: 타이포그래피 회귀 방지 테스트.
   - [ ] Exit criteria: 폰트 크기/굵기 계약이 깨지면 테스트가 실패한다.

5. **검증 및 컴파운드 기록**
   - [ ] Action: 전체 게이트(lint/typecheck/tests/build/validate)와 앱 수동 스모크를 수행해 시각/동작 회귀를 확인한다.
   - [ ] Action: 완료 후 `docs/solutions/`에 문제/원인/예방을 기록하고 필요 시 관련 문서를 갱신한다.
   - [ ] Deliverables: 게이트 통과 로그 + 신규 solution 문서.
   - [ ] Exit criteria: 요청 타이포그래피가 반영되고 재발 방지 지식이 남는다.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test -- ui-classes.test.ts`
- `pnpm --filter @coda/app test -- App.test.tsx`
- `pnpm --filter @coda/app tauri dev` (manual smoke: 사이드바 텍스트가 13px + font-normal로 일관되고 트리 탐색/선택 동작 회귀 없음)

## Scope Contract

| 대상 | 포함 여부 | 기준 |
|---|---|---|
| `DocsSidebar` 섹션 헤더 텍스트 | 포함 | `text-[0.8125rem]` + `font-normal` |
| `DocsSidebar` 폴더/문서 행 텍스트 | 포함 | `text-[0.8125rem]` + `font-normal` |
| `DocsSidebar` 상단 라벨(`Workspace`) | 포함 | `text-[0.8125rem]` + `font-normal` |
| `DocsSidebar` 상태 문구(loading/empty/error) | 포함 | `text-[0.8125rem]` + `font-normal` |
| `DocsSidebar` 아이콘 크기/스트로크 | 제외 | 기존 크기 유지 |
| `AskInboxPanel` 타이포그래피 | 제외 | 이번 범위 아님 |

## Progress Log

- 2026-02-19: planning target 확정. "사이드바의 텍스트들을 13px 사이즈 + font-normal로 맞추기" 요청을 수신했다.
- 2026-02-19: `docs/plans/active/` 검토 완료. 동일 주제 active plan은 없음을 확인했다.
- 2026-02-19: prior art로 `docs/solutions/`의 사이드바 밀도/스타일/13px 타이포그래피 문서를 확인해 재사용 가능한 패턴을 정리했다.
- 2026-02-19: 현재 코드 경로(`apps/app/src/ui-classes.ts`, `apps/app/src/components/DocsSidebar.tsx`, `apps/app/src/ui-classes.test.ts`, `apps/app/src/App.test.tsx`)를 검토해 변경 포인트를 식별했다.
- 2026-02-19: 외부 리서치는 생략했다. 로컬 컨텍스트만으로 실행 가능한 계획 수립이 가능하다고 판단했다.
- 2026-02-19: 범위 확정. 사용자 확인에 따라 이번 타이포그래피 통일 대상은 `DocsSidebar`로 한정한다.
- 2026-02-19: Step 1 완료. `Scope Contract` 표로 포함/비포함 대상을 고정해 구현/테스트 기준을 명문화했다.
- 2026-02-19: Step 2 완료. `apps/app/src/ui-classes.ts`의 사이드바 텍스트 토큰을 `0.8125rem` + `font-normal`로 정렬하고, 범위 외 영향 방지를 위해 `sidebarMessageTextClass`를 분리했다.
- 2026-02-19: Step 3 완료. `DocsSidebar`의 인라인 텍스트 클래스(`text-[0.84rem]`, `text-[0.92rem]`)를 정리해 요청 타이포그래피 기준으로 통일했다.

## Assumptions / Open Questions

- Assumption: 이번 요청의 "사이드바"는 `Documentation sidebar`(`DocsSidebar`)를 의미한다.
- Assumption: 타이포그래피 변경은 데이터 흐름/상태 관리 로직 변경 없이 UI 클래스/마크업 조정 범위로 제한한다.
- Open question: 없음.
