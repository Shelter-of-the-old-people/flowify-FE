# 중간발표 팀 작업 분배표

> **작성일:** 2026-04-14  
> **대상:** Flowify FE 팀원 전원  
> **연결 문서:** [AI_COLLABORATION_CONTRACT.md](./AI_COLLABORATION_CONTRACT.md), [CONVENTION.md](./CONVENTION.md)

---

## 목차

1. [문서 목적](#1-문서-목적)
2. [공통 목표](#2-공통-목표)
3. [공통 개발 계약](#3-공통-개발-계약)
4. [팀원별 작업 분배표](#4-팀원별-작업-분배표)
5. [작업 시작 전 체크리스트](#5-작업-시작-전-체크리스트)
6. [작업 중 체크리스트](#6-작업-중-체크리스트)
7. [작업 완료 기준](#7-작업-완료-기준)
8. [즉시 팀 합의가 필요한 변경](#8-즉시-팀-합의가-필요한-변경)
9. [BE 팀에 즉시 요청할 항목](#9-be-팀에-즉시-요청할-항목)

---

## 1. 문서 목적

이 문서는 **중간발표 전까지의 구현 범위**를 팀원별로 나누되, 각자 Codex를 사용해도 결과물이 서로 다른 구조로 갈라지지 않도록 하기 위한 운영 문서다.

핵심 원칙은 아래와 같다.

- 작업 분배보다 먼저 공통 계약을 고정한다.
- 각 팀원은 **자기 소유 범위 안에서만** Codex를 사용한다.
- 구현 전에 현재 상태 분석과 설계를 먼저 한다.
- 구현 후에는 설계 대비 검토와 객관적 재검토를 한다.

---

## 2. 공통 목표

### 2.1 Must

- `/workflows/new` 진입 가능
- 템플릿 목록 / 상세 / instantiate 흐름 동작
- **데모용 실행 성공 경로 1개 확보**
  - 우선순위 1: Spring 시드 데모 템플릿 1개 실행 성공
  - 우선순위 2: 전용 Text Input / Text Output 노드 도입 후 직접 생성 경로 실행 성공
- execution panel에서 polling 기반 상태/로그 표시
- execution history list / detail 조회
- 중간발표 시연 경로에 실행 불가능한 노드가 그대로 포함되지 않음

### 2.2 Should

- `if_else` 동등 비교 시나리오 1개 추가
- `POST /api/workflows/generate` 연결
- rollback UX 연결 (`rollback_available` 상태 포함)
- Spring에 stop 엔드포인트가 추가되면 stop UX 연결
- Spring TemplateSeeder에 시드 데모 템플릿 1개가 추가되면 해당 템플릿 실행 성공

### 2.3 Stretch

- Google Drive read-only 연결 검증 1건
- Slack / Gmail / Notion 실제 OAuth 연동
- 외부 서비스 기반 템플릿 실연동
- loop 기반 복잡 시나리오

---

## 3. 공통 개발 계약

### 3.1 API 호출 원칙

- 프론트엔드는 **Spring API만 호출**한다.
- FastAPI를 직접 호출하지 않는다.
- 실행 결과 수신은 **SSE가 아니라 polling 기반**이다.

### 3.2 실행 API 계약

- 실행 시작: `POST /api/workflows/:id/execute`
  - 응답: `ApiResponse<String>`
  - `data` 필드에 executionId(string)만 담겨 반환
- 실행 목록: `GET /api/workflows/:id/executions`
- 실행 상세: `GET /api/workflows/:id/executions/:execId`
- 롤백: `POST /api/workflows/:id/executions/:execId/rollback?nodeId={optional}`
- 정지: **Spring 미구현**
  - `POST /api/workflows/:id/executions/:execId/stop`는 현재 요청 대상이며,
    Spring에 엔드포인트가 추가된 뒤에만 FE 연결 범위에 포함한다.

### 3.3 템플릿 API 계약

- 템플릿 목록: `GET /api/templates`
- 템플릿 상세: `GET /api/templates/:id`
- 템플릿 인스턴스화: `POST /api/templates/:id/instantiate`

### 3.4 실행 패널 계약

execution panel은 최소 아래를 표시해야 한다.

- execution status
- startedAt / finishedAt
- node log 목록
- 각 node의 `nodeId`, `status`, `inputData`, `outputData`, `error`

```ts
export type ExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "rollback_available"
  | "stopped";

export type NodeLogStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped";

export type NodeLog = {
  nodeId: string;
  status: NodeLogStatus;
  inputData: unknown;
  outputData: unknown;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type WorkflowExecution = {
  id: string;
  workflowId: string;
  userId: string;
  state: ExecutionStatus;
  nodeLogs: NodeLog[];
  startedAt: string;
  finishedAt: string | null;
};
```

### 3.5 실행 가능 노드 / 데모 팔레트 정책

BE 현재 구현을 기준으로, 중간발표 시연에 포함할 수 있는 노드는 아래처럼 제한한다.

| 구분 | 상태 | 비고 |
|---|---|---|
| LLM | ✅ | 현재 FE에 존재하며 데모 노드 후보 |
| Condition (`if_else`) | ⚠️ 제한적 | 동등 비교(`==`)만 지원 |
| Loop | ❌ | FastAPI 내부 TODO |
| Slack / Gmail / Notion / Sheets / Naver News 계열 | ❌ | 실행 엔진 또는 integration 미구현 |

추가 사실:

- 현재 FE에는 전용 `Text Input`, `Text Output` 노드가 아직 없다.
- 따라서 "input -> llm -> output" 직접 생성 경로는 **전용 입출력 노드 구현 또는 시드 데모 템플릿 확보 전까지 보류**한다.
- 중간발표 시연에서는 실행 불가능한 노드를 자유롭게 드래그해 실행하는 흐름을 포함하지 않는다.

### 3.6 검증 계약

모든 커밋 전:

```bash
pnpm run lint
pnpm run tsc
```

모든 PR 전:

```bash
pnpm run build
```

---

## 4. 팀원별 작업 분배표

### 4.1 김동현 — 실행 / 백엔드 연동 축

**책임**

- 실행 API 연결
- polling
- execution 상태 / 로그 데이터 흐름

**소유 범위**

- `src/entities/execution/**`
- 실행 관련 feature / model / hook

**구현 범위**

- execute workflow mutation
- execution list query
- execution detail query
- polling hook
- rollback 연결
- stop은 Spring 엔드포인트 추가 시에만 연결
- 실행 에러 / 타임아웃 처리

**수정 금지**

- `src/entities/node/ui/custom-nodes/**`
- 템플릿 카드 / 템플릿 페이지 UI
- editor layout 구조 전체 변경

**DoD**

- Run 버튼 클릭 시 실제 execution 생성
- polling으로 status 반영
- execution detail에서 node logs 조회
- rollback API 호출 가능
- `rollback_available` 상태가 UI에 반영됨
- `pnpm run lint`, `pnpm run tsc` 통과

### 4.2 김민호 — 템플릿 / 진입 / 페이지 축

**책임**

- 사용자가 어떤 경로로 진입하고 템플릿을 선택하고 instantiate 하는지

**소유 범위**

- `src/entities/template/**`
- `src/pages/templates/**`
- `/workflows/new` 관련 page / section / widget

**구현 범위**

- `/workflows/new` 페이지
- 직접 만들기 / 템플릿 선택 진입
- template list / template detail / instantiate 흐름
- 실행 이력 탭(list 중심)
- 템플릿 4종 카드 데이터 정리

**수정 금지**

- execution polling hook
- workflow editor store
- node component 내부 동작

**DoD**

- `/workflows/new` 진입 가능
- 템플릿 선택 후 instantiate 가능
- 생성된 workflow로 이동 가능
- 템플릿 목록 / 상세 / 이력 기본 흐름 동작
- 시드 템플릿의 실행 가능 여부를 문서 기준으로 구분할 수 있음
- `pnpm run lint`, `pnpm run tsc` 통과

### 4.3 최호림 — 에디터 / 노드 / 실행 패널 UX 축

**책임**

- 캔버스와 노드 UI
- 실행 패널 시각화

**소유 범위**

- `src/entities/node/ui/custom-nodes/**`
- `src/features/configure-node/**`
- `src/widgets/canvas/**`
- `src/widgets/execution-panel/**`

**구현 범위**

- 실행 가능한 데모 노드 정책에 맞는 캔버스/팔레트 UX 정리
- LLM 설정 패널
- execution panel UI
- node별 input / output 표시 UI
- `if_else` 노드 데모용 UI 최소 구현 (동등 비교 기준)

**수정 금지**

- `src/entities/execution/model/**`
- template instantiate 로직
- auth / api core

**DoD**

- LLM / Condition 데모 흐름에서 필요한 UI 완성
- LLM panel에서 prompt / action 설정 가능
- execution panel이 node log를 시각적으로 표시
- `if_else` 노드가 동등 비교 기준으로 데모 가능한 수준
- 실행 불가능한 노드가 시연 경로를 깨지 않도록 UX 표시 또는 비노출 정책 반영
- `pnpm run lint`, `pnpm run tsc` 통과

---

## 5. 작업 시작 전 체크리스트

모든 팀원은 구현 전에 아래를 먼저 수행한다.

1. 현재 이슈 목표를 한 문장으로 적는다.
2. 현재 구현 상태를 먼저 읽는다.
3. 관련 설계 문서와 `CONVENTION.md`를 확인한다.
4. `AI_COLLABORATION_CONTRACT.md` 2장과 3장을 다시 확인한다.
5. 작업을 작은 단계로 쪼갠다.
6. 자기 소유 범위 밖 파일을 건드릴 필요가 있는지 먼저 확인한다.

---

## 6. 작업 중 체크리스트

모든 팀원은 작업 중 아래를 지킨다.

1. 현재 이슈와 다른 주제를 꺼내지 않는다.
2. 다른 팀원 소유 범위를 넓게 건드리지 않는다.
3. 공통 계약을 먼저 합의 없이 바꾸지 않는다.
4. 설계 문서에 맞게 구현한다.
5. 각 단계가 끝날 때마다 `pnpm run lint`, `pnpm run tsc`를 통과시킨다.
6. "이것도 같이 고치자"는 unrelated 변경을 넣지 않는다.

---

## 7. 작업 완료 기준

각 작업은 아래를 만족해야 완료로 본다.

- 소유 범위 안에서 구현 완료
- `pnpm run lint` 통과
- `pnpm run tsc` 통과
- 수동 시나리오 1회 검증
- 소유 범위 밖 변경 최소화
- PR 전 `pnpm run build` 통과

### 7.1 수동 시나리오 기준

**실행 축**

- workflow 실행 가능
- executionId 생성 확인
- execution panel polling 동작
- node log 표시 확인

**템플릿 축**

- template list 노출
- instantiate 가능
- editor 진입 가능
- 시연용 템플릿 또는 데모 경로 1개 실행 성공

---

## 8. 즉시 팀 합의가 필요한 변경

아래 항목은 팀 합의 없이 변경하지 않는다.

- API path
- execution response shape
- template card data shape
- execution panel props shape
- workflow editor store shape
- polling interval / polling stop condition
- 데모 모드 팔레트 노출 정책

이 항목을 바꿔야 하는 경우:

1. 먼저 영향 범위를 적는다.
2. 어떤 팀원 작업이 영향을 받는지 적는다.
3. 설계 문서를 먼저 수정한다.
4. 그 다음 구현한다.

---

## 9. BE 팀에 즉시 요청할 항목

1. **TemplateSeeder에 시드 데모 템플릿 1개 추가**
   - 구성 예시: Text Input -> LLM -> Text Output
   - 이유: 현재 시드 4개 템플릿은 외부 integration 미구현 의존이 커서 중간발표 기본선으로 삼기 어렵다.

2. **Spring `ExecutionController`에 stop 엔드포인트 추가**
   - `POST /api/workflows/{id}/executions/{execId}/stop`
   - FastAPI 쪽 cancellation 메커니즘은 이미 존재하므로 Spring 위임 엔드포인트만 추가되면 FE 연결 범위가 된다.

3. **`WorkflowExecution.state` 값 공식 명세화**
   - `pending`, `running`, `success`, `failed`, `rollback_available`, `stopped`
   - 현재는 FE가 FastAPI 구현을 직접 읽어야만 전체 상태값을 알 수 있다.

4. **IfElse 비교 연산 확장 여부 확정**
   - 현재 FE는 동등 비교만 전제로 데모를 설계해야 한다.
   - `!=`, `>`, `<`, `contains` 지원 계획이 있으면 사전에 공유가 필요하다.
