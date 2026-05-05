# Workflow List Run/Stop Action Design

## 배경

워크플로우 리스트의 실행/일시정지 버튼은 현재 실제 실행 API가 아니라 `active` 값을 토글한다.

- 리스트 버튼: `WorkflowRow`에서 `workflow.active` 기준으로 재생/일시정지 아이콘 표시
- 액션 훅: `useWorkflowListActions.handleToggleWorkflow()`
- API 호출: `PUT /api/workflows/{workflowId}` with `{ active }`

백엔드에서 `active`는 워크플로우 실행 상태가 아니라 스케줄 트리거 활성화 여부에 가깝다. 실제 수동 실행/중지는 별도 API로 제공된다.

- 실행: `POST /api/workflows/{workflowId}/execute`
- 최신 실행 조회: `GET /api/workflows/{workflowId}/executions/latest`
- 실행 중지: `POST /api/workflows/{workflowId}/executions/{executionId}/stop`

최신 실행이 없는 경우의 응답은 프론트 계약상 `200 OK`와 `null`을 기대한다. 백엔드가 `404`를 반환하는 구조라면 프론트 API 어댑터에서 `null`로 정규화하거나, 백엔드 계약을 `200 null`로 맞춰야 한다.

따라서 리스트의 실행 버튼은 `active` 토글이 아니라 실행/중지 API를 사용하도록 분리해야 한다.

## 목표

- 워크플로우 리스트에서 재생 버튼을 누르면 해당 워크플로우를 즉시 실행한다.
- 최신 실행이 `pending` 또는 `running` 상태라면 같은 위치의 버튼은 중지 버튼으로 동작한다.
- `active` 토글은 실행/중지 동작에서 제거한다.
- 워크플로우 리스트와 대시보드의 빠른 실행 액션이 동일한 의미를 갖도록 정리한다.
- 백엔드 API 변경 없이 현재 제공된 실행 API 계약에 맞춘다.

## 비목표

- 스케줄 활성화/비활성화 UI는 이번 범위에 포함하지 않는다.
- 일시정지/재개 기능은 구현하지 않는다. 현재 백엔드 계약은 pause/resume이 아니라 stop이다.
- 실행 전 설정 검증 UI를 새로 만들지 않는다. 리스트 실행 실패는 백엔드 오류 메시지를 그대로 사용자에게 전달한다.

## 현재 문제 지점

### 프론트

- `src/pages/workflows/ui/WorkflowRow.tsx`
  - `workflow.active` 값으로 `MdPlayArrow` 또는 `MdPause`를 표시한다.
  - 버튼 의미가 실행 상태와 섞여 있다.

- `src/pages/workflows/model/useWorkflowListActions.ts`
  - `handleToggleWorkflow()`가 `useToggleWorkflowActiveMutation()`을 호출한다.
  - 사용자가 실행 버튼이라고 인식하는 액션이 실제로는 `active` 토글이다.

- `src/entities/workflow/model/useToggleWorkflowActiveMutation.ts`
  - `workflowApi.update(workflowId, { active })`를 호출한다.

- `src/pages/dashboard/model/useDashboardActions.ts`
  - 대시보드에서도 같은 `active` 토글 훅을 사용한다.
  - 리스트와 동일하게 빠른 실행 액션 의미가 어긋날 가능성이 있다.

### 백엔드

백엔드의 `active` 업데이트는 실행 상태 변경이 아니라 스케줄 트리거 이벤트 발행과 연결된다.

- `WorkflowUpdateRequest.active`
- `WorkflowService.updateWorkflow()`
- `publishScheduleEvent()`
  - `trigger.type === "schedule"`일 때만 스케줄 등록/해제 이벤트를 발행한다.

즉, 현재 리스트 버튼이 기대하는 “워크플로우 실행/중지”와 백엔드의 `active` 의미가 다르다.

## 설계 방향

### 1. 실행 상태 기준 모델 추가

리스트 행은 `workflow.active`가 아니라 최신 실행 상태를 기준으로 버튼 상태를 결정한다.

실행 중으로 판단할 상태:

- `pending`
- `running`

상태별 버튼:

- 최신 실행 없음 또는 완료/실패/중지 상태: 실행 버튼
- 최신 실행이 `pending` 또는 `running`: 중지 버튼
- 실행/중지 요청 중: 로딩 상태

표시 문구는 “일시정지”가 아니라 “중지”로 맞춘다. 백엔드 API가 stop 계약이기 때문이다.

행에서 필요한 실행 상태 모델은 다음 정도로 제한한다.

```ts
type WorkflowRowExecutionActionState =
  | "idle"
  | "starting"
  | "running"
  | "stopping";
```

- `idle`: 최신 실행이 없거나 완료/실패/중지 상태
- `starting`: 실행 mutation pending
- `running`: 최신 실행이 `pending` 또는 `running`
- `stopping`: 중지 mutation pending

`success`, `failed`, `stopped`는 버튼 관점에서는 모두 다시 실행 가능한 상태이므로 `idle`로 취급한다.

### 2. 리스트 행 단위 실행 액션 분리

`WorkflowRow`는 가능하면 표시 전용 컴포넌트로 유지한다.

권장 구조:

- `WorkflowRowItem`
  - 각 워크플로우 행의 latest execution query와 mutation을 소유한다.
  - `WorkflowRow`에 실행 상태, 로딩 상태, 클릭 핸들러를 전달한다.

- `WorkflowRow`
  - 아이콘, 버튼 disabled, aria-label, 표시 문구만 담당한다.
  - API 훅을 직접 알지 않는다.

예상 데이터 흐름:

1. `WorkflowListSection`이 워크플로우 목록을 렌더링한다.
2. 각 행은 `WorkflowRowItem`으로 감싼다.
3. `WorkflowRowItem`은 `useLatestWorkflowExecutionQuery(workflow.id)`로 최신 실행 상태를 조회한다.
4. 버튼 클릭 시:
   - 최신 실행이 in-flight면 `useStopExecutionMutation()`으로 중지한다.
   - 아니면 `useExecuteWorkflowMutation()`으로 실행한다.
5. 성공 후 latest execution query와 목록 관련 query를 invalidate한다.

구현 시 `WorkflowRow` props는 `active` 용어를 제거하고 실행 의미로 바꾼다.

예상 props:

```ts
type Props = {
  workflow: WorkflowResponse;
  executionActionLabel: string;
  executionActionKind: "run" | "stop";
  isExecutionActionPending: boolean;
  onOpen: () => void;
  onExecutionAction: () => void;
};
```

`WorkflowRow` 내부에서는 `workflow.active`를 직접 보지 않는다. 아이콘은 `executionActionKind`로 결정한다.

### 3. 최신 실행 조회 전략

리스트 행마다 최신 실행을 조회하면 요청 수가 늘 수 있다. 다만 일반 리스트 페이지의 행 개수는 제한되어 있고, 실행 상태를 정확히 표시하려면 최신 실행 상태가 필요하다.

권장 전략:

- 행별 latest execution query를 사용한다.
- in-flight 상태일 때만 polling한다.
- 완료/실패/중지 상태에서는 polling을 멈춘다.
- 쿼리 stale time을 짧게 유지하되 불필요한 상시 refetch는 피한다.
- 리스트 진입 시 캐시된 latest execution이 오래 남아 실행 상태가 틀어지지 않도록 mount 시 최신 조회를 보장한다.

이미 에디터 원격 바에서 사용하는 실행 관련 훅과 유틸을 우선 재사용한다.

- `useExecuteWorkflowMutation`
- `useStopExecutionMutation`
- `useLatestWorkflowExecutionQuery`
- `isExecutionInFlight`
- `executionPollInterval`

현재 `QueryClient` 기본값은 `refetchOnMount: false`다. 따라서 단순히 `useLatestWorkflowExecutionQuery(workflow.id)`만 연결하면 이전 캐시가 남아 있을 때 리스트 재진입 시 최신 상태를 다시 확인하지 않을 수 있다.

구현 선택지는 둘 중 하나로 한다.

1. `QueryPolicyOptions`에 `refetchOnMount`를 추가하고 `useLatestWorkflowExecutionQuery`에서 전달한다.
   - 장점: React Query 옵션 흐름과 일관된다.
   - 단점: shared query policy 타입 변경이 필요하다.

2. 행 전용 훅에서 mount 또는 workflow id 변경 시 `latestExecutionQuery.refetch()`를 명시적으로 호출한다.
   - 장점: 변경 범위가 작다.
   - 단점: 훅 내부 side effect가 생긴다.

권장안은 1번이다. 이미 여러 query hook이 `QueryPolicyOptions`를 공유하고 있으므로, `refetchOnMount`를 정책 옵션으로 확장하면 다른 query에서도 같은 패턴을 재사용할 수 있다.

리스트 행에서는 다음 옵션을 사용한다.

```ts
useLatestWorkflowExecutionQuery(workflow.id, {
  refetchOnMount: "always",
  staleTime: 0,
});
```

polling은 기존 `useLatestWorkflowExecutionQuery`의 `refetchInterval` 기본값을 유지한다. 즉 latest execution이 in-flight일 때만 polling한다.

### 4. `active` 토글 제거 또는 분리

리스트의 재생/중지 버튼에서는 `active` 토글을 호출하지 않는다.

스케줄 자동 실행 활성화가 필요하다면 별도 이슈에서 다음처럼 분리한다.

- 스케줄 워크플로우에만 표시
- 명칭은 “자동 실행 켜기/끄기”로 구분
- 실행/중지 아이콘과 다른 UI로 제공

이번 이슈에서는 혼동을 막기 위해 리스트 빠른 액션에서 `useToggleWorkflowActiveMutation()` 사용을 제거한다.

### 5. 대시보드 액션 정리

대시보드도 현재 `active` 토글을 빠른 액션처럼 사용하고 있다면 동일한 기준으로 맞춘다.

우선순위:

1. 리스트 실행/중지 동작을 먼저 수정한다.
2. 실행/중지 mutation과 latest execution 판단 로직은 대시보드에서도 재사용한다.
3. 대시보드 카드 UI는 리스트 행과 구조가 다르므로 `WorkflowRow`를 재사용하지 않는다.
4. 대시보드 범위가 커질 경우 최소한 `active` 토글을 실행 버튼처럼 보이지 않게 분리한다.

대시보드는 `DashboardIssue`로 워크플로우 데이터를 한 번 가공해서 사용한다. 따라서 공통화 단위는 UI 컴포넌트가 아니라 실행 액션 훅이다.

권장 공통 훅:

```ts
type UseWorkflowExecutionActionResult = {
  actionKind: "run" | "stop";
  actionLabel: string;
  isActionPending: boolean;
  isRunning: boolean;
  handleAction: () => Promise<void>;
};
```

위 훅은 `workflowId`만 받아 실행/중지 판단과 mutation을 처리한다.

- 리스트: `WorkflowRowItem`에서 사용
- 대시보드: `DashboardErrorCard`를 감싸는 컨테이너 또는 `DashboardSection`에서 사용

단, React Hook 규칙 때문에 `map()` 내부에서 공통 훅을 직접 호출하지 않는다. 리스트와 대시보드 모두 행/카드 단위 컨테이너 컴포넌트를 만들어 그 내부에서 훅을 호출한다.

예상 구조:

```text
src/pages/workflows/ui/WorkflowRowItem.tsx
src/pages/dashboard/ui/DashboardIssueCardItem.tsx
src/features/workflow-execution/model/useWorkflowExecutionAction.ts
```

리스트와 대시보드가 함께 사용하는 실행/중지 액션은 특정 페이지의 전용 로직이 아니다. 따라서 page slice 내부가 아니라 `features/workflow-execution`으로 둔다. page는 feature를 참조할 수 있지만, dashboard page가 workflows page 내부 훅을 참조하면 FSD 의존 방향을 어기게 된다.

## 구체 구현 설계

### 1. QueryPolicyOptions 확장

`src/shared/api/query-policy.ts`에 `refetchOnMount`를 추가한다.

```ts
refetchOnMount?: UseQueryOptions<
  TQueryFnData,
  ApiError,
  TData
>["refetchOnMount"];
```

그리고 `useLatestWorkflowExecutionQuery`에서 해당 옵션을 전달한다.

```ts
refetchOnMount: options?.refetchOnMount,
```

이 변경은 shared query policy 타입 확장이지만 기존 호출부에는 영향을 주지 않는다.

### 2. 실행 액션 훅 추가

`src/features/workflow-execution/model/useWorkflowExecutionAction.ts`를 추가한다.

책임:

- latest execution 조회
- in-flight 판단
- execute mutation 호출
- stop mutation 호출
- 실행/중지 성공 후 latest query invalidate 또는 refetch
- toast 오류 처리

처리 흐름:

```text
handleAction()
  ├─ latestExecution이 in-flight
  │   ├─ executionId 없음 -> 오류 toast
  │   └─ stopExecution({ workflowId, executionId })
  └─ 그 외
      └─ executeWorkflow(workflowId)
```

`executeWorkflow`가 execution id를 반환하므로, 실행 직후 latest query를 invalidate하고 필요하면 refetch한다.

공개 API:

```text
src/features/workflow-execution/index.ts
src/features/workflow-execution/model/index.ts
```

페이지에서는 내부 파일을 직접 deep import하지 않고 feature 공개 API를 통해 가져온다.

### 3. 리스트 행 컨테이너 추가

`src/pages/workflows/ui/WorkflowRowItem.tsx`를 추가한다.

책임:

- `workflow`를 받는다.
- `useWorkflowExecutionAction(workflow.id)`을 호출한다.
- `WorkflowRow`에 실행 상태 props를 전달한다.

`WorkflowListSection`은 `WorkflowRow` 대신 `WorkflowRowItem`을 렌더링한다.

### 4. WorkflowRow 표시 책임 축소

`WorkflowRow`에서 제거할 것:

- `workflow.active` 기반 quick action label
- `isTogglePending`
- `onToggle`

`WorkflowRow`에 추가할 것:

- `executionActionLabel`
- `executionActionKind`
- `isExecutionActionPending`
- `onExecutionAction`

아이콘:

- `executionActionKind === "run"`: `MdPlayArrow`
- `executionActionKind === "stop"`: `MdStop` 또는 기존 `MdPause` 대신 stop 의미 아이콘

가능하면 `MdStop`을 사용한다. 현재 UI가 pause처럼 보이면 백엔드 stop 계약과 다시 어긋난다.

### 5. 대시보드 카드 컨테이너 추가

대시보드까지 이번 이슈에 포함한다면 `DashboardIssueCardItem`을 추가한다.

책임:

- `DashboardIssue`를 받는다.
- `useWorkflowExecutionAction(issue.id)`을 호출한다.
- `DashboardErrorCard`에 실행 상태 props를 전달한다.

`DashboardErrorCard`도 `isActive` 대신 실행 액션 props를 받도록 정리한다.

이번 이슈에서 대시보드 구현 범위를 줄여야 한다면 최소 조치로 대시보드의 실행/중지 아이콘 버튼을 제거하거나 “자동화 활성화” 의미로 이름을 바꾼다. 다만 사용자 관점의 혼동을 줄이려면 리스트와 동일하게 실행/중지로 맞추는 편이 낫다.

## 오류 처리

- 실행 실패: 백엔드 오류 메시지를 toast로 표시한다.
- 중지 실패: 백엔드 오류 메시지를 toast로 표시한다.
- 중지 버튼 클릭 시 최신 실행 ID가 없으면 “중지할 실행이 없습니다.” 메시지를 표시한다.
- 실행 중 버튼 중복 클릭은 mutation pending 상태로 막는다.
- latest execution 조회 실패는 실행 버튼 자체를 막지 않는다. 조회 실패 상태에서는 기본값을 실행 가능 상태로 두고, 실제 실행 API 오류를 사용자에게 표시한다.

## 검증 기준

- 리스트에서 실행 버튼 클릭 시 `PUT /api/workflows/{id}`가 아니라 `POST /api/workflows/{id}/execute`가 호출된다.
- 실행 중인 워크플로우의 버튼은 중지 상태로 표시된다.
- 중지 버튼 클릭 시 `GET /api/workflows/{id}/executions/latest`로 확인한 execution id를 사용해 `POST /api/workflows/{id}/executions/{executionId}/stop`이 호출된다.
- 실행 완료/실패/중지 후 버튼은 다시 실행 상태로 돌아온다.
- `workflow.active`가 false여도 수동 실행 버튼은 실행 API를 호출한다.
- 대시보드 빠른 액션이 실행/중지 의미와 `active` 토글 의미를 섞지 않는다.
- 리스트 재진입 시 이전 캐시 때문에 실행 중/중지 상태가 틀어지지 않는다.
- 최신 실행이 없는 워크플로우도 오류 없이 실행 버튼으로 표시된다.
- `pnpm run build`가 통과한다.

## 구현 단계

1. Query policy와 latest execution 조회 보강
   - `QueryPolicyOptions`에 `refetchOnMount`를 추가한다.
   - `useLatestWorkflowExecutionQuery`에서 mount refetch 옵션을 전달한다.

2. 실행 액션 훅 추가
   - execute/stop/latest 판단 로직을 `useWorkflowExecutionAction`으로 묶는다.
   - 오류 toast와 pending 상태를 처리한다.

3. 리스트 실행/중지 액션 교체
   - `WorkflowRowItem`을 추가한다.
   - `active` 토글 대신 execute/stop mutation을 호출한다.
   - 버튼 라벨과 아이콘을 실행/중지 의미로 정리한다.

4. 대시보드 빠른 액션 정리
   - `DashboardIssueCardItem`을 추가하거나 동일한 액션 훅을 연결한다.
   - 리스트와 동일한 실행/중지 동작을 재사용하거나, `active` 토글 UI를 분리한다.

5. 검증
   - 빌드와 수동 API 호출 흐름을 확인한다.
   - 실행/중지/완료/실패 상태별 버튼 변화를 확인한다.
