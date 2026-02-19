---
title: "CLI `coda ask` 다중 질문 UI 브리지 추가"
date: 2026-02-19
status: draft
tags: [cli, human-in-loop, ask-command, agent-runtime, milestone-1]
milestone: M1
---

## 목표

에이전트가 실행한 `coda ask`가 질문 묶음(여러 질문)을 Tauri 앱에 표시하고, 사용자가 선택지/노트 입력을 제출하면 블로킹된 CLI가 즉시 해제되며 구조화된 응답(JSON)을 안정적으로 반환한다.

## 맥락

- 현재 CLI 스캐폴드는 `plan`, `work`, `review`, `compound`, `status`만 등록되어 있고 질의 명령이 없다 (`apps/cli/src/main.ts:19`, `apps/cli/src/main.ts:75`).
- 경계 입력 검증은 이미 `@coda/core`에 있으므로 `ask` 요청 스키마와 응답 스키마도 같은 경계에서 검증해야 한다 (`packages/core/src/validation.ts:3`, `packages/core/src/validation.ts:17`).
- CLI 명령 네이밍 규칙은 `coda <verb>` 형태이며 약어를 피해야 하므로 `ask`는 규칙에 맞는다 (`docs/design-docs/ux-specification.md:30`, `docs/design-docs/ux-specification.md:53`).
- Human-in-the-loop ADR은 CLI 입력 경로를 1급 채널로 정의하므로, 본 기능은 해당 경로를 확장하는 형태여야 한다 (`docs/design-docs/ADR-006-human-in-loop.md:69`, `docs/design-docs/ADR-006-human-in-loop.md:75`).
- M1 범위에서는 Slack/병렬 오케스트레이션이 제외되므로, 1차 구현은 CLI+Tauri 로컬 동기 흐름으로 제한해야 한다 (`docs/PRD.md:264`, `docs/PRD.md:266`, `docs/PRD.md:269`).
- 에이전트 프로바이더는 stdin/stdout 기반 서브프로세스이므로 `coda ask` 출력은 기계 파싱 가능한 고정 스키마여야 한다 (`docs/design-docs/architecture-overview.md:88`, `docs/design-docs/architecture-overview.md:90`).
- 현재 Tauri 백엔드는 health/docs 명령만 노출하므로 ask 조회/제출 명령을 신규 추가해야 한다 (`apps/app/src-tauri/src/lib.rs:20`, `apps/app/src-tauri/src/lib.rs:24`).
- 현재 React 앱은 docs 뷰만 렌더링하므로 질문 대기/응답 전용 패널을 추가해야 한다 (`apps/app/src/App.tsx:157`, `apps/app/src/App.tsx:181`).
- 최신 요구사항은 “여러 질문을 한 번에 전달”하고 입력/출력 계약을 `functions.request_user_input`와 거의 동일하게 맞추는 것이다.

## Prior Art

- 직접 재사용 가능한 `coda ask` 구현 없음 (`docs/solutions/` 전체 검색 결과 기준).
- HITL 채널 원칙과 UX 제약 재사용:
  - `docs/design-docs/ADR-006-human-in-loop.md`
  - `docs/design-docs/ux-specification.md`
- CLI 런타임/출력 계약 기준 재사용:
  - `docs/design-docs/ADR-005-cli.md`
  - `docs/design-docs/architecture-overview.md`
- 앱 구조/테스트 패턴 참조:
  - `apps/app/src/App.tsx`
  - `apps/app/src/App.test.tsx`
- 결론: prior art는 계약/아키텍처 기준으로 재사용, ask 자체는 신규 설계 필요.

## 브레인스토밍

1. **옵션 A: 단일 질문 플래그 반복 확장(`--question`, `--option`)**
   - 장점: 기존 단일 질문 CLI 플래그를 일부 재사용할 수 있다.
   - 단점: 다중 질문 구조가 복잡해지고 `request_user_input` 형태와 멀어진다.
2. **옵션 B: `request_user_input` 유사 JSON 요청 + 파일 메일박스**
   - 장점: 장애 복구와 디버깅이 단순하다.
   - 단점: 폴링/파일 정리 비용이 필요하다.
3. **옵션 C: Unix socket IPC + 푸시 기반 실시간 브리지**
   - 장점: 반응성이 높고 폴링이 필요 없다.
   - 단점: 소켓 수명주기/재연결 설계가 필요하다.

결정: 이번 계획은 **옵션 C**를 채택한다. 즉, `request_user_input` 유사 JSON 계약 + Unix socket 브리지로 구현한다.

## 확정된 결정

### 1) Ask 세션 라이프사이클과 IPC 경계

- `coda ask`는 에이전트 서브프로세스에서 시작한다.
- Tauri 백엔드는 Unix socket 서버를 `~/.coda/runtime/ask.sock`에 바인딩한다.
- CLI는 소켓 연결 후 ask 요청 JSON 프레임을 전송한다.
- 백엔드는 pending ask를 메모리 큐에 적재하고 React 질문 패널에 노출한다.
- 사용자가 제출/취소하면 백엔드가 같은 세션 채널로 응답 JSON 프레임을 즉시 반환한다.
- 블로킹된 `coda ask`는 소켓 응답을 수신하면 즉시 해제된다.
- 세션 종료 후 백엔드는 ask 결과 메타데이터만 로컬 로그에 남긴다(PII 최소화).

### 2) 요청 입력 계약 (`request_user_input` 호환)

- 기본 요청은 `questions` 배열을 가진 JSON 객체이다.
- 질문 수는 1개 이상이며 하드 제한은 두지 않는다.
- 질문 4개는 UX 소프트캡으로 사용한다(4개 초과도 수용).
- 각 질문은 다음 필드를 가진다.
  - `header`: 최대 12자.
  - `id`: snake_case, 질문 묶음 내 유일값.
  - `question`: 단문 질문 텍스트.
  - `options`: 2개 이상 상호배타 선택지(상한 없음).
- 각 선택지는 다음 필드를 가진다.
  - `label`: UI 노출 라벨.
  - `description`: 한 문장 설명.
- 권장안은 선택 사항이다.
- 권장안을 표기하는 경우 해당 라벨에 `(Recommended)` 접미사를 포함한다.
- 요청 JSON에는 `Other` 선택지를 넣지 않는다. UI가 자동으로 `Other` 입력 경로를 추가한다.
- Coda 확장 필드로 전역 노트 설정 `note`를 허용한다.
  - `note.label`: 노트 입력 라벨.
  - `note.required`: 제출 전 노트 필수 여부.

### 3) 응답 출력 계약 (`request_user_input` 유사)

- `--json` 출력은 아래 구조를 따른다.
  - `ask_id` (string)
  - `answers` (array)
    - `id` (string)
    - `selected_label` (string)
    - `selected_index` (number | null)
    - `used_other` (boolean)
    - `other_text` (string | null)
  - `note` (string | null)
  - `status` (`answered` | `cancelled` | `expired`)
  - `answered_at_iso` (ISO-8601 UTC string | null)
  - `source` (`tauri-ui`)
- 기본 텍스트 출력은 질문 ID별 선택 결과를 한 줄씩 출력한다.

### 4) CLI 인자 계약

- `coda ask`는 구조화 입력 모드만 지원한다.
- 요청 JSON은 표준입력(stdin)으로만 받는다.
  - 예: `echo '<json>' | coda ask`
  - 예: `cat ./fixtures/ask/multi-question.json | coda ask`
- stdin이 비어 있거나 JSON 파싱/검증에 실패하면 코드 `2`로 종료한다.
- 선택 인자:
  - `--id <value>`: 상관관계 ID(최대 64자, `[A-Za-z0-9._:-]+`).
  - `--timeout-ms <value>`: 기본 `0`(무기한 대기).
  - `--json`: 구조화 응답 출력.
- 이번 스코프에서 터미널 직접 답변 입력은 지원하지 않는다. 답변 소스는 Tauri 제출만 허용한다.
- `coda ask --help` 예시 문구 초안:
  - `echo '{"questions":[...]}' | coda ask`
  - `cat ./fixtures/ask/multi-question.json | coda ask --json`
  - `cat ./fixtures/ask/multi-question-timeout.json | coda ask --timeout-ms 30000`

### 5) 종료 코드 계약

- `0`: 성공(유효 응답 수집/출력).
- `1`: 런타임 I/O 실패.
- `2`: 사용법/검증 실패.
- `3`: 타임아웃 만료(`--timeout-ms`).
- `4`: 사용자가 Tauri에서 취소.
- `130`: 사용자 인터럽트(`SIGINT` / Ctrl+C).

### 6) Tauri UI 계약

- 질문 묶음 카드에 질문 리스트를 렌더링하고 각 질문은 라디오 선택 + `Other` 입력을 제공한다.
- 모든 질문이 응답되기 전에는 Submit을 비활성화한다.
- `note.required=true`이면 노트 입력이 비어 있으면 Submit을 막는다.
- Cancel은 취소 응답을 기록하고 CLI 코드 `4`로 해제되게 한다.
- 타임아웃 지난 요청은 만료 상태로 표시하고 제출을 차단한다.

### 7) Ask I/O 계약 표

| 구분 | 필드 | 타입 | 제약 |
|---|---|---|---|
| Request | `questions` | `AskQuestion[]` | 1개 이상, 4개 소프트캡(초과 허용) |
| Request.Question | `header` | `string` | trim 후 1..12자 |
| Request.Question | `id` | `string` | snake_case, 요청 내 유일 |
| Request.Question | `question` | `string` | trim 후 1자 이상 |
| Request.Question | `options` | `AskOption[]` | 2개 이상, 상한 없음 |
| Request.Option | `label` | `string` | trim 후 1자 이상, 권장안이면 `(Recommended)` 접미사 |
| Request.Option | `description` | `string` | trim 후 1자 이상 |
| Request.Note | `note.label` | `string` | 선택, trim 후 1자 이상 |
| Request.Note | `note.required` | `boolean` | 선택, 기본값 `false` |
| Response | `ask_id` | `string` | 1자 이상 |
| Response | `answers` | `AskAnswer[]` | 질문별 1개 응답 |
| Response.Answer | `id` | `string` | 요청 질문 `id`와 매칭 |
| Response.Answer | `selected_label` | `string` | 1자 이상 |
| Response.Answer | `selected_index` | `number \| null` | 옵션 인덱스 또는 `null` |
| Response.Answer | `used_other` | `boolean` | `true`면 `other_text` 필요 |
| Response.Answer | `other_text` | `string \| null` | `used_other=true`면 trim 후 1자 이상 |
| Response | `note` | `string \| null` | 선택 노트 |
| Response | `status` | `'answered' \| 'cancelled' \| 'expired'` | 종료 상태 |
| Response | `answered_at_iso` | `string \| null` | UTC ISO-8601 |
| Response | `source` | `'tauri-ui'` | 고정값 |

### 8) 상태 전이 매트릭스

| 현재 상태 | 이벤트 | 다음 상태 | CLI 종료 코드 | 비고 |
|---|---|---|---|---|
| `pending` | 사용자 Submit | `answered` | `0` | 유효 응답 JSON 출력 |
| `pending` | 사용자 Cancel | `cancelled` | `4` | 취소 응답 JSON 출력 |
| `pending` | `timeout-ms` 만료 | `expired` | `3` | 만료 응답(JSON/텍스트) |
| `pending` | `SIGINT` | `interrupted` | `130` | 인터럽트 즉시 종료 |
| `pending` | 소켓 I/O 실패 | `failed` | `1` | 연결/송수신 오류 |
| `pending` | stdin/스키마 검증 실패 | `rejected` | `2` | 런타임 진입 전 실패 |

## 접근 방식

1. **다중 질문 계약 고정 (`request_user_input` 정합성 포함)**
   - [x] Action: `questions/header/id/question/options` 필드 제약을 문서/스키마로 고정한다.
   - [x] Action: Coda 확장 필드(`note`)와 기본/JSON 출력 형식을 확정한다.
   - [x] Deliverables: ask I/O 계약 표와 상태 전이 매트릭스.
   - [x] Exit criteria: CLI, Tauri, core가 같은 스키마를 공유한다.

2. **공유 타입/검증 계층 구현 (`@coda/core`)**
   - [x] Action: `AskRequestBatch`, `AskQuestion`, `AskOption`, `AskResponseBatch` 타입 추가.
   - [x] Action: zod 스키마로 필드 길이, id 유일성, 옵션 최소 개수, 권장안 표기 규칙(선택)을 검증한다.
   - [x] Action: 손상 JSON/제약 위반 케이스 회귀 테스트를 추가한다.
   - [x] Deliverables: core export 갱신 + 테스트 통과.
   - [x] Exit criteria: 잘못된 요청은 런타임 진입 전에 코드 `2`로 실패한다.

3. **CLI 블로킹 런타임 구현 (`apps/cli`)**
   - [x] Action: `ask` 명령 등록 및 stdin JSON 입력 파싱(EOF까지 읽기)을 추가한다.
   - [x] Action: Unix socket 연결/요청 전송/응답 대기, timeout/cancel/interrupt 처리 루프를 구현한다.
   - [x] Action: 기본 텍스트 출력과 JSON 출력 포맷을 구현한다.
   - [x] Deliverables: 다중 질문 블로킹 `coda ask` + help 텍스트.
   - [x] Exit criteria: 유효 Tauri 응답이 도착할 때만 명령이 해제된다.

4. **Tauri 백엔드/프런트엔드 질문 패널 구현 (`apps/app`)**
   - [ ] Action: ask socket 서버 초기화, pending ask 조회/응답 제출 Tauri 명령을 추가한다.
   - [ ] Action: 다중 질문 렌더링 컴포넌트(선택지 + 자동 Other + 노트 + submit/cancel)를 구현한다.
   - [ ] Action: pending 목록 새로고침과 stale 표시 로직을 추가한다.
   - [ ] Deliverables: `apps/app/src-tauri/src` ask 모듈 + `apps/app/src` ask UI 컴포넌트.
   - [ ] Exit criteria: CLI에서 생성된 질문 묶음이 앱에 나타나고 제출 시 CLI가 해제된다.

5. **회귀 및 통합 검증 강화**
   - [ ] Action: core/cli에 다중 질문 제약, 빈 stdin/손상 JSON, timeout, cancel, 소켓 단절/손상 페이로드 테스트를 추가한다.
   - [ ] Action: app 테스트에 질문 렌더링, 권장안(선택)/Other/노트 검증, 질문 4개 소프트캡 경고 및 5개 이상 수용 검증, submit/cancel invoke 검증을 추가한다.
   - [ ] Action: `blocked coda ask -> app submit -> CLI unblock` 통합 테스트 스크립트를 추가한다.
   - [ ] Deliverables: core/cli/app/tauri 테스트 세트 갱신.
   - [ ] Exit criteria: 다중 질문/교차 서피스 회귀를 자동으로 탐지한다.

6. **전체 게이트 및 수동 스모크**
   - [ ] Action: 레포 전체 게이트(`lint/typecheck/test/build/validate`)를 실행한다.
   - [ ] Action: 앱 실행 상태에서 다중 질문 ask를 생성하고 UI 제출까지 수동 E2E 스모크를 수행한다.
   - [ ] Deliverables: 통과 로그와 수동 검증 결과.
   - [ ] Exit criteria: 기존 명령 회귀 없이 전체 ask 흐름이 동작한다.

7. **컴파운드 문서화 완료**
   - [ ] Action: 다중 질문 ask 패턴/실수/예방 전략을 `docs/solutions/`에 기록한다.
   - [ ] Action: human-in-loop 계약 변경점이 있으면 관련 설계 문서를 갱신한다.
   - [ ] Deliverables: 신규 solution 문서 + 링크 업데이트.
   - [ ] Exit criteria: 후속 기능에서 재사용 가능한 지식이 남는다.

## 검증

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm validate`
- `pnpm --filter @coda/app test`
- `pnpm --filter @coda/app tauri dev` (다중 질문 ask 패널 수동 스모크)
- `pnpm --filter @coda/cli exec node dist/main.js ask --help` (stdin-only 사용법 확인)
- `cat ./fixtures/ask/multi-question.json | pnpm --filter @coda/cli exec node dist/main.js ask --json` (Tauri submit 전까지 블로킹)
- `cat ./fixtures/ask/multi-question-timeout.json | pnpm --filter @coda/cli exec node dist/main.js ask --timeout-ms 30000` (timeout/cancel 검증)

## Risks

- **소켓 서버 미기동 상태에서 ask 호출**: CLI가 연결 실패로 즉시 실패 가능.
  - Mitigation: 명확한 에러 메시지 + 재시도 불필요 조건 구분 + 종료 코드 `1` 고정.
- **소켓 파일 stale/권한 문제**: `~/.coda/runtime/ask.sock` 재사용 시 bind 실패 가능.
  - Mitigation: 서버 시작 시 stale 소켓 정리, 디렉터리/퍼미션 사전 검증.
- **다중 ask 동시성 충돌**: 응답 매칭 오류 시 잘못된 세션 해제 위험.
  - Mitigation: `ask_id` 상관관계 강제, 세션별 채널/맵 분리, 충돌 테스트 추가.
- **질문/옵션 대량 입력으로 UI 가독성 저하**: 소프트캡(4) 초과 시 사용성 저하.
  - Mitigation: 4개 초과 경고, 스크롤/요약 UI, 제출 전 누락 검증 유지.
- **stdin 파이프 사용성 실패**: 빈 stdin/잘못된 JSON 입력 빈도 높음.
  - Mitigation: `--help` 예시 강화, 파싱 오류 위치 포함 메시지, 종료 코드 `2` 일관 적용.

## 진행 로그

- 2026-02-19: 계획 대상 확정. 에이전트가 `coda ask`로 사용자 질의를 수행해야 한다.
- 2026-02-19: `docs/plans/active/` 확인. 동일 주제 active plan이 없다.
- 2026-02-19: `docs/solutions/` prior art 확인. 직접 재사용 가능한 ask 사례가 없다.
- 2026-02-19: `docs/PRD.md`, `docs/design-docs/ADR-005-cli.md`, `docs/design-docs/ADR-006-human-in-loop.md`, `docs/design-docs/ux-specification.md`, 현재 CLI/core 코드를 검토했다.
- 2026-02-19: 외부 리서치는 생략했다. 현재 설계 문서와 로컬 코드 정보로 1차 설계가 충분하다.
- 2026-02-19: 요구사항 변경 반영. `coda ask`는 단일 질문이 아니라 다중 질문 묶음을 처리해야 하며, I/O 계약을 `request_user_input`과 거의 동일하게 맞춘다.
- 2026-02-19: 단일 질문 플래그 모델을 폐기하고 `questions` JSON 계약 + 소켓 브리지 모델로 재정의했다.
- 2026-02-19: 미해결 가정 마무리. 질문 수 소프트캡(4, 하드 제한 없음), 옵션 최소 제약(2+, 상한 없음), 권장안 선택 표기, 자동 Other, 종료 코드(`0/1/2/3/4/130`)를 확정했다.
- 2026-02-19: 브리지 전송 계층 결정을 수정했다. 파일 메일박스 대신 Unix socket(`~/.coda/runtime/ask.sock`)을 1차 구현으로 채택했다.
- 2026-02-19: CLI 입력 계약을 단순화했다. `--questions-json/--questions-file` 플래그를 제거하고 stdin JSON 파이프 입력으로 통일했다.
- 2026-02-19: CLI help 텍스트 초안에 stdin 파이프 사용 예시를 추가했다.
- 2026-02-19: Step 1 완료. Ask I/O 계약 표와 상태 전이 매트릭스를 문서에 고정했다.
- 2026-02-19: Step 2 완료. `packages/core/src/contracts.ts`, `packages/core/src/validation.ts`, `packages/core/src/validation.test.ts`에 ask 타입/검증/회귀 테스트를 추가했고 `pnpm --filter @coda/core test/typecheck/build`를 통과했다.
- 2026-02-19: Step 3 완료. `apps/cli/src/main.ts`, `apps/cli/src/ask.ts`, `apps/cli/src/ask.test.ts`에 stdin 기반 `ask` 명령/Unix socket 블로킹 런타임/JSON-텍스트 출력을 구현했고 `pnpm --filter @coda/cli lint/test/typecheck/build`를 통과했다.
