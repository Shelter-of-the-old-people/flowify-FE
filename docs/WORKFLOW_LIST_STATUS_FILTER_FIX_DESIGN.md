# Workflow List Status Filter Fix Design

> **작성일:** 2026-05-12
> **대상 화면:** `/workflows`
> **범위:** 워크플로우 목록의 `전체 / 실행 중 / 중지됨` 필터 정확도 개선
> **대상 저장소:** `flowify-FE`, `flowify-BE-spring`, `flowify-BE`
> **최종 검토:** 3회 코드/문서 대조 완료

---

## 0. 3회 검토 요약

### 0.1 1차 검토: FE 목록 필터와 Spring 목록 API

확인 파일:

- `flowify-FE/src/pages/workflows/model/useWorkflowListData.ts`
- `flowify-FE/src/pages/workflows/model/workflow-list.ts`
- `flowify-FE/src/pages/workflows/model/constants.ts`
- `flowify-FE/src/entities/workflow/api/get-workflow-list.api.ts`
- `flowify-FE/src/entities/workflow/model/useInfiniteWorkflowListQuery.ts`
- `flowify-BE-spring/src/main/java/org/github/flowify/workflow/controller/WorkflowController.java`
- `flowify-BE-spring/src/main/java/org/github/flowify/workflow/service/WorkflowService.java`
- `flowify-BE-spring/src/main/java/org/github/flowify/workflow/repository/WorkflowRepository.java`

결론:

- FE는 `workflow.active`로 `active/inactive` 필터를 클라이언트에서 적용한다.
- Spring `GET /api/workflows`는 FE가 보내는 `page`, `size`를 받지 않고 배열을 반환한다.
- 현재 구조에서는 "로드된 일부 page만 필터링" 문제가 생기며, 전체 목록 기준의 정확한 필터가 불가능하다.

### 0.2 2차 검토: Spring 실행 상태와 FastAPI 런타임

확인 파일:

- `flowify-BE-spring/src/main/java/org/github/flowify/execution/service/ExecutionService.java`
- `flowify-BE-spring/src/main/java/org/github/flowify/execution/repository/ExecutionRepository.java`
- `flowify-BE-spring/src/main/java/org/github/flowify/execution/entity/WorkflowExecution.java`
- `flowify-BE-spring/src/main/java/org/github/flowify/execution/dto/ExecutionSummaryResponse.java`
- `flowify-BE-spring/src/main/java/org/github/flowify/execution/service/FastApiClient.java`
- `flowify-BE/app/core/engine/state.py`
- `flowify-BE/app/core/engine/executor.py`
- `flowify-BE/app/api/v1/endpoints/execution.py`
- `flowify-BE/app/services/spring_callback_service.py`

결론:

- execution 상태 문자열은 `pending`, `running`, `success`, `failed`, `stopped`, `rollback_available` 계열이다.
- Spring은 FastAPI 실행 요청 직후 `workflow_executions`에 `state="running"` 레코드를 만든다.
- FastAPI도 같은 Mongo collection에 실행 상태를 upsert하고, 종료 시 Spring internal callback을 보낸다.
- FastAPI callback은 `success -> completed`, `stopped -> stopped`, 그 외 실패 계열은 `failed`로 Spring에 보낸다.
- 필터 기준은 Spring이 가진 `workflow_executions` collection만으로 계산 가능하며 FastAPI 변경은 필수 범위가 아니다.

### 0.3 3차 검토: 권한, 캐시, edge case

확인 파일:

- `flowify-FE/src/features/workflow-execution/model/useWorkflowExecutionAction.ts`
- `flowify-FE/src/entities/execution/model/useLatestWorkflowExecutionQuery.ts`
- `flowify-FE/src/entities/execution/model/useExecuteWorkflowMutation.ts`
- `flowify-FE/src/entities/execution/model/useStopExecutionMutation.ts`
- `flowify-FE/src/pages/dashboard/ui/DashboardIssueCardItem.tsx`
- `flowify-BE-spring/src/main/java/org/github/flowify/workflow/service/WorkflowTriggerSupport.java`
- `flowify-BE-spring/src/main/java/org/github/flowify/dashboard/service/DashboardService.java`

보완 반영:

- `active`는 현재 실행 상태가 아니라 schedule 자동 실행 활성화 여부다.
- manual workflow는 `WorkflowTriggerSupport.normalizeActive()` 때문에 `active=true`로 정규화될 수 있으므로 `active`만으로는 `실행 중`을 판정하면 안 된다.
- row의 실행/중지 버튼은 최신 execution을 별도로 조회하므로, 목록 필터 상태와 action 상태를 같은 훅으로 합치지 않는다.
- 실행/중지 성공 후에는 execution query뿐 아니라 workflow list query도 invalidate해야 필터 결과가 즉시 갱신된다.
- shared workflow의 최신 execution 노출 정책은 명시해야 한다. V1에서는 "접근 가능한 workflow의 목록 상태 summary"로 제한하고 node log/detail은 기존 정책과 분리한다.

---

## 1. 목적

워크플로우 목록의 `실행 중 / 중지됨` 필터가 현재 `workflow.active`에 의존하면서 실제 상태와 어긋난다.

이번 작업의 목표는 다음과 같다.

- `workflow.active`와 "현재/운영 실행 상태"를 분리한다.
- 서버에서 전체 접근 가능 workflow 기준으로 먼저 필터링한 뒤 pagination을 수행한다.
- FE의 무한 스크롤 cache를 필터별로 분리한다.
- Spring과 FastAPI의 execution 상태 문자열을 기준으로 필터 판정 규칙을 고정한다.
- 구현자가 바로 작업할 수 있도록 FE, Spring, FastAPI의 변경/비변경 범위를 명확히 한다.

---

## 2. 배경과 문제 정의

### 2.1 현재 FE 흐름

현재 FE 흐름은 다음과 같다.

```text
WorkflowListSection
  -> useWorkflowListData()
  -> useInfiniteWorkflowListQuery(size)
  -> GET /api/workflows?page=0&size=20
  -> flatten pages
  -> sortWorkflowsByUpdatedAtDesc()
  -> filterWorkflowsByStatus(workflows, activeFilter)
```

현재 필터 함수:

```ts
case "active":
  return workflows.filter((workflow) => workflow.active);
case "inactive":
  return workflows.filter((workflow) => !workflow.active);
```

문제:

- manual workflow는 실행 중이 아니어도 `active=true`일 수 있다.
- schedule workflow의 `active=false`는 "현재 실행 중지"가 아니라 "앞으로 자동 실행 중지"다.
- 이미 로드한 page만 필터링하므로 뒤 page의 matching workflow가 숨는다.
- row 내부의 `useWorkflowExecutionAction()`은 최신 execution을 알고 있지만 parent list 필터는 그 정보를 모른다.

### 2.2 현재 Spring 흐름

현재 Spring `GET /api/workflows`는 다음 형태다.

```java
@GetMapping
public ApiResponse<List<WorkflowResponse>> getWorkflows(Authentication authentication) {
    User user = (User) authentication.getPrincipal();
    return ApiResponse.ok(workflowService.getWorkflowsByUserId(user.getId()));
}
```

현재 `WorkflowService.getWorkflowsByUserId()`는 owner/shared workflow 전체 배열을 반환한다.

```java
workflowRepository.findByUserIdOrSharedWithContainingOrderByUpdatedAtDesc(userId, userId)
```

문제:

- FE가 보내는 `page`, `size` query parameter가 Spring controller에 반영되지 않는다.
- Spring이 필터를 수행하지 않아 정확한 filtered pagination이 불가능하다.
- 최신 execution 상태가 목록 응답에 포함되지 않는다.

### 2.3 현재 FastAPI 런타임 흐름

Spring은 FastAPI 실행 API를 호출한다.

```http
POST /api/v1/workflows/{workflowId}/execute
X-User-ID: {userId}
```

FastAPI는 execution id를 반환하고 백그라운드에서 실행한다.

```json
{ "execution_id": "exec_..." }
```

Spring은 반환받은 execution id로 먼저 실행 레코드를 만든다.

```java
WorkflowExecution.builder()
    .id(executionId)
    .workflowId(workflowId)
    .userId(userId)
    .state("running")
    .startedAt(Instant.now())
    .build()
```

FastAPI executor도 같은 MongoDB `workflow_executions` collection에 상태를 upsert한다.

의미:

- 목록 필터는 FastAPI를 직접 호출하지 않고 Spring/Mongo 기준으로 계산할 수 있다.
- 실행 직후에는 Spring이 만든 `running` 레코드가 있으므로 목록이 즉시 `running`으로 계산될 수 있다.
- 종료 후에는 FastAPI 저장 및 Spring callback 중 하나 이상으로 terminal state가 반영된다.

---

## 3. 핵심 결정

### 3.1 `workflow.active`는 필터 source of truth가 아니다

`workflow.active`는 다음 의미로만 사용한다.

- schedule workflow: 이후 스케줄 자동 실행 등록 여부
- manual workflow: canonical rule상 대부분 `true`
- 현재 execution이 돌고 있는지 여부는 아님

따라서 목록 필터는 `workflow.active`만으로 계산하지 않는다.

### 3.2 목록 전용 상태를 둔다

API 응답에는 목록 전용 상태를 추가한다.

```ts
type WorkflowListStatus = "running" | "stopped";
```

응답 필드명은 다음을 사용한다.

```ts
listStatus: WorkflowListStatus
latestExecution: ExecutionSummary | null
```

`listStatus`라는 이름을 쓰는 이유:

- execution 자체의 `state`와 구분된다.
- workflow의 `active`와 구분된다.
- UI 필터 전용 파생 상태임이 드러난다.

### 3.3 필터 기준

V1 확정 기준:

| 상태 | 조건 |
| --- | --- |
| `running` | 최신 execution이 `pending` 또는 `running`이거나, schedule workflow의 `active=true` |
| `stopped` | 위 조건에 해당하지 않음 |

계산식:

```text
isScheduleAutoRunOn = WorkflowTriggerSupport.isSchedule(trigger) && workflow.active
isLatestExecutionInFlight = latestExecution.state in ["pending", "running"]

listStatus = isScheduleAutoRunOn || isLatestExecutionInFlight
  ? "running"
  : "stopped"
```

주의:

- "실행 중" 문구가 "현재 execution running"만 의미해야 한다면 `isScheduleAutoRunOn`을 제외해야 한다.
- 다만 기존 auto-run 설계 문서에서는 자동 실행이 켜진 schedule workflow도 운영 중으로 보는 후속 목표를 제시했다.
- UI 혼동이 크면 탭 문구를 `운영 중 / 중지됨`으로 바꾸는 안을 별도 UX 결정으로 둔다.

### 3.4 FastAPI 상태와 Spring 상태 매핑

FastAPI 상태:

```text
pending
running
success
failed
stopped
rollback_available
```

Spring callback 매핑:

| FastAPI final state | Spring callback status | Spring 저장 state |
| --- | --- | --- |
| `success` | `completed` | `success` |
| `stopped` | `stopped` | `stopped` |
| `failed` | `failed` | `failed` |
| `rollback_available` | `failed` | `failed` |

필터 관점:

- in-flight: `pending`, `running`
- terminal: `success`, `failed`, `rollback_available`, `stopped`
- callback 후 `rollback_available`이 Spring에서 `failed`로 바뀌어도 필터 결과는 `stopped`라 동일하다.

---

## 4. API 계약

### 4.1 Endpoint

기존 workflow list endpoint를 확장한다.

```http
GET /api/workflows?page=0&size=20&status=running
Authorization: Bearer {accessToken}
```

query parameter:

| 이름 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `page` | number | `0` | 0-base page index |
| `size` | number | `20` | page size |
| `status` | `all \| running \| stopped` | `all` | 목록 상태 필터 |

`status` 값이 비어 있거나 알 수 없는 값이면 `all`로 처리한다. API strictness를 높이고 싶다면 `400 INVALID_REQUEST`로 바꿀 수 있지만, V1은 UI 안정성을 위해 fallback을 권장한다.

### 4.2 Response

Spring은 page shape를 반환한다.

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "workflow_1",
        "name": "메일 요약 자동화",
        "description": "",
        "userId": "user_1",
        "sharedWith": [],
        "isTemplate": false,
        "templateId": null,
        "nodes": [],
        "edges": [],
        "trigger": {
          "type": "schedule",
          "config": {
            "schedule_mode": "interval",
            "timezone": "Asia/Seoul"
          }
        },
        "active": true,
        "createdAt": "2026-05-11T10:00:00Z",
        "updatedAt": "2026-05-12T10:00:00Z",
        "latestExecution": {
          "id": "exec_1",
          "workflowId": "workflow_1",
          "state": "running",
          "startedAt": "2026-05-12T10:10:00Z",
          "finishedAt": null,
          "durationMs": null,
          "errorMessage": null,
          "nodeCount": 0,
          "completedNodeCount": 0
        },
        "listStatus": "running"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
}
```

FE의 `PageResponse<T>` 타입에는 현재 `last`가 없지만 Spring `PageResponse`에는 있다. FE에서는 `last?: boolean`로 타입을 넓히거나 무시해도 된다.

### 4.3 DTO 선택

V1 권장안:

- 기존 `WorkflowResponse`에 nullable 목록 필드를 추가한다.

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
private final ExecutionSummaryResponse latestExecution;

@JsonInclude(JsonInclude.Include.NON_NULL)
private final String listStatus;
```

이유:

- FE 목록 row가 이미 `WorkflowResponse`를 사용한다.
- 상세 API 호출부와 기존 생성/수정 API 영향이 작다.
- `WorkflowResponse.from(workflow)` 기존 factory는 그대로 유지하고 목록 전용 factory만 추가하면 된다.

대안:

- `WorkflowListItemResponse`를 새로 만들 수 있다.
- DTO 순도는 좋아지지만 FE 타입과 mapper 수정 범위가 커진다.

V1에서는 기존 코드 변경량과 리스크를 줄이기 위해 `WorkflowResponse` 확장을 선택한다.

---

## 5. Spring 설계

### 5.1 Controller 변경

변경 전:

```java
public ApiResponse<List<WorkflowResponse>> getWorkflows(Authentication authentication)
```

변경 후:

```java
@GetMapping
public ApiResponse<PageResponse<WorkflowResponse>> getWorkflows(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "all") String status
) {
    User user = (User) authentication.getPrincipal();
    return ApiResponse.ok(workflowService.getWorkflowPage(user.getId(), page, size, status));
}
```

page/size guard:

- `page < 0`이면 `0`으로 보정한다.
- `size <= 0`이면 기본값 `20`으로 보정한다.
- `size` 상한은 `100`을 권장한다.

### 5.2 WorkflowService 추가 책임

새 method:

```java
public PageResponse<WorkflowResponse> getWorkflowPage(
        String userId,
        int page,
        int size,
        String status
)
```

처리 순서:

```text
1. page, size, status normalize
2. 접근 가능한 workflow 전체 조회
3. workflow id 목록 추출
4. workflow id 목록으로 최신 execution map 조회
5. workflow별 listStatus 계산
6. status filter 적용
7. updatedAt desc 순서 유지
8. page slice
9. PageResponse.of(content, page, size, filteredTotal) 반환
```

중요:

- filter 후 pagination을 해야 한다.
- pagination 후 filter를 하면 `running` 탭 첫 page가 비는 문제가 남는다.

### 5.3 Repository 추가

`ExecutionRepository`에 추가한다.

```java
List<WorkflowExecution> findByWorkflowIdInOrderByStartedAtDesc(Collection<String> workflowIds);
```

mapping 전략:

```java
Map<String, WorkflowExecution> latestByWorkflowId = new LinkedHashMap<>();
for (WorkflowExecution execution : executions) {
    latestByWorkflowId.putIfAbsent(execution.getWorkflowId(), execution);
}
```

`startedAt desc`로 정렬되어 있으므로 첫 번째 값이 최신 실행이다.

성능 개선 후보:

- workflow 수나 execution 수가 커지면 Mongo aggregation으로 workflow별 latest만 조회한다.
- `workflowId`, `startedAt` 복합 index를 검토한다.

### 5.4 ExecutionSummary mapper

현재 `ExecutionService.toSummary()`는 private method다. `WorkflowService`에서도 `latestExecution` 응답을 만들려면 중복 mapper가 생긴다.

권장 보완:

- `ExecutionSummaryResponse.from(WorkflowExecution execution)` static factory를 추가한다.
- `ExecutionService.toSummary()`도 이 factory를 사용하도록 바꾼다.

예상 형태:

```java
public static ExecutionSummaryResponse from(WorkflowExecution exec) {
    List<NodeLog> logs = exec.getNodeLogs();
    int nodeCount = logs != null ? logs.size() : 0;
    int completedNodeCount = logs != null
            ? (int) logs.stream().filter(log -> "success".equals(log.getStatus())).count()
            : 0;

    return ExecutionSummaryResponse.builder()
            .id(exec.getId())
            .workflowId(exec.getWorkflowId())
            .state(exec.getState())
            .startedAt(exec.getStartedAt())
            .finishedAt(exec.getFinishedAt())
            .durationMs(exec.getDurationMs())
            .errorMessage(exec.getError())
            .nodeCount(nodeCount)
            .completedNodeCount(completedNodeCount)
            .build();
}
```

### 5.5 listStatus helper

Spring helper 후보:

```java
private boolean isExecutionInFlight(WorkflowExecution execution) {
    if (execution == null || execution.getState() == null) {
        return false;
    }
    return "pending".equals(execution.getState()) || "running".equals(execution.getState());
}

private boolean isScheduleAutoRunOn(Workflow workflow) {
    return WorkflowTriggerSupport.isSchedule(workflow.getTrigger()) && workflow.isActive();
}

private String resolveListStatus(Workflow workflow, WorkflowExecution latestExecution) {
    return isScheduleAutoRunOn(workflow) || isExecutionInFlight(latestExecution)
            ? "running"
            : "stopped";
}
```

### 5.6 권한 정책

목록 접근:

- owner workflow 포함
- shared workflow 포함

목록 상태 계산:

- workflowId는 접근 가능한 workflow 목록에서만 추출한다.
- 최신 execution summary는 workflow list row의 상태 판정용으로만 사용한다.
- node log/detail은 포함하지 않는다.

주의:

- 현재 `ExecutionService.getLatestExecution()`은 owner만 허용한다.
- row action이 shared workflow에서 실패할 수 있는 기존 불일치가 있다.
- 이번 필터 작업에서 shared workflow까지 일관되게 다루려면 `ExecutionService`의 latest/list/detail 권한도 `verifyAccess(owner or shared)` 기준으로 정렬하는 후속 또는 동시 수정이 필요하다.

V1 권장:

- workflow list status 계산은 workflow access 기준으로 처리한다.
- execution detail/node data 권한 정책은 별도 이슈로 분리하되, row action의 latest 조회 실패가 UX에 드러나는 경우 함께 수정한다.

---

## 6. FastAPI 설계

### 6.1 변경 범위

이번 필터 수정에서 FastAPI 코드 변경은 필수 범위가 아니다.

이유:

- Spring이 이미 `workflow_executions` collection을 읽는다.
- FastAPI는 실행 상태를 같은 collection에 저장한다.
- 상태 문자열과 callback 계약만 Spring 설계에 반영하면 된다.

### 6.2 확인된 상태 저장 흐름

FastAPI executor:

```text
pending -> running -> success
pending -> running -> failed -> rollback_available
pending -> running -> stopped
```

실제 저장:

- 실행 시작 시 `_save_execution()`이 `state="running"`으로 upsert한다.
- 성공/실패/중지 시 `_finalize_execution()`이 최종 상태를 저장한다.
- `_finalize_execution()` 이후 Spring callback을 보낸다.

Spring callback:

```http
POST /api/internal/executions/{execId}/complete
X-Internal-Token: {secret}
```

payload:

```json
{
  "status": "completed",
  "durationMs": 1234,
  "output": {},
  "error": null
}
```

### 6.3 stop 상태 주의

FE 기준:

```ts
isExecutionInFlight = state === "pending" || state === "running"
```

Spring stop 기준:

```java
if (!"running".equals(execution.getState())) {
    throw new BusinessException(ErrorCode.INVALID_REQUEST, ...);
}
```

FastAPI stop endpoint:

- terminal state면 idempotent하게 현재 상태를 반환한다.
- Mongo update는 `state == "running"` 조건에서만 `stopped`로 바꾼다.

보완 권장:

- 일반 실행 직후 Spring은 `running` 레코드를 만들기 때문에 대부분 문제는 없다.
- 그래도 상태 계약 일관성을 위해 Spring stop 허용 상태를 `pending` 또는 `running`으로 맞출지 검토한다.
- 필터 기준은 `pending/running`을 in-flight로 유지한다.

---

## 7. FE 설계

### 7.1 필터 키 변경

변경 전:

```ts
export const WORKFLOW_FILTERS = [
  { key: "all", label: "전체" },
  { key: "active", label: "실행" },
  { key: "inactive", label: "중지됨" },
] as const;
```

변경 후:

```ts
export const WORKFLOW_FILTERS = [
  { key: "all", label: "전체" },
  { key: "running", label: "실행 중" },
  { key: "stopped", label: "중지됨" },
] as const;
```

`WorkflowFilterKey`는 이 상수에서 파생하므로 자동으로 갱신된다.

### 7.2 WorkflowResponse 타입 확장

`src/entities/workflow/api/types.ts`에 추가한다.

```ts
import { type ExecutionSummary } from "@/entities/execution";

export type WorkflowListStatus = "running" | "stopped";

export interface WorkflowResponse extends Omit<Workflow, "nodes" | "edges"> {
  nodes: NodeDefinitionResponse[];
  edges: EdgeDefinitionResponse[];
  warnings?: ValidationWarning[];
  nodeStatuses?: WorkflowNodeStatusResponse[];
  latestExecution?: ExecutionSummary | null;
  listStatus?: WorkflowListStatus | null;
}
```

순환 import가 걱정되면 `ExecutionSummary`와 동일한 lightweight 타입을 workflow api types에 두지 말고 `shared/api` 쪽으로 공통 DTO를 옮기는 방법도 있다.

V1 간단안:

- `latestExecution?: import("@/entities/execution").ExecutionSummary | null` 대신 workflow api type 내부에 `WorkflowLatestExecutionSummary`를 정의한다.
- execution entity와 workflow entity 사이의 배럴 import 순환을 피한다.

### 7.3 API 함수 변경

```ts
export const getWorkflowListAPI = (
  page = 0,
  size = 20,
  status: WorkflowFilterKey = "all",
): Promise<RawWorkflowListResponse> =>
  request<RawWorkflowListResponse>({
    url: "/workflows",
    method: "GET",
    params: { page, size, status },
  });
```

entity layer가 page slice의 `WorkflowFilterKey`를 직접 import하는 것이 어색하면 별도 타입을 둔다.

```ts
export type WorkflowListStatusFilter = "all" | "running" | "stopped";
```

권장:

- page model의 `WorkflowFilterKey`를 entity api가 import하지 않는다.
- entity api에 `WorkflowListStatusFilter`를 정의하고 page에서 같은 key를 사용한다.

### 7.4 Query key 변경

현재:

```ts
workflowKeys.infiniteList(size)
workflowKeys.list({ page, size })
```

변경:

```ts
workflowKeys.infiniteList({ size, status })
workflowKeys.list({ page, size, status })
```

예상:

```ts
list: (params: { page: number; size: number; status: WorkflowListStatusFilter }) =>
  [...workflowKeys.lists(), params.page, params.size, params.status] as const,

infiniteList: (params: { size: number; status: WorkflowListStatusFilter }) =>
  [...workflowKeys.lists(), "infinite", params.size, params.status] as const,
```

`invalidateWorkflowLists()`는 `workflowKeys.lists()` prefix를 사용하므로 그대로 모든 필터 cache를 invalidate할 수 있다.

### 7.5 useInfiniteWorkflowListQuery 변경

```ts
export const useInfiniteWorkflowListQuery = (
  size = 20,
  status: WorkflowListStatusFilter = "all",
  enabledOrOptions?: boolean | InfiniteQueryPolicyOptions<WorkflowListResponse>,
) => {
  return useInfiniteQuery({
    queryKey: workflowKeys.infiniteList({ size, status }),
    queryFn: async ({ pageParam }) =>
      normalizeWorkflowListResponse(
        await workflowApi.getList(pageParam, size, status),
        pageParam,
        size,
      ),
    ...
  });
};
```

### 7.6 useWorkflowListData 변경

변경 전:

```ts
const workflows = sortWorkflowsByUpdatedAtDesc(...);
const filteredWorkflows = filterWorkflowsByStatus(workflows, activeFilter);
const hasWorkflows = workflows.length > 0;
```

변경 후:

```ts
const workflowListQuery = useInfiniteWorkflowListQuery(
  WORKFLOW_LIST_PAGE_SIZE,
  activeFilter,
);

const workflows = sortWorkflowsByUpdatedAtDesc(
  data?.pages.flatMap(getWorkflowListPageContent) ?? [],
);

const totalElements = data?.pages[0]?.totalElements ?? 0;
const isFilterEmpty = !isLoading && !isError && totalElements === 0;
```

`filterWorkflowsByStatus`는 제거한다. 서버가 이미 필터링한 결과를 반환한다.

### 7.7 Empty state

기존 `hasWorkflows`는 현재 filter 결과 기준이라 `running` 탭이 비면 "전체 workflow 없음"으로 오해할 수 있다.

권장 변경:

```ts
type WorkflowListEmptyStateKind = "no-workflows" | "no-filter-results";
```

계산:

```ts
const emptyStateKind =
  activeFilter === "all" ? "no-workflows" : "no-filter-results";
```

문구:

| 상태 | 문구 |
| --- | --- |
| 전체 없음 | `아직 만든 워크플로우가 없습니다.` |
| 실행 중 없음 | `실행 중인 워크플로우가 없습니다.` |
| 중지됨 없음 | `중지된 워크플로우가 없습니다.` |

CTA:

- `all` empty에서만 생성 CTA를 강조한다.
- filter empty에서는 생성 CTA를 보조로 두거나 숨긴다.

### 7.8 실행/중지 action 후 cache 동기화

현재 mutation은 execution query만 invalidate한다.

```ts
queryClient.invalidateQueries({
  queryKey: executionKeys.workflow(workflowId),
});
```

보완:

- `useWorkflowExecutionAction()`에서 action 성공 후 `invalidateWorkflowLists()`를 호출한다.
- dashboard 이슈 카드도 같은 action hook을 쓰므로, dashboard summary refetch는 별도 판단이 필요하다.

권장 흐름:

```text
execute/stop 성공
  -> latestExecutionQuery.refetch()
  -> invalidateWorkflowLists()
```

효과:

- stopped 탭에서 manual workflow 실행 시 현재 탭에서 사라지고 running 탭에 나타난다.
- running 탭에서 manual workflow 중지 시 stopped 탭으로 이동한다.
- schedule active workflow는 중지해도 auto-run이 켜져 있으면 running에 남는다.

---

## 8. 구현 순서

### 8.1 Spring

1. `ExecutionSummaryResponse.from(WorkflowExecution)` factory 추가
2. `ExecutionRepository.findByWorkflowIdInOrderByStartedAtDesc(...)` 추가
3. `WorkflowResponse`에 `latestExecution`, `listStatus` nullable 필드 및 목록용 factory 추가
4. `WorkflowService.getWorkflowPage(userId, page, size, status)` 추가
5. `WorkflowController.getWorkflows()`가 page/status를 받도록 변경
6. `ExecutionService.toSummary()` 중복 mapper 제거 또는 factory 사용
7. service/controller 테스트 추가

### 8.2 FE

1. `WORKFLOW_FILTERS`를 `all/running/stopped`로 변경
2. workflow API 타입에 `WorkflowListStatusFilter`, `latestExecution`, `listStatus` 추가
3. `getWorkflowListAPI(page, size, status)`로 query param 추가
4. `workflowKeys.list/infiniteList`에 status 포함
5. `useWorkflowListQuery`, `useInfiniteWorkflowListQuery` 인자 확장
6. `useWorkflowListData`에서 client-side active filter 제거
7. empty state를 filter empty와 전체 empty로 분리
8. `useWorkflowExecutionAction` 성공 후 workflow list invalidate 추가
9. 기존 `filterWorkflowsByStatus` 테스트 삭제/대체

### 8.3 FastAPI

필수 구현 없음.

확인만 수행:

- 상태 문자열은 Spring/FE in-flight 기준과 맞는지
- stop/rollback callback 후 Spring state가 terminal로 떨어지는지
- `workflow_executions` schema가 Spring entity와 계속 호환되는지

---

## 9. 테스트 계획

### 9.1 Spring unit test

권장 파일:

- `flowify-BE-spring/src/test/java/org/github/flowify/workflow/WorkflowServiceTest.java`

검증 항목:

- manual workflow + latest execution 없음 -> `stopped`
- manual workflow + latest execution `running` -> `running`
- manual workflow + latest execution `pending` -> `running`
- manual workflow + latest execution `success` -> `stopped`
- manual workflow + latest execution `failed` -> `stopped`
- schedule workflow + `active=true` + latest execution 없음 -> `running`
- schedule workflow + `active=false` + latest execution 없음 -> `stopped`
- schedule workflow + `active=false` + latest execution `running` -> `running`
- `status=running`은 running workflow만 반환한다.
- `status=stopped`은 stopped workflow만 반환한다.
- filter 후 pagination이 적용된다.
- invalid status는 `all` fallback 또는 `400` 정책대로 처리된다.

### 9.2 Spring integration/controller test

검증 항목:

- `GET /api/workflows?page=0&size=20&status=running`이 `PageResponse` shape를 반환한다.
- 응답에 `latestExecution`, `listStatus`가 포함된다.
- token의 userId 기준으로 owner/shared workflow만 포함된다.
- 응답에 node log 상세가 포함되지 않는다.

### 9.3 FE unit test

권장 파일:

- `flowify-FE/src/pages/workflows/model/workflow-list.test.ts`
- `flowify-FE/src/entities/workflow/model/query-keys.test.ts`가 없다면 추가 또는 API helper 테스트로 대체

검증 항목:

- `WORKFLOW_FILTERS` key가 `all/running/stopped`이다.
- `getWorkflowListAPI()`가 `status` query parameter를 보낸다.
- `workflowKeys.infiniteList({ size, status })`가 status별로 다른 key를 만든다.
- `useWorkflowListData`가 client-side `active` 필터를 적용하지 않는다.
- filter empty state가 전체 empty state와 다른 문구를 사용한다.

### 9.4 FE 수동 검증

검증 시나리오:

- manual workflow가 실행 중이 아니면 `중지됨`에만 보인다.
- manual workflow를 실행하면 `실행 중`으로 이동한다.
- manual workflow 실행이 완료되면 `중지됨`으로 이동한다.
- schedule workflow 자동 실행이 켜져 있으면 현재 execution이 없어도 `실행 중`에 보인다.
- schedule workflow 자동 실행을 끄면 in-flight execution이 없는 경우 `중지됨`으로 이동한다.
- running 탭 첫 page가 비었는데 다음 page에 running workflow가 숨어 있는 문제가 없어야 한다.

### 9.5 FastAPI regression

필수 수정은 없지만 다음 테스트는 기존 통과를 확인한다.

- `flowify-BE/tests/test_state.py`
- `flowify-BE/tests/test_execution_api.py`
- `flowify-BE/tests/test_spring_callback_service.py`

검증 의미:

- 상태 문자열 계약이 유지된다.
- stop endpoint가 state를 `stopped`로 변경한다.
- Spring callback payload의 status mapping이 유지된다.

---

## 10. 위험 요소와 대응

### 10.1 `실행 중` 문구의 의미

위험:

- 사용자가 `실행 중`을 "현재 execution이 돌고 있음"으로만 이해할 수 있다.
- 설계는 schedule auto-run on도 `running`에 포함한다.

대응:

- UX 문구를 `운영 중`으로 바꾸는 안을 검토한다.
- 문구를 유지한다면 툴팁 또는 문서에 "실행 중에는 자동 실행이 켜진 워크플로우도 포함됩니다."를 명시한다.
- 제품 결정이 "현재 execution만 실행 중"이라면 `isScheduleAutoRunOn` 조건만 제거하면 된다.

### 10.2 전체 workflow 조회 후 필터링 비용

위험:

- 정확한 filtered pagination을 위해 접근 가능한 workflow 전체를 읽는다.
- workflow 수가 많아지면 비용이 증가한다.

대응:

- V1은 현재 목록 규모를 고려해 전체 조회 후 필터를 허용한다.
- 병목 확인 시 workflow collection에 `trigger.type`, `isActive` 조건과 execution aggregation을 조합하는 방식으로 최적화한다.
- latest execution 조회는 N+1 대신 `workflowId in`으로 묶는다.

### 10.3 shared workflow 실행 정보 노출

위험:

- shared workflow의 latest execution summary를 어디까지 보여줄지 정책이 필요하다.

대응:

- 목록에는 `state`, `startedAt`, `finishedAt` 수준의 summary만 포함한다.
- node logs, error detail은 포함하지 않는다.
- 실행 상세 API 권한 정렬은 별도 후속 또는 동시 수정으로 명시한다.

### 10.4 cache stale

위험:

- execute/stop 이후 workflow list cache가 남으면 현재 탭 결과가 틀려 보인다.

대응:

- action 성공 후 `invalidateWorkflowLists()`를 호출한다.
- latest execution query는 기존처럼 refetch한다.

### 10.5 Spring과 FastAPI의 stop 상태 차이

위험:

- FE는 `pending/running`을 stop 대상처럼 보지만 Spring은 `running`만 허용한다.

대응:

- 일반 실행 경로에서는 Spring이 `running`으로 레코드를 만들기 때문에 실사용 영향은 낮다.
- 그래도 상태 계약 정합성을 위해 Spring stop 허용 조건을 `pending/running`으로 확장하는지 검토한다.

---

## 11. 완료 기준

- `GET /api/workflows`가 `page`, `size`, `status`를 반영한 `PageResponse`를 반환한다.
- Spring이 전체 접근 가능 workflow 기준으로 `listStatus`를 계산한 뒤 pagination한다.
- FE는 `active/inactive` client-side filter를 제거하고 `all/running/stopped` 서버 필터를 사용한다.
- manual workflow가 실행 중이 아닐 때 `실행 중` 탭에 잘못 표시되지 않는다.
- schedule workflow의 auto-run on/off와 최신 execution state가 문서 기준대로 반영된다.
- 필터별 React Query cache가 섞이지 않는다.
- 실행/중지 action 후 목록 필터 결과가 갱신된다.
- FastAPI 상태 저장/콜백 계약을 깨지 않는다.

---

## 12. 최종 요약

이 작업의 핵심은 `workflow.active`를 목록 필터의 실행 상태로 쓰지 않는 것이다.

Spring은 접근 가능한 workflow 전체와 최신 execution summary를 조합해 `listStatus`를 계산하고, `status` query parameter로 먼저 필터링한 뒤 page를 잘라 반환한다. FE는 필터 값을 query key와 API parameter에 포함하고, 더 이상 로드된 page만 client-side로 active filtering하지 않는다. FastAPI는 기존 execution 상태 저장과 callback 계약을 유지하며, 이번 작업에서는 상태 문자열 reference로만 사용한다.
