---
title: "Tauri ask 수신 시 macOS 시스템 알림 도입"
date: 2026-02-19
status: draft
tags: [tauri, app, ask-queue, macos, notification, human-in-loop, milestone-1]
milestone: M1
---

## Goal

`coda ask` 요청이 Tauri 런타임에 신규로 유입될 때 macOS 네이티브 시스템 알림을 1회 발송해, 사용자가 앱을 직접 보고 있지 않아도 즉시 human-in-the-loop 응답이 필요함을 인지할 수 있게 한다. 완료 기준은 중복 알림 방지, 권한 처리, 회귀 테스트, 전체 게이트 통과다.

## Context

- 현재 ask 요청은 CLI가 소켓으로 전달하고(`apps/cli/src/ask.ts:254`), Tauri ask runtime이 pending 세션에 적재하지만(`apps/app/src-tauri/src/ask_runtime.rs:136`), 신규 ask 도착 시 사용자에게 OS 알림을 보내는 경로는 없다.
- ask UI는 1초 폴링으로 pending 목록을 조회한다(`apps/app/src/components/AskInboxPanel.tsx:5`, `apps/app/src/components/AskInboxPanel.tsx:165`). 이 구조만으로는 "신규 ask 도착 순간"과 "기존 ask 재조회"를 구분하기 어렵다.
- ask 패널은 사용자 토글 상태에 따라 숨길 수 있으므로(`apps/app/src/App.tsx:90`, `apps/app/src/App.tsx:506`), 패널 비노출 상태에서도 도착 알림이 필요하다.
- 현재 앱 의존성에는 notification plugin이 없다(`apps/app/package.json:17`, `apps/app/src-tauri/Cargo.toml:19`). capabilities도 core/window 권한만 포함한다(`apps/app/src-tauri/capabilities/default.json:8`).
- 제품 원칙상 Ambient awareness와 attention budget을 동시에 만족해야 하므로(`docs/design-docs/core-beliefs.md:12`, `docs/design-docs/core-beliefs.md:14`), "신규 ask당 1회 알림" 계약이 필요하다.
- ask 채널의 기본 런타임 계약은 이미 ADR로 고정되어 있어(`docs/design-docs/ADR-006-human-in-loop.md:79`) 알림은 ask 브리지 계약을 깨지 않는 후속 확장으로 다뤄야 한다.

## Prior Art

- `docs/solutions/2026-02-19-cli-ask-unix-socket-bridge.md`
- `docs/solutions/2026-02-19-ask-queue-floating-right-sidebar-conditional-visibility.md`
- `docs/solutions/2026-02-19-tauri-ask-panel-header-toggle.md`

외부 리서치(진행):
- Tauri Notification plugin 설치/권한/사용법: https://v2.tauri.app/plugin/notification/
- Tauri v2 capability 모델 및 default capability 규칙: https://v2.tauri.app/security/capabilities/
- plugin 권한 키(`notification:default`) 및 설치 예시: https://github.com/tauri-apps/tauri-plugin-notification

## Approach

1. **알림 계약과 중복 방지 규칙 확정**
   - [x] Action: 알림 트리거를 "신규 ask 세션 insert 성공 시점"으로 고정하고, 동일 `ask_id` 재조회/재렌더에서는 알림을 재발송하지 않는 규칙을 확정한다.
   - [x] Action: 범위를 macOS 전용으로 제한한다(기타 OS는 미지원/no-op). 권한 거부 시 앱 기능은 유지하되 알림만 생략하는 실패 정책을 명시한다.
   - [x] Deliverables: 트리거 조건, dedupe 키, 플랫폼/권한 정책이 포함된 알림 계약.
   - [x] Exit criteria: 팀이 동일한 신규/중복/권한 거부 시나리오 기대 동작을 한 문장으로 설명할 수 있다.

   **Notification contract (locked)**
   - Trigger: `insert_pending_session` 성공 직후 emit 되는 신규 ask 이벤트 1건당 시스템 알림 1회.
   - Dedupe key: `ask_id` (이미 알림한 `ask_id`는 폴링 재조회/재렌더에서 재알림 금지).
   - Platform scope: macOS 전용, 그 외 플랫폼은 명시적 no-op.
   - Permission failure policy: permission denied/error 시 ask 큐/응답 플로우는 유지하고 알림만 생략.
   - One-sentence behavior: "신규 ask insert 성공 시 macOS에서만 ask_id당 1회 알림을 보내고, 중복 조회나 권한 거부는 알림만 건너뛰며 앱 동작은 계속된다."

2. **Tauri 런타임에서 신규 ask 이벤트 발행**
   - [x] Action: `ask_runtime`에 "신규 ask 생성 이벤트" payload를 정의하고, `insert_pending_session` 성공 경로에서만 이벤트를 발행하도록 리팩터링한다 (`apps/app/src-tauri/src/ask_runtime.rs:136`).
   - [x] Action: `lib.rs` setup 경로에 필요한 핸들을 주입해 런타임 스레드에서도 이벤트 emit이 가능하도록 연결한다 (`apps/app/src-tauri/src/lib.rs:32`).
   - [x] Deliverables: ask 생성 이벤트 타입 + emit 경로 + 실패/중복 insert 시 미발행 보장.
   - [x] Exit criteria: 신규 ask 1건 유입 시 이벤트 1건만 발행되고, 동일 ask 중복 insert는 실패하며 이벤트가 발생하지 않는다.

3. **Notification plugin 및 권한 구성 추가**
   - [ ] Action: Tauri notification plugin을 Rust/TS 양쪽에 추가하고 앱 부팅 시 plugin을 등록한다 (`apps/app/src-tauri/Cargo.toml:19`, `apps/app/src-tauri/src/lib.rs:23`, `apps/app/package.json:17`).
   - [ ] Action: capability 파일에 notification 기본 권한을 추가해 런타임 권한 오류를 사전에 차단한다 (`apps/app/src-tauri/capabilities/default.json:8`).
   - [ ] Deliverables: plugin 의존성/등록/권한 구성이 반영된 최소 동작 가능한 notification 기반.
   - [ ] Exit criteria: dev 빌드에서 notification API 호출 시 권한 스코프 오류 없이 실행된다.

4. **프론트엔드 알림 오케스트레이션 연결**
   - [ ] Action: App 계층에서 ask 생성 이벤트를 구독하고 macOS에서만 알림 함수를 호출한다. 알림 본문에는 첫 질문 텍스트 일부를 ellipsis(`...`)와 함께 노출한다.
   - [ ] Action: 알림 클릭 시 앱 포커싱(메인 윈도우 전면 복귀) 동작을 연결한다.
   - [ ] Action: notification permission 확인/요청 흐름을 추가하고, 거부/오류는 사용자 플로우를 막지 않도록 로깅만 남긴다.
   - [ ] Deliverables: 이벤트 기반 알림 발송 로직 + 권한 처리 + 중복 알림 방지 상태 관리.
   - [ ] Exit criteria: ask 패널 열림/닫힘 상태와 무관하게 신규 ask 발생 시 1회 알림이 발송되고, 알림 클릭 시 앱이 포커싱되며, 폴링 반복에서는 추가 알림이 발생하지 않는다.

5. **회귀 테스트 및 전체 게이트**
   - [ ] Action: `App.test.tsx` 또는 관련 테스트에 이벤트 수신 시 notification API 호출, 중복 억제, 비-macOS no-op, 권한 거부 no-crash 케이스를 추가한다 (`apps/app/src/App.test.tsx:516`).
   - [ ] Action: 필요 시 Rust 테스트를 확장해 ask 생성 이벤트 발행 조건(성공 insert만 발행)을 검증한다 (`apps/app/src-tauri/src/ask_runtime_tests.rs:40`).
   - [ ] Deliverables: 알림 계약 회귀 테스트와 실행 로그.
   - [ ] Exit criteria: 회귀 테스트가 알림 중복/미발송/권한 예외 회귀를 차단하고, 전체 품질 게이트가 통과한다.

6. **수동 macOS 스모크 + 컴파운드 기록**
   - [ ] Action: macOS에서 `tauri dev`로 ask 유입 시 실제 시스템 알림 노출을 확인하고, 권한 첫 요청/거부/재허용 시나리오를 수동 검증한다.
   - [ ] Action: 결과를 `docs/solutions/`에 기록하고, 알림 정책이 아키텍처 결정(예: 알림 채널 우선순위)에 영향을 주면 관련 design doc을 갱신한다.
   - [ ] Deliverables: 수동 검증 결과 + solution 문서 + 필요 시 아키텍처 문서 업데이트.
   - [ ] Exit criteria: 로컬 재현 절차와 예방 규칙이 문서화되어 후속 알림 기능에서 재사용 가능하다.

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test -- App.test.tsx`
- `pnpm --filter @coda/app test -- AskInboxPanel.test.tsx`
- `cd apps/app/src-tauri && cargo test`
- `pnpm --filter @coda/app tauri dev` (manual smoke: ask 생성 시 macOS notification 1회 노출, 질문 텍스트 미리보기 ellipsis, 알림 클릭 시 앱 포커싱, 중복 폴링 미재알림, 권한 거부 시 앱 지속 동작)

## Progress Log

- 2026-02-19: Approach step 2 완료. `ask_session_created` 이벤트 payload를 추가하고, insert 성공 경로에서만 emit되도록 연결했다. `cargo test ask_runtime`으로 중복 insert 미발행 계약을 검증했다.
- 2026-02-19: Approach step 1 완료. 신규 ask insert 성공 시점 트리거 + `ask_id` dedupe + macOS 전용 + 권한 거부 시 no-op 계약을 확정했다.
- 2026-02-19: planning target 확정. "Tauri 앱에서 ask 도착 시 macOS 시스템 알림" 요구를 확인했다.
- 2026-02-19: `docs/plans/active/`를 확인했고 동일 주제 active plan은 없음을 확인했다.
- 2026-02-19: `docs/solutions/` prior art와 ask 코드 경로(`apps/cli/src/ask.ts`, `apps/app/src-tauri/src/ask_runtime.rs`, `apps/app/src/components/AskInboxPanel.tsx`, `apps/app/src/App.tsx`)를 검토해 이벤트 트리거 지점을 정리했다.
- 2026-02-19: 외부 리서치가 필요하다고 판단했다. 이유는 Tauri v2 notification plugin 설치/권한(capability) 규칙과 macOS 권한 플로우를 정확히 반영해야 하기 때문이다.
- 2026-02-19: Tauri 공식 문서 및 plugin 저장소를 확인하고, plugin 등록 + capability 권한 추가 + permission 체크 흐름을 계획에 반영했다.
- 2026-02-19: 사용자 결정 반영. 알림 클릭 시 앱 포커싱, 알림 본문 질문 텍스트 일부 + ellipsis 노출, 플랫폼 범위 macOS 전용으로 확정했다.

## Assumptions / Open Questions

- 현재 미해결 질문 없음. 사용자 결정 3건(포커싱/ellipsis 미리보기/macOS 전용) 반영 완료.
