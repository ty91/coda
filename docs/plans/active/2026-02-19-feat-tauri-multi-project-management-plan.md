---
title: "Tauri 앱 다중 프로젝트 관리 구조 확장"
date: 2026-02-19
status: draft
tags: [tauri, app, multi-project, workspace, docs-viewer, architecture]
milestone: M2
---

## Goal

Tauri 앱이 단일 저장소 고정 경로가 아니라 "등록된 여러 프로젝트"를 전환하며 각각의 `docs/`와 ask 상태를 독립적으로 조회/표시할 수 있도록 구조를 확장한다. 완료 시점에는 프로젝트 선택, 프로젝트별 문서 탐색, 프로젝트별 watcher/상태 분리가 재현 가능해야 한다.

## Context

- 현재 docs 조회 IPC는 워크스페이스 루트를 `CARGO_MANIFEST_DIR` 조상 경로로 고정 계산한다 (`apps/app/src-tauri/src/plan_viewer.rs:64`, `apps/app/src-tauri/src/plan_viewer.rs:76`, `apps/app/src-tauri/src/plan_viewer.rs:87`). 결과적으로 앱이 실행된 단일 저장소만 대상으로 동작한다.
- 현재 docs watcher도 단일 `docs/` 루트만 감시한다 (`apps/app/src-tauri/src/docs_watcher.rs:45`, `apps/app/src-tauri/src/docs_watcher.rs:191`, `apps/app/src-tauri/src/docs_watcher.rs:202`). 다중 프로젝트 감시/라우팅 경로가 없다.
- 프런트엔드 상태는 단일 `docSummaries`/`selectedDocId`를 전제로 구성되어 있고 프로젝트 컨텍스트가 없다 (`apps/app/src/App.tsx:73`, `apps/app/src/App.tsx:74`, `apps/app/src/App.tsx:107`).
- 사용자 UX 요구사항: 문서 사이드바 왼쪽에 프로젝트 전용 사이드바를 신설하고, macOS 신호등 버튼 오른쪽에 `lucide-react`의 `PanelLeft` 아이콘 버튼을 두어 프로젝트 사이드바를 토글해야 한다.
- 설정 계층은 프로젝트 로컬(`.coda/config.toml`) + 사용자 글로벌(`~/.coda/config.toml`) 기준으로 통일한다.
- UX 스펙에서도 project root 기준 오류/설정 모델이 이미 전제되어 있다 (`docs/design-docs/ux-specification.md:129`, `docs/design-docs/ux-specification.md:131`, `docs/design-docs/ux-specification.md:397`).
- prior art: docs 전역 뷰어와 watcher 기반 자동 갱신이 이미 구현되어 있어 재사용 가능하다 (`docs/solutions/2026-02-18-comprehensive-docs-viewer.md`, `docs/solutions/2026-02-19-docs-viewer-auto-refresh-scroll-preserve.md`).

## Prior Art

- `docs/solutions/2026-02-18-comprehensive-docs-viewer.md`
- `docs/solutions/2026-02-19-docs-viewer-auto-refresh-scroll-preserve.md`
- `docs/design-docs/ADR-005-cli.md`
- `docs/design-docs/ADR-007-storage.md`

외부 리서치 결정:
- 이번 계획은 로컬 코드/문서 컨텍스트가 충분하고, 외부 API/보안/결제/규제 의존이 없다.
- 따라서 외부 리서치는 이번 초안에서 생략하고, 구현 중 OS별 파일 watcher 한계가 확인될 때만 보강한다.

## Approach

1. **다중 프로젝트 도메인 계약 정의 (Config/Service 경계)**
   - [x] Action: 프로젝트 식별자(`project_id`), 루트 경로, 표시 이름, 활성 프로젝트 개념을 정의하고 유효성 규칙(경로 존재, `docs/` 존재, 중복 ID/경로 금지)을 명문화한다.
   - [x] Action: 저장 위치 우선순위를 `~/.coda/config.toml`(글로벌 등록) + 프로젝트 로컬 override로 설계하고 충돌 규칙을 결정한다.
   - [x] Deliverables: 프로젝트 레지스트리 스키마 초안, validation 규칙, 오류 메시지 계약.
   - [x] Exit criteria: "등록/선택/삭제/유효하지 않은 경로" 시나리오별 기대 동작이 테스트 가능한 문장으로 고정된다.

2. **Rust backend: 프로젝트 레지스트리 + IPC 확장**
   - [ ] Action: `list_projects`, `set_active_project`, `get_active_project` IPC를 추가하고 기존 docs IPC(`list_doc_summaries`, `get_doc_document`)를 활성 프로젝트 컨텍스트 기반으로 해석하도록 분리한다.
   - [ ] Action: 단일 루트 계산(`workspace_root_path`) 의존을 제거하고 "활성 프로젝트 루트"를 주입받는 Repo 계층 유틸로 교체한다.
   - [ ] Deliverables: 프로젝트 레지스트리 로더, 활성 프로젝트 상태 저장, 프로젝트 컨텍스트 기반 docs 조회 경로.
   - [ ] Exit criteria: 앱 재시작 후 활성 프로젝트가 복원되고, 프로젝트 전환 시 서로 다른 `docs/` 목록이 IPC에서 반환된다.

3. **Watcher 아키텍처 재구성 (프로젝트별 isolation)**
   - [ ] Action: docs watcher를 활성 프로젝트 단일 감시 또는 등록 프로젝트 다중 감시 중 하나로 명시 선택하고, 이벤트 payload에 `project_id`를 포함한다.
   - [ ] Action: watcher 교체 시 스레드/채널 정리 규약(중복 감시, orphan thread 방지)을 추가한다.
   - [ ] Deliverables: project-aware `docs_changed` 이벤트 계약 + watcher lifecycle 관리 코드.
   - [ ] Exit criteria: 프로젝트 A/B를 빠르게 전환해도 잘못된 프로젝트 문서가 갱신되지 않고 이벤트 라우팅이 섞이지 않는다.

4. **Tauri UI: 프로젝트 전환 UX + 상태 분리**
   - [ ] Action: 문서 사이드바의 왼쪽에 프로젝트 사이드바(프로젝트 리스트/선택 상태)를 신설하고, 메인 레이아웃을 3-패널(프로젝트/문서/뷰어) 기준으로 재구성한다.
   - [ ] Action: 신호등 버튼 오른쪽 titlebar 영역에 `PanelLeft` 아이콘 토글 버튼을 추가해 프로젝트 사이드바 열기/닫기를 제어한다(접근성 속성: `aria-controls`, `aria-expanded`, `aria-pressed`).
   - [ ] Action: 프로젝트 선택 시 문서 목록/선택 문서/find 상태를 프로젝트 단위로 초기화 또는 캐시 전략에 따라 복원한다.
   - [ ] Action: ask 패널/알림 경로에 활성 프로젝트 컨텍스트를 표시하거나 필터링 규칙을 정의해 사용자 혼동을 줄인다.
   - [ ] Deliverables: 프로젝트 사이드바 컴포넌트, titlebar 토글 버튼, 프로젝트별 view-state 관리, 전환 UX 회귀 테스트.
   - [ ] Exit criteria: 프로젝트 전환 후 이전 프로젝트 문서/오류/검색 상태가 섞이지 않고, 토글 버튼으로 프로젝트 사이드바 가시성이 안정적으로 제어된다.

5. **테스트 전략 + 품질 게이트 + 문서화(Compound)**
   - [ ] Action: Rust 테스트에 프로젝트 레지스트리 validation, 활성 프로젝트 전환, watcher event `project_id` 라우팅 회귀를 추가한다.
   - [ ] Action: React 테스트에 프로젝트 전환 시 로딩/선택/오류 분리, stale 이벤트 무시, ask 패널 맥락 표시를 추가한다.
   - [ ] Action: 구현 완료 후 `docs/solutions/`에 문제/원인/예방을 기록하고, 필요 시 아키텍처 문서(예: `architecture-overview.md`)의 프로젝트 범위 모델을 갱신한다.
   - [ ] Deliverables: 자동화 회귀 테스트, 전체 게이트 결과, compound 문서.
   - [ ] Exit criteria: 전체 게이트 통과 + 다중 프로젝트 회귀 시나리오가 테스트로 고정된다.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `cd apps/app/src-tauri && cargo test`
- `pnpm --filter @coda/app test -- App.test.tsx`
- `pnpm --filter @coda/app test -- useAskNotifications.test.tsx`

## Progress Log

- 2026-02-19: planning target 수집. ask 응답으로 "Coda tauri app이 여러 개의 project들을 관리할 수 있도록 구조 확장"을 확인.
- 2026-02-19: `docs/plans/active/` 확인. 동일 주제 active plan 없음 확인.
- 2026-02-19: prior art 확인 (`docs/solutions/2026-02-18-comprehensive-docs-viewer.md`, `docs/solutions/2026-02-19-docs-viewer-auto-refresh-scroll-preserve.md`).
- 2026-02-19: 코드 플로우 확인. 단일 workspace 고정 경로 해석(`apps/app/src-tauri/src/plan_viewer.rs`)과 단일 docs watcher(`apps/app/src-tauri/src/docs_watcher.rs`)가 다중 프로젝트 확장의 핵심 제약임을 정리.
- 2026-02-19: 외부 리서치 필요성 판단. high-risk 주제가 아니고 로컬 문맥이 충분해 이번 계획 단계에서는 생략 결정.
- 2026-02-19: 사용자 UX 요구 반영. 프로젝트 사이드바를 문서 사이드바 왼쪽에 배치하고, 신호등 오른쪽 `PanelLeft` 버튼으로 토글하는 레이아웃 요구를 Plan step 4에 고정.
- 2026-02-19: step 1 완료. `project_registry` 도메인 계약(`project_id`, root path, display name, local override precedence)을 구현하고 등록/선택/삭제/invalid path 시나리오를 Rust 테스트로 고정.

## Assumptions / Open Questions

- Assumption: 다중 프로젝트 등록 소스는 우선 글로벌 설정(`~/.coda/config.toml`)이 기본이며, 활성 프로젝트 포인터만 앱 런타임 상태로 관리한다.
- Open question: watcher 전략을 "활성 프로젝트 단일 감시"로 제한할지, "등록 프로젝트 전체 감시"로 시작할지(성능/복잡도 trade-off) 최종 확정 필요.
- Open question: ask 세션이 향후 프로젝트 컨텍스트를 강제해야 하는지(현재 ask payload에는 프로젝트 식별자가 없음) 정책 결정 필요.
