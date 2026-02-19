---
title: "Projects 사이드바 FolderPlus 프로젝트 추가 플로우"
date: 2026-02-19
status: completed
tags: [tauri, app, projects-sidebar, lucide, multi-project, config]
milestone: M2
---

## Goal

Projects 사이드바의 `Projects` 텍스트 오른쪽 끝에 `lucide-react`의 `FolderPlus` 아이콘 버튼을 추가하고, 버튼 클릭으로 새 프로젝트를 등록할 수 있는 end-to-end 플로우를 완성한다. 완료 시점에는 사용자 클릭 한 번으로 경로 선택, 등록 검증, 목록 반영까지 일관되게 동작해야 한다.

## Context

- 현재 `ProjectsSidebar` 헤더는 `Projects` 텍스트만 렌더링하며 추가 액션 버튼이 없다 (`apps/app/src/components/ProjectsSidebar.tsx:43`).
- 프런트엔드는 프로젝트 조회/전환만 지원하고 등록 IPC를 호출하지 않는다 (`apps/app/src/App.tsx:152`, `apps/app/src/App.tsx:305`).
- Rust IPC도 `list_projects`, `get_active_project`, `set_active_project`만 노출되어 있어 런타임 등록 진입점이 없다 (`apps/app/src-tauri/src/project_runtime.rs:137`).
- 프로젝트 소스 오브 트루스는 `~/.coda/config.toml` + 로컬 override 구조로 정의되어 있으므로, 추가 플로우도 같은 경로를 따라야 한다 (`docs/design-docs/architecture-overview.md:208`).
- 관련 prior art: 다중 프로젝트 상태 분리와 sidebar/icon 접근성 패턴이 이미 정리되어 있다 (`docs/solutions/2026-02-19-tauri-multi-project-management.md`, `docs/solutions/2026-02-19-lucide-icon-only-sidebar-refresh.md`).

외부 리서치 결정:
- 이번 작업은 기존 Tauri/React/Rust 경계 내부 확장이며 보안/결제/규제/외부 API 고위험 영역이 아니다.
- 따라서 계획 단계에서는 외부 리서치를 생략하고, 구현 중 폴더 선택 API 제약이 발생하면 Tauri 공식 문서를 추가 검증한다.

## Approach

1. **Projects 헤더 액션 계약 정의 (UI/접근성)**
   - [x] Action: `Projects` 라벨 우측 끝 아이콘 버튼(`FolderPlus`) 배치, hover/focus/disabled 상태, 접근성 라벨(`aria-label`, `title`) 규약을 확정한다.
   - [x] Action: 클릭 플로우를 "폴더 선택 -> 등록 요청 -> 성공 시 목록 반영 / 실패 시 오류 표시"로 명시하고 취소(cancellation) 동작을 고정한다.
   - [x] Deliverables: `ProjectsSidebar` 액션 슬롯/prop 계약과 UI 상태 전이 표.
   - [x] Exit criteria: 디자인/동작 계약만으로 QA가 버튼 위치와 동작 결과를 재현할 수 있다.

2. **Rust backend 등록 경로 추가 (Config/Runtime 경계)**
   - [x] Action: `ProjectRegistryState`에 프로젝트 등록 API를 추가하고, `register_project`(가칭) IPC를 `apps/app/src-tauri/src/lib.rs`에 노출한다.
   - [x] Action: 선택 경로 canonicalize, `docs/` 존재 검증, 중복 `project_id`/경로 충돌 검증, 오류 메시지 규약을 기존 registry 에러 톤에 맞춰 통일한다.
   - [x] Action: `~/.coda/config.toml`의 `[projects.<id>]` 업데이트 정책(신규 append, deterministic sort)을 정의하고 원자적 write를 적용한다.
   - [x] Deliverables: 런타임 등록 + 파일 영속화 + registry 재로딩(또는 in-memory 갱신) 코드.
   - [x] Exit criteria: 앱 재시작 후에도 새 프로젝트가 유지되고, invalid path/duplicate 입력이 명시 오류로 거절된다.

3. **Tauri UI 플로우 연결 (Folder picker + 상태 동기화)**
   - [x] Action: `FolderPlus` 클릭 시 폴더 선택기를 여는 경로를 추가하고(필요 시 Tauri dialog plugin 추가), 선택 결과를 IPC 입력으로 전달한다.
   - [x] Action: 등록 성공 후 프로젝트 목록/active badge/문서 목록을 일관되게 갱신하며 stale 상태를 정리한다.
   - [x] Action: 등록 실패 시 `projectError` 표면화 규칙과 재시도 UX를 정의한다.
   - [x] Deliverables: 헤더 아이콘 동작, 등록 성공/실패 UI, 상태 동기화 처리.
   - [x] Exit criteria: 사용자 시나리오(성공/중복/취소/경로 오류)에서 UI와 backend 상태가 서로 어긋나지 않는다.

4. **회귀 테스트 + 품질 게이트 + Compound 문서화**
   - [x] Action: React 테스트(`App.test.tsx`)에 FolderPlus 버튼 노출/클릭/등록 성공/오류 상태 회귀를 추가한다.
   - [x] Action: Rust 테스트(`project_registry_tests.rs`, `project_runtime_tests.rs`)에 등록 경로 영속화/중복 거절/docs 누락 거절 케이스를 추가한다.
   - [x] Action: 완료 후 `docs/solutions/`에 문제-원인-예방을 기록하고 필요 시 아키텍처 문서에 등록 플로우 변경점을 반영한다.
   - [x] Deliverables: 자동화 테스트, 게이트 통과 로그, solution 문서.
   - [x] Exit criteria: 전체 게이트 통과 + 등록 플로우 핵심 회귀가 테스트로 고정된다.

### Step 1 Contract (implemented)

`ProjectsSidebar` add-action prop contract:

- `addActionState: 'idle' | 'selecting' | 'registering'`
- `onRequestAddProject: () => void`
- Icon button id/test target: `projects-add-button`
- Accessibility:
  - `aria-label`/`title`는 상태 기반 문자열 사용
  - idle: `Add project`
  - selecting: `Selecting project folder...`
  - registering: `Adding project...`
- Disabled policy: `addActionState !== 'idle'` 일 때 버튼 disabled

UI state transition table:

| Current state | Trigger | Next state | UI effect |
|---|---|---|---|
| `idle` | FolderPlus click | `selecting` | 버튼 disabled + selecting 라벨 |
| `selecting` | picker cancel | `idle` | 아무 변경 없음, 오류 없음 |
| `selecting` | folder chosen | `registering` | 버튼 disabled + adding 라벨 |
| `registering` | register success | `idle` | 목록 재조회 + 신규 프로젝트 반영 |
| `registering` | register failure | `idle` | `projectError` 노출 + 재시도 가능 |

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `cd apps/app/src-tauri && cargo test`
- `pnpm --filter @coda/app test -- App.test.tsx`

## Progress Log

- 2026-02-19: planning target 수집. 요구사항을 "Projects 라벨 우측 FolderPlus 아이콘 + 클릭 시 프로젝트 추가 가능"으로 확정.
- 2026-02-19: active plan/prior art 확인. `docs/plans/completed/2026-02-19-feat-tauri-multi-project-management-plan.md`와 관련 solutions를 검토해 중복/재사용 포인트를 정리.
- 2026-02-19: 코드 플로우 확인. `ProjectsSidebar` 헤더에는 액션 버튼이 없고, App/Rust 양쪽 모두 프로젝트 등록 IPC 경로가 없음을 확인.
- 2026-02-19: 외부 리서치 필요성 평가. 고위험 주제가 아니고 로컬 문맥이 충분해 계획 단계 외부 리서치는 생략.
- 2026-02-19: step 1 완료. `ProjectsSidebar`에 FolderPlus 액션 버튼 + `addActionState/onRequestAddProject` 계약을 추가하고, 취소 포함 상태 전이 표를 plan 문서에 고정.
- 2026-02-19: step 2 완료. `project_registration.rs` + `ProjectRegistryState::register_project_by_root_path` + `register_project` IPC를 추가해 canonicalize/`docs` 검증/중복 충돌 검사/원자적 global config write/BTree 정렬 기반 deterministic 저장/registry 재로딩을 구현.
- 2026-02-19: step 3 완료. Tauri dialog plugin을 연결해 FolderPlus 클릭 → folder picker → `register_project` IPC를 구현하고, 성공 시 registry 재로딩/프로젝트 목록 동기화, 실패 시 `projectError` 노출, 취소 시 no-op 규칙을 고정. React 회귀 테스트(성공/취소/오류) 추가.
- 2026-02-19: step 4 완료. Rust/React 회귀 테스트를 보강하고 solution 문서(`docs/solutions/2026-02-19-projects-sidebar-folder-plus-registration-flow.md`)와 architecture overview를 갱신. 품질 게이트(`pnpm lint/typecheck/test/build/validate`, `cargo test`, `pnpm --filter @coda/app test -- App.test.tsx`) 통과.
