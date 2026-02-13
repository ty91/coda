# PRD: Coda — Personal Agentic Engineering Tool

## 1. 개요

### 1.1 제품 비전

개인용 AI 에이전틱 엔지니어링 도구로, 이슈 등록부터 PR 작성까지의 소프트웨어 개발 전 과정을 AI 에이전트가 수행하는 **클로즈드 루프(closed loop)** 시스템이다. 사용자는 의사결정과 리뷰에 집중하고, 리서치·계획·구현·코드 리뷰·PR 작성은 AI 에이전트들이 자율적으로 수행한다.

### 1.2 핵심 가치

- **자동화된 개발 루프**: 이슈 → 리서치 → 계획 → 구현 → 리뷰 → PR의 전 과정을 에이전트가 주도
- **사람의 판단이 필요한 지점에만 개입**: 의사결정, 계획 검토, 최종 승인
- **플러그인 확장성**: 커맨드, 스킬, CLI, MCP를 플러그인으로 제공하여 에이전트의 능력을 확장

### 1.3 타겟 유저

- 개인 개발자 (본인 전용, MVP)
- 추후 오픈소스 공개 고려

### 1.4 제품 이름

Coda

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  UI Layer   │  │  Daemon /    │  │  Notification      │  │
│  │  (WebView)  │◄─┤  Orchestrator├──┤  (Slack webhook)   │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────┘  │
│         │                │                                   │
│         │         ┌──────┴───────┐                           │
│         │         │  Agent Pool  │                           │
│         │         │  (spawn/mgmt)│                           │
│         │         └──┬───────┬───┘                           │
│         │            │       │                               │
│         │      ┌─────┴──┐ ┌──┴──────┐                       │
│         │      │ Claude │ │  Codex  │                       │
│         │      │ Code   │ │  CLI    │                       │
│         │      │ (stdin) │ │ (stdin) │                       │
│         │      └────────┘ └─────────┘                       │
└─────────┴───────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │  Jira / │
    │ Linear  │
    └─────────┘
```

### 2.2 핵심 컴포넌트

| 컴포넌트 | 역할 | 기술 |
|----------|------|------|
| **Tauri Desktop App** | 네이티브 UI, OS 인터페이스 제공 | Tauri + WebView (프론트엔드 프레임워크 TBD) |
| **Daemon / Orchestrator** | 에이전트 프로세스 관리, 워크플로우 상태 머신, 이벤트 라우팅 | Rust (Tauri 백엔드) 또는 별도 데몬 프로세스 |
| **Agent Pool** | Claude Code / Codex CLI 프로세스 spawn 및 stdin pipe 제어 | 프로세스 관리, stdin/stdout 스트림 핸들링 |
| **Notification Service** | Slack webhook을 통한 유저 알림 | Slack Incoming Webhook API |
| **Plugin System** | 커맨드, 스킬, MCP 서버를 에이전트에 제공 | 글로벌 프롬프트/스킬 레포 기반 |

### 2.3 에이전트 CLI 역할 분담

| CLI 도구 | 역할 | 실행 모드 |
|----------|------|----------|
| **Claude Code** | 브레인스토밍, 리서치, 계획 작성, 계획 리뷰, 코드 리뷰, PR 작성 | Interactive (`--resume` 활용) |
| **Codex CLI** | 코드 구현, 코드 리뷰 | Non-interactive (`codex exec` + `--json`) |

### 2.4 에이전트-유저 통신 방식

에이전트와 유저 간의 통신은 **데몬 → CLI stdin pipe** 패턴으로 통일한다.

- **유저 → 에이전트**: 유저가 웹 UI에서 응답/지시 입력 → Daemon이 해당 CLI 프로세스의 stdin에 주입
- **에이전트 → 유저**: 에이전트가 프롬프트 내 스킬/MCP를 통해 시스템에 메시지 전달 → Daemon이 UI 업데이트 + Slack 노티
- **프로세스 크래시**: Daemon이 exit code 감지 → 즉시 웹 UI 및 Slack으로 에러 노티

---

## 3. 외부 연동

### 3.1 이슈 트래커

- **Jira** 및 **Linear** 연동 지원
- 이슈 목록 fetch, 이슈 상세 읽기, 상태 업데이트
- 연동 방식: REST API 또는 MCP

### 3.2 Git

- 이슈 작업 시작 시 새 브랜치 또는 워크트리(worktree) 추가
- Phase 단위 커밋으로 체크포인트 관리
- PR 자동 작성

### 3.3 Slack

- Incoming Webhook을 통한 단방향 알림
- 알림 대상: 유저 입력 필요 시점, 에러 발생, 작업 완료

---

## 4. 핵심 워크플로우: 클로즈드 루프

### Phase 1: 이슈 선택 및 작업 초기화

1. Jira/Linear에서 이슈 목록을 가져와 Tauri 앱에서 표시
2. 유저가 OS 네이티브 인터페이스를 통해 작업할 이슈를 선택
3. 시스템이 새 브랜치 또는 워크트리를 생성하고 작업 환경 초기화

### Phase 2: 리서치

4. Claude Code가 이슈 내용 분석 후, 복수의 서브에이전트를 통해 병렬 리서치 수행:
   - 현재 코드베이스 구조 및 구현 현황 파악
   - 코딩 컨벤션 분석
   - 외부 지식 웹 리서치
   - 기타 이슈 해결에 필요한 도메인 지식 수집
5. 리서치 결과를 구조화된 마크다운 템플릿에 정리

### Phase 3: 정보 수집 및 의사결정

6. Claude Code가 유저에게 의사결정이 필요한 사항이나 추가 정보를 질문
7. 유저가 Tauri 앱의 Q&A 인터페이스를 통해 응답
8. 필요 시 Phase 2–3 반복하여 정보 축적

### Phase 4: 계획 수립

9. Claude Code가 구조화된 마크다운 템플릿에 따라 계획 파일 작성
10. 유저가 Tauri 앱의 계획 에디터에서 계획 파일을 검토하며 어노테이션 및 코멘트 추가 후 제출
11. Claude Code가 유저 피드백을 반영하여 계획 업데이트
12. 유저가 만족할 때까지 10–11 반복
13. 계획 파일을 git에 커밋 (체크포인트)

### Phase 5: 구현

14. 유저가 구현 시작 명령 (버튼 클릭)
15. Codex CLI가 `codex exec` 모드로 계획에 따라 구현 시작
16. 구현 중 문제 발생 시:
    - **에이전트 레벨 문제**: Codex가 프롬프트 내 스킬/MCP를 통해 시스템에 노티 → 유저가 지침 전달
    - **프로세스 크래시**: Daemon이 exit code 감지 → 즉시 웹 UI 및 Slack으로 에러 노티
17. 유저의 지침은 Daemon을 통해 Codex stdin으로 주입 (세션 resume)
18. 구현 완료 후 git 커밋 (체크포인트)

### Phase 6: 코드 리뷰

19. 복수의 서브에이전트가 각 관점에서 독립적으로 코드 리뷰 수행:
    - 보안 취약점
    - 코드 가독성
    - 테스트 커버리지
    - 테스트 코드 퀄리티
    - 코딩 컨벤션 준수
    - (추가 관점 확장 가능)
20. 리뷰 결과를 종합하여 전체 리뷰 리포트 작성
21. 리뷰 검토 에이전트(meta-reviewer)가 각 리뷰 코멘트의 타당성을 검증하여 노이즈 필터링

### Phase 7: 수정 및 마무리

22. 타당한 리뷰 코멘트에 대해 Codex가 코드 수정
23. 수정 완료 후 git 커밋 (체크포인트)

### Phase 8: PR 및 완료

24. Claude Code가 PR 본문 작성 (변경 사항 요약, 리뷰 반영 내역 포함)
25. 유저에게 완료 보고 (Tauri 앱 + Slack)

---

## 5. 상태 관리 및 데이터 모델

### 5.1 버전 관리 대상 (Git)

| 데이터 | 설명 |
|--------|------|
| **계획 파일** | 구조화된 마크다운 (.md) |
| **코딩 컨벤션** | 프로젝트별 컨벤션 문서 |
| **솔루션 문서** | 리서치 결과 중 보존 가치가 있는 것 |
| **소스 코드** | 구현 결과물 |

### 5.2 임시 데이터 (Temp Filesystem)

| 데이터 | 설명 |
|--------|------|
| **리서치 중간 결과** | 서브에이전트들의 raw 리서치 출력 |
| **Q&A 히스토리** | 유저와 에이전트 간 질의응답 로그 |
| **CLI 세션 로그** | Claude Code / Codex의 stdout/stderr |
| **워크플로우 상태** | 현재 phase, 진행률 등 런타임 상태 |

### 5.3 체크포인트 전략

- **Phase 단위 커밋**: 각 Phase 완료 시 git commit으로 체크포인트 생성
- **롤백**: Phase 단위로 롤백 가능 (git reset to checkpoint commit)
- **커밋 메시지 컨벤션**: `[agent:phase-N] {phase 설명}` 형태로 체크포인트 커밋 식별

---

## 6. 플러그인 시스템

### 6.1 구조

글로벌 프롬프트와 스킬은 **이 프로젝트의 전용 레포**에서 관리하며, Claude Code / Codex가 플러그인으로 설치하여 전역적으로 사용한다. 개별 프로젝트 레포에는 포함하지 않는다.

```
project-repo/              ← 이 프로젝트 레포
├── plugins/
│   ├── skills/            ← 에이전트 스킬 정의
│   ├── prompts/           ← 단계별 시스템 프롬프트
│   ├── mcp-servers/       ← MCP 서버 설정
│   └── commands/          ← 커스텀 CLI 커맨드
├── templates/
│   ├── plan.md            ← 계획 파일 마크다운 템플릿
│   └── research.md        ← 리서치 결과 마크다운 템플릿
└── ...
```

### 6.2 제공 형태

- **커맨드**: CLI에서 직접 호출 가능한 명령어
- **스킬**: 에이전트가 특정 작업 수행 시 참조하는 지식/절차
- **MCP 서버**: 에이전트와 외부 시스템 간 통신 (이슈 트래커, 알림 등)
- **프롬프트**: 각 Phase별 에이전트의 시스템 프롬프트

### 6.3 리뷰어 관점 설정

Phase 6의 코드 리뷰 관점들은 현재 하드코딩이나, 설정 파일을 통해 유저가 관점을 추가/제거/수정할 수 있다.

```yaml
# reviewers.yaml (예시)
reviewers:
  - name: security
    prompt_file: prompts/review-security.md
    enabled: true
  - name: readability
    prompt_file: prompts/review-readability.md
    enabled: true
  - name: test-coverage
    prompt_file: prompts/review-test-coverage.md
    enabled: true
  - name: test-quality
    prompt_file: prompts/review-test-quality.md
    enabled: true
  - name: convention
    prompt_file: prompts/review-convention.md
    enabled: true
```

---

## 7. Tauri Desktop App UI

### 7.1 MVP 화면 구성

| 화면 | 주요 기능 |
|------|----------|
| **프로젝트 설정** | 작업 대상 레포 등록/선택 (OS 네이티브 디렉토리 선택) |
| **이슈 목록** | Jira/Linear에서 가져온 이슈 목록 표시, 작업 시작 버튼 |
| **작업 상태 대시보드** | 현재 진행 중인 작업들의 Phase 진행률, 병렬 작업 현황 |
| **계획 에디터** | 마크다운 계획 파일 렌더링, 어노테이션/코멘트 달기, 제출 버튼 |
| **Q&A 인터페이스** | 에이전트의 질문 표시, 유저 응답 입력 |
| **리뷰 결과 뷰** | 코드 리뷰 결과 종합, 각 리뷰어별 상세 코멘트 |

### 7.2 알림 체계

- **앱 내 알림**: 유저 입력 필요 시, 에러 발생 시, 작업 완료 시
- **Slack 알림**: 위와 동일한 이벤트를 Slack webhook으로 전달

---

## 8. 동시성

- 여러 이슈를 **병렬**로 작업 가능
- 각 이슈는 독립된 브랜치/워크트리에서 실행
- 각 이슈별로 독립된 CLI 프로세스(Claude Code, Codex) 인스턴스가 할당
- 대시보드에서 전체 병렬 작업 현황을 한눈에 확인

---

## 9. 보안 및 권한

- 에이전트는 **모든 파일/디렉토리 접근 권한** 보유
- 외부 API 호출 권한 제한 없음
- 가드레일은 **프롬프트 레벨**에서 명확하게 설정
- 시크릿(API 키 등)은 환경 변수 또는 OS keychain으로 관리

---

## 10. 비용 모델

- Claude Code: 구독 플랜 (Max 등) 사용 → 별도 API 비용 없음
- Codex CLI: 구독 플랜 (ChatGPT Pro/Plus 등) 사용 → 별도 API 비용 없음
- 토큰/비용 모니터링 불필요

---

## 11. 기술 스택 (예상)

| 영역 | 기술 |
|------|------|
| **Desktop App** | Tauri v2 |
| **Frontend** | TBD (React / Svelte / SolidJS 등) |
| **Backend (Daemon)** | Rust (Tauri 내장) 또는 별도 프로세스 |
| **프로세스 관리** | Rust 또는 Node.js child_process |
| **이슈 트래커 연동** | Jira REST API, Linear GraphQL API |
| **알림** | Slack Incoming Webhook |
| **AI Agent CLI** | Claude Code, OpenAI Codex CLI |
| **버전 관리** | Git (libgit2 또는 CLI) |

---

## 12. MVP 범위

이 문서 전체가 MVP이다. 다음은 MVP에 포함되는 전체 스코프의 요약이다:

1. Tauri 데스크톱 앱 (6개 핵심 화면)
2. Jira/Linear 연동을 통한 이슈 fetch
3. Claude Code 기반 리서치 + 계획 수립 루프
4. Codex CLI 기반 구현 루프
5. 다관점 코드 리뷰 + 메타 리뷰어
6. Phase 단위 체크포인트 + 롤백
7. 플러그인 시스템 (프롬프트, 스킬, MCP, 커맨드)
8. Slack 알림
9. 병렬 작업 지원
10. PR 자동 작성

---

## 13. 미결 사항 (Open Questions)

| # | 항목 | 상태 |
|---|------|------|
| 1 | ~~제품 이름~~ | Coda |
| 2 | 프론트엔드 프레임워크 선택 | TBD |
| 3 | 계획 파일 마크다운 템플릿 상세 | 유저 보유, 추후 반영 |
| 4 | 리서치 결과 마크다운 템플릿 상세 | 유저 보유, 추후 반영 |
| 5 | Daemon을 Tauri 내장으로 할지 별도 프로세스로 할지 | TBD |
| 6 | 이슈 트래커 연동 시 Jira/Linear 중 우선 구현 대상 | TBD |
